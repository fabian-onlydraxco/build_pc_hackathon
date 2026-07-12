// Deterministic hire-proposal drafting — used by the mock provider and by
// replay-mode hiring (which must never make a real LLM call).
const NAMES = ['Riley Ng', 'Sam Ortega', 'Ava Lindqvist', 'Noor Rahman', 'Kai Tanaka', 'Mila Novak', 'Jon Beck', 'Zara Ali']

const hash = (str) => {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

const titleCase = (words) =>
  words.map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w)).join(' ')

export function draftProposal(description, chiefTitle = 'the department', notes = []) {
  const LEAD = /^(a|an|the|someone|somebody|please|hire|add|get|find|create|build|make|design|bring in|i want|i need|we need|to)\s+/i
  let cleaned = description.trim().replace(/[.!?]+$/, '')
  for (let i = 0; i < 6 && LEAD.test(cleaned); i++) cleaned = cleaned.replace(LEAD, '')

  const STOP = new Set(['who', 'that', 'which', 'can', 'will', 'to', 'the', 'a', 'an', 'and', 'for', 'of', 'with'])
  const words = cleaned.split(/\s+/).filter(Boolean)
  const role = titleCase(words.filter((w) => !STOP.has(w.toLowerCase())).slice(0, 4)) || 'Specialist'
  const name = NAMES[hash(description) % NAMES.length]

  const noteLine = notes.length ? ` CEO notes: ${notes.join('; ')}.` : ''
  return {
    name,
    role,
    task: `Own this brief end to end: ${cleaned}.${noteLine}`,
    persona: `Hired mid-flight by the CEO for ${chiefTitle}. Sharp, fast, allergic to filler — delivers one tight artifact, not a memo.${noteLine}`,
  }
}
