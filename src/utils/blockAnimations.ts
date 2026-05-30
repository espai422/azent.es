// Cubic Bézier easing solver: returns f(x) where f is the curve parameterised
// by control points (0,0) → (x1,y1) → (x2,y2) → (1,1). Uses Newton-Raphson on
// the x axis to recover t, then evaluates y(t). Handles overshoot (y > 1).
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (x: number) => number {
  // Coefficients for B(t) = a*t^3 + b*t^2 + c*t, using control points
  // P0=(0,0), P3=(1,1) so the linear and constant terms collapse.
  const ax = 1 - 3 * x2 + 3 * x1
  const bx = 3 * x2 - 6 * x1
  const cx = 3 * x1
  const ay = 1 - 3 * y2 + 3 * y1
  const by = 3 * y2 - 6 * y1
  const cy = 3 * y1

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const derivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  function tForX(x: number): number {
    let t = x
    for (let i = 0; i < 8; i++) {
      const xt = sampleX(t) - x
      if (Math.abs(xt) < 1e-6) return t
      const slope = derivativeX(t)
      if (Math.abs(slope) < 1e-6) break
      t -= xt / slope
    }
    // Bisection fallback if Newton fails.
    let lo = 0, hi = 1
    t = x
    for (let i = 0; i < 24; i++) {
      const xt = sampleX(t)
      if (Math.abs(xt - x) < 1e-6) return t
      if (xt < x) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return t
  }

  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    return sampleY(tForX(x))
  }
}

export const SPRING_EASING = cubicBezier(0.34, 1.25, 0.4, 1)

export const DURATIONS = {
  scrollInsertion: 600,
  scrollFocus: 600,
  revealSymmetric: 500,
  streamingHeight: 250,
} as const

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function smoothScrollTo(
  targetY: number,
  durationMs: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }
    const startY = window.scrollY
    const delta = targetY - startY
    if (delta === 0) {
      resolve()
      return
    }
    if (prefersReducedMotion() || durationMs <= 0) {
      window.scrollTo({ top: targetY, behavior: 'auto' })
      resolve()
      return
    }

    const startTime = performance.now()
    let rafId = 0
    let done = false

    const finish = () => {
      if (done) return
      done = true
      cancelAnimationFrame(rafId)
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }

    const onAbort = () => finish()
    signal?.addEventListener('abort', onAbort)

    const tick = (now: number) => {
      if (done) return
      if (signal?.aborted) { finish(); return }
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / durationMs)
      const eased = SPRING_EASING(t)
      const y = startY + delta * eased
      window.scrollTo({ top: y, behavior: 'auto' })
      if (t >= 1) { finish(); return }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
  })
}

export function scrollSoPointAt(
  pageY: number,
  viewportRatio: number,
  durationMs: number,
  signal?: AbortSignal,
): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const viewport = window.innerHeight
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport)
  const raw = pageY - viewport * viewportRatio
  const target = Math.max(0, Math.min(maxScroll, raw))
  return smoothScrollTo(target, durationMs, signal)
}

export function scrollSoElementFocused(
  element: HTMLElement,
  durationMs: number,
  signal?: AbortSignal,
): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  const rect = element.getBoundingClientRect()
  if (rect.height === 0) return Promise.resolve()
  const viewport = window.innerHeight
  const topPageY = rect.top + window.scrollY
  if (rect.height <= viewport) {
    const centrePageY = topPageY + rect.height / 2
    return scrollSoPointAt(centrePageY, 0.5, durationMs, signal)
  }
  return scrollSoPointAt(topPageY, 0.2, durationMs, signal)
}

export function revealBlockSymmetric(
  element: HTMLElement,
  finalHeight: number,
  durationMs: number,
): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || finalHeight <= 0) {
      resolve()
      return
    }
    const startScrollY = window.scrollY
    const targetScrollY = Math.max(0, startScrollY - finalHeight / 2)

    if (prefersReducedMotion() || durationMs <= 0) {
      element.style.height = ''
      element.style.minHeight = ''
      element.style.overflow = ''
      window.scrollTo({ top: targetScrollY, behavior: 'auto' })
      resolve()
      return
    }

    element.style.height = '0px'
    element.style.minHeight = '0px'
    element.style.overflow = 'hidden'

    const startTime = performance.now()
    let rafId = 0
    let done = false

    const finish = () => {
      if (done) return
      done = true
      cancelAnimationFrame(rafId)
      element.style.height = ''
      element.style.minHeight = ''
      element.style.overflow = ''
      resolve()
    }

    const tick = (now: number) => {
      if (done) return
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / durationMs)
      const eased = SPRING_EASING(t)
      // Height clamped to [0, finalHeight] in case the spring overshoots.
      const heightValue = Math.max(0, Math.min(finalHeight, finalHeight * eased))
      element.style.height = `${heightValue}px`
      const scrollValue = startScrollY + (targetScrollY - startScrollY) * eased
      window.scrollTo({ top: scrollValue, behavior: 'auto' })
      if (t >= 1) { finish(); return }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
  })
}
