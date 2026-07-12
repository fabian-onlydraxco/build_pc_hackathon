import { CAPS, PROVIDER } from '../config.js'
import { complete } from '../llm/adapter.js'
import { abortError, isAbort } from '../llm/errors.js'
import {
  composePrompt,
  chiefPlanPrompt,
  employeePrompt,
  synthesisPrompt,
  revisePrompt,
  execSummaryPrompt,
  hireProposePrompt,
  directPrompt,
  cooReplyPrompt,
  intakeOpenPrompt,
  intakeReplyPrompt,
  extractJson,
} from '../llm/prompts.js'
import { draftProposal } from '../llm/hireDraft.js'
import { recordSpend, round } from './burn.js'
import { gateNeeded, requestApproval } from './gates.js'
import { attachRosterHires, addToRoster } from './roster.js'
import { makeAgent, addAgent, setStatus, logAgent, narrate, emitRunStatus } from './run.js'

const CHIEF_NAMES = ['Aria Tan', 'Marcus Webb', 'Sana Iyer', 'Leo Okafor', 'June Park']

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
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

// ---------------------------------------------------------------- gates: money

async function ensureRunCap(run) {
  if (run.constrained) return
  if (run.capPromise) return run.capPromise
  if (run.totalSpend + CAPS.estimatedCallUsd <= run.capUsd || run.capAsks >= 1) return
  run.capAsks++
  run.capPromise = (async () => {
    const decision = await requestApproval(run, {
      category: 'runcap',
      agentId: 'coo',
      title: 'Company spend cap reached',
      body: `Atlas: "Total agent labor has reached your run cap ($${run.capUsd.toFixed(2)}). Raise it by $0.50 to finish properly, or hold it and I'll wrap up lean."`,
      costUsd: 0.5,
    })
    if (decision.approved) {
      run.capUsd += 0.5
      run.bus.emit('cap_updated', { capUsd: run.capUsd })
      narrate(run, 'Cap raised — finishing the package.')
    } else {
      run.constrained = true
      narrate(run, 'Cap held. Wrapping up within budget.')
    }
    run.capPromise = null
  })()
  return run.capPromise
}

// Check and RESERVE in one synchronous step — parallel employees must not
// slip past the envelope together in the gap between check and reservation.
// Returns once the caller holds a reservation; may park on a Decision Desk card.
async function reserveWithinEnvelope(run, chief) {
  const est = CAPS.estimatedCallUsd
  for (;;) {
    const exempt = chief.constrained || run.constrained || chief.envelopeAsks >= 1
    const projected = chief.deptSpentUsd + chief.reservedUsd + est
    if (exempt || projected <= chief.budgetUsd) {
      chief.reservedUsd += est // same tick as the check — atomic under the event loop
      return
    }
    if (!chief.envelopePromise) {
      chief.envelopeAsks++
      const ask = 0.2
      chief.envelopePromise = (async () => {
        const decision = await requestApproval(run, {
          category: 'envelope',
          agentId: chief.id,
          title: `${chief.title} requests budget`,
          body: `${chief.name}: "My envelope ($${chief.budgetUsd.toFixed(2)}) won't cover the remaining work. Requesting +$${ask.toFixed(2)} to finish ${chief.orgChief?.hero_artifact || 'the deliverable'}."`,
          costUsd: ask,
        })
        if (decision.approved) {
          chief.budgetUsd += ask
          run.bus.emit('budget_updated', { agentId: chief.id, budgetUsd: round(chief.budgetUsd) })
          logAgent(run, chief, `Envelope raised to $${chief.budgetUsd.toFixed(2)}`)
        } else {
          chief.constrained = true
          logAgent(run, chief, 'Envelope held — finishing within budget')
        }
        chief.envelopePromise = null
      })()
    }
    await chief.envelopePromise
  }
}

// ------------------------------------------------------------------- llm calls

// Every model call is a conversation inside the org: a briefing goes DOWN to
// the agent, the finished work comes BACK up. Who "sends" the briefing depends
// on the chain of command — this is what each agent's comms thread renders.
const CEO_PARTY = { id: 'ceo', name: 'You (CEO)' }

