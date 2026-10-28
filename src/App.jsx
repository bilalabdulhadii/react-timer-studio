import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUp,
  ChevronDown,
  Clock3,
  FileText,
  Github,
  Hash,
  Hourglass,
} from 'lucide-react'
import './App.css'
import { BrandMark } from './components/BrandMark.jsx'
import { ExportDialog } from './components/ExportDialog.jsx'
import { siteConfig } from './config/site.js'
import {
  DEFAULT_COUNTER_SETTINGS,
  DEFAULT_TIME_SETTINGS,
  formatTimestamp,
  getFieldValidationErrors,
  getGenerationSummary,
} from './lib/srt.js'
import { scrollToSection, scrollToTop, shouldShowBackToTop } from './lib/navigation.js'
import {
  acceptIntegerDraft,
  canExport,
  durationPresetToTime,
  formatIntegerFieldValue,
} from './lib/settings.js'

const BUILT_IN_PRESETS = [1, 3, 5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 90, 120]

const MODES = [
  { id: 'countdown', label: 'Countdown', note: 'Back to zero', icon: Hourglass },
  { id: 'stopwatch', label: 'Stopwatch', note: 'Forward in time', icon: Clock3 },
  { id: 'counter', label: 'Counter', note: 'Number sequence', icon: Hash },
]

const FAQ_ITEMS = [
  {
    question: 'Can I import these files into CapCut?',
    answer:
      'Yes. In CapCut Desktop, open your project and import the SRT through Local Captions. You can then style the text inside CapCut.',
  },
  {
    question: 'Why are there no font or color controls?',
    answer:
      'SRT stores caption text and timing only. Fonts, colors, position, and animation belong in your video editor, where they remain fully editable.',
  },
  {
    question: 'What happens when a counter cannot reach the endpoint exactly?',
    answer:
      'Timer Studio stops at the last valid stepped value before the endpoint. It never changes the step or overshoots the requested end number.',
  },
  {
    question: 'Does Timer Studio upload my captions?',
    answer:
      'No. SRT generation happens entirely in your browser. Timer Studio has no account, database, upload step, or cloud sync.',
  },
]

function NumberField({
  label,
  value,
  onChange,
  min,
  suffix,
  hint,
  error,
  padLength = 1,
}) {
  const [isFocused, setIsFocused] = useState(false)
  const allowNegative = Number(min) < 0
  const id = `field-${label.toLowerCase().replaceAll(' ', '-')}`
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined

  const handleBlur = () => {
    setIsFocused(false)
    if (value !== '' && Number.isInteger(Number(value))) onChange(Number(value))
  }

  const handleChange = (event) => {
    const acceptedValue = acceptIntegerDraft(event.target.value, value, allowNegative)
    if (acceptedValue !== event.target.value) event.target.value = acceptedValue
    onChange(acceptedValue)
  }

  return (
    <label className={`number-field ${error ? 'has-error' : ''}`} htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="number-field__control">
        <input
          id={id}
          type="text"
          inputMode={allowNegative ? 'text' : 'numeric'}
          pattern={allowNegative ? '-?[0-9]*' : '[0-9]*'}
          autoComplete="off"
          value={isFocused ? value : formatIntegerFieldValue(value, padLength)}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        {suffix && <span aria-hidden="true">{suffix}</span>}
      </span>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && <small className="field-error" id={`${id}-error`}>{error}</small>}
    </label>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <button
      className="toggle-row"
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </button>
  )
}

function ModeSelector({ activeMode, onChange }) {
  return (
    <div className="mode-selector" role="group" aria-label="Timer mode">
      <div className="mode-selector__rail" aria-hidden="true" />
      {MODES.map(({ id, label, note, icon: Icon }, index) => (
        <button
          key={id}
          type="button"
          className={`mode-option ${activeMode === id ? 'is-active' : ''}`}
          aria-pressed={activeMode === id}
          onClick={() => onChange(id)}
        >
          <span className="mode-option__index">0{index + 1}</span>
          <span className="mode-option__icon"><Icon size={20} strokeWidth={1.8} aria-hidden="true" /></span>
          <span className="mode-option__copy"><strong>{label}</strong><small>{note}</small></span>
        </button>
      ))}
    </div>
  )
}

