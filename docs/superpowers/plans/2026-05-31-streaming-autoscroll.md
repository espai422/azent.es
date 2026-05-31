# Streaming Autoscroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chat-style sticky autoscroll that follows the active block's bottom toward 90 % of viewport while the LLM streams content, with opt-out when the user scrolls > 150 px from the last commanded position.

**Architecture:** New module `src/utils/streamingAutoscroll.ts` holds a module-level state machine (`idle` / `engaged` / `optedOut`) with a `requestAnimationFrame` loop that runs only while engaged. `BrowserToolBridge.tsx` calls `engageStreamingAutoscroll(blockId)` from every tool that mutates content. No React changes — the controller reads the DOM imperatively.

**Tech Stack:** TypeScript, Vitest + happy-dom (matches `blockAnimations.test.ts`), React 19. No new dependencies.

**Reference:** spec at `docs/superpowers/specs/2026-05-31-streaming-autoscroll-design.md`.

---

## Task 1: Module skeleton + idle/engage basic transition

Create the module with its public API, internal state, constants, and the `engage` transition from `idle` → `engaged` (and `disengage`).
**No rAF loop yet, no scroll listener yet, no tick math yet** — those come in later tasks.

**Files:**
- Create: `src/utils/streamingAutoscroll.ts`
- Create: `src/utils/streamingAutoscroll.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/streamingAutoscroll.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: FAIL (module does not exist yet).

- [ ] **Step 3: Implement the minimal module**

Create `src/utils/streamingAutoscroll.ts`:

```ts
import { prefersReducedMotion } from './blockAnimations'

const TARGET_VIEWPORT_RATIO = 0.9
const OPT_OUT_PX = 150
const IDLE_MS = 1500
const FOLLOW_LERP = 0.25

type State =
  | { kind: 'idle' }
  | { kind: 'engaged'; blockId: string; lastTouchAt: number; lastScrollY: number; rafId: number }
  | { kind: 'optedOut'; blockId: string }

let state: State = { kind: 'idle' }
let suppressed = false

function onScroll(): void {
  // Implemented in Task 5.
}

function tick(): void {
  // Implemented in Task 2.
}

function setIdle(): void {
  if (state.kind === 'engaged') {
    window.cancelAnimationFrame(state.rafId)
  }
  window.removeEventListener('scroll', onScroll)
  state = { kind: 'idle' }
}

export function engageStreamingAutoscroll(blockId: string): void {
  if (typeof window === 'undefined') return
  if (prefersReducedMotion()) return

  if (state.kind === 'idle') {
    window.addEventListener('scroll', onScroll, { passive: true })
    const rafId = window.requestAnimationFrame(tick)
    state = {
      kind: 'engaged',
      blockId,
      lastTouchAt: performance.now(),
      lastScrollY: window.scrollY,
      rafId,
    }
    return
  }

  // engaged / optedOut transitions handled in later tasks.
}

export function disengageStreamingAutoscroll(): void {
  setIdle()
}

// Test-only escape hatch — do not use in production code.
export function _getStateForTests(): State {
  return state
}

