import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COUNTER_SETTINGS,
  DEFAULT_TIME_SETTINGS,
  entriesToSrt,
  formatTimestamp,
  generateSrt,
  getAutomaticFilename,
  getFieldValidationErrors,
  getGenerationSummary,
  validateSettings,
} from './srt.js'

const timeSettings = (overrides = {}) => ({ ...DEFAULT_TIME_SETTINGS, ...overrides })
const counterSettings = (overrides = {}) => ({ ...DEFAULT_COUNTER_SETTINGS, ...overrides })

function expectValidSrt(content, expectedCount) {
  const blocks = content.trim().split('\n\n')
  expect(blocks).toHaveLength(expectedCount)
  blocks.forEach((block, index) => {
    const lines = block.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe(String(index + 1))
    expect(lines[1]).toMatch(/^\d{2,}:\d{2}:\d{2},\d{3} --> \d{2,}:\d{2}:\d{2},\d{3}$/)
    expect(lines[2].length).toBeGreaterThan(0)
  })
}

describe('time formatting', () => {
  it('formats exact SRT timestamps around minute and hour boundaries', () => {
    expect(formatTimestamp(59_000)).toBe('00:00:59,000')
    expect(formatTimestamp(60_000)).toBe('00:01:00,000')
    expect(formatTimestamp(3_600_000)).toBe('01:00:00,000')
    expect(formatTimestamp(7_201_234)).toBe('02:00:01,234')
  })

  it('serializes sequential captions with valid syntax', () => {
    const content = entriesToSrt([
      { startMs: 0, endMs: 1000, text: '00:01' },
      { startMs: 1000, endMs: 2000, text: '00:00' },
    ])
    expectValidSrt(content, 2)
    expect(content).toContain('00:00:00,000 --> 00:00:01,000')
  })
})

describe('countdown generation', () => {
  it('generates an exact 10-second countdown with a one-second final value', () => {
    const result = generateSrt('countdown', timeSettings({ minutes: 0, seconds: 10 }))
    expect(result.captionCount).toBe(11)
    expect(result.timelineLength).toBe(11)
    expect(result.content).toContain('00:00:00,000 --> 00:00:01,000\n00:10')
    expect(result.content).toContain('00:00:10,000 --> 00:00:11,000\n00:00')
    expectValidSrt(result.content, 11)
  })

  it.each([5, 15, 25, 50, 120])('generates a %i-minute timer accurately', (minutes) => {
    const settings = timeSettings({ hours: Math.floor(minutes / 60), minutes: minutes % 60 })
    const result = generateSrt('countdown', settings)
    expect(result.captionCount).toBe(minutes * 60 + 1)
    expect(result.timelineLength).toBe(minutes * 60 + 1)
    expect(result.content).toContain(minutes >= 60 ? `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00` : `${String(minutes).padStart(2, '0')}:00`)
    expectValidSrt(result.content, minutes * 60 + 1)
  })

  it('uses a stable hours format for one-hour and multi-hour timers', () => {
    const oneHour = generateSrt('countdown', timeSettings({ hours: 1, minutes: 0 }))
    const multiHour = generateSrt('countdown', timeSettings({ hours: 2, minutes: 3 }))
    expect(oneHour.content).toContain('\n01:00:00\n')
    expect(oneHour.content).toContain('\n00:59:59\n')
    expect(multiHour.content).toContain('\n02:03:00\n')
    expect(getAutomaticFilename('countdown', timeSettings({ hours: 1, minutes: 30 }))).toBe(
      'timer-studio-countdown-1h30m.srt',
    )
  })

  it('omits the final value hold when disabled', () => {
    const result = generateSrt(
      'countdown',
      timeSettings({ minutes: 0, seconds: 10, includeFinalValue: false }),
    )
    expect(result.captionCount).toBe(10)
    expect(result.timelineLength).toBe(10)
    expect(result.content).not.toContain('\n00:00\n')
  })

  it('applies start delay without shortening the timer', () => {
    const result = generateSrt('countdown', timeSettings({ minutes: 0, seconds: 10, startDelay: 5 }))
    expect(result.content).toContain('00:00:05,000 --> 00:00:06,000')
    expect(result.timelineLength).toBe(16)
  })

  it('merges repeated minute-only captions using the countdown ceiling rule', () => {
    const result = generateSrt(
      'countdown',
      timeSettings({ minutes: 1, seconds: 1, showSeconds: false, includeFinalValue: true }),
    )
    expect(result.captionCount).toBe(3)
    expect(result.content).toContain('00:00:00,000 --> 00:00:01,000\n02')
    expect(result.content).toContain('00:00:01,000 --> 00:01:01,000\n01')
    expect(result.content).toContain('00:01:01,000 --> 00:01:02,000\n00')
  })
})

