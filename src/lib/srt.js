export const MAX_COUNTER_ABS_VALUE = 1_000_000
export const MAX_START_DELAY_SECONDS = 3_600
export const MAX_COUNTER_INTERVAL_SECONDS = 3_600
export const MAX_COUNTER_PADDING = 10

export const DEFAULT_TIME_SETTINGS = Object.freeze({
  hours: 0,
  minutes: 25,
  seconds: 0,
  showSeconds: true,
  includeFinalValue: true,
  startDelay: 0,
})

export const DEFAULT_COUNTER_SETTINGS = Object.freeze({
  startNumber: 1,
  endNumber: 100,
  step: 1,
  interval: 1,
  padding: 1,
  startDelay: 0,
  finalHold: false,
})

const isFiniteNumber = (value) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value))
const isIntegerInRange = (value, min, max) =>
  isFiniteNumber(value) && Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max

export function getDurationSeconds(settings) {
  return Number(settings.hours) * 3600 + Number(settings.minutes) * 60 + Number(settings.seconds)
}

export function getCounterCaptionCount(settings) {
  if (
    !isFiniteNumber(settings.startNumber) ||
    !isFiniteNumber(settings.endNumber) ||
    !isFiniteNumber(settings.step) ||
    Number(settings.step) <= 0
  ) {
    return 0
  }

  const distance = Math.abs(Number(settings.endNumber) - Number(settings.startNumber))
  return Math.floor(distance / Number(settings.step)) + 1
}

export function getFieldValidationErrors(mode, settings) {
  const errors = {}
  if (mode === 'countdown' || mode === 'stopwatch') {
    if (!isIntegerInRange(settings.hours, 0, 99)) errors.hours = 'Enter a whole number from 0 to 99.'
    if (!isIntegerInRange(settings.minutes, 0, 59)) errors.minutes = 'Enter a whole number from 0 to 59.'
    if (!isIntegerInRange(settings.seconds, 0, 59)) errors.seconds = 'Enter a whole number from 0 to 59.'
    if (!isIntegerInRange(settings.startDelay, 0, MAX_START_DELAY_SECONDS)) {
      errors.startDelay = 'Enter a whole number from 0 to 3,600 seconds.'
    }
  } else if (mode === 'counter') {
    if (!isIntegerInRange(settings.startNumber, -MAX_COUNTER_ABS_VALUE, MAX_COUNTER_ABS_VALUE)) {
      errors.startNumber = 'Enter a whole number from -1,000,000 to 1,000,000.'
    }
    if (!isIntegerInRange(settings.endNumber, -MAX_COUNTER_ABS_VALUE, MAX_COUNTER_ABS_VALUE)) {
      errors.endNumber = 'Enter a whole number from -1,000,000 to 1,000,000.'
    }
    if (!isIntegerInRange(settings.step, 1, MAX_COUNTER_ABS_VALUE)) {
      errors.step = 'Enter a whole number from 1 to 1,000,000.'
    }
    if (!isIntegerInRange(settings.interval, 1, MAX_COUNTER_INTERVAL_SECONDS)) {
      errors.interval = 'Enter a whole number from 1 to 3,600 seconds.'
    }
    if (!isIntegerInRange(settings.padding, 1, MAX_COUNTER_PADDING)) {
      errors.padding = 'Enter a whole number from 1 to 10 digits.'
    }
    if (!isIntegerInRange(settings.startDelay, 0, MAX_START_DELAY_SECONDS)) {
      errors.startDelay = 'Enter a whole number from 0 to 3,600 seconds.'
    }
  }

  return errors
}

