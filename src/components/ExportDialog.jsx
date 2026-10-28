import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, RotateCcw, X } from 'lucide-react'
import { initiateSrtDownload } from '../lib/download.js'
import { createExportGate, MIN_EXPORT_PRESENTATION_MS } from '../lib/exportGate.js'
import {
  EXPORT_STAGES,
  getExportStageIndex,
  getExportStageState,
  getPresentationProgress,
} from '../lib/exportProgress.js'

const getFocusable = (element) =>
  element?.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []

export function ExportDialog({ mode, settings, onClose }) {
  const [status, setStatus] = useState('generating')
  const [progress, setProgress] = useState(0)
  const [presentationProgress, setPresentationProgress] = useState(0)
  const [phase, setPhase] = useState('preparing')
  const [error, setError] = useState('')
  const [retryToken, setRetryToken] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  const dialogRef = useRef(null)
  const doneRef = useRef(null)
  const retryRef = useRef(null)
  const workerRef = useRef(null)
  const gateRef = useRef(null)
  const closingRef = useRef(false)
  const presentationStartedAtRef = useRef(0)

  useEffect(() => {
    const previousFocus = document.activeElement
    dialogRef.current?.focus()
    return () => previousFocus?.focus?.()
  }, [])

  useEffect(() => {
    if (status === 'success') doneRef.current?.focus()
    if (status === 'error') retryRef.current?.focus()
  }, [status])

  useEffect(() => {
    let revokeTimer
    let downloadCleanup
    presentationStartedAtRef.current = performance.now()
    const worker = new Worker(new URL('../workers/srt.worker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker

    const showError = (message) => {
      gateRef.current?.fail()
      setStatus('error')
      setError(message)
      worker.terminate()
    }

    const initiateDownload = (result) => {
      if (closingRef.current) return
      try {
        setPhase('ready')
        const download = initiateSrtDownload(result)
        downloadCleanup = download.revoke
        setProgress(1)
        setStatus('success')
        revokeTimer = window.setTimeout(() => {
          downloadCleanup?.()
          downloadCleanup = undefined
        }, 1000)
      } catch {
        showError('The file was prepared, but the browser could not start the download.')
      }
    }

    const gate = createExportGate({
      onReady: initiateDownload,
      onPresentation: () => {
        setPhase('ready')
        setProgress(1)
        setStatus('presenting')
      },
    })
    gateRef.current = gate

    worker.onmessage = ({ data }) => {
      if (data.type === 'stage') {
        setPhase(data.stage)
        return
      }

      if (data.type === 'progress') {
        setProgress(Math.max(0, Math.min(1, data.progress)))
        return
      }

      if (data.type === 'complete') {
        gate.complete(data.result)
        worker.terminate()
        return
      }

      if (data.type === 'error') showError(data.message)
    }

    worker.onerror = () => {
      showError('An unexpected browser error interrupted the export.')
    }

    worker.postMessage({ mode, settings })

    return () => {
      gate.cancel()
      worker.terminate()
      window.clearTimeout(revokeTimer)
      downloadCleanup?.()
      if (workerRef.current === worker) workerRef.current = null
      if (gateRef.current === gate) gateRef.current = null
    }
  }, [mode, retryToken, settings])

  useEffect(() => {
    if (status !== 'presenting') return undefined

    let animationFrame
    const updatePresentationProgress = (currentTime) => {
      const elapsed = currentTime - presentationStartedAtRef.current
      const nextProgress = getPresentationProgress(elapsed, MIN_EXPORT_PRESENTATION_MS)
      setPresentationProgress(nextProgress)
      if (nextProgress < 1) animationFrame = window.requestAnimationFrame(updatePresentationProgress)
    }

    animationFrame = window.requestAnimationFrame(updatePresentationProgress)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [retryToken, status])

  const requestClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    gateRef.current?.cancel()
    workerRef.current?.terminate()
    setIsClosing(true)
  }

  const handleAnimationEnd = (event) => {
    if (isClosing && event.target === dialogRef.current) onClose()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      requestClose()
      return
    }

    if (event.key !== 'Tab') return
    const focusable = [...getFocusable(dialogRef.current)]
    if (!focusable.length) {
      event.preventDefault()
      return
    }
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const retryExport = () => {
    closingRef.current = false
    setStatus('generating')
    setProgress(0)
    setPresentationProgress(0)
    setPhase('preparing')
    setError('')
    setRetryToken((value) => value + 1)
  }

  const generationPercent = Math.round(progress * 100)
  const isGenerating = status === 'generating'
  const isPresenting = status === 'presenting'
  const displayedProgress = isPresenting ? presentationProgress : progress
  const displayedPercent = Math.round(displayedProgress * 100)
  const isWorkflowVisible = isGenerating || isPresenting
  const activeStageIndex = getExportStageIndex(isPresenting ? 'ready' : phase)
  const phaseCopy = {
    preparing: {
      title: 'Preparing configuration',
      description: 'Checking your sequence settings before caption generation begins.',
    },
    generating: {
      title: 'Generating captions',
      description: 'Building precisely timed caption entries in the background.',
    },
    finalizing: {
      title: 'Finalizing export',
      description: 'Validating timestamps and assembling the UTF-8 subtitle file.',
    },
  }
  const currentCopy = phaseCopy[phase] ?? phaseCopy.preparing

  return (
    <div className={`dialog-backdrop ${isClosing ? 'is-closing' : ''}`} role="presentation">
      <div
        className={`export-dialog export-dialog--${status} ${isClosing ? 'is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        aria-describedby="export-description"
        aria-busy={isGenerating}
        tabIndex="-1"
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        onAnimationEnd={handleAnimationEnd}
      >
        <button type="button" className="export-close" onClick={requestClose} aria-label="Close export dialog">
          <X size={19} aria-hidden="true" />
        </button>

        <div className={`export-calibration ${isWorkflowVisible ? 'export-calibration--workflow' : ''}`}>
          {isWorkflowVisible ? (
            <>
              <div className="export-workflow-meter" aria-hidden="true">
                <div className="export-track" style={{ '--export-progress': `${displayedPercent * 3.6}deg` }}>
                  <span className="export-track__inner">
                    {isPresenting ? (
                      <span className="export-ready-mark"><Check size={24} strokeWidth={2} /> Ready</span>
                    ) : (
                      <strong>{generationPercent}</strong>
                    )}
                  </span>
                </div>
                {isPresenting && <span className="presentation-orbit" />}
              </div>
              <div className="export-workflow-details">
                <ol className="export-stages" aria-label="Export progress stages">
                  {EXPORT_STAGES.map((stage, index) => {
                    const stageState = getExportStageState(index, activeStageIndex)
                    const stateLabel = stageState === 'complete'
                      ? 'Complete'
                      : stageState === 'active' && stage.id === 'ready'
                        ? 'Generation complete'
                        : stageState === 'active'
                          ? 'In progress'
                          : 'Waiting'
                    return (
                      <li
                        className={`export-stage export-stage--${stageState}`}
                        key={stage.id}
                        aria-current={stageState === 'active' ? 'step' : undefined}
                      >
                        <span className="export-stage__marker" aria-hidden="true">
                          {stageState === 'complete' ? <Check size={14} strokeWidth={2.4} /> : index + 1}
                        </span>
                        <span><strong>{stage.label}</strong><small>{stateLabel}</small></span>
                      </li>
                    )
                  })}
                </ol>
                <div className="export-progress-meter">
                  <div className="export-progress-meter__label">
                    <span>{isPresenting ? 'Presentation progress' : 'Generation progress'}</span>
                    <strong>{displayedPercent}%</strong>
                  </div>
                  <div
                    className="export-progress-meter__track"
                    role="progressbar"
                    aria-label={isPresenting ? 'Export presentation progress' : 'SRT generation progress'}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={displayedPercent}
                  >
                    <span style={{ width: `${displayedPercent}%` }} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="export-track" aria-hidden="true">
                <span className="export-track__inner">
                  {status === 'success' && <Check size={38} strokeWidth={1.8} />}
                  {status === 'error' && <AlertTriangle size={34} />}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="export-copy" aria-live="polite">
          <span className="eyebrow">Export sequence</span>
          <h2 id="export-title">
            {isGenerating && currentCopy.title}
            {isPresenting && 'Ready to download'}
            {status === 'success' && 'Export complete'}
            {status === 'error' && 'Export interrupted'}
          </h2>
          <p id="export-description">
            {isGenerating && currentCopy.description}
            {isPresenting && 'Generation is complete. The download will begin when the presentation sequence finishes.'}
            {status === 'success' && 'Your SRT is ready. Download started.'}
            {status === 'error' && error}
          </p>
        </div>

        {status === 'success' && (
          <div className="export-actions export-actions--success">
            <button ref={doneRef} type="button" className="button button--primary button--done" onClick={requestClose}>
              <Check size={17} aria-hidden="true" /> Done
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="export-actions">
            <button type="button" className="button button--secondary" onClick={requestClose}>Close</button>
            <button ref={retryRef} type="button" className="button button--primary" onClick={retryExport}>
              <RotateCcw size={17} aria-hidden="true" /> Retry export
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
