import { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import DecisionCard from './DecisionCard.jsx'
import ArtifactViewer from '../control/ArtifactViewer.jsx'

// Officer replies arrive as markdown; render it (with raw HTML escaped).
const renderAgentMarkdown = (text) =>
  marked.parse(String(text || '').replace(/<(?=[a-zA-Z/!])/g, '&lt;'))

export default function DashView({ state, onStart, onDecide, onInstruct, onDirect, onBuild }) {
  const idle = state.status === 'idle'
  return (
    <div className="dash">
      {idle ? (
        <Quest onStart={onStart} />
      ) : (
        <Running state={state} onDecide={onDecide} onInstruct={onInstruct} onDirect={onDirect} onBuild={onBuild} />
      )}
    </div>
  )
}

// A fresh deliverable, embedded right in the conversation.
function ArtifactEmbed({ artifact, onOpen }) {
  if (!artifact) return null
  return (
    <button className="embed" onClick={onOpen}>
      <span className="embed__tag label">Artifact · {artifact.chiefTitle}</span>
      <span className="embed__title">{artifact.title}</span>
      <span className="embed__meta">{artifact.format === 'html' ? 'live preview' : 'document'} · open →</span>
    </button>
  )
}

function Quest({ onStart }) {
  const [idea, setIdea] = useState('')
  const submit = (event) => {
    event.preventDefault()
    if (idea.trim()) onStart(idea.trim())
  }
  return (
    <section className="quest">
      <h1 className="quest__hero">Your idea just glides to reality.</h1>
      <p className="quest__sub">Type a business idea. Watch a company assemble itself, work under your control, and hand you the package.</p>
      <form className="quest__form" onSubmit={submit}>
        <input
          className="quest__input"
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="Sell a minimalist budgeting template for young professionals…"
          autoFocus
        />
        <button className="btn btn--ink" type="submit" disabled={!idea.trim()}>
          Build
        </button>
      </form>
      <div className="quest__hint label">One idea · one company · you stay CEO</div>
    </section>
  )
}

// Live board — every agent currently on the floor and what they're doing,
// pinned above the composer so it never scrolls away.
function LiveBoard({ state }) {
  const agents = Object.values(state.agents)
  const active = agents.filter((agent) => agent.status === 'thinking' || agent.status === 'waiting')
  if (active.length === 0) return null

  const done = agents.filter((agent) => agent.status === 'done').length
  const shown = active.slice(0, 6)

  const deptOf = (agent) => {
    const chief = agent.parentId ? state.agents[agent.parentId] : null
    const title = agent.tier === 'chief' ? agent.title : chief?.title || ''
    return title.replace(/^Chief\s|\sOfficer$/g, '')
  }

  const ADMIN_LINE = /^(Envelope raised|Envelope held|Persona updated|Plan ready|Standing-roster|CEO note)/
  const taskOf = (agent) => {
    if (agent.status === 'waiting') return 'awaiting your decision'
    const log = agent.log || []
    for (let i = log.length - 1; i >= 0; i--) {
      if (!ADMIN_LINE.test(log[i].text)) {
        return log[i].text.replace(/^(Working|Synthesizing|Delivered):\s*/, '')
      }
    }
    return 'thinking…'
  }

  return (
    <div className="live" aria-label="Live agent activity">
      <div className="live__inner">
        <div className="live__head">
          <span className="live__pulse" aria-hidden="true" />
          <span className="label">Live · on the floor</span>
          <span className="live__tally">
            {active.length} working · {done} done
          </span>
        </div>
        <div className="live__grid">
          {shown.map((agent) => (
            <div className="live__row" key={agent.id}>
              <span className={`dot dot--${agent.status}`} aria-hidden="true" />
              <span className="live__who">{agent.name}</span>
              <span className="live__dept">{deptOf(agent)}</span>
              <span className="live__task">{taskOf(agent)}</span>
            </div>
          ))}
          {active.length > shown.length && <div className="live__more label">+{active.length - shown.length} more</div>}
        </div>
      </div>
    </div>
  )
}

function Running({ state, onDecide, onInstruct, onDirect, onBuild }) {
  const streamRef = useRef(null)
  const inputRef = useRef(null)
  const [note, setNote] = useState('')
  const [viewingId, setViewingId] = useState(null)
  const viewing = viewingId ? state.artifacts[viewingId] : null

  // @-tagging: type "@" to pick an officer; the order skips the chain and
  // goes straight to them.
  const officers = Object.values(state.agents).filter(
    (agent) => agent.tier === 'chief' || agent.tier === 'coo',
  )
  const matchOfficer = (text) => {
    if (!text.startsWith('@')) return null
    const rest = text.slice(1).toLowerCase()
    return officers.find((officer) => rest.startsWith(officer.name.toLowerCase() + ' ')) || null
  }
  const mentionQuery =
    note.startsWith('@') && !matchOfficer(note) ? note.slice(1).toLowerCase() : null
  const suggestions =
    mentionQuery === null
      ? []
      : officers.filter(
          (officer) =>
            officer.name.toLowerCase().includes(mentionQuery) ||
            officer.title.toLowerCase().includes(mentionQuery),
        )

  // Land at the latest when this project opens…
  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  // …and stay pinned to the latest on every event, unless the CEO has
  // deliberately scrolled up to read history.
  useEffect(() => {
    const el = streamRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [state.lastSeq, state.stream.length])

  const send = (event) => {
    event.preventDefault()
    const text = note.trim()
    if (!text) return
    const officer = matchOfficer(text.startsWith('@') ? `${text} ` : text)
    if (officer) {
      const order = text.slice(1 + officer.name.length).trim()
      if (!order) return
      onDirect(officer.id, order)
    } else {
      onInstruct(text)
    }
    setNote('')
  }

  return (
    <>
      <div className="stream" ref={streamRef}>
        {state.stream.map((item) => (
          <div className={`stream__item ${item.kind === 'error' ? 'stream__error' : ''}`} key={item.seq}>
            {item.kind === 'card' ? (
              <DecisionCard card={state.cards[item.cardId]} onDecide={onDecide} />
            ) : item.kind === 'artifact' ? (
              <ArtifactEmbed
                artifact={state.artifacts[item.artifactId]}
                onOpen={() => setViewingId(item.artifactId)}
              />
            ) : (
              <div
                className={`narration ${item.kind === 'agent' ? 'narration--agent' : ''} ${item.kind === 'ceo' ? 'narration--ceo' : ''}`}
              >
                <div className="narration__who label">
                  {item.kind === 'error'
                    ? 'incident'
                    : item.kind === 'agent'
                      ? `${item.name} · ${item.title}`
                      : item.kind === 'ceo'
                        ? 'You · CEO'
                        : 'Atlas · COO'}
                </div>
                {item.kind === 'agent' ? (
                  <div
                    className="narration__text md"
                    dangerouslySetInnerHTML={{ __html: renderAgentMarkdown(item.text) }}
                  />
                ) : (
                  <div className="narration__text">{item.text}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <LiveBoard state={state} />

      <div className="dash__composer">
        {state.status === 'intake' && (
          <div className="intake">
            <span className="label">Atlas is scoping your project — answer his questions below, or skip ahead</span>
            <button className="btn btn--ink btn--sm" onClick={onBuild}>
              Start building now
            </button>
          </div>
        )}
        <div className="composer__wrap">
          {suggestions.length > 0 && (
            <div className="mention" role="listbox" aria-label="Tag an officer">
              {suggestions.map((officer) => (
                <button
                  key={officer.id}
                  className="mention__item"
                  onClick={() => {
                    setNote(`@${officer.name} `)
                    inputRef.current?.focus()
                  }}
                >
                  <span className="mention__name">@{officer.name}</span>
                  <span className="mention__title">{officer.title}</span>
                </button>
              ))}
            </div>
          )}
          <form className="composer" onSubmit={send}>
            <input
              ref={inputRef}
              className="composer__input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Tell your COO anything — or @ an officer for a direct order…"
            />
            <button className="btn btn--ghost btn--sm" type="submit" disabled={!note.trim()}>
              Send
            </button>
          </form>
        </div>
      </div>

      {viewing && <ArtifactViewer artifact={viewing} onClose={() => setViewingId(null)} />}
    </>
  )
}
