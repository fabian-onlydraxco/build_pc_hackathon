import { ANTHROPIC_API_KEY, CAPS } from '../config.js'

// Direct REST call — no vendor SDK, so the adapter stays the only seam.
export async function claudeComplete({ model, system, prompt, maxTokens, signal }) {
  const requestSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(CAPS.callTimeoutMs)])
    : AbortSignal.timeout(CAPS.callTimeoutMs)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: requestSignal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`Claude API ${res.status}: ${body.slice(0, 300)}`)
    err.status = res.status
    throw err
  }

  const json = await res.json()
  const text = (json.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  return {
    text,
    usage: {
      input: json.usage?.input_tokens ?? 0,
      output: json.usage?.output_tokens ?? 0,
    },
  }
}
