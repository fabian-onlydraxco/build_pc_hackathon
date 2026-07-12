import { CAPS } from '../config.js'

const JSON_ONLY = 'Respond with ONLY valid JSON. No prose, no code fences.'

// Mid-run CEO instructions must reach every subsequent agent call, not just
// the initial compose — this block is woven into all downstream prompts.
const ceoNotes = (run) =>
  run.instructions?.length
    ? `\nStanding notes from the CEO — factor them into your work where relevant:\n${run.instructions.map((i) => `- ${i}`).join('\n')}\n`
    : ''

export function composePrompt(idea, instructions = []) {
  const notes = instructions.length
    ? `\nStanding instructions from the CEO:\n${instructions.map((i) => `- ${i}`).join('\n')}`
    : ''
  return `You are the COO of a brand-new one-person company. The CEO's idea:
"${idea}"
${notes}
Design the smallest executive team that can turn this idea into a complete business package today. Typical teams draw from: Research, Finance, Marketing, Legal, Development — but choose what THIS idea needs (max ${CAPS.maxChiefs} chiefs, max ${CAPS.maxEmployeesPerChief} hires each).

"budget_usd" is the department's AI-agent-labor envelope for TODAY'S run, in US dollars — realistic values are 0.05 to 0.50. It is NOT the business's operating budget.

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
${ceoNotes(run)}
Write a tight 3-5 sentence department plan: how the team's outputs combine into your deliverable. Plain text.`
}

export function employeePrompt(run, chief, hire) {
  return `You are a ${hire.role} at ${run.companyName} (${run.mission}), reporting to the ${chief.title}.
Your single task: ${hire.task}
The company is executing: "${run.idea}"
${ceoNotes(run)}
Produce your work product directly, in concise markdown (150-300 words). No preamble.`
}

export function synthesisPrompt(run, chief, orgChief, employeeOutputs, { constrained = false } = {}) {
  return `You are ${chief.name}, ${chief.title} of ${run.companyName}. Persona: ${chief.persona}
Company idea: "${run.idea}". Mission: ${run.mission}
${ceoNotes(run)}${constrained ? 'Budget is tight: be decisive and concise.\n' : ''}Your team delivered:
${employeeOutputs.map((o, i) => `--- Team output ${i + 1} ---\n${o}`).join('\n')}

Synthesize your hero deliverable: ${orgChief.hero_artifact}.
Set "format" to "html" ONLY if the deliverable is itself a web page (landing page, website, app UI) — then "content" must be ONE complete self-contained HTML file with inline CSS and no external resources. Otherwise set "format" to "markdown" with polished markdown content.

${JSON_ONLY}
Schema:
{
  "title": "string",
  "format": "markdown | html",
  "content": "the full deliverable",
  "metrics": { "optional numeric facts, e.g. projected_revenue_y1_usd": 0 }
}`
}

export function directPrompt(run, chief, order) {
  return `You are ${chief.name}, ${chief.title} of ${run.companyName || 'the company'} ("${run.idea}"). Persona: ${chief.persona}
${ceoNotes(run)}The CEO just gave you a DIRECT order, bypassing the normal chain of command:
"${order}"

Do it now. Reply with the finished work product in concise markdown (under 250 words). No preamble, no questions back.`
}

// The COO's live reply when the CEO speaks to the company. This is a real
// model call — the answer must engage with what the CEO actually said.
export function cooReplyPrompt(run, text) {
  const chiefs = [...run.agents.values()].filter((a) => a.tier === 'chief')
  const team = chiefs.length
    ? chiefs
        .map(
          (c) =>
            `- ${c.name}, ${c.title} — ${c.pipeline?.artifact ? `delivered "${c.pipeline.artifact.title}"` : c.status}`,
        )
        .join('\n')
    : '- (still assembling the executive team)'
  const prior = run.instructions.slice(0, -1)
  const priorBlock = prior.length
    ? `\nEarlier instructions from the CEO:\n${prior.map((i) => `- ${i}`).join('\n')}\n`
    : ''
  return `You are Atlas, COO of ${run.companyName || 'a company being formed right now'}${run.mission ? ` — mission: ${run.mission}` : ''}.
Persona: calm, decisive, allergic to waste. You answer only to the CEO.
The company is executing the CEO's idea: "${run.idea}". Run status: ${run.status}. Agent-labor spend so far: $${run.totalSpend.toFixed(2)} of a $${run.capUsd.toFixed(2)} cap.
Your chiefs:
${team}
${priorBlock}
The CEO just said to you: "${text}"

Reply to the CEO directly and specifically — engage with what they actually said. If it's an instruction, confirm it and say concretely how you'll steer the team. If it's a question, answer it from the company's real state above. If it's unclear or garbled, say so plainly and ask one sharp clarifying question. Under 120 words. Plain conversational text — no headers, no bullet lists.`
}

export function revisePrompt(run, chief, artifactJson, reason) {
  return `You are ${chief.name}, ${chief.title} of ${run.companyName}.
${ceoNotes(run)}The CEO REJECTED your deliverable with this note: "${reason || 'take a different direction'}".
Original deliverable JSON:
${artifactJson}

Produce a revised version that respects the CEO's decision.
${JSON_ONLY} Same schema as the original.`
}

export function execSummaryPrompt(run, artifacts) {
  return `You are the COO of ${run.companyName} ("${run.idea}").
The departments delivered:
${artifacts.map((a) => `- ${a.chiefTitle}: ${a.title}`).join('\n')}
${ceoNotes(run)}
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

// Intake interview — the COO scopes the idea with a possibly first-time CEO
// before any company is built. Ask, suggest defaults, confirm. Never assume.
export function intakeOpenPrompt(idea) {
  return `You are Atlas, COO of a company about to be formed. The CEO — who may be completely new to business — proposed this idea:
"${idea}"

Before you build the company, make sure the project starts on solid ground. Reply with:
1. One sentence reflecting back what you understand they want (so they can correct you).
2. The 2-4 MOST important clarifying questions as a short numbered list — think target customer, price point, tone/brand, scope or platform. For EACH question suggest a sensible default in parentheses so a novice can simply agree.
Close by telling them they can answer any or all of it, or just say "start" and you'll run with the defaults.
Under 140 words. Plain conversational text, no headers.`
}

export function intakeReplyPrompt(run) {
  const transcript = run.intake.log
    .map((m) => `${m.role === 'ceo' ? 'CEO' : 'Atlas'}: ${m.text}`)
    .join('\n')
  return `You are Atlas, COO. You are interviewing the CEO (possibly a novice) to pin down the brief for their idea:
"${run.idea}"

Conversation so far:
${transcript}

Decide: do you now understand the project well enough to build the company confidently? Never assume — if anything important is still vague, ask the next question (with a suggested default). If the CEO's answers are unclear or garbled, say so and check. If you have enough, or the CEO clearly wants to begin, set ready=true and distill the brief.
${JSON_ONLY}
Schema:
{
  "reply": "what you say to the CEO next — the next question, or a confident confirmation summarizing the locked brief",
  "ready": false,
  "brief": ["3-6 short standing instructions for the team — only when ready is true, else []"]
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
