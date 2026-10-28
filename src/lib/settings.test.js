import { describe, expect, it } from 'vitest'
import {
  acceptIntegerDraft,
  canExport,
  durationPresetToTime,
  formatIntegerFieldValue,
} from './settings.js'

describe('duration presets', () => {
  it.each([
    [60, { hours: 1, minutes: 0, seconds: 0 }],
    [90, { hours: 1, minutes: 30, seconds: 0 }],
    [120, { hours: 2, minutes: 0, seconds: 0 }],
  ])('converts %i minutes into valid clock fields', (minutes, expected) => {
    expect(durationPresetToTime(minutes)).toEqual(expected)
  })
})

describe('integer field display', () => {
  it('pads valid time values only while leaving editing states intact', () => {
    expect(formatIntegerFieldValue(0, 2)).toBe('00')
    expect(formatIntegerFieldValue(5, 2)).toBe('05')
    expect(formatIntegerFieldValue('', 2)).toBe('')
    expect(formatIntegerFieldValue('0.5', 2)).toBe('0.5')
  })

  it('accepts only digits in unsigned fields', () => {
    expect(acceptIntegerDraft('120', '12')).toBe('120')
    expect(acceptIntegerDraft('', '12')).toBe('')
    expect(acceptIntegerDraft('-12', '12')).toBe('12')
    expect(acceptIntegerDraft('1.5', '1')).toBe('1')
    expect(acceptIntegerDraft('1e3', '1')).toBe('1')
    expect(acceptIntegerDraft('+8', '8')).toBe('8')
  })

  it('allows one leading minus sign only for signed counter endpoints', () => {
    expect(acceptIntegerDraft('-', '12', true)).toBe('-')
    expect(acceptIntegerDraft('-120', '-12', true)).toBe('-120')
    expect(acceptIntegerDraft('120', '-12', true)).toBe('120')
    expect(acceptIntegerDraft('12-', '12', true)).toBe('12')
    expect(acceptIntegerDraft('--12', '-12', true)).toBe('-12')
    expect(acceptIntegerDraft('-1.5', '-1', true)).toBe('-1')
  })
})

describe('export availability', () => {
  it('allows valid idle settings and blocks invalid or in-progress exports', () => {
    expect(canExport({ errors: [] })).toBe(true)
    expect(canExport({ errors: ['Minutes are invalid.'] })).toBe(false)
    expect(canExport({ errors: [] }, true)).toBe(false)
  })
})
