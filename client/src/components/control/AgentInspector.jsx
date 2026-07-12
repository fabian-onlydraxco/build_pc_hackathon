import { useEffect, useRef, useState } from 'react'
import { fmtBurn, fmtTime } from '../../lib/format.js'

const AUTONOMY_OPTIONS = [
  { value: 'ask-all', label: 'Ask everything', desc: 'every step' },
  { value: 'ask-big', label: 'Ask big calls', desc: 'money · pricing · publish' },
  { value: 'auto', label: 'Full auto', desc: 'money still asks' },
]

const STAGE_WORD = {
  compose: 'company brief',
  plan: 'department plan',
  employee: 'task',
  synthesis: 'deliverable',
  revise: 'revision',
  exec: 'exec summary',
  direct: 'direct order',
  instruct: 'CEO note',
  intake: 'project brief',
  'hire-propose': 'hire draft',
  repair: 'fix-up',
}

// One message in the agent's thread — a briefing received or work sent back.
// Long texts (full prompts, whole deliverables) collapse behind an expander.
function ThreadMsg({ msg, selfId }) {
  const [open, setOpen] = useState(false)
  const incoming = msg.toId === selfId
  const long = (msg.text || '').length > 420
  const text = open || !long ? msg.text : `${msg.text.slice(0, 420)}…`
  return (
    <div className={`thread__msg ${incoming ? 'thread__msg--in' : 'thread__msg--out'}`}>
      <div className="thread__meta label">
        {incoming ? `⇣ from ${msg.fromName}` : `⇡ to ${msg.toName}`} · {STAGE_WORD[msg.stage] || msg.stage} ·{' '}
        {fmtTime(msg.ts)}
      </div>
      <div className="thread__text">{text}</div>
      {long && (
        <button className="thread__more" onClick={() => setOpen((value) => !value)}>
          {open ? 'collapse' : 'show full text'}
        </button>
      )}
    </div>
  )
}

export default function AgentInspector({ agent, dept, msgs = [], onClose, onUpdate, onDirect }) {
  const [personaDraft, setPersonaDraft] = useState(agent.persona || '')
  const [nameDraft, setNameDraft] = useState(agent.name)
  const [budgetDraft, setBudgetDraft] = useState(agent.budgetUsd || 0)
  const [say, setSay] = useState('')
  const threadRef = useRef(null)
  const personaDirty = personaDraft !== (agent.persona || '')

  const spent = dept?.spent ?? agent.spentUsd ?? 0
  const budget = dept?.budget ?? agent.budgetUsd ?? 0
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0

  // Keep the thread pinned to the latest message.
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length])

  const sendDirect = (event) => {
    event.preventDefault()
    const text = say.trim()
    if (!text) return
    onDirect?.(text)
    setSay('')
  }

  return (
    <aside className="inspector" aria-label={`${agent.name} inspector`}>
      <div className="inspector__head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="inspector__name"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => nameDraft.trim() && nameDraft !== agent.name && onUpdate({ name: nameDraft.trim() })}
            aria-label="Agent name"
          />
          <div className="label" style={{ marginTop: 2 }}>
            {agent.title} · {agent.status}
          </div>
        </div>
        <button className="inspector__close" onClick={onClose} aria-label="Close inspector">
          ×
        </button>
      </div>

      <div className="inspector__body">
        <div className="field">
          <span className="label">Persona — takes effect on the next task</span>
          <textarea
            className="field__area"
            value={personaDraft}
            onChange={(event) => setPersonaDraft(event.target.value)}
            placeholder="Who is this agent? Tone, style, priorities…"
          />
          <div>
            <button
              className="btn btn--ink btn--sm"
              disabled={!personaDirty}
              onClick={() => onUpdate({ persona: personaDraft })}
            >
              Save persona
            </button>
          </div>
        </div>

        {agent.tier !== 'employee' && (
          <div className="field">
            <span className="label">Autonomy</span>
            <div className="autonomy" role="radiogroup" aria-label="Autonomy level">
              {AUTONOMY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`autonomy__opt ${agent.autonomy === option.value ? 'autonomy__opt--active' : ''}`}
                  onClick={() => onUpdate({ autonomy: option.value })}
                  role="radio"
                  aria-checked={agent.autonomy === option.value}
                >
                  <span className="autonomy__label">{option.label}</span>
                  <span className="autonomy__desc">{option.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {agent.tier === 'chief' && (
          <div className="field">
            <span className="label">Budget envelope</span>
            <div className="field__row">
              <input
                className="field__input"
                type="number"
                step="0.05"
                min="0.05"
                value={budgetDraft}
                onChange={(event) => setBudgetDraft(event.target.value)}
                aria-label="Budget in USD"
              />
              <button
                className="btn btn--ghost btn--sm"
                disabled={Number(budgetDraft) === agent.budgetUsd || !(Number(budgetDraft) > 0)}
                onClick={() => onUpdate({ budgetUsd: Number(budgetDraft) })}
              >
                Set
              </button>
              <span className="autonomy__desc" style={{ marginLeft: 'auto' }}>
                spent {fmtBurn(spent)}
              </span>
            </div>
            <div className="bar">
              <div className="bar__fill" style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
          </div>
        )}

        <div className="field">
          <span className="label">
            Comms — every briefing in, every work product out{msgs.length ? ` (${msgs.length})` : ''}
          </span>
          <div className="thread" ref={threadRef}>
            {msgs.length === 0 && <span className="tasklog__empty">No traffic yet — nothing has crossed this desk.</span>}
            {msgs.map((msg) => (
              <ThreadMsg key={`${msg.seq}-${msg.kind}`} msg={msg} selfId={agent.id} />
            ))}
          </div>
          <form className="thread__composer" onSubmit={sendDirect}>
            <input
              className="field__input"
              value={say}
              onChange={(event) => setSay(event.target.value)}
              placeholder={`Interrupt ${agent.name} with a direct order…`}
              aria-label={`Message ${agent.name}`}
            />
            <button className="btn btn--ink btn--sm" type="submit" disabled={!say.trim()}>
              Send
            </button>
          </form>
        </div>

        <div className="field">
          <span className="label">Task log</span>
          <div className="tasklog">
            {(agent.log || []).length === 0 && <span className="tasklog__empty">Nothing yet — hired and standing by.</span>}
            {(agent.log || []).map((entry, index) => (
              <div className="tasklog__line" key={index}>
                <span className="tasklog__time">{fmtTime(entry.ts)}</span>
                <span>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
