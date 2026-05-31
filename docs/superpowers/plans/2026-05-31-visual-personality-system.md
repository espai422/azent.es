# Visual Personality System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Aurora + Glass visual personality system to the AZENT landing — atmospheric layers per section (glow + grid + hairline), bidirectional 28px trapezoidal interlocking between sections, JetBrains Mono for HUD labels, upgraded grey contrasts, warm off-white for light theme, and a new semantic HTML vocabulary (`grad`, `pill`, `chip`, `panel`, `glow-dot`) documented for the Codex agent.

**Architecture:** Each section gets one of 4 `interlockVariant` patterns (A/B/C/D) — pre-validated x-ranges with non-overlapping down/up tabs. Block.tsx generates the clip-path polygon programmatically from its own variant + neighbours. Background atmosphere (aurora, grid) lives in two `<div>` layers behind content with `pointer-events: none`. Glass classes use CSS `backdrop-filter` with theme-aware borders.

**Tech Stack:** React 19, TanStack Start, Tailwind v4, Vitest + @testing-library/react, TypeScript strict (`verbatimModuleSyntax`), `@fontsource-variable/jetbrains-mono` (new dep).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `@fontsource-variable/jetbrains-mono` |
| `src/styles.css` | Modify | Color tokens, `--font-mono`, aurora/grid/hairline, bidirectional clip-path padding, glass classes (`.chip`, `.panel`), gradient/pill/glow-dot, block-card glow |
| `src/components/sections/interlock.ts` | Create | `InterlockVariant`, `TabSpec`, variant table, cycle helper, polygon builder, pure utilities |
| `src/components/sections/interlock.test.ts` | Create | Tests for variant table, cycle, polygon builder |
| `src/components/sections/SectionContext.tsx` | Modify | Replace `TabVariant` with `InterlockVariant` + `GlowPosition`; update `resolveSection` cycle; update reset/add logic to drop `tab` from `TabVariant` cycle |
| `src/components/sections/SectionContext.test.ts` | Modify | Replace tab-cycle tests with interlock-cycle + glow-cycle tests |
| `src/components/sections/Block.tsx` | Modify | Render `<div class="aurora">` and `<div class="grid">` layers; remove `CLIP_BOTTOM` lookup; call `buildClipPath` from interlock module; receive `prevVariant` + `nextVariant` instead of `prevTab`; emit `data-glow` |
| `src/components/sections/Block.test.tsx` | Modify | Update tests for new prop signature; assert aurora/grid layers render; assert `data-glow` attribute |
| `src/components/sections/index.ts` | Modify | Re-export `InterlockVariant`, `GlowPosition` |
| `src/routes/index.tsx` | Modify | Pass `prevVariant` / `nextVariant` to `<Block />`; drop `prevTab` |
| `.codex-browser-agent/AGENTS.md` | Modify | Insert new "Vocabulario semántico" section before "Contact" |

---

## Task 1: Add JetBrains Mono dependency

**Files:**
- Modify: `package.json`
- Modify: `src/styles.css:1-10`

- [ ] **Step 1.1 — Install the font package**

Run: `pnpm add @fontsource-variable/jetbrains-mono`
Expected: package added to `dependencies` in `package.json`, success message.

- [ ] **Step 1.2 — Import the font and expose `--font-mono`**

Edit `src/styles.css` at the top. Replace:

```css
@import "tailwindcss";
@import "@fontsource-variable/inter";

@theme {
  --font-sans: 'Inter Variable', sans-serif;
}
```

With:

```css
@import "tailwindcss";
@import "@fontsource-variable/inter";
@import "@fontsource-variable/jetbrains-mono";

@theme {
  --font-sans: 'Inter Variable', sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}
```

- [ ] **Step 1.3 — Verify dev server picks the font**

Run: `pnpm dev` (in background) and load `http://localhost:3000`. Open devtools, inspect any element, check that `getComputedStyle(...).getPropertyValue('--font-mono')` returns the new value. Stop the server.

- [ ] **Step 1.4 — Commit**

```bash
git add package.json pnpm-lock.yaml src/styles.css
git commit -m "feat(styles): add JetBrains Mono Variable + --font-mono"
```

---

## Task 2: Color token updates (contrast + warm off-white)

**Files:**
- Modify: `src/styles.css:48-87` (background colors + prose CSS custom properties)

- [ ] **Step 2.1 — Update background colors**

Replace the `─── Background colors ───` block (current lines 48–58) with:

```css
/* ─── Background colors ──────────────────────────────────────────────────── */

.block-section[data-theme="dark-1"]  { background-color: #050505; }
.block-section[data-theme="dark-2"]  { background-color: #0a0a0a; }
.block-section[data-theme="light-1"] { background-color: #f6f4ef; }
.block-section[data-theme="light-2"] { background-color: #efeae0; }
.block-section[data-theme="closing"] { background-color: #050505; }

.block-section[data-theme="closing"] + .block-section[data-theme="closing"] {
  border-top: 1px solid #1f1f1f;
}
```

- [ ] **Step 2.2 — Update prose tokens (dark)**

Replace the dark prose vars block (currently lines 62–74) with:

```css
.block-section[data-theme="dark-1"],
.block-section[data-theme="dark-2"],
.block-section[data-theme="closing"] {
  --prose-heading: #f1f1f1;
  --prose-body: #b8b8b8;
  --prose-muted: #6e6e6e;
  --prose-accent: #ff6b2b;
  --prose-accent-soft: #ffb27a;
  --prose-strong: #f1f1f1;
  --prose-strike-opacity: 0.25;
  --prose-code-bg: #1e1e1e;
  --prose-code-color: #888888;
  --prose-grid-gap: #1f1f1f;
}
```

- [ ] **Step 2.3 — Update prose tokens (light)**

Replace the light prose vars block (currently lines 76–87) with:

```css
.block-section[data-theme="light-1"],
.block-section[data-theme="light-2"] {
  --prose-heading: #0e0e0e;
  --prose-body: #4a4a4a;
  --prose-muted: #7a7a7a;
  --prose-accent: #d44a13;
  --prose-accent-soft: #ff8a55;
  --prose-strong: #0e0e0e;
  --prose-strike-opacity: 0.3;
  --prose-code-bg: #eeeeee;
  --prose-code-color: #555555;
  --prose-grid-gap: #d8d2c4;
}
```

- [ ] **Step 2.4 — Verify visually**

Run: `pnpm dev` (background). Open `http://localhost:3000`. Confirm body text on dark sections is readable (lighter grey), light sections have warm off-white, no broken styles. Stop the server.

- [ ] **Step 2.5 — Commit**

```bash
git add src/styles.css
git commit -m "feat(theme): upgrade grey contrasts + warm off-white"
```

---

## Task 3: Interlock module — types + variant table (TDD)

**Files:**
- Create: `src/components/sections/interlock.ts`
- Create: `src/components/sections/interlock.test.ts`

- [ ] **Step 3.1 — Write failing tests for the variant table**

