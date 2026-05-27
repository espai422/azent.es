# Block System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AZENT landing page's static section components with a dynamic block system where sections have polygonal interlocking shapes, a 4-tone color cycle, and a React Context API that lets AI push new blocks at runtime.

**Architecture:** A `SectionProvider` (React Context + useReducer) holds a `SectionConfig[]` array. Each config stores `theme`, `tab`, `rule`, and raw HTML `content`. A `Block` component renders each config as a `<section>` with CSS clip-path (tab at bottom) and Block Prose styles that adapt to the theme via CSS custom properties. Sections overlap by 12px via `margin-top: -12px` and a decreasing `z-index` so the previous section's tab is always visible on top.

**Tech Stack:** React 18, TanStack Start (TanStack Router), Tailwind v4, Vitest + @testing-library/react, TypeScript strict

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/sections/SectionContext.tsx` | Create | Types, resolveSection, reducer, Provider, useSections hook |
| `src/components/sections/SectionContext.test.ts` | Create | Tests for resolveSection + reducer |
| `src/components/sections/Block.tsx` | Create | Renders one SectionConfig as a styled `<section>` |
| `src/components/sections/Block.test.tsx` | Create | Tests for Block rendering |
| `src/components/sections/index.ts` | Create | Re-exports |
| `src/styles.css` | Modify | Block Prose stylesheet + theme tokens + clip-path + responsive |
| `src/routes/index.tsx` | Modify | Landing wraps in SectionProvider + iterates sections via Block |
| `src/components/landing/*.tsx` | Delete | Content migrated to SectionConfig.content HTML strings |
| `BLOCK_CONTENT_GUIDE.md` | Create | LLM contract — available tags, limits, patterns |

---

## Task 1: Types + resolveSection (TDD)

**Files:**
- Create: `src/components/sections/SectionContext.tsx`
- Create: `src/components/sections/SectionContext.test.ts`

- [ ] **Step 1.1 — Write the failing tests**

Create `src/components/sections/SectionContext.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveSection } from './SectionContext'

describe('resolveSection — theme cycle', () => {
  it('assigns dark-1 at position 0', () => {
    expect(resolveSection({ content: '' }, 0).theme).toBe('dark-1')
  })
  it('assigns light-2 at position 1', () => {
    expect(resolveSection({ content: '' }, 1).theme).toBe('light-2')
  })
  it('assigns dark-2 at position 2', () => {
    expect(resolveSection({ content: '' }, 2).theme).toBe('dark-2')
  })
  it('assigns light-1 at position 3', () => {
    expect(resolveSection({ content: '' }, 3).theme).toBe('light-1')
  })
  it('wraps back to dark-1 at position 4', () => {
    expect(resolveSection({ content: '' }, 4).theme).toBe('dark-1')
  })
  it('respects explicit theme override', () => {
    expect(resolveSection({ content: '', theme: 'dark-2' }, 0).theme).toBe('dark-2')
  })
})

describe('resolveSection — tab cycle', () => {
  it('assigns center at position 0', () => {
    expect(resolveSection({ content: '' }, 0).tab).toBe('center')
  })
  it('assigns right at position 1', () => {
    expect(resolveSection({ content: '' }, 1).tab).toBe('right')
  })
  it('assigns left at position 2', () => {
    expect(resolveSection({ content: '' }, 2).tab).toBe('left')
  })
  it('wraps back to center at position 3', () => {
    expect(resolveSection({ content: '' }, 3).tab).toBe('center')
  })
  it('forces tab to none when theme is closing', () => {
    expect(resolveSection({ content: '', theme: 'closing' }, 0).tab).toBe('none')
  })
  it('respects explicit tab override', () => {
    expect(resolveSection({ content: '', tab: 'right' }, 0).tab).toBe('right')
  })
})

describe('resolveSection — id + content', () => {
  it('generates a non-empty id', () => {
    expect(resolveSection({ content: '' }, 0).id).toBeTruthy()
  })
  it('generates unique ids', () => {
    const a = resolveSection({ content: '' }, 0)
    const b = resolveSection({ content: '' }, 0)
    expect(a.id).not.toBe(b.id)
  })
  it('preserves content', () => {
    expect(resolveSection({ content: '<p>hello</p>' }, 0).content).toBe('<p>hello</p>')
  })
  it('preserves rule', () => {
    expect(resolveSection({ content: '', rule: true }, 0).rule).toBe(true)
  })
  it('preserves className', () => {
    expect(resolveSection({ content: '', className: 'foo' }, 0).className).toBe('foo')
  })
})
```

- [ ] **Step 1.2 — Run tests, confirm they fail**

```bash
pnpm vitest run src/components/sections/SectionContext.test.ts
```

Expected: all tests FAIL with "Cannot find module './SectionContext'"

- [ ] **Step 1.3 — Implement types + resolveSection**

Create `src/components/sections/SectionContext.tsx`:

```tsx
import { createContext, useContext, useReducer, type ReactNode } from 'react'

export type SectionTheme = 'dark-1' | 'light-2' | 'dark-2' | 'light-1' | 'closing'
export type TabVariant = 'center' | 'right' | 'left' | 'none'

export interface SectionConfig {
  id: string
  theme: SectionTheme
  tab: TabVariant
  rule?: boolean
  content: string
  className?: string
}

export type SectionInput = {
  theme?: SectionTheme
  tab?: TabVariant
  rule?: boolean
  content: string
  className?: string
}

const COLOR_CYCLE: SectionTheme[] = ['dark-1', 'light-2', 'dark-2', 'light-1']
const TAB_CYCLE: TabVariant[] = ['center', 'right', 'left']

export function resolveSection(input: SectionInput, nonClosingCount: number): SectionConfig {
  const theme = input.theme ?? COLOR_CYCLE[nonClosingCount % 4]
  const tab = theme === 'closing' ? 'none' : (input.tab ?? TAB_CYCLE[nonClosingCount % 3])
  return {
    id: crypto.randomUUID(),
    theme,
    tab,
    rule: input.rule,
    content: input.content,
    className: input.className,
  }
}

// ─── Reducer ────────────────────────────────────────────────────────────────

interface SectionsState { sections: SectionConfig[] }

export type SectionsAction =
  | { type: 'ADD'; payload: SectionInput }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' }
  | { type: 'RESET'; payload: SectionInput[] }

function countNonClosing(sections: SectionConfig[]): number {
  return sections.filter(s => s.theme !== 'closing').length
}

export function sectionsReducer(state: SectionsState, action: SectionsAction): SectionsState {
  switch (action.type) {
    case 'ADD': {
      const count = countNonClosing(state.sections)
      return { sections: [...state.sections, resolveSection(action.payload, count)] }
    }
    case 'REMOVE':
      return { sections: state.sections.filter(s => s.id !== action.id) }
    case 'CLEAR':
      return { sections: [] }
    case 'RESET': {
      let nonClosingCount = 0
      const sections = action.payload.map(input => {
        const resolved = resolveSection(input, nonClosingCount)
        if (resolved.theme !== 'closing') nonClosingCount++
        return resolved
      })
      return { sections }
    }
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface SectionsContextValue {
  sections: SectionConfig[]
  addSection: (input: SectionInput) => void
  removeSection: (id: string) => void
  clearSections: () => void
  resetSections: (inputs: SectionInput[]) => void
}

const SectionsContext = createContext<SectionsContextValue | null>(null)

function buildInitialState(inputs: SectionInput[] = []): SectionsState {
  return sectionsReducer({ sections: [] }, { type: 'RESET', payload: inputs })
}

export function SectionProvider({
  children,
  initialSections,
}: {
  children: ReactNode
  initialSections?: SectionInput[]
}) {
  const [state, dispatch] = useReducer(sectionsReducer, initialSections, buildInitialState)

  const value: SectionsContextValue = {
    sections: state.sections,
    addSection: (input) => dispatch({ type: 'ADD', payload: input }),
    removeSection: (id) => dispatch({ type: 'REMOVE', id }),
    clearSections: () => dispatch({ type: 'CLEAR' }),
    resetSections: (inputs) => dispatch({ type: 'RESET', payload: inputs }),
  }

  return <SectionsContext.Provider value={value}>{children}</SectionsContext.Provider>
}

export function useSections(): SectionsContextValue {
  const ctx = useContext(SectionsContext)
  if (!ctx) throw new Error('useSections must be used within SectionProvider')
  return ctx
}
```

- [ ] **Step 1.4 — Run tests, confirm they pass**

```bash
pnpm vitest run src/components/sections/SectionContext.test.ts
```

Expected: all tests PASS

- [ ] **Step 1.5 — Commit**

```bash
git add src/components/sections/SectionContext.tsx src/components/sections/SectionContext.test.ts
git commit -m "feat: add SectionContext types, resolveSection, reducer, Provider, and hook"
```

---

## Task 2: Reducer tests

**Files:**
- Modify: `src/components/sections/SectionContext.test.ts`

- [ ] **Step 2.1 — Add reducer tests**

Append to `src/components/sections/SectionContext.test.ts`:

```ts
import { sectionsReducer } from './SectionContext'
import type { SectionConfig } from './SectionContext'

describe('sectionsReducer', () => {
  const empty = { sections: [] as SectionConfig[] }

  it('ADD appends a section with auto-resolved theme and tab', () => {
    const state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'hello' } })
    expect(state.sections).toHaveLength(1)
    expect(state.sections[0].content).toBe('hello')
    expect(state.sections[0].theme).toBe('dark-1')
    expect(state.sections[0].tab).toBe('center')
  })

  it('ADD uses nonClosingCount — closing sections do not advance the cycle', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'a' } })           // nonCl=0 → dark-1, center
    state = sectionsReducer(state, { type: 'ADD', payload: { content: 'b', theme: 'closing' } }) // closing (not counted)
    state = sectionsReducer(state, { type: 'ADD', payload: { content: 'c' } })               // nonCl=1 → light-2, right
    expect(state.sections[2].theme).toBe('light-2')
    expect(state.sections[2].tab).toBe('right')
  })

  it('REMOVE removes section by id', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: '' } })
    const { id } = state.sections[0]
    state = sectionsReducer(state, { type: 'REMOVE', id })
    expect(state.sections).toHaveLength(0)
  })

  it('REMOVE leaves other sections untouched', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'a' } })
    state = sectionsReducer(state, { type: 'ADD', payload: { content: 'b' } })
    const idToRemove = state.sections[0].id
    state = sectionsReducer(state, { type: 'REMOVE', id: idToRemove })
    expect(state.sections).toHaveLength(1)
    expect(state.sections[0].content).toBe('b')
  })

  it('CLEAR removes all sections', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: '' } })
    state = sectionsReducer(state, { type: 'ADD', payload: { content: '' } })
    state = sectionsReducer(state, { type: 'CLEAR' })
    expect(state.sections).toHaveLength(0)
  })

  it('RESET replaces all sections and re-resolves them', () => {
    let state = sectionsReducer(empty, { type: 'ADD', payload: { content: 'old' } })
    state = sectionsReducer(state, {
      type: 'RESET',
      payload: [{ content: 'new1' }, { content: 'new2' }],
    })
    expect(state.sections).toHaveLength(2)
    expect(state.sections[0].content).toBe('new1')
    expect(state.sections[1].content).toBe('new2')
    expect(state.sections[0].theme).toBe('dark-1')
    expect(state.sections[1].theme).toBe('light-2')
  })
})
```

- [ ] **Step 2.2 — Run tests, confirm all pass**

```bash
pnpm vitest run src/components/sections/SectionContext.test.ts
```

Expected: all tests PASS

- [ ] **Step 2.3 — Commit**

```bash
git add src/components/sections/SectionContext.test.ts
git commit -m "test: add sectionsReducer tests"
```

---

## Task 3: Block Prose + section CSS

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 3.1 — Add block system CSS to styles.css**

Append the following to `src/styles.css` (after the existing `body` rule):

```css
/* ─── Block section ──────────────────────────────────────────────────────── */

