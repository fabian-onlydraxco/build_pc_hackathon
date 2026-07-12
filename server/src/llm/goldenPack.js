// The rehearsed golden-path content: "Sell a minimalist budgeting template
// for young professionals" → PocketLedger. Every string here is demo-visible.

export const isGoldenIdea = (idea) => /budget/i.test(idea || '')

const ORG = {
  company_name: 'PocketLedger',
  mission: 'Make money feel calm — a minimalist budgeting template young professionals actually keep using.',
  chiefs: [
    {
      id: 'cro',
      title: 'Chief Research Officer',
      persona: 'Methodical and evidence-first. Distrusts hunches, loves a well-sourced number, writes conclusions people can act on.',
      hero_artifact: 'Market & audience analysis',
      hires: [
        { id: 'cro-1', role: 'Market Analyst', task: 'Size the personal-finance template market and map the top competitors' },
        { id: 'cro-2', role: 'Audience Researcher', task: 'Profile young-professional budgeting pain points and buying triggers' },
      ],
      budget_usd: 0.26,
    },
    {
      id: 'cfo',
      title: 'Chief Financial Officer',
      persona: 'Conservative, numbers-first, allergic to hockey sticks. Prices for margin and defends every assumption.',
      hero_artifact: 'Pricing & 12-month projections',
      hires: [{ id: 'cfo-1', role: 'Pricing Analyst', task: 'Benchmark template pricing and propose launch tiers' }],
      budget_usd: 0.28,
    },
    {
      id: 'cmo',
      title: 'Chief Marketing Officer',
      persona: 'Crisp and benefit-led. Believes taste is a growth channel; would rather cut a line than shout one.',
      hero_artifact: 'Launch copy & social posts',
      hires: [
        { id: 'cmo-1', role: 'Copywriter', task: 'Write the launch copy: headline, subhead, three benefit bullets' },
        { id: 'cmo-2', role: 'Social Strategist', task: 'Draft three launch posts for X and LinkedIn' },
      ],
      budget_usd: 0.12,
    },
    {
      id: 'clo',
      title: 'Chief Legal Officer',
      persona: 'Plain-language lawyer. Ruthless about removing legal risk without adding legal theater.',
      hero_artifact: 'Terms of service & compliance checklist',
      hires: [{ id: 'clo-1', role: 'Legal Drafter', task: 'Draft simple terms of service for a digital template product' }],
      budget_usd: 0.2,
    },
    {
      id: 'cdo',
      title: 'Chief Development Officer',
      persona: 'Ship-first minimalist. Believes the landing page is the product demo and every kilobyte must earn its place.',
      hero_artifact: 'Landing page (live preview)',
      hires: [
        { id: 'cdo-1', role: 'Landing Page Builder', task: 'Build a single-file landing page for the template' },
        { id: 'cdo-2', role: 'QA Reviewer', task: 'Review page copy, hierarchy, and accessibility' },
      ],
      budget_usd: 0.28,
    },
  ],
}

const PLANS = {
  cro: 'Two tracks, one afternoon: the Market Analyst sizes the template economy (Notion/Sheets marketplaces, standalone sellers) and maps five competitors on price and positioning; the Audience Researcher builds a pain-point profile of 24-32 year-old professionals from community threads and reviews. I merge both into one analysis with a clear "why now" and a recommended wedge.',
  cfo: 'The Pricing Analyst benchmarks 20 comparable templates across marketplaces to find the credible price band. I then model three tiers, pick a launch price that protects margin at realistic volumes, and project twelve months of revenue with conservative, base, and stretch cases. One page, defensible numbers.',
  cmo: 'Copy first, channels second. The Copywriter nails the core promise in one headline and three benefit bullets; the Social Strategist cuts three launch posts from that same spine so every channel says one thing. I assemble the launch kit and hold it for the CEO\'s publish approval.',
  clo: 'The Legal Drafter produces plain-language terms of service scoped to a digital download: license, refunds, liability, privacy basics. I add a five-point compliance checklist (consumer law, marketplace rules, tax registration) so the CEO knows exactly what is and isn\'t handled.',
  cdo: 'The Landing Page Builder ships a single-file page — hero, three benefits, pricing, one call-to-action — in the same minimalist voice as the product. QA reviews hierarchy, copy, contrast, and mobile behavior. I deliver the page as a live preview the CEO can open full-screen.',
}