Create `src/components/sections/interlock.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  INTERLOCK_VARIANTS,
  cycleInterlockVariant,
  cycleGlowPosition,
  type InterlockVariant,
  type GlowPosition,
} from './interlock'

describe('INTERLOCK_VARIANTS', () => {
  it('exposes all four variants A/B/C/D', () => {
    expect(Object.keys(INTERLOCK_VARIANTS).sort()).toEqual(['A', 'B', 'C', 'D'])
  })

  it('each variant has down + up tab specs with base + top x-ranges', () => {
    for (const v of Object.values(INTERLOCK_VARIANTS)) {
      expect(v.down).toMatchObject({ baseStart: expect.any(Number), baseEnd: expect.any(Number), topStart: expect.any(Number), topEnd: expect.any(Number) })
      expect(v.up).toMatchObject({ baseStart: expect.any(Number), baseEnd: expect.any(Number), topStart: expect.any(Number), topEnd: expect.any(Number) })
    }
  })

  it('downTab top is narrower than base (convergent trapezoid)', () => {
    for (const v of Object.values(INTERLOCK_VARIANTS)) {
      const dBase = v.down.baseEnd - v.down.baseStart
      const dTop  = v.down.topEnd  - v.down.topStart
      expect(dTop).toBeLessThan(dBase)
      const uBase = v.up.baseEnd - v.up.baseStart
      const uTop  = v.up.topEnd  - v.up.topStart
      expect(uTop).toBeLessThan(uBase)
    }
  })

  it('down and up tabs do not overlap in x for any variant', () => {
    for (const [name, v] of Object.entries(INTERLOCK_VARIANTS)) {
      const downRange = [v.down.baseStart, v.down.baseEnd] as const
      const upRange   = [v.up.baseStart, v.up.baseEnd]   as const
      const noOverlap = downRange[1] <= upRange[0] || upRange[1] <= downRange[0]
      expect(noOverlap, `variant ${name}: down ${downRange.join('-')} overlaps with up ${upRange.join('-')}`).toBe(true)
    }
  })
})

describe('cycleInterlockVariant', () => {
  it('returns A for index 0', () => { expect(cycleInterlockVariant(0)).toBe('A') })
  it('returns B for index 1', () => { expect(cycleInterlockVariant(1)).toBe('B') })
  it('returns C for index 2', () => { expect(cycleInterlockVariant(2)).toBe('C') })
  it('returns D for index 3', () => { expect(cycleInterlockVariant(3)).toBe('D') })
  it('wraps back to A for index 4', () => { expect(cycleInterlockVariant(4)).toBe('A') })
})

describe('cycleGlowPosition', () => {
  it('returns tr at index 0', () => { expect(cycleGlowPosition(0)).toBe('tr') })
  it('returns bl at index 1', () => { expect(cycleGlowPosition(1)).toBe('bl') })
  it('returns tl at index 2', () => { expect(cycleGlowPosition(2)).toBe('tl') })
  it('returns br at index 3', () => { expect(cycleGlowPosition(3)).toBe('br') })
  it('wraps back to tr at index 4', () => { expect(cycleGlowPosition(4)).toBe('tr') })
})
```

- [ ] **Step 3.2 — Run tests to verify they fail**

Run: `pnpm vitest run src/components/sections/interlock.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3.3 — Implement the variant table + cycles**

Create `src/components/sections/interlock.ts`:

```ts
export type InterlockVariant = 'A' | 'B' | 'C' | 'D'
export type GlowPosition = 'tr' | 'tl' | 'br' | 'bl'

export interface TabSpec {
  baseStart: number
  baseEnd: number
  topStart: number
  topEnd: number
}

export interface InterlockSpec {
  down: TabSpec
  up: TabSpec
}

export const INTERLOCK_VARIANTS: Record<InterlockVariant, InterlockSpec> = {
  A: {
    down: { baseStart: 66, baseEnd: 94, topStart: 72, topEnd: 88 },
    up:   { baseStart: 6,  baseEnd: 34, topStart: 12, topEnd: 28 },
  },
  B: {
    down: { baseStart: 6,  baseEnd: 34, topStart: 12, topEnd: 28 },
    up:   { baseStart: 66, baseEnd: 94, topStart: 72, topEnd: 88 },
  },
  C: {
    down: { baseStart: 50, baseEnd: 78, topStart: 56, topEnd: 72 },
    up:   { baseStart: 4,  baseEnd: 26, topStart: 9,  topEnd: 21 },
  },
  D: {
    down: { baseStart: 22, baseEnd: 50, topStart: 28, topEnd: 44 },
    up:   { baseStart: 74, baseEnd: 96, topStart: 79, topEnd: 91 },
  },
}

const VARIANT_CYCLE: InterlockVariant[] = ['A', 'B', 'C', 'D']
const GLOW_CYCLE: GlowPosition[]       = ['tr', 'bl', 'tl', 'br']

export function cycleInterlockVariant(index: number): InterlockVariant {
  return VARIANT_CYCLE[((index % 4) + 4) % 4]
}

export function cycleGlowPosition(index: number): GlowPosition {
  return GLOW_CYCLE[((index % 4) + 4) % 4]
}
```

- [ ] **Step 3.4 — Run tests to verify they pass**

Run: `pnpm vitest run src/components/sections/interlock.test.ts`
Expected: all 18 tests PASS.

- [ ] **Step 3.5 — Commit**

```bash
git add src/components/sections/interlock.ts src/components/sections/interlock.test.ts
git commit -m "feat(interlock): variant table + cycle helpers for bidirectional tabs"
```

---

## Task 4: Polygon builder (TDD)

**Files:**
- Modify: `src/components/sections/interlock.ts`
- Modify: `src/components/sections/interlock.test.ts`

- [ ] **Step 4.1 — Write failing tests for the polygon builder**

Append to `src/components/sections/interlock.test.ts`:

```ts
import { buildClipPath, TAB_DEPTH } from './interlock'

