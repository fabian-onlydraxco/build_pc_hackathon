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
  stream: [], // {kind: narration|card|error, ...}
  artifacts: {},
  artifactOrder: [],
  deptSpend: {}, // chiefId -> {spent, budget}
  lastSeq: 0,
}

const patchAgent = (state, agentId, patch) => {
  const agent = state.agents[agentId]
  if (!agent) return state
  return { ...state, agents: { ...state.agents, [agentId]: { ...agent, ...patch } } }
}

// ------------------------------------------------- multi-project root state

export const projectsInitial = { projects: {}, order: [] }

export function projectsReducer(state, action) {
  if (action.type === 'add-run') {
    if (state.projects[action.runId]) return state
    return {
      projects: { ...state.projects, [action.runId]: { ...initialState, runId: action.runId } },
      order: [action.runId, ...state.order],
    }
  }
  if (action.type === 'remove-run') {
    if (!state.projects[action.runId]) return state
    const projects = { ...state.projects }
    delete projects[action.runId]
    return { projects, order: state.order.filter((id) => id !== action.runId) }
  }
  if (action.type === 'event') {
    const id = action.runId
    const prev = state.projects[id] || { ...initialState, runId: id }
    const next = reducer(prev, action)
    if (next === prev && state.projects[id]) return state
    return {
      projects: { ...state.projects, [id]: next },
      order: state.projects[id] ? state.order : [id, ...state.order],
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
      return { ...state, status: 'composing', idea: data.idea, capUsd: data.capUsd, provider: data.provider }

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
