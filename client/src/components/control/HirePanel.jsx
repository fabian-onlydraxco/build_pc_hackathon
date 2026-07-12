import { useEffect, useRef, useState } from 'react'
import * as api from '../../lib/api.js'

// The CEO hiring flow: a quiet pill at bottom-center (org chart stays fully
// visible) that grows into a small hiring chat once the first brief is typed.
// Ends with the scope decision: this project only, or the standing roster.
export default function HirePanel({ runId, chief, onClose, notify }) {
  const [phase, setPhase] = useState('pill') // pill | chat
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([]) // {from: 'ceo'|'dept', text?, proposal?}
  const [proposal, setProposal] = useState(null)
  const [notes, setNotes] = useState([])
  const [busy, setBusy] = useState(false)
  const [hiring, setHiring] = useState(false)
  const descriptionRef = useRef('')
  const listRef = useRef(null)

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, busy])

  const chiefTitle = chief?.title || 'the department'
  const deptShort = chiefTitle.replace(/^Chief\s|\sOfficer$/g, '')

  const requestProposal = async (description, nextNotes) => {
    setBusy(true)
    try {
      const res = await api.proposeHire(runId, {
        chiefId: chief?.id,
        chiefTitle,
        description,
        notes: nextNotes,
      })
      setProposal(res.proposal)
      setMessages((m) => [...m, { from: 'dept', proposal: res.proposal }])
    } catch (err) {
      setMessages((m) => [...m, { from: 'dept', text: `Hiring hit a snag: ${err.message}` }])
    } finally {
      setBusy(false)
    }
  }

  const submit = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')

    if (phase === 'pill') {
      descriptionRef.current = text
      setPhase('chat')
      setMessages([{ from: 'ceo', text }])
      requestProposal(text, [])
    } else {
      const nextNotes = [...notes, text]
      setNotes(nextNotes)
      setMessages((m) => [...m, { from: 'ceo', text }])
      requestProposal(descriptionRef.current, nextNotes)
    }
  }

  const hire = async (scope) => {
    if (!proposal || hiring) return
    setHiring(true)
    try {
      await api.hireAgent(runId, { chiefId: chief?.id, proposal, scope })
      notify(
        scope === 'all'
          ? `${proposal.name} joined ${deptShort} — on your roster for every project`
          : `${proposal.name} joined ${deptShort}`,
      )
      onClose()
    } catch (err) {
      notify(err.message)
      setHiring(false)
    }
  }

  if (phase === 'pill') {
    return (
      <form className="hire hire--pill" onSubmit={submit}>
        <span className="hire__chip">{deptShort} · new hire</span>
        <input
          className="hire__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Describe who you want to hire…"
          autoFocus
        />
        <button className="btn btn--ink btn--sm" type="submit" disabled={!draft.trim()}>
          Draft
        </button>
        <button type="button" className="inspector__close" onClick={onClose} aria-label="Cancel hire">
          ×
        </button>
      </form>
    )
  }

  return (
    <div className="hire hire--chat" role="dialog" aria-label={`New hire for ${chiefTitle}`}>
      <div className="hire__head">
        <div>
          <div className="hire__title">New hire</div>
          <div className="label">{chiefTitle}</div>
        </div>
        <button className="inspector__close" onClick={onClose} aria-label="Close hiring chat">
          ×
        </button>
      </div>

      <div className="hire__list" ref={listRef}>
        {messages.map((message, index) =>
          message.from === 'ceo' ? (
            <div className="hmsg hmsg--ceo" key={index}>
              {message.text}
            </div>
          ) : message.proposal ? (
            <div className="hmsg hmsg--dept" key={index}>
              <div className="hproposal">
                <div className="hproposal__name">{message.proposal.name}</div>
                <div className="hproposal__role">{message.proposal.role}</div>
                <div className="hproposal__task">{message.proposal.task}</div>
                <div className="hproposal__persona">{message.proposal.persona}</div>
              </div>
            </div>
          ) : (
            <div className="hmsg hmsg--dept" key={index}>
              {message.text}
            </div>
          ),
        )}
        {busy && (
          <div className="hmsg hmsg--dept hire__thinking">
            <span className="dot dot--thinking" /> drafting the hire…
          </div>
        )}
      </div>

      {proposal && !busy && (
        <div className="hire__scope">
          <span className="label">Add this agent to</span>
          <div className="hire__scope-actions">
            <button className="btn btn--ghost btn--sm" disabled={hiring} onClick={() => hire('project')}>
              This project
            </button>
            <button className="btn btn--ink btn--sm" disabled={hiring} onClick={() => hire('all')}>
              All projects
            </button>
          </div>
        </div>
      )}

      <form className="hire__composer" onSubmit={submit}>
        <input
          className="hire__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={proposal ? 'Refine the hire — e.g. “more data-driven”…' : 'Add detail…'}
          disabled={busy || hiring}
        />
        <button className="btn btn--ghost btn--sm" type="submit" disabled={!draft.trim() || busy || hiring}>
          Send
        </button>
      </form>
    </div>
  )
}