function assignerOf(run, agent, stage) {
  if (['direct', 'instruct', 'intake', 'hire-propose'].includes(stage)) return CEO_PARTY
  if (agent.tier === 'employee') {
    const chief = run.agents.get(agent.parentId)
    if (chief) return { id: chief.id, name: chief.name }
  }
  if (agent.tier === 'chief') {
    const coo = run.agents.get('coo')
    return { id: 'coo', name: coo?.name || 'Atlas' }
  }
  return CEO_PARTY // the COO answers to the CEO
}

async function callLLM(run, agent, stage, { prompt, maxTokens = 2500, meta = {}, skipEnvelope = false }) {
  await ensureRunCap(run)
  const dept = agent.tier === 'employee' ? run.agents.get(agent.parentId) : agent.tier === 'chief' ? agent : null
  // CEO-initiated work (hiring) skips envelope gating — the CEO asking is the
  // approval. It still burns real, visible spend and respects the run cap.
  const reserved = Boolean(dept && !skipEnvelope)
  if (reserved) await reserveWithinEnvelope(run, dept)
  const assigner = assignerOf(run, agent, stage)
  run.bus.emit('agent_msg', {
    kind: 'brief',
    stage,
    fromId: assigner.id,
    fromName: assigner.name,
    toId: agent.id,
    toName: agent.name,
    text: prompt,
  })
  try {
    const res = await complete({
      tier: agent.tier,
      prompt,
      maxTokens,
      signal: run.controller.signal,
      meta: {
        idea: run.idea,
        chiefId: dept?.id || '',
        persona: agent.persona,
        constrained: agent.constrained || run.constrained,
        ...meta,
        stage,
      },
    })
    recordSpend(run, agent, res.model, res.usage)
    run.bus.emit('agent_msg', {
      kind: 'work',
      stage,
      fromId: agent.id,
      fromName: agent.name,
      toId: assigner.id,
      toName: assigner.name,
      text: res.text,
    })
    return res.text
  } finally {
    if (reserved) dept.reservedUsd = Math.max(0, dept.reservedUsd - CAPS.estimatedCallUsd)
  }
}

async function parseJsonWithRepair(run, agent, text) {
  try {
    return extractJson(text)
  } catch {
    const repaired = await callLLM(run, agent, 'repair', {
      prompt: `The following was supposed to be valid JSON but is not. Return ONLY the corrected JSON, nothing else:\n${text}`,
      maxTokens: 3000,
    })
    return extractJson(repaired)
  }
}

// --------------------------------------------------------------- normalization

function normalizeOrg(org) {
  const chiefs = (org.chiefs || []).slice(0, CAPS.maxChiefs).map((chief, i) => ({
    id: String(chief.id || `chief-${i}`).toLowerCase(),
    title: chief.title || `Chief Officer ${i + 1}`,
    persona: chief.persona || 'Focused and reliable.',
    hero_artifact: chief.hero_artifact || 'Department deliverable',
    // Envelope = today's agent-labor budget. Models sometimes answer with the
    // BUSINESS budget in the hundreds — clamp to a sane labor range.
    budget_usd:
      Number(chief.budget_usd) > 0
        ? Math.min(Math.max(Number(chief.budget_usd), 0.05), 1)
        : CAPS.defaultChiefBudgetUsd,
    hires: (chief.hires || []).slice(0, CAPS.maxEmployeesPerChief).map((hire, j) => ({
      id: String(hire.id || `${chief.id}-${j + 1}`).toLowerCase(),
      role: hire.role || 'Specialist',
      task: hire.task || 'Contribute to the department deliverable',
    })),
  }))

  // Enforce the total agent cap: 1 COO + chiefs + employees ≤ maxAgents.
  let total = 1 + chiefs.length + chiefs.reduce((n, c) => n + c.hires.length, 0)
  for (let i = chiefs.length - 1; total > CAPS.maxAgents && i >= 0; i--) {
    while (total > CAPS.maxAgents && chiefs[i].hires.length > 1) {
      chiefs[i].hires.pop()
      total--
    }
  }

  const seen = new Set(['coo'])
  for (const chief of chiefs) {
    if (seen.has(chief.id)) chief.id = `${chief.id}-x`
    seen.add(chief.id)
    for (const hire of chief.hires) {
      if (seen.has(hire.id)) hire.id = `${chief.id}-${hire.id}`
      seen.add(hire.id)
    }
  }

  return {
    company_name: org.company_name || 'Glyde Venture',
    mission: org.mission || 'Ship the idea.',
    chiefs,
  }
}

