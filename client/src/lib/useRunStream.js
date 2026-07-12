import { useEffect, useRef } from 'react'

// One EventSource per project. On (re)connect the server resends that run's
// full log; the per-project seq guard makes replays idempotent — which is
// also how a page reload rebuilds every project's state from scratch.
// Streams marked done are closed (their state is already fully hydrated),
// keeping the browser's per-origin connection budget for live projects.
export function useRunStreams(streams, dispatch) {
  const sourcesRef = useRef(new Map())
  const key = streams.map((s) => `${s.id}:${s.done ? 1 : 0}`).join(',')

  useEffect(() => {
    const sources = sourcesRef.current
    const wanted = new Map(streams.map((s) => [s.id, s]))

    for (const [id, source] of sources) {
      const entry = wanted.get(id)
      if (!entry || entry.done) {
        source.close()
        sources.delete(id)
      }
    }

    for (const { id, done } of streams) {
      if (done || sources.has(id)) continue
      const source = new EventSource(`/api/runs/${id}/events`)
      source.onmessage = (message) => {
        try {
          dispatch({ type: 'event', runId: id, event: JSON.parse(message.data) })
        } catch {
          // malformed frame — ignore
        }
      }
      sources.set(id, source)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dispatch])

  useEffect(
    () => () => {
      for (const source of sourcesRef.current.values()) source.close()
    },
    [],
  )
}
