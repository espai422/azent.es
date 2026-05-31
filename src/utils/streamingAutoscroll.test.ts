import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  engageStreamingAutoscroll,
  disengageStreamingAutoscroll,
  _getStateForTests,
} from './streamingAutoscroll'

describe('streamingAutoscroll — basic engage/disengage', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('addEventListener', vi.fn())
    vi.stubGlobal('removeEventListener', vi.fn())
    disengageStreamingAutoscroll()
  })
  afterEach(() => {
    disengageStreamingAutoscroll()
    vi.unstubAllGlobals()
  })

  it('starts in idle', () => {
    expect(_getStateForTests().kind).toBe('idle')
  })

  it('engage(id) from idle transitions to engaged with that blockId', () => {
    engageStreamingAutoscroll('block-a')
    const s = _getStateForTests()
    expect(s.kind).toBe('engaged')
    if (s.kind === 'engaged') expect(s.blockId).toBe('block-a')
  })

  it('disengage from engaged returns to idle', () => {
    engageStreamingAutoscroll('block-a')
    disengageStreamingAutoscroll()
    expect(_getStateForTests().kind).toBe('idle')
  })

  it('engage(id) installs a scroll listener and schedules a RAF', () => {
    engageStreamingAutoscroll('block-a')
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)
    expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
  })
})

describe('streamingAutoscroll — rAF tick math', () => {
  let scrollToCalls: Array<{ top: number }>
  let currentScrollY: number
  let rafCallback: FrameRequestCallback | null

  function makeBlock(id: string, bottom: number): HTMLElement {
    const el = document.createElement('section')
    el.id = id
    el.getBoundingClientRect = () => ({
      top: 0, bottom, height: bottom, left: 0, right: 100, width: 100, x: 0, y: 0,
      toJSON() { return {} },
    }) as DOMRect
    document.body.appendChild(el)
    return el
  }

  beforeEach(() => {
    scrollToCalls = []
    currentScrollY = 0
    rafCallback = null
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallback = cb
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('scrollTo', (opts: ScrollToOptions) => {
      scrollToCalls.push({ top: opts.top ?? 0 })
      currentScrollY = opts.top ?? 0
    })
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => currentScrollY })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000, writable: true })
    disengageStreamingAutoscroll()
  })
  afterEach(() => {
    document.querySelectorAll('section').forEach(el => el.remove())
    disengageStreamingAutoscroll()
    vi.unstubAllGlobals()
  })

  it('scrolls by overflow * 0.25 when block bottom is past 90% of vh', () => {
    // vh = 1000 → target bottom = 900. bottom = 1000 → overflow = 100.
    // newScrollY = 0 + 100 * 0.25 = 25.
    makeBlock('block-a', 1000)
    engageStreamingAutoscroll('block-a')
    rafCallback?.(0)
    expect(scrollToCalls.at(-1)?.top).toBe(25)
  })

  it('stores newScrollY in state.lastScrollY (post-lerp value)', () => {
    makeBlock('block-a', 1200)
    engageStreamingAutoscroll('block-a')
    // overflow = 1200 - 900 = 300 → newScrollY = 75
    rafCallback?.(0)
    const s = _getStateForTests()
    if (s.kind !== 'engaged') throw new Error('expected engaged')
    expect(s.lastScrollY).toBe(75)
  })

  it('does NOT scroll when block bottom is within the target zone (no overflow)', () => {
    makeBlock('block-a', 500)
    engageStreamingAutoscroll('block-a')
    rafCallback?.(0)
    expect(scrollToCalls.length).toBe(0)
  })

  it('transitions to idle when the active block element no longer exists', () => {
    makeBlock('block-a', 1000)
    engageStreamingAutoscroll('block-a')
    document.getElementById('block-a')?.remove()
    rafCallback?.(0)
    expect(_getStateForTests().kind).toBe('idle')
  })
})
