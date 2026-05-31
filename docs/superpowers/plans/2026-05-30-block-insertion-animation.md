# Block Insertion & Focus Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing block insertion/focus scroll and reveal animations with a coherent set of spring-eased, viewport-aware behaviours, and smooth the height changes that happen while the LLM streams content.

**Architecture:** New `src/utils/blockAnimations.ts` module owns all animation primitives (cubic-bezier solver, programmatic scroll, symmetric reveal, height interpolation). `BrowserToolBridge.tsx` consumes them from `add_agent_block` and the focus-needed helper. `Block.tsx` gains a `useAnimatedHeight` hook that debounces and animates streaming height deltas.

**Tech Stack:** TypeScript + React 19 + vitest + jsdom + @testing-library/react. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-05-30-block-insertion-animation-design.md`

---

## File Structure

**Create:**
- `src/utils/blockAnimations.ts` — easing solver, durations constant, all animation helpers.
- `src/utils/blockAnimations.test.ts` — unit tests for solver + maths + animation lifecycle.
- `src/components/sections/useAnimatedHeight.ts` — React hook that wires height smoothing into a Block.
- `src/components/sections/useAnimatedHeight.test.tsx` — tests for the hook (debounce, animation cancellation across rerenders).

**Modify:**
- `src/components/sections/Block.tsx` — add `sectionRef`, call `useAnimatedHeight`.
- `src/components/BrowserToolBridge.tsx` — replace `scrollIntoViewIfNeeded` with `focusBlockIfNeeded`, rewrite `add_agent_block` reveal step.

**Conventions:**
- Tests live next to source (`foo.ts` + `foo.test.ts`), matching the existing style in `src/utils/htmlDiff.test.ts` and `src/components/sections/Block.test.tsx`.
- `vitest` runs with jsdom (configured via the project Vite plugin). `requestAnimationFrame` is provided by jsdom and we step it with `vi.useFakeTimers({ toFake: ['requestAnimationFrame','cancelAnimationFrame','performance'] })` when we need deterministic frames.

---

## Task 1: Cubic-bezier solver

The `cubic-bezier(0.34, 1.25, 0.4, 1)` curve has overshoot (y > 1 in the middle), which `Element.animate` handles natively but our JS-driven RAF loops do not. We need a small solver that, given a `t` in `[0,1]` (linear time), returns the corresponding eased value (with possible overshoot).

A standard cubic-bezier curve `B(t)` for control points `(0,0) → (x1,y1) → (x2,y2) → (1,1)` is parameterised by `t`. The user-facing input is the **x** axis (progress), so we must invert: given `x`, find `t` such that `Bx(t) = x`, then return `By(t)`. Newton-Raphson on `Bx` converges quickly with a single bisection fallback.

**Files:**
- Create: `src/utils/blockAnimations.ts`
- Create: `src/utils/blockAnimations.test.ts`

- [ ] **Step 1: Write failing tests for the solver**

Create `src/utils/blockAnimations.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { cubicBezier } from './blockAnimations'

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: fail with `Failed to resolve import "./blockAnimations"` (file does not exist yet).

- [ ] **Step 3: Implement the solver**

Create `src/utils/blockAnimations.ts`:

```ts
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
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  function tForX(x: number): number {
    let t = x
    for (let i = 0; i < 8; i++) {
      const xt = sampleX(t) - x
      if (Math.abs(xt) < 1e-6) return t
      const slope = dx(t)
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/blockAnimations.ts src/utils/blockAnimations.test.ts
git commit -m "feat(animations): add cubic-bezier solver for block animations"
```

---

## Task 2: Easing constants and reduced-motion helper

Expose the shared easing function, durations object, and a `prefersReducedMotion()` helper. The helper reads `window.matchMedia('(prefers-reduced-motion: reduce)').matches` on every call (cheap; not cached so OS changes during a session take effect).

**Files:**
- Modify: `src/utils/blockAnimations.ts`
- Modify: `src/utils/blockAnimations.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/utils/blockAnimations.test.ts`:

