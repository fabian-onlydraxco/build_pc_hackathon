# Glyde AI — Hackathon Plan

BUIDL_OPC_Hackathon_SG · amber.ac / BUIDL_QUESTS · Theme: Autonomous Agents & Sovereignty
Builder: Fabian (solo) · Goal: win · Deliverable: live demo + pitch (~3–5 min)
Companion document: [BUILD_PROMPT.md](BUILD_PROMPT.md) — the master prompt for the builder agent.
Raw discovery notes: `../brainstorms/2026-07-12-glyde-ai-hackathon.md`

---

## 1. The product

**Glyde AI — type an idea, own a company.**

A web app where anyone becomes the CEO of a fully agentic One Person Company. You type a business idea into **Dash-AI**; a COO agent reads it and *hires* the exact C-suite the idea needs; each Chief hires its own employee agents; the org chart assembles itself live on screen. Minutes later the company hands you a complete business package — market research, pricing + projections, legal starter docs, launch marketing, and a working landing-page preview — while you retained control the whole time through approval gates, autonomy dials, budget envelopes, and a kill switch.

- Primary tagline: **"Your idea just glides to reality."**
- Kicker: "…and the money glides into your pocket."
- Positioning: **"You run a company, not workflows."** CrewAI / AutoGPT / Lindy are developer tools whose primitive is a task pipeline. Glyde's primitives are organizational — hiring, org charts, budgets, approvals. Anyone can be a CEO.

## 2. Why this wins this event

| Event theme | Glyde's answer |
|---|---|
| One Person Company | The product IS an OPC runtime — and it's built by a one-person team using agents (said out loud on stage) |
| Autonomous Agents | Fully dynamic org: the COO composes a different company per idea; real parallel LLM agents work live |
| **Sovereignty** (2026 core) | Decision Desk, autonomy dials, budget envelopes over REAL spend, kill switch — ownership, judgment, control as first-class UI |
| Agentic Services | Output is a sellable business package; Glyde itself is the archetypal agentic service |

## 3. Product structure