const EMPLOYEES = {
  'cro-1': `**Market sizing — personal-finance templates**

The template economy is real money: Notion's marketplace alone lists 30k+ paid templates, and finance is a top-3 category. Comparable budgeting templates report 1k-10k lifetime sales at $9-$29.

**Competitor map (top 5)**

| Product | Price | Angle |
|---|---|---|
| Ultimate Budget OS | $29 | Feature-maximal Notion system |
| SimpleBudget Sheet | $12 | Google Sheets, no-frills |
| WealthOS Lite | $19 | Aesthetic dashboard |
| BudgetGlow | $15 | Gen-Z visual style |
| Cashflow Kit | $24 | Freelancer-focused |

**Gap:** every leader is either bloated or ugly. Nobody owns *calm minimalism* — the anti-dashboard for people who quit dashboards.`,
  'cro-2': `**Audience profile — young professionals (24-32)**

**Pain points (from community threads & reviews):**
1. Abandonment: 70%+ of budgeting-app users stop within a month — too many categories, too much guilt.
2. Spreadsheet fatigue: they want structure, not formulas to maintain.
3. Privacy: growing distrust of bank-linked apps; a template keeps data local.

**Buying triggers:** first salaried job, moving out, a "where did my money go" month, new-year resets.

**Message that lands:** "five minutes on Sunday" beats "total control of your finances." They buy calm, not control.`,
  'cfo-1': `**Pricing benchmark — 20 comparable templates**

- Median price: **$14** (range $7-$29)
- Templates above $19 justify it with video walkthroughs or bundles
- Refund rates in category reviews: low single digits
- Marketplace fee assumption: ~15%

**Recommendation:** launch single at **$12** (under the median, over the impulse floor), with a **$19 pro bundle** (template + starter guide + category pack). Anchor the bundle, sell the single.`,
  'clo-1': `**Draft terms of service — PocketLedger (digital template)**

1. **License.** Personal, non-transferable license for one buyer. No resale or redistribution.
2. **Delivery.** Instant digital delivery; buyer is responsible for account access.
3. **Refunds.** 14-day no-questions refund (digital-goods consumer norms in SG/EU).
4. **No financial advice.** The template is an organizational tool; nothing in it constitutes financial advice.
5. **Liability.** Capped at the purchase price.
6. **Privacy.** No financial data is collected by the seller; all user data stays in the buyer's own copy.`,
  'cdo-2': `**QA review — landing page**

- **Hierarchy:** hero reads in one glance; single CTA above the fold. Pass.
- **Copy:** benefit bullets match the research language ("five minutes on Sunday"). Pass.
- **Contrast:** ink-on-paper palette passes WCAG AA throughout. Pass.
- **Mobile:** single column collapses cleanly at 480px. Pass.
- **Weight:** one HTML file, zero external requests. Pass.

Ship it.`,
}

const COPY_DEFAULT = `**Launch copy — PocketLedger**

# Your money, finally calm.

A minimalist budgeting template for people who quit budgeting apps. Five minutes on Sunday. No formulas to babysit. No guilt-tripping graphs.

- **One page, whole picture.** Income, spending, saving — visible at a glance.
- **Five minutes a week.** Built for a Sunday coffee, not a second job.
- **Yours, privately.** No bank links, no accounts. Your numbers stay your numbers.`

const COPY_GENZ = `**Launch copy — PocketLedger (bold cut)**

# Your bank account has feelings. Mostly fear.

PocketLedger is the no-BS budget for people who've rage-quit three finance apps. Zero formulas. Zero shame spirals. Five minutes on Sunday and you're done being broke by accident.

- **One page. The whole damage.** See it, own it, fix it.
- **Five minutes, fr.** Less time than choosing what to watch.
- **Nobody's watching.** No bank links. Your chaos stays private.`

