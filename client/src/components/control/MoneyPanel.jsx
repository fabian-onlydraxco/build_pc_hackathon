import { fmtUsd, fmtBig, useCountUp } from '../../lib/format.js'

export default function MoneyPanel({ state }) {
  const burn = useCountUp(state.totalSpend)

  const projected = Object.values(state.artifacts)
    .map((artifact) => artifact.metrics?.projected_revenue_y1_usd)
    .find((value) => typeof value === 'number' && value > 0)

  const chiefs = state.agentOrder.map((id) => state.agents[id]).filter((agent) => agent?.tier === 'chief')

  return (
    <section className="panel" aria-label="Money">
      <div className="panel__head">
        <h2 className="panel__title">Money</h2>
        <span className="label">cap {fmtUsd(state.capUsd)}</span>
      </div>

      <div className="money__stats">
        <div>
          <span className="label">Projected revenue · Y1</span>
          <div className={`money__value ${projected == null ? 'money__value--dim' : ''}`}>
            {projected == null ? '——' : fmtBig(projected)}
          </div>
          <div className="money__cap">{projected == null ? 'awaiting CFO' : 'CFO base case'}</div>
        </div>
        <div>
          <span className="label">Real burn</span>
          <div className="money__value">{fmtUsd(burn)}</div>
          <div className="money__cap">actual agent labor</div>
        </div>
      </div>

      {chiefs.length === 0 && <div className="shelf__empty">Department envelopes appear when the company forms.</div>}

      {chiefs.map((chief) => {
        const dept = state.deptSpend[chief.id] || { spent: chief.spentUsd || 0, budget: chief.budgetUsd || 0 }
        const pct = dept.budget > 0 ? Math.min((dept.spent / dept.budget) * 100, 100) : 0
        return (
          <div className="envelope" key={chief.id}>
            <div className="envelope__row">
              <span className="envelope__name">{chief.title.replace(/^Chief\s|\sOfficer$/g, '')}</span>
              <span className="envelope__nums">
                {fmtUsd(dept.spent)} / {fmtUsd(dept.budget)}
              </span>
            </div>
            <div className="bar">
              <div className="bar__fill" style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
          </div>
        )
      })}
    </section>
  )
}
