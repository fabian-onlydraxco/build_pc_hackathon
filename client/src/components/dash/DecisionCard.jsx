import { useState } from 'react'
import { fmtUsd } from '../../lib/format.js'

const TAGS = {
  envelope: 'Budget request',
  runcap: 'Spend cap',
  pricing: 'Pricing decision',
  publish: 'Publish approval',
  plan: 'Plan review',
}

export default function DecisionCard({ card, onDecide }) {
  const [note, setNote] = useState('')
  if (!card) return null
  const pending = card.status === 'pending'

  return (
    <div className={`card ${pending ? 'card--urgent' : 'card--resolved'}`}>
      <div className="card__head">
        <span className="card__tag">{TAGS[card.category] || 'Decision'}</span>
        <span className="card__agent">{card.title}</span>
        {!pending && (
          <span className={`card__stamp ${card.status === 'rejected' ? 'card__stamp--rejected' : ''}`}>
            {card.status === 'approved' ? 'Approved' : 'Rejected'}
          </span>
        )}
      </div>
      <div className="card__body">{card.body}</div>
      {card.costUsd != null && <div className="card__cost">requested: {fmtUsd(card.costUsd)}</div>}
      {pending && (
        <div className="card__actions">
          <input
            className="card__note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note — your reason travels with the decision"
          />
          <button className="btn btn--ghost btn--sm" onClick={() => onDecide(card.id, false, note)}>
            Reject
          </button>
          <button className="btn btn--ink btn--sm" onClick={() => onDecide(card.id, true, note)}>
            Approve
          </button>
        </div>
      )}
      {!pending && card.note && <div className="card__cost">note: “{card.note}”</div>}
    </div>
  )
}