function normalizeArtifact(raw, orgChief) {
  return {
    title: raw.title || orgChief.hero_artifact,
    format: raw.format === 'html' ? 'html' : 'markdown',
    content: String(raw.content || ''),
    metrics: raw.metrics && typeof raw.metrics === 'object' ? raw.metrics : {},
  }
}

function finalizeArtifact(run, chief, artifact) {
  const stored = {
    id: `art-${chief.id}`,
    chiefId: chief.id,
    chiefTitle: chief.title,
    ...artifact,
  }
  run.artifacts.set(stored.id, stored)
  run.bus.emit('artifact_ready', { artifact: stored })
  return stored
}

// -------------------------------------------------------------------- pipeline

export async function startRun(run) {
  try {
    if (!run.announced) {
      run.announced = true
      run.bus.emit('run_started', { idea: run.idea, mode: run.mode, capUsd: run.capUsd, provider: PROVIDER })
    }
    run.status = 'composing'
    emitRunStatus(run)
    narrate(run, 'Reading your idea. Composing the smallest company that can ship it…')

    let coo = run.agents.get('coo')
    if (!coo) {
      coo = makeAgent(run, {
        id: 'coo',
        tier: 'coo',
        title: 'Chief Operating Officer',
        name: 'Atlas',
        persona: 'Calm, decisive, allergic to waste. Orchestrates the company and answers only to the CEO.',
      })
      addAgent(run, coo)
    }
    setStatus(run, coo, 'thinking')

    if (!run.orgPlanned) {
      const text = await callLLM(run, coo, 'compose', {
        prompt: composePrompt(run.idea, run.instructions),
        maxTokens: 3000,
      })
      run.org = attachRosterHires(normalizeOrg(await parseJsonWithRepair(run, coo, text)))
      run.companyName = run.org.company_name
      run.mission = run.org.mission
      run.orgPlanned = true
      run.bus.emit('org_planned', { org: run.org })
      narrate(run, `${run.companyName} is formed. Mission: ${run.mission}`)
      const rosterCount = run.org.chiefs.reduce(
        (n, chief) => n + chief.hires.filter((h) => h.roster).length,
        0,
      )
      if (rosterCount > 0) {
        narrate(run, `Your standing roster reported for duty — ${rosterCount} agent${rosterCount > 1 ? 's' : ''} pre-hired.`)
      }
    }
    setStatus(run, coo, 'hired')

    run.status = 'staffing'
    emitRunStatus(run)
    const chiefs = []
    for (const [i, orgChief] of run.org.chiefs.entries()) {
      let chief = run.agents.get(orgChief.id)
      if (!chief) {
        chief = makeAgent(run, {
          id: orgChief.id,
          tier: 'chief',
          title: orgChief.title,
          name: CHIEF_NAMES[i % CHIEF_NAMES.length],
          persona: orgChief.persona,
          budgetUsd: orgChief.budget_usd,
        })
        chief.orgChief = orgChief
        addAgent(run, chief)
        await sleep(320, run.controller.signal)
      }
      chiefs.push(chief)
    }
    narrate(run, `${chiefs.length} chiefs hired. Departments are staffing and getting to work — interrupt me any time.`)
    run.status = 'working'
    emitRunStatus(run)

    await Promise.allSettled(chiefs.map((chief) => runChief(run, chief)))
    if (run.killedAt) return
    await maybeDeliver(run)
  } catch (err) {
    // Only a CEO kill stays quiet — timeouts and API failures must be loud.
    if (run.killedAt) return
    run.bus.emit('error', { message: err.message })
    run.status = 'error'
    emitRunStatus(run)
  }
}

