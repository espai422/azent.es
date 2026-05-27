# Polygonal Flip Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add polygonal Cybertruck-style clip-path shapes to all landing sections, with a smooth 0.8s combined XY+zoom flip animation on 5 sections that reveals a back face.

**Architecture:** A `FlipProvider` holds flip state for all sections via `useReducer`. `FlipSection` and `PolygonSection` wrappers apply clip-path shapes and, for `FlipSection`, handle the 3D flip animation driven by a `data-animating` attribute that triggers CSS keyframes. The flip is disabled when no `back` prop is provided.

**Tech Stack:** React 19, Tailwind v4, vitest + @testing-library/react, CSS keyframes in styles.css.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/flip/FlipProvider.tsx` | Create | Context + useReducer, exports `FlipProvider` and `useFlipContext` |
| `src/components/flip/useFlipControls.ts` | Create | Public hook: `toggle`, `set`, `resetAll`, `isFlipped` |
| `src/components/flip/FlipProvider.test.tsx` | Create | Tests for `useFlipControls` |
| `src/components/flip/PolygonSection.tsx` | Create | Clip-path wrapper, no flip |
| `src/components/flip/PolygonSection.test.tsx` | Create | Tests for `PolygonSection` |
| `src/components/flip/FlipSection.tsx` | Create | Clip-path + 3D flip wrapper |
| `src/components/flip/FlipSection.test.tsx` | Create | Tests for `FlipSection` |
| `src/styles.css` | Modify | Add flip keyframes and CSS classes |
| `src/components/landing/ContextBack.tsx` | Create | Mock back content |
| `src/components/landing/PartnerBack.tsx` | Create | Mock back content |
| `src/components/landing/SystemChallengeBack.tsx` | Create | Mock back content |
| `src/components/landing/HowWeWorkBack.tsx` | Create | Mock back content |
| `src/components/landing/PhilosophyBack.tsx` | Create | Mock back content |
| `src/routes/index.tsx` | Modify | Add `FlipProvider`, wrappers, polygon shapes |

---

## Task 1: FlipProvider + useFlipControls

**Files:**
- Create: `src/components/flip/FlipProvider.tsx`
- Create: `src/components/flip/useFlipControls.ts`
- Create: `src/components/flip/FlipProvider.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/flip/FlipProvider.test.tsx
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { FlipProvider } from '#/components/flip/FlipProvider'
import { useFlipControls } from '#/components/flip/useFlipControls'

function wrapper({ children }: { children: ReactNode }) {
  return <FlipProvider>{children}</FlipProvider>
}

