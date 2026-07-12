# Glyde AI

**Type an idea, own a company.**

A web app where anyone becomes the CEO of a fully agentic one-person company. Type a business idea into **Dash-AI**; a COO agent composes the exact company that idea needs — Chiefs hire employee agents, the org chart assembles itself live — and minutes later you hold a complete business package: market research, pricing + projections, legal starter docs, a launch kit, and a working landing-page preview.

And it's a one-person **holding company**: the sidebar (Claude-style) runs **multiple projects at once** — each company works independently in the background, badges its pending decisions ("● 2 waiting"), and shows its own live burn. Switch projects with one click; a page reload rediscovers every project and rebuilds it from its event log.

You can also **hire like a CEO**: every department ends with a dashed **+ Hire** node. Click it and a quiet pill appears at bottom-center (the org stays fully visible); type who you want and it grows into a small hiring chat — the department drafts the agent (name, role, task, persona; costs real metered burn), you refine it in plain language, then answer the final question: **This project** or **All projects**. All-projects hires join the standing roster (`server/src/fixtures/roster.json`) and are staffed automatically into every future company.

You stay sovereign the entire time: **Decision Desk** approval cards, a per-agent **autonomy dial**, **budget envelopes** metered against *real* API spend, and a **kill switch** that freezes the whole company.

Built for BUIDL_OPC_Hackathon_SG (amber.ac) — theme: *Autonomous Agents & Sovereignty*.

---

## Run it

Requires Node 18+ (built on Node 24).

```bash
# 1. Install (once)
npm run install:all

# 2. Start both servers (two terminals, or use `npm run dev` for one)
npm run dev:server   # API on http://localhost:5171
npm run dev:client   # App on http://localhost:5173
```

Open **http://localhost:5173**, type an idea (or press Build on the placeholder), and watch.

### Providers — live AI or keyless mock

- **OpenRouter (recommended):** copy `.env.example` to `server/.env`, set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` (any model on openrouter.ai — e.g. `qwen/qwen3.6-plus`), restart the server. Model pricing for the burn meter is fetched live from OpenRouter's catalog at boot — nothing hardcoded. `server/.env` is gitignored; keys never leave your machine.
- **Anthropic:** set `ANTHROPIC_API_KEY` instead (used when no OpenRouter key is present).
- **No API key → mock provider.** The full product still works end-to-end at zero cost: deterministic agents, realistic pacing, rich content. This is also what generates replay fixtures.

All vendor traffic goes through `server/src/llm/adapter.js` (a plain-fetch seam, no SDKs); models, prices, and caps live in `server/src/config.js`. The server banner tells you which provider and model are active on boot.

## The demo runbook

Golden-path idea: **"Sell a minimalist budgeting template for young professionals"** → PocketLedger.

1. **Dash-AI**: type the idea, hit **Build**. Org assembles (~10s): "Glyde didn't load a template — the COO read the idea and hired this exact team."
2. Switch to **Agent Control**. Click **Sana Iyer (CMO)** → rewrite her persona ("Bold, Gen-Z tone…") → **Save persona**. Close the inspector.
3. The **budget request** card is waiting (Sana wants +$0.20) → **Approve**. Her remaining work now runs in the new voice.
4. **Pricing decision** card → **Reject** with a note ("Go cheaper — installs first"). The CFO revises: new price, new projections, and the Money panel's projected revenue updates.
5. **Publish approval** card → **Approve**.
6. Gesture at the **STOP** button — or press it and **RESUME** — "if my company ever goes somewhere I don't like, one button."
7. Artifacts land (open the **landing-page live preview**); finale on the **Money panel**: projected revenue vs **$1.25 of real agent labor**.
8. **Multi-project flex** (optional, or as the encore): hit **+ New project** mid-run and launch a second idea — two companies work in parallel, and the sidebar badges whichever one needs you. "I'm not running a company. I'm running a portfolio."

Full run ≈ 60–90 seconds of agent time plus however long you hold the decision cards.

### Presenter shortcuts (the stage lifeline)

- **Ctrl+Shift+F** — save the current finished run as the golden replay fixture (`server/src/fixtures/golden-run.json`).
- **Ctrl+Shift+L** — toggle the NEXT run between `live` and `replay`. A replay re-streams the recorded run with original pacing — Decision Desk cards still pause for your real clicks, STOP/RESUME still work, and nothing on screen reveals the mode. If wifi or the API dies on stage, flip this before you start and the demo is identical.
- A golden fixture is already recorded. To re-record: finish a clean live run with the exact choreography above, then Ctrl+Shift+F.

## Architecture

```
client/  React (Vite) SPA — renders EXCLUSIVELY from the SSE event stream
  src/lib/store.js         event → state reducer (why replay is indistinguishable)
  src/components/dash/     Dash-AI: quest box, COO command stream, decision cards
  src/components/control/  Agent Control: org chart, inspector, money, artifacts
server/  Node + Express
  src/core/orchestrator.js run pipeline: COO composes → Chiefs plan/hire →
                           employees (parallel) → synthesis → exec summary;
                           gate parking, kill/resume, envelope reservations
  src/core/gates.js        Decision Desk (approve/reject parks the agent)
  src/core/burn.js         tokens × price table → live spend ticks
  src/llm/adapter.js       THE provider seam (timeout, retry, abort)
  src/llm/claude.js        Claude via plain fetch — no SDK
  src/llm/mock.js          keyless deterministic provider (+ content packs)
  src/replay/              recorder + replayer (the lifeline)
```

- **No database** — run state is in memory; each run's full event log is exportable as a fixture.
- **Caps** (config): ≤5 chiefs, ≤3 hires each, ≤18 agents, $2.00 hard run cap, 60s call timeout + one retry.
- **Sovereignty semantics**: money gates fire at every autonomy level; pricing/publish gate unless Full auto; "Ask everything" also gates plans. Rejections carry your note into the agent's revision prompt.

## Demo-day notes

- This folder lives under OneDrive — **pause OneDrive sync during the demo** (sync churn once triggered a server restart loop mid-run; the dev script now avoids `--watch`, but pausing sync removes the risk class entirely).
- The server is stateless across restarts: if it restarts mid-run, start a fresh run (or use replay).
- Fonts are bundled locally (`@fontsource`) — the app renders correctly with zero network.
- Projector-ready at 1280×720; monochrome palette passes WCAG AA.
