import { RunBus } from './bus.js'
import { CAPS, AUTONOMY } from '../config.js'

export const runs = new Map()
let runCounter = 0

export function createRun({ idea, mode = 'live' }) {
  const id = `run-${Date.now().toString(36)}-${++runCounter}`
  const run = {
    id,
    idea,
    mode,
    status: 'idle',
    companyName: null,
    mission: null,
    capUsd: CAPS.runCapUsd,
    totalSpend: 0,
    constrained: false,
    capAsks: 0,
    agents: new Map(),
    artifacts: new Map(),
    cards: new Map(),
    pendingGates: new Map(),
    instructions: [],
    bus: new RunBus(id),
    controller: new AbortController(),
    killedAt: null,
    orgPlanned: false,
    delivered: false,
    startedAt: Date.now(),
    replay: null,
  }
  runs.set(id, run)
  return run
}

export function makeAgent(run, { id, tier, parentId = null, title, name, persona = '', budgetUsd = 0 }) {
  return {
    id,
    tier, // 'coo' | 'chief' | 'employee'
    parentId,
    title,
    name,
    persona,
    autonomy: AUTONOMY.ASK_BIG,
    budgetUsd,
    spentUsd: 0,
    deptSpentUsd: 0,
    reservedUsd: 0,
    envelopeAsks: 0,
    envelopePromise: null,
    constrained: false,
    status: 'hired', // hired | thinking | waiting | done | paused
    log: [],
    pipeline: null,
    orgChief: null,
    hire: null,
  }
}

export function addAgent(run, agent) {
  run.agents.set(agent.id, agent)
  run.bus.emit('agent_hired', { agent: publicAgent(agent) })
}

export function publicAgent(a) {
  return {
    id: a.id,
    tier: a.tier,
    parentId: a.parentId,
    title: a.title,
    name: a.name,
    persona: a.persona,
    autonomy: a.autonomy,
    budgetUsd: a.budgetUsd,
    spentUsd: a.spentUsd,
    status: a.status,
  }
}

export function setStatus(run, agent, status) {
  if (!agent || agent.status === status) return
  agent.status = status
  run.bus.emit('agent_status', { agentId: agent.id, status })
}

export function logAgent(run, agent, text) {
  if (!agent) return
  const entry = { ts: Date.now(), text }
  agent.log.push(entry)
  if (agent.log.length > 60) agent.log.shift()
  run.bus.emit('agent_log', { agentId: agent.id, ...entry })
}

export function narrate(run, text) {
  run.bus.emit('coo_narration', { text })
}

export function emitRunStatus(run) {
  run.bus.emit('run_status', { status: run.status })
}
