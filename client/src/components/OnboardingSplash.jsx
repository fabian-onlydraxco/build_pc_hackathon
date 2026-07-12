import { useEffect, useRef, useState } from 'react'

// A first-visit tour of Glyde — one concept per flash card. Purely presentational:
// App owns visibility and the "seen" flag, this just walks through STEPS.

// ---- monochrome line-art motifs (one per card) ----------------------------

const ArtIdea = () => (
  <svg className="ob__svg" viewBox="0 0 240 132" aria-hidden="true">
    <circle className="fill" cx="40" cy="66" r="5" />
    <line x1="40" y1="42" x2="40" y2="30" />
    <line x1="40" y1="90" x2="40" y2="102" />
    <line x1="16" y1="66" x2="6" y2="66" />
    <line x1="56" y1="50" x2="64" y2="42" />
    <line x1="56" y1="82" x2="64" y2="90" />
    <line className="dash" x1="76" y1="66" x2="104" y2="66" />
    <path className="fill" d="M104 62 L112 66 L104 70 Z" />
    <rect x="150" y="30" width="46" height="22" rx="6" />
    <rect x="130" y="88" width="40" height="20" rx="6" />
    <rect x="186" y="88" width="40" height="20" rx="6" />
    <path d="M173 52 V70 M150 70 H206 M150 70 V88 M206 70 V88" />
  </svg>
)

const ArtDash = () => (
  <svg className="ob__svg" viewBox="0 0 240 132" aria-hidden="true">
    <rect className="line" x="42" y="28" width="96" height="6" rx="3" />
    <rect className="line" x="42" y="42" width="64" height="6" rx="3" />
    <rect x="36" y="72" width="168" height="32" rx="16" />
    <line x1="52" y1="82" x2="52" y2="94" />
    <rect className="line" x="60" y="85" width="70" height="6" rx="3" />
    <circle className="fill" cx="188" cy="88" r="9" />
    <path className="paper" d="M184 88 L192 88 M189 85 L192 88 L189 91" />
  </svg>
)

const ArtDecision = () => (
  <svg className="ob__svg" viewBox="0 0 240 132" aria-hidden="true">
    <rect x="42" y="22" width="156" height="88" rx="10" />
    <rect className="fill" x="56" y="36" width="46" height="8" rx="4" />
    <rect className="line" x="56" y="54" width="118" height="6" rx="3" />
    <rect className="line" x="56" y="66" width="86" height="6" rx="3" />
    <circle cx="150" cy="92" r="12" />
    <path d="M145 92 L149 96 L156 88" />
    <circle className="soft" cx="182" cy="92" r="12" />
    <path className="soft" d="M177 87 L187 97 M187 87 L177 97" />
  </svg>
)

const ArtOrg = () => (
  <svg className="ob__svg" viewBox="0 0 240 132" aria-hidden="true">
    <rect x="94" y="18" width="52" height="22" rx="6" />
    <path d="M120 40 V54 M56 54 H184 M56 54 V64 M120 54 V64 M184 54 V64" />
    <rect x="34" y="64" width="44" height="20" rx="6" />
    <rect x="98" y="64" width="44" height="20" rx="6" />
    <rect x="162" y="64" width="44" height="20" rx="6" />
    <path d="M120 84 V96 M104 96 H136 M104 96 V104 M136 96 V104" />
    <circle className="fill" cx="104" cy="110" r="5" />
    <circle className="fill" cx="136" cy="110" r="5" />
  </svg>
)

const ArtSovereign = () => (
  <svg className="ob__svg" viewBox="0 0 240 132" aria-hidden="true">
    <path d="M32 82 A26 26 0 0 1 84 82" />
    <line x1="58" y1="82" x2="74" y2="62" />
    <circle className="fill" cx="58" cy="82" r="3.5" />
    <rect x="104" y="60" width="72" height="16" rx="8" />
    <rect className="fill" x="104" y="60" width="42" height="16" rx="8" />
    <rect className="fill" x="190" y="54" width="30" height="30" rx="7" />
    <rect className="paper" x="200" y="64" width="10" height="10" rx="2" />
  </svg>
)

