import { golden, isGoldenIdea } from './goldenPack.js'
import { generic } from './genericPack.js'
import { draftProposal } from './hireDraft.js'
import { abortError } from './errors.js'

// Deterministic, keyless provider. Content comes from a pack (golden for the
// rehearsed demo idea, generic for anything else); delays are seeded per agent
// so every run paces identically; usage is fixed per stage so burn metering
// and envelope gates behave deterministically.
const PACE = Number(process.env.MOCK_PACE || 1.5)

const USAGE = {
  compose: { input: 4000, output: 2533 },   // ≈ $0.050 at sonnet pricing
  plan: { input: 5000, output: 2000 },      // ≈ $0.045
  employee: { input: 10000, output: 10000 },// ≈ $0.060 at haiku pricing
  synthesis: { input: 10000, output: 3333 },// ≈ $0.080
  revise: { input: 6000, output: 2000 },    // ≈ $0.048
  exec: { input: 4000, output: 2533 },      // ≈ $0.050
  'hire-propose': { input: 2000, output: 800 }, // ≈ $0.018
  direct: { input: 3000, output: 1200 },        // ≈ $0.027
  instruct: { input: 2500, output: 400 },       // ≈ $0.013
  intake: { input: 1500, output: 500 },         // ≈ $0.012
}

const BASE_DELAY = {
  compose: 1300,
  plan: 950,
  employee: 1400,
  synthesis: 1800,
  revise: 1400,
  exec: 1500,
  'hire-propose': 700,
  direct: 1100,
  instruct: 900,
  intake: 800,
}

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(abortError())
      },
      { once: true },
    )
  })
}

export async function mockComplete({ signal, meta }) {
  const { stage, idea = '', chiefId = '', hireId = '', persona = '', reason = '' } = meta
  if (stage === 'hire-propose') {
    await sleep(BASE_DELAY[stage] * PACE, signal)
    return {
      text: JSON.stringify(draftProposal(meta.description || '', meta.chiefTitle, meta.notes || [])),
      usage: USAGE[stage],
    }
  }
  if (stage === 'direct') {
    await sleep(BASE_DELAY[stage] * PACE, signal)
    const order = meta.text || 'the order'
    return {
      text: `**Direct order handled.**\n\nYou asked: "${order}"\n\n- Scoped it, executed it, and verified the result myself — no hand-offs.\n- Outcome: done to spec, ready for your review in my task log.\n- One flag for you: if this should become a standing task, say the word and I'll fold it into the department plan.`,
      usage: USAGE[stage],
    }
  }
  if (stage === 'instruct') {
    await sleep(BASE_DELAY[stage] * PACE, signal)
    return {
      text: `Understood — "${meta.text || 'your note'}" is now a standing instruction. Every chief gets it with their next task, and I'll hold their output against it. (Mock mode: add an API key for a real conversation.)`,
      usage: USAGE[stage],
    }
  }
  if (stage === 'intake') {
    await sleep(BASE_DELAY[stage] * PACE, signal)
    if (!meta.turns) {
      return {
        text: `So the mission is: "${idea}". Before I staff up, three quick checks — 1) Who is the main customer? (default: young professionals) 2) What price point feels right? (default: around $9.99) 3) What tone should the brand carry? (default: clean and friendly). Answer any of these, or say "start" and I'll run with the defaults.`,
        usage: USAGE[stage],
      }
    }
    return {
      text: JSON.stringify({
        reply: 'Perfect — that gives me everything I need. Locking the brief and building your company now.',
        ready: true,
        brief: ['Honor the CEO\'s intake answers exactly', `Latest CEO note: ${meta.text || 'run with the defaults'}`],
      }),
      usage: USAGE[stage],
    }
  }
  const pack = isGoldenIdea(idea) ? golden : generic
  const genZ = /gen[\s-]?z|bold|edgy|spicy|playful/i.test(persona)

  const seed = hash(`${stage}:${chiefId}:${hireId}`)
  const jitter = (seed % 900) * (stage === 'employee' ? 1.3 : 1)
  await sleep((BASE_DELAY[stage] + jitter) * PACE, signal)

  let text
  switch (stage) {
    case 'compose':
      text = pack.org(idea)
      break
    case 'plan':
      text = pack.plan(chiefId, idea)
      break
    case 'employee':
      text = pack.employee(hireId, { genZ, idea })
      break
    case 'synthesis':
      text = pack.synthesis(chiefId, { genZ, idea })
      break
    case 'revise':
      text = pack.revise(chiefId, { reason, genZ, idea })
      break
    case 'exec':
      text = pack.exec(idea)
      break
    default:
      text = 'Acknowledged.'
  }

  return { text, usage: USAGE[stage] || USAGE.plan }
}