async function runChief(run, chief) {
  const orgChief = chief.orgChief
  const pipeline = (chief.pipeline ||= { plan: null, employees: new Map(), artifact: null })
  chief.inFlight = true
  try {
    if (!pipeline.plan) {
      setStatus(run, chief, 'thinking')
      logAgent(run, chief, 'Planning the department')
      pipeline.plan = await callLLM(run, chief, 'plan', {
        prompt: chiefPlanPrompt(run, chief, orgChief),
        maxTokens: 600,
      })
      logAgent(run, chief, 'Plan ready')
      if (gateNeeded('plan', chief.autonomy)) {
        const decision = await requestApproval(run, {
          category: 'plan',
          agentId: chief.id,
          title: `${chief.title} — plan review`,
          body: pipeline.plan,
        })
        if (!decision.approved) {
          logAgent(run, chief, `CEO note on the plan${decision.note ? `: "${decision.note}"` : ''} — proceeding with it in mind`)
        }
      }
    }

    const hires = (orgChief.hires || []).slice(0, CAPS.maxEmployeesPerChief)
    for (const hire of hires) {
      if (!run.agents.has(hire.id)) {
        const employee = makeAgent(run, {
          id: hire.id,
          tier: 'employee',
          parentId: chief.id,
          title: hire.role,
          name: hire.name || hire.role,
          persona: hire.persona || '',
        })
        employee.hire = hire
        addAgent(run, employee)
        if (hire.roster) logAgent(run, employee, 'Standing-roster agent — hired into every project')
        await sleep(260, run.controller.signal)
      }
    }

    await Promise.all(
      hires.map(async (hire) => {
        if (pipeline.employees.has(hire.id)) return
        const employee = run.agents.get(hire.id)
        setStatus(run, employee, 'thinking')
        logAgent(run, employee, `Working: ${hire.task}`)
        const output = await callLLM(run, employee, 'employee', {
          prompt: employeePrompt(run, chief, hire),
          maxTokens: 900,
          meta: { hireId: hire.id, persona: chief.persona },
        })
        pipeline.employees.set(hire.id, output)
        setStatus(run, employee, 'done')
        logAgent(run, employee, 'Task complete — handed to chief')
      }),
    )

    if (!pipeline.artifact) {
      setStatus(run, chief, 'thinking')
      logAgent(run, chief, `Synthesizing: ${orgChief.hero_artifact}`)
      const text = await callLLM(run, chief, 'synthesis', {
        prompt: synthesisPrompt(run, chief, orgChief, [...pipeline.employees.values()], {
          constrained: chief.constrained || run.constrained,
        }),
        maxTokens: 4000,
      })
      let artifact = normalizeArtifact(await parseJsonWithRepair(run, chief, text), orgChief)

      const category = /financ/i.test(chief.title) ? 'pricing' : /market/i.test(chief.title) ? 'publish' : null
      if (category && gateNeeded(category, chief.autonomy)) {
        const body =
          category === 'pricing'
            ? `${chief.name}: "${artifact.metrics?.pricing_summary || 'Final pricing is ready. Approve to lock it in.'}"`
            : `${chief.name}: "Launch copy and social posts are ready to go public. Approve to publish — reject and I'll re-cut the tone."`
        const decision = await requestApproval(run, {
          category,
          agentId: chief.id,
          title: category === 'pricing' ? 'Pricing decision' : 'Publish approval',
          body,
        })
        if (!decision.approved) {
          logAgent(run, chief, `CEO rejected — revising${decision.note ? ` ("${decision.note}")` : ''}`)
          setStatus(run, chief, 'thinking')
          const revised = await callLLM(run, chief, 'revise', {
            prompt: revisePrompt(run, chief, JSON.stringify(artifact), decision.note),
            maxTokens: 4000,
            meta: { reason: decision.note || 'rejected' },
          })
          artifact = normalizeArtifact(await parseJsonWithRepair(run, chief, revised), orgChief)
        }
      }

      finalizeArtifact(run, chief, artifact)
      pipeline.artifact = artifact
      setStatus(run, chief, 'done')
      // Progress report with every delivery — the CEO always knows the score.
      const allChiefs = [...run.agents.values()].filter((a) => a.tier === 'chief')
      const doneCount = allChiefs.filter((c) => c.pipeline?.artifact).length
      const remaining = allChiefs.filter((c) => !c.pipeline?.artifact).map((c) => c.title)
      narrate(
        run,
        `${chief.title} delivered: ${artifact.title}. That's ${doneCount} of ${allChiefs.length} departments in` +
          (remaining.length ? ` — still working: ${remaining.join(', ')}.` : ' — every department has delivered. Assembling your package.'),
      )
    }

    await maybeDeliver(run)
  } catch (err) {
    if (run.killedAt) {
      setStatus(run, chief, 'paused')
      return
    }
    logAgent(run, chief, `Hit a problem: ${err.message}`)
    run.bus.emit('error', { message: `${chief.title}: ${err.message}`, agentId: chief.id })
    narrate(run, `${chief.title} hit a problem — press STOP then RESUME to retry that department.`)
    setStatus(run, chief, 'paused')
  } finally {
    chief.inFlight = false
  }
}