describe('buildClipPath', () => {
  it('exports TAB_DEPTH = 28', () => {
    expect(TAB_DEPTH).toBe(28)
  })

  it('returns "none" when there are no top features and no bottom features', () => {
    // closing section with no neighbours: everything flat
    expect(buildClipPath({
      ownVariant: null, prevVariant: null, nextVariant: null,
      hasPrev: false, hasNext: false,
    })).toBe('none')
  })

  it('starts and ends with "polygon(" and ")" when at least one feature is present', () => {
    const path = buildClipPath({
      ownVariant: 'A', prevVariant: null, nextVariant: 'B',
      hasPrev: false, hasNext: true,
    })
    expect(path.startsWith('polygon(')).toBe(true)
    expect(path.endsWith(')')).toBe(true)
  })

  it('renders own downTab landing on flat top of a closing next (hasNext true, nextVariant null)', () => {
    // Middle non-closing followed by closing: own down-tab still renders
    const path = buildClipPath({
      ownVariant: 'A', prevVariant: null, nextVariant: null,
      hasPrev: false, hasNext: true,
    })
    expect(path).toMatch(/72%\s+100%/)
    expect(path).toMatch(/88%\s+100%/)
  })

  it('does NOT render own downTab when there is no next at all (isLast)', () => {
    const path = buildClipPath({
      ownVariant: 'A', prevVariant: 'B', nextVariant: null,
      hasPrev: true, hasNext: false,
    })
    // No "100%" y vertex on the bottom side (only calc(100% - 28px) flat)
    expect(path).not.toMatch(/72%\s+100%/)
  })

  it('does NOT render own upTab when there is no prev at all', () => {
    const path = buildClipPath({
      ownVariant: 'A', prevVariant: null, nextVariant: 'B',
      hasPrev: false, hasNext: true,
    })
    // No "0%" y vertex on the top (other than the corners)
    expect(path).not.toMatch(/12%\s+0%/)
  })

  it('does NOT render own upTab when prev is closing (prevVariant=null but hasPrev=true)', () => {
    const path = buildClipPath({
      ownVariant: 'A', prevVariant: null, nextVariant: 'B',
      hasPrev: true, hasNext: true,
    })
    expect(path).not.toMatch(/12%\s+0%/)
  })

  it('renders own upTab when prev exists and is non-closing', () => {
    const path = buildClipPath({
      ownVariant: 'A', prevVariant: 'B', nextVariant: null,
      hasPrev: true, hasNext: true,
    })
    expect(path).toMatch(/12%\s+0%/)
    expect(path).toMatch(/28%\s+0%/)
  })

  it('renders nextUpCut at calc(100% - 56px) when next is non-closing', () => {
    const path = buildClipPath({
      ownVariant: 'A', prevVariant: null, nextVariant: 'B',
      hasPrev: false, hasNext: true,
    })
    // B.up baseStart 66, baseEnd 94, top 72-88 — cut extends to 100% - 56px
    expect(path).toMatch(/72%\s+calc\(100% - 56px\)/)
    expect(path).toMatch(/88%\s+calc\(100% - 56px\)/)
  })

  it('renders prevDownCut at y=56px when prev is non-closing', () => {
    const path = buildClipPath({
      ownVariant: 'A', prevVariant: 'B', nextVariant: null,
      hasPrev: true, hasNext: true,
    })
    // B.down baseStart 6, baseEnd 34, top 12-28 — cut extends to y=56px
    expect(path).toMatch(/12%\s+56px/)
    expect(path).toMatch(/28%\s+56px/)
  })

  it('uses calc(100% - 28px) for the bottom nominal edge when there are bottom features', () => {
    const path = buildClipPath({
      ownVariant: 'A', prevVariant: null, nextVariant: 'B',
      hasPrev: false, hasNext: true,
    })
    expect(path).toContain('calc(100% - 28px)')
  })

  it('produces a top-rect (no 28px y-offset on top) when no top features render', () => {
    const path = buildClipPath({
      ownVariant: 'A', prevVariant: null, nextVariant: 'B',
      hasPrev: false, hasNext: true,
    })
    // top is flat at y=0
    expect(path).toMatch(/0%\s+0%/)
    expect(path).toMatch(/100%\s+0%/)
  })
})
```

- [ ] **Step 4.2 — Run tests to verify they fail**

Run: `pnpm vitest run src/components/sections/interlock.test.ts`
Expected: FAIL — `buildClipPath`, `TAB_DEPTH` not exported.

- [ ] **Step 4.3 — Implement the polygon builder**

Append to `src/components/sections/interlock.ts`:

```ts
export const TAB_DEPTH = 28 // px

export interface ClipPathInput {
  ownVariant: InterlockVariant | null
  prevVariant: InterlockVariant | null
  nextVariant: InterlockVariant | null
  hasPrev: boolean
  hasNext: boolean
}

type Vertex = { x: string; y: string }

function pct(n: number): string {
  return `${n}%`
}

export function buildClipPath({
  ownVariant, prevVariant, nextVariant, hasPrev, hasNext,
}: ClipPathInput): string {
  // Render rules:
  //   Own up-tab  → ownVariant && prevVariant (prev exists AND is non-closing)
  //   Own down-tab → ownVariant && hasNext (there's a next section, possibly closing)
  //   Prev cut    → ownVariant && prevVariant (mirror of own up-tab)
  //   Next cut    → ownVariant && nextVariant (next is non-closing — closing sends nothing)
  const renderOwnUp   = ownVariant !== null && prevVariant !== null
  const renderOwnDown = ownVariant !== null && hasNext
  const renderPrevCut = ownVariant !== null && prevVariant !== null
  const renderNextCut = ownVariant !== null && nextVariant !== null

  const hasTopFeatures    = renderOwnUp   || renderPrevCut
  const hasBottomFeatures = renderOwnDown || renderNextCut

  if (!hasTopFeatures && !hasBottomFeatures) {
    return 'none'
  }

  // Silence unused-var lint for `hasPrev` (kept for symmetry / future extension):
  void hasPrev

  const verts: Vertex[] = []
  const own  = ownVariant  ? INTERLOCK_VARIANTS[ownVariant]  : null
  const prev = prevVariant ? INTERLOCK_VARIANTS[prevVariant] : null
  const next = nextVariant ? INTERLOCK_VARIANTS[nextVariant] : null

  // -------- TOP EDGE --------
  const topY = hasTopFeatures ? `${TAB_DEPTH}px` : '0%'
  verts.push({ x: '0%', y: topY })

  if (hasTopFeatures) {
    type TopFeature = { kind: 'up' | 'cut'; baseStart: number; baseEnd: number; topStart: number; topEnd: number }
    const features: TopFeature[] = []
    if (renderOwnUp   && own)  features.push({ kind: 'up',  ...own.up })
    if (renderPrevCut && prev) features.push({ kind: 'cut', ...prev.down })
    features.sort((a, b) => a.baseStart - b.baseStart)

    for (const f of features) {
      verts.push({ x: pct(f.baseStart), y: topY })
      if (f.kind === 'up') {
        // own upTab goes UP to y=0
        verts.push({ x: pct(f.topStart), y: '0%' })
        verts.push({ x: pct(f.topEnd), y: '0%' })
      } else {
        // prev downTab cut — extreme at y = 2*TAB_DEPTH
        verts.push({ x: pct(f.topStart), y: `${TAB_DEPTH * 2}px` })
        verts.push({ x: pct(f.topEnd), y: `${TAB_DEPTH * 2}px` })
      }
      verts.push({ x: pct(f.baseEnd), y: topY })
    }
  }

  verts.push({ x: '100%', y: topY })

  // -------- RIGHT -> BOTTOM-RIGHT --------
  const botY = hasBottomFeatures ? `calc(100% - ${TAB_DEPTH}px)` : '100%'
  verts.push({ x: '100%', y: botY })

  // -------- BOTTOM EDGE (right-to-left) --------
  if (hasBottomFeatures) {
    type BotFeature = { kind: 'down' | 'cut'; baseStart: number; baseEnd: number; topStart: number; topEnd: number }
    const features: BotFeature[] = []
    if (renderOwnDown && own)  features.push({ kind: 'down', ...own.down })
    if (renderNextCut && next) features.push({ kind: 'cut',  ...next.up })
    features.sort((a, b) => b.baseStart - a.baseStart)

    for (const f of features) {
      verts.push({ x: pct(f.baseEnd), y: botY })
      if (f.kind === 'down') {
        verts.push({ x: pct(f.topEnd),   y: '100%' })
        verts.push({ x: pct(f.topStart), y: '100%' })
      } else {
        verts.push({ x: pct(f.topEnd),   y: `calc(100% - ${TAB_DEPTH * 2}px)` })
        verts.push({ x: pct(f.topStart), y: `calc(100% - ${TAB_DEPTH * 2}px)` })
      }
      verts.push({ x: pct(f.baseStart), y: botY })
    }
  }

  verts.push({ x: '0%', y: botY })

  return `polygon(${verts.map(v => `${v.x} ${v.y}`).join(', ')})`
}
```

- [ ] **Step 4.4 — Run tests to verify they pass**

Run: `pnpm vitest run src/components/sections/interlock.test.ts`
Expected: all tests PASS (previous 18 + 11 new = 29 total).

- [ ] **Step 4.5 — Commit**

```bash
git add src/components/sections/interlock.ts src/components/sections/interlock.test.ts
git commit -m "feat(interlock): clip-path polygon builder for bidirectional tabs"
```

---

## Task 5: Update `SectionContext` types and cycle (TDD)

**Files:**
- Modify: `src/components/sections/SectionContext.tsx`
- Modify: `src/components/sections/SectionContext.test.ts`
- Modify: `src/components/sections/index.ts`

- [ ] **Step 5.1 — Update the failing tests**

Open `src/components/sections/SectionContext.test.ts`. Replace the entire `describe('resolveSection — tab cycle', ...)` block with:

```ts
describe('resolveSection — interlock cycle', () => {
  it('assigns A at position 0', () => {
    expect(resolveSection({ content: '' }, 0).interlockVariant).toBe('A')
  })
  it('assigns B at position 1', () => {
    expect(resolveSection({ content: '' }, 1).interlockVariant).toBe('B')
  })
  it('assigns C at position 2', () => {
    expect(resolveSection({ content: '' }, 2).interlockVariant).toBe('C')
  })
  it('assigns D at position 3', () => {
    expect(resolveSection({ content: '' }, 3).interlockVariant).toBe('D')
  })
  it('wraps back to A at position 4', () => {
    expect(resolveSection({ content: '' }, 4).interlockVariant).toBe('A')
  })
  it('forces interlockVariant to null when theme is closing', () => {
    expect(resolveSection({ content: '', theme: 'closing' }, 0).interlockVariant).toBeNull()
  })
  it('respects explicit interlockVariant override', () => {
    expect(resolveSection({ content: '', interlockVariant: 'C' }, 0).interlockVariant).toBe('C')
  })
})