Two top-level sections (deliberately contrasting, like Claude's Home/Code):

**Dash-AI — the CEO's desk.** Almost empty by design. One quest box ("What's your idea?"), a plain-language command/chat stream from the COO, Decision Desk approve/reject cards inline, and a slim status ribbon (company state · live burn · kill switch).

**Agent Control — the machine room.** The live org chart (nodes animate: hired → thinking → awaiting approval → done), the Agent Inspector (persona editing, autonomy dial, budget, task log), the Money panel (CFO's projected revenue vs REAL API burn, per-department envelope bars), and the Artifacts shelf (one hero artifact per Chief + COO executive summary; the Development artifact is a landing page rendered in a sandboxed iframe).

**Agent model.** Three tiers, all real LLM calls: COO (composes the org as structured JSON, supervises, writes exec summary) → Chiefs (plan department, hire employees, synthesize one hero artifact) → Employees (one atomic task each, parallel). Caps: ≤5 Chiefs, ≤3 employees each, ≤18 agents, hard per-run dollar cap.

**Sovereignty mechanics.**
- **Decision Desk**: gates fire on envelope-exceed requests, pricing decisions, and publish-type actions (per autonomy dial). Cards park the agent until the CEO decides; reject visibly changes course.
- **Autonomy dial** (per agent): Ask everything / Ask big calls / Full auto. Money gates never fully disable — spend beyond envelope always asks.
- **Budget envelopes**: per-department caps in real dollars of metered API spend.
- **Kill switch**: always visible in both sections; aborts all in-flight work, freezes state, resumable.

## 4. Architecture decisions

- **React (Vite) SPA + Node (Express) backend.** One repo, `/client` + `/server`. No database — in-memory run state + JSON snapshot export.
- **SSE** streams every agent lifecycle event to the UI; events drive all animation.
- **Provider-agnostic LLM adapter** — Claude first (Fabian will swap providers later). Suggested: Sonnet-class for COO/Chiefs, Haiku-class for employees; all model choices in one config file.
- **Burn metering**: token usage × price table per call, aggregated per department, streamed live. The burn meter doubles as the future billing meter.
- **Approval gates** park the agent's promise until the CEO's decision. **Kill switch** = AbortController fan-out.
- **Rehearsal replay**: every successful run records its event log + artifacts; replay mode re-emits with realistic timing. If wifi or the API dies on stage, the demo is indistinguishable from live.

## 5. Design direction

Strict monochrome: white canvas, near-black ink, 2–3 grays, no color anywhere. Hierarchy from type scale, weight, spacing — and **motion as the color**: pulsing thinking-dots, nodes sliding in on hire, the burn counter ticking. Dash-AI feels serene and almost empty; Agent Control is allowed density. The contrast between the two IS the story.

## 6. Build plan — cut-line ordered

Every phase ends demo-ready. Verify each gate before starting the next phase.

| Phase | Scope | Gate (verify before proceeding) |
|---|---|---|
| **0 · Ignition** (~45 min) | Vite+Node scaffold, **API key + credits (currently missing — blocker)**, price table, SSE skeleton | Hello-world agent call streams into the browser |
| **1 · Walking skeleton** (~2 h) | Quest box → COO org JSON → org chart grows → Chiefs run parallel → markdown artifacts + exec summary | Full golden-path run end-to-end. **Cut line: you have A demo** |
| **2 · Sovereignty layer** (~2 h) | Decision Desk park/resume, autonomy dials, envelopes + live burn + Money panel, kill switch | Run pauses on card, resumes on approve; reject changes course; kill freezes all; burn ticks. **Cut line: THEME-WINNING demo** |
| **3 · Wow layer** (~1.5 h) | Employee agents spawn under Chiefs, landing-page iframe artifact, live persona editing, org-chart motion | Mid-run persona edit visibly changes output; landing page renders |
| **4 · Reliability** (~1 h) | Record golden run → replay mode; timeouts/retries; 5 consecutive clean runs | Full demo executes with wifi OFF via replay |
| **5 · Pitch** (~45 min) | Rehearse script below; screen-record one perfect run as final backup | Script lands inside time limit twice in a row |

## 7. Demo script (3–5 min, live)

- **0:00** Hook: *"I'm a one-person company. In the next three minutes you'll watch me run one — live."* Type: **"Sell a minimalist budgeting template for young professionals."** Build.
- **0:20** Org assembles. *"Glyde didn't load a template. The COO read my idea and hired this exact team."*
- **0:45–2:30** While the company works: open Marketing Chief → edit persona live (e.g., "bold, Gen-Z tone") → next output visibly changes. A Decision Desk card pops → **approve one, REJECT one** (the rejection is the sovereignty proof). Show Money panel burn ticking inside envelopes. Gesture at kill switch: *"if my company ever goes somewhere I don't like — one button, everything stops."*
- **2:30** Artifacts land: research, pricing, legal, marketing, landing-page preview, exec summary.
- **3:00** Finale on Money panel: *"Projected first-year revenue on the left. What this company cost me to run on the right: $0.47 of agent labor. Your idea just glides to reality."*
- **Close:** *"Built solo, with agents — because that's how every company is about to be built."*
- **Encore only if invited:** take a judge's idea live; the dynamic org spawns a different company.

## 8. Judge Q&A prep

- **vs CrewAI/AutoGPT/Lindy** → positioning line; "their primitive is a task pipeline for developers; mine is an organization for anyone."
- **"Is it real?"** → open the event log + burn meter (real tokens, real dollars); offer the encore.
- **"Why no blockchain, at Amber?"** → "Shipped the sovereignty core first. A company treasury as a wallet the founder holds keys to — tokenized ownership of agent companies — is the natural next layer on this exact architecture."
- **Business model** → SaaS for solo founders: per-company subscription + margin on metered agent labor; the burn meter is already the billing meter.
- **Safety/runaway agents** → "Sovereignty IS the safety story — gates, envelopes, dials, kill switch. This event's theme, productized."

## 9. Risks

| Risk | Mitigation |
|---|---|
| API slow/down on stage | Replay mode; fast employee models; timeouts + retry; caps |
| Wifi dies | Hotspot + replay + screen recording |
| Persona-edit beat flops | ≥5 full rehearsals; know exactly which agent + edit shows contrast |
| Org spawns something weird | Golden idea rehearsed; COO prompt tuned to yield ~classic-5 for it; caps bound blast radius |
| Solo scope creep | Cut lines: Phase 1 = a demo, Phase 2 = the winning demo |
| Credits/rate limits | Fund at Phase 0; burn meter monitors; cheapest adequate employee model |
| "Type something else" probe | That's the encore — the probe becomes the best moment |

## 10. Open items

1. **API key + credits — hard blocker for Phase 0.**
2. Confirm pitch length, judging criteria, venue wifi from the event page.
3. Confirm hours actually remaining, to drop phases onto a clock.
4. Post-hackathon: choose the alternate LLM provider (adapter keeps it open).