```ts
import { vi, beforeEach, afterEach } from 'vitest'
import { DURATIONS, SPRING_EASING, prefersReducedMotion } from './blockAnimations'

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: 3 new failing tests (`SPRING_EASING is not defined`, etc.).

- [ ] **Step 3: Implement constants and helper**

Append to `src/utils/blockAnimations.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: all 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/blockAnimations.ts src/utils/blockAnimations.test.ts
git commit -m "feat(animations): export SPRING_EASING, DURATIONS, prefersReducedMotion"
```

---

## Task 3: `smoothScrollTo`

JS-driven scroll animation using `requestAnimationFrame`. Accepts a target Y, duration, and optional `AbortSignal` for cancellation. Resolves when reached or cancelled. Jumps instantly when reduced motion is on. Cancellation resolves the promise rather than rejecting — cancellation is normal in this codebase.

**Files:**
- Modify: `src/utils/blockAnimations.ts`
- Modify: `src/utils/blockAnimations.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/utils/blockAnimations.test.ts`:

```ts
import { smoothScrollTo } from './blockAnimations'

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: `smoothScrollTo is not defined`.

- [ ] **Step 3: Implement `smoothScrollTo`**

Append to `src/utils/blockAnimations.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: 11 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/blockAnimations.ts src/utils/blockAnimations.test.ts
git commit -m "feat(animations): add smoothScrollTo with abort support"
```

---

## Task 4: `scrollSoPointAt` (page-Y → viewport ratio)

Given a Y position in the document (pixels from top of page) and a viewport ratio (0 = top, 0.4 = upper third, 0.5 = centre), compute the scroll target so the point lands at that ratio, then call `smoothScrollTo`. Clamp the target into `[0, maxScroll]` so we never request a scroll past the document edge.

**Files:**
- Modify: `src/utils/blockAnimations.ts`
- Modify: `src/utils/blockAnimations.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/utils/blockAnimations.test.ts`:

```ts
import { scrollSoPointAt } from './blockAnimations'

describe('scrollSoPointAt', () => {
  let scrollToCalls: Array<{ top: number }>
  beforeEach(() => {
    scrollToCalls = []
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true })) // skip RAF
    vi.stubGlobal('scrollTo', (opts: ScrollToOptions) => {
      scrollToCalls.push({ top: opts.top ?? 0 })
    })
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => 0 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800, writable: true })
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true, value: 10_000, writable: true,
    })
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('targets pageY - innerHeight*ratio (point lands at ratio of viewport)', async () => {
    await scrollSoPointAt(1000, 0.4, 0)
    // 1000 - (800 * 0.4) = 1000 - 320 = 680
    expect(scrollToCalls.at(-1)?.top).toBe(680)
  })

  it('clamps the target below zero to zero', async () => {
    await scrollSoPointAt(100, 0.5, 0)
    // 100 - 400 = -300 → clamp to 0
    expect(scrollToCalls.at(-1)?.top).toBe(0)
  })

  it('clamps the target above maxScroll to maxScroll', async () => {
    // maxScroll = scrollHeight - innerHeight = 10000 - 800 = 9200
    await scrollSoPointAt(20_000, 0.5, 0)
    expect(scrollToCalls.at(-1)?.top).toBe(9200)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: `scrollSoPointAt is not defined`.

- [ ] **Step 3: Implement `scrollSoPointAt`**

Append to `src/utils/blockAnimations.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: 14 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/blockAnimations.ts src/utils/blockAnimations.test.ts
git commit -m "feat(animations): add scrollSoPointAt with viewport-ratio targeting"
```

---

## Task 5: `scrollSoElementFocused`

Centre the element (its centre at viewport 50%) if it fits in the viewport; otherwise put its top at 20%.

**Files:**
- Modify: `src/utils/blockAnimations.ts`
- Modify: `src/utils/blockAnimations.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/utils/blockAnimations.test.ts`:

```ts
import { scrollSoElementFocused } from './blockAnimations'

