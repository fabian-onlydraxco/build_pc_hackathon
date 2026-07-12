// The client renders exclusively from the SSE event stream — this reducer is
// the single translation from events to UI state (which is why replay mode is
// indistinguishable from live).
export const initialState = {
  runId: null,
  provider: null,
  status: 'idle', // idle | composing | staffing | working | delivering | paused | done | error
  killed: false,
  idea: '',
  companyName: null,
  mission: null,
  capUsd: 0,
  totalSpend: 0,
  agents: {},
  agentOrder: [],
  cards: {},
  stream: [], // {kind: narration|ceo|agent|card|artifact|error, ...}
  artifacts: {},
  artifactOrder: [],
  deptSpend: {}, // chiefId -> {spent, budget}
  msgs: {}, // agentId -> [{seq, ts, kind: brief|work, stage, fromId, fromName, toId, toName, text}]
  lastSeq: 0,
}

const patchAgent = (state, agentId, patch) => {
  const agent = state.agents[agentId]
  if (!agent) return state
  return { ...state, agents: { ...state.agents, [agentId]: { ...agent, ...patch } } }
}

// ------------------------------------------------- multi-project root state

export const projectsInitial = { projects: {}, order: [], notices: [] }

// Events worth surfacing in the bell. Anything older than the hydration
// window arrives pre-read so a page reload doesn't fake a full inbox.
function noticeFor(event, project) {
  const { type, data } = event
  const company = project.companyName || (project.idea ? project.idea.slice(0, 32) : 'Project')
  switch (type) {
    case 'needs_approval':
      return { kind: 'decision', text: data.card.title, company }
    case 'artifact_ready':
      return { kind: 'artifact', text: data.artifact.title, company }
    case 'run_done':
      return { kind: 'done', text: 'Package delivered', company }
    case 'error':
      return { kind: 'incident', text: data.message, company }
    default:
      return null
  }
}

export function projectsReducer(state, action) {
  if (action.type === 'add-run') {
    if (state.projects[action.runId]) return state
    return {
      ...state,
      projects: { ...state.projects, [action.runId]: { ...initialState, runId: action.runId } },
      order: [action.runId, ...state.order],
    }
  }
  if (action.type === 'remove-run') {
    if (!state.projects[action.runId]) return state
    const projects = { ...state.projects }
    delete projects[action.runId]
    return {
      projects,
      order: state.order.filter((id) => id !== action.runId),
      notices: state.notices.filter((n) => n.runId !== action.runId),
    }
  }
  if (action.type === 'notices-read') {
    if (!state.notices.some((n) => !n.read)) return state
    return { ...state, notices: state.notices.map((n) => (n.read ? n : { ...n, read: true })) }
  }
  if (action.type === 'event') {
    const id = action.runId
    const prev = state.projects[id] || { ...initialState, runId: id }
    const next = reducer(prev, action)
    if (next === prev && state.projects[id]) return state

    let notices = state.notices
    const notice = noticeFor(action.event, next)
    if (notice) {
      notices = [
        {
          id: `${id}-${action.event.seq}`,
          runId: id,
          ts: action.event.ts,
          read: Date.now() - action.event.ts > 10_000,
          ...notice,
        },
        ...notices,
      ].slice(0, 30)
    }

    return {
      projects: { ...state.projects, [id]: next },
      order: state.projects[id] ? state.order : [id, ...state.order],
      notices,
    }
  }
  return state
}

// ------------------------------------------------------ per-project reducer

