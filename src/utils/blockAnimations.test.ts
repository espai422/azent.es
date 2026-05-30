import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cubicBezier, DURATIONS, SPRING_EASING, prefersReducedMotion, smoothScrollTo } from './blockAnimations'

describe('cubicBezier', () => {
  it('returns 0 at x=0 and 1 at x=1 for any control points', () => {
    const ease = cubicBezier(0.34, 1.25, 0.4, 1)
    expect(ease(0)).toBeCloseTo(0, 5)
    expect(ease(1)).toBeCloseTo(1, 5)
  })

  it('linear control points (0.25, 0.25, 0.75, 0.75) yield x ≈ y', () => {
    const ease = cubicBezier(0.25, 0.25, 0.75, 0.75)
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(ease(x)).toBeCloseTo(x, 3)
    }
  })

  it('spring curve (0.34, 1.25, 0.4, 1) overshoots above 1 between 0.4 and 0.9', () => {
    const ease = cubicBezier(0.34, 1.25, 0.4, 1)
    const peak = Math.max(
      ease(0.4), ease(0.5), ease(0.6), ease(0.7), ease(0.8), ease(0.9),
    )
    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThan(1.2)
  })

  it('clamps inputs below 0 to 0 and above 1 to 1', () => {
    const ease = cubicBezier(0.34, 1.25, 0.4, 1)
    expect(ease(-0.5)).toBe(0)
    expect(ease(1.5)).toBe(1)
  })
})

describe('SPRING_EASING', () => {
  it('peaks above 1 around x=0.6 (spring overshoot)', () => {
    expect(SPRING_EASING(0.6)).toBeGreaterThan(1)
  })
})

describe('DURATIONS', () => {
  it('exposes positive integer durations for all named animations', () => {
    expect(DURATIONS.scrollInsertion).toBeGreaterThan(0)
    expect(DURATIONS.scrollFocus).toBeGreaterThan(0)
    expect(DURATIONS.revealSymmetric).toBeGreaterThan(0)
    expect(DURATIONS.streamingHeight).toBeGreaterThan(0)
  })
})

describe('prefersReducedMotion', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns false when the media query does not match', () => {
    expect(prefersReducedMotion()).toBe(false)
  })

  it('returns true when the media query matches', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    expect(prefersReducedMotion()).toBe(true)
  })
})

describe('smoothScrollTo', () => {
  let scrollToCalls: Array<{ top: number; behavior?: ScrollBehavior }>
  let currentScrollY: number

  beforeEach(() => {
    scrollToCalls = []
    currentScrollY = 0
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    vi.stubGlobal('scrollTo', (opts: ScrollToOptions) => {
      scrollToCalls.push({ top: opts.top ?? 0, behavior: opts.behavior })
      currentScrollY = opts.top ?? 0
    })
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      get: () => currentScrollY,
    })
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('animates from current scrollY to target via RAF', async () => {
    currentScrollY = 0
    const promise = smoothScrollTo(500, 200)
    await vi.advanceTimersByTimeAsync(100)
    // At least one intermediate scrollTo call should have happened.
    expect(scrollToCalls.length).toBeGreaterThan(1)
    await vi.advanceTimersByTimeAsync(200)
    await promise
    expect(scrollToCalls.at(-1)?.top).toBe(500)
  })

  it('jumps instantly when reduced motion is enabled', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    await smoothScrollTo(800, 600)
    expect(scrollToCalls).toEqual([{ top: 800, behavior: 'auto' }])
  })

  it('aborts when the signal fires and resolves without reaching target', async () => {
    const controller = new AbortController()
    const promise = smoothScrollTo(1000, 400, controller.signal)
    await vi.advanceTimersByTimeAsync(100)
    controller.abort()
    await promise
    expect(scrollToCalls.at(-1)?.top).not.toBe(1000)
  })

  it('resolves immediately when target equals current scrollY', async () => {
    currentScrollY = 250
    await smoothScrollTo(250, 500)
    expect(scrollToCalls.length).toBe(0)
  })
})
