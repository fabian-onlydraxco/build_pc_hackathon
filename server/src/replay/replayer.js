// Re-emits a recorded run's events with original pacing. The client renders
// exclusively from the event stream, so a replay is indistinguishable from a
// live run — except that Decision Desk gates still park for a real click, and
// kill/resume still freeze and release the stream.
const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Rehearsal artifacts of the recording session that must not replay verbatim.
const SKIP_TYPES = new Set(['run_killed', 'run_resumed'])

export function startReplay(run, fixture, speed = 1) {
  const state = {
    paused: false,
    pauseWaiters: [],
    gateResolvers: new Map(),
    resolvedCards: new Set(),
    done: false,
  }
  run.replay = state
  run.status = 'working'

  const waitWhilePaused = async () => {
    while (state.paused) {
      await new Promise((resolve) => state.pauseWaiters.push(resolve))
    }
  }

  ;(async () => {
    let prevTs = null
    for (const event of fixture.events) {
      await waitWhilePaused()
      if (prevTs != null) {
        const gap = Math.max(event.ts - prevTs, 40)
        await sleepMs(Math.min(gap / speed, 3000))
        await waitWhilePaused()
      }
      prevTs = event.ts

      if (SKIP_TYPES.has(event.type)) continue
      // The presenter's click already resolved this card — skip the recording's.
      if (event.type === 'approval_resolved' && state.resolvedCards.has(event.data?.cardId)) continue

      if (event.type === 'org_planned') {
        run.companyName = event.data?.org?.company_name || run.companyName
      }
      run.bus.emit(event.type, event.data)

      if (event.type === 'needs_approval') {
        const card = event.data?.card
        // Park only for cards recorded as pending — a fixture card that isn't
        // pending can never be clicked, and parking on it would hang the show.
        if (card?.id && card.status === 'pending' && !state.resolvedCards.has(card.id)) {
          await new Promise((resolve) => state.gateResolvers.set(card.id, resolve))
        }
      }
    }
    state.done = true
    run.status = 'done'
  })().catch(() => {})
}

export function replayDecision(run, cardId, approved, note = '') {
  const state = run.replay
  if (!state) return
  run.bus.emit('approval_resolved', { cardId, approved, note })
  state.resolvedCards.add(cardId)
  const resolve = state.gateResolvers.get(cardId)
  if (resolve) {
    state.gateResolvers.delete(cardId)
    resolve()
  }
}

export function replayKill(run) {
  const state = run.replay
  if (!state || state.done) return
  state.paused = true
  run.status = 'paused'
  run.bus.emit('run_killed', {})
}

export function replayResume(run) {
  const state = run.replay
  if (!state) return
  state.paused = false
  run.status = 'working'
  run.bus.emit('run_resumed', {})
  for (const wake of state.pauseWaiters.splice(0)) wake()
}