async function maybeDeliver(run) {
  if (run.delivered || run.delivering || run.killedAt || !run.orgPlanned) return
  const chiefs = [...run.agents.values()].filter((a) => a.tier === 'chief')
  if (!chiefs.length || !chiefs.every((c) => c.pipeline?.artifact)) return
  run.delivering = true
  try {
    run.status = 'delivering'
    emitRunStatus(run)
    const coo = run.agents.get('coo')
    setStatus(run, coo, 'thinking')
    logAgent(run, coo, 'Writing the executive summary')
    const text = await callLLM(run, coo, 'exec', {
      prompt: execSummaryPrompt(run, [...run.artifacts.values()]),
      maxTokens: 900,
    })
    const artifact = {
      id: 'art-exec',
      chiefId: 'coo',
      chiefTitle: 'COO',
      title: 'Executive Summary',
      format: 'markdown',
      content: text,
      metrics: {},
    }
    run.artifacts.set(artifact.id, artifact)
    run.bus.emit('artifact_ready', { artifact })
    setStatus(run, coo, 'done')
    run.delivered = true
    run.status = 'done'
    emitRunStatus(run)
    const spend = round(run.totalSpend)
    narrate(run, `The package is ready, CEO. Total agent labor: $${spend.toFixed(2)}.`)
    run.bus.emit('run_done', { totalSpendUsd: spend, durationMs: Date.now() - run.startedAt })
  } catch (err) {
    if (!run.killedAt) {
      run.bus.emit('error', { message: `Delivery: ${err.message}` })
    }
  } finally {
    run.delivering = false
  }
}

// -------------------------------------------------------------- CEO hiring

// Draft a hire from the CEO's brief. Live runs ask the department chief (a
// real, metered LLM call); replay runs draft locally so the show never
// touches the network.
export async function proposeHire(run, { chiefId, chiefTitle = '', description, notes = [] }) {
  const chief = run.agents.get(chiefId)
  const title = chief?.title || chiefTitle || 'the department'
  if (run.mode === 'replay') return draftProposal(description, title, notes)

  const speaker = chief || run.agents.get('coo')
  if (!speaker) return draftProposal(description, title, notes)

  try {
    const text = await callLLM(run, speaker, 'hire-propose', {
      prompt: hireProposePrompt(run, title, description, notes),
      maxTokens: 500,
      meta: { description, chiefTitle: title, notes },
      skipEnvelope: true,
    })
    const raw = extractJson(text)
    const fallback = draftProposal(description, title, notes)
    return {
      name: raw.name || fallback.name,
      role: raw.role || fallback.role,
      task: raw.task || fallback.task,
      persona: raw.persona || fallback.persona,
    }
  } catch (err) {
    if (isAbort(err)) throw err
    return draftProposal(description, title, notes)
  }
}

