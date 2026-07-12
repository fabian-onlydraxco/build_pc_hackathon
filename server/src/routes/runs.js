import { Router } from 'express'
import { PROVIDER, AUTONOMY } from '../config.js'
import { round } from '../core/burn.js'
import { createRun, runs, publicAgent, narrate, logAgent } from '../core/run.js'
import { sseHandler } from '../core/bus.js'
import { startIntake, beginBuild, killRun, resumeRun, proposeHire, executeHire, directTask, instructRun } from '../core/orchestrator.js'
import { resolveApproval } from '../core/gates.js'
import { saveFixture, loadFixture, listFixtures } from '../replay/recorder.js'
import { startReplay, replayDecision, replayKill, replayResume } from '../replay/replayer.js'

export const router = Router()

router.get('/health', (req, res) => {
  res.json({ ok: true, provider: PROVIDER, fixtures: listFixtures() })
})

// Project list — lets the client rediscover runs after a reload; each
// project's full state then rebuilds from its own SSE log replay.
router.get('/runs', (req, res) => {
  const list = [...runs.values()].map((run) => ({
    id: run.id,
    idea: run.idea,
    companyName: run.companyName,
    status: run.status,
    mode: run.mode,
    totalSpendUsd: round(run.totalSpend),
    startedAt: run.startedAt,
  }))
  res.json({ runs: list })
})

router.post('/runs', (req, res) => {
  const { idea = '', mode = 'live', fixture = 'golden-run', speed = 1 } = req.body || {}

  if (mode === 'replay') {
    let fx
    try {
      fx = loadFixture(fixture)
    } catch {
      return res.status(404).json({ error: `No fixture "${fixture}" yet — finish a live run and save it first.` })
    }
    const run = createRun({ idea: fx.idea, mode: 'replay' })
    startReplay(run, fx, Number(speed) || 1)
    return res.json({ runId: run.id, mode: 'replay', provider: PROVIDER })
  }

  if (!String(idea).trim()) return res.status(400).json({ error: 'Type an idea first.' })
  const run = createRun({ idea: String(idea).trim(), mode: 'live' })
  startIntake(run) // COO scopes the brief first; the build starts on confirm/"start"
  res.json({ runId: run.id, mode: 'live', provider: PROVIDER })
})

// CEO skips (or concludes) the intake interview — build with what we have.
router.post('/runs/:id/build', (req, res) => {
  const run = getRun(req, res)
  if (!run) return
  if (run.mode === 'replay' || !run.intake?.active) return res.json({ ok: false })
  narrate(run, 'Starting the build on your signal.')
  res.json(beginBuild(run))
})

function getRun(req, res) {
  const run = runs.get(req.params.id)
  if (!run) res.status(404).json({ error: 'No such run' })
  return run
}

router.get('/runs/:id/events', (req, res) => {
  const run = runs.get(req.params.id)
  if (!run) return res.status(404).end()
  sseHandler(run.bus)(req, res)
})

router.post('/runs/:id/cards/:cardId', (req, res) => {
  const run = getRun(req, res)
  if (!run) return
  const { approved = false, note = '' } = req.body || {}
  if (run.mode === 'replay') {
    replayDecision(run, req.params.cardId, !!approved, String(note))
    return res.json({ ok: true })
  }
  res.json({ ok: resolveApproval(run, req.params.cardId, !!approved, String(note)) })
})

router.post('/runs/:id/agents/:agentId', (req, res) => {
  const run = getRun(req, res)
  if (!run) return
  const { persona, name, autonomy, budgetUsd } = req.body || {}

  if (run.mode === 'replay') {
    // No live agent objects behind a replay — reflect edits straight onto the stream.
    if (persona !== undefined || name !== undefined) {
      run.bus.emit('persona_updated', { agentId: req.params.agentId, persona, name })
    }
    if (autonomy) run.bus.emit('autonomy_updated', { agentId: req.params.agentId, autonomy })
    if (budgetUsd !== undefined) {
      run.bus.emit('budget_updated', { agentId: req.params.agentId, budgetUsd: Number(budgetUsd) })
    }
    return res.json({ ok: true })
  }

  const agent = run.agents.get(req.params.agentId)
  if (!agent) return res.status(404).json({ error: 'No such agent' })

  if (persona !== undefined) agent.persona = String(persona)
  if (name !== undefined && String(name).trim()) agent.name = String(name).trim()
  if (persona !== undefined || name !== undefined) {
    run.bus.emit('persona_updated', { agentId: agent.id, persona: agent.persona, name: agent.name })
    logAgent(run, agent, 'Persona updated by the CEO — applies from my next task')
  }
  if (autonomy && Object.values(AUTONOMY).includes(autonomy)) {
    agent.autonomy = autonomy
    run.bus.emit('autonomy_updated', { agentId: agent.id, autonomy })
  }
  if (budgetUsd !== undefined && Number(budgetUsd) > 0) {
    agent.budgetUsd = Number(budgetUsd)
    run.bus.emit('budget_updated', { agentId: agent.id, budgetUsd: agent.budgetUsd })
  }
  res.json({ ok: true, agent: publicAgent(agent) })
})