.block-section {
  position: relative;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: 4rem;
  padding-bottom: calc(4rem + 12px);
}

@media (min-width: 768px) {
  .block-section {
    padding-left: 4rem;
    padding-right: 4rem;
    padding-top: 6rem;
    padding-bottom: calc(6rem + 12px);
  }
}

/* Closing sections have no bottom tab — reset bottom padding */
.block-section[data-tab="none"] {
  padding-bottom: 4rem;
}

@media (min-width: 768px) {
  .block-section[data-tab="none"] {
    padding-bottom: 6rem;
  }
}

/* ─── Background colors ──────────────────────────────────────────────────── */

.block-section[data-theme="dark-1"]  { background-color: #0c0c0c; }
.block-section[data-theme="dark-2"]  { background-color: #1a1a1a; }
.block-section[data-theme="light-1"] { background-color: #f8f8f8; }
.block-section[data-theme="light-2"] { background-color: #f0f0f0; }
.block-section[data-theme="closing"] { background-color: #111111; }

/* Subtle separator when two closing sections are adjacent (fusión oscura) */
.block-section[data-theme="closing"] + .block-section[data-theme="closing"] {
  border-top: 1px solid #181818;
}

/* ─── Prose CSS custom properties by theme ───────────────────────────────── */

.block-section[data-theme="dark-1"],
.block-section[data-theme="dark-2"],
.block-section[data-theme="closing"] {
  --prose-heading: #e8e8e8;
  --prose-body: #888888;
  --prose-muted: #444444;
  --prose-accent: #ff6b2b;
  --prose-strong: #e8e8e8;
  --prose-strike-opacity: 0.25;
  --prose-code-bg: #1e1e1e;
  --prose-code-color: #666666;
  --prose-grid-gap: #2a2a2a;
}

.block-section[data-theme="light-1"],
.block-section[data-theme="light-2"] {
  --prose-heading: #111111;
  --prose-body: #555555;
  --prose-muted: #999999;
  --prose-accent: #e55a1a;
  --prose-strong: #111111;
  --prose-strike-opacity: 0.3;
  --prose-code-bg: #eeeeee;
  --prose-code-color: #555555;
  --prose-grid-gap: #d0d0d0;
}

/* ─── Orange rule ─────────────────────────────────────────────────────────── */

.block-rule {
  width: 28px;
  height: 2px;
  background-color: var(--prose-accent);
  margin-bottom: 1.5rem;
}

/* ─── Block content container ─────────────────────────────────────────────── */

.block-content {
  max-width: 42rem;
}

/* ─── Block Prose: typography ────────────────────────────────────────────── */

.block-content h1 {
  font-size: clamp(2rem, 5vw, 3.75rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--prose-heading);
  margin-bottom: 1.5rem;
}

.block-content h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.2;
  color: var(--prose-heading);
  margin-bottom: 1rem;
}

.block-content h3 {
  font-size: clamp(1.1rem, 2vw, 1.35rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: var(--prose-heading);
  margin-bottom: 0.75rem;
}

.block-content p {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--prose-body);
  margin-bottom: 1rem;
}

.block-content p:last-child {
  margin-bottom: 0;
}

.block-content strong {
  font-weight: 600;
  color: var(--prose-strong);
}

.block-content em {
  font-style: italic;
}

.block-content s,
.block-content del {
  text-decoration: line-through;
  opacity: var(--prose-strike-opacity);
}

.block-content .accent,
.block-content [data-accent] {
  color: var(--prose-accent);
}

/* Small: standalone uppercase label — use before headings */
.block-content small {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--prose-muted);
  margin-bottom: 1rem;
}

.block-content code {
  font-family: ui-monospace, monospace;
  font-size: 0.875em;
  background: var(--prose-code-bg);
  color: var(--prose-code-color);
  padding: 0.1em 0.35em;
  border-radius: 3px;
}

.block-content ul,
.block-content ol {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
  color: var(--prose-body);
}

.block-content li {
  margin-bottom: 0.35rem;
  line-height: 1.6;
}

.block-content ul { list-style-type: disc; }
.block-content ol { list-style-type: decimal; }

/* ─── Block Prose: card grid ─────────────────────────────────────────────── */

.block-content .block-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  background-color: var(--prose-grid-gap);
  margin-top: 2rem;
  /* Expand past the .block-content max-width constraint */
  max-width: none;
  width: calc(100% + 3rem);
  margin-left: -1.5rem;
}

@media (min-width: 768px) {
  .block-content .block-cards {
    grid-template-columns: 1fr 1fr;
    width: calc(100% + 8rem);
    margin-left: -4rem;
  }
}

.block-content .block-card {
  padding: 2rem 2.5rem;
}

.block-section[data-theme="dark-1"]  .block-card { background-color: #0c0c0c; }
.block-section[data-theme="dark-2"]  .block-card { background-color: #1a1a1a; }
.block-section[data-theme="light-1"] .block-card { background-color: #f8f8f8; }
.block-section[data-theme="light-2"] .block-card { background-color: #f0f0f0; }
.block-section[data-theme="closing"] .block-card { background-color: #111111; }

.block-content .block-stat {
  display: block;
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 600;
  color: var(--prose-heading);
  margin-bottom: 0.5rem;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3.2 — Verify CSS builds without errors**

```bash
pnpm build 2>&1 | head -20
```

Expected: build succeeds (or only pre-existing errors unrelated to CSS)

- [ ] **Step 3.3 — Commit**

```bash
git add src/styles.css
git commit -m "feat: add block system CSS — prose stylesheet, theme tokens, card grid"
```

---

## Task 4: Block component + tests + index.ts (TDD)

**Files:**
- Create: `src/components/sections/Block.test.tsx`
- Create: `src/components/sections/Block.tsx`
- Create: `src/components/sections/index.ts`

- [ ] **Step 4.1 — Write the failing tests**

Create `src/components/sections/Block.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Block } from './Block'
import type { SectionConfig } from './SectionContext'

const base: SectionConfig = {
  id: 'test-id',
  theme: 'dark-1',
  tab: 'center',
  content: '<h2>Test heading</h2><p>Test body</p>',
}

describe('Block', () => {
  it('renders heading from content HTML', () => {
    render(<Block config={base} index={0} prevTab="none" />)
    screen.getByRole('heading', { level: 2, name: /Test heading/i })
  })

  it('renders paragraph from content HTML', () => {
    render(<Block config={base} index={0} prevTab="none" />)
    screen.getByText(/Test body/, { selector: 'p' })
  })

  it('sets data-theme attribute', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    expect(container.querySelector('[data-theme="dark-1"]')).toBeTruthy()
  })

  it('sets data-tab attribute', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    expect(container.querySelector('[data-tab="center"]')).toBeTruthy()
  })

  it('renders .block-rule when rule is true', () => {
    const { container } = render(
      <Block config={{ ...base, rule: true }} index={0} prevTab="none" />,
    )
    expect(container.querySelector('.block-rule')).toBeTruthy()
  })

  it('does not render .block-rule when rule is omitted', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    expect(container.querySelector('.block-rule')).toBeNull()
  })

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

  it('applies className from config', () => {
    const { container } = render(
      <Block config={{ ...base, className: 'custom-class' }} index={0} prevTab="none" />,
    )
    expect(container.querySelector('.custom-class')).toBeTruthy()
  })
})
```

- [ ] **Step 4.2 — Run tests, confirm they fail**

```bash
pnpm vitest run src/components/sections/Block.test.tsx
```

Expected: FAIL with "Cannot find module './Block'"

- [ ] **Step 4.3 — Implement Block component**

Create `src/components/sections/Block.tsx`:

```tsx
import type { SectionConfig, TabVariant } from './SectionContext'

interface BlockProps {
  config: SectionConfig
  index: number
  prevTab: TabVariant
}

const CLIP_BOTTOM: Record<TabVariant, string> = {
  center: 'polygon(0 0, 100% 0, 100% calc(100% - 12px), 64% calc(100% - 12px), 64% 100%, 36% 100%, 36% calc(100% - 12px), 0 calc(100% - 12px))',
  right:  'polygon(0 0, 100% 0, 100% calc(100% - 12px), 85% calc(100% - 12px), 85% 100%, 57% 100%, 57% calc(100% - 12px), 0 calc(100% - 12px))',
  left:   'polygon(0 0, 100% 0, 100% calc(100% - 12px), 43% calc(100% - 12px), 43% 100%, 15% 100%, 15% calc(100% - 12px), 0 calc(100% - 12px))',
  none:   '',
}

export function Block({ config, index, prevTab }: BlockProps) {
  const clipPath = CLIP_BOTTOM[config.tab] || undefined
  const marginTop = index === 0 || prevTab === 'none' ? 0 : -12

  return (
    <section
      data-theme={config.theme}
      data-tab={config.tab}
      className={`block-section${config.className ? ` ${config.className}` : ''}`}
      style={{ clipPath, marginTop, position: 'relative', zIndex: 1000 - index * 10 }}
    >
      {config.rule && <div className="block-rule" aria-hidden="true" />}
      <div
        className="block-content"
        dangerouslySetInnerHTML={{ __html: config.content }}
      />
    </section>
  )
}
```

- [ ] **Step 4.4 — Create index.ts**

Create `src/components/sections/index.ts`:

```ts
export { SectionProvider, useSections } from './SectionContext'
export type { SectionConfig, SectionInput, SectionTheme, TabVariant, SectionsContextValue } from './SectionContext'
export { Block } from './Block'
```

- [ ] **Step 4.5 — Run tests, confirm all pass**

```bash
pnpm vitest run src/components/sections/Block.test.tsx src/components/sections/SectionContext.test.ts
```

Expected: all tests PASS

- [ ] **Step 4.6 — Commit**

```bash
git add src/components/sections/Block.tsx src/components/sections/Block.test.tsx src/components/sections/index.ts
git commit -m "feat: add Block component and sections re-exports"
```

---

## Task 5: Wire SectionProvider + Landing skeleton

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 5.1 — Replace Landing with Provider-wrapped skeleton**

Replace the full contents of `src/routes/index.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { SectionProvider, useSections, Block } from '#/components/sections'
import type { SectionInput } from '#/components/sections'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  return (
    <SectionProvider initialSections={INITIAL_SECTIONS}>
      <Landing />
    </SectionProvider>
  )
}

function Landing() {
  const { sections } = useSections()
  return (
    <main>
      {sections.map((config, index) => (
        <Block
          key={config.id}
          config={config}
          index={index}
          prevTab={index === 0 ? 'none' : sections[index - 1].tab}
        />
      ))}
    </main>
  )
}

const INITIAL_SECTIONS: SectionInput[] = [
  {
    theme: 'dark-1',
    tab: 'center',
    className: 'flex flex-col justify-end min-h-[70vh] md:min-h-[85vh]',
    content: `
      <h1>No hacemos software. Transformamos cómo opera tu empresa.</h1>
      <p>Desarrollo de software e inteligencia artificial aplicada al negocio real.
      Nos sentamos contigo, entendemos qué frena el crecimiento y construimos
      los sistemas que lo desbloquean — con o sin IA, según lo que tiene sentido.</p>
    `,
  },
  {
    rule: true,
    content: `
      <h2>Hay un <span class="accent">antes y un después</span> de la IA. Pocas empresas han cruzado esa línea.</h2>
      <p>No porque la tecnología no esté disponible. Sino porque aplicarla bien requiere
      entender a fondo el negocio, los procesos y los límites reales de la IA — y eso
      no viene en ningún SaaS genérico. El mercado vende atajos. Los atajos no
      transforman nada.</p>
    `,
  },
  {
    content: `
      <small>Partner</small>
      <h2>Nos involucramos como si fuera nuestro negocio</h2>
      <p>La diferencia entre una agencia y un partner técnico real es que uno ejecuta
      lo que se le pide y el otro pregunta si lo que se pide es lo correcto.
      Nosotros preguntamos. Entendemos la empresa, sus procesos, sus objetivos.
      Proponemos lo que tiene sentido, aunque no sea lo más obvio. Y cuando algo
      no funciona, lo decimos.</p>
    `,
  },
  {
    content: `
      <h2>Cuestionamos el <span class="accent">sistema</span></h2>
      <p>La IA no mejora procesos rotos. Los reemplaza. Automatizar algo ineficiente solo
      lo hace ineficiente más rápido. Por eso nuestro punto de partida nunca es
      "¿cómo automatizamos esto?" sino "¿tiene sentido que esto exista?". Si la
      respuesta es no, lo tiramos y empezamos de cero. El resultado no es lo de
      siempre más barato — es algo que antes directamente no era posible.</p>
    `,
  },
  {
    rule: true,
    content: `
      <small>El cómo</small>
      <h2>Software e IA, sin separación artificial</h2>
      <p>No hacemos "proyectos de IA" por un lado y "proyectos de software" por otro.
      Para nosotros es lo mismo: crear soluciones. Lo que importa no es la
      tecnología que hay debajo — es que el sistema resuelva el problema real.</p>
      <p>Cuando la IA aporta valor, la integramos con la profundidad que requiere
      cada caso — desde una integración puntual hasta sistemas que razonan y
      actúan de forma autónoma. Cuando no hace falta, construimos con desarrollo
      tradicional apoyado en IA, lo que nos permite mover más rápido y a menor
      coste que la competencia sin sacrificar calidad.</p>
      <p>El resultado, en cualquier caso, son sistemas que hacen cosas que antes
      requerían personas: analizar, decidir, actuar, comunicar. Arquitectura que
      escala con el negocio y devuelve tiempo al equipo para invertirlo en lo que
      realmente importa.</p>
    `,
  },
  {
    content: `
      <h2>Pragmáticos <span class="accent">por encima</span> de todo</h2>
      <p>El mercado de la IA está lleno de promesas que no sobreviven al contacto
      con la realidad. Nosotros operamos al revés: entendemos bien qué puede hacer
      la IA hoy — y qué no puede — y desde ahí encontramos las soluciones más
      creativas y útiles. Sin burocracia innecesaria, sin procesos que existen para
      justificarse a sí mismos. Foco total en crear impacto real.</p>
    `,
  },
  {
    theme: 'closing',
    content: `
      <p>La pregunta no es si tu empresa puede mejorar con IA. Es cuánto estás dejando
      sobre la mesa cada día que no lo hace.</p>
      <div class="block-cards">
        <div class="block-card">
          <span class="block-stat">XX h/semana</span>
          <p><strong>Onboarding de clientes automatizado</strong></p>
          <p>Sin emails manuales, sin formularios, sin seguimiento a mano.</p>
        </div>
        <div class="block-card">
          <span class="block-stat">€XX k/año</span>
          <p><strong>Procesado de documentos y contratos</strong></p>
          <p>Lo que cuesta un perfil administrativo haciendo tareas que un sistema puede hacer.</p>
        </div>
        <div class="block-card">
          <span class="block-stat">XX%</span>
          <p><strong>Reducción de tiempo en reporting</strong></p>
          <p>Dashboards y análisis que antes costaban horas, generados en segundos.</p>
        </div>
        <div class="block-card">
          <span class="block-stat">···</span>
          <p><strong>El tuyo aquí</strong></p>
          <p>Cada empresa tiene un proceso que no tiene sentido en un mundo con IA.</p>
        </div>
      </div>
    `,
  },
  {
    theme: 'closing',
    className: 'flex flex-col items-end justify-end min-h-[30vh]',
    content: `<p>No buscamos clientes. Buscamos empresas que quieran operar diferente.</p>`,
  },
]
```

- [ ] **Step 5.2 — Verify TypeScript compiles without errors**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors from the new files

- [ ] **Step 5.3 — Start dev server and visually verify sections render**

```bash
pnpm dev
```

Open http://localhost:3000. You should see 8 sections with alternating dark/light backgrounds, interlocking tabs at section boundaries, and the closing pair merging into a dark block. Check on mobile width (375px) as well — sections should stack cleanly, typography should scale.

- [ ] **Step 5.4 — Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: wire SectionProvider and Landing to render from section context"
```

---

## Task 6: Delete old landing components

**Files:**
- Delete: `src/components/landing/Hero.tsx`
- Delete: `src/components/landing/Hero.test.tsx`
- Delete: `src/components/landing/Context.tsx`
- Delete: `src/components/landing/Context.test.tsx`
- Delete: `src/components/landing/Partner.tsx`
- Delete: `src/components/landing/Partner.test.tsx`
- Delete: `src/components/landing/SystemChallenge.tsx`
- Delete: `src/components/landing/SystemChallenge.test.tsx`
- Delete: `src/components/landing/HowWeWork.tsx`
- Delete: `src/components/landing/HowWeWork.test.tsx`
- Delete: `src/components/landing/Philosophy.tsx`
- Delete: `src/components/landing/Philosophy.test.tsx`
- Delete: `src/components/landing/Examples.tsx`
- Delete: `src/components/landing/Examples.test.tsx`
- Delete: `src/components/landing/Closing.tsx`
- Delete: `src/components/landing/Closing.test.tsx`

- [ ] **Step 6.1 — Delete old components**

```bash
rm src/components/landing/Hero.tsx src/components/landing/Hero.test.tsx
rm src/components/landing/Context.tsx src/components/landing/Context.test.tsx
rm src/components/landing/Partner.tsx src/components/landing/Partner.test.tsx
rm src/components/landing/SystemChallenge.tsx src/components/landing/SystemChallenge.test.tsx
rm src/components/landing/HowWeWork.tsx src/components/landing/HowWeWork.test.tsx
rm src/components/landing/Philosophy.tsx src/components/landing/Philosophy.test.tsx
rm src/components/landing/Examples.tsx src/components/landing/Examples.test.tsx
rm src/components/landing/Closing.tsx src/components/landing/Closing.test.tsx
```

- [ ] **Step 6.2 — Run full test suite**

```bash
pnpm test
```

Expected: only the new Block and SectionContext tests remain. All PASS.

- [ ] **Step 6.3 — Run production build to verify no dangling imports**

```bash
pnpm build
```

Expected: build succeeds with no errors.

- [ ] **Step 6.4 — Commit**

```bash
git add -A
git commit -m "feat: remove old landing components — content migrated to SectionConfig"
```

---

## Task 7: BLOCK_CONTENT_GUIDE.md

**Files:**
- Create: `BLOCK_CONTENT_GUIDE.md`

- [ ] **Step 7.1 — Create the LLM content guide**

Create `BLOCK_CONTENT_GUIDE.md` in the project root:

```markdown
# Block Content Guide

Reference for generating HTML content for AZENT landing page blocks.
This file is the contract between the block system and any LLM producing content.

---

## Available tags

| Tag | Visual result |
|-----|---------------|
| `<h2>text</h2>` | Large heading, ~1.5–2rem, semibold, heading color |
| `<h3>text</h3>` | Medium heading, ~1.1–1.35rem, medium weight |
| `<p>text</p>` | Body paragraph, 1rem, muted color |
| `<strong>text</strong>` | Bold, heading color |
| `<em>text</em>` | Italic |
| `<s>text</s>` or `<del>text</del>` | Strikethrough, low opacity |
| `<span class="accent">text</span>` | Orange highlight (#ff6b2b on dark, #e55a1a on light) |
| `<small>text</small>` | Standalone label: 0.7rem, uppercase, muted. Use as first element before a heading |
| `<code>text</code>` | Monospace, subtle background |
| `<ul><li>…</li></ul>` | Bullet list |
| `<ol><li>…</li></ul>` | Numbered list |

---

## Structured component: card grid

For metrics, case examples, or feature lists with prominent numbers:

```html
<div class="block-cards">
  <div class="block-card">
    <span class="block-stat">XX h/semana</span>
    <p><strong>Título del caso</strong></p>
    <p>Descripción breve del impacto.</p>
  </div>
  <div class="block-card">
    <span class="block-stat">€XX k/año</span>
    <p><strong>Otro caso</strong></p>
    <p>Descripción breve.</p>
  </div>
</div>
```

- `block-cards` renders as a 2-column grid (desktop) / 1-column (mobile)
- `block-stat` is the large prominent number/metric
- Card backgrounds adapt automatically to the section theme — do not set colors

---

## Colors adapt automatically

All text colors are controlled by the section's `theme` (dark-1, dark-2, light-1, light-2, closing).
You MUST NOT specify colors in HTML. The only color you can apply is the accent via `class="accent"`.

---

## Content limits (mobile-first)

| Element | Maximum |
|---------|---------|
| `<h2>` | **80 characters** — longer headings wrap to 3+ lines on mobile |
| `<h3>` | 120 characters |
| `<p>` per paragraph | 400 characters |
| Paragraphs per block | 3 max |
| List items | 8 max |
| Cards in `.block-cards` | 4 max (2×2 grid on desktop) |

---

## Hard limits — these break the layout

| ❌ Don't | Why |
|---------|-----|
| `style="..."` | Inline styles conflict with the theme system |
| Custom CSS classes other than `accent`, `block-cards`, `block-card`, `block-stat` | No effect |
| `<img>` | Not supported |
| `<a>` | Not supported |
| `<h1>` | Reserved for the Hero block (index 0) only |
| `<div>` without `block-cards`/`block-card` class | No styles defined |
| `<table>`, `<section>`, `<article>` | No styles defined |
| `<script>`, `<iframe>` | Blocked for security |
| Words longer than 25 characters in headings | Will overflow on narrow screens |

---

## Correct patterns

```html
<!-- Heading with accent word + paragraph -->
<h2>Hay un <span class="accent">antes y un después</span> de la IA.</h2>
<p>El mercado vende atajos. <strong>Los atajos no transforman nada.</strong></p>

<!-- Category label before heading -->
<small>Metodología</small>
<h2>Pragmáticos por encima de todo</h2>
<p>Foco total en crear impacto real.</p>

<!-- Editorial contrast with strikethrough -->
<h2><s>Automatización.</s> Transformación real.</h2>
<p>No automatizamos procesos rotos. Los reemplazamos.</p>

<!-- Multi-paragraph section -->
<h2>Software e IA, sin separación artificial</h2>
<p>Para nosotros es lo mismo: crear soluciones.</p>
<p>El resultado son sistemas que hacen cosas que antes requerían personas.</p>

<!-- Bullet list with strikethrough for contrast -->
<h3>Lo que no hacemos</h3>
<ul>
  <li><s>Consultoras de PowerPoint</s></li>
  <li><s>Proyectos piloto que nunca escalan</s></li>
  <li><s>IA por el hype</s></li>
</ul>
```

---

## addSection() API

```ts
// Minimal call — theme and tab are auto-assigned by position
addSection({
  content: `<h2>Tu título</h2><p>Tu cuerpo.</p>`,
})

// With orange rule before content
addSection({
  content: `<h2>Título</h2><p>Cuerpo.</p>`,
  rule: true,
})

// With explicit theme override
addSection({
  content: `<h2>Título</h2>`,
  theme: 'closing',
})
```

Auto-assignment cycles:
- Theme: `dark-1 → light-2 → dark-2 → light-1 → dark-1 → …` (only non-closing sections advance the counter)
- Tab position: `center → right → left → center → …` (same counter as theme)
```

- [ ] **Step 7.2 — Commit**

```bash
git add BLOCK_CONTENT_GUIDE.md
git commit -m "docs: add BLOCK_CONTENT_GUIDE.md — LLM contract for block content HTML"
```

---

## Self-review checklist

After completing all tasks, verify:

- [ ] `pnpm test` — all tests pass
- [ ] `pnpm build` — production build succeeds
- [ ] Mobile check at 375px — sections stack cleanly, tabs proportional, typography readable
- [ ] Desktop check at 1280px — sections show full interlocking tab effect, dark/light cycle visible
- [ ] Closing pair (Examples + Closing) — both dark, no visible tab between them, subtle separator line
- [ ] Orange rule visible in Context and HowWeWork sections
- [ ] Accent words orange in Context, SystemChallenge, Philosophy sections
- [ ] `useSections()` accessible from browser console via React DevTools — `addSection()` can be called and new section appears
```
