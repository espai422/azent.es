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

describe('streamingAutoscroll — idle timeout', () => {
  let rafCallback: FrameRequestCallback | null
  let now: number

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
    rafCallback = null
    now = 1_000_000
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    vi.stubGlobal('performance', { now: () => now })
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallback = cb
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('scrollTo', vi.fn())
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000, writable: true })
    disengageStreamingAutoscroll()
  })
  afterEach(() => {
    document.querySelectorAll('section').forEach(el => el.remove())
    disengageStreamingAutoscroll()
    vi.unstubAllGlobals()
  })

  it('goes to idle when more than IDLE_MS (1500) passes between engage and a tick', () => {
    makeBlock('block-a', 500)
    engageStreamingAutoscroll('block-a')
    now += 1600 // > IDLE_MS
    rafCallback?.(0)
    expect(_getStateForTests().kind).toBe('idle')
  })

  it('stays engaged when less than IDLE_MS has passed', () => {
    makeBlock('block-a', 500)
    engageStreamingAutoscroll('block-a')
    now += 1000 // < IDLE_MS
    rafCallback?.(0)
    expect(_getStateForTests().kind).toBe('engaged')
  })

  it('re-engaging the same block refreshes lastTouchAt (idle timer resets)', () => {
    makeBlock('block-a', 500)
    engageStreamingAutoscroll('block-a')
    now += 1000
    engageStreamingAutoscroll('block-a') // refresh
    now += 1000 // total elapsed since first engage = 2000, since refresh = 1000
    rafCallback?.(0)
    expect(_getStateForTests().kind).toBe('engaged')
  })
})

describe('streamingAutoscroll — opt-out detection', () => {
  let rafCallback: FrameRequestCallback | null
  let scrollListener: EventListener | null
  let currentScrollY: number

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
    rafCallback = null
    scrollListener = null
    currentScrollY = 0
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallback = cb
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.stubGlobal('scrollTo', (opts: ScrollToOptions) => {
      currentScrollY = opts.top ?? 0
    })
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => currentScrollY })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000, writable: true })
    // Capture the scroll listener registered by engage().
    const origAdd = window.addEventListener.bind(window)
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, opts) => {
      if (type === 'scroll') scrollListener = listener as EventListener
      else origAdd(type, listener, opts)
    })
    disengageStreamingAutoscroll()
  })
  afterEach(() => {
    document.querySelectorAll('section').forEach(el => el.remove())
    disengageStreamingAutoscroll()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('transitions to optedOut when user scroll diverges > 150 px from lastScrollY', () => {
    makeBlock('block-a', 500) // no overflow → tick will not set lastScrollY
    engageStreamingAutoscroll('block-a')
    // lastScrollY at engage = window.scrollY = 0
    currentScrollY = 200 // user scrolled 200 px away
    scrollListener?.(new Event('scroll'))
    const s = _getStateForTests()
    expect(s.kind).toBe('optedOut')
    if (s.kind === 'optedOut') expect(s.blockId).toBe('block-a')
  })

  it('does NOT opt out when user scroll is within 150 px of lastScrollY', () => {
    makeBlock('block-a', 500)
    engageStreamingAutoscroll('block-a')
    currentScrollY = 100 // within tolerance
    scrollListener?.(new Event('scroll'))
    expect(_getStateForTests().kind).toBe('engaged')
  })

  it('does NOT opt out from a scroll event that immediately follows our own scrollTo (suppressed)', () => {
    makeBlock('block-a', 1500) // overflow = 600 → tick scrolls to scrollY+150
    engageStreamingAutoscroll('block-a')
    rafCallback?.(0)              // this tick calls scrollTo (currentScrollY → 150) and sets suppressed=true
    scrollListener?.(new Event('scroll')) // first event = ours, suppressed consumed
    expect(_getStateForTests().kind).toBe('engaged')
    // A SECOND event with no further programmatic scrolls counts as user input.
    currentScrollY = 500 // user scrolls way off
    scrollListener?.(new Event('scroll'))
    expect(_getStateForTests().kind).toBe('optedOut')
  })
})
