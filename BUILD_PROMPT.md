# Glyde AI — Master Build Prompt

> Hand this entire document to the builder agent as its task specification. It is self-contained.

---

You are the builder agent for **Glyde AI**, a hackathon project that must be demoed live in a 3–5 minute pitch. Build it end-to-end, exactly to this specification. Where this document is silent, choose the simplest option that keeps the demo reliable. Do not add features this document does not ask for.

## Context

- Event: BUIDL_OPC_Hackathon_SG (amber.ac / BUIDL_QUESTS). Theme: **Autonomous Agents & Sovereignty** — agents do complex work while the human keeps ownership, judgment, and control. The event celebrates One Person Companies.
- The founder (Fabian) presents solo with a live demo. Reliability on stage outranks every other engineering concern.
- Product one-liner: **type a business idea → watch an AI company assemble itself, work under your control, and deliver a complete business package.**

## Hard constraints — do not violate

1. **Stack:** React SPA built with Vite (`/client`) + Node.js with Express (`/server`), one repo. Plain JavaScript or TypeScript — pick one and stay consistent.
2. **No database, no auth, no user accounts.** Run state lives in server memory; a finished run can be exported/imported as a single JSON snapshot file.
3. **All LLM calls go through one adapter module** (`server/llm/adapter`) exposing a single function shaped like `complete({ role, system, prompt, maxTokens, signal })`. The Claude provider implements it first. No other file may import a vendor SDK. The founder will swap providers later — the adapter is the seam.
4. **Models and prices live in one config file** (`server/config`): default `claude-sonnet-5` for COO and Chiefs, `claude-haiku-4-5-20251001` for employees; a price-per-million-tokens table used for burn metering; the per-run dollar cap. `ANTHROPIC_API_KEY` comes from `.env` (ship `.env.example`).
5. **Server → client updates via Server-Sent Events** (single `/events` stream per run). Client → server via small REST endpoints. No WebSockets.
6. **Strict monochrome UI.** White background, near-black ink, at most 3 grays. No color anywhere — not in charts, not in status dots. Hierarchy comes from type scale, weight, spacing, and motion.
7. **Caps (demo safety):** ≤5 Chiefs, ≤3 employees per Chief, ≤18 agents total per run, hard per-run spend cap (default $1.50), 60s timeout + one retry per LLM call.

## System overview

```
Browser (React SPA)
  ├─ REST: start run, approve/reject card, set autonomy, set budget, edit persona, kill, resume, replay
  └─ SSE:  every agent lifecycle + spend event drives all UI animation
Server (Express)
  ├─ Orchestrator: run state machine, parallel agent execution, gate parking, abort fan-out
  ├─ LLM adapter: Claude provider (swappable)
  ├─ Burn meter: tokens × price table → per-agent and per-department spend
  └─ Recorder/Replayer: logs every event of a run; replay mode re-emits with original timing
```

## Functional specification

### A. App shell

Two top-level sections with a minimal persistent top bar (product name **Glyde AI**, section toggle **Dash-AI / Agent Control**, company status word, live burn total, **kill switch**). The kill switch is visible in both sections at all times.

### B. Dash-AI (the CEO's desk — serene, almost empty)

1. **Quest box**: one large input — "What's your idea?" — and a Build button. After a run starts it collapses to the top of the stream.
2. **Command stream**: chronological feed where the COO narrates in plain language (company formed, hires made, departments reporting, package ready). The CEO can type follow-up instructions mid-run; the orchestrator routes them to the COO, whose next narration acknowledges them.
3. **Decision Desk cards render inline in the stream**: title, requesting agent, what it wants, why, cost impact if any, Approve / Reject buttons. Resolved cards stay in the stream marked with the decision.

### C. Agent Control (the machine room — density allowed)

