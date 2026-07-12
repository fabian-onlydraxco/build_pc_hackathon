import { PROVIDER, MODELS } from '../config.js'
import { claudeComplete } from './claude.js'
import { openrouterComplete } from './openrouter.js'
import { mockComplete } from './mock.js'
import { abortError } from './errors.js'

export { abortError, isAbort } from './errors.js'

// Providers own their per-request timeout; only the run's abort signal is
// passed through, so time spent queued (free-tier pacing) never counts
// against a request's timeout budget.
async function attempt({ model, tier, system, prompt, maxTokens, runSignal, meta }) {
  if (PROVIDER === 'openrouter') {
    return openrouterComplete({ model, system, prompt, maxTokens, signal: runSignal })
  }
  if (PROVIDER === 'claude') {
    return claudeComplete({ model, system, prompt, maxTokens, signal: runSignal })
  }
  return mockComplete({ tier, prompt, signal: runSignal, meta })
}

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

// Client/config mistakes don't heal by retrying; rate limits and flaky
// upstreams (free-model pools especially) usually do.
const NO_RETRY_STATUS = new Set([400, 401, 402, 403, 404])
const BACKOFF_MS = [2000, 6000, 15000]

// The single seam every agent call goes through: provider dispatch, timeout,
// exponential-backoff retries on transient failure — never after a run abort.
export async function complete({ tier = 'chief', system = '', prompt = '', maxTokens = 2500, signal, meta = {} }) {
  const model = MODELS[tier] || MODELS.chief
  const args = { model, tier, system, prompt, maxTokens, runSignal: signal, meta }

  let lastErr
  for (let attemptIndex = 0; attemptIndex <= BACKOFF_MS.length; attemptIndex++) {
    try {
      return { ...(await attempt(args)), model }
    } catch (err) {
      if (signal?.aborted) throw abortError()
      if (NO_RETRY_STATUS.has(err.status)) throw err
      lastErr = err
      if (attemptIndex === BACKOFF_MS.length) break
      await sleep(BACKOFF_MS[attemptIndex] + Math.random() * 1000, signal)
    }
  }
  throw lastErr
}
