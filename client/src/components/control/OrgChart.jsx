import { fmtUsd } from '../../lib/format.js'

function Dot({ status }) {
  return <span className={`dot dot--${status || 'hired'}`} aria-hidden="true" />
}

function Node({ agent, dept, selected, onSelect, className = '' }) {
  const spend =
    agent.tier === 'chief'
      ? `${fmtUsd(dept?.spent ?? agent.spentUsd ?? 0)} / ${fmtUsd(dept?.budget ?? agent.budgetUsd ?? 0)}`
      : agent.spentUsd > 0
        ? fmtUsd(agent.spentUsd)
        : null

  return (
    <button
      className={`node ${className} ${selected ? 'node--selected' : ''}`}
      onClick={() => onSelect(agent.id)}
      title={`${agent.name} — ${agent.title}`}
    >
      <div className="node__row">
        <Dot status={agent.status} />
        <span className="node__name">{agent.name}</span>
      </div>
      <div className="node__title">{agent.title}</div>
      {spend && <div className="node__spend">{spend}</div>}
    </button>
  )
}

export default function OrgChart({ state, selectedId, onSelect, onHire, goDash }) {
  const coo = state.agents.coo
  const chiefs = state.agentOrder.map((id) => state.agents[id]).filter((agent) => agent?.tier === 'chief')
  const employeesOf = (chiefId) =>
    state.agentOrder.map((id) => state.agents[id]).filter((agent) => agent?.tier === 'employee' && agent.parentId === chiefId)

  if (!coo) {
    return (
      <div className="org">
        <div className="org__empty">
          <p style={{ marginBottom: 'var(--s4)' }}>No company yet. The org chart assembles itself here, live, the moment you give it an idea.</p>
          <button className="btn btn--ink btn--sm" onClick={goDash}>
            Go to Dash-AI
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="org">
      <div className="org__tier">
        <div className="node node--ceo" role="presentation">
          <div className="node__row">
            <span className="node__name">You</span>
          </div>
          <div className="node__title">Chief Executive Officer · Human</div>
        </div>
      </div>

      <div className="org__link" />

      <div className="org__tier">
        <Node
          agent={coo}
          selected={selectedId === 'coo'}
          onSelect={onSelect}
          className="node--coo"
        />
      </div>

      {chiefs.length > 0 && <div className="org__link" />}

      <div className="org__chiefs">
        {chiefs.map((chief) => (
          <div className="org__dept" key={chief.id}>
            <Node
              agent={chief}
              dept={state.deptSpend[chief.id]}
              selected={selectedId === chief.id}
              onSelect={onSelect}
            />
            <div className="org__hires">
              {employeesOf(chief.id).map((employee) => (
                <Node
                  key={employee.id}
                  agent={employee}
                  selected={selectedId === employee.id}
                  onSelect={onSelect}
                  className="node--employee"
                />
              ))}
              <button
                className="node node--employee node--add"
                onClick={() => onHire(chief.id)}
                title={`Hire into ${chief.title}`}
              >
                + Hire
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