// Hire the drafted agent. scope 'all' also saves it to the standing roster
// so every future company staffs it automatically.
export function executeHire(run, { chiefId, proposal, scope = 'project' }) {
  if (run.agents.size >= CAPS.maxAgents && run.mode !== 'replay') {
    throw new Error(`Company is at its ${CAPS.maxAgents}-agent cap.`)
  }

  if (scope === 'all') {
    addToRoster({ deptKey: chiefId, ...proposal })
  }

  const id = `hire-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`

  if (run.mode === 'replay') {
    run.bus.emit('agent_hired', {
      agent: {
        id,
        tier: 'employee',
        parentId: chiefId,
        title: proposal.role,
        name: proposal.name || proposal.role,
        persona: proposal.persona || '',
        autonomy: 'ask-big',
        budgetUsd: 0,
        spentUsd: 0,
        status: 'hired',
      },
    })
    run.bus.emit('agent_log', { agentId: id, ts: Date.now(), text: `Hired by the CEO — ${proposal.task}` })
    run.bus.emit('coo_narration', {
      text: `${proposal.name || proposal.role} joined as ${proposal.role}${scope === 'all' ? ' — and is on your standing roster for every future project.' : '.'}`,
    })
    setTimeout(() => run.bus.emit('agent_status', { agentId: id, status: 'thinking' }), 500)
    setTimeout(() => {
      run.bus.emit('agent_log', { agentId: id, ts: Date.now(), text: 'First deliverable ready — see task log' })
      run.bus.emit('agent_status', { agentId: id, status: 'done' })
    }, 3200)
    return { agentId: id }
  }

  const chief = run.agents.get(chiefId)
  const employee = makeAgent(run, {
    id,
    tier: 'employee',
    parentId: chiefId,
    title: proposal.role,
    name: proposal.name || proposal.role,
    persona: proposal.persona || '',
  })
  addAgent(run, employee)
  logAgent(run, employee, `Hired by the CEO — ${proposal.task}`)
  narrate(
    run,
    `${employee.name} joined ${chief?.title || 'the company'} as ${proposal.role}${scope === 'all' ? ' — and is on your standing roster for every future project.' : '.'}`,
  )

  // First assignment runs immediately; output lands in the task log.
  ;(async () => {
    try {
      setStatus(run, employee, 'thinking')
      const output = await callLLM(run, employee, 'employee', {
        prompt: employeePrompt(run, chief || { title: 'the company' }, { role: proposal.role, task: proposal.task }),
        maxTokens: 900,
        meta: { hireId: id, persona: employee.persona },
        skipEnvelope: true,
      })
      logAgent(run, employee, `Delivered: ${output.slice(0, 240)}${output.length > 240 ? '…' : ''}`)
      setStatus(run, employee, 'done')
    } catch (err) {
      if (run.killedAt) {
        setStatus(run, employee, 'paused')
        return
      }
      logAgent(run, employee, `Hit a problem: ${err.message}`)
      setStatus(run, employee, 'paused')
    }
  })()

  return { agentId: id }
}

// ---------------------------------------------------------------- CEO intake

