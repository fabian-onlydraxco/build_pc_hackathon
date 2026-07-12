import { PRICES } from '../config.js'

export function costOf(model, usage) {
  const price = PRICES[model] || PRICES.mock
  return (usage.input * price.inPerM + usage.output * price.outPerM) / 1_000_000
}

// Record spend for an agent's call and stream the tick. Department spend is
// attributed to the chief (an employee's dept is its parent chief).
export function recordSpend(run, agent, model, usage) {
  const cost = costOf(model, usage)
  agent.spentUsd += cost

  const deptId = agent.tier === 'employee' ? agent.parentId : agent.id
  const dept = run.agents.get(deptId)
  if (dept && dept.tier === 'chief') dept.deptSpentUsd += cost

  run.totalSpend += cost

  run.bus.emit('spend_tick', {
    agentId: agent.id,
    deptId: dept?.tier === 'chief' ? deptId : null,
    costUsd: round(cost),
    deptSpentUsd: dept ? round(dept.deptSpentUsd) : null,
    deptBudgetUsd: dept ? round(dept.budgetUsd) : null,
    totalSpendUsd: round(run.totalSpend),
    usage,
  })
  return cost
}

export const round = (n) => Math.round(n * 10_000) / 10_000
