import { describe, expect, it, vi } from 'vitest'
import { scrollToSection, scrollToTop, shouldShowBackToTop } from './navigation.js'

function createWindow(reducedMotion = false) {
  return {
    location: { hash: '' },
    matchMedia: vi.fn(() => ({ matches: reducedMotion })),
    scrollTo: vi.fn(),
  }
}

describe('hash-free navigation', () => {
  it('scrolls to the top smoothly without changing the URL hash', () => {
    const windowObject = createWindow()
    scrollToTop(windowObject)
    expect(windowObject.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(windowObject.location.hash).toBe('')
  })

  it('respects reduced motion for internal section navigation', () => {
    const windowObject = createWindow(true)
    const section = { scrollIntoView: vi.fn() }
    const documentObject = { getElementById: vi.fn(() => section) }

    scrollToSection('how-it-works', { documentObject, windowObject })

    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
    expect(windowObject.location.hash).toBe('')
  })
})

describe('Back to Top visibility', () => {
  it('stays hidden while the Studio section is visible or below the viewport', () => {
    expect(shouldShowBackToTop({ isIntersecting: true, boundingClientRect: { bottom: 500 } })).toBe(false)
    expect(shouldShowBackToTop({ isIntersecting: false, boundingClientRect: { bottom: 300 } })).toBe(false)
  })

  it('appears after the Studio section has passed the sticky header', () => {
    expect(shouldShowBackToTop({ isIntersecting: false, boundingClientRect: { bottom: 80 } })).toBe(true)
    expect(shouldShowBackToTop({ isIntersecting: false, boundingClientRect: { bottom: -20 } })).toBe(true)
  })
})
