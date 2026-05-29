# Diagram Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable any block on the azent-es landing to optionally include a ReactFlow diagram plus an interactive formula+variables panel, editable in real-time by visitors and creatable/editable by the Codex agent via new MCP tools.

**Architecture:** Extend `SectionConfig` with four optional fields (`diagram`, `diagramPosition`, `formula`, `variables`). The `<Block>` component renders a responsive 2-column split when `diagram` is present. New components live under `src/components/sections/diagram/`. Agent gets four new MCP tools (`set_block_diagram`, `set_block_formula`, `clear_block_diagram`, `clear_block_formula`) plus extended `add_agent_block` and `get_page_snapshot`. Agent prompt is extended with usage heuristics.

**Tech Stack:** TanStack Start (SSR), React 19, Tailwind v4, Vitest + Testing Library, `@xyflow/react` (ReactFlow), `fparser`, `@modelcontextprotocol/sdk`, Codex SDK, Zod.

**Source spec:** `docs/superpowers/specs/2026-05-29-diagram-blocks-design.md`

---

## Task 1: Install dependencies and verify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `@xyflow/react` and `fparser`**

Run:
```bash
pnpm add @xyflow/react@^12.10.2 fparser@^4.2.0
```

Expected: both packages added to `dependencies` in `package.json`.

- [ ] **Step 2: Verify build still works**

Run: `pnpm test`

Expected: existing tests pass (no diagram code yet, just dep install).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add @xyflow/react and fparser deps for diagram blocks"
```

---

## Task 2: Create diagram types

**Files:**
- Create: `src/components/sections/diagram/types.ts`

- [ ] **Step 1: Create types file**

Write to `src/components/sections/diagram/types.ts`:
```ts
export type DiagramNodeDef = {
  id: string
  label: string
  x: number
  y: number
}

export type DiagramEdgeDef = {
  id?: string
  source: string
  target: string
  label?: string
  highlight?: boolean
}

export type DiagramJSON = {
  nodes: DiagramNodeDef[]
  edges: DiagramEdgeDef[]
}
```

- [ ] **Step 2: Verify TypeScript accepts it**

Run: `pnpm vitest run --reporter=verbose` (no test for types, just ensure no TS errors).

Expected: tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/diagram/types.ts
git commit -m "feat: add diagram types"
```

---

## Task 3: Formula utils — failing tests

**Files:**
- Create: `src/components/sections/diagram/formulaUtils.test.ts`

- [ ] **Step 1: Write the failing tests**

Write to `src/components/sections/diagram/formulaUtils.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseVariables, evaluate } from './formulaUtils'

describe('parseVariables', () => {
  it('returns single variable name', () => {
    expect(parseVariables('a')).toEqual(['a'])
  })

  it('returns all variable names from arithmetic expression', () => {
    expect(parseVariables('a * b + c').sort()).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array for empty string', () => {
    expect(parseVariables('')).toEqual([])
  })

  it('returns empty array for invalid syntax', () => {
    expect(parseVariables('a *')).toEqual([])
  })

  it('returns empty array for constant expression', () => {
    expect(parseVariables('1 + 2')).toEqual([])
  })
})

describe('evaluate', () => {
  it('computes simple multiplication', () => {
    expect(evaluate('a * b', { a: 2, b: 3 })).toBe(6)
  })

  it('computes mixed expression', () => {
    expect(evaluate('a * b + c', { a: 2, b: 3, c: 4 })).toBe(10)
  })

  it('returns null when a variable is missing', () => {
    expect(evaluate('a * b', { a: 2 })).toBeNull()
  })

  it('returns null when syntax is invalid', () => {
    expect(evaluate('a *', { a: 1 })).toBeNull()
  })

  it('returns null for empty expression', () => {
    expect(evaluate('', {})).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/sections/diagram/formulaUtils.test.ts`

Expected: FAIL — module `./formulaUtils` does not exist.

---

## Task 4: Formula utils — implementation

**Files:**
- Create: `src/components/sections/diagram/formulaUtils.ts`

- [ ] **Step 1: Implement the module**

Write to `src/components/sections/diagram/formulaUtils.ts`:
```ts
import Formula from 'fparser'

export function parseVariables(expression: string): string[] {
  if (!expression.trim()) return []
  try {
    const f = new Formula(expression)
    return f.getVariables()
  } catch {
    return []
  }
}

export function evaluate(
  expression: string,
  vars: Record<string, number>,
): number | null {
  if (!expression.trim()) return null
  try {
    const f = new Formula(expression)
    const needed = f.getVariables()
    for (const name of needed) {
      if (!(name in vars)) return null
    }
    const result = f.evaluate(vars)
    return typeof result === 'number' && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm vitest run src/components/sections/diagram/formulaUtils.test.ts`

Expected: all 10 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/diagram/formulaUtils.ts src/components/sections/diagram/formulaUtils.test.ts
git commit -m "feat: add formula parse + evaluate utils"
```

---

## Task 5: DiagramVariables component — failing tests

**Files:**
- Create: `src/components/sections/diagram/DiagramVariables.test.tsx`

- [ ] **Step 1: Write the failing tests**

Write to `src/components/sections/diagram/DiagramVariables.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiagramVariables } from './DiagramVariables'