// Silence unused-import linter until Task 2/4 wires them in.
void TARGET_VIEWPORT_RATIO
void OPT_OUT_PX
void IDLE_MS
void FOLLOW_LERP
void suppressed
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/streamingAutoscroll.ts src/utils/streamingAutoscroll.test.ts
git commit -m "feat(autoscroll): module skeleton with idle ↔ engaged transitions"
```

---

## Task 2: rAF tick math — scroll lerp + suppressed flag

Implement the per-frame loop body that measures the active block's bottom and scrolls toward 90 % of viewport with a lerp of 0.25.

**Files:**
- Modify: `src/utils/streamingAutoscroll.ts` (replace the empty `tick` stub)
- Modify: `src/utils/streamingAutoscroll.test.ts` (add new `describe` block)

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/streamingAutoscroll.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: FAIL — the empty `tick` does not scroll or transition.

- [ ] **Step 3: Implement the tick body**

In `src/utils/streamingAutoscroll.ts`, replace the empty `tick` function and remove the `void TARGET_VIEWPORT_RATIO / FOLLOW_LERP / suppressed` lint-silence lines:

```ts
function tick(): void {
  if (state.kind !== 'engaged') return

  const el = document.getElementById(state.blockId)
  if (!el) { setIdle(); return }

  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  if (vh > 0) {
    const targetBottomY = vh * TARGET_VIEWPORT_RATIO
    const overflow = rect.bottom - targetBottomY
    if (overflow > 0) {
      const newScrollY = window.scrollY + overflow * FOLLOW_LERP
      state.lastScrollY = newScrollY
      suppressed = true
      window.scrollTo({ top: newScrollY, behavior: 'auto' })
    }
  }

  state.rafId = window.requestAnimationFrame(tick)
}
```

Also keep these `void` lines for now (still unused until Task 4 + Task 5):

```ts
void OPT_OUT_PX
void IDLE_MS
```

(Remove `void TARGET_VIEWPORT_RATIO`, `void FOLLOW_LERP`, `void suppressed`.)

- [ ] **Step 4: Run the tests, verify they pass**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: all tests (from Tasks 1 + 2) pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/streamingAutoscroll.ts src/utils/streamingAutoscroll.test.ts
git commit -m "feat(autoscroll): rAF tick follows block bottom with 0.25 lerp"
```

---

## Task 3: Idle timeout — exit engaged after 1500 ms without engage()

Add the idle-detection branch inside `tick`. Each frame checks `performance.now() - lastTouchAt`.

**Files:**
- Modify: `src/utils/streamingAutoscroll.ts`
- Modify: `src/utils/streamingAutoscroll.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/streamingAutoscroll.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: the first idle test fails (still engaged after 1600 ms) and the refresh test fails (`engage` is currently a no-op when already engaged).

- [ ] **Step 3: Implement idle check + refresh on repeat engage**

In `src/utils/streamingAutoscroll.ts`, add the idle check to `tick` (before scheduling the next frame) and implement the engaged-repeat branch in `engageStreamingAutoscroll`. Remove `void IDLE_MS`.

Updated `tick`:

```ts
function tick(): void {
  if (state.kind !== 'engaged') return

  const el = document.getElementById(state.blockId)
  if (!el) { setIdle(); return }

  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  if (vh > 0) {
    const targetBottomY = vh * TARGET_VIEWPORT_RATIO
    const overflow = rect.bottom - targetBottomY
    if (overflow > 0) {
      const newScrollY = window.scrollY + overflow * FOLLOW_LERP
      state.lastScrollY = newScrollY
      suppressed = true
      window.scrollTo({ top: newScrollY, behavior: 'auto' })
    }
  }

  if (performance.now() - state.lastTouchAt > IDLE_MS) { setIdle(); return }

  state.rafId = window.requestAnimationFrame(tick)
}
```

Updated `engageStreamingAutoscroll`:

```ts
export function engageStreamingAutoscroll(blockId: string): void {
  if (typeof window === 'undefined') return
  if (prefersReducedMotion()) return

  if (state.kind === 'idle') {
    window.addEventListener('scroll', onScroll, { passive: true })
    const rafId = window.requestAnimationFrame(tick)
    state = {
      kind: 'engaged',
      blockId,
      lastTouchAt: performance.now(),
      lastScrollY: window.scrollY,
      rafId,
    }
    return
  }

  if (state.kind === 'engaged') {
    state.lastTouchAt = performance.now()
    if (state.blockId !== blockId) state.blockId = blockId
    return
  }

  // optedOut handled in Task 6.
}
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/streamingAutoscroll.ts src/utils/streamingAutoscroll.test.ts
git commit -m "feat(autoscroll): idle timeout after 1500 ms + refresh on repeat engage"
```

---

## Task 4: Scroll listener — user opt-out detection

Implement `onScroll` to detect user-initiated scrolls (using the `suppressed` flag set by `tick`) and transition to `optedOut` when `|scrollY - lastScrollY| > OPT_OUT_PX`.

**Files:**
- Modify: `src/utils/streamingAutoscroll.ts`
- Modify: `src/utils/streamingAutoscroll.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/streamingAutoscroll.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: opt-out tests fail (the empty `onScroll` does nothing).

- [ ] **Step 3: Implement `onScroll`**

