export const MIN_EXPORT_PRESENTATION_MS = 3000

export function createExportGate({
  minimumDuration = MIN_EXPORT_PRESENTATION_MS,
  onReady,
  onPresentation = () => {},
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
}) {
  let gateElapsed = false
  let hasResult = false
  let result
  let settled = false

  const release = () => {
    if (settled || !gateElapsed || !hasResult) return false
    settled = true
    onReady(result)
    return true
  }

  const timerId = setTimer(() => {
    gateElapsed = true
    release()
  }, minimumDuration)

  return {
    complete(nextResult) {
      if (settled) return 'settled'
      result = nextResult
      hasResult = true
      if (release()) return 'ready'
      onPresentation()
      return 'presenting'
    },
    fail() {
      if (settled) return
      settled = true
      clearTimer(timerId)
    },
    cancel() {
      if (settled) return
      settled = true
      clearTimer(timerId)
    },
  }
}
