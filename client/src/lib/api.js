async function request(path, body) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Glyde server is offline — start it with `npm run dev`, then reload this page.')
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export const health = () => request('/health')
export const listRuns = () => request('/runs')
export const startRun = (idea, mode = 'live') => request('/runs', { idea, mode })
export const decideCard = (runId, cardId, approved, note = '') =>
  request(`/runs/${runId}/cards/${cardId}`, { approved, note })
export const updateAgent = (runId, agentId, patch) => request(`/runs/${runId}/agents/${agentId}`, patch)
export const killRun = (runId) => request(`/runs/${runId}/kill`, {})
export const resumeRun = (runId) => request(`/runs/${runId}/resume`, {})
export const instruct = (runId, text) => request(`/runs/${runId}/instruct`, { text })
export const buildRun = (runId) => request(`/runs/${runId}/build`, {})
export const proposeHire = (runId, payload) => request(`/runs/${runId}/hire-propose`, payload)
export const hireAgent = (runId, payload) => request(`/runs/${runId}/hire`, payload)
export const deleteRun = (runId) => request(`/runs/${runId}/delete`, {})
export const directTask = (runId, chiefId, text) => request(`/runs/${runId}/direct`, { chiefId, text })
export const saveFixture = (runId, name = 'golden-run') => request(`/runs/${runId}/save-fixture`, { name })