describe('DiagramVariables', () => {
  it('renders one input per variable', () => {
    render(<DiagramVariables variables={{ a: 1, b: 2 }} onChange={() => {}} />)
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(2)
  })

  it('renders variable names as labels', () => {
    render(<DiagramVariables variables={{ alpha: 5 }} onChange={() => {}} />)
    screen.getByText('alpha')
  })

  it('shows the current value in the input', () => {
    render(<DiagramVariables variables={{ a: 42 }} onChange={() => {}} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('42')
  })

  it('calls onChange with parsed number when input changes', () => {
    const onChange = vi.fn()
    render(<DiagramVariables variables={{ a: 1 }} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '10' } })
    expect(onChange).toHaveBeenCalledWith('a', 10)
  })

  it('calls onChange with 0 when input is cleared (NaN guard)', () => {
    const onChange = vi.fn()
    render(<DiagramVariables variables={{ a: 1 }} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith('a', 0)
  })

  it('renders nothing when variables is empty object', () => {
    const { container } = render(
      <DiagramVariables variables={{}} onChange={() => {}} />,
    )
    expect(container.querySelector('input')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/sections/diagram/DiagramVariables.test.tsx`

Expected: FAIL — module `./DiagramVariables` does not exist.

---

## Task 6: DiagramVariables — implementation

**Files:**
- Create: `src/components/sections/diagram/DiagramVariables.tsx`

- [ ] **Step 1: Implement the component**

Write to `src/components/sections/diagram/DiagramVariables.tsx`:
```tsx
type Props = {
  variables: Record<string, number>
  onChange: (name: string, value: number) => void
}

export function DiagramVariables({ variables, onChange }: Props) {
  const entries = Object.entries(variables)
  if (entries.length === 0) return null

  return (
    <ul className="space-y-2 mt-6">
      {entries.map(([name, value]) => (
        <li key={name} className="flex items-center gap-3">
          <label
            htmlFor={`var-${name}`}
            className="font-mono text-sm text-[var(--prose-body)] flex-1 truncate"
            title={name}
          >
            {name}
          </label>
          <input
            id={`var-${name}`}
            type="number"
            value={value}
            onChange={(e) => onChange(name, parseFloat(e.target.value) || 0)}
            className="w-24 text-sm font-mono bg-transparent border border-[var(--prose-muted)] rounded px-2 py-1 text-[var(--prose-heading)] focus:outline-none focus:border-[var(--prose-accent)] focus:ring-1 focus:ring-[var(--prose-accent)]"
          />
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm vitest run src/components/sections/diagram/DiagramVariables.test.tsx`

Expected: all 6 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/diagram/DiagramVariables.tsx src/components/sections/diagram/DiagramVariables.test.tsx
git commit -m "feat: add DiagramVariables interactive input component"
```

---

## Task 7: DiagramCalculo component

**Files:**
- Create: `src/components/sections/diagram/DiagramCalculo.tsx`
- Create: `src/components/sections/diagram/DiagramCalculo.test.tsx`

- [ ] **Step 1: Write the failing tests**

Write to `src/components/sections/diagram/DiagramCalculo.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiagramCalculo } from './DiagramCalculo'

describe('DiagramCalculo', () => {
  it('renders the formula as monospace text', () => {
    render(<DiagramCalculo formula="a * b" result={42} />)
    const formulaEl = screen.getByText('a * b')
    expect(formulaEl.className).toMatch(/font-mono/)
  })

  it('renders the result when present', () => {
    render(<DiagramCalculo formula="a + b" result={10} />)
    screen.getByText('10')
  })

  it('renders em dash when result is null', () => {
    render(<DiagramCalculo formula="a + b" result={null} />)
    screen.getByText('—')
  })

  it('renders nothing when formula is empty', () => {
    const { container } = render(<DiagramCalculo formula="" result={null} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/DiagramCalculo.test.tsx`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the component**

Write to `src/components/sections/diagram/DiagramCalculo.tsx`:
```tsx
type Props = {
  formula: string
  result: number | null
}

export function DiagramCalculo({ formula, result }: Props) {
  if (!formula.trim()) return null

  return (
    <div className="mt-4">
      <p className="font-mono text-xs text-[var(--prose-muted)] mb-1 break-words">
        {formula}
      </p>
      <p className="text-2xl font-semibold tabular-nums text-[var(--prose-heading)]">
        {result !== null ? formatResult(result) : '—'}
      </p>
    </div>
  )
}

function formatResult(value: number): string {
  if (Number.isInteger(value)) return value.toString()
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/DiagramCalculo.test.tsx`

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/DiagramCalculo.tsx src/components/sections/diagram/DiagramCalculo.test.tsx
git commit -m "feat: add DiagramCalculo formula result display"
```

---

## Task 8: DiagramCanvas — ReactFlow integration

ReactFlow is hard to unit test under jsdom (touches `ResizeObserver`, canvas APIs). We rely on the existing POC implementation pattern and only write a smoke test that the component mounts a client-only wrapper.

**Files:**
- Create: `src/components/sections/diagram/DiagramCanvas.tsx`
- Create: `src/components/sections/diagram/DiagramCanvas.test.tsx`

- [ ] **Step 1: Write smoke test**

Write to `src/components/sections/diagram/DiagramCanvas.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DiagramCanvas } from './DiagramCanvas'

describe('DiagramCanvas', () => {
  it('renders without crashing with empty diagram (client-only wrapper)', () => {
    const { container } = render(
      <DiagramCanvas data={{ nodes: [], edges: [] }} />,
    )
    expect(container.querySelector('[data-diagram-canvas]')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/DiagramCanvas.test.tsx`

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement DiagramCanvas**

Write to `src/components/sections/diagram/DiagramCanvas.tsx`:
```tsx
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  getBezierPath,
  BaseEdge,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react'
import type { NodeProps, EdgeProps, Node, Edge } from '@xyflow/react'
import { useEffect, useState } from 'react'
import type { DiagramJSON, DiagramNodeDef, DiagramEdgeDef } from './types'
import '@xyflow/react/dist/style.css'

type AzentNodeData = { label: string }

function AzentNode({ data, selected }: NodeProps<Node<AzentNodeData>>) {
  return (
    <div
      style={{
        background: 'transparent',
        border: `1px solid ${selected ? 'var(--prose-accent)' : 'var(--prose-muted)'}`,
        borderRadius: 8,
        padding: '12px 18px',
        minWidth: 110,
        textAlign: 'center',
        cursor: 'grab',
        userSelect: 'none',
        transition: 'border-color 180ms ease',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: 'var(--prose-muted)', border: 'none', width: 1, height: 1, opacity: 0.5 }}
      />
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--prose-heading)',
          letterSpacing: '0.005em',
        }}
      >
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'var(--prose-muted)', border: 'none', width: 1, height: 1, opacity: 0.5 }}
      />
    </div>
  )
}

type AzentEdgeData = { highlight?: boolean }

function AzentEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  label,
  data,
}: EdgeProps<Edge<AzentEdgeData>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const highlight = data?.highlight === true
  const stroke = highlight ? 'var(--prose-accent)' : 'var(--prose-muted)'
  const opacity = highlight ? 1 : 0.65

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke, strokeWidth: 1.25, opacity }}
      />
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: 10,
            fill: 'var(--prose-muted)',
            fontFamily: 'var(--font-sans)',
            pointerEvents: 'none',
          }}
        >
          {label as string}
        </text>
      )}
      <circle r="3" fill={stroke} opacity="0.9">
        {/* @ts-ignore - animateMotion is valid SVG, TS types lag */}
        <animateMotion
          dur="2.4s"
          repeatCount="indefinite"
          path={edgePath}
          calcMode="spline"
          keyTimes="0;1"
          keySplines="0.42 0 0.58 1"
        />
      </circle>
    </>
  )
}