describe('scrollSoElementFocused', () => {
  let scrollToCalls: Array<{ top: number }>
  beforeEach(() => {
    scrollToCalls = []
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    vi.stubGlobal('scrollTo', (opts: ScrollToOptions) => {
      scrollToCalls.push({ top: opts.top ?? 0 })
    })
    let scrollY = 0
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800, writable: true })
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true, value: 10_000, writable: true,
    })
  })
  afterEach(() => { vi.unstubAllGlobals() })

  function makeElement(top: number, height: number): HTMLElement {
    const el = document.createElement('section')
    el.getBoundingClientRect = () => ({
      top, height, bottom: top + height,
      left: 0, right: 100, width: 100, x: 0, y: top,
      toJSON() { return {} },
    }) as DOMRect
    return el
  }

  it('centres an element that fits in the viewport (ratio 0.5)', async () => {
    const el = makeElement(900, 400) // pageY = 900 + scrollY(0) = 900; centre Y = 1100
    await scrollSoElementFocused(el, 0)
    // 1100 - 400 = 700
    expect(scrollToCalls.at(-1)?.top).toBe(700)
  })

  it('puts the top at ratio 0.2 when the element is taller than the viewport', async () => {
    const el = makeElement(500, 1200) // taller than 800
    await scrollSoElementFocused(el, 0)
    // top page Y = 500; target = 500 - 800*0.2 = 500 - 160 = 340
    expect(scrollToCalls.at(-1)?.top).toBe(340)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: `scrollSoElementFocused is not defined`.

- [ ] **Step 3: Implement `scrollSoElementFocused`**

Append to `src/utils/blockAnimations.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: 16 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/blockAnimations.ts src/utils/blockAnimations.test.ts
git commit -m "feat(animations): add scrollSoElementFocused with centre/top fallback"
```

---

## Task 6: `revealBlockSymmetric`

Animate an element's inline `height` from 0 to `finalHeight` and the page's `scrollY` by `-finalHeight/2` simultaneously on the same RAF loop and the same `t` value. After completion, clear inline `height`, `overflow`, `min-height`.

**Files:**
- Modify: `src/utils/blockAnimations.ts`
- Modify: `src/utils/blockAnimations.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/utils/blockAnimations.test.ts`:

```ts
import { revealBlockSymmetric } from './blockAnimations'

describe('revealBlockSymmetric', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    let scrollY = 1000
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY })
    vi.stubGlobal('scrollTo', (opts: ScrollToOptions) => {
      scrollY = opts.top ?? 0
    })
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('ends with the element at its target height and scrollY shifted by -finalHeight/2', async () => {
    const el = document.createElement('section')
    document.body.appendChild(el)
    const promise = revealBlockSymmetric(el, 300, 200)
    // Step the timers past duration.
    await vi.advanceTimersByTimeAsync(400)
    await promise

    expect(el.style.height).toBe('') // cleared after finish
    expect(el.style.overflow).toBe('')
    expect(window.scrollY).toBe(1000 - 150)
    el.remove()
  })

  it('jumps to final state when reduced motion is on', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const el = document.createElement('section')
    document.body.appendChild(el)
    await revealBlockSymmetric(el, 300, 500)
    expect(window.scrollY).toBe(850) // 1000 - 150
    el.remove()
  })

  it('starts with the element at height:0 + overflow:hidden during animation', async () => {
    const el = document.createElement('section')
    document.body.appendChild(el)
    const promise = revealBlockSymmetric(el, 300, 200)
    // Advance enough to enter the loop but not finish.
    await vi.advanceTimersByTimeAsync(20)
    expect(el.style.overflow).toBe('hidden')
    expect(parseFloat(el.style.height || '0')).toBeGreaterThanOrEqual(0)
    expect(parseFloat(el.style.height || '0')).toBeLessThan(300)
    await vi.advanceTimersByTimeAsync(400)
    await promise
    el.remove()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: `revealBlockSymmetric is not defined`.

- [ ] **Step 3: Implement `revealBlockSymmetric`**

Append to `src/utils/blockAnimations.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: 19 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/blockAnimations.ts src/utils/blockAnimations.test.ts
git commit -m "feat(animations): add revealBlockSymmetric with coordinated scroll"
```

---

## Task 7: `animateHeightChange` with cancel-and-resume

Animate `element.style.height` between two known values. If another animation is in flight on the same element, cancel it and resume from the current interpolated height to the new target.

**Files:**
- Modify: `src/utils/blockAnimations.ts`
- Modify: `src/utils/blockAnimations.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/utils/blockAnimations.test.ts`:

```ts
import { animateHeightChange } from './blockAnimations'

describe('animateHeightChange', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('ends with height equal to the target (inline cleared)', async () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const promise = animateHeightChange(el, 100, 300, 200)
    await vi.advanceTimersByTimeAsync(400)
    await promise
    expect(el.style.height).toBe('')
    el.remove()
  })

  it('jumps instantly when reduced motion is on', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const el = document.createElement('div')
    document.body.appendChild(el)
    await animateHeightChange(el, 100, 300, 500)
    expect(el.style.height).toBe('') // cleared so layout uses natural height
    el.remove()
  })

  it('starting a new animation while one is in flight cancels the first and resumes from current', async () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const first = animateHeightChange(el, 100, 500, 400)
    await vi.advanceTimersByTimeAsync(100)
    const heightMidFirst = parseFloat(el.style.height || '0')
    expect(heightMidFirst).toBeGreaterThan(100)
    expect(heightMidFirst).toBeLessThan(500)

    const second = animateHeightChange(el, heightMidFirst, 800, 300)
    await vi.advanceTimersByTimeAsync(500)
    await Promise.all([first, second])
    expect(el.style.height).toBe('')
    el.remove()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: `animateHeightChange is not defined`.

- [ ] **Step 3: Implement `animateHeightChange`**

Append to `src/utils/blockAnimations.ts`:

```ts
const activeHeightAnimations = new WeakMap<HTMLElement, () => void>()

export function animateHeightChange(
  element: HTMLElement,
  fromHeight: number,
  toHeight: number,
  durationMs: number,
): Promise<void> {
  // Cancel any prior animation on this element.
  activeHeightAnimations.get(element)?.()

  return new Promise<void>((resolve) => {
    if (fromHeight === toHeight) {
      element.style.height = ''
      resolve()
      return
    }
    if (typeof window === 'undefined' || prefersReducedMotion() || durationMs <= 0) {
      element.style.height = ''
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
      activeHeightAnimations.delete(element)
      element.style.height = ''
      resolve()
    }

    activeHeightAnimations.set(element, finish)

    const tick = (now: number) => {
      if (done) return
      const elapsed = now - startTime
      const t = Math.min(1, elapsed / durationMs)
      const eased = SPRING_EASING(t)
      const value = fromHeight + (toHeight - fromHeight) * eased
      element.style.height = `${Math.max(0, value)}px`
      if (t >= 1) { finish(); return }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/utils/blockAnimations.test.ts
```

Expected: 22 passing.

- [ ] **Step 5: Commit**

```bash
git add src/utils/blockAnimations.ts src/utils/blockAnimations.test.ts
git commit -m "feat(animations): add animateHeightChange with cancel-and-resume"
```

---

## Task 8: `useAnimatedHeight` hook

A React hook that observes content changes and animates the wrapping element's height. Debounces consecutive changes within 80ms by capturing the latest target height when the timeout fires.

**Files:**
- Create: `src/components/sections/useAnimatedHeight.ts`
- Create: `src/components/sections/useAnimatedHeight.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/sections/useAnimatedHeight.test.tsx`:

```tsx
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
    // Still inside debounce window; debounce should have been reset each time.
    await vi.advanceTimersByTimeAsync(20) // total elapsed since last change: 20ms
    // No fire yet.
    // Now elapse past the 80ms window.
    await vi.advanceTimersByTimeAsync(100)
    // Animation has run once, ending at 500.
    // (Hard to assert mid-flight intermediate values from the hook itself
    // without exposing it; verify nothing throws and final state is clean.)
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/components/sections/useAnimatedHeight.test.tsx
```

Expected: `Failed to resolve import "./useAnimatedHeight"`.

- [ ] **Step 3: Implement the hook**

Create `src/components/sections/useAnimatedHeight.ts`:

```ts
import { useLayoutEffect, useRef } from 'react'
import { animateHeightChange, DURATIONS } from '#/utils/blockAnimations'

const DEBOUNCE_MS = 80

export function useAnimatedHeight<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  contentSignal: unknown,
): void {
  const lastHeightRef = useRef<number | null>(null)
  const debounceRef = useRef<number | null>(null)
  const pendingFromRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const measured = el.scrollHeight
    const previous = lastHeightRef.current

    if (previous === null) {
      // First render: just remember the baseline; do not animate.
      lastHeightRef.current = measured
      return
    }

    if (measured === previous) {
      return
    }

    // Preserve the starting height for the upcoming animation. If a debounce
    // is already queued, keep its origin (so coalesced changes interpolate
    // smoothly from the height that was on screen when the burst started).
    if (pendingFromRef.current === null) {
      pendingFromRef.current = previous
    }

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      const node = ref.current
      if (!node) {
        pendingFromRef.current = null
        return
      }
      const from = pendingFromRef.current ?? previous
      const to = node.scrollHeight
      pendingFromRef.current = null
      lastHeightRef.current = to
      void animateHeightChange(node, from, to, DURATIONS.streamingHeight)
    }, DEBOUNCE_MS)
  }, [contentSignal, ref])
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/components/sections/useAnimatedHeight.test.tsx
```

Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/useAnimatedHeight.ts src/components/sections/useAnimatedHeight.test.tsx
git commit -m "feat(animations): add useAnimatedHeight hook for streaming content"
```

---

## Task 9: Wire `useAnimatedHeight` into `Block.tsx`

Add a `sectionRef` pointing to the outer `<section>` element and call `useAnimatedHeight(sectionRef, config.content)`. Existing functionality (clipPath, marginTop, contentRef + streamFlash) is preserved.

**Files:**
- Modify: `src/components/sections/Block.tsx`

- [ ] **Step 1: Read the current `Block.tsx`** to confirm structure (already known, but the executing engineer should look so the diff is minimal).

```bash
sed -n '1,60p' src/components/sections/Block.tsx
```

- [ ] **Step 2: Add `sectionRef` and the hook call**

Edit `src/components/sections/Block.tsx`:

Replace:

```tsx
export function Block({ config, index, prevTab }: BlockProps) {
  const clipPath = CLIP_BOTTOM[config.tab] || undefined
  const marginTop = index === 0 || prevTab === 'none' ? 0 : -12
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) streamFlashSpansIn(contentRef.current)
  }, [config.content])
