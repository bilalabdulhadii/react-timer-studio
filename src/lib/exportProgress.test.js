import { describe, expect, it } from 'vitest'
import {
  EXPORT_STAGES,
  getExportStageIndex,
  getExportStageState,
  getPresentationProgress,
} from './exportProgress.js'

describe('export workflow stages', () => {
  it('maps each real worker phase to the matching visible stage', () => {
    expect(EXPORT_STAGES.map((stage) => stage.label)).toEqual([
      'Preparing configuration',
      'Generating captions',
      'Finalizing export',
      'Ready to download',
    ])
    expect(getExportStageIndex('preparing')).toBe(0)
    expect(getExportStageIndex('generating')).toBe(1)
    expect(getExportStageIndex('finalizing')).toBe(2)
    expect(getExportStageIndex('ready')).toBe(3)
  })

  it('distinguishes completed, active, and upcoming stages', () => {
    expect(getExportStageState(0, 2)).toBe('complete')
    expect(getExportStageState(2, 2)).toBe('active')
    expect(getExportStageState(3, 2)).toBe('upcoming')
  })

  it('reports truthful elapsed progress for the minimum presentation', () => {
    expect(getPresentationProgress(0, 3000)).toBe(0)
    expect(getPresentationProgress(750, 3000)).toBe(0.25)
    expect(getPresentationProgress(1500, 3000)).toBe(0.5)
    expect(getPresentationProgress(3000, 3000)).toBe(1)
    expect(getPresentationProgress(4000, 3000)).toBe(1)
  })
})