describe('useFlipControls', () => {
  it('isFlipped returns false for unknown id', () => {
    const { result } = renderHook(() => useFlipControls(), { wrapper })
    expect(result.current.isFlipped('x')).toBe(false)
  })

  it('toggle flips a section on and off', () => {
    const { result } = renderHook(() => useFlipControls(), { wrapper })
    act(() => result.current.toggle('a'))
    expect(result.current.isFlipped('a')).toBe(true)
    act(() => result.current.toggle('a'))
    expect(result.current.isFlipped('a')).toBe(false)
  })

  it('set forces a specific value', () => {
    const { result } = renderHook(() => useFlipControls(), { wrapper })
    act(() => result.current.set('b', true))
    expect(result.current.isFlipped('b')).toBe(true)
    act(() => result.current.set('b', false))
    expect(result.current.isFlipped('b')).toBe(false)
  })

  it('resetAll sets all flipped sections to false', () => {
    const { result } = renderHook(() => useFlipControls(), { wrapper })
    act(() => { result.current.toggle('a'); result.current.toggle('b') })
    act(() => result.current.resetAll())
    expect(result.current.isFlipped('a')).toBe(false)
    expect(result.current.isFlipped('b')).toBe(false)
  })

  it('multiple sections can be flipped simultaneously', () => {
    const { result } = renderHook(() => useFlipControls(), { wrapper })
    act(() => { result.current.toggle('a'); result.current.toggle('b') })
    expect(result.current.isFlipped('a')).toBe(true)
    expect(result.current.isFlipped('b')).toBe(true)
  })

  it('throws when used outside FlipProvider', () => {
    expect(() => renderHook(() => useFlipControls())).toThrow('FlipProvider')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm vitest run src/components/flip/FlipProvider.test.tsx
```

Expected: FAIL — `Cannot find module '#/components/flip/FlipProvider'`

- [ ] **Step 3: Implement FlipProvider**

```tsx
// src/components/flip/FlipProvider.tsx
import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'

type FlipState = Record<string, boolean>

type FlipAction =
  | { type: 'TOGGLE'; id: string }
  | { type: 'SET'; id: string; value: boolean }
  | { type: 'RESET_ALL' }

function flipReducer(state: FlipState, action: FlipAction): FlipState {
  switch (action.type) {
    case 'TOGGLE':
      return { ...state, [action.id]: !state[action.id] }
    case 'SET':
      return { ...state, [action.id]: action.value }
    case 'RESET_ALL':
      return Object.fromEntries(Object.keys(state).map(k => [k, false]))
  }
}

type FlipContextValue = { state: FlipState; dispatch: Dispatch<FlipAction> }

const FlipContext = createContext<FlipContextValue | null>(null)

export function FlipProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(flipReducer, {})
  return <FlipContext.Provider value={{ state, dispatch }}>{children}</FlipContext.Provider>
}

export function useFlipContext() {
  const ctx = useContext(FlipContext)
  if (!ctx) throw new Error('useFlipContext must be used within FlipProvider')
  return ctx
}
```

- [ ] **Step 4: Implement useFlipControls**

```ts
// src/components/flip/useFlipControls.ts
import { useFlipContext } from './FlipProvider'

export function useFlipControls() {
  const { state, dispatch } = useFlipContext()
  return {
    toggle:    (id: string)              => dispatch({ type: 'TOGGLE', id }),
    set:       (id: string, value: boolean) => dispatch({ type: 'SET', id, value }),
    resetAll:  ()                        => dispatch({ type: 'RESET_ALL' }),
    isFlipped: (id: string)              => state[id] ?? false,
  }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
pnpm vitest run src/components/flip/FlipProvider.test.tsx
```

Expected: all 6 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/flip/FlipProvider.tsx src/components/flip/useFlipControls.ts src/components/flip/FlipProvider.test.tsx
git commit -m "feat: add FlipProvider context and useFlipControls hook"
```

---

## Task 2: PolygonSection

**Files:**
- Create: `src/components/flip/PolygonSection.tsx`
- Create: `src/components/flip/PolygonSection.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/flip/PolygonSection.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PolygonSection } from '#/components/flip/PolygonSection'

const SHAPE = 'polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)'

describe('PolygonSection', () => {
  it('renders children', () => {
    render(<PolygonSection shape={SHAPE}><p>hello</p></PolygonSection>)
    expect(screen.getByText('hello')).toBeDefined()
  })

  it('applies clip-path shape', () => {
    const { container } = render(<PolygonSection shape={SHAPE}><p>x</p></PolygonSection>)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.clipPath).toBe(SHAPE)
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
pnpm vitest run src/components/flip/PolygonSection.test.tsx
```

Expected: FAIL — `Cannot find module '#/components/flip/PolygonSection'`

- [ ] **Step 3: Implement PolygonSection**

```tsx
// src/components/flip/PolygonSection.tsx
import type { ReactNode } from 'react'

type Props = { shape: string; children: ReactNode }

export function PolygonSection({ shape, children }: Props) {
  return (
    <div style={{ clipPath: shape, background: '#0c0c0c' }}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run — verify pass**

```bash
pnpm vitest run src/components/flip/PolygonSection.test.tsx
```

Expected: 2 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/flip/PolygonSection.tsx src/components/flip/PolygonSection.test.tsx
git commit -m "feat: add PolygonSection wrapper"
```

---

## Task 3: FlipSection

**Files:**
- Create: `src/components/flip/FlipSection.tsx`
- Create: `src/components/flip/FlipSection.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/flip/FlipSection.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactNode } from 'react'
import { FlipProvider } from '#/components/flip/FlipProvider'
import { FlipSection } from '#/components/flip/FlipSection'

const SHAPE = 'polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)'

function Wrap({ children }: { children: ReactNode }) {
  return <FlipProvider>{children}</FlipProvider>
}

function card() {
  return document.querySelector('[data-state]') as HTMLElement
}

describe('FlipSection', () => {
  it('renders front children', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE} back={<p>back</p>}><p>front</p></FlipSection></Wrap>)
    expect(screen.getByText('front')).toBeDefined()
  })

  it('renders back content', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE} back={<p>back content</p>}><p>front</p></FlipSection></Wrap>)
    expect(screen.getByText('back content')).toBeDefined()
  })

  it('with back: pointer cursor and sets data-animating on click', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE} back={<p>back</p>}><p>front</p></FlipSection></Wrap>)
    const c = card()
    expect(c.style.cursor).toBe('pointer')
    fireEvent.click(c)
    expect(c.getAttribute('data-animating')).toBe('flip-to-back')
  })

  it('with back: second click while back-state sets data-animating to flip-to-front', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE} back={<p>back</p>}><p>front</p></FlipSection></Wrap>)
    const c = card()
    fireEvent.click(c)
    fireEvent(c, new Event('animationend'))
    expect(c.getAttribute('data-animating')).toBeNull()
    fireEvent.click(c)
    expect(c.getAttribute('data-animating')).toBe('flip-to-front')
  })

  it('without back: no pointer cursor, click does not set data-animating', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE}><p>front</p></FlipSection></Wrap>)
    const c = card()
    expect(c.style.cursor).toBe('')
    fireEvent.click(c)
    expect(c.getAttribute('data-animating')).toBeNull()
  })

  it('animationend clears data-animating', () => {
    render(<Wrap><FlipSection id="s" shape={SHAPE} back={<p>back</p>}><p>front</p></FlipSection></Wrap>)
    const c = card()
    fireEvent.click(c)
    expect(c.getAttribute('data-animating')).toBe('flip-to-back')
    fireEvent(c, new Event('animationend'))
    expect(c.getAttribute('data-animating')).toBeNull()
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
pnpm vitest run src/components/flip/FlipSection.test.tsx
```

Expected: FAIL — `Cannot find module '#/components/flip/FlipSection'`

- [ ] **Step 3: Implement FlipSection**

```tsx
// src/components/flip/FlipSection.tsx
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFlipControls } from './useFlipControls'

type AnimState = 'idle' | 'flip-to-back' | 'flip-to-front'

type Props = {
  id: string
  shape: string
  back?: ReactNode
  children: ReactNode
}

export function FlipSection({ id, shape, back, children }: Props) {
  const { toggle, isFlipped } = useFlipControls()
  const flipped = isFlipped(id)
  const [animState, setAnimState] = useState<AnimState>('idle')
  const prevFlipped = useRef(flipped)
  const canFlip = back != null

  useEffect(() => {
    if (!canFlip) return
    if (flipped === prevFlipped.current) return
    setAnimState(flipped ? 'flip-to-back' : 'flip-to-front')
    prevFlipped.current = flipped
  }, [flipped, canFlip])

  return (
    <div style={{ clipPath: shape, background: '#0c0c0c', perspective: '700px' }}>
      <div
        className="flip-card"
        data-state={flipped ? 'back' : 'front'}
        data-animating={animState !== 'idle' ? animState : undefined}
        style={{ cursor: canFlip ? 'pointer' : '' }}
        onClick={canFlip ? () => toggle(id) : undefined}
        onAnimationEnd={() => setAnimState('idle')}
      >
        <div className="flip-face-front">{children}</div>
        {back != null && <div className="flip-face-back">{back}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run — verify pass**

```bash
pnpm vitest run src/components/flip/FlipSection.test.tsx
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/flip/FlipSection.tsx src/components/flip/FlipSection.test.tsx
git commit -m "feat: add FlipSection wrapper with conditional flip logic"
```

---

## Task 4: CSS animation keyframes

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add flip classes and keyframes**

Append to `src/styles.css`:

```css
/* ── Flip system ─────────────────────────────────────── */

.flip-card {
  position: relative;
  transform-style: preserve-3d;
}

.flip-card[data-state="front"]:not([data-animating]) {
  transform: rotateX(0deg) rotateY(0deg);
}

.flip-card[data-state="back"]:not([data-animating]) {
  transform: rotateX(180deg) rotateY(180deg);
}

.flip-card[data-animating="flip-to-back"] {
  animation: flip-to-back 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.flip-card[data-animating="flip-to-front"] {
  animation: flip-to-front 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.flip-face-front,
.flip-face-back {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flip-face-back {
  position: absolute;
  inset: 0;
  transform: rotateX(180deg) rotateY(180deg);
}

@keyframes flip-to-back {
  0%   { transform: scale(1)    translateZ(0px)   rotateX(0deg)   rotateY(0deg); }
  50%  { transform: scale(1.22) translateZ(90px)  rotateX(90deg)  rotateY(90deg); }
  100% { transform: scale(1)    translateZ(0px)   rotateX(180deg) rotateY(180deg); }
}

@keyframes flip-to-front {
  0%   { transform: scale(1)    translateZ(0px)   rotateX(180deg) rotateY(180deg); }
  50%  { transform: scale(1.22) translateZ(90px)  rotateX(270deg) rotateY(270deg); }
  100% { transform: scale(1)    translateZ(0px)   rotateX(360deg) rotateY(360deg); }
}
```

- [ ] **Step 2: Run all tests — verify nothing broke**

```bash
pnpm test
```

Expected: all existing tests + new tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: add flip keyframe animations and CSS classes"
```

---

## Task 5: Mock back content components

**Files:**
- Create: `src/components/landing/ContextBack.tsx`
- Create: `src/components/landing/PartnerBack.tsx`
- Create: `src/components/landing/SystemChallengeBack.tsx`
- Create: `src/components/landing/HowWeWorkBack.tsx`
- Create: `src/components/landing/PhilosophyBack.tsx`

- [ ] **Step 1: Create all five mock back components**

```tsx
// src/components/landing/ContextBack.tsx
export function ContextBack() {
  return (
    <div className="px-6 py-24 md:px-16">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-neutral-600">
        — context back —
      </p>
      <p className="max-w-xl leading-relaxed text-neutral-400">
        Placeholder. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
        enim ad minim veniam, quis nostrud exercitation ullamco laboris.
      </p>
    </div>
  )
}
```

```tsx
// src/components/landing/PartnerBack.tsx
export function PartnerBack() {
  return (
    <div className="px-6 py-24 md:px-16">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-neutral-600">
        — partner back —
      </p>
      <p className="max-w-xl leading-relaxed text-neutral-400">
        Placeholder. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
        enim ad minim veniam, quis nostrud exercitation ullamco laboris.
      </p>
    </div>
  )
}
```

```tsx
// src/components/landing/SystemChallengeBack.tsx
export function SystemChallengeBack() {
  return (
    <div className="px-6 py-24 md:px-16">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-neutral-600">
        — system challenge back —
      </p>
      <p className="max-w-xl leading-relaxed text-neutral-400">
        Placeholder. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
        enim ad minim veniam, quis nostrud exercitation ullamco laboris.
      </p>
    </div>
  )
}
```

```tsx
// src/components/landing/HowWeWorkBack.tsx
export function HowWeWorkBack() {
  return (
    <div className="px-6 py-24 md:px-16">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-neutral-600">
        — how we work back —
      </p>
      <p className="max-w-xl leading-relaxed text-neutral-400">
        Placeholder. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
        enim ad minim veniam, quis nostrud exercitation ullamco laboris.
      </p>
    </div>
  )
}
```

```tsx
// src/components/landing/PhilosophyBack.tsx
export function PhilosophyBack() {
  return (
    <div className="px-6 py-24 md:px-16">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-neutral-600">
        — philosophy back —
      </p>
      <p className="max-w-xl leading-relaxed text-neutral-400">
        Placeholder. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
        enim ad minim veniam, quis nostrud exercitation ullamco laboris.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/ContextBack.tsx src/components/landing/PartnerBack.tsx src/components/landing/SystemChallengeBack.tsx src/components/landing/HowWeWorkBack.tsx src/components/landing/PhilosophyBack.tsx
git commit -m "feat: add mock back content components"
```

---

## Task 6: Wire index.tsx

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Update index.tsx**

Replace the full file content:

```tsx
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { FlipProvider } from '#/components/flip/FlipProvider'
import { FlipSection } from '#/components/flip/FlipSection'
import { PolygonSection } from '#/components/flip/PolygonSection'
import { Hero } from '#/components/landing/Hero'
import { Context } from '#/components/landing/Context'
import { ContextBack } from '#/components/landing/ContextBack'
import { Partner } from '#/components/landing/Partner'
import { PartnerBack } from '#/components/landing/PartnerBack'
import { SystemChallenge } from '#/components/landing/SystemChallenge'
import { SystemChallengeBack } from '#/components/landing/SystemChallengeBack'
import { HowWeWork } from '#/components/landing/HowWeWork'
import { HowWeWorkBack } from '#/components/landing/HowWeWorkBack'
import { Philosophy } from '#/components/landing/Philosophy'
import { PhilosophyBack } from '#/components/landing/PhilosophyBack'
import { Examples } from '#/components/landing/Examples'
import { Closing } from '#/components/landing/Closing'

export const Route = createFileRoute('/')({ component: Landing })

function Landing() {
  return (
    <FlipProvider>
      <main>
        <PolygonSection shape="polygon(0% 0%, 100% 0%, 100% 92%, 5% 100%)">
          <Hero />
        </PolygonSection>

        <FlipSection
          id="context"
          shape="polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)"
          back={<ContextBack />}
        >
          <Context />
        </FlipSection>

        <FlipSection
          id="partner"
          shape="polygon(4% 0%, 100% 0%, 100% 88%, 0% 100%)"
          back={<PartnerBack />}
        >
          <Partner />
        </FlipSection>

        <FlipSection
          id="systemChallenge"
          shape="polygon(0% 0%, 96% 0%, 100% 100%, 6% 100%)"
          back={<SystemChallengeBack />}
        >
          <SystemChallenge />
        </FlipSection>

        <FlipSection
          id="howWeWork"
          shape="polygon(0% 6%, 100% 0%, 100% 94%, 0% 100%)"
          back={<HowWeWorkBack />}
        >
          <HowWeWork />
        </FlipSection>

        <FlipSection
          id="philosophy"
          shape="polygon(0% 0%, 100% 0%, 94% 100%, 6% 100%)"
          back={<PhilosophyBack />}
        >
          <Philosophy />
        </FlipSection>

        <PolygonSection shape="polygon(6% 0%, 100% 0%, 100% 100%, 0% 100%)">
          <Examples />
        </PolygonSection>

        <PolygonSection shape="polygon(0% 8%, 100% 0%, 100% 100%, 0% 100%)">
          <Closing />
        </PolygonSection>
      </main>
    </FlipProvider>
  )
}
```

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: all tests PASS

- [ ] **Step 3: Start dev server and verify visually**

```bash
pnpm dev
```

Open http://localhost:3000 and verify:
- All sections have angular polygon shapes
- Clicking Context, Partner, SystemChallenge, HowWeWork, Philosophy triggers the flip animation
- The section zooms toward you and flips in ~0.8s
- Clicking again flips it back
- Hero, Examples, Closing have shapes but do NOT flip on click
- Multiple sections can be flipped simultaneously

- [ ] **Step 4: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: wire landing page with polygonal flip sections"
```
