// Fallback content pack for any non-rehearsed idea, so live-typed audience
// ideas still produce a coherent company in mock mode.

function deriveName(idea) {
  const words = (idea.match(/[a-zA-Z]{4,}/g) || ['Glyde', 'Venture'])
    .slice(0, 2)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
  return words.join('') + ' Co.'
}

function org(idea) {
  const name = deriveName(idea)
  return JSON.stringify({
    company_name: name,
    mission: `Turn "${idea.slice(0, 80)}" into a sellable product with the smallest possible team.`,
    chiefs: [
      {
        id: 'cro',
        title: 'Chief Research Officer',
        persona: 'Evidence-first, concise, decision-oriented.',
        hero_artifact: 'Market & audience analysis',
        hires: [
          { id: 'cro-1', role: 'Market Analyst', task: `Size the market and competitors for: ${idea}` },
          { id: 'cro-2', role: 'Audience Researcher', task: 'Profile the target customer and buying triggers' },
        ],
        budget_usd: 0.24,
      },
      {
        id: 'cfo',
        title: 'Chief Financial Officer',
        persona: 'Conservative, margin-focused, defends every assumption.',
        hero_artifact: 'Pricing & 12-month projections',
        hires: [{ id: 'cfo-1', role: 'Pricing Analyst', task: 'Benchmark pricing and propose launch tiers' }],
        budget_usd: 0.2,
      },
      {
        id: 'cmo',
        title: 'Chief Marketing Officer',
        persona: 'Benefit-led, crisp, believes taste is a growth channel.',
        hero_artifact: 'Launch copy & social posts',
        hires: [
          { id: 'cmo-1', role: 'Copywriter', task: 'Write launch copy: headline, subhead, benefits' },
          { id: 'cmo-2', role: 'Social Strategist', task: 'Draft three launch posts' },
        ],
        budget_usd: 0.12,
      },
      {
        id: 'clo',
        title: 'Chief Legal Officer',
        persona: 'Plain-language, risk-aware, no legal theater.',
        hero_artifact: 'Terms of service & compliance checklist',
        hires: [{ id: 'clo-1', role: 'Legal Drafter', task: 'Draft simple terms of service' }],
        budget_usd: 0.16,
      },
      {
        id: 'cdo',
        title: 'Chief Development Officer',
        persona: 'Ship-first minimalist; the landing page is the product demo.',
        hero_artifact: 'Landing page (live preview)',
        hires: [
          { id: 'cdo-1', role: 'Landing Page Builder', task: 'Build a single-file landing page' },
          { id: 'cdo-2', role: 'QA Reviewer', task: 'Review copy, hierarchy, accessibility' },
        ],
        budget_usd: 0.28,
      },
    ],
  })
}

