import { fmtBurn, useCountUp, STATUS_WORD } from '../lib/format.js'

const BellIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
)

export default function TopBar({
  section,
  setSection,
  state,
  running,
  onToggleKill,
  killEnabled,
  showBrand,
  onShowSidebar,
  unread,
  onToggleNotices,
  noticesOpen,
  onOpenGuide,
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

      <div className="topbar__burn" title="Real agent labor spent on this project">
        {fmtBurn(burn)}
      </div>

      {/* Status and STOP live together — one run-control cluster. */}
      <div className="runctl">
        <span className="runctl__status">{STATUS_WORD[state.status] || state.status}</span>
        <button
          className={`kill kill--in-cluster ${state.killed ? 'kill--resume' : ''}`}
          onClick={onToggleKill}
          disabled={!killEnabled}
          title={state.killed ? 'Resume the company' : 'Stop the entire company'}
        >
          <span className="kill__icon" aria-hidden="true" />
          {state.killed ? 'RESUME' : 'STOP'}
        </button>
      </div>

      {onOpenGuide && (
        <button className="bell help" onClick={onOpenGuide} title="How Glyde works" aria-label="How Glyde works">
          ?
        </button>
      )}

      <button
        className={`bell ${noticesOpen ? 'bell--open' : ''}`}
        onClick={onToggleNotices}
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <BellIcon />
        {unread > 0 && <span className="bell__badge">{unread > 9 ? '9+' : `+${unread}`}</span>}
      </button>
    </header>
  )
}