// New projects open with a short interview: the COO makes sure a (possibly
// first-time) CEO's idea is actually understood before any company is built —
// ask the sharpest questions, suggest defaults, confirm. Never assume.
export function startIntake(run) {
  run.intake = { active: true, log: [] }
  run.announced = true
  run.bus.emit('run_started', { idea: run.idea, mode: run.mode, capUsd: run.capUsd, provider: PROVIDER })
  run.status = 'intake'
  emitRunStatus(run)

  const coo = makeAgent(run, {
    id: 'coo',
    tier: 'coo',
    title: 'Chief Operating Officer',
    name: 'Atlas',
    persona: 'Calm, decisive, allergic to waste. Orchestrates the company and answers only to the CEO.',
  })
  addAgent(run, coo)
  narrate(run, 'Before I build anything — a quick brief so we start this right. Answer what you can, or say "start" and I\'ll run with sensible defaults.')

  ;(async () => {
    try {
      setStatus(run, coo, 'thinking')
      const text = await callLLM(run, coo, 'intake', {
        prompt: intakeOpenPrompt(run.idea),
        maxTokens: 500,
        meta: { turns: 0 },
      })
      run.intake.log.push({ role: 'coo', text })
      run.bus.emit('agent_says', { agentId: coo.id, name: coo.name, title: 'COO', text })
      setStatus(run, coo, 'hired')
    } catch (err) {
      if (run.killedAt) return
      run.bus.emit('error', { message: `COO (intake): ${err.message}` })
      narrate(run, 'I couldn\'t open the brief — tell me about your idea anyway, or say "start" to begin.')
      setStatus(run, coo, 'hired')
    }
  })()
}

function intakeReply(run, text) {
  run.bus.emit('ceo_says', { text })
  const coo = run.agents.get('coo')
  if (run.killedAt || !coo) {
    narrate(run, 'The company is frozen — RESUME and we\'ll pick the brief back up.')
    return { ok: true }
  }
  run.intake.log.push({ role: 'ceo', text })

  // The CEO can always cut the interview short.
  if (/^\s*(start|go|begin|build|proceed|run it|just start|start now)\b/i.test(text)) {
    narrate(run, 'Say no more. Locking the brief and building your company now.')
    beginBuild(run)
    return { ok: true }
  }

  ;(async () => {
    try {
      setStatus(run, coo, 'thinking')
      const raw = await callLLM(run, coo, 'intake', {
        prompt: intakeReplyPrompt(run),
        maxTokens: 700,
        meta: { turns: run.intake.log.filter((m) => m.role === 'ceo').length, text },
      })
      const parsed = await parseJsonWithRepair(run, coo, raw)
      const reply = String(parsed.reply || raw)
      run.intake.log.push({ role: 'coo', text: reply })
      run.bus.emit('agent_says', { agentId: coo.id, name: coo.name, title: 'COO', text: reply })
      setStatus(run, coo, 'hired')
      if (parsed.ready) {
        const brief = Array.isArray(parsed.brief) ? parsed.brief.map(String).filter(Boolean) : []
        run.instructions.push(...brief)
        run.intake.briefed = true
        narrate(run, 'Brief locked. Building your company now.')
        beginBuild(run)
      }
    } catch (err) {
      if (run.killedAt) {
        setStatus(run, coo, 'paused')
        return
      }
      run.bus.emit('error', { message: `COO (intake): ${err.message}` })
      narrate(run, 'I hit a snag processing that — try again, or say "start" to begin with what we have.')
      setStatus(run, coo, 'hired')
    }
  })()
  return { ok: true }
}

// Ends the interview and starts the actual build (idempotent). If the CEO
// skipped ahead before Atlas distilled a brief, their raw intake answers
// still ride along as standing instructions — nothing they said gets lost.
export function beginBuild(run) {
  if (!run.intake?.active) return { ok: false }
  run.intake.active = false
  if (!run.intake.briefed) {
    run.instructions.push(...run.intake.log.filter((m) => m.role === 'ceo').map((m) => m.text))
  }
  startRun(run) // fire and stream
  return { ok: true }
}