const landing = (name, idea) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: #FAFAF8; color: #141413; line-height: 1.6; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 0 32px; }
  header { padding: 28px 0; border-bottom: 1px solid #E7E5E0; font-weight: 700; letter-spacing: -0.02em; }
  .hero { padding: 88px 0 72px; }
  h1 { font-size: clamp(38px, 6.5vw, 62px); line-height: 1.05; letter-spacing: -0.03em; max-width: 16ch; }
  .hero p { margin-top: 22px; font-size: 18px; color: #57554F; max-width: 50ch; }
  .cta { display: inline-block; margin-top: 32px; background: #141413; color: #FAFAF8; text-decoration: none; padding: 14px 28px; border-radius: 999px; }
  .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #E7E5E0; border: 1px solid #E7E5E0; margin-bottom: 80px; }
  .cell { background: #FAFAF8; padding: 26px 22px; }
  .cell h3 { font-size: 15.5px; margin-bottom: 6px; }
  .cell p { font-size: 14px; color: #57554F; }
  footer { border-top: 1px solid #E7E5E0; padding: 24px 0 48px; color: #57554F; font-size: 13px; }
  @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="wrap">
  <header>${name}</header>
  <section class="hero">
    <h1>The simple way in.</h1>
    <p>${idea}</p>
    <a class="cta" href="#">Get started — $19</a>
  </section>
  <section class="row">
    <div class="cell"><h3>Made for you</h3><p>Built around the exact problem, nothing extra.</p></div>
    <div class="cell"><h3>Ready today</h3><p>Delivered instantly. Start in minutes, not weeks.</p></div>
    <div class="cell"><h3>Fair price</h3><p>One honest price. No subscriptions hiding in the fine print.</p></div>
  </section>
  <footer>© 2026 ${name} — a one-person company, run by agents, owned by a human.</footer>
</div>
</body>
</html>`

const md = (title, body) => JSON.stringify({ title, format: 'markdown', content: body, metrics: {} })

export const generic = {
  org,
  plan: (chiefId) =>
    ({
      cro: 'Split the research: one analyst sizes the market and competitors, one profiles the buyer. I merge both into a single analysis with a recommended wedge.',
      cfo: 'Benchmark comparable products, model three price tiers, project twelve months with conservative and base cases. One defensible page.',
      cmo: 'One promise, said everywhere: copywriter nails the headline and benefits; strategist cuts three posts from the same spine. Held for publish approval.',
      clo: 'Plain-language terms scoped to the product, plus a short compliance checklist separating what is handled from what needs the CEO.',
      cdo: 'One self-contained landing page — hero, three benefits, one call-to-action — then a QA pass on hierarchy and accessibility.',
    })[chiefId] || 'Divide the work, verify it, deliver one artifact.',
  employee: (hireId, { idea }) =>
    ({
      'cro-1': `**Market scan**\n\nComparable products for "${idea}" cluster in a $9-$29 band with 3-5 visible leaders. The gap: most are either over-built or under-designed. A focused, well-priced entrant can win on clarity.`,
      'cro-2': `**Audience profile**\n\nThe likely buyer hits this problem at a trigger moment and searches for a ready-made answer. They pay for time saved and confidence, not features. Message: outcome first, mechanics second.`,
      'cfo-1': `**Pricing benchmark**\n\nMedian comparable price ≈ $17. Recommended: $19 launch price with a $29 bundle anchor — above the impulse floor, defensible on value.`,
      'clo-1': `**Draft terms**\n\nPersonal license, instant delivery, 14-day refunds, liability capped at purchase price, no sensitive data collected.`,
      'cdo-1': `Landing page built as one self-contained HTML file — hero, three benefits, single CTA. Handed to QA.`,
      'cdo-2': `**QA review**\n\nHierarchy, contrast, and mobile collapse verified. Copy matches the research language. Ship it.`,
      'cmo-1': `# The simple way in.\n\nStop assembling a solution from ten tabs. This is the ready-made answer — set up in minutes, priced honestly.`,
      'cmo-2': `**Three launch posts**\n\n1. The problem, named plainly, and the five-minute fix.\n2. Why the existing options overshoot — and what "just enough" looks like.\n3. Launch announcement with price and a single link.`,
    })[hireId] || 'Task complete. Findings handed to my chief.',
  synthesis: (chiefId, { idea, genZ }) => {
    const name = deriveName(idea)
    switch (chiefId) {
      case 'cro':
        return md(
          'Market & Audience Analysis',
          `# Market & audience analysis — ${name}\n\n**The opening.** Comparable products cluster at $9-$29 with leaders that are either over-built or under-designed. A focused entrant wins on clarity.\n\n**Who buys.** People at a trigger moment who want a ready-made answer — they pay for time saved and confidence.\n\n**Recommendation.** Position as the "just enough" option and price near the category median.`,
        )
      case 'cfo':
        return JSON.stringify({
          title: 'Pricing & 12-Month Projections',
          format: 'markdown',
          content: `# Pricing & projections — ${name}\n\n- **Launch: $19** single / $29 bundle anchor\n- **Base case Y1:** 2,400 units → **$45,600 gross**\n- Fees ~15%, refunds ~3%; break-even immediate (agent labor only).`,
          metrics: {
            price_usd: 19,
            units_y1: 2400,
            projected_revenue_y1_usd: 45600,
            pricing_summary: 'Launch at $19 single / $29 bundle — projected Y1 revenue $45,600 on 2,400 units.',
          },
        })
      case 'cmo':
        return md(
          'Launch Copy & Social Posts',
          genZ
            ? `# Launch kit — ${name} (bold cut)\n\n# stop overcomplicating it.\n\n${name} is the ready-made answer. set up in minutes. priced like we respect you.\n\n---\n\n**Post 1:** the problem is real, the fix takes five minutes. $19. go.\n**Post 2:** everyone else built a spaceship. we built the thing you actually needed.\n**Post 3:** launched today. one link, one price, zero subscriptions.`
            : `# Launch kit — ${name}\n\n# The simple way in.\n\nThe ready-made answer to "${idea}" — set up in minutes, priced honestly.\n\n---\n\n**Post 1:** The problem, named plainly, and the five-minute fix — launching today at $19.\n**Post 2:** Why the existing options overshoot, and what "just enough" looks like.\n**Post 3:** Launch announcement: one link, one price, no subscription.`,
        )
      case 'clo':
        return md(
          'Terms of Service & Compliance Checklist',
          `# Legal starter pack — ${name}\n\n## Terms (plain language)\n1. Personal license, one buyer.\n2. Instant digital delivery.\n3. 14-day refunds.\n4. Liability capped at purchase price.\n5. No sensitive customer data collected.\n\n## Checklist\n- [x] Refund terms visible pre-purchase\n- [x] Disclaimer on product page\n- [ ] Tax registration when revenue is real (CEO)\n- [ ] Business registration when scaling (CEO)`,
        )
      case 'cdo':
        return JSON.stringify({
          title: `${name} — Landing Page`,
          format: 'html',
          content: landing(name, idea),
          metrics: { file_count: 1 },
        })
      default:
        return md('Deliverable', `# Deliverable\n\nDepartment output for "${idea}".`)
    }
  },
  revise: (chiefId, { reason, idea, genZ }) => {
    if (chiefId === 'cfo')
      return JSON.stringify({
        title: 'Pricing & 12-Month Projections (Revised)',
        format: 'markdown',
        content: `# Revised pricing — per CEO${reason ? ` ("${reason}")` : ''}\n\n- **New launch price: $14** single / $24 bundle\n- **Base case Y1:** 2,900 units → **$40,600 gross**\n\nLower price trades margin for install base. Noted: I preferred $19.`,
        metrics: {
          price_usd: 14,
          units_y1: 2900,
          projected_revenue_y1_usd: 40600,
          pricing_summary: 'Revised: $14 single / $24 bundle — projected Y1 revenue $40,600.',
        },
      })
    return generic.synthesis(chiefId, { idea, genZ: !genZ })
  },
  exec: (idea) => {
    const name = deriveName(idea)
    return `# Executive summary — ${name}\n\n**What your company built today:** a complete launch package for "${idea}" — market analysis, pricing with projections, legal starter docs, a launch kit, and a live landing page.\n\n**Go-to-market in one line:** be the "just enough" option in a category that overshoots.\n\n**Your next three actions:**\n1. Put the landing page live with a checkout link.\n2. Publish the launch posts.\n3. Clear the two CEO items on the legal checklist.\n\nPricing stands as decided on your Decision Desk. Total agent labor is on your Money panel, to the cent.`
  },
}