1. **Org chart**: CEO (the human) at top, then COO, Chiefs, employees. Nodes appear with a slide-in animation when hired. Node states: hired → thinking (pulsing dot) → awaiting approval → done (or killed). Click a node → Agent Inspector.
2. **Agent Inspector** (side panel): agent name (editable), title, **persona prompt (editable — takes effect on the agent's next LLM call, even mid-run)**, autonomy dial (three stops: Ask everything / Ask big calls / Full auto), budget envelope (editable number), live task log for that agent.
3. **Money panel**: left, CFO's projected revenue once its artifact lands; right, REAL cumulative API burn updating live, with per-department envelope bars (spent vs cap). Monochrome bars.
4. **Artifacts shelf**: one card per hero artifact + the COO's executive summary. Markdown artifacts render formatted. The Development Chief's artifact is a **complete single-file landing page rendered in a sandboxed iframe** with an "open full size" control.

### D. Orchestration engine

**Run lifecycle:** `composing → staffing → working → (paused | awaiting_ceo) → delivering → done` (plus `killed`). Each transition emits an SSE event.

1. **COO composition.** One LLM call takes the idea and returns strict JSON (validate; one repair retry on parse failure):

```json
{
  "company_name": "string",
  "mission": "one sentence",
  "chiefs": [
    {
      "id": "cfo",
      "title": "Chief Financial Officer",
      "persona": "2–3 sentence personality + working style",
      "hero_artifact": "what this chief will deliver, one line",
      "hires": [
        { "id": "cfo-analyst-1", "role": "Pricing Analyst", "task": "one atomic task" }
      ],
      "budget_usd": 0.2
    }
  ]
}
```

The COO decides which Chiefs the idea needs (cap 5). Chiefs' budgets must sum to ≤ the run cap. The classic set (Finance, Marketing, Legal, Research, Development) is the expected shape for typical product ideas — tune the COO system prompt so the golden-path idea (below) reliably yields approximately that team — but the schema allows any departments.

2. **Chiefs run in parallel.** Each Chief: one planning call (confirm hires and tasks within its budget) → its employees run **in parallel** (each employee = one scoped LLM call returning structured output) → one synthesis call producing the hero artifact as markdown (Development Chief: a single self-contained HTML file). Stream each stage as events.
3. **Employee outputs** feed only their own Chief. The COO's final call takes all hero artifacts and writes the executive summary.
4. **Gates (Decision Desk).** A gate parks the awaiting agent (its promise does not resolve until the CEO decides) and emits `needs_approval`. Gate triggers:
   - **Spend beyond envelope** — always gates, at every autonomy level. Approve raises the envelope by the requested amount; reject makes the agent proceed within budget (its next prompt includes the rejection).
   - **Pricing decision** (the finance-role Chief proposes final pricing) — gates unless that agent is Full auto.
   - **Publish-type actions** (marketing content marked ready to post) — gates unless Full auto.
   - **Ask everything** level: additionally gates each Chief's plan before its employees start.
   Rejection must visibly alter course: the rejected agent receives the rejection reason and produces a revised output.
5. **Autonomy dial + budget changes** apply immediately, mid-run.
6. **Kill switch.** Aborts every in-flight LLM call via AbortController fan-out, freezes state, emits `run_killed`. A Resume control re-dispatches unfinished work.
7. **Burn metering.** After every LLM call: tokens × price table → per-agent, per-department, per-run totals → `spend_tick` event. Hitting the run cap pauses the run with a Decision Desk card.
8. **CEO mid-run instructions** from Dash-AI are injected into the COO's context; the COO may relay adjustments to Chiefs on their next call.

### E. SSE event protocol

One event stream per run; every event carries `runId`, `ts`, `type`, payload. Types: `run_started`, `org_planned` (full org JSON), `agent_hired`, `agent_started`, `agent_status`, `coo_narration`, `needs_approval` (card), `approval_resolved`, `persona_updated`, `autonomy_updated`, `budget_updated`, `artifact_ready`, `spend_tick`, `run_paused`, `run_resumed`, `run_killed`, `run_done`, `error`. The client renders exclusively from this stream — which is what makes replay mode free.

### F. Replay mode (the on-stage lifeline)

- Recorder: every event of every run is appended to a JSON log; successful runs can be saved as named fixtures (e.g., `fixtures/golden-run.json`).
- Replay: starting a run in replay mode re-emits a fixture's events with original timing (support 1× and 1.5×). Interactive moments still work: replay pauses at `needs_approval` until a real click, and a persona edit during replay swaps in the fixture's pre-recorded "edited" variant.
- A discreet keyboard shortcut (not a visible button) toggles the next run between live and replay. Nothing on screen may reveal which mode is active.

### G. Golden path

Rehearsal idea: **"Sell a minimalist budgeting template for young professionals."** Requirements: COO reliably spawns ~the classic 5 Chiefs; total run ≤3 minutes wall-clock and ≤$1.00 burn; at least one gate card fires naturally mid-run; the Marketing persona edit ("bold, Gen-Z tone") produces obviously different copy.

## UI / design spec

- Tokens: `--ink` near-black, `--paper` white, 2–3 grays; one type family (a clean grotesk; system stack acceptable); type scale with strong jumps; generous whitespace in Dash-AI, allowed density in Agent Control.
- **Motion is the color**: pulsing dots for thinking, slide-in on hire, count-up on burn ticks, a subtle full-screen freeze effect on kill. Micro only — 150–300ms, no decorative animation.
- Empty states matter: pre-run Dash-AI is a single centered quest box with the tagline "Your idea just glides to reality."
- Responsive enough for a projector at 1280×720; no mobile work.

## Delivery phases — verify each gate before the next phase

| Phase | Build | Gate (must pass, actually run it) |
|---|---|---|
| 0 | Scaffold, `.env.example`, config, SSE skeleton | Hello-world adapter call streams text into the browser |
| 1 | Quest → COO org JSON → growing org chart → parallel Chiefs → markdown artifacts + exec summary | Golden-path run end-to-end |
| 2 | Decision Desk park/resume, autonomy dials, envelopes + burn + Money panel, kill switch | Card pauses run, approve resumes, reject alters output; kill freezes; burn ticks |
| 3 | Employee agents, landing-page iframe, live persona editing, motion polish | Mid-run persona edit changes output; landing page renders in iframe |
| 4 | Recorder + replay mode, timeouts/retries, 5 consecutive clean runs | Full demo runs with network disabled (replay) |
| 5 | README (setup + demo-day runbook), record golden fixture | A stranger could start the app and run the demo from the README alone |

## Definition of done — acceptance checklist

- [ ] Golden-path run: idea → package in ≤3 min, ≤$1.00, zero manual intervention
- [ ] All four sovereignty controls demonstrably work live (gate approve AND reject, dial change mid-run, envelope raise via card, kill + resume)
- [ ] Live persona edit mid-run visibly changes that agent's next output
- [ ] Landing-page artifact renders in sandboxed iframe
- [ ] Money panel: projected revenue + real burn + envelope bars, all live
- [ ] Replay mode passes the wifi-off test and is indistinguishable on screen
- [ ] Strict monochrome throughout; no color leaks
- [ ] Only the adapter imports the vendor SDK; models/prices/caps in one config file
- [ ] 5 consecutive clean golden runs without code changes

## Self-review rubric — score, then iterate to 100

After the acceptance checklist passes, score the build 1–100 and iterate until 100:

- **Spec completeness (40)** — every item in the functional spec exists and behaves as written.
- **Demo reliability (25)** — 5 consecutive clean runs; replay flawless; no race conditions in gate park/resume or kill/resume.
- **UI craft (20)** — monochrome discipline, motion quality, the serene-desk vs machine-room contrast lands.
- **Latency (10)** — run finishes ≤3 min; UI never appears frozen (something animates within every 2s of a working run).
- **Simplicity (5)** — no speculative abstractions beyond the adapter seam; a senior engineer would not call it overcomplicated.

Report the score with a one-line justification per category each iteration. Anything below 100: fix the gap, re-verify the affected gate, re-score.
