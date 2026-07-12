import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { fmtTime } from './lib/format.js'
import { initialState, projectsInitial, projectsReducer } from './lib/store.js'
import { useRunStreams } from './lib/useRunStream.js'
import * as api from './lib/api.js'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import DashView from './components/dash/DashView.jsx'
import ControlView from './components/control/ControlView.jsx'
import OnboardingSplash from './components/OnboardingSplash.jsx'

export default function App() {
  const [{ projects, order, notices }, dispatch] = useReducer(projectsReducer, projectsInitial)
  const [activeId, setActiveId] = useState(null)
  const [section, setSection] = useState('dash')
  const [selectedId, setSelectedId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [noticesOpen, setNoticesOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return !localStorage.getItem('glyde-onboarded')
    } catch {
      return true
    }
  })
  const [pins, setPins] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('glyde-pins')) || []
    } catch {
      return []
    }
  })
  const nextModeRef = useRef('live')
  const toastTimer = useRef(null)

  const active = activeId ? projects[activeId] : null
  const view = active || initialState // no active project → serene quest screen

  // A finished background project can close its stream; the ACTIVE project
  // always stays connected — post-run actions (like hiring) still stream in.
  useRunStreams(
    order.map((id) => ({
      id,
      done: ['done', 'error'].includes(projects[id]?.status) && id !== activeId,
    })),
    dispatch,
  )

  // Rediscover projects after a reload; SSE log replay rebuilds each one.
  useEffect(() => {
    api
      .listRuns()
      .then(({ runs = [] }) => {
        runs.sort((a, b) => a.startedAt - b.startedAt)
        for (const run of runs) dispatch({ type: 'add-run', runId: run.id })
        if (runs.length) setActiveId((current) => current || runs[runs.length - 1].id)
      })
      .catch(() => {})
  }, [])

  const flashToast = useCallback((text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1800)
  }, [])

  const closeGuide = useCallback(() => {
    try {
      localStorage.setItem('glyde-onboarded', '1')
    } catch {
      // private mode etc. — tour just reappears next visit
    }
    setShowGuide(false)
  }, [])

  // Stage lifeline: Ctrl+Shift+L flips the NEXT run between live and replay.
  // Ctrl+Shift+F saves the active project's run as the golden fixture.
  useEffect(() => {
    const onKey = async (event) => {
      if (!event.ctrlKey || !event.shiftKey) return
      const key = event.key.toLowerCase()
      if (key === 'l') {
        event.preventDefault()
        nextModeRef.current = nextModeRef.current === 'live' ? 'replay' : 'live'
        flashToast(`Next run: ${nextModeRef.current}`)
      }
      if (key === 'f' && activeId) {
        event.preventDefault()
        try {
          const result = await api.saveFixture(activeId)
          flashToast(`Fixture saved (${result.events} events)`)
        } catch (err) {
          flashToast(err.message)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeId, flashToast])

  const startRun = async (idea) => {
    try {
      const res = await api.startRun(idea, nextModeRef.current)
      dispatch({ type: 'add-run', runId: res.runId })
      setSelectedId(null)
      setActiveId(res.runId)
    } catch (err) {
      flashToast(err.message)
    }
  }

  const newProject = () => {
    setSelectedId(null)
    setActiveId(null)
    setSection('dash')
  }

  const selectProject = (id) => {
    setSelectedId(null)
    setActiveId(id)
  }

  const togglePin = (id) => {
    setPins((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current]
      try {
        localStorage.setItem('glyde-pins', JSON.stringify(next))
      } catch {
        // private mode etc. — pins just won't persist
      }
      return next
    })
  }

  const deleteProject = async (id) => {
    const name = projects[id]?.companyName || projects[id]?.idea || 'Project'
    try {
      await api.deleteRun(id)
    } catch {
      // already gone server-side — still remove locally
    }
    dispatch({ type: 'remove-run', runId: id })
    setPins((current) => current.filter((x) => x !== id))
    if (activeId === id) {
      setSelectedId(null)
      setActiveId(order.find((x) => x !== id) || null)
    }
    flashToast(`${name} removed`)
  }

  const decide = async (cardId, approved, note) => {
    try {
      await api.decideCard(activeId, cardId, approved, note)
    } catch (err) {
      flashToast(err.message)
    }
  }

  const instruct = async (text) => {
    try {
      await api.instruct(activeId, text)
    } catch (err) {
      flashToast(err.message)
    }
  }

  const direct = async (chiefId, text) => {
    try {
      await api.directTask(activeId, chiefId, text)
    } catch (err) {
      flashToast(err.message)
    }
  }

  const build = async () => {
    try {
      await api.buildRun(activeId)
    } catch (err) {
      flashToast(err.message)
    }
  }

  const toggleNotices = () => {
    setNoticesOpen((open) => {
      if (!open) dispatch({ type: 'notices-read' })
      return !open
    })
  }

  const unread = notices.filter((n) => !n.read).length

  const updateAgent = async (agentId, patch) => {
    try {
      await api.updateAgent(activeId, agentId, patch)
    } catch (err) {
      flashToast(err.message)
    }
  }

  const toggleKill = async () => {
    if (!activeId) return
    try {
      if (view.killed) await api.resumeRun(activeId)
      else await api.killRun(activeId)
    } catch (err) {
      flashToast(err.message)
    }
  }

  const running = ['intake', 'composing', 'staffing', 'working', 'delivering'].includes(view.status)

  return (
    <div className="shell">
      {sidebarOpen && (
        <Sidebar
          projects={projects}
          order={order}
          activeId={activeId}
          pins={pins}
          onSelect={selectProject}
          onNew={newProject}
          onTogglePin={togglePin}
          onDelete={deleteProject}
          onHide={() => setSidebarOpen(false)}
        />
      )}

      <div className="shell__main">
        <TopBar
          section={section}
          setSection={setSection}
          state={view}
          running={running}
          onToggleKill={toggleKill}
          killEnabled={Boolean(activeId) && (running || view.killed)}
          showBrand={!sidebarOpen}
          onShowSidebar={() => setSidebarOpen(true)}
          unread={unread}
          noticesOpen={noticesOpen}
          onToggleNotices={toggleNotices}
          onOpenGuide={() => setShowGuide(true)}
        />
        {section === 'dash' ? (
          <DashView
            key={activeId || 'new'}
            state={view}
            onStart={startRun}
            onDecide={decide}
            onInstruct={instruct}
            onDirect={direct}
            onBuild={build}
          />
        ) : (
          <ControlView
            key={activeId || 'none'}
            state={view}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onUpdateAgent={updateAgent}
            onDecide={decide}
            onDirect={direct}
            goDash={() => setSection('dash')}
            notify={flashToast}
          />
        )}
      </div>

      {noticesOpen && (
        <div className="notices" role="dialog" aria-label="Notifications">
          <div className="notices__head">
            <span className="panel__title">Notifications</span>
            <button className="inspector__close" onClick={() => setNoticesOpen(false)} aria-label="Close notifications">
              ×
            </button>
          </div>
          <div className="notices__list">
            {notices.length === 0 && <div className="notices__empty label">All quiet — nothing needs you.</div>}
            {notices.map((notice) => (
              <button
                key={notice.id}
                className="notice"
                onClick={() => {
                  selectProject(notice.runId)
                  setNoticesOpen(false)
                }}
              >
                <span className="notice__row">
                  <span className={`notice__kind notice__kind--${notice.kind}`}>{notice.kind}</span>
                  <span className="notice__meta">
                    {notice.company} · {fmtTime(notice.ts)}
                  </span>
                </span>
                <span className="notice__text">{notice.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {view.killed && (
        <div className="freeze-veil" role="status">
          <div className="freeze-veil__stamp">COMPANY FROZEN</div>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
      {showGuide && <OnboardingSplash onClose={closeGuide} />}
    </div>
  )
}