export function validateSettings(mode, settings) {
  if (mode !== 'countdown' && mode !== 'stopwatch' && mode !== 'counter') {
    return ['Choose a supported generation mode.']
  }

  const fieldErrors = getFieldValidationErrors(mode, settings)
  const errors = Object.values(fieldErrors)

  if (mode === 'countdown' || mode === 'stopwatch') {
    const timeFieldsAreValid = !fieldErrors.hours && !fieldErrors.minutes && !fieldErrors.seconds
    if (timeFieldsAreValid && getDurationSeconds(settings) <= 0) {
      errors.push('Set a duration of at least one second.')
    }
  }

  return errors
}

export function formatTimestamp(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error('Timestamp must be a nonnegative number.')

  const rounded = Math.round(milliseconds)
  const ms = rounded % 1000
  const totalSeconds = Math.floor(rounded / 1000)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

export function formatTimerValue(totalSeconds, originalDurationSeconds, showSeconds = true) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const usesHours = originalDurationSeconds >= 3600

  if (!showSeconds) {
    const totalMinutes = Math.floor(safeSeconds / 60)
    if (usesHours) {
      return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
    }
    return String(totalMinutes).padStart(2, '0')
  }

  const seconds = safeSeconds % 60
  const totalMinutes = Math.floor(safeSeconds / 60)
  if (usesHours) {
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(totalMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatCounterValue(value, padding = 1) {
  const sign = value < 0 ? '-' : ''
  return `${sign}${String(Math.abs(value)).padStart(Number(padding), '0')}`
}

function getTimeCaptionCount(mode, settings) {
  const duration = getDurationSeconds(settings)
  if (!Number.isFinite(duration) || duration <= 0) return 0

  if (settings.showSeconds) return duration + (settings.includeFinalValue ? 1 : 0)

  const base = Math.ceil(duration / 60)
  if (!settings.includeFinalValue) return base
  if (mode === 'countdown') return base + 1
  return base + (duration % 60 === 0 ? 1 : 0)
}

export function getGenerationSummary(mode, settings) {
  const errors = validateSettings(mode, settings)
  if (errors.length) return { captionCount: 0, timelineLength: 0, errors }

  if (mode === 'counter') {
    const captionCount = getCounterCaptionCount(settings)
    const timelineLength =
      Number(settings.startDelay) + captionCount * Number(settings.interval) + (settings.finalHold ? 1 : 0)
    return { captionCount, timelineLength, errors: [] }
  }

  const duration = getDurationSeconds(settings)
  return {
    captionCount: getTimeCaptionCount(mode, settings),
    timelineLength: Number(settings.startDelay) + duration + (settings.includeFinalValue ? 1 : 0),
    errors: [],
  }
}

function pushMerged(entries, text, startMs, endMs) {
  const previous = entries.at(-1)
  if (previous && previous.text === text && previous.endMs === startMs) {
    previous.endMs = endMs
    return
  }
  entries.push({ text, startMs, endMs })
}

function createTimeEntries(mode, settings, onProgress) {
  const duration = getDurationSeconds(settings)
  const delayMs = Number(settings.startDelay) * 1000
  const entries = []

  for (let elapsed = 0; elapsed < duration; elapsed += 1) {
    let displaySeconds
    if (mode === 'countdown') {
      const remaining = duration - elapsed
      displaySeconds = settings.showSeconds ? remaining : Math.ceil(remaining / 60) * 60
    } else {
      displaySeconds = settings.showSeconds ? elapsed : Math.floor(elapsed / 60) * 60
    }

    pushMerged(
      entries,
      formatTimerValue(displaySeconds, duration, settings.showSeconds),
      delayMs + elapsed * 1000,
      delayMs + (elapsed + 1) * 1000,
    )

    if (onProgress && (elapsed % 2000 === 0 || elapsed === duration - 1)) onProgress((elapsed + 1) / duration)
  }

  if (settings.includeFinalValue) {
    const finalSeconds = mode === 'countdown' ? 0 : duration
    pushMerged(
      entries,
      formatTimerValue(finalSeconds, duration, settings.showSeconds),
      delayMs + duration * 1000,
      delayMs + (duration + 1) * 1000,
    )
  }

  return entries
}

function createCounterEntries(settings, onProgress) {
  const count = getCounterCaptionCount(settings)
  const direction = Number(settings.endNumber) >= Number(settings.startNumber) ? 1 : -1
  const intervalMs = Math.round(Number(settings.interval) * 1000)
  const delayMs = Math.round(Number(settings.startDelay) * 1000)
  const entries = []

  for (let index = 0; index < count; index += 1) {
    const value = Number(settings.startNumber) + direction * Number(settings.step) * index
    entries.push({
      text: formatCounterValue(value, settings.padding),
      startMs: delayMs + index * intervalMs,
      endMs: delayMs + (index + 1) * intervalMs,
    })
    if (onProgress && (index % 2000 === 0 || index === count - 1)) onProgress((index + 1) / count)
  }

  if (settings.finalHold && entries.length) entries.at(-1).endMs += 1000
  return entries
}

export function entriesToSrt(entries, onProgress) {
  const blocks = new Array(entries.length)
  entries.forEach((entry, index) => {
    blocks[index] = `${index + 1}\n${formatTimestamp(entry.startMs)} --> ${formatTimestamp(entry.endMs)}\n${entry.text}`
    if (onProgress && (index % 2000 === 0 || index === entries.length - 1)) onProgress((index + 1) / entries.length)
  })
  return blocks.join('\n\n').concat('\n')
}

function consumeEntriesToSrt(entries, onProgress) {
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]
    entries[index] = `${index + 1}\n${formatTimestamp(entry.startMs)} --> ${formatTimestamp(entry.endMs)}\n${entry.text}`
    if (onProgress && (index % 2000 === 0 || index === entries.length - 1)) onProgress((index + 1) / entries.length)
  }
  return entries.join('\n\n').concat('\n')
}

export function getAutomaticFilename(mode, settings) {
  const suffixes = []

  if (mode === 'counter') {
    const base = `timer-studio-counter-${settings.startNumber}-to-${settings.endNumber}`
    if (Number(settings.step) !== 1) suffixes.push(`step-${settings.step}`)
    if (Number(settings.interval) !== 1) suffixes.push(`every-${settings.interval}s`)
    if (Number(settings.padding) !== 1) suffixes.push(`pad-${settings.padding}`)
    if (Number(settings.startDelay) !== 0) suffixes.push(`delay-${settings.startDelay}s`)
    if (settings.finalHold) suffixes.push('hold')
    return `${base}${suffixes.length ? `-${suffixes.join('-')}` : ''}.srt`
  }

  const duration = getDurationSeconds(settings)
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = duration % 60
  const durationLabel = `${hours ? `${hours}h` : ''}${minutes ? `${minutes}m` : ''}${seconds ? `${seconds}s` : ''}`
  if (!settings.showSeconds) suffixes.push('minutes-only')
  if (!settings.includeFinalValue) suffixes.push('no-final')
  if (Number(settings.startDelay) !== 0) suffixes.push(`delay-${settings.startDelay}s`)
  return `timer-studio-${mode}-${durationLabel}${suffixes.length ? `-${suffixes.join('-')}` : ''}.srt`
}

export function generateSrt(mode, settings, onProgress) {
  const errors = validateSettings(mode, settings)
  if (errors.length) throw new Error(errors[0])

  onProgress?.(0)
  const entries =
    mode === 'counter'
      ? createCounterEntries(settings, (progress) => onProgress?.(progress * 0.6))
      : createTimeEntries(mode, settings, (progress) => onProgress?.(progress * 0.6))
  const timelineLength = entries.length ? entries.at(-1).endMs / 1000 : 0
  const content = consumeEntriesToSrt(entries, (progress) => onProgress?.(0.6 + progress * 0.4))
  onProgress?.(1)

  return {
    content,
    filename: getAutomaticFilename(mode, settings),
    captionCount: entries.length,
    timelineLength,
  }
}
