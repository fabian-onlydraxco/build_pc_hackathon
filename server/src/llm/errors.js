export const abortError = () =>
  Object.assign(new Error('Run aborted'), { name: 'AbortError' })

export const isAbort = (err) =>
  err?.name === 'AbortError' || err?.name === 'TimeoutError' || /abort/i.test(err?.message || '')