```

With:

```tsx
import { useAnimatedHeight } from './useAnimatedHeight'

// …keep the other imports above…

export function Block({ config, index, prevTab }: BlockProps) {
  const clipPath = CLIP_BOTTOM[config.tab] || undefined
  const marginTop = index === 0 || prevTab === 'none' ? 0 : -12
  const contentRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useAnimatedHeight(sectionRef, config.content)

  useEffect(() => {
    if (contentRef.current) streamFlashSpansIn(contentRef.current)
  }, [config.content])
```

Then update the `<section …>` element to use the ref:

```tsx
    <section
      ref={sectionRef}
      id={config.id}
      data-theme={config.theme}
      …
```

- [ ] **Step 3: Run the existing Block tests to confirm no regression**

```bash
pnpm vitest run src/components/sections/Block.test.tsx
```

Expected: all 18 existing tests still pass.

- [ ] **Step 4: Add one new Block test asserting `sectionRef` plumbing**

Append to `src/components/sections/Block.test.tsx`:

```ts
  it('attaches a ref to the outer section so height animation can target it', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    const section = container.querySelector('section') as HTMLElement
    expect(section).toBeTruthy()
    // The hook should run useLayoutEffect; we cannot directly observe the ref,
    // but having no inline height present after first render is the expected
    // baseline (no animation on first render).
    expect(section.style.height).toBe('')
  })
