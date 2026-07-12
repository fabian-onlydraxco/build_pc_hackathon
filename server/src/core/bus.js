// Per-run event log + fan-out. The client renders exclusively from this
// stream, which is what makes replay mode indistinguishable from live.
export class RunBus {
  constructor(runId) {
    this.runId = runId
    this.log = []
    this.subs = new Set()
    this.seq = 0
  }

  emit(type, data = {}) {
    const event = { seq: ++this.seq, runId: this.runId, ts: Date.now(), type, data }
    this.log.push(event)
    for (const sub of this.subs) {
      try {
        sub(event)
      } catch {
        // a dead subscriber never blocks the run
      }
    }
    return event
  }

  subscribe(fn) {
    this.subs.add(fn)
    return () => this.subs.delete(fn)
  }
}

// Express handler: replays the full log to a new connection, then streams live.
export function sseHandler(bus) {
  return (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    })
    res.flushHeaders()

    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`)
    for (const event of bus.log) send(event)

    const unsubscribe = bus.subscribe(send)
    const heartbeat = setInterval(() => res.write(':hb\n\n'), 15_000)

    req.on('close', () => {
      clearInterval(heartbeat)
      unsubscribe()
    })
  }
}
