# Block insertion & focus animations — design

## Context

When the LLM agent calls `add_agent_block`, a new section is inserted into the page just before the pinned closing block. The current implementation in `src/components/BrowserToolBridge.tsx` does two things that we want to upgrade:

1. **Scroll** — uses `scrollIntoView({block:'center'})` on the pinned block, which puts the wrong anchor (the pinned block itself) at the viewport center, not the boundary where the new block will appear.
2. **Reveal** — animates `height: 0px → 280px` only downward, with a generic `cubic-bezier(0.2, 0, 0, 1)` easing, pushing content below by 280px while content above stays put.

We also want to upgrade the **focus scroll** of `append_to_block`, `set_block_html`, `set_block_diagram`, `set_block_formula` (currently `scrollIntoView({block:'start'})`), and to **smooth the height growth** that happens when the LLM streams content into an existing block (currently instant layout shift).

## Goals

- Insertion: scroll so the **boundary between the penultimate non-pinned section and the pinned section** sits at ~40% from the top of the viewport.
- Reveal: the new block grows from height 0 to its natural height, with the visual sensation of expanding from its centre — content above appears to move up, content below appears to move down, both equally.
- Focus scroll for existing-block modifications: centre the block (50%) if it fits, else top at 20%.
- Streaming content: heights animate smoothly between values rather than snapping.
- Easings: spring-like (`cubic-bezier(0.34, 1.25, 0.4, 1)`), reused across all four behaviours so the feel is coherent.
- Respect `prefers-reduced-motion`.

Out of scope: changing the order in which blocks are inserted, theme transitions, diagram-internal animations.

## Architecture

A single new module `src/utils/blockAnimations.ts` holds the animation primitives. `BrowserToolBridge.tsx` consumes them in `add_agent_block` and replaces `scrollIntoViewIfNeeded` with the new focus helper. `Block.tsx` gains a height-smoothing hook for streaming content.

Keeping animation logic out of the React components makes the math easy to reason about and lets us share easings/durations from one place.

### `src/utils/blockAnimations.ts`

Exports:

```ts
export const SPRING_EASING = 'cubic-bezier(0.34, 1.25, 0.4, 1)'

export const DURATIONS = {
  scrollInsertion: 600,
  scrollFocus: 600,
  revealSymmetric: 500,
  streamingHeight: 250,
}

// Smooth programmatic scroll with arbitrary easing.
// Resolves when the target Y is reached (or the animation is cancelled).
export function smoothScrollTo(
  targetY: number,
  durationMs: number,
  signal?: AbortSignal,
): Promise<void>

// Scroll so the given page-Y position lands at viewportRatio of the visible height.
// viewportRatio: 0 = top, 0.5 = centre, 1 = bottom. 0.4 used for insertion.
export function scrollSoPointAt(
  pageY: number,
  viewportRatio: number,
  durationMs: number,
  signal?: AbortSignal,
): Promise<void>

// Focus an existing element. If element fits in viewport, centre it (ratio 0.5).
// Otherwise, scroll its top to ratio 0.2.
export function scrollSoElementFocused(
  element: HTMLElement,
  durationMs: number,
  signal?: AbortSignal,
): Promise<void>

// Symmetric reveal: animate height 0 → finalHeight AND scrollY -= finalHeight/2
// simultaneously with the same easing/duration, so the block expands from its
// optical centre.
export function revealBlockSymmetric(
  element: HTMLElement,
  finalHeight: number,
  durationMs: number,
): Promise<void>

// Animate height between two known values. Cancels an in-flight animation on
// the same element and resumes from the current interpolated height.
export function animateHeightChange(
  element: HTMLElement,
  fromHeight: number,
  toHeight: number,
  durationMs: number,
): Promise<void>
```

Implementation notes:

- `smoothScrollTo` uses `requestAnimationFrame` with manual interpolation (cannot rely on `scrollTo({behavior:'smooth'})` because browsers ignore the custom easing requested).
- The easing function in JS is the JS form of `cubic-bezier(0.34, 1.25, 0.4, 1)` — we implement a small cubic-bezier solver (Newton-Raphson over the X axis, then Y lookup) so the same curve is used both in JS-driven scroll and CSS-driven height animations.
- `revealBlockSymmetric` runs scroll interpolation and height interpolation on a single shared RAF loop, advancing both with the same t-value, so they cannot drift.
- All scroll-related functions abort cleanly if `prefers-reduced-motion` is set: they jump to the final state instantly.
- A module-level WeakMap tracks the active height animation per element so streaming chunk N+1 can cancel N and resume from the live interpolated value.

### `BrowserToolBridge.tsx` changes

