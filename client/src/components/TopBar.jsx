import { fmtBurn, useCountUp, STATUS_WORD } from '../lib/format.js'

export default function TopBar({
  section,
  setSection,
  state,
  running,
  onToggleKill,
  killEnabled,
  showBrand,
  onShowSidebar,
}) {
  const burn = useCountUp(state.totalSpend)

  return (
    <header className="topbar">
      {showBrand && (
        <>
          <button className="topbar__menu" onClick={onShowSidebar} title="Show projects" aria-label="Show projects">
            »
          </button>
          <div className="topbar__brand">
            Glyde <span>AI</span>
          </div>
        </>
      )}

      <nav className="seg" aria-label="Sections">
        <button
          className={`seg__btn ${section === 'dash' ? 'seg__btn--active' : ''}`}
          onClick={() => setSection('dash')}
        >
          Dash-AI
        </button>
        <button
          className={`seg__btn ${section === 'control' ? 'seg__btn--active' : ''}`}
          onClick={() => setSection('control')}
        >
          Agent Control
          {running && section === 'dash' && <span className="seg__dot" aria-hidden="true" />}
        </button>
      </nav>

      <div className="topbar__spacer" />

      <div className="topbar__status">{STATUS_WORD[state.status] || state.status}</div>
      <div className="topbar__burn" title="Real agent labor spent on this project">
        {fmtBurn(burn)}
      </div>

      <button
        className={`kill ${state.killed ? 'kill--resume' : ''}`}
        onClick={onToggleKill}
        disabled={!killEnabled}
        title={state.killed ? 'Resume the company' : 'Stop the entire company'}
      >
        <span className="kill__icon" aria-hidden="true" />
        {state.killed ? 'RESUME' : 'STOP'}
      </button>
    </header>
  )
}
