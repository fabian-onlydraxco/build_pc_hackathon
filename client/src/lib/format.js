import { useEffect, useRef, useState } from 'react'

export const fmtUsd = (n, digits = 2) => `$${(n || 0).toFixed(digits)}`

export const STATUS_WORD = {
  idle: 'ready',
  composing: 'composing',
  staffing: 'staffing',
  working: 'working',
  delivering: 'delivering',
  paused: 'frozen',
  done: 'done',
  error: 'error',
}

export const fmtBig = (n) => (n == null ? null : `$${Math.round(n).toLocaleString('en-US')}`)

export const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

// Animates a number toward its target — the burn counter's "tick".
export function useCountUp(target, duration = 450) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  const frameRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      fromRef.current = target
      return
    }
    const from = fromRef.current
    if (from === target) return
    const start = performance.now()
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) frameRef.current = requestAnimationFrame(step)
      else fromRef.current = target
    }
    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration])

  return value
}
