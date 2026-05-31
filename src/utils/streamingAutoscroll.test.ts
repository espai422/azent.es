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
