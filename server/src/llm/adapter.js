import { PROVIDER, MODELS, CAPS } from '../config.js'
import { claudeComplete } from './claude.js'
import { openrouterComplete } from './openrouter.js'
import { mockComplete } from './mock.js'
import { abortError } from './errors.js'

export { abortError, isAbort } from './errors.js'

async function attempt({ model, tier, system, prompt, maxTokens, runSignal, meta }) {
  const timeout = AbortSignal.timeout(CAPS.callTimeoutMs)
  const signal = runSignal ? AbortSignal.any([runSignal, timeout]) : timeout

  if (PROVIDER === 'openrouter') {
    return openrouterComplete({ model, system, prompt, maxTokens, signal })
  }
  if (PROVIDER === 'claude') {
    return claudeComplete({ model, system, prompt, maxTokens, signal })
  }
  return mockComplete({ tier, prompt, signal, meta })
}

// The single seam every agent call goes through: provider dispatch, timeout,
// one retry on transient failure — never a retry after the run itself aborted.
export async function complete({ tier = 'chief', system = '', prompt = '', maxTokens = 2500, signal, meta = {} }) {
  const model = MODELS[tier] || MODELS.chief
  const args = { model, tier, system, prompt, maxTokens, runSignal: signal, meta }

  try {
    return { ...(await attempt(args)), model }
  } catch (err) {
    if (signal?.aborted) throw abortError()
    const retried = await attempt(args).catch((second) => {
      if (signal?.aborted) throw abortError()
      throw second
    })
    return { ...retried, model }
  }
}