// CEO speaks to the company (no @-tag). During intake this feeds the
// interview; afterwards the instruction is stored so every subsequent prompt
// carries it, and the COO answers with a REAL model call — never a canned
// acknowledgment. CEO-initiated → no envelope gate.
export function instructRun(run, text) {
  if (run.intake?.active) return intakeReply(run, text)
  run.instructions.push(text)
  run.bus.emit('ceo_says', { text })

  const coo = run.agents.get('coo')
  if (run.killedAt || !coo) {
    narrate(run, `Noted — "${text}" is on file. The company is ${run.killedAt ? 'frozen; RESUME and' : 'still forming;'} the team will pick it up.`)
    return { ok: true }
  }

  logAgent(run, coo, `CEO instruction: ${text}`)
  const previousStatus = coo.status

  ;(async () => {
    try {
      setStatus(run, coo, 'thinking')
      const output = await callLLM(run, coo, 'instruct', {
        prompt: cooReplyPrompt(run, text),
        maxTokens: 500,
        meta: { text },
        skipEnvelope: true,
      })
      run.bus.emit('agent_says', { agentId: coo.id, name: coo.name, title: 'COO', text: output })
      setStatus(run, coo, previousStatus === 'thinking' ? 'thinking' : previousStatus || 'done')
    } catch (err) {
      if (run.killedAt) {
        setStatus(run, coo, 'paused')
        return
      }
      run.bus.emit('error', { message: `COO (instruction): ${err.message}` })
      narrate(run, `Your note "${text}" is logged and will steer the team — but my reply failed (${err.message}).`)
      setStatus(run, coo, previousStatus || 'done')
    }
  })()

  return { ok: true }
}

// CEO @-tags an officer: the order skips the chain, the officer answers
// directly in the command stream. CEO-initiated → no envelope gate, but
// still metered and run-cap-checked.
export function directTask(run, { chiefId, text }) {
  const chief = run.agents.get(chiefId)
  if (!chief) throw new Error('No such agent')

  run.bus.emit('ceo_says', { text: `@${chief.name} ${text}` })
  logAgent(run, chief, `Direct order from the CEO: ${text}`)
  const previousStatus = chief.status

  ;(async () => {
    try {
      setStatus(run, chief, 'thinking')
      const output = await callLLM(run, chief, 'direct', {
        prompt: directPrompt(run, chief, text),
        maxTokens: 900,
        meta: { text },
        skipEnvelope: true,
      })
      run.bus.emit('agent_says', { agentId: chief.id, name: chief.name, title: chief.title, text: output })
      logAgent(run, chief, 'Direct order completed')
      setStatus(run, chief, previousStatus === 'thinking' ? 'thinking' : previousStatus || 'done')
    } catch (err) {
      if (run.killedAt) {
        setStatus(run, chief, 'paused')
        return
      }
      run.bus.emit('error', { message: `${chief.title} (direct order): ${err.message}`, agentId: chief.id })
      setStatus(run, chief, previousStatus || 'done')
    }
  })()

  return { ok: true }
}

// ---------------------------------------------------------------- kill / resume

export function killRun(run) {
  if (run.status === 'done' || run.killedAt) return
  run.killedAt = Date.now()
  run.controller.abort()
  for (const agent of run.agents.values()) {
    if (agent.status === 'thinking' || agent.status === 'waiting') setStatus(run, agent, 'paused')
  }
  run.status = 'paused'
  emitRunStatus(run)
  run.bus.emit('run_killed', {})
  narrate(run, 'Everything stopped. The company is frozen until you say otherwise.')
}

export async function resumeRun(run) {
  if (!run.killedAt) return
  run.killedAt = null
  run.controller = new AbortController()
  run.bus.emit('run_resumed', {})
  narrate(run, 'Back to work.')

  if (run.intake?.active) {
    run.status = 'intake'
    emitRunStatus(run)
    narrate(run, 'Back to the brief — answer on, or say "start".')
    return
  }
  if (!run.orgPlanned) return startRun(run)

  run.status = 'working'
  emitRunStatus(run)
  // Chiefs parked at a Decision Desk gate are still alive inside runChief —
  // only re-enter the ones whose pipeline actually exited on abort.
  const pending = [...run.agents.values()].filter(
    (a) => a.tier === 'chief' && !a.pipeline?.artifact && !a.inFlight,
  )
  for (const agent of run.agents.values()) {
    if (agent.status === 'paused' && (agent.tier !== 'chief' || agent.inFlight)) {
      setStatus(run, agent, agent.tier === 'employee' ? 'hired' : 'waiting')
    }
  }
  await Promise.allSettled(pending.map((chief) => runChief(run, chief)))
  if (!run.killedAt) await maybeDeliver(run)
}
