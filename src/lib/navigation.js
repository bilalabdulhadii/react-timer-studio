export function getScrollBehavior(windowObject = globalThis.window) {
  return windowObject.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

export function scrollToTop(windowObject = globalThis.window) {
  windowObject.scrollTo({ top: 0, behavior: getScrollBehavior(windowObject) })
}

export function scrollToSection(
  id,
  { documentObject = globalThis.document, windowObject = globalThis.window } = {},
) {
  documentObject.getElementById(id)?.scrollIntoView({
    behavior: getScrollBehavior(windowObject),
    block: 'start',
  })
}

export function shouldShowBackToTop(entry, topOffset = 80) {
  return !entry.isIntersecting && entry.boundingClientRect.bottom <= topOffset
}
