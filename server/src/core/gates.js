import { AUTONOMY } from '../config.js'

// Money always stays sovereign: envelope/run-cap gates fire at every autonomy
// level. Pricing and publish gate unless the agent runs full-auto. Plans gate
// only when the CEO asked to see everything.
export function gateNeeded(category, autonomy) {
  if (category === 'envelope' || category === 'runcap') return true
  if (autonomy === AUTONOMY.AUTO) return false
  if (category === 'pricing' || category === 'publish') return true
  if (category === 'plan') return autonomy === AUTONOMY.ASK_ALL
  return false
}

let cardCounter = 0

// Parks the requesting agent until the CEO decides. Resolves {approved, note}.
export function requestApproval(run, { category, agentId, title, body, costUsd = null }) {
  const id = `card-${++cardCounter}-${category}`
  const card = { id, category, agentId, title, body, costUsd, status: 'pending' }
  run.cards.set(id, card)

  const agent = run.agents.get(agentId)
  if (agent) {
    agent.status = 'waiting'
    run.bus.emit('agent_status', { agentId, status: 'waiting' })
  }

  // Snapshot — the live card object mutates on resolution, and the recorder
  // must capture the card as it looked when it was raised.
  run.bus.emit('needs_approval', { card: { ...card } })

  return new Promise((resolve) => {
    run.pendingGates.set(id, resolve)
  })
}

export function resolveApproval(run, cardId, approved, note = '') {
  const card = run.cards.get(cardId)
  const resolver = run.pendingGates.get(cardId)
  if (!card || card.status !== 'pending') return false

  card.status = approved ? 'approved' : 'rejected'
  card.note = note
  run.pendingGates.delete(cardId)
  run.bus.emit('approval_resolved', { cardId, approved, note })

  const agent = run.agents.get(card.agentId)
  if (agent && agent.status === 'waiting') {
    agent.status = 'thinking'
    run.bus.emit('agent_status', { agentId: agent.id, status: 'thinking' })
  }

  if (resolver) resolver({ approved, note })
  return true
}
