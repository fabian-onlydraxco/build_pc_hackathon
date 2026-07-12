import { OPENROUTER_API_KEY, OPENROUTER_MODEL, PRICES, CAPS } from '../config.js'
import { abortError } from './errors.js'

// OpenRouter provider (OpenAI-compatible chat completions). Same plain-fetch
// seam as the Claude provider — no vendor SDK.
//
// Free-tier reality: all :free models route through a shared upstream pool
// that rate-limits per account (429 + Retry-After ≈ 25s). So every request
// goes through ONE global FIFO queue, successes are gently spaced, and 429s
// push a global "not before" gate that all queued calls respect.

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(abortError())
      },
      { once: true },
    )
  })

let queue = Promise.resolve()
let notBefore = 0

const SUCCESS_SPACING_MS = 2000
const MAX_429_WAITS = 6

async function rawCall({ model, system, prompt, maxTokens, signal }) {
  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(CAPS.callTimeoutMs)])
    : AbortSignal.timeout(CAPS.callTimeoutMs)

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: requestSignal,
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

  const bodyText = await res.text().catch(() => '')

  if (!res.ok) {
    const err = new Error(`OpenRouter ${res.status}: ${bodyText.slice(0, 300)}`)
    err.status = res.status
    try {
      const parsed = JSON.parse(bodyText)
      err.retryAfterSeconds =
        Number(parsed?.error?.metadata?.retry_after_seconds) ||
        Number(res.headers.get('retry-after')) ||
        25
    } catch {
      err.retryAfterSeconds = Number(res.headers.get('retry-after')) || 25
    }
    throw err
  }

  const json = JSON.parse(bodyText)
  if (json.error) {
    const err = new Error(`OpenRouter: ${json.error.message || 'unknown error'}`)
    err.status = json.error.code
    throw err
  }

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

async function pacedCall(args) {
  for (let attempt = 0; ; attempt++) {
    const waitMs = notBefore - Date.now()
    if (waitMs > 0) await sleep(waitMs + Math.random() * 750, args.signal)

    try {
      const result = await rawCall(args)
      notBefore = Math.max(notBefore, Date.now() + SUCCESS_SPACING_MS)
      return result
    } catch (err) {
      if (err.status === 429 && attempt < MAX_429_WAITS && !args.signal?.aborted) {
        const retryMs = (err.retryAfterSeconds || 25) * 1000
        notBefore = Math.max(notBefore, Date.now() + retryMs)
        console.log(`  openrouter: rate-limited, pacing ${Math.round(retryMs / 1000)}s (attempt ${attempt + 1}/${MAX_429_WAITS})`)
        continue
      }
      throw err
    }
  }
}

export function openrouterComplete(args) {
  // Global FIFO — the free-tier limit is per account, not per run.
  const task = queue.then(() => pacedCall(args))
  queue = task.catch(() => {})
  return task
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
