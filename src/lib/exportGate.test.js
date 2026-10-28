import { afterEach, describe, expect, it, vi } from 'vitest'
import { createExportGate, MIN_EXPORT_PRESENTATION_MS } from './exportGate.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('export presentation gate', () => {
  it('holds a fast export until the three-second presentation completes', () => {
    vi.useFakeTimers()
    const onReady = vi.fn()
    const onPresentation = vi.fn()
    const result = { filename: 'fast.srt' }
    const gate = createExportGate({ onReady, onPresentation })

    expect(gate.complete(result)).toBe('presenting')
    expect(onPresentation).toHaveBeenCalledOnce()
    expect(onReady).not.toHaveBeenCalled()

    vi.advanceTimersByTime(MIN_EXPORT_PRESENTATION_MS - 1)
    expect(onReady).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onReady).toHaveBeenCalledWith(result)
  })

  it('releases a slow export immediately after generation completes', () => {
    vi.useFakeTimers()
    const onReady = vi.fn()
    const onPresentation = vi.fn()
    const result = { filename: 'slow.srt' }
    const gate = createExportGate({ onReady, onPresentation })

    vi.advanceTimersByTime(MIN_EXPORT_PRESENTATION_MS + 2000)
    expect(onReady).not.toHaveBeenCalled()
    expect(gate.complete(result)).toBe('ready')
    expect(onReady).toHaveBeenCalledWith(result)
    expect(onPresentation).not.toHaveBeenCalled()
  })

  it('cancels the minimum duration immediately when generation fails', () => {
    vi.useFakeTimers()
    const onReady = vi.fn()
    const gate = createExportGate({ onReady })

    gate.fail()
    vi.runAllTimers()
    expect(onReady).not.toHaveBeenCalled()
  })

  it('prevents download release after manual dismissal', () => {
    vi.useFakeTimers()
    const onReady = vi.fn()
    const gate = createExportGate({ onReady })

    gate.complete({ filename: 'cancelled.srt' })
    gate.cancel()
    vi.runAllTimers()
    expect(onReady).not.toHaveBeenCalled()
  })
})
