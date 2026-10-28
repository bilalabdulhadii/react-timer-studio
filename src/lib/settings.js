export function durationPresetToTime(totalMinutes) {
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    seconds: 0,
  }
}

export function formatIntegerFieldValue(value, minimumLength = 1) {
  if (value === '' || value === null || value === undefined) return ''
  const numericValue = Number(value)
  if (!Number.isInteger(numericValue)) return String(value)

  const sign = numericValue < 0 ? '-' : ''
  return `${sign}${String(Math.abs(numericValue)).padStart(minimumLength, '0')}`
}

export function acceptIntegerDraft(nextValue, currentValue, allowNegative = false) {
  const pattern = allowNegative ? /^-?\d*$/ : /^\d*$/
  return pattern.test(nextValue) ? nextValue : String(currentValue ?? '')
}

export function canExport(summary, isExporting = false) {
  return summary.errors.length === 0 && !isExporting
}