describe('stopwatch generation', () => {
  it('counts upward from zero and includes the ending value', () => {
    const result = generateSrt('stopwatch', timeSettings({ minutes: 0, seconds: 10 }))
    expect(result.content).toContain('00:00:00,000 --> 00:00:01,000\n00:00')
    expect(result.content).toContain('00:00:10,000 --> 00:00:11,000\n00:10')
    expect(result.captionCount).toBe(11)
  })

  it('uses floor-at-boundary behavior and merges minute-only captions', () => {
    const result = generateSrt(
      'stopwatch',
      timeSettings({ minutes: 1, seconds: 1, showSeconds: false, includeFinalValue: true }),
    )
    expect(result.captionCount).toBe(2)
    expect(result.content).toContain('00:00:00,000 --> 00:01:00,000\n00')
    expect(result.content).toContain('00:01:00,000 --> 00:01:02,000\n01')
  })

  it.each([
    { seconds: 59, expected: '00:59' },
    { seconds: 60, expected: '01:00' },
    { seconds: 3600, expected: '01:00:00' },
  ])('handles the $seconds-second boundary', ({ seconds, expected }) => {
    const settings = timeSettings({
      hours: Math.floor(seconds / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
      seconds: seconds % 60,
    })
    const result = generateSrt('stopwatch', settings)
    expect(result.content).toContain(`\n${expected}\n`)
  })
})

describe('counter generation', () => {
  it('generates ascending and descending sequences', () => {
    const ascending = generateSrt('counter', counterSettings({ startNumber: 1, endNumber: 5, step: 2 }))
    const descending = generateSrt('counter', counterSettings({ startNumber: 5, endNumber: 1, step: 2 }))
    expect(ascending.content).toMatch(/\n1\n[\s\S]*\n3\n[\s\S]*\n5\n/)
    expect(descending.content).toMatch(/\n5\n[\s\S]*\n3\n[\s\S]*\n1\n/)
    expect(ascending.captionCount).toBe(3)
    expect(descending.captionCount).toBe(3)
  })

  it('stops before an unreachable endpoint without overshooting', () => {
    const result = generateSrt('counter', counterSettings({ startNumber: 1, endNumber: 10, step: 4 }))
    expect(result.content).toMatch(/\n1\n[\s\S]*\n5\n[\s\S]*\n9\n/)
    expect(result.content).not.toMatch(/\n10\n/)
  })

  it('pads values, honors whole-second intervals and holds the final value for one second', () => {
    const result = generateSrt(
      'counter',
      counterSettings({ startNumber: 8, endNumber: 10, padding: 3, interval: 2, startDelay: 2, finalHold: true }),
    )
    expect(result.content).toContain('00:00:02,000 --> 00:00:04,000\n008')
    expect(result.content).toContain('00:00:06,000 --> 00:00:09,000\n010')
    expect(result.timelineLength).toBe(9)
    expectValidSrt(result.content, 3)
  })

  it('supports negative values and a one-caption sequence when both endpoints match', () => {
    const negative = generateSrt(
      'counter',
      counterSettings({ startNumber: -2, endNumber: 2, step: 2, padding: 3 }),
    )
    const equal = generateSrt(
      'counter',
      counterSettings({ startNumber: -7, endNumber: -7, step: 4, interval: 3600 }),
    )

    expect(negative.content).toMatch(/\n-002\n[\s\S]*\n000\n[\s\S]*\n002\n/)
    expect(equal.captionCount).toBe(1)
    expect(equal.timelineLength).toBe(3600)
    expect(equal.content).toContain('\n-7\n')
  })
})

describe('validation and summaries', () => {
  it('accepts all time field boundaries', () => {
    expect(validateSettings('countdown', timeSettings({ hours: 99, minutes: 59, seconds: 59 }))).toEqual([])
    expect(validateSettings('countdown', timeSettings({ minutes: 59 }))).toEqual([])
    expect(validateSettings('countdown', timeSettings({ minutes: 0, seconds: 59 }))).toEqual([])
  })

  it.each([
    ['hours', -1],
    ['hours', 100],
    ['hours', 1.5],
    ['hours', ''],
    ['minutes', -1],
    ['minutes', 60],
    ['minutes', 2.5],
    ['minutes', ''],
    ['seconds', -1],
    ['seconds', 60],
    ['seconds', 0.5],
    ['seconds', ''],
  ])('rejects invalid %s value %s', (field, value) => {
    const errors = getFieldValidationErrors('countdown', timeSettings({ [field]: value }))
    expect(errors[field]).toMatch(/whole number/)
  })

  it('allows temporary empty inputs while keeping summaries and export data invalid', () => {
    const settings = timeSettings({ minutes: '' })
    expect(getFieldValidationErrors('countdown', settings).minutes).toBeTruthy()
    expect(getGenerationSummary('countdown', settings)).toMatchObject({
      captionCount: 0,
      timelineLength: 0,
    })
  })

  it('rejects a zero total duration', () => {
    expect(() => generateSrt('countdown', timeSettings({ hours: 0, minutes: 0, seconds: 0 }))).toThrow(
      'Set a duration of at least one second.',
    )
  })

  it.each([0, 60, 3600])('accepts a %i-second start delay in every mode', (startDelay) => {
    expect(validateSettings('countdown', timeSettings({ startDelay }))).toEqual([])
    expect(validateSettings('counter', counterSettings({ startDelay }))).toEqual([])
  })

  it.each([-1, 0.5, 3601, ''])('rejects invalid start delay %s', (startDelay) => {
    expect(getFieldValidationErrors('countdown', timeSettings({ startDelay })).startDelay).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ startDelay })).startDelay).toBeTruthy()
  })

  it('enforces all counter field ranges and whole-number rules', () => {
    expect(getFieldValidationErrors('counter', counterSettings({ startNumber: -1_000_001 })).startNumber).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ endNumber: 1_000_001 })).endNumber).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ startNumber: 1.2 })).startNumber).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ step: 0 })).step).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ step: -1 })).step).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ interval: 0 })).interval).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ interval: 0.5 })).interval).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ interval: 3601 })).interval).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ padding: 0 })).padding).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ padding: 11 })).padding).toBeTruthy()
    expect(validateSettings('counter', counterSettings({ interval: 1, padding: 1 }))).toEqual([])
    expect(validateSettings('counter', counterSettings({ interval: 3600, padding: 10 }))).toEqual([])
  })

  it('rejects empty, NaN, and infinite numeric states', () => {
    expect(getFieldValidationErrors('countdown', timeSettings({ hours: Number.NaN })).hours).toBeTruthy()
    expect(getFieldValidationErrors('countdown', timeSettings({ seconds: Number.POSITIVE_INFINITY })).seconds).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ endNumber: '' })).endNumber).toBeTruthy()
    expect(getFieldValidationErrors('counter', counterSettings({ step: Number.NEGATIVE_INFINITY })).step).toBeTruthy()
  })

  it('does not reject a valid sequence because of an arbitrary caption limit', () => {
    const settings = counterSettings({ startNumber: 1, endNumber: 1_000_000, step: 1 })
    expect(validateSettings('counter', settings)).toEqual([])
    expect(getGenerationSummary('counter', settings).captionCount).toBe(1_000_000)
  })

  it('reports exact timeline length and caption count', () => {
    expect(
      getGenerationSummary('countdown', timeSettings({ minutes: 0, seconds: 10, startDelay: 5 })),
    ).toMatchObject({ captionCount: 11, timelineLength: 16, errors: [] })
    expect(
      getGenerationSummary(
        'counter',
        counterSettings({ startNumber: 1, endNumber: 9, step: 2, interval: 2, startDelay: 3 }),
      ),
    ).toMatchObject({ captionCount: 5, timelineLength: 13, errors: [] })
  })
})