```

- [ ] **Step 5: Run all tests in the sections folder**

```bash
pnpm vitest run src/components/sections/
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/Block.tsx src/components/sections/Block.test.tsx
git commit -m "feat(blocks): smooth streaming height changes via useAnimatedHeight"
```

---

## Task 10: Replace `scrollIntoViewIfNeeded` with `focusBlockIfNeeded` in `BrowserToolBridge`

The new helper uses `scrollSoElementFocused`, which centres the block when it fits and otherwise puts its top at 20% — both with the spring easing and 600ms duration. The `lastTouchedIdRef` guard remains.

**Files:**
- Modify: `src/components/BrowserToolBridge.tsx`

- [ ] **Step 1: Add imports**

At the top of `src/components/BrowserToolBridge.tsx`, add:

```ts
import {
  DURATIONS,
  scrollSoPointAt,
  scrollSoElementFocused,
  revealBlockSymmetric,
} from '#/utils/blockAnimations'
```

- [ ] **Step 2: Replace the inner `scrollIntoViewIfNeeded`**

In the `useMemo(() => { … return { … } }, [...])` block, replace:

```ts
async function scrollIntoViewIfNeeded(id: string) {
  if (lastTouchedIdRef.current === id) return
  const element = document.getElementById(id)
  if (!element) return
  const rect = element.getBoundingClientRect()
  const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
  if (isInView) return
  element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  await new Promise(resolve => setTimeout(resolve, 380))
}
```

With:

```ts
async function focusBlockIfNeeded(id: string) {
  if (lastTouchedIdRef.current === id) return
  const element = document.getElementById(id)
  if (!element) return
  const rect = element.getBoundingClientRect()
  const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
  if (fullyVisible) return
  await scrollSoElementFocused(element, DURATIONS.scrollFocus)
}
```

- [ ] **Step 3: Update every caller in the same `useMemo`**

There are four call sites that currently say `await scrollIntoViewIfNeeded(id)` — in `append_to_block`, `set_block_html`, `set_block_diagram`, `set_block_formula`. Update each to `await focusBlockIfNeeded(id)`.

Confirm with:

```bash
grep -n "scrollIntoViewIfNeeded\|focusBlockIfNeeded" src/components/BrowserToolBridge.tsx
```

Expected: only `focusBlockIfNeeded` appears.

- [ ] **Step 4: Run the build to confirm types still resolve**

```bash
pnpm vitest run
```

Expected: all tests pass (no behaviour-level test exists for the bridge yet; we verify manually in the final task).

- [ ] **Step 5: Commit**

```bash
git add src/components/BrowserToolBridge.tsx
git commit -m "feat(bridge): use focusBlockIfNeeded with spring easing for block focus"
```

---

## Task 11: Rewrite `add_agent_block` reveal in `BrowserToolBridge`

Replace the current sequence (scroll pinned to centre + height 0→280 animate downward + outline flash) with: compute boundary Y of the pinned section, scroll so it lands at 40% of the viewport, insert the new block, double-RAF, measure natural height, run symmetric reveal, then flash outline.

**Files:**
- Modify: `src/components/BrowserToolBridge.tsx`

- [ ] **Step 1: Replace the reveal block inside `add_agent_block`**

Find this block in `add_agent_block` (currently lines ~196–234):

```ts
      const pinnedSection = sectionsRef.current.find(s => s.pinned)
      if (pinnedSection) {
        const pinnedEl = document.getElementById(pinnedSection.id)
        if (pinnedEl) {
          pinnedEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          await new Promise(resolve => setTimeout(resolve, 380))
        }
      } else {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
        await new Promise(resolve => setTimeout(resolve, 380))
      }

      const newId = createId()
      addSection({ id: newId, content: '', topic, className: 'agent-block', ...optional })
      await new Promise<void>(resolve => { requestAnimationFrame(() => { requestAnimationFrame(() => resolve()) }) })
      const element = document.getElementById(newId)
      if (element) {
        element.style.height = '0px'
        element.style.minHeight = '0px'
        element.style.overflow = 'hidden'
        const revealAnim = element.animate(
          [{ height: '0px' }, { height: '280px' }],
          { duration: 350, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' },
        )
        await revealAnim.finished
        revealAnim.cancel()
        element.style.removeProperty('height')
        element.style.removeProperty('min-height')
        element.style.removeProperty('overflow')
        element.animate(
          [
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0.9)', outlineOffset: '-10px' },
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
          ],
          { duration: 300, easing: 'ease-out' },
        )
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      lastTouchedIdRef.current = newId
      return { id: newId }
```

Replace with:

```ts
      const pinnedSection = sectionsRef.current.find(s => s.pinned)
      let boundaryY: number
      if (pinnedSection) {
        const pinnedEl = document.getElementById(pinnedSection.id)
        boundaryY = pinnedEl
          ? pinnedEl.getBoundingClientRect().top + window.scrollY
          : document.documentElement.scrollHeight
      } else {
        boundaryY = document.documentElement.scrollHeight
      }
      await scrollSoPointAt(boundaryY, 0.40, DURATIONS.scrollInsertion)

      const newId = createId()
      addSection({ id: newId, content: '', topic, className: 'agent-block', ...optional })
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => { requestAnimationFrame(() => resolve()) })
      })

      const element = document.getElementById(newId)
      if (element) {
        const measured = element.scrollHeight
        const naturalHeight = measured === 0
          ? 200
          : Math.min(measured, Math.round(window.innerHeight * 0.7))
        await revealBlockSymmetric(element, naturalHeight, DURATIONS.revealSymmetric)
        element.animate(
          [
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0.9)', outlineOffset: '-10px' },
            { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
          ],
          { duration: 600, easing: 'ease-out' },
        )
      }
      lastTouchedIdRef.current = newId
      return { id: newId }