describe('resolveSection — glow cycle', () => {
  it('assigns tr at position 0', () => {
    expect(resolveSection({ content: '' }, 0).glow).toBe('tr')
  })
  it('assigns bl at position 1', () => {
    expect(resolveSection({ content: '' }, 1).glow).toBe('bl')
  })
  it('assigns tl at position 2', () => {
    expect(resolveSection({ content: '' }, 2).glow).toBe('tl')
  })
  it('assigns br at position 3', () => {
    expect(resolveSection({ content: '' }, 3).glow).toBe('br')
  })
  it('wraps back to tr at position 4', () => {
    expect(resolveSection({ content: '' }, 4).glow).toBe('tr')
  })
  it('respects explicit glow override', () => {
    expect(resolveSection({ content: '', glow: 'br' }, 0).glow).toBe('br')
  })
})
```

Also update existing reducer tests that assert on `.tab`. Find these blocks in the same file and apply the changes:

(a) In `describe('sectionsReducer')`, the test starting "ADD appends a section with auto-resolved theme and tab" — replace its body with:

```ts
it('ADD appends a section with auto-resolved theme and interlockVariant', () => {
  const state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'hello' } })
  expect(state.sections).toHaveLength(1)
  expect(state.sections[0].content).toBe('hello')
  expect(state.sections[0].theme).toBe('dark-1')
  expect(state.sections[0].interlockVariant).toBe('A')
  expect(state.sections[0].glow).toBe('tr')
})
```

(b) The test starting "ADD uses nonClosingCount — closing sections do not advance the cycle" — replace its body with:

```ts
it('ADD uses nonClosingCount — closing sections do not advance the cycle', () => {
  let state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'a' } })
  state = sectionsReducer(state, { type: 'ADD', payload: { content: 'b', theme: 'closing' } })
  state = sectionsReducer(state, { type: 'ADD', payload: { content: 'c' } })
  expect(state.sections[2].theme).toBe('light-2')
  expect(state.sections[2].interlockVariant).toBe('B')
})
```

Any other `.tab` assertion in the file: replace with the corresponding `.interlockVariant` value (use `cycleInterlockVariant(n)` mentally — index 0=A, 1=B, 2=C, 3=D).

- [ ] **Step 5.2 — Run tests to verify they fail**

Run: `pnpm vitest run src/components/sections/SectionContext.test.ts`
Expected: FAIL — `interlockVariant`, `glow` not present on resolved section.

- [ ] **Step 5.3 — Update `SectionContext.tsx` types and helper**

Open `src/components/sections/SectionContext.tsx`. Replace:

```ts
export type SectionTheme = 'dark-1' | 'light-2' | 'dark-2' | 'light-1' | 'closing'
export type TabVariant = 'center' | 'right' | 'left' | 'none'

export interface SectionConfig {
  id: string
  theme: SectionTheme
  tab: TabVariant
  ...
}

export type SectionInput = {
  id?: string
  theme?: SectionTheme
  tab?: TabVariant
  ...
}

const COLOR_CYCLE: SectionTheme[] = ['dark-1', 'light-2', 'dark-2', 'light-1']
const TAB_CYCLE: TabVariant[] = ['center', 'right', 'left']

export function resolveSection(input: SectionInput, nonClosingCount: number): SectionConfig {
  const theme = input.theme ?? COLOR_CYCLE[nonClosingCount % 4]
  const tab = theme === 'closing' ? 'none' : (input.tab ?? TAB_CYCLE[nonClosingCount % 3])
  return {
    id: input.id ?? createId(),
    theme,
    tab,
    rule: input.rule,
    ...
  }
}
```

With:

```ts
import { cycleInterlockVariant, cycleGlowPosition, type InterlockVariant, type GlowPosition } from './interlock'

export type SectionTheme = 'dark-1' | 'light-2' | 'dark-2' | 'light-1' | 'closing'

export interface SectionConfig {
  id: string
  theme: SectionTheme
  interlockVariant: InterlockVariant | null
  glow: GlowPosition
  rule?: boolean
  content: string
  topic?: string
  className?: string
  pinned?: boolean
  diagram?: DiagramJSON
  diagramPosition?: 'before' | 'after'
  formula?: string
  variables?: Record<string, number>
}