const nodeTypes = { azent: AzentNode }
const edgeTypes = { azent: AzentEdge }

function toRFNodes(defs: DiagramNodeDef[]): Node[] {
  return defs.map((n) => ({
    id: n.id,
    type: 'azent',
    position: { x: n.x, y: n.y },
    data: { label: n.label },
  }))
}

function toRFEdges(defs: DiagramEdgeDef[]): Edge[] {
  return defs.map((e, i) => ({
    id: e.id ?? `e-${i}`,
    source: e.source,
    target: e.target,
    type: 'azent',
    label: e.label,
    data: { highlight: e.highlight === true },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: e.highlight ? 'var(--prose-accent)' : 'var(--prose-muted)',
    },
  }))
}

function DiagramGraph({ data }: Readonly<{ data: DiagramJSON }>) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toRFNodes(data.nodes))
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRFEdges(data.edges))

  useEffect(() => {
    setNodes(toRFNodes(data.nodes))
    setEdges(toRFEdges(data.edges))
  }, [data, setNodes, setEdges])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesConnectable={false}
      edgesFocusable={false}
      deleteKeyCode={null}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      proOptions={{ hideAttribution: true }}
      style={{ background: 'transparent' }}
    >
      <Background color="var(--prose-muted)" gap={24} size={1} />
    </ReactFlow>
  )
}

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted ? <>{children}</> : null
}

export function DiagramCanvas({ data }: Readonly<{ data: DiagramJSON }>) {
  return (
    <div
      data-diagram-canvas
      className="w-full min-h-[280px] md:min-h-[420px] h-full"
    >
      <ClientOnly>
        <DiagramGraph data={data} />
      </ClientOnly>
    </div>
  )
}
```

- [ ] **Step 4: Run smoke test to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/DiagramCanvas.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/DiagramCanvas.tsx src/components/sections/diagram/DiagramCanvas.test.tsx
git commit -m "feat: add DiagramCanvas with ReactFlow azent-styled nodes and edges"
```

---

## Task 9: Extend SectionConfig with diagram fields — failing tests

**Files:**
- Modify: `src/components/sections/SectionContext.test.ts`

- [ ] **Step 1: Add new tests at the end of the existing describe blocks**

Append the following new `describe` block at the bottom of `src/components/sections/SectionContext.test.ts` (after the existing `describe('sectionsReducer', ...)` block):

```ts
describe('resolveSection — diagram fields', () => {
  it('preserves diagram when provided', () => {
    const diagram = { nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }], edges: [] }
    expect(resolveSection({ content: '', diagram }, 0).diagram).toEqual(diagram)
  })

  it('preserves diagramPosition when provided', () => {
    expect(resolveSection({ content: '', diagramPosition: 'before' }, 0).diagramPosition).toBe('before')
  })

  it('preserves formula when provided', () => {
    expect(resolveSection({ content: '', formula: 'a * b' }, 0).formula).toBe('a * b')
  })

  it('preserves variables when provided', () => {
    expect(resolveSection({ content: '', variables: { a: 1, b: 2 } }, 0).variables).toEqual({ a: 1, b: 2 })
  })

  it('diagram is undefined when not provided', () => {
    expect(resolveSection({ content: '' }, 0).diagram).toBeUndefined()
  })
})

describe('sectionsReducer — diagram UPDATE merge', () => {
  const empty = { sections: [] as SectionConfig[] }

  it('UPDATE can patch diagram without touching content', () => {
    let state = sectionsReducer(empty, {
      type: 'ADD',
      payload: { id: 'a', content: '<p>hi</p>' },
    })
    const diagram = { nodes: [{ id: 'n1', label: 'N1', x: 0, y: 0 }], edges: [] }
    state = sectionsReducer(state, { type: 'UPDATE', id: 'a', payload: { diagram } })
    expect(state.sections[0].diagram).toEqual(diagram)
    expect(state.sections[0].content).toBe('<p>hi</p>')
  })

  it('UPDATE can patch formula and variables without touching diagram', () => {
    const diagram = { nodes: [{ id: 'n1', label: 'N1', x: 0, y: 0 }], edges: [] }
    let state = sectionsReducer(empty, {
      type: 'ADD',
      payload: { id: 'a', content: '', diagram },
    })
    state = sectionsReducer(state, {
      type: 'UPDATE',
      id: 'a',
      payload: { formula: 'a * b', variables: { a: 2, b: 3 } },
    })
    expect(state.sections[0].formula).toBe('a * b')
    expect(state.sections[0].variables).toEqual({ a: 2, b: 3 })
    expect(state.sections[0].diagram).toEqual(diagram)
  })

  it('UPDATE can clear diagram by setting it to undefined', () => {
    const diagram = { nodes: [{ id: 'n1', label: 'N1', x: 0, y: 0 }], edges: [] }
    let state = sectionsReducer(empty, {
      type: 'ADD',
      payload: { id: 'a', content: '', diagram, formula: 'a', variables: { a: 1 } },
    })
    state = sectionsReducer(state, {
      type: 'UPDATE',
      id: 'a',
      payload: { diagram: undefined, formula: undefined, variables: undefined, diagramPosition: undefined },
    })
    expect(state.sections[0].diagram).toBeUndefined()
    expect(state.sections[0].formula).toBeUndefined()
    expect(state.sections[0].variables).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/sections/SectionContext.test.ts`