function formatTimeline(seconds) {
  if (!Number.isFinite(seconds)) return '—'
  return formatTimestamp(seconds * 1000).replace(',', '.')
}

function App() {
  const [activeMode, setActiveMode] = useState('countdown')
  const [timeSettings, setTimeSettings] = useState({
    countdown: { ...DEFAULT_TIME_SETTINGS },
    stopwatch: { ...DEFAULT_TIME_SETTINGS },
  })
  const [counterSettings, setCounterSettings] = useState({ ...DEFAULT_COUNTER_SETTINGS })
  const [exportSnapshot, setExportSnapshot] = useState(null)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const studioRef = useRef(null)

  const activeSettings = activeMode === 'counter' ? counterSettings : timeSettings[activeMode]
  const summary = useMemo(
    () => getGenerationSummary(activeMode, activeSettings),
    [activeMode, activeSettings],
  )
  const fieldErrors = useMemo(
    () => getFieldValidationErrors(activeMode, activeSettings),
    [activeMode, activeSettings],
  )
  const formErrors = useMemo(() => {
    const fieldMessages = new Set(Object.values(fieldErrors))
    return summary.errors.filter((error) => !fieldMessages.has(error))
  }, [fieldErrors, summary.errors])
  const exportAvailable = canExport(summary, Boolean(exportSnapshot))

  useEffect(() => {
    const studio = studioRef.current
    if (!studio) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setShowBackToTop(shouldShowBackToTop(entry)),
      { rootMargin: '-80px 0px 0px', threshold: 0 },
    )
    observer.observe(studio)
    return () => observer.disconnect()
  }, [])

  const updateSettings = (key, value) => {
    if (activeMode === 'counter') {
      setCounterSettings((current) => ({ ...current, [key]: value }))
    } else {
      setTimeSettings((current) => ({
        ...current,
        [activeMode]: { ...current[activeMode], [key]: value },
      }))
    }
  }

  const applyDurationPreset = (minutes) => {
    setTimeSettings((current) => ({
      ...current,
      [activeMode]: {
        ...current[activeMode],
        ...durationPresetToTime(minutes),
      },
    }))
  }

  const beginExport = () => {
    if (!exportAvailable) return
    setExportSnapshot({ mode: activeMode, settings: { ...activeSettings } })
  }

  const closeExport = useCallback(() => setExportSnapshot(null), [])
  const isTimeMode = activeMode !== 'counter'

  return (
    <div className="site-shell">
      <header className="site-header">
        <button className="brand" type="button" onClick={scrollToTop} aria-label="Scroll to the top of Timer Studio">
          <BrandMark className="brand__mark" decorative />
          <span><strong>Timer</strong> Studio</span>
        </button>
        <nav aria-label="Primary navigation">
          <button type="button" onClick={() => scrollToSection('how-it-works')}>How it works</button>
          <a className="github-link" href={siteConfig.repositoryUrl} target="_blank" rel="noopener noreferrer" aria-label="View Timer Studio on GitHub">
            <Github size={19} aria-hidden="true" />
          </a>
        </nav>
      </header>

      <main>
        <section className="studio-section" id="studio" aria-labelledby="studio-heading" ref={studioRef}>
          <div className="section-heading">
            <div><p className="eyebrow">Configure</p><h1 id="studio-heading">Create your SRT sequence</h1></div>
            <p>Every value becomes a precisely timed, plain-text caption.</p>
          </div>

          <ModeSelector activeMode={activeMode} onChange={setActiveMode} />

          <div className="studio-grid">
            <div className="configuration-panel" key={activeMode}>
              <div className="configuration-panel__topline">
                <span>{MODES.find((mode) => mode.id === activeMode)?.label} settings</span>
                <span className="live-indicator"><i /> Live calculation</span>
              </div>

              {isTimeMode ? (
                <div className="duration-composer">
                  <NumberField label="Hours" value={activeSettings.hours} min={0} max={99} padLength={2} error={fieldErrors.hours} onChange={(value) => updateSettings('hours', value)} />
                  <span className="duration-composer__colon" aria-hidden="true">:</span>
                  <NumberField label="Minutes" value={activeSettings.minutes} min={0} max={59} padLength={2} error={fieldErrors.minutes} onChange={(value) => updateSettings('minutes', value)} />
                  <span className="duration-composer__colon" aria-hidden="true">:</span>
                  <NumberField label="Seconds" value={activeSettings.seconds} min={0} max={59} padLength={2} error={fieldErrors.seconds} onChange={(value) => updateSettings('seconds', value)} />
                </div>
              ) : (
                <div className="counter-composer">
                  <NumberField label="Start Number" value={activeSettings.startNumber} min={-1000000} max={1000000} error={fieldErrors.startNumber} onChange={(value) => updateSettings('startNumber', value)} />
                  <NumberField label="End Number" value={activeSettings.endNumber} min={-1000000} max={1000000} error={fieldErrors.endNumber} onChange={(value) => updateSettings('endNumber', value)} />
                  <NumberField label="Step" value={activeSettings.step} min={1} max={1000000} error={fieldErrors.step} onChange={(value) => updateSettings('step', value)} hint="Direction is chosen automatically." />
                  <NumberField label="Interval" value={activeSettings.interval} min={1} max={3600} suffix="sec" error={fieldErrors.interval} onChange={(value) => updateSettings('interval', value)} />
                </div>
              )}

              {isTimeMode && (
                <div className="preset-bank" aria-labelledby="preset-bank-title">
                  <div className="preset-bank__header">
                    <span id="preset-bank-title">Duration presets</span><small>MINUTES</small>
                  </div>
                  <div className="preset-bank__grid">
                    {BUILT_IN_PRESETS.map((minutes) => {
                      const currentMinutes = Number(activeSettings.hours) * 60 + Number(activeSettings.minutes)
                      const selected = Number(activeSettings.seconds) === 0 && currentMinutes === minutes
                      return (
                        <button key={minutes} type="button" className={selected ? 'is-selected' : ''} aria-pressed={selected} onClick={() => applyDurationPreset(minutes)}>
                          <span>{minutes}</span><i aria-hidden="true" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <section className="settings-section" aria-labelledby="settings-heading">
                <div className="settings-section__heading">
                  <span id="settings-heading">{isTimeMode ? 'Timer options' : 'Counter options'}</span>
                  <small>Always visible</small>
                </div>
                {isTimeMode ? (
                  <>
                    <Toggle
                      label="Show seconds"
                      description="On: MM:SS or HH:MM:SS. Off: minute values only."
                      checked={activeSettings.showSeconds}
                      onChange={(value) => updateSettings('showSeconds', value)}
                    />
                    <Toggle
                      label="Include final value"
                      description={`Append ${activeMode === 'countdown' ? 'zero' : 'the ending time'} for exactly one additional second.`}
                      checked={activeSettings.includeFinalValue}
                      onChange={(value) => updateSettings('includeFinalValue', value)}
                    />
                    <div className="options-number-row">
                      <NumberField label="Start Delay" value={activeSettings.startDelay} min={0} max={3600} suffix="sec" error={fieldErrors.startDelay} onChange={(value) => updateSettings('startDelay', value)} />
                      <p>Leaves intentional silence before the first caption without changing the timer duration.</p>
                    </div>
                    {!activeSettings.showSeconds && (
                      <p className="boundary-note">
                        <strong>Minute boundary rule:</strong> countdowns round remaining time up; stopwatches round elapsed time down. Values change exactly on minute boundaries, and identical captions are merged.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="options-number-grid">
                      <NumberField label="Number Padding" value={activeSettings.padding} min={1} max={10} error={fieldErrors.padding} onChange={(value) => updateSettings('padding', value)} hint="Choose 1 to 10 digits, such as 1, 01, or 001." />
                      <NumberField label="Start Delay" value={activeSettings.startDelay} min={0} max={3600} suffix="sec" error={fieldErrors.startDelay} onChange={(value) => updateSettings('startDelay', value)} />
                    </div>
                    <Toggle
                      label="Final-value hold"
                      description="Extend the last generated number by one additional second."
                      checked={activeSettings.finalHold}
                      onChange={(value) => updateSettings('finalHold', value)}
                    />
                    <p className="boundary-note"><strong>Endpoint rule:</strong> if the step cannot land exactly on the end number, the sequence stops at the last value before it—never beyond it.</p>
                  </>
                )}
              </section>

              {formErrors.length > 0 && (
                <div className="validation-message" role="alert">
                  <strong>Check this configuration</strong>
                  <ul>{formErrors.map((error) => <li key={error}>{error}</li>)}</ul>
                </div>
              )}
            </div>

            <aside className="output-panel" aria-labelledby="output-title">
              <div className="output-panel__head">
                <span className="eyebrow">Output / SRT</span>
                <FileText size={23} strokeWidth={1.6} aria-hidden="true" />
              </div>
              <h3 id="output-title">Ready when<br />your cut is.</h3>
              <dl className="output-summary">
                <div><dt>Total SRT timeline length</dt><dd>{summary.errors.length ? '—' : formatTimeline(summary.timelineLength)}</dd></div>
                <div><dt>Generated captions</dt><dd>{summary.errors.length ? '—' : summary.captionCount.toLocaleString()}</dd></div>
              </dl>
              <button type="button" className="export-button" aria-busy={Boolean(exportSnapshot)} disabled={!exportAvailable} onClick={beginExport}>
                <span>Export SRT</span><ArrowDownToLine size={20} aria-hidden="true" />
              </button>
              <p className="output-panel__note">Plain text · UTF-8 · CapCut compatible</p>
            </aside>
          </div>
        </section>

        <section className="hero-section hero-section--compact" aria-labelledby="showcase-title">
          <div className="hero-section__copy">
            <p className="eyebrow"><span>Precision captions</span> / Browser instrument 01</p>
            <h2 id="showcase-title">Time, set<br /><em>to type.</em></h2>
            <p className="hero-section__lede">
              Generate clean SRT countdowns, stopwatches, and number sequences for CapCut and other video editors.
            </p>
          </div>
          <div className="hero-instrument" aria-hidden="true">
            <span className="hero-instrument__label">TS / 001</span>
            <div className="hero-instrument__dial">
              <div className="hero-instrument__arc" />
              <BrandMark className="hero-instrument__mark" decorative />
              <span className="hero-instrument__hand" />
            </div>
            <div className="hero-instrument__readout"><span>25</span><small>MIN</small></div>
            <p>SRT only<br />Frame-ready timing</p>
          </div>
        </section>

        <section className="how-section" id="how-it-works" aria-labelledby="how-heading">
          <div className="section-heading section-heading--compact">
            <div><p className="eyebrow">Workflow</p><h2 id="how-heading">How it works</h2></div>
            <p>From precise sequence to editable caption layer.</p>
          </div>
          <ol className="how-grid">
            <li><span>01</span><h3>Set the sequence</h3><p>Choose a countdown, stopwatch, or counter and define its timing.</p></li>
            <li><span>02</span><h3>Export the SRT</h3><p>Timer Studio generates and validates every caption inside your browser.</p></li>
            <li><span>03</span><h3>Style in your editor</h3><p>Import with Local Captions, then choose your type, color, and position.</p></li>
          </ol>
        </section>

        <section className="faq-section" aria-labelledby="faq-heading">
          <div className="faq-section__intro"><p className="eyebrow">Practical notes</p><h2 id="faq-heading">Questions,<br /><em>on cue.</em></h2></div>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, index) => (
              <details key={item.question}>
                <summary><span>0{index + 1}</span>{item.question}<ChevronDown size={18} aria-hidden="true" /></summary>
                <div><p>{item.answer}</p></div>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="brand brand--footer"><BrandMark className="brand__mark" decorative /><span><strong>Timer</strong> Studio</span></div>
        <p>© {new Date().getFullYear()} Timer Studio. All rights reserved.</p>
        <p>Developed by <a href={siteConfig.developerUrl} target="_blank" rel="noreferrer">{siteConfig.developer}</a></p>
      </footer>

      <button
        className={`back-to-top ${showBackToTop ? 'is-visible' : ''}`}
        type="button"
        onClick={() => scrollToTop()}
        aria-label="Back to top"
        aria-hidden={!showBackToTop}
        tabIndex={showBackToTop ? 0 : -1}
      >
        <ArrowUp size={20} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {exportSnapshot && <ExportDialog mode={exportSnapshot.mode} settings={exportSnapshot.settings} onClose={closeExport} />}
    </div>
  )
}

export default App