export type SectionInput = {
  id?: string
  theme?: SectionTheme
  interlockVariant?: InterlockVariant | null
  glow?: GlowPosition
  rule?: boolean
  content: string
  topic?: string
  className?: string
  pinned?: boolean
  diagram?: DiagramJSON
  diagramPosition?: 'before' | 'after'
  formula?: string
  variables?: Record<string, number>
}

const COLOR_CYCLE: SectionTheme[] = ['dark-1', 'light-2', 'dark-2', 'light-1']

export function resolveSection(input: SectionInput, nonClosingCount: number): SectionConfig {
  const theme = input.theme ?? COLOR_CYCLE[nonClosingCount % 4]
  const interlockVariant: InterlockVariant | null =
    theme === 'closing'
      ? null
      : (input.interlockVariant ?? cycleInterlockVariant(nonClosingCount))
  const glow: GlowPosition = input.glow ?? cycleGlowPosition(nonClosingCount)
  return {
    id: input.id ?? createId(),
    theme,
    interlockVariant,
    glow,
    rule: input.rule,
    content: input.content,
    topic: input.topic,
    className: input.className,
    pinned: input.pinned,
    diagram: input.diagram,
    diagramPosition: input.diagramPosition,
    formula: input.formula,
    variables: input.variables,
  }
}
```

Also remove the `TabVariant` export from this file — search the file for the remaining reference and delete the line. The `TAB_CYCLE` const is no longer used.

- [ ] **Step 5.4 — Update `src/components/sections/index.ts`**

Replace:

```ts
export { SectionProvider, useSections } from './SectionContext'
export type { SectionConfig, SectionInput, SectionTheme, TabVariant, SectionsContextValue } from './SectionContext'
export { Block } from './Block'
export type { DiagramJSON, DiagramNodeDef, DiagramEdgeDef } from './diagram/types'
```

With:

```ts
export { SectionProvider, useSections } from './SectionContext'
export type { SectionConfig, SectionInput, SectionTheme, SectionsContextValue } from './SectionContext'
export type { InterlockVariant, GlowPosition } from './interlock'
export { Block } from './Block'
export type { DiagramJSON, DiagramNodeDef, DiagramEdgeDef } from './diagram/types'
```

- [ ] **Step 5.5 — Run SectionContext tests to verify they pass**

Run: `pnpm vitest run src/components/sections/SectionContext.test.ts`
Expected: PASS (all theme tests, all interlock tests, all glow tests).

- [ ] **Step 5.6 — Commit**

```bash
git add src/components/sections/SectionContext.tsx src/components/sections/SectionContext.test.ts src/components/sections/index.ts
git commit -m "feat(sections): replace tab cycle with interlockVariant + glow cycle"
```

---

## Task 6: Update `Block.tsx` to render atmosphere + bidirectional clip-path

**Files:**
- Modify: `src/components/sections/Block.tsx`

- [ ] **Step 6.1 — Replace clip-path lookup, prop signature, and render layers**

Open `src/components/sections/Block.tsx`. Replace the file with:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SectionConfig } from './SectionContext'
import type { InterlockVariant } from './interlock'
import { buildClipPath, TAB_DEPTH } from './interlock'
import { streamFlashSpansIn } from '#/utils/streamFlash'
import { useAnimatedHeight } from './useAnimatedHeight'
import { DiagramCanvas } from './diagram/DiagramCanvas'
import { DiagramVariables } from './diagram/DiagramVariables'
import { DiagramCalculo } from './diagram/DiagramCalculo'
import { evaluate } from './diagram/formulaUtils'

interface BlockProps {
  config: SectionConfig
  index: number
  prevVariant: InterlockVariant | null
  nextVariant: InterlockVariant | null
  hasPrev: boolean
  hasNext: boolean
}

export function Block({ config, index, prevVariant, nextVariant, hasPrev, hasNext }: BlockProps) {
  const clipPath = useMemo(
    () => buildClipPath({
      ownVariant: config.interlockVariant,
      prevVariant,
      nextVariant,
      hasPrev,
      hasNext,
    }),
    [config.interlockVariant, prevVariant, nextVariant, hasPrev, hasNext],
  )

  // Section overlaps with predecessor only if there is geometry that links them
  // (own up-tab + prev cut both require ownVariant && prevVariant). Otherwise stay flush.
  const hasTopFeatures = config.interlockVariant !== null && prevVariant !== null
  const overlap = hasTopFeatures && index > 0 ? -TAB_DEPTH * 2 : 0

  const contentRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (contentRef.current) streamFlashSpansIn(contentRef.current)
  }, [config.content])

  useAnimatedHeight(sectionRef, config.content)

  const hasDiagram = !!config.diagram
  const position = config.diagramPosition ?? 'after'

  return (
    <section
      ref={sectionRef}
      id={config.id}
      data-theme={config.theme}
      data-glow={config.glow}
      data-interlock={config.interlockVariant ?? 'none'}
      data-diagram-position={hasDiagram ? position : undefined}
      className={`block-section${config.className ? ` ${config.className}` : ''}`}
      style={{
        clipPath: clipPath === 'none' ? undefined : clipPath,
        marginTop: overlap,
        position: 'relative',
        zIndex: 1000 - index * 10,
      }}
    >
      <div className="aurora" aria-hidden="true" />
      <div className="dot-grid" aria-hidden="true" />

      {config.rule && <div className="block-rule" aria-hidden="true" />}
      {config.topic && <small className="block-topic">{config.topic}</small>}

      {hasDiagram ? (
        <SplitLayout config={config} position={position} contentRef={contentRef} />
      ) : (
        <div
          ref={contentRef}
          className="block-content"
          dangerouslySetInnerHTML={{ __html: config.content }}
        />
      )}
    </section>
  )
}

function SplitLayout({
  config,
  position,
  contentRef,
}: {
  config: SectionConfig
  position: 'before' | 'after'
  contentRef: React.RefObject<HTMLDivElement | null>
}) {
  const diagramOrderClass = position === 'before' ? 'md:order-1' : 'md:order-2'
  const textOrderClass = position === 'before' ? 'md:order-2' : 'md:order-1'
  const mobileOrderDiagram = position === 'before' ? 'order-1' : 'order-2'
  const mobileOrderText = position === 'before' ? 'order-2' : 'order-1'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
      <div className={`${mobileOrderDiagram} ${diagramOrderClass} w-full`}>
        {config.diagram && <DiagramCanvas data={config.diagram} />}
      </div>
      <div className={`${mobileOrderText} ${textOrderClass} w-full min-w-0`}>
        <div
          ref={contentRef}
          className="block-content"
          dangerouslySetInnerHTML={{ __html: config.content }}
        />
        {config.formula && (
          <FormulaPanel
            formula={config.formula}
            baselineVariables={config.variables ?? {}}
          />
        )}
      </div>
    </div>
  )
}

function FormulaPanel({
  formula,
  baselineVariables,
}: {
  formula: string
  baselineVariables: Record<string, number>
}) {
  const [localVars, setLocalVars] = useState(baselineVariables)

  useEffect(() => {
    setLocalVars(baselineVariables)
  }, [baselineVariables])

  const result = useMemo(() => evaluate(formula, localVars), [formula, localVars])

  function handleChange(name: string, value: number) {
    setLocalVars((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="mt-6 pt-6 border-t border-[var(--prose-grid-gap)]">
      <DiagramVariables variables={localVars} onChange={handleChange} />
      <DiagramCalculo formula={formula} result={result} />
    </div>
  )
}
```