Expected: FAIL — TypeScript errors on `diagram`, `formula`, `variables`, `diagramPosition` not existing on `SectionInput`.

---

## Task 10: Extend SectionConfig with diagram fields — implementation

**Files:**
- Modify: `src/components/sections/SectionContext.tsx`

- [ ] **Step 1: Add import for diagram types**

At the top of `src/components/sections/SectionContext.tsx`, add this import below the existing `createContext...` import:

```ts
import type { DiagramJSON } from './diagram/types'
```

- [ ] **Step 2: Add fields to SectionConfig**

Replace the `SectionConfig` interface (currently lines 7-16) with:

```ts
export interface SectionConfig {
  id: string
  theme: SectionTheme
  tab: TabVariant
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
```

- [ ] **Step 3: Add fields to SectionInput**

Replace the `SectionInput` type (currently lines 18-27) with:

```ts
export type SectionInput = {
  id?: string
  theme?: SectionTheme
  tab?: TabVariant
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
```

- [ ] **Step 4: Update resolveSection to pass through new fields**

Replace the `resolveSection` function body (currently lines 32-45) with:

```ts
export function resolveSection(input: SectionInput, nonClosingCount: number): SectionConfig {
  const theme = input.theme ?? COLOR_CYCLE[nonClosingCount % 4]
  const tab = theme === 'closing' ? 'none' : (input.tab ?? TAB_CYCLE[nonClosingCount % 3])
  return {
    id: input.id ?? createId(),
    theme,
    tab,
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

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run src/components/sections/SectionContext.test.ts`

Expected: all tests PASS, including the new diagram-field tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/SectionContext.tsx src/components/sections/SectionContext.test.ts
git commit -m "feat: extend SectionConfig/SectionInput with optional diagram fields"
```

---

## Task 11: Update Block component for split layout — failing tests

**Files:**
- Modify: `src/components/sections/Block.test.tsx`

- [ ] **Step 1: Update the test file import line**

In `src/components/sections/Block.test.tsx`, replace the existing first import line:

```tsx
import { render, screen } from '@testing-library/react'
```

with:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
```

- [ ] **Step 2: Append new tests**

Append to the bottom of `src/components/sections/Block.test.tsx` (inside the existing `describe('Block', ...)` block, before the closing `})`):

```tsx
  // ── Diagram split layout ───────────────────────────────────────────────

  it('does not render diagram region when config.diagram is absent', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    expect(container.querySelector('[data-diagram-canvas]')).toBeNull()
  })

  it('renders diagram region when config.diagram is present', () => {
    const { container } = render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }], edges: [] },
        }}
        index={0}
        prevTab="none"
      />,
    )
    expect(container.querySelector('[data-diagram-canvas]')).toBeTruthy()
  })

  it('uses data-diagram-position="after" by default when diagram is present', () => {
    const { container } = render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
        }}
        index={0}
        prevTab="none"
      />,
    )
    expect(container.querySelector('[data-diagram-position="after"]')).toBeTruthy()
  })

  it('uses data-diagram-position="before" when explicitly set', () => {
    const { container } = render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
          diagramPosition: 'before',
        }}
        index={0}
        prevTab="none"
      />,
    )
    expect(container.querySelector('[data-diagram-position="before"]')).toBeTruthy()
  })

  it('renders variables when both diagram and formula are present', () => {
    render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
          formula: 'a * b',
          variables: { a: 1, b: 2 },
        }}
        index={0}
        prevTab="none"
      />,
    )
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(2)
  })

  it('does not render variables when formula is absent (even with diagram)', () => {
    const { container } = render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
        }}
        index={0}
        prevTab="none"
      />,
    )
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0)
  })

  it('renders the formula text inside the calculo region', () => {
    render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
          formula: 'x + y',
          variables: { x: 1, y: 2 },
        }}
        index={0}
        prevTab="none"
      />,
    )
    screen.getByText('x + y')
  })

  it('resets edited variable values when config.variables baseline changes', () => {
    const { rerender } = render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
          formula: 'a',
          variables: { a: 5 },
        }}
        index={0}
        prevTab="none"
      />,
    )
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('5')

    fireEvent.change(input, { target: { value: '99' } })
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('99')

    rerender(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
          formula: 'a',
          variables: { a: 10 },
        }}
        index={0}
        prevTab="none"
      />,
    )
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('10')
  })
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run src/components/sections/Block.test.tsx`

