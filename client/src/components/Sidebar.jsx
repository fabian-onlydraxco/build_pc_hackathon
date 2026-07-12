import { useEffect, useRef, useState } from 'react'
import { fmtUsd, STATUS_WORD } from '../lib/format.js'

const pendingCount = (project) =>
  Object.values(project.cards).filter((card) => card.status === 'pending').length

const PinIcon = ({ filled }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9 4h6l-1 7 3 3H7l3-3-1-7z" />
    <path d="M12 14v7" />
  </svg>
)

const BinIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 14h10l1-14" />
  </svg>
)

export default function Sidebar({ projects, order, activeId, pins, onSelect, onNew, onTogglePin, onDelete, onHide }) {
  // Second-click confirmation for the bin: first click arms it briefly.
  const [confirmId, setConfirmId] = useState(null)
  const confirmTimer = useRef(null)
  useEffect(() => () => clearTimeout(confirmTimer.current), [])

  const askDelete = (id) => {
    setConfirmId(id)
    clearTimeout(confirmTimer.current)
    confirmTimer.current = setTimeout(() => setConfirmId(null), 4000)
  }

  // Pinned projects float to the top; the rest keep their order.
  const sorted = [...order].sort(
    (a, b) => (pins.includes(b) ? 1 : 0) - (pins.includes(a) ? 1 : 0),
  )

  return (
    <aside className="sidebar" aria-label="Projects">
      <div className="sidebar__head">
        <div className="topbar__brand">
          Glyde <span>AI</span>
        </div>
        <button className="sidebar__hide" onClick={onHide} title="Hide sidebar" aria-label="Hide sidebar">
          «
        </button>
      </div>

      <button className="btn btn--ghost sidebar__new" onClick={onNew}>
        + New project
      </button>

      <div className="sidebar__list">
        {sorted.map((id) => {
          const project = projects[id]
          if (!project) return null
          const waiting = pendingCount(project)
          const live = ['composing', 'staffing', 'working', 'delivering'].includes(project.status)
          const pinned = pins.includes(id)
          const confirming = confirmId === id
          return (
            <div
              key={id}
              className={`sideitem ${id === activeId ? 'sideitem--active' : ''}`}
              onClick={() => onSelect(id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(id)
                }
              }}
              role="button"
              tabIndex={0}
              title={project.idea || 'New project'}
            >
              <span className="sideitem__body">
                <span className="sideitem__name">{project.companyName || project.idea || 'New company'}</span>
                <span className="sideitem__meta">
                  {waiting > 0 ? (
                    <strong>● {waiting} waiting</strong>
                  ) : (
                    <>
                      {live && <span className="sideitem__pulse" aria-hidden="true" />}
                      {STATUS_WORD[project.status] || project.status}
                    </>
                  )}
                  {' · '}
                  {fmtUsd(project.totalSpend)}
                </span>
              </span>

              <span className="sideitem__actions" onClick={(event) => event.stopPropagation()}>
                <button
                  className={`sideicon ${pinned ? 'sideicon--on' : ''}`}
                  onClick={() => onTogglePin(id)}
                  title={pinned ? 'Unpin project' : 'Pin project to top'}
                  aria-label={pinned ? 'Unpin project' : 'Pin project'}
                >
                  <PinIcon filled={pinned} />
                </button>
                <button
                  className={`sideicon ${confirming ? 'sideicon--confirm' : ''}`}
                  onClick={() => (confirming ? onDelete(id) : askDelete(id))}
                  title={confirming ? 'Click again to delete' : 'Delete project'}
                  aria-label="Delete project"
                >
                  {confirming ? 'sure?' : <BinIcon />}
                </button>
              </span>
            </div>
          )
        })}
        {order.length === 0 && <div className="sidebar__empty label">Your companies appear here</div>}
      </div>
    </aside>
  )
}