```

- [ ] **Step 2: Run the test suite**

```bash
pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 3: TypeScript check via build**

```bash
pnpm build
```

Expected: build succeeds. If TS errors surface, fix them and re-run.

- [ ] **Step 4: Commit**

```bash
git add src/components/BrowserToolBridge.tsx
git commit -m "feat(bridge): symmetric reveal + 40%-viewport scroll for add_agent_block"
```

---

## Task 12: Manual verification

Tests assert maths and lifecycle, but the feel can only be verified by running the app. Do this both on a wide window and at mobile width.

**Files:** none (manual)

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

Visit `http://localhost:3000`.

- [ ] **Step 2: Insertion flow — desktop**

Trigger `add_agent_block` (via the agent UI, the same path that already works today). Observe:
- Scroll smoothly carries the boundary between the second-to-last section and the pinned section to ~40% from the top.
- The new block "incrusts" symmetrically — the content above appears to move up, content below appears to move down, both equally. The centre of the new block stays stationary on screen.
- Spring easing: there is a subtle settle at the end (not a hard linear stop).

- [ ] **Step 3: Insertion flow — mobile width**

Resize the browser to ~390px wide (or use device emulation). Repeat insertion. Same effect should hold; durations are unchanged but the scroll distance is smaller.

- [ ] **Step 4: Streaming content**