**Note:** the dot-grid layer uses `.dot-grid` (not `.grid`) to avoid colliding with Tailwind's `grid` utility used inside `SplitLayout`.

- [ ] **Step 6.2 — Verify TypeScript still compiles**

Run: `pnpm vitest run --no-coverage src/components/sections/Block.test.tsx` (will fail — props changed). Don't worry about test failures yet; we'll update the test in Task 7. Confirm the failure is about props (e.g., `prevTab` not assignable), not a TS compile error in the Block component itself.

If there is a real compile error in Block.tsx, fix it before moving on.

- [ ] **Step 6.3 — Commit**

```bash
git add src/components/sections/Block.tsx
git commit -m "feat(block): render aurora/grid layers + bidirectional clip-path"
```

---

## Task 7: Update `Block.test.tsx` and `index.tsx` for new prop signature

**Files:**
- Modify: `src/components/sections/Block.test.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 7.1 — Update Block tests**

Open `src/components/sections/Block.test.tsx`. Apply the following changes:

(a) Replace the `base` constant:

```ts
const base: SectionConfig = {
  id: 'test-id',
  theme: 'dark-1',
  interlockVariant: 'A',
  glow: 'tr',
  content: '<h2>Test heading</h2><p>Test body</p>',
}
```

(b) Replace **every** call signature from `<Block config={...} index={...} prevTab="..." />` to use the new four-prop signature. Use these defaults for renders that previously passed `prevTab="none"`:

```tsx
<Block config={base} index={0} prevVariant={null} nextVariant={null} hasPrev={false} hasNext={false} />
```

Use a non-null variant + `hasPrev=true` when the test specifically targets the negative-margin behaviour.

(c) Replace the data-tab assertion test with a data-interlock assertion. Replace:

```ts
it('sets data-tab attribute', () => {
  const { container } = render(<Block config={base} index={0} prevTab="none" />)
  expect(container.querySelector('[data-tab="center"]')).toBeTruthy()
})
```

With:

```ts
it('sets data-interlock attribute', () => {
  const { container } = render(<Block config={base} index={0} prevVariant={null} nextVariant={null} hasPrev={false} hasNext={false} />)
  expect(container.querySelector('[data-interlock="A"]')).toBeTruthy()
})

it('sets data-interlock="none" when interlockVariant is null', () => {
  const { container } = render(
    <Block
      config={{ ...base, interlockVariant: null, theme: 'closing' }}
      index={0}
      prevVariant={null}
      nextVariant={null}
      hasPrev={false}
      hasNext={false}
    />,
  )
  expect(container.querySelector('[data-interlock="none"]')).toBeTruthy()
})

it('sets data-glow attribute from config.glow', () => {
  const { container } = render(
    <Block config={{ ...base, glow: 'bl' }} index={0} prevVariant={null} nextVariant={null} hasPrev={false} hasNext={false} />,
  )
  expect(container.querySelector('[data-glow="bl"]')).toBeTruthy()
})

it('renders aurora layer', () => {
  const { container } = render(<Block config={base} index={0} prevVariant={null} nextVariant={null} hasPrev={false} hasNext={false} />)
  expect(container.querySelector('.aurora')).toBeTruthy()
})

it('renders dot-grid layer', () => {
  const { container } = render(<Block config={base} index={0} prevVariant={null} nextVariant={null} hasPrev={false} hasNext={false} />)
  expect(container.querySelector('.block-section > .dot-grid')).toBeTruthy()
})
```

(d) Replace the two margin-top assertions:

```ts
it('sets margin-top to -12px when index > 0 and prevTab is not none', () => {
  const { container } = render(<Block config={base} index={2} prevTab="center" />)
  const section = container.querySelector('section') as HTMLElement
  expect(section.style.marginTop).toBe('-12px')
})

it('does not set negative margin-top when prevTab is none', () => {
  const { container } = render(<Block config={base} index={2} prevTab="none" />)
  const section = container.querySelector('section') as HTMLElement
  expect(section.style.marginTop).not.toBe('-12px')
})
```

With:

```ts
it('sets margin-top to -56px when index > 0 and prev is non-closing', () => {
  const { container } = render(<Block config={base} index={2} prevVariant="B" nextVariant={null} hasPrev={true} hasNext={false} />)
  const section = container.querySelector('section') as HTMLElement
  expect(section.style.marginTop).toBe('-56px')
})

it('does not set negative margin-top when index === 0', () => {
  const { container } = render(<Block config={base} index={0} prevVariant={null} nextVariant={null} hasPrev={false} hasNext={false} />)
  const section = container.querySelector('section') as HTMLElement
  expect(section.style.marginTop).not.toBe('-56px')
})

it('does not set negative margin-top when prev is closing (prevVariant=null but hasPrev=true)', () => {
  const { container } = render(<Block config={base} index={2} prevVariant={null} nextVariant={null} hasPrev={true} hasNext={false} />)
  const section = container.querySelector('section') as HTMLElement
  expect(section.style.marginTop).not.toBe('-56px')
})

it('does not set negative margin-top when own interlockVariant is null (closing section)', () => {
  const { container } = render(
    <Block
      config={{ ...base, interlockVariant: null, theme: 'closing' }}
      index={2}
      prevVariant="A"
      nextVariant={null}
      hasPrev={true}
      hasNext={false}
    />,
  )
  const section = container.querySelector('section') as HTMLElement
  expect(section.style.marginTop).not.toBe('-56px')
})
```

- [ ] **Step 7.2 — Update `src/routes/index.tsx`**

Open `src/routes/index.tsx`. Replace the `Landing` function with:

```tsx
function Landing() {
  const { sections } = useSections()
  return (
    <main>
      {sections.map((config, index) => (
        <Block
          key={config.id}
          config={config}
          index={index}
          prevVariant={index === 0 ? null : sections[index - 1].interlockVariant}
          nextVariant={index === sections.length - 1 ? null : sections[index + 1].interlockVariant}
          hasPrev={index > 0}
          hasNext={index < sections.length - 1}
        />
      ))}
    </main>
  )
}
```

- [ ] **Step 7.3 — Run the full test suite**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 7.4 — Commit**

```bash
git add src/components/sections/Block.test.tsx src/routes/index.tsx
git commit -m "test(block): update prop signature to prev/next variant; wire route"
```

---

## Task 8: Atmospheric CSS — `.aurora`, `.dot-grid`, top hairline, padding/margin

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 8.1 — Insert atmospheric layers and update the `.block-section` padding**

Open `src/styles.css`. Find the existing `.block-section` block (around lines 19–46). Replace it with:

```css
/* ─── Block section ──────────────────────────────────────────────────────── */

.block-section {
  position: relative;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: calc(4rem + 28px);
  padding-bottom: calc(4rem + 28px);
  isolation: isolate;
  overflow: hidden;
}