Expected: FAIL — diagram tests fail because `<Block>` doesn't render the split layout yet.

---

## Task 12: Update Block component for split layout — implementation

**Files:**
- Modify: `src/components/sections/Block.tsx`

- [ ] **Step 1: Rewrite Block.tsx with split layout**

Replace the entire contents of `src/components/sections/Block.tsx` with:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SectionConfig, TabVariant } from './SectionContext'
import { streamFlashSpansIn } from '#/utils/streamFlash'
import { DiagramCanvas } from './diagram/DiagramCanvas'
import { DiagramVariables } from './diagram/DiagramVariables'
import { DiagramCalculo } from './diagram/DiagramCalculo'
import { evaluate } from './diagram/formulaUtils'

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
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) streamFlashSpansIn(contentRef.current)
  }, [config.content])

  const hasDiagram = !!config.diagram
  const position = config.diagramPosition ?? 'after'

  return (
    <section
      id={config.id}
      data-theme={config.theme}
      data-tab={config.tab}
      data-diagram-position={hasDiagram ? position : undefined}
      className={`block-section${config.className ? ` ${config.className}` : ''}`}
      style={{ clipPath, marginTop, position: 'relative', zIndex: 1000 - index * 10 }}
    >
      {config.rule && <div className="block-rule" aria-hidden="true" />}
      {config.topic && <small className="block-topic">{config.topic}</small>}

      {hasDiagram ? (
        <SplitLayout
          config={config}
          position={position}
          contentRef={contentRef}
        />
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

- [ ] **Step 2: Run tests to verify they pass**

Run: `pnpm vitest run src/components/sections/Block.test.tsx`

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/Block.tsx src/components/sections/Block.test.tsx
git commit -m "feat: render diagram split layout in Block when diagram is present"
```

---

## Task 13: Add CSS overrides for ReactFlow inside block-section

ReactFlow ships its own CSS (imported in `DiagramCanvas.tsx`). Need to override z-index/background details so it plays nicely with the block themes and `clipPath`.

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Append diagram-specific CSS**

Append to the end of `src/styles.css`:

```css
/* ─── Diagram (ReactFlow) overrides ─────────────────────────────────────── */

.block-section [data-diagram-canvas] {
  /* Counter the default ReactFlow background and let theme show through */
  background: transparent;
}

.block-section .react-flow__attribution {
  display: none;
}

.block-section .react-flow__node {
  font-family: var(--font-sans);
}

.block-section .react-flow__edge-path {
  stroke-linecap: round;
}

/* Make sure the diagram column collapses cleanly on mobile when stacked */
.block-section [data-diagram-position] .react-flow {
  border-radius: 6px;
}
```

- [ ] **Step 2: Run tests**

Run: `pnpm test`

Expected: all tests still pass.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: add CSS overrides for ReactFlow inside block-section"
```

---

## Task 14: Re-export diagram types from sections barrel

**Files:**
- Modify: `src/components/sections/index.ts`

- [ ] **Step 1: Add the diagram type re-exports**

Replace the entire contents of `src/components/sections/index.ts` with:

```ts
export { SectionProvider, useSections } from './SectionContext'
export type { SectionConfig, SectionInput, SectionTheme, TabVariant, SectionsContextValue } from './SectionContext'
export { Block } from './Block'
export type { DiagramJSON, DiagramNodeDef, DiagramEdgeDef } from './diagram/types'
```

- [ ] **Step 2: Verify everything still imports cleanly**

Run: `pnpm test`

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/index.ts
git commit -m "feat: re-export diagram types from sections barrel"
```

---

## Task 15: Extend BrowserToolBridge with diagram tools

**Files:**
- Modify: `src/components/BrowserToolBridge.tsx`

- [ ] **Step 1: Add diagram handling to existing `tools` object**

Open `src/components/BrowserToolBridge.tsx`. At the very top, update the imports — replace the existing first three import lines:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSections, type SectionInput } from '#/components/sections'
import { createId } from '#/utils/id'
import { diffHtml, stripFlashSpans, wrapAllTextAsFlash } from '#/utils/htmlDiff'
```

with:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSections, type SectionInput } from '#/components/sections'
import type { DiagramJSON } from '#/components/sections'
import { createId } from '#/utils/id'
import { diffHtml, stripFlashSpans, wrapAllTextAsFlash } from '#/utils/htmlDiff'
```

- [ ] **Step 2: Add a typed reader helper for the diagram payload**

Inside `BrowserToolBridge.tsx`, find the existing helpers `function isObject(...)` and `function readString(...)` (around lines 26-32). Right after `readString`, add these helpers:

```tsx
function readDiagram(value: unknown): DiagramJSON {
  if (!isObject(value)) throw new Error('diagram must be an object')
  const nodes = Array.isArray(value.nodes) ? value.nodes : null
  const edges = Array.isArray(value.edges) ? value.edges : null
  if (!nodes || !edges) throw new Error('diagram requires nodes[] and edges[]')

  const nodeIds = new Set<string>()
  const normalizedNodes = nodes.map((raw, i) => {
    if (!isObject(raw)) throw new Error(`nodes[${i}] must be an object`)
    const id = readString(raw.id).trim()
    const label = readString(raw.label).trim()
    const x = typeof raw.x === 'number' ? raw.x : NaN
    const y = typeof raw.y === 'number' ? raw.y : NaN
    if (!id) throw new Error(`nodes[${i}].id required`)
    if (!label) throw new Error(`nodes[${i}].label required`)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`nodes[${i}] requires numeric x and y`)
    }
    if (nodeIds.has(id)) throw new Error(`duplicate node id: ${id}`)
    nodeIds.add(id)
    return { id, label, x, y }
  })

  const normalizedEdges = edges.map((raw, i) => {
    if (!isObject(raw)) throw new Error(`edges[${i}] must be an object`)
    const source = readString(raw.source).trim()
    const target = readString(raw.target).trim()
    if (!source || !target) throw new Error(`edges[${i}] requires source and target`)
    if (!nodeIds.has(source)) throw new Error(`edges[${i}].source ${source} not in nodes`)
    if (!nodeIds.has(target)) throw new Error(`edges[${i}].target ${target} not in nodes`)
    const out: { id?: string; source: string; target: string; label?: string; highlight?: boolean } = {
      source,
      target,
    }
    if (typeof raw.id === 'string' && raw.id) out.id = raw.id
    if (typeof raw.label === 'string') out.label = raw.label
    if (raw.highlight === true) out.highlight = true
    return out
  })

  return { nodes: normalizedNodes, edges: normalizedEdges }
}