router.post('/runs/:id/kill', (req, res) => {
  const run = getRun(req, res)
  if (!run) return
  run.mode === 'replay' ? replayKill(run) : killRun(run)
  res.json({ ok: true })
})

router.post('/runs/:id/resume', (req, res) => {
  const run = getRun(req, res)
  if (!run) return
  if (run.mode === 'replay') replayResume(run)
  else resumeRun(run) // async continuation streams over SSE
  res.json({ ok: true })
})

router.post('/runs/:id/instruct', (req, res) => {
  const run = getRun(req, res)
  if (!run) return
  const text = String(req.body?.text || '').trim()
  if (!text) return res.status(400).json({ error: 'Empty instruction' })

  if (run.mode === 'replay') {
    // Theatrical branch — replays never touch the network.
    run.instructions.push(text)
    run.bus.emit('ceo_says', { text })
    setTimeout(() => narrate(run, `Noted, CEO — "${text}". I'll steer the team accordingly.`), 900)
    return res.json({ ok: true })
  }

  res.json(instructRun(run, text)) // COO answers over SSE with a real model call
})

router.post('/runs/:id/direct', (req, res) => {
  const run = getRun(req, res)
  if (!run) return
  const { chiefId = '', text = '' } = req.body || {}
  if (!String(text).trim()) return res.status(400).json({ error: 'Empty order' })

  if (run.mode === 'replay') {
    // Theatrical branch — no real agents behind a replay.
    run.bus.emit('ceo_says', { text: String(text).trim() })
    setTimeout(() => {
      run.bus.emit('agent_says', {
        agentId: chiefId,
        name: 'Officer',
        title: 'Direct line',
        text: `On it, CEO — handling "${String(text).trim()}" right away. Consider it done.`,
      })
    }, 1200)
    return res.json({ ok: true })
  }

  try {
    res.json(directTask(run, { chiefId, text: String(text).trim() }))
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/runs/:id/hire-propose', async (req, res) => {
  const run = getRun(req, res)
  if (!run) return
  const { chiefId = '', chiefTitle = '', description = '', notes = [] } = req.body || {}
  if (!String(description).trim()) return res.status(400).json({ error: 'Describe the hire first.' })
  try {
    const proposal = await proposeHire(run, {
      chiefId,
      chiefTitle: String(chiefTitle),
      description: String(description).trim(),
      notes: Array.isArray(notes) ? notes.map(String) : [],
    })
    res.json({ proposal })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/runs/:id/hire', (req, res) => {
  const run = getRun(req, res)
  if (!run) return
  const { chiefId = '', proposal = {}, scope = 'project' } = req.body || {}
  if (!proposal.role || !proposal.task) return res.status(400).json({ error: 'Incomplete hire proposal.' })
  try {
    const result = executeHire(run, {
      chiefId,
      proposal: {
        name: String(proposal.name || proposal.role),
        role: String(proposal.role),
        task: String(proposal.task),
        persona: String(proposal.persona || ''),
      },
      scope: scope === 'all' ? 'all' : 'project',
    })
    res.json({ ok: true, ...result })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/runs/:id/delete', (req, res) => {
  const run = runs.get(req.params.id)
  if (run) {
    if (run.mode === 'replay') {
      if (run.replay) run.replay.paused = true // parks the replay loop for good
    } else {
      killRun(run) // aborts in-flight work; no-op on finished runs
    }
    runs.delete(run.id)
  }
  res.json({ ok: true })
})

router.post('/runs/:id/save-fixture', (req, res) => {
  const run = getRun(req, res)
  if (!run) return
  const result = saveFixture(run, req.body?.name || 'golden-run')
  res.json({ ok: true, ...result })
})