@media (min-width: 768px) {
  .block-section {
    padding-left: 4rem;
    padding-right: 4rem;
    padding-top: calc(6rem + 28px);
    padding-bottom: calc(6rem + 28px);
  }
}

/* Closing sections have no own up/down tabs — collapse the extra padding.
   (Stacked closings touch flat with a 1px border between them; the rule below
   in Task 2 handles the inter-closing separator.) */
.block-section[data-interlock="none"] {
  padding-top: 4rem;
  padding-bottom: 4rem;
}

@media (min-width: 768px) {
  .block-section[data-interlock="none"] {
    padding-top: 6rem;
    padding-bottom: 6rem;
  }
}

/* Top hairline — accent gradient strip across the upper edge */
.block-section::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  pointer-events: none;
  z-index: 2;
}
.block-section[data-theme="dark-1"]::before,
.block-section[data-theme="dark-2"]::before,
.block-section[data-theme="closing"]::before {
  background: linear-gradient(to right,
    transparent 0%, rgba(255,107,43,0.55) 25%, rgba(255,180,140,0.35) 55%, transparent 100%);
}
.block-section[data-theme="light-1"]::before,
.block-section[data-theme="light-2"]::before {
  background: linear-gradient(to right,
    transparent 0%, rgba(255,107,43,0.7) 25%, rgba(212,74,19,0.4) 55%, transparent 100%);
}

/* Aurora glow — radial pool of light in a corner */
.block-section > .aurora {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.block-section[data-glow="tr"] { --glow-x: 92%; --glow-y: -10%; }
.block-section[data-glow="tl"] { --glow-x: 8%;  --glow-y: -10%; }
.block-section[data-glow="br"] { --glow-x: 92%; --glow-y: 110%; }
.block-section[data-glow="bl"] { --glow-x: 8%;  --glow-y: 110%; }

.block-section[data-theme="dark-1"] > .aurora,
.block-section[data-theme="dark-2"] > .aurora,
.block-section[data-theme="closing"] > .aurora {
  background:
    radial-gradient(ellipse 60% 50% at var(--glow-x, 92%) var(--glow-y, -10%), rgba(255,107,43,0.22), transparent 60%),
    radial-gradient(ellipse 40% 30% at var(--glow-x, 80%) var(--glow-y, -20%), rgba(255,180,140,0.10), transparent 60%);
}
.block-section[data-theme="light-1"] > .aurora,
.block-section[data-theme="light-2"] > .aurora {
  background:
    radial-gradient(ellipse 55% 50% at var(--glow-x, 90%) var(--glow-y, -10%), rgba(255,107,43,0.18), transparent 60%),
    radial-gradient(ellipse 35% 28% at var(--glow-x, 78%) var(--glow-y, -18%), rgba(255,180,140,0.14), transparent 60%);
}

/* Dot grid — barely-there texture */
.block-section > .dot-grid {
  position: absolute;
  inset: 0;
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, #000 0%, #000 70%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 70%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}
.block-section[data-theme="dark-1"] > .dot-grid,
.block-section[data-theme="dark-2"] > .dot-grid,
.block-section[data-theme="closing"] > .dot-grid {
  background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.045) 1px, transparent 0);
}
.block-section[data-theme="light-1"] > .dot-grid,
.block-section[data-theme="light-2"] > .dot-grid {
  background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0);
}

/* Make sure rule/topic/content sit ABOVE the aurora and dot-grid */
.block-section > .block-rule,
.block-section > .block-topic,
.block-section > .block-content,
.block-section > div:not(.aurora):not(.dot-grid) {
  position: relative;
  z-index: 1;
}
```

The closing-pair separator (`.block-section[data-theme="closing"] + .block-section[data-theme="closing"]`) was moved into Task 2; verify it's still present in the file and remove duplicates if necessary.

- [ ] **Step 8.2 — Run dev server and verify atmosphere visually**

Run: `pnpm dev` (background). Open `http://localhost:3000`. Confirm:
- Each section has a soft orange glow in a corner.
- Hairline runs along the top of each section.
- A dot grid is barely visible (especially on the first section).
- No layout breakage.

Stop the dev server.

- [ ] **Step 8.3 — Commit**

```bash
git add src/styles.css
git commit -m "feat(styles): aurora glow + dot grid + top hairline layers"
```

---

## Task 9: Apply mono typography to `small`, `.block-topic`, and new `.pill` class

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 9.1 — Update typography classes**

In `src/styles.css`, find the existing `.block-content small` rule (current lines 164–172) and the `.block-topic` rule (lines 174–182). Replace both with:

```css
.block-content small {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--prose-muted);
  margin-bottom: 1rem;
}

.block-topic {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--prose-accent);
  margin-bottom: 1rem;
}
```

- [ ] **Step 9.2 — Add the new `.pill` class block**

Append after the `.block-topic` rule:

```css
/* ─── Mono pill badge ────────────────────────────────────────────────────── */

.block-content .pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--prose-muted);
  padding: 5px 9px;
  border: 1px solid var(--prose-grid-gap);
  border-radius: 4px;
}

.block-content .pill.live { color: var(--prose-accent); }
.block-content .pill.live::before {
  content: '';
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--prose-accent);
  box-shadow: 0 0 8px var(--prose-accent);
}
```

- [ ] **Step 9.3 — Verify dev server**

Run: `pnpm dev` (background). Confirm that the existing `<small>El cómo</small>` and similar mono labels now render in JetBrains Mono. Stop the server.

- [ ] **Step 9.4 — Commit**

```bash
git add src/styles.css
git commit -m "feat(styles): mono typography for small/topic + new .pill class"
```

---

## Task 10: Gradient text + glowing dot

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 10.1 — Add `.grad` and `.glow-dot` classes**

In `src/styles.css`, append after the existing `.block-content [data-accent]` rule (around line 162):

```css
/* ─── Gradient text accent ──────────────────────────────────────────────── */

.block-content .grad {
  background: linear-gradient(120deg, var(--prose-accent-soft) 0%, var(--prose-accent) 70%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* ─── Inline glow dot anchor ────────────────────────────────────────────── */

.block-content .glow-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--prose-accent);
  box-shadow: 0 0 12px var(--prose-accent);
  vertical-align: 1px;
  margin-right: 8px;
  animation: glow-dot-pulse 2.4s ease-in-out infinite;
}

@keyframes glow-dot-pulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .block-content .glow-dot,
  .block-content .pill.live::before {
    animation: none;
  }
}
```

- [ ] **Step 10.2 — Commit**

```bash
git add src/styles.css
git commit -m "feat(styles): .grad gradient text + .glow-dot inline anchor"
```

---

## Task 11: Glass `.chip` and `.panel`

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 11.1 — Add chip and panel classes**

In `src/styles.css`, append at the end of the file (after all other rules):