function readVariables(value: unknown): Record<string, number> {
  if (!isObject(value)) throw new Error('variables must be an object')
  const out: Record<string, number> = {}
  for (const [name, raw] of Object.entries(value)) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new Error(`variables.${name} must be a finite number`)
    }
    out[name] = raw
  }
  return out
}

function readDiagramPosition(value: unknown): 'before' | 'after' {
  const v = readString(value)
  if (v === 'before' || v === 'after') return v
  throw new Error('diagramPosition must be "before" or "after"')
}

function flashBlockOutline(id: string) {
  setTimeout(() => {
    document.getElementById(id)?.animate(
      [
        { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
        { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0.7)', outlineOffset: '-8px' },
        { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
      ],
      { duration: 400, easing: 'ease-out' },
    )
  }, 0)
}
```

- [ ] **Step 3: Update `get_page_snapshot` to include new fields**

Find the existing `get_page_snapshot` (around lines 55-62). Replace its body with:

```tsx
    get_page_snapshot: () => ({
      title: document.title,
      url: window.location.href,
      sections: sectionsRef.current.map((section, index) => ({
        index,
        ...section,
        content: stripFlashSpans(section.content),
      })),
    }),
```

(no change to logic — `...section` already spreads the new fields. Verify by re-reading the file and confirming the spread is in place.)

- [ ] **Step 4: Extend `add_agent_block` to accept diagram/formula/variables/diagramPosition**

Find the existing `add_agent_block` definition (around lines 95-144). Replace it with:

```tsx
    add_agent_block: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const topic = readString(args.topic).trim()
      if (!topic) throw new Error('topic is required')

      const optional: Partial<SectionInput> = {}
      if (args.diagram !== undefined) optional.diagram = readDiagram(args.diagram)
      if (args.diagramPosition !== undefined) {
        optional.diagramPosition = readDiagramPosition(args.diagramPosition)
      }
      if (args.formula !== undefined) {
        const f = readString(args.formula).trim()
        if (!f) throw new Error('formula cannot be empty when provided')
        if (!optional.diagram) {
          throw new Error('formula requires a diagram on the same block')
        }
        optional.formula = f
      }
      if (args.variables !== undefined) optional.variables = readVariables(args.variables)
      if (optional.formula && !optional.variables) {
        throw new Error('variables required when formula is provided')
      }

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
      return { id: newId }
    },
```

- [ ] **Step 5: Add the four new diagram tools to the `tools` object**

Inside the same `useMemo` returning `tools`, after the existing `remove_block` entry (around line 195), add these new tools right before the closing `}`:

```tsx
    set_block_diagram: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      const diagram = readDiagram(args.diagram)
      const updates: Partial<SectionInput> = { diagram }
      if (args.diagramPosition !== undefined) {
        updates.diagramPosition = readDiagramPosition(args.diagramPosition)
      } else if (!section.diagramPosition) {
        updates.diagramPosition = 'after'
      }
      const element = document.getElementById(id)
      if (element) {
        const rect = element.getBoundingClientRect()
        const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
        if (!isInView) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          await new Promise(resolve => setTimeout(resolve, 380))
        }
      }
      updateSection(id, updates)
      flashBlockOutline(id)
      return { id, updated: true }
    },

    set_block_formula: async (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      if (!section.diagram) {
        throw new Error(`Block ${id} has no diagram — set_block_diagram first`)
      }
      const formula = readString(args.formula).trim()
      if (!formula) throw new Error('formula is required')
      const variables = readVariables(args.variables)
      const element = document.getElementById(id)
      if (element) {
        const rect = element.getBoundingClientRect()
        const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight
        if (!isInView) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          await new Promise(resolve => setTimeout(resolve, 380))
        }
      }
      updateSection(id, { formula, variables })
      flashBlockOutline(id)
      return { id, updated: true }
    },

    clear_block_diagram: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      updateSection(id, {
        diagram: undefined,
        diagramPosition: undefined,
        formula: undefined,
        variables: undefined,
      })
      flashBlockOutline(id)
      return { id, cleared: true }
    },

    clear_block_formula: (args: unknown) => {
      if (!isObject(args)) throw new Error('Expected args object')
      const id = readString(args.id).trim()
      if (!id) throw new Error('id is required')
      const section = sectionsRef.current.find(s => s.id === id)
      if (!section) throw new Error(`Section not found: ${id}`)
      updateSection(id, { formula: undefined, variables: undefined })
      flashBlockOutline(id)
      return { id, cleared: true }
    },
```

- [ ] **Step 6: Run tests**

Run: `pnpm test`

Expected: all existing tests pass (these tools have no automated test — covered by manual smoke test in Task 18).

- [ ] **Step 7: Commit**

```bash
git add src/components/BrowserToolBridge.tsx
git commit -m "feat: extend BrowserToolBridge with diagram MCP tools"
```

---

## Task 16: Register new MCP tools in browserMcp.ts with Zod schemas

**Files:**
- Modify: `src/server/browserMcp.ts`

- [ ] **Step 1: Add Zod schemas for diagram payloads**

Open `src/server/browserMcp.ts`. After the existing `const sessionId = z.string()...` line (around line 6), add:

```ts
const diagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
})