const POSTS_DEFAULT = `**Launch posts**

**X / 1:** Budgeting apps fail because they ask for daily attention. PocketLedger asks for five minutes on Sunday. One page, whole picture. Launching today — $12.

**X / 2:** We studied why people quit budgeting: too many categories, too much guilt. So we removed both. PocketLedger — the anti-dashboard.

**LinkedIn:** Most budgeting tools are built for finance enthusiasts. PocketLedger is built for everyone else — a one-page template that survives contact with real life. Launch price $12.`

const POSTS_GENZ = `**Launch posts (bold cut)**

**X / 1:** your budget app has 47 categories and you've opened it twice. PocketLedger: one page, five minutes, zero judgment. $12. go.

**X / 2:** financial literacy is just knowing where the money went before it's gone. we made that take five minutes. you're welcome.

**LinkedIn:** We built PocketLedger for the 70% who abandon budgeting apps in month one. One page. Five minutes a week. No shame mechanics. $12 at launch.`

const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PocketLedger — your money, finally calm</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: #FAFAF8; color: #141413; line-height: 1.6; }
  .wrap { max-width: 880px; margin: 0 auto; padding: 0 32px; }
  header { padding: 28px 0; display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #E7E5E0; }
  .logo { font-weight: 700; letter-spacing: -0.02em; font-size: 18px; }
  .buy { color: #141413; text-decoration: none; border: 1px solid #141413; padding: 8px 18px; border-radius: 999px; font-size: 14px; }
  .hero { padding: 96px 0 72px; }
  .hero h1 { font-size: clamp(40px, 7vw, 68px); line-height: 1.02; letter-spacing: -0.03em; font-weight: 700; max-width: 14ch; }
  .hero p { margin-top: 24px; font-size: 19px; color: #57554F; max-width: 46ch; }
  .cta { display: inline-block; margin-top: 36px; background: #141413; color: #FAFAF8; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-size: 16px; }
  .cta span { opacity: .6; margin-left: 10px; }
  .benefits { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #E7E5E0; border: 1px solid #E7E5E0; margin: 24px 0 72px; }
  .benefit { background: #FAFAF8; padding: 28px 24px; }
  .benefit h3 { font-size: 16px; letter-spacing: -0.01em; margin-bottom: 8px; }
  .benefit p { font-size: 14.5px; color: #57554F; }
  .pricing { border-top: 1px solid #E7E5E0; padding: 64px 0 96px; display: flex; gap: 48px; align-items: baseline; flex-wrap: wrap; }
  .price h2 { font-size: 44px; letter-spacing: -0.02em; }
  .price small { display: block; color: #57554F; font-size: 14px; margin-top: 4px; }
  footer { border-top: 1px solid #E7E5E0; padding: 24px 0 48px; color: #57554F; font-size: 13px; }
  @media (max-width: 640px) { .benefits { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="wrap">
  <header><span class="logo">PocketLedger</span><a class="buy" href="#pricing">Get the template</a></header>
  <section class="hero">
    <h1>Your money, finally calm.</h1>
    <p>A minimalist budgeting template for people who quit budgeting apps. Five minutes on Sunday. No formulas to babysit. No guilt-tripping graphs.</p>
    <a class="cta" href="#pricing">Start this Sunday <span>$12</span></a>
  </section>
  <section class="benefits">
    <div class="benefit"><h3>One page, whole picture</h3><p>Income, spending, saving — visible at a glance. No tab maze, no dashboard fatigue.</p></div>
    <div class="benefit"><h3>Five minutes a week</h3><p>Built for a Sunday coffee, not a second job. Update it, close it, live your life.</p></div>
    <div class="benefit"><h3>Yours, privately</h3><p>No bank links. No accounts. Your numbers stay your numbers, on your device.</p></div>
  </section>
  <section class="pricing" id="pricing">
    <div class="price"><h2>$12</h2><small>Single — the template</small></div>
    <div class="price"><h2>$19</h2><small>Pro bundle — template + starter guide + category pack</small></div>
  </section>
  <footer>© 2026 PocketLedger. A one-person company, run by agents, owned by a human.</footer>
</div>
</body>
</html>`

const SYNTH = {
  cro: () =>
    JSON.stringify({
      title: 'Market & Audience Analysis',
      format: 'markdown',
      content: `# Market & audience analysis — PocketLedger\n\n## The opening\nThe paid-template economy is established (finance is a top-3 category on major marketplaces), yet the leaders split into two camps: feature-maximal systems ($19-$29) and bare spreadsheets ($7-$12). **Nobody owns calm minimalism** — the anti-dashboard for the 70% of people who abandon budgeting tools within a month.\n\n## Who buys\nYoung professionals, 24-32, at a money inflection point: first salary, first lease, first "where did it all go" month. They don't want control; they want **calm**. The winning promise is *five minutes on Sunday*, not *total financial mastery*.\n\n## Competitive wedge\n| Axis | Incumbents | PocketLedger |\n|---|---|---|\n| Setup | 30-90 min | 5 min |\n| Maintenance | Daily nudges | Weekly ritual |\n| Tone | Guilt & graphs | Calm & clarity |\n\n## Recommendation\nLaunch as *the budgeting template for people who quit budgeting apps*. Price under the $14 category median to convert the burned-out majority.`,
      metrics: { competitors_mapped: 5, abandonment_rate_pct: 70 },
    }),
  cfo: () =>
    JSON.stringify({
      title: 'Pricing & 12-Month Projections',
      format: 'markdown',
      content: `# Pricing & 12-month projections\n\n## Launch pricing\n- **Single: $12** — under the $14 category median, above the impulse floor.\n- **Pro bundle: $19** — template + starter guide + category pack. The bundle anchors; the single converts.\n\n## 12-month projection (base case)\n| Metric | Value |\n|---|---|\n| Units (Y1) | 3,200 |\n| Blended price | $12.00 |\n| **Gross revenue** | **$38,400** |\n| Marketplace fees (15%) | -$5,760 |\n| Net revenue | $32,640 |\n\nConservative case lands at $19k, stretch at $61k. Break-even is effectively immediate — production cost is agent labor.\n\n## Assumptions I will defend\n70% single / 30% bundle mix; 3% refund rate; zero paid acquisition in months 1-3 (organic + launch posts only).`,
      metrics: {
        price_usd: 12,
        bundle_usd: 19,
        units_y1: 3200,
        projected_revenue_y1_usd: 38400,
        pricing_summary: 'Launch at $12 single / $19 pro bundle — projected Y1 revenue $38,400 on 3,200 units.',
      },
    }),
  cmo: ({ genZ }) =>
    JSON.stringify({
      title: 'Launch Copy & Social Posts',
      format: 'markdown',
      content: `# Launch kit — PocketLedger\n\n${genZ ? COPY_GENZ : COPY_DEFAULT}\n\n---\n\n${genZ ? POSTS_GENZ : POSTS_DEFAULT}`,
      metrics: { posts: 3, tone: genZ ? 'bold gen-z' : 'calm minimalist' },
    }),
  clo: () =>
    JSON.stringify({
      title: 'Terms of Service & Compliance Checklist',
      format: 'markdown',
      content: `# Legal starter pack — PocketLedger\n\n## Terms of service (plain language)\n1. **License.** One buyer, personal use. No resale or redistribution.\n2. **Delivery.** Instant digital delivery after purchase.\n3. **Refunds.** 14 days, no questions — matches digital-goods consumer norms.\n4. **Not financial advice.** PocketLedger organizes your numbers; it doesn't advise on them.\n5. **Liability.** Capped at the purchase price.\n6. **Privacy.** We collect no financial data; everything lives in the buyer's own copy.\n\n## Compliance checklist\n- [x] Consumer refund terms stated pre-purchase\n- [x] No-advice disclaimer on product and landing page\n- [x] Marketplace seller terms reviewed\n- [ ] Income tax registration once revenue is real (CEO action)\n- [ ] Business registration if scaling beyond marketplace sales (CEO action)`,
      metrics: { ceo_actions: 2 },
    }),
  cdo: () =>
    JSON.stringify({
      title: 'PocketLedger — Landing Page',
      format: 'html',
      content: LANDING_HTML,
      metrics: { file_count: 1, external_requests: 0 },
    }),
}

const REVISE = {
  cfo: () =>
    JSON.stringify({
      title: 'Pricing & 12-Month Projections (Revised)',
      format: 'markdown',
      content: `# Pricing & 12-month projections — revised per CEO\n\n## Revised launch pricing\n- **Single: $9** — aggressive entry to maximize the launch-week install base.\n- **Pro bundle: $15** — kept within impulse range.\n\n## Revised 12-month projection (base case)\n| Metric | Value |\n|---|---|\n| Units (Y1) | 3,700 |\n| **Gross revenue** | **$33,300** |\n| Marketplace fees (15%) | -$5,000 |\n| Net revenue | $28,300 |\n\nLower price trades ~$5k of Y1 revenue for a larger owned audience — defensible if the CEO plans follow-on products. Noted for the record: I preferred $12.`,
      metrics: {
        price_usd: 9,
        bundle_usd: 15,
        units_y1: 3700,
        projected_revenue_y1_usd: 33300,
        pricing_summary: 'Revised: $9 single / $15 bundle — projected Y1 revenue $33,300 on 3,700 units.',
      },
    }),
  cmo: ({ genZ }) =>
    JSON.stringify({
      title: 'Launch Copy & Social Posts (Revised)',
      format: 'markdown',
      content: `# Launch kit — PocketLedger (revised per CEO)\n\n${genZ ? COPY_DEFAULT : COPY_GENZ}\n\n---\n\n${genZ ? POSTS_DEFAULT : POSTS_GENZ}\n\n*Re-cut on the CEO's call — tone flipped, promise unchanged.*`,
      metrics: { posts: 3, revised: true },
    }),
}

export const golden = {
  org: () => JSON.stringify(ORG),
  plan: (chiefId) => PLANS[chiefId] || 'Department plan: divide the work, verify it, deliver one artifact.',
  employee: (hireId, { genZ }) => {
    if (hireId === 'cmo-1') return genZ ? COPY_GENZ : COPY_DEFAULT
    if (hireId === 'cmo-2') return genZ ? POSTS_GENZ : POSTS_DEFAULT
    if (hireId === 'cdo-1') return 'Landing page built as one self-contained HTML file — hero, three benefits, pricing, single CTA. Handed to QA.'
    return EMPLOYEES[hireId] || 'Task complete. Findings handed to my chief.'
  },
  synthesis: (chiefId, opts) => (SYNTH[chiefId] ? SYNTH[chiefId](opts) : SYNTH.cro(opts)),
  revise: (chiefId, opts) =>
    REVISE[chiefId]
      ? REVISE[chiefId](opts)
      : JSON.stringify({
          title: 'Revised Deliverable',
          format: 'markdown',
          content: `# Revised per CEO\n\nDirection adjusted${opts.reason ? ` — "${opts.reason}"` : ''}. Updated deliverable attached.`,
          metrics: {},
        }),
  exec: () => `# Executive summary — PocketLedger

**What your company built today:** a complete launch package for a minimalist budgeting template aimed at young professionals who abandon traditional budgeting apps.

**The wedge.** Research found a real gap: incumbents are either bloated systems or bare spreadsheets. PocketLedger owns *calm* — one page, five minutes on Sunday, no guilt mechanics.

**The numbers.** Pricing locked per your Decision Desk call, with a base-case first-year projection near **$38k gross** (see the CFO's sheet for the exact figures behind the price you approved).

**Go-to-market in one line:** launch to the burned-out majority — "the budgeting template for people who quit budgeting apps."

**Your next three actions:**
1. Put the landing page live and connect a checkout link.
2. Publish the launch posts (already cut in your approved tone).
3. Complete the two legal checklist items flagged for the CEO — tax registration and business registration when revenue is real.

Every deliverable is on the shelf. Total agent labor for the whole company: on your Money panel, to the cent.`,
}