In `src/utils/streamingAutoscroll.ts`, replace `onScroll`. Remove `void OPT_OUT_PX`.

```ts
function onScroll(): void {
  if (state.kind !== 'engaged') return
  if (suppressed) { suppressed = false; return }
  if (Math.abs(window.scrollY - state.lastScrollY) > OPT_OUT_PX) {
    window.cancelAnimationFrame(state.rafId)
    window.removeEventListener('scroll', onScroll)
    state = { kind: 'optedOut', blockId: state.blockId }
  }
}
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/streamingAutoscroll.ts src/utils/streamingAutoscroll.test.ts
git commit -m "feat(autoscroll): detect user opt-out beyond 150 px from last commanded scroll"
```

---

## Task 5: `optedOut` transitions — re-engage only on a different block

While `optedOut`, calling `engage(sameId)` is a no-op; calling `engage(otherId)` re-engages on the new block.

**Files:**
- Modify: `src/utils/streamingAutoscroll.ts`
- Modify: `src/utils/streamingAutoscroll.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/utils/streamingAutoscroll.test.ts`:

```ts
describe('streamingAutoscroll — optedOut transitions', () => {
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
    vi.stubGlobal('scrollTo', (opts: ScrollToOptions) => { currentScrollY = opts.top ?? 0 })
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => currentScrollY })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000, writable: true })
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

  function forceOptOut(blockId: string) {
    makeBlock(blockId, 500)
    engageStreamingAutoscroll(blockId)
    currentScrollY = 300 // > OPT_OUT_PX from lastScrollY=0
    scrollListener?.(new Event('scroll'))
  }

  it('engage(sameId) while optedOut stays optedOut', () => {
    forceOptOut('block-a')
    engageStreamingAutoscroll('block-a')
    expect(_getStateForTests().kind).toBe('optedOut')
  })

  it('engage(differentId) while optedOut re-engages on the new block', () => {
    forceOptOut('block-a')
    makeBlock('block-b', 500)
    engageStreamingAutoscroll('block-b')
    const s = _getStateForTests()
    expect(s.kind).toBe('engaged')
    if (s.kind === 'engaged') expect(s.blockId).toBe('block-b')
  })
})
```

- [ ] **Step 2: Run the tests, verify they fail**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: `engage(differentId)` test fails (`engage` from `optedOut` is currently a no-op).

- [ ] **Step 3: Implement the optedOut branch**

In `src/utils/streamingAutoscroll.ts`, expand `engageStreamingAutoscroll`:

```ts
export function engageStreamingAutoscroll(blockId: string): void {
  if (typeof window === 'undefined') return
  if (prefersReducedMotion()) return

  if (state.kind === 'idle') {
    window.addEventListener('scroll', onScroll, { passive: true })
    const rafId = window.requestAnimationFrame(tick)
    state = {
      kind: 'engaged',
      blockId,
      lastTouchAt: performance.now(),
      lastScrollY: window.scrollY,
      rafId,
    }
    return
  }

  if (state.kind === 'engaged') {
    state.lastTouchAt = performance.now()
    if (state.blockId !== blockId) state.blockId = blockId
    return
  }

  // optedOut: only re-engage if the user moved on to a different block.
  if (state.blockId === blockId) return
  window.addEventListener('scroll', onScroll, { passive: true })
  const rafId = window.requestAnimationFrame(tick)
  state = {
    kind: 'engaged',
    blockId,
    lastTouchAt: performance.now(),
    lastScrollY: window.scrollY,
    rafId,
  }
}
```

