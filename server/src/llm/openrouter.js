import { OPENROUTER_API_KEY, OPENROUTER_MODEL, PRICES } from '../config.js'

// OpenRouter provider (OpenAI-compatible chat completions). Same plain-fetch
// seam as the Claude provider — no vendor SDK.
export async function openrouterComplete({ model, system, prompt, maxTokens, signal }) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Glyde AI',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`)
  }

  const json = await res.json()
  if (json.error) throw new Error(`OpenRouter: ${json.error.message || 'unknown error'}`)

  const raw = json.choices?.[0]?.message?.content || ''
  // Reasoning models sometimes leak thinking blocks into content — drop them.
  const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  return {
    text,
    usage: {
      input: json.usage?.prompt_tokens ?? 0,
      output: json.usage?.completion_tokens ?? 0,
    },
  }
}

// Pull the model's real pricing from OpenRouter at boot so burn metering is
// never hardcoded. Falls back silently to the static default on failure.
export async function initOpenRouter() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`models list ${res.status}`)
    const { data = [] } = await res.json()
    const entry = data.find((m) => m.id === OPENROUTER_MODEL)
    if (!entry) {
      return { ok: false, note: `model "${OPENROUTER_MODEL}" not in OpenRouter catalog — using fallback pricing` }
    }
    const inPerM = Number(entry.pricing?.prompt) * 1_000_000
    const outPerM = Number(entry.pricing?.completion) * 1_000_000
    if (Number.isFinite(inPerM) && Number.isFinite(outPerM)) {
      PRICES[OPENROUTER_MODEL] = { inPerM, outPerM }
    }
    return { ok: true, name: entry.name, inPerM, outPerM }
  } catch (err) {
    return { ok: false, note: `pricing fetch failed (${err.message}) — using fallback pricing` }
  }
}
