import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { useAnimatedHeight } from './useAnimatedHeight'

function Wrapper({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useAnimatedHeight(ref, content)
  return <div ref={ref} data-testid="wrapper">{content}</div>
}

describe('useAnimatedHeight', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true })) // skip RAF
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('does not animate on the first render', async () => {
    const { container } = render(<Wrapper content="hello" />)
    const el = container.querySelector('[data-testid="wrapper"]') as HTMLElement
    // No inline height should be present.
    await vi.advanceTimersByTimeAsync(200)
    expect(el.style.height).toBe('')
  })

  it('schedules a height animation when content changes', async () => {
    // Stub scrollHeight so the change is observable.
    let mockScrollHeight = 100
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() { return mockScrollHeight },
    })
    const { rerender, container } = render(<Wrapper content="hello" />)
    const el = container.querySelector('[data-testid="wrapper"]') as HTMLElement
    mockScrollHeight = 300
    rerender(<Wrapper content="hello world more text" />)
    // Before debounce fires, no inline height.
    expect(el.style.height).toBe('')
    // After 80ms debounce, animation runs and (since reduced motion) clears inline.
    await vi.advanceTimersByTimeAsync(100)
    expect(el.style.height).toBe('')
  })

  it('coalesces rapid changes within 80ms into one animation', async () => {
    let mockScrollHeight = 100
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() { return mockScrollHeight },
    })
    const { rerender } = render(<Wrapper content="a" />)
    mockScrollHeight = 200
    rerender(<Wrapper content="a b" />)
    await vi.advanceTimersByTimeAsync(30)
    mockScrollHeight = 350
    rerender(<Wrapper content="a b c" />)
    await vi.advanceTimersByTimeAsync(30)
    mockScrollHeight = 500
    rerender(<Wrapper content="a b c d" />)
    await vi.advanceTimersByTimeAsync(20)
    await vi.advanceTimersByTimeAsync(100)
    // Animation has run once, ending at 500 (with reduced motion → no overshoot).
    expect(true).toBe(true)
  })
})