const ArtPortfolio = () => (
  <svg className="ob__svg" viewBox="0 0 240 132" aria-hidden="true">
    <rect x="44" y="20" width="152" height="92" rx="10" />
    <rect className="fill" x="54" y="32" width="132" height="22" rx="6" />
    <rect className="paper" x="64" y="40" width="64" height="6" rx="3" />
    <circle className="paper" cx="176" cy="43" r="4" />
    <rect className="line" x="64" y="66" width="76" height="6" rx="3" />
    <circle className="fill" cx="176" cy="69" r="4" />
    <rect className="line" x="64" y="88" width="52" height="6" rx="3" />
  </svg>
)

const STEPS = [
  {
    art: ArtIdea,
    eyebrow: 'Welcome to Glyde',
    title: 'Type an idea. Own a company.',
    body: "You're the CEO of a fully agentic one-person company. Describe a business idea and a COO agent composes the exact team it needs — then hands you a complete package: research, pricing, legal docs, a launch kit, a landing page.",
  },
  {
    art: ArtDash,
    eyebrow: 'Dash-AI',
    title: 'Your desk. One command line.',
    body: 'Type your idea and hit Build — the org assembles itself live. Talk to your COO anytime from the composer, or type “@” to give a single officer a direct order.',
  },
  {
    art: ArtDecision,
    eyebrow: 'Decision Desk',
    title: 'Nothing big happens without you.',
    body: 'Budget requests, pricing, publishing — each arrives as an approval card. Approve it, or reject with a note and the agent revises its work. You stay sovereign the whole way.',
  },
  {
    art: ArtOrg,
    eyebrow: 'Agent Control',
    title: 'See — and steer — every agent.',
    body: 'Open the org chart to inspect any agent: rewrite its persona, set its autonomy dial, watch its live burn. Reach a department’s “+ Hire” node to grow the team in plain language.',
  },
  {
    art: ArtSovereign,
    eyebrow: 'Stay in control',
    title: 'Real money. One kill switch.',
    body: 'Every agent spends against a budget envelope metered on real API cost. If the company ever drifts somewhere you don’t like, press STOP and the whole thing freezes instantly.',
  },
  {
    art: ArtPortfolio,
    eyebrow: "You're ready",
    title: 'Run a portfolio, not just a company.',
    body: 'The sidebar runs several companies at once — each badges what needs you and shows its own burn. Start with one idea and go.',
  },
]

export default function OnboardingSplash({ onClose }) {
  const [step, setStep] = useState(0)
  const panelRef = useRef(null)
  const last = STEPS.length - 1
  const current = STEPS[step]
  const Art = current.art

  const goTo = (i) => setStep(Math.max(0, Math.min(last, i)))
  const next = () => (step < last ? goTo(step + 1) : onClose())
  const back = () => goTo(step - 1)

  // Focus the panel on open, and hand focus back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement
    panelRef.current?.focus()
    return () => {
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowLeft') back()
      else if (event.key === 'ArrowRight') next()
      // Enter belongs to whichever control is focused — only advance when the
      // press lands on the panel shell, so a focused button isn't double-fired.
      else if (event.key === 'Enter' && event.target?.tagName !== 'BUTTON') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ob" role="dialog" aria-modal="true" aria-labelledby="ob-title">
      <div className="ob__panel" ref={panelRef} tabIndex={-1}>
        <div className="ob__top">
          <span className="ob__count label">
            {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
          <button className="ob__skip" onClick={onClose}>
            Skip tour
          </button>
        </div>

        <div className="ob__stage" key={step}>
          <div className="ob__art">
            <Art />
          </div>
          <div className="ob__eyebrow label">{current.eyebrow}</div>
          <h2 className="ob__title" id="ob-title">
            {current.title}
          </h2>
          <p className="ob__body">{current.body}</p>
        </div>

        <div className="ob__nav">
          <div className="ob__dots" role="group" aria-label="Tour progress">
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`ob__dot ${i === step ? 'ob__dot--on' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Go to card ${i + 1} of ${STEPS.length}`}
                aria-current={i === step ? 'true' : undefined}
              />
            ))}
          </div>
          <div className="ob__btns">
            {step > 0 && (
              <button className="btn btn--ghost btn--sm" onClick={back}>
                Back
              </button>
            )}
            <button className="btn btn--ink btn--sm" onClick={next}>
              {step < last ? 'Next' : 'Start building'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