`add_agent_block` becomes:

```ts
add_agent_block: async (args: unknown) => {
  // ...validation unchanged...

  // 1. Compute boundary Y (top of the pinned section, or end of document).
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

  // 2. Scroll so boundary lands at 40% of viewport.
  await scrollSoPointAt(boundaryY, 0.40, DURATIONS.scrollInsertion)

  // 3. Insert section (empty content).
  const newId = createId()
  addSection({ id: newId, content: '', topic, className: 'agent-block', ...optional })

  // 4. Wait two RAFs so the section is mounted and measurable.
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))

  // 5. Reveal symmetrically.
  const element = document.getElementById(newId)
  if (element) {
    // Measure natural height of the empty agent block (padding + min-height).
    const naturalHeight = Math.min(element.scrollHeight, window.innerHeight * 0.7)
    await revealBlockSymmetric(element, naturalHeight, DURATIONS.revealSymmetric)
    // Outline flash (kept, with same easing).
    element.animate(/* outline keyframes */, { duration: 600, easing: 'ease-out' })
  }

  lastTouchedIdRef.current = newId
  return { id: newId }
}
```

`scrollIntoViewIfNeeded` is replaced with:

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

Called identically from `append_to_block`, `set_block_html`, `set_block_diagram`, `set_block_formula`.

### `Block.tsx` changes

Add a small hook `useAnimatedHeight` that smooths height changes coming from content updates:

```tsx
function useAnimatedHeight(ref: React.RefObject<HTMLElement | null>, content: string) {
  const lastHeightRef = useRef<number | null>(null)
  const debounceRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const oldHeight = lastHeightRef.current
    const newHeight = el.scrollHeight

    if (oldHeight !== null && oldHeight !== newHeight) {
      // Debounce: coalesce chunks that arrive within 80ms.
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        animateHeightChange(el, oldHeight, el.scrollHeight, DURATIONS.streamingHeight)
        lastHeightRef.current = el.scrollHeight
      }, 80)
    } else {
      lastHeightRef.current = newHeight
    }
  }, [content, ref])
}
```

A new `sectionRef` is added to `Block.tsx` pointing to the outer `<section>` element (today there's only `contentRef` for the inner `.block-content`). The hook receives `sectionRef`, not `contentRef`, so the animated height includes padding and any internal margin collapse.

> Why `scrollHeight` and not `offsetHeight`? While an animation is in flight, `offsetHeight` reflects the interpolated value. `scrollHeight` reflects natural content height.

## Data flow

```
LLM tool call
  ↓
BrowserToolBridge.tools.<tool>
  ↓
add_agent_block:
  scrollSoPointAt(boundary, 0.40) ──┐
  addSection({content:''})          │ (sequential)
  revealBlockSymmetric(el, h) ──────┘
     ├── RAF loop ── interpolate height + scrollY together
     └── on done: clean inline styles, flash outline

append/set/diagram/formula:
  focusBlockIfNeeded(id) ── scrollSoElementFocused
  updateSection(id, …)
     ↓
Block.tsx re-renders
     ↓
useAnimatedHeight detects height delta
     ↓
80ms debounce → animateHeightChange(el, old, new, 250ms)
     ↓ (cancels any in-flight animation on the same el)
RAF loop interpolates height with SPRING_EASING
```

## Error handling

- All animation helpers swallow `AbortError` from cancelled animations. Cancellation is a normal path, not an error.
- If `getBoundingClientRect()` returns zero size (element detached during animation), the helper bails silently and resolves.
- If `prefers-reduced-motion: reduce` is set, every helper jumps to the final state synchronously and resolves immediately. No keyframes, no RAF.
- Defensive guard: if `naturalHeight` measures as 0 (e.g., element styled `display:none` momentarily), default to 200 to avoid invisible reveal.

## Testing

Component-level:
- `blockAnimations.test.ts` (vitest + happy-dom): unit tests for the cubic-bezier solver (specific inputs → expected outputs within 1e-4), and for `scrollSoPointAt` math (given a page Y of 1000, viewport 800, ratio 0.4, target scrollY should be 1000 − 320 = 680).
- `useAnimatedHeight.test.tsx`: render a Block with changing content, advance fake timers past the 80ms debounce, assert that `element.animate` was called with the right `from`/`to` heights.

Manual:
- Desktop Chrome: add multiple blocks in a row, observe symmetric expansion.
- iOS Safari: same, plus check that the JS-driven scroll plays nicely with momentum scrolling. If `touchstart` fires during the scroll, the animation aborts.
- macOS reduced-motion enabled in System Settings: animations should be skipped.

## Open questions

None at the moment.