const diagramEdgeSchema = z.object({
  id: z.string().min(1).optional(),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  highlight: z.boolean().optional(),
})

const diagramSchema = z.object({
  nodes: z.array(diagramNodeSchema),
  edges: z.array(diagramEdgeSchema),
}).describe('Diagram structure with nodes (id, label, x, y) and edges (source, target).')

const variablesSchema = z.record(z.string().min(1), z.number().finite())
  .describe('Map of variable names to numeric values. Every name used in the formula must be present.')

const diagramPositionSchema = z.enum(['before', 'after'])
  .describe('Where the diagram appears relative to the text: "before" (left in desktop / top in mobile) or "after" (right in desktop / bottom in mobile).')
```

- [ ] **Step 2: Extend the `add_agent_block` registration**

Find the existing `add_agent_block` registration (around lines 56-66). Replace it with:

```ts
  server.registerTool(
    'add_agent_block',
    {
      description: 'Append a new block at the end of the page. The topic appears as a <small> label above the content, contextualising what the block responds to. Optionally include a diagram (with formula+variables) to create a split block in one call. Returns the block id — save it for follow-up tool calls.',
      inputSchema: {
        sessionId,
        topic: z.string().min(1).describe('Short label shown as <small>. Explains what this block is responding to, e.g. "Sobre automatización de procesos".'),
        diagram: diagramSchema.optional(),
        diagramPosition: diagramPositionSchema.optional(),
        formula: z.string().min(1).optional().describe('fparser syntax (+ - * / ^ and named variables). Only meaningful when diagram is also provided.'),
        variables: variablesSchema.optional(),
      },
    },
    ({ sessionId, topic, diagram, diagramPosition, formula, variables }) =>
      invoke('add_agent_block', sessionId, {
        topic,
        ...(diagram !== undefined ? { diagram } : {}),
        ...(diagramPosition !== undefined ? { diagramPosition } : {}),
        ...(formula !== undefined ? { formula } : {}),
        ...(variables !== undefined ? { variables } : {}),
      }),
  )
```

- [ ] **Step 3: Register the four new tools**

Right before the closing `return server` of `createBrowserMcpServer()` (right after the `remove_block` registration), add:

```ts
  server.registerTool(
    'set_block_diagram',
    {
      description: 'Add or replace the diagram of any block. Does not touch the block formula or variables. If the block has no diagramPosition yet, defaults to "after". Scrolls the block into view if needed and flashes an orange border.',
      inputSchema: {
        sessionId,
        id: z.string().min(1).describe('Block id.'),
        diagram: diagramSchema,
        diagramPosition: diagramPositionSchema.optional(),
      },
    },
    ({ sessionId, id, diagram, diagramPosition }) =>
      invoke('set_block_diagram', sessionId, {
        id,
        diagram,
        ...(diagramPosition !== undefined ? { diagramPosition } : {}),
      }),
  )

  server.registerTool(
    'set_block_formula',
    {
      description: 'Add or replace the formula and variables of a block that already has a diagram. The formula uses fparser syntax (+ - * / ^ and named variables). The variables object must contain a baseline numeric value for every name used in the formula. Rejects if the block has no diagram.',
      inputSchema: {
        sessionId,
        id: z.string().min(1).describe('Block id.'),
        formula: z.string().min(1).describe('fparser expression, e.g. "horas_ahorradas * empleados * coste_hora_eur".'),
        variables: variablesSchema,
      },
    },
    ({ sessionId, id, formula, variables }) =>
      invoke('set_block_formula', sessionId, { id, formula, variables }),
  )

  server.registerTool(
    'clear_block_diagram',
    {
      description: 'Remove the diagram, formula and variables from a block. The block becomes text-only again.',
      inputSchema: { sessionId, id: z.string().min(1).describe('Block id.') },
    },
    ({ sessionId, id }) => invoke('clear_block_diagram', sessionId, { id }),
  )

  server.registerTool(
    'clear_block_formula',
    {
      description: 'Remove only the formula and variables of a block. The diagram stays in place.',
      inputSchema: { sessionId, id: z.string().min(1).describe('Block id.') },
    },
    ({ sessionId, id }) => invoke('clear_block_formula', sessionId, { id }),
  )
```

- [ ] **Step 4: Run tests**

Run: `pnpm test`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/browserMcp.ts
git commit -m "feat: register diagram MCP tools with Zod validation"
```

---

## Task 17: Extend the agent prompt with diagram usage instructions

**Files:**
- Modify: `src/routes/api/chat/stream.ts`

- [ ] **Step 1: Replace the inline `prompt` array**

Open `src/routes/api/chat/stream.ts`. Find the existing `const prompt = [...]` block (around lines 101-110). Replace it entirely with:

