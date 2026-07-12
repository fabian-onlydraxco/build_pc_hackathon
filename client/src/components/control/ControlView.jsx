import { useState } from 'react'
import OrgChart from './OrgChart.jsx'
import AgentInspector from './AgentInspector.jsx'
import MoneyPanel from './MoneyPanel.jsx'
import ArtifactsShelf from './ArtifactsShelf.jsx'
import ArtifactViewer from './ArtifactViewer.jsx'
import HirePanel from './HirePanel.jsx'
import DecisionCard from '../dash/DecisionCard.jsx'

export default function ControlView({ state, selectedId, setSelectedId, onUpdateAgent, onDecide, goDash, notify }) {
  const [viewingId, setViewingId] = useState(null)
  const [hireChiefId, setHireChiefId] = useState(null)
  const selected = selectedId ? state.agents[selectedId] : null
  const viewing = viewingId ? state.artifacts[viewingId] : null
  const pendingCards = Object.values(state.cards)
    .filter((card) => card.status === 'pending')
    .slice(-2)

  return (
    <div className="control">
      <section>
        <OrgChart
          state={state}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onHire={setHireChiefId}
          goDash={goDash}
        />
      </section>

      <aside className="control__side">
        <MoneyPanel state={state} />
        <ArtifactsShelf state={state} onOpen={setViewingId} />
      </aside>

      {selected && (
        <>
          <div className="inspector-veil" onClick={() => setSelectedId(null)} />
          <AgentInspector
            key={selected.id}
            agent={selected}
            dept={state.deptSpend[selected.id]}
            onClose={() => setSelectedId(null)}
            onUpdate={(patch) => onUpdateAgent(selected.id, patch)}
          />
        </>
      )}

      {pendingCards.length > 0 && (
        <div className="dock">
          {pendingCards.map((card) => (
            <DecisionCard key={card.id} card={card} onDecide={onDecide} />
          ))}
        </div>
      )}

      {viewing && <ArtifactViewer artifact={viewing} onClose={() => setViewingId(null)} />}

      {hireChiefId && (
        <HirePanel
          runId={state.runId}
          chief={state.agents[hireChiefId]}
          onClose={() => setHireChiefId(null)}
          notify={notify}
        />
      )}
    </div>
  )
}
