export const EXPORT_STAGES = Object.freeze([
  { id: 'preparing', label: 'Preparing configuration' },
  { id: 'generating', label: 'Generating captions' },
  { id: 'finalizing', label: 'Finalizing export' },
  { id: 'ready', label: 'Ready to download' },
])

export function getExportStageIndex(phase) {
  const index = EXPORT_STAGES.findIndex((stage) => stage.id === phase)
  return index === -1 ? 0 : index
}

export function getExportStageState(index, activeIndex) {
  if (index < activeIndex) return 'complete'
  if (index === activeIndex) return 'active'
  return 'upcoming'
}

export function getPresentationProgress(elapsedMilliseconds, durationMilliseconds) {
  if (durationMilliseconds <= 0) return 1
  return Math.max(0, Math.min(1, elapsedMilliseconds / durationMilliseconds))
}
