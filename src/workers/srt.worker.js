import { generateSrt } from '../lib/srt.js'

self.onmessage = ({ data }) => {
  try {
    let activeStage = 'preparing'
    self.postMessage({ type: 'stage', stage: activeStage })
    const { content, ...result } = generateSrt(data.mode, data.settings, (progress) => {
      const nextStage = progress >= 0.6 ? 'finalizing' : 'generating'
      if (nextStage !== activeStage) {
        activeStage = nextStage
        self.postMessage({ type: 'stage', stage: activeStage })
      }
      self.postMessage({ type: 'progress', progress })
    })
    const blob = new Blob([content], { type: 'application/x-subrip;charset=utf-8' })
    self.postMessage({ type: 'complete', result: { ...result, blob } })
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'The SRT file could not be generated.',
    })
  }
}