- [ ] **Step 4: Run the tests, verify they pass**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/streamingAutoscroll.ts src/utils/streamingAutoscroll.test.ts
git commit -m "feat(autoscroll): re-engage from optedOut only when block changes"
```

---

## Task 6: Reduced motion — `engage` is a no-op

Already partially implemented in Task 1 (the early `return` for `prefersReducedMotion()`). Add an explicit test to lock the behavior in.

**Files:**
- Modify: `src/utils/streamingAutoscroll.test.ts`

- [ ] **Step 1: Write the test**

Append to `src/utils/streamingAutoscroll.test.ts`:

```ts
describe('streamingAutoscroll — reduced motion', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    disengageStreamingAutoscroll()
  })
  afterEach(() => {
    disengageStreamingAutoscroll()
    vi.unstubAllGlobals()
  })

  it('engage is a no-op when prefers-reduced-motion is set', () => {
    engageStreamingAutoscroll('block-a')
    expect(_getStateForTests().kind).toBe('idle')
    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test, verify it passes**

```bash
pnpm vitest run src/utils/streamingAutoscroll.test.ts
```

Expected: PASS — the guard from Task 1 already covers this. (If it fails, the guard was lost during refactors — re-add `if (prefersReducedMotion()) return` at the top of `engageStreamingAutoscroll`.)

- [ ] **Step 3: Commit**

```bash
git add src/utils/streamingAutoscroll.test.ts
git commit -m "test(autoscroll): lock reduced-motion no-op behavior"
```

---

## Task 7: Wire `engageStreamingAutoscroll` into `BrowserToolBridge`

Call `engageStreamingAutoscroll(id)` from every content-mutating tool, **after** `updateSection`, **after** `revealBlockSymmetric` in `add_agent_block`.

**Files:**
- Modify: `src/components/BrowserToolBridge.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/components/BrowserToolBridge.tsx`, add to the existing `blockAnimations` import block:

```tsx
import { engageStreamingAutoscroll } from '#/utils/streamingAutoscroll'
```

- [ ] **Step 2: Call `engage` in `add_agent_block`**

In `src/components/BrowserToolBridge.tsx`, after the existing `element.animate(...)` outline flash in `add_agent_block` (i.e., after `revealBlockSymmetric` and its outline animation), and before `lastTouchedIdRef.current = newId`:

Replace the existing block:

```tsx
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

with:

```tsx
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
      engageStreamingAutoscroll(newId)
      return { id: newId }
```

- [ ] **Step 3: Call `engage` in `append_to_block`**

In `src/components/BrowserToolBridge.tsx`, replace the existing `append_to_block` end:

```tsx
      await focusBlockIfNeeded(id)
      const existing = stripFlashSpans(section.content)
      const appended = wrapAllTextAsFlash(html)
      updateSection(id, { content: existing + appended })
      lastTouchedIdRef.current = id
      return { id }
```

with:

```tsx
      await focusBlockIfNeeded(id)
      const existing = stripFlashSpans(section.content)
      const appended = wrapAllTextAsFlash(html)
      updateSection(id, { content: existing + appended })
      lastTouchedIdRef.current = id
      engageStreamingAutoscroll(id)
      return { id }
```

- [ ] **Step 4: Call `engage` in `set_block_html`**

Replace the existing `set_block_html` end:

```tsx
      lastTouchedIdRef.current = id
      return { id, updated: true }
```

(at the end of the `set_block_html` body, right after the outline-flash `setTimeout`) with:

```tsx
      lastTouchedIdRef.current = id
      engageStreamingAutoscroll(id)
      return { id, updated: true }
```

- [ ] **Step 5: Call `engage` in `set_block_diagram` and `set_block_formula`**

Both tools end with `lastTouchedIdRef.current = id` followed by `return { id, updated: true }`. Add `engageStreamingAutoscroll(id)` between them, identical to Step 4. There are two occurrences — update both.

- [ ] **Step 6: Type-check and run the full test suite**

```bash
pnpm vitest run
```

Expected: all tests pass, no TypeScript errors.

- [ ] **Step 7: Manual smoke test**

```bash
pnpm dev
```

Open `http://localhost:3000`. Drive the agent through a streaming session (multiple `append_to_block` calls into one block). Verify:

- The active block's bottom hovers around 90 % of the viewport as it grows.
- Scrolling up by more than ~150 px halts the autoscroll for that block.
- After opt-out, asking the agent to create a new block (calling `add_agent_block`) re-arms autoscroll on the new block.
- macOS reduced motion (System Settings → Accessibility → Display → Reduce motion): autoscroll never moves the page during streaming.

- [ ] **Step 8: Commit**

```bash
git add src/components/BrowserToolBridge.tsx
git commit -m "feat(bridge): engage streaming autoscroll on every content-mutating tool"
```
