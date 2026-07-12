import { CAPS } from '../config.js'

const JSON_ONLY = 'Respond with ONLY valid JSON. No prose, no code fences.'

export function composePrompt(idea, instructions = []) {
  const notes = instructions.length
    ? `\nStanding instructions from the CEO:\n${instructions.map((i) => `- ${i}`).join('\n')}`
    : ''
  return `You are the COO of a brand-new one-person company. The CEO's idea:
"${idea}"
${notes}
Design the smallest executive team that can turn this idea into a complete business package today. Typical teams draw from: Research, Finance, Marketing, Legal, Development — but choose what THIS idea needs (max ${CAPS.maxChiefs} chiefs, max ${CAPS.maxEmployeesPerChief} hires each).

${JSON_ONLY}
Schema:
{
  "company_name": "string",
  "mission": "one sentence",
  "chiefs": [
    {
      "id": "cfo",
      "title": "Chief Financial Officer",
      "persona": "2-3 sentences of personality and working style",
      "hero_artifact": "the one deliverable this chief owns, one line",
      "hires": [{ "id": "cfo-1", "role": "Pricing Analyst", "task": "one atomic task" }],
      "budget_usd": 0.2
    }
  ]
}`
}

export function chiefPlanPrompt(run, chief, orgChief) {
  return `You are ${chief.name}, ${chief.title} of ${run.companyName}. Persona: ${chief.persona}
Company mission: ${run.mission}
Your deliverable: ${orgChief.hero_artifact}
Your team: ${orgChief.hires.map((h) => `${h.role} — ${h.task}`).join('; ')}

Write a tight 3-5 sentence department plan: how the team's outputs combine into your deliverable. Plain text.`
}

export function employeePrompt(run, chief, hire) {
  return `You are a ${hire.role} at ${run.companyName} (${run.mission}), reporting to the ${chief.title}.
Your single task: ${hire.task}
The company is executing: "${run.idea}"

Produce your work product directly, in concise markdown (150-300 words). No preamble.`
}

export function synthesisPrompt(run, chief, orgChief, employeeOutputs, { constrained = false } = {}) {
  const format = orgChief.id === 'cdo' || /develop/i.test(orgChief.title) ? 'html' : 'markdown'
  const htmlNote =
    format === 'html'
      ? 'The content must be ONE complete self-contained HTML file (inline CSS, no external resources) — a polished monochrome landing page for the product.'
      : 'The content is polished markdown.'
  return `You are ${chief.name}, ${chief.title} of ${run.companyName}. Persona: ${chief.persona}
Company idea: "${run.idea}". Mission: ${run.mission}
${constrained ? 'Budget is tight: be decisive and concise.\n' : ''}Your team delivered:
${employeeOutputs.map((o, i) => `--- Team output ${i + 1} ---\n${o}`).join('\n')}

Synthesize your hero deliverable: ${orgChief.hero_artifact}. ${htmlNote}

${JSON_ONLY}
Schema:
{
  "title": "string",
  "format": "${format}",
  "content": "the full deliverable as a ${format} string",
  "metrics": { "optional numeric facts, e.g. projected_revenue_y1_usd": 0 }
}`
}

export function revisePrompt(run, chief, artifactJson, reason) {
  return `You are ${chief.name}, ${chief.title} of ${run.companyName}.
The CEO REJECTED your deliverable with this note: "${reason || 'take a different direction'}".
Original deliverable JSON:
${artifactJson}

Produce a revised version that respects the CEO's decision.
${JSON_ONLY} Same schema as the original.`
}

export function execSummaryPrompt(run, artifacts) {
  return `You are the COO of ${run.companyName} ("${run.idea}").
The departments delivered:
${artifacts.map((a) => `- ${a.chiefTitle}: ${a.title}`).join('\n')}

Write the executive summary for the CEO in markdown (max 250 words): what was built,
the go-to-market in one line, the price point, projected first-year revenue if known,
and the first three actions the CEO should take tomorrow. Confident, plain language.`
}

export function hireProposePrompt(run, chiefTitle, description, notes = []) {
  const noteBlock = notes.length ? `\nThe CEO refined the brief:\n${notes.map((n) => `- ${n}`).join('\n')}` : ''
  return `You are the ${chiefTitle} of ${run.companyName || 'a new company'} ("${run.idea}").
The CEO wants to hire a new agent into your department. Their brief:
"${description}"${noteBlock}

Draft the hire.
${JSON_ONLY}
Schema:
{
  "name": "a plausible human name",
  "role": "concise job title",
  "task": "the single deliverable this agent owns, one sentence",
  "persona": "2 sentences of personality and working style"
}`
}

// Lenient JSON extraction: whole text, else the outermost brace span.
export function extractJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1))
    }
    throw new Error('No JSON found in model output')
  }
}