```css
/* ─── Glass CTA chip ─────────────────────────────────────────────────────── */

.block-content .chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 17px 11px 15px;
  border-radius: 999px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.block-content .chip:hover { transform: translateY(-1px); }

.block-content .chip .arrow {
  font-family: var(--font-mono);
  color: var(--prose-accent);
}

.block-section[data-theme="dark-1"] .block-content .chip,
.block-section[data-theme="dark-2"] .block-content .chip,
.block-section[data-theme="closing"] .block-content .chip {
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  color: var(--prose-heading);
}

.block-section[data-theme="light-1"] .block-content .chip,
.block-section[data-theme="light-2"] .block-content .chip {
  background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35));
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.04);
  color: var(--prose-heading);
}

/* ─── Glass panel container ──────────────────────────────────────────────── */

.block-content .panel {
  display: block;
  padding: 22px 26px;
  border-radius: 10px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  margin: 1.25rem 0;
}

.block-section[data-theme="dark-1"] .block-content .panel,
.block-section[data-theme="dark-2"] .block-content .panel,
.block-section[data-theme="closing"] .block-content .panel {
  background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}

.block-section[data-theme="light-1"] .block-content .panel,
.block-section[data-theme="light-2"] .block-content .panel {
  background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3));
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.04);
}
```

- [ ] **Step 11.2 — Smoke-test with a quick HTML inline test**

Temporarily edit `src/routes/index.tsx` `INITIAL_SECTIONS` to add this in the hero `content`:

```html
<p style="margin-top: 32px;"><a class="chip">Hablar con AZENT <span class="arrow">→</span></a></p>
```

Run: `pnpm dev` (background). Confirm the glass chip renders. Confirm it's readable in both light and dark themes (you'll need to scroll). Stop the server and **revert** the inline edit you just made (don't commit the temporary content).

- [ ] **Step 11.3 — Commit**

```bash
git add src/styles.css
git commit -m "feat(styles): .chip glass CTA + .panel glass container"
```

---

## Task 12: Card glow corner

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 12.1 — Add glow corner to `.block-card`**

In `src/styles.css`, find the existing `.block-content .block-card` rule (around line 234). Add a sibling rule:

```css
.block-content .block-card { position: relative; }

.block-content .block-card::after {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 90px;
  height: 90px;
  background: radial-gradient(circle at 100% 0%, rgba(255,107,43,0.10), transparent 70%);
  pointer-events: none;
}
```

- [ ] **Step 12.2 — Run dev server and verify the closing cards have orange glow corner**

Run: `pnpm dev` (background). Scroll to the bottom closing section. Confirm each card has a subtle orange glow at its top-right. Stop the server.

- [ ] **Step 12.3 — Commit**

```bash
git add src/styles.css
git commit -m "feat(styles): orange glow corner on .block-card"
```

---

## Task 13: Update `AGENTS.md` with semantic vocabulary

**Files:**
- Modify: `.codex-browser-agent/AGENTS.md`

- [ ] **Step 13.1 — Insert the new section**

Open `.codex-browser-agent/AGENTS.md`. Find the `## Contact` section header (currently around line 211). Insert the following block immediately **before** the `## Contact` section:

```markdown
## Vocabulario semántico (componentes del sistema)

Además de las utility classes de Tailwind, AZENT tiene un pequeño set de componentes con identidad visual propia. Úsalos en lugar de re-implementarlos con Tailwind cuando encajen — son el "vocabulario" visual del sitio.

| Clase | Para qué | Ejemplo |
|---|---|---|
| `.grad` | Resaltar 2–5 palabras clave en un heading con gradiente naranja | `<h2>Hay un <span class="grad">antes y un después</span> de la IA.</h2>` |
| `.pill` | Mostrar metadata corta en estilo mono (versión, etiqueta, estado) | `<span class="pill">v2026.05</span>` |
| `.pill.live` | Pill con dot naranja animado (estados activos) | `<span class="pill live">En producción</span>` |
| `.chip` | CTA principal de la sección (1 max), estilo glass blur | `<a class="chip" href="#contact">Hablar con AZENT <span class="arrow">→</span></a>` |
| `.panel` | Caja glass para destacar contenido secundario | `<div class="panel"><h3>…</h3><p>…</p></div>` |
| `.glow-dot` | Dot naranja con glow, inline, para anclar una frase clave (1 max por bloque) | `<h2><span class="glow-dot"></span>Partner técnico</h2>` |
| `.accent` | Acento naranja simple en texto (mantener para palabras cortas, prefiere `.grad` para frases) | `<span class="accent">por encima</span>` |

**Reglas de composición:**

- Una sección no debería tener más de **1 `.chip`**, **1 `.glow-dot`**, **1 `.grad`** simultáneos. Si necesitas varios resaltes, usa `<strong>` para el resto.
- `.pill` es flexible — se pueden agrupar 2–3 en una fila como header de sección.
- `.panel` no se anida dentro de `.block-cards` (los cards tienen ya su propio fondo).
- Los componentes ya estilizan colores por tema — no añadas Tailwind text-orange-XXX encima.

**Cuándo usar Tailwind vs vocabulario semántico:**

Usa **vocabulario semántico** cuando el componente exista y encaje (CTA → `.chip`, no `<button class="bg-orange-500 ...">`).
Usa **Tailwind** para layout (`grid`, `flex`, `gap-*`, `mt-*`) y para variaciones tipográficas puntuales que no entran en los componentes anteriores.

---
```

- [ ] **Step 13.2 — Commit**

```bash
git add .codex-browser-agent/AGENTS.md
git commit -m "docs(agents): add semantic vocabulary section for new visual classes"
```

---

## Task 14: Full integration smoke check

**Files:**
- No files modified — verification only.

- [ ] **Step 14.1 — Run the full test suite**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 14.2 — Run TypeScript check via build**

Run: `pnpm build`
Expected: build succeeds with no TS errors.

- [ ] **Step 14.3 — Run the dev server and walk the full page**

Run: `pnpm dev` (background). Open `http://localhost:3000`. Scroll through the entire page and confirm:
- Each section has an aurora glow in a different corner.
- Hairline orange line crosses the top of each section.
- Bidirectional 28px tabs are visible at each section boundary — two trapezoidal teeth, one going down from the previous and one going up from the next, in different x positions.
- Body text on dark sections is legibly grey (`#b8b8b8`).
- Light sections are warm off-white (`#f6f4ef`).
- Body text on light sections is legibly dark (`#4a4a4a`).
- `<small>` labels render in JetBrains Mono with wider tracking.
- Closing cards at the bottom have a subtle orange glow at top-right.
- No horizontal scrollbar, no layout breakage on mobile (resize browser to 375px width).

Stop the dev server.

- [ ] **Step 14.4 — Final commit if anything needed adjusting**

If any small CSS tweak was needed during verification, commit it. Otherwise this step is a no-op.

---

## Out of scope reminder

The following are deliberately **not** included in this plan (per spec section 10):

- SVG mask trace over the interlocking corte with glow.
- Animated sweep on the top hairline.
- Migrating existing `INITIAL_SECTIONS` content to use the new vocabulary (`.grad`, `.chip`, `.glow-dot`). The system is delivered; applying it to the copy is a follow-up content task.
- UI for forcing a specific glow position per section (auto-assigned by index; `glow?` in config is the override path if needed manually).
- Image / media support inside blocks.