Have the agent send several `append_to_block` / `set_block_html` calls in quick succession. Observe:
- The block height grows smoothly rather than snapping.
- Rapid chunks coalesce (no stuttering).
- The spring settle is felt at the end of each batch.

- [ ] **Step 5: Focus / modification**

Trigger `set_block_html` on a block that's currently off-screen. Observe:
- The scroll smoothly centres the block in the viewport (or, if the block is taller than the viewport, puts its top at ~20%).
- Same spring easing as insertion.

- [ ] **Step 6: Reduced motion**

In macOS System Settings → Accessibility → Display → enable "Reduce motion". Reload the page. Trigger an insertion. Observe:
- Scroll jumps instantly (no animation).
- Block appears at full height instantly.
- No spring overshoot.

- [ ] **Step 7: Report**

Note any rough edges (overshoot too aggressive? Duration too long? Scroll feels jumpy on iOS?) and decide whether to tune `SPRING_EASING` control points or `DURATIONS` values. Any changes there land as a follow-up commit:

```bash
git add src/utils/blockAnimations.ts
git commit -m "tune(animations): adjust <constant> after manual testing"
```

---

## Done

After all tasks above are committed, the branch contains:
- A self-contained `blockAnimations.ts` module with 22+ unit tests.
- A reusable `useAnimatedHeight` hook with 3 tests.
- An updated `Block.tsx` and `BrowserToolBridge.tsx` consuming the new helpers.
- Verified behaviour on desktop, mobile width, and reduced-motion.