```ts
        const prompt = [
          `Browser session id: ${browserSessionId}`,
          '',
          'You can control the current web page through the browser_tools MCP server.',
          'Every browser_tools call requires the exact browserSessionId above.',
          'Prefer using get_page_snapshot first, then apply focused changes with the browser tools.',
          'Keep the user updated briefly in Spanish while you work.',
          '',
          'DIAGRAMS AND CALCULATION BLOCKS',
          '',
          'Any block may optionally include a diagram (ReactFlow) plus a formula with variables that the visitor can edit live.',
          '',
          'WHEN TO USE A DIAGRAM',
          '- When you describe a system/flow with related pieces: agents talking to each other,',
          '  integrations, architectures, pipelines, examples of when and how pieces intervene.',
          '- When the visitor asks explicitly for "muéstrame un ejemplo", "cómo funciona",',
          '  or a similar request for visualisation.',
          '- Purely narrative blocks (manifesto, positioning, prose) do NOT need a diagram.',
          '',
          'WHEN TO ADD A FORMULA + VARIABLES',
          '- ONLY if there is a key number that quantifies the value of the solution.',
          '- Not everything is cost saving — also valid: scalability, new capacity that was',
          '  impossible before, conversion uplift, throughput, latency, etc.',
          '- For pure AI features (chat, generation, etc.) or unquantifiable concepts,',
          '  use a diagram WITHOUT a formula.',
          '',
          'DIAGRAM STRUCTURE',
          '- DiagramJSON: { nodes: [{id, label, x, y}], edges: [{source, target, label?, highlight?}] }',
          '- Positions on a ~600×420 canvas. Distribute nodes with balanced shapes',
          '  (not too vertical, not too horizontal) that look good both in desktop split',
          '  (half-width) and in mobile full-width.',
          '- Use edges with highlight:true to underline the critical path of the flow.',
          '- Node labels in the user\'s language. NO emojis. Keep them short (1–3 words).',
          '',
          'POSITION',
          '- diagramPosition: "before" (diagram before the text) or "after" (after).',
          '- Alternate between blocks so the page breathes.',
          '',
          'FORMULA',
          '- fparser syntax: + - * / ^. Variable names: a–z, A–Z, _ (no leading digit).',
          '- Example: "horas_ahorradas * empleados * coste_hora_eur"',
          '- The `variables` object MUST contain a sensible baseline numeric value for every',
          '  name used in the formula. The visitor can tweak these live.',
          '',
          'AVAILABLE TOOLS FOR DIAGRAMS',
          '- add_agent_block: create a new block, optionally with diagram/formula/variables in one call.',
          '- set_block_diagram: add or replace the diagram of any block.',
          '- set_block_formula: add or replace the formula+variables (requires existing diagram).',
          '- clear_block_diagram: remove the diagram (also clears formula+variables).',
          '- clear_block_formula: remove only the formula+variables, keep the diagram.',
          '',
          `User request: ${message}`,
        ].join('\n')
```

- [ ] **Step 2: Run tests**

Run: `pnpm test`

Expected: all tests pass (this file has no tests).

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/chat/stream.ts
git commit -m "feat: extend agent prompt with diagram block usage heuristics"
```

---

## Task 18: Full verification — type check, tests, and manual smoke test

**Files:** (no edits — verification only)

- [ ] **Step 1: Run the whole test suite**

Run: `pnpm test`

Expected: all tests pass.

- [ ] **Step 2: Build the project to catch any TypeScript or bundling issue**

Run: `pnpm build`

Expected: build completes without errors. Bundle size will grow ~150KB (ReactFlow) + ~15KB (fparser) — this is expected.

- [ ] **Step 3: Manual smoke — dev server**

Run: `pnpm dev`

Open the browser at the URL the dev server prints (default `http://localhost:3000`).

- [ ] **Step 4: Manual smoke — text-only path still works**

Verify: existing landing renders correctly with all the current blocks (no diagrams). No regression.

- [ ] **Step 5: Manual smoke — agent can create a diagram block**

In the prompt bar at the bottom, send a message like:
```
Muéstrame un ejemplo de cómo funciona el procesado automático de contratos con IA
```

Verify:
- A new block appears at the bottom (above the closing pinned section).
- The block has a diagram on one side (left or right depending on `diagramPosition`).
- On the other side, the narrative text and (likely) a formula + editable variables.
- Drag a node: it moves. Drag the canvas: it pans. Wheel: zoom.
- Change a variable input: the result updates immediately.
- Send another prompt asking to add a node to the same diagram. Verify the agent calls `set_block_diagram` and the diagram updates with an orange flash.

- [ ] **Step 6: Manual smoke — responsive**

Resize the browser to mobile width (or use devtools mobile preview).

Verify:
- Diagram and text stack vertically.
- Text appears above diagram if `diagramPosition='after'`, below if `'before'`.
- Variables and formula remain readable.

- [ ] **Step 7: Manual smoke — clear flows**

Ask the agent: "quita el cálculo, deja solo el diagrama".

Verify: only `formula` and `variables` are removed; diagram remains.

Ask the agent: "quítale el diagrama a ese bloque".

Verify: diagram disappears, block reverts to text-only edge-to-edge layout.

- [ ] **Step 8: Final commit (only if any tweaks were needed during smoke test)**

If you had to adjust anything (CSS tweaks, agent prompt clarifications), commit them:

```bash
git add -A
git commit -m "fix: smoke test follow-ups"
```

If no tweaks were needed, skip this commit.

---

## Plan summary

18 tasks total, organized as follows:

| # | Task | Type |
|----|------|------|
| 1 | Install `@xyflow/react` + `fparser` | setup |
| 2 | Diagram types | scaffolding |
| 3-4 | Formula utils with TDD | TDD |
| 5-6 | DiagramVariables with TDD | TDD |
| 7 | DiagramCalculo with TDD | TDD |
| 8 | DiagramCanvas (ReactFlow) | smoke-tested |
| 9-10 | Extend SectionConfig with diagram fields (TDD) | TDD |
| 11-12 | Update Block for split layout (TDD) | TDD |
| 13 | CSS overrides for ReactFlow | styling |
| 14 | Re-export diagram types | barrel |
| 15 | BrowserToolBridge: new tools + extend add_agent_block | integration |
| 16 | Register MCP tools with Zod | integration |
| 17 | Extend agent prompt | prompt |
| 18 | Full verification + manual smoke | verification |