export function reducer(state, action) {
  if (action.type === 'reset') return { ...initialState, runId: action.runId || null }
  if (action.type !== 'event') return state

  const { seq, ts, type, data } = action.event
  if (seq <= state.lastSeq) return state // SSE reconnects resend the log
  state = { ...state, lastSeq: seq }

  switch (type) {
    case 'run_started':
      // Status arrives via explicit run_status events (intake → composing → …).
      return { ...state, idea: data.idea, capUsd: data.capUsd, provider: data.provider }

    case 'run_status':
      return { ...state, status: data.status }

    case 'org_planned':
      return { ...state, companyName: data.org.company_name, mission: data.org.mission }

    case 'agent_hired':
      return {
        ...state,
        agents: { ...state.agents, [data.agent.id]: { ...data.agent, log: [] } },
        agentOrder: [...state.agentOrder, data.agent.id],
      }

    case 'agent_status':
      return patchAgent(state, data.agentId, { status: data.status })

    case 'agent_log': {
      const agent = state.agents[data.agentId]
      if (!agent) return state
      const log = [...agent.log, { ts: data.ts, text: data.text }].slice(-60)
      return patchAgent(state, data.agentId, { log })
    }

    case 'coo_narration':
      return { ...state, stream: [...state.stream, { kind: 'narration', seq, ts, text: data.text }] }

    case 'ceo_says':
      return { ...state, stream: [...state.stream, { kind: 'ceo', seq, ts, text: data.text }] }

    // Internal org traffic: every briefing down and work product back up lands
    // in BOTH parties' threads — the agent inspector renders these.
    case 'agent_msg': {
      const msg = { seq, ts, ...data }
      const msgs = { ...state.msgs }
      for (const id of new Set([data.fromId, data.toId])) {
        if (!id || id === 'ceo') continue
        msgs[id] = [...(msgs[id] || []), msg].slice(-120)
      }
      return { ...state, msgs }
    }

    case 'agent_says':
      return {
        ...state,
        stream: [
          ...state.stream,
          { kind: 'agent', seq, ts, name: data.name, title: data.title, text: data.text },
        ],
      }

    case 'needs_approval':
      return {
        ...state,
        cards: { ...state.cards, [data.card.id]: { ...data.card } },
        stream: [...state.stream, { kind: 'card', seq, ts, cardId: data.card.id }],
      }

    case 'approval_resolved': {
      const card = state.cards[data.cardId]
      if (!card) return state
      return {
        ...state,
        cards: {
          ...state.cards,
          [data.cardId]: { ...card, status: data.approved ? 'approved' : 'rejected', note: data.note },
        },
      }
    }

    case 'persona_updated':
      return patchAgent(state, data.agentId, {
        ...(data.persona !== undefined ? { persona: data.persona } : {}),
        ...(data.name ? { name: data.name } : {}),
      })

    case 'autonomy_updated':
      return patchAgent(state, data.agentId, { autonomy: data.autonomy })

    case 'budget_updated': {
      const next = patchAgent(state, data.agentId, { budgetUsd: data.budgetUsd })
      const dept = next.deptSpend[data.agentId]
      return dept
        ? { ...next, deptSpend: { ...next.deptSpend, [data.agentId]: { ...dept, budget: data.budgetUsd } } }
        : next
    }

    case 'cap_updated':
      return { ...state, capUsd: data.capUsd }

    case 'artifact_ready':
      return {
        ...state,
        artifacts: { ...state.artifacts, [data.artifact.id]: data.artifact },
        artifactOrder: state.artifactOrder.includes(data.artifact.id)
          ? state.artifactOrder
          : [...state.artifactOrder, data.artifact.id],
        // Fresh deliverables also land as an embed in the Dash-AI stream.
        stream: state.artifactOrder.includes(data.artifact.id)
          ? state.stream
          : [...state.stream, { kind: 'artifact', seq, ts, artifactId: data.artifact.id }],
      }

    case 'spend_tick': {
      let next = { ...state, totalSpend: data.totalSpendUsd }
      const agent = next.agents[data.agentId]
      if (agent) {
        next.agents = { ...next.agents, [data.agentId]: { ...agent, spentUsd: (agent.spentUsd || 0) + data.costUsd } }
      }
      if (data.deptId) {
        next.deptSpend = {
          ...next.deptSpend,
          [data.deptId]: { spent: data.deptSpentUsd, budget: data.deptBudgetUsd },
        }
      }
      return next
    }

    case 'run_killed':
      return { ...state, killed: true, status: 'paused' }

    case 'run_resumed':
      return { ...state, killed: false, status: 'working' }

    case 'run_done':
      return { ...state, status: 'done', totalSpend: data.totalSpendUsd }

    case 'error':
      return { ...state, stream: [...state.stream, { kind: 'error', seq, ts, text: data.message }] }

    default:
      return state
  }
}
