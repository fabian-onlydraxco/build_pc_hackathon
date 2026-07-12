export default function ArtifactsShelf({ state, onOpen }) {
  const artifacts = state.artifactOrder.map((id) => state.artifacts[id]).filter(Boolean)

  return (
    <section className="panel" aria-label="Artifacts">
      <div className="panel__head">
        <h2 className="panel__title">Artifacts</h2>
        <span className="label">{artifacts.length} delivered</span>
      </div>

      {artifacts.length === 0 && (
        <div className="shelf__empty">Deliverables land here as each chief finishes their hero artifact.</div>
      )}

      {artifacts.map((artifact) => (
        <button className="shelf__item" key={artifact.id} onClick={() => onOpen(artifact.id)}>
          <span style={{ minWidth: 0 }}>
            <span className="shelf__name">{artifact.title}</span>
            <div className="shelf__meta">
              {artifact.chiefTitle} · {artifact.format === 'html' ? 'live preview' : 'document'}
            </div>
          </span>
          <span className="shelf__open">open →</span>
        </button>
      ))}
    </section>
  )
}
