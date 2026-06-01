# Diagram Iterative Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make agent-generated diagrams stream in real time: the agent calls `set_block_diagram` iteratively (full snapshot each call, stable ids), and `DiagramCanvas` diffs against the previous snapshot to animate entries (fade+scale+outline flash for nodes, stroke-draw for edges), smooth moves (CSS transform transition), exits (fade-out + unmount after delay), label re-tipea on nodes, and stroke transitions when edge highlight or label changes.

**Architecture:** A pure `diffDiagram(prev, next)` function detects entering/exiting/moved/label-changed sets for nodes and entering/exiting/changed-edge sets for edges (matched by explicit `id` or `${source}->${target}`). `DiagramCanvas` owns the lifecycle: holds `prevDiagramRef`, builds an internal render state that keeps exiting nodes/edges mounted for their exit duration, schedules cleanups with cancellation across rapid updates, and passes `entering`/`exiting`/`labelRev`/`edgeRev` flags into node/edge `data`. New `AzentNode` and `AzentEdge` components consume the flags: nodes tipea their label via the existing `streamFlashSpansIn` util and run the orange outline flash; edges animate `stroke-dashoffset` for the draw effect and use a `key={edgeRev}` wrapper for label fade-swap. CSS provides the `transform` transition (free move animation) and the enter/exit keyframes. `BrowserToolBridge` only changes minimally to consume `flashBlockOutline` from a shared module.

**Tech Stack:** TypeScript, React, `@xyflow/react` (ReactFlow), Web Animations API (WAAPI), CSS keyframes + transitions, vitest + jsdom for tests.

**Spec reference:** `docs/superpowers/specs/2026-06-01-diagram-iterative-streaming-design.md`

---

## File Structure

- **Modify** `src/utils/blockAnimations.ts` — export new `flashBlockOutline(element: HTMLElement, durationMs?: number)`. Consolidates the orange outline flash so node and block share one implementation.
- **Modify** `src/components/BrowserToolBridge.tsx` — drop the inlined `flashBlockOutline` helper, import it from `blockAnimations`.
- **Create** `src/components/sections/diagram/diagramDiff.ts` — pure `diffDiagram(prev, next): DiagramDiff` + `edgeIdentity(edge): string`. ~80 lines.
- **Create** `src/components/sections/diagram/diagramDiff.test.ts` — vitest tests for every diff case enumerated in the spec.
- **Create** `src/components/sections/diagram/AzentNode.tsx` — extracted node renderer with `entering`/`exiting`/`labelRev` support. Uses `streamFlashSpansIn` for label tipea and `flashBlockOutline` for the orange outline.
- **Create** `src/components/sections/diagram/AzentNode.test.tsx` — vitest + RTL tests.
- **Create** `src/components/sections/diagram/AzentEdge.tsx` — extracted edge renderer with `entering`/`exiting`/`edgeRev` support. Animates `stroke-dashoffset` via WAAPI and fade-swaps the SVG label via `key`.
- **Create** `src/components/sections/diagram/AzentEdge.test.tsx` — vitest + RTL tests for the new flags.
- **Modify** `src/components/sections/diagram/DiagramCanvas.tsx` — owns `prevDiagramRef`, computes diff on each new `data` prop, builds internal render state (next ∪ exiting prev), passes flags into node/edge `data`, schedules cleanups with cancellation, only `fitView` on first mount.
- **Modify** `src/components/sections/diagram/DiagramCanvas.test.tsx` — extend with lifecycle tests.
- **Modify** `src/styles.css` — add `transition: transform` on `.react-flow__node`, `@keyframes` for node enter/exit, `@keyframes` for edge label fade-in, transition rules for edge stroke.
- **Modify** `src/server/browserMcp.ts` — rewrite `set_block_diagram` and `add_agent_block` tool descriptions.
- **Modify** `src/routes/api/chat/stream.ts` — add one line to the system prompt about iterative diagrams.

---

## Task 1: Share `flashBlockOutline` between block and node

**Files:**
- Modify: `src/utils/blockAnimations.ts`
- Modify: `src/components/BrowserToolBridge.tsx`

- [ ] **Step 1: Add the export in `blockAnimations.ts`**

Append at the bottom of `src/utils/blockAnimations.ts`:

```ts
export function flashBlockOutline(element: HTMLElement, durationMs = 400): void {
  element.animate(
    [
      { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
      { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0.7)', outlineOffset: '-8px' },
      { outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgba(255,107,43,0)', outlineOffset: '0px' },
    ],
    { duration: durationMs, easing: 'ease-out' },
  )
}
```

- [ ] **Step 2: Replace the inline helper in `BrowserToolBridge.tsx`**

At the top of the imports block, add `flashBlockOutline` to the existing `blockAnimations` import line:

```ts
import {
  DURATIONS,
  scrollSoPointAt,
  scrollSoElementFocused,
  revealBlockSymmetric,
  flashBlockOutline,
} from '#/utils/blockAnimations'
```

Then delete the inline function near the top of the file (the `function flashBlockOutline(id: string) { ... }` block, around lines 103–114). Replace each call site that previously read `flashBlockOutline(id)` with the new shape `flashBlockOutline(document.getElementById(id)!)`. Concretely, replace every `flashBlockOutline(id)` invocation inside this file (search for `flashBlockOutline(`) with:

```ts
setTimeout(() => {
  const el = document.getElementById(id)
  if (el) flashBlockOutline(el)
}, 0)
```

This matches the previous deferred-via-setTimeout behavior of the inline helper.

- [ ] **Step 3: Verify nothing broke**

Run: `pnpm vitest run`
Expected: All existing tests still pass.

Run: `pnpm build`
Expected: Build succeeds, no TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/blockAnimations.ts src/components/BrowserToolBridge.tsx
git commit -m "refactor(blockAnimations): share flashBlockOutline so node and block can both use it"
```

---

## Task 2: `diagramDiff` skeleton + null-prev case

**Files:**
- Create: `src/components/sections/diagram/diagramDiff.ts`
- Create: `src/components/sections/diagram/diagramDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/sections/diagram/diagramDiff.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { diffDiagram, edgeIdentity } from './diagramDiff'
import type { DiagramJSON } from './types'

const empty = (): DiagramJSON => ({ nodes: [], edges: [] })

describe('diffDiagram', () => {
  it('treats every node and edge as entering when prev is null', () => {
    const next: DiagramJSON = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 100, y: 0 },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
      ],
    }
    const diff = diffDiagram(null, next)
    expect(diff.enteringNodeIds).toEqual(new Set(['a', 'b']))
    expect(diff.enteringEdgeIds).toEqual(new Set(['e1']))
    expect(diff.exitingNodeIds.size).toBe(0)
    expect(diff.exitingEdgeIds.size).toBe(0)
    expect(diff.movedNodeIds.size).toBe(0)
    expect(diff.changedLabelNodeIds.size).toBe(0)
    expect(diff.changedEdgeIds.size).toBe(0)
  })

  it('edgeIdentity falls back to source->target when no id', () => {
    expect(edgeIdentity({ source: 'a', target: 'b' })).toBe('a->b')
    expect(edgeIdentity({ id: 'x', source: 'a', target: 'b' })).toBe('x')
  })
})

// Unused but keeps the import warning quiet for future cases.
void empty
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Write the minimal implementation**

Create `src/components/sections/diagram/diagramDiff.ts`:

```ts
import type { DiagramJSON, DiagramEdgeDef } from './types'

export type DiagramDiff = {
  enteringNodeIds: Set<string>
  exitingNodeIds: Set<string>
  movedNodeIds: Set<string>
  changedLabelNodeIds: Set<string>
  enteringEdgeIds: Set<string>
  exitingEdgeIds: Set<string>
  changedEdgeIds: Set<string>
}

export function edgeIdentity(edge: DiagramEdgeDef): string {
  return edge.id ?? `${edge.source}->${edge.target}`
}

function emptyDiff(): DiagramDiff {
  return {
    enteringNodeIds: new Set(),
    exitingNodeIds: new Set(),
    movedNodeIds: new Set(),
    changedLabelNodeIds: new Set(),
    enteringEdgeIds: new Set(),
    exitingEdgeIds: new Set(),
    changedEdgeIds: new Set(),
  }
}

export function diffDiagram(prev: DiagramJSON | null, next: DiagramJSON): DiagramDiff {
  const diff = emptyDiff()
  if (!prev) {
    for (const n of next.nodes) diff.enteringNodeIds.add(n.id)
    for (const e of next.edges) diff.enteringEdgeIds.add(edgeIdentity(e))
    return diff
  }
  return diff
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/diagramDiff.ts src/components/sections/diagram/diagramDiff.test.ts
git commit -m "feat(diagramDiff): skeleton + null-prev treats everything as entering"
```

---

## Task 3: Diff identical snapshots → all sets empty

**Files:**
- Modify: `src/components/sections/diagram/diagramDiff.ts`
- Modify: `src/components/sections/diagram/diagramDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describe('diffDiagram', ...)` block:

```ts
  it('returns all-empty sets when prev and next are deeply equal', () => {
    const snap: DiagramJSON = {
      nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
      edges: [{ id: 'e1', source: 'a', target: 'a' }],
    }
    const diff = diffDiagram(snap, snap)
    expect(diff.enteringNodeIds.size).toBe(0)
    expect(diff.exitingNodeIds.size).toBe(0)
    expect(diff.movedNodeIds.size).toBe(0)
    expect(diff.changedLabelNodeIds.size).toBe(0)
    expect(diff.enteringEdgeIds.size).toBe(0)
    expect(diff.exitingEdgeIds.size).toBe(0)
    expect(diff.changedEdgeIds.size).toBe(0)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: FAIL — the `prev` branch currently returns `emptyDiff()` without indexing nodes; but actually since `prev` is non-null and we never set anything yet, the test passes by accident. If it does PASS, that's fine — proceed.

- [ ] **Step 3: Make the implementation handle the non-null branch (still all-empty for identical input)**

Replace the body of `diffDiagram` with:

```ts
export function diffDiagram(prev: DiagramJSON | null, next: DiagramJSON): DiagramDiff {
  const diff = emptyDiff()
  if (!prev) {
    for (const n of next.nodes) diff.enteringNodeIds.add(n.id)
    for (const e of next.edges) diff.enteringEdgeIds.add(edgeIdentity(e))
    return diff
  }

  const prevNodeById = new Map(prev.nodes.map((n) => [n.id, n]))
  const nextNodeIds = new Set(next.nodes.map((n) => n.id))

  // Future case branches (add/remove/move/label) build on these.
  void prevNodeById
  void nextNodeIds

  const prevEdgeById = new Map(prev.edges.map((e) => [edgeIdentity(e), e]))
  const nextEdgeIds = new Set(next.edges.map((e) => edgeIdentity(e)))
  void prevEdgeById
  void nextEdgeIds

  return diff
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/diagramDiff.ts src/components/sections/diagram/diagramDiff.test.ts
git commit -m "feat(diagramDiff): identical snapshots produce empty diff"
```

---

## Task 4: Diff detects added nodes

**Files:**
- Modify: `src/components/sections/diagram/diagramDiff.ts`
- Modify: `src/components/sections/diagram/diagramDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describe` block:

```ts
  it('flags a brand-new node as entering, leaves others alone', () => {
    const prev: DiagramJSON = {
      nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
      edges: [],
    }
    const next: DiagramJSON = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 100, y: 0 },
      ],
      edges: [],
    }
    const diff = diffDiagram(prev, next)
    expect(diff.enteringNodeIds).toEqual(new Set(['b']))
    expect(diff.movedNodeIds.size).toBe(0)
    expect(diff.exitingNodeIds.size).toBe(0)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: FAIL — `enteringNodeIds` is empty because the non-null branch doesn't set it yet.

- [ ] **Step 3: Implement the entering-node branch**

Inside `diffDiagram` (still in the non-null `prev` branch), after the existing `prevNodeById` declaration and before the edge maps, replace the placeholder `void prevNodeById; void nextNodeIds;` lines with:

```ts
  for (const n of next.nodes) {
    if (!prevNodeById.has(n.id)) {
      diff.enteringNodeIds.add(n.id)
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/diagramDiff.ts src/components/sections/diagram/diagramDiff.test.ts
git commit -m "feat(diagramDiff): detect entering nodes"
```

---

## Task 5: Diff detects removed nodes and their orphan edges

**Files:**
- Modify: `src/components/sections/diagram/diagramDiff.ts`
- Modify: `src/components/sections/diagram/diagramDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describe` block:

```ts
  it('flags a removed node as exiting, plus any edges touching it', () => {
    const prev: DiagramJSON = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 100, y: 0 },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b' },
      ],
    }
    const next: DiagramJSON = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
      ],
      edges: [],
    }
    const diff = diffDiagram(prev, next)
    expect(diff.exitingNodeIds).toEqual(new Set(['b']))
    expect(diff.exitingEdgeIds).toEqual(new Set(['e1']))
    expect(diff.enteringNodeIds.size).toBe(0)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: FAIL — exit detection not implemented.

- [ ] **Step 3: Implement the exiting branches**

Inside `diffDiagram`'s non-null branch, after the entering-node loop and after the edge maps are declared, replace the `void prevEdgeById; void nextEdgeIds;` placeholder with:

```ts
  for (const n of prev.nodes) {
    if (!nextNodeIds.has(n.id)) {
      diff.exitingNodeIds.add(n.id)
    }
  }

  for (const e of prev.edges) {
    const id = edgeIdentity(e)
    if (!nextEdgeIds.has(id)) {
      diff.exitingEdgeIds.add(id)
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: PASS (5 tests). The edge `e1` is in `prev` but not in `next` (we removed it), so it's exiting whether or not its endpoints survive.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/diagramDiff.ts src/components/sections/diagram/diagramDiff.test.ts
git commit -m "feat(diagramDiff): detect exiting nodes and edges"
```

---

## Task 6: Diff detects moved nodes

**Files:**
- Modify: `src/components/sections/diagram/diagramDiff.ts`
- Modify: `src/components/sections/diagram/diagramDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describe` block:

```ts
  it('flags a node with changed x or y as moved', () => {
    const prev: DiagramJSON = {
      nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
      edges: [],
    }
    const next: DiagramJSON = {
      nodes: [{ id: 'a', label: 'A', x: 80, y: 0 }],
      edges: [],
    }
    const diff = diffDiagram(prev, next)
    expect(diff.movedNodeIds).toEqual(new Set(['a']))
    expect(diff.enteringNodeIds.size).toBe(0)
    expect(diff.changedLabelNodeIds.size).toBe(0)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: FAIL — `movedNodeIds` empty.

- [ ] **Step 3: Implement the moved-node detection**

Inside `diffDiagram`'s non-null branch, augment the entering-node loop so it also handles the matched-node case. Replace the entering loop with:

```ts
  for (const n of next.nodes) {
    const prevNode = prevNodeById.get(n.id)
    if (!prevNode) {
      diff.enteringNodeIds.add(n.id)
      continue
    }
    if (prevNode.x !== n.x || prevNode.y !== n.y) {
      diff.movedNodeIds.add(n.id)
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/diagramDiff.ts src/components/sections/diagram/diagramDiff.test.ts
git commit -m "feat(diagramDiff): detect moved nodes by position change"
```

---

## Task 7: Diff detects node label changes

**Files:**
- Modify: `src/components/sections/diagram/diagramDiff.ts`
- Modify: `src/components/sections/diagram/diagramDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describe` block:

```ts
  it('flags a node whose label changed (same id, same position) as changedLabel', () => {
    const prev: DiagramJSON = {
      nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
      edges: [],
    }
    const next: DiagramJSON = {
      nodes: [{ id: 'a', label: 'A renombrado', x: 0, y: 0 }],
      edges: [],
    }
    const diff = diffDiagram(prev, next)
    expect(diff.changedLabelNodeIds).toEqual(new Set(['a']))
    expect(diff.movedNodeIds.size).toBe(0)
    expect(diff.enteringNodeIds.size).toBe(0)
  })

  it('flags a node as both moved and changedLabel when both change at once', () => {
    const prev: DiagramJSON = {
      nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
      edges: [],
    }
    const next: DiagramJSON = {
      nodes: [{ id: 'a', label: 'A nuevo', x: 80, y: 12 }],
      edges: [],
    }
    const diff = diffDiagram(prev, next)
    expect(diff.movedNodeIds).toEqual(new Set(['a']))
    expect(diff.changedLabelNodeIds).toEqual(new Set(['a']))
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: FAIL — `changedLabelNodeIds` empty.

- [ ] **Step 3: Implement label detection inside the entering loop**

Replace the entering loop body (inside `diffDiagram`'s non-null branch) with:

```ts
  for (const n of next.nodes) {
    const prevNode = prevNodeById.get(n.id)
    if (!prevNode) {
      diff.enteringNodeIds.add(n.id)
      continue
    }
    if (prevNode.x !== n.x || prevNode.y !== n.y) {
      diff.movedNodeIds.add(n.id)
    }
    if (prevNode.label !== n.label) {
      diff.changedLabelNodeIds.add(n.id)
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/diagramDiff.ts src/components/sections/diagram/diagramDiff.test.ts
git commit -m "feat(diagramDiff): detect changed node labels"
```

---

## Task 8: Diff detects entering edges + identity fallback

**Files:**
- Modify: `src/components/sections/diagram/diagramDiff.ts`
- Modify: `src/components/sections/diagram/diagramDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describe` block:

```ts
  it('flags a brand-new edge as entering using source->target when no id', () => {
    const prev: DiagramJSON = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 80, y: 0 },
      ],
      edges: [],
    }
    const next: DiagramJSON = {
      nodes: prev.nodes,
      edges: [{ source: 'a', target: 'b' }],
    }
    const diff = diffDiagram(prev, next)
    expect(diff.enteringEdgeIds).toEqual(new Set(['a->b']))
    expect(diff.exitingEdgeIds.size).toBe(0)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: FAIL — `enteringEdgeIds` is empty.

- [ ] **Step 3: Implement entering-edge detection**

After the existing exiting-edge loop in `diffDiagram` (still inside the non-null branch), add an entering-edge loop:

```ts
  for (const e of next.edges) {
    const id = edgeIdentity(e)
    if (!prevEdgeById.has(id)) {
      diff.enteringEdgeIds.add(id)
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/diagramDiff.ts src/components/sections/diagram/diagramDiff.test.ts
git commit -m "feat(diagramDiff): detect entering edges via id or source->target identity"
```

---

## Task 9: Diff treats endpoint swap as exit + entry

**Files:**
- Modify: `src/components/sections/diagram/diagramDiff.ts`
- Modify: `src/components/sections/diagram/diagramDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describe` block:

```ts
  it('treats an explicit-id edge whose endpoints change as exit + entry', () => {
    const prev: DiagramJSON = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 80, y: 0 },
        { id: 'c', label: 'C', x: 160, y: 0 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
    }
    const next: DiagramJSON = {
      nodes: prev.nodes,
      edges: [{ id: 'e1', source: 'a', target: 'c' }],
    }
    const diff = diffDiagram(prev, next)
    expect(diff.exitingEdgeIds).toEqual(new Set(['e1']))
    expect(diff.enteringEdgeIds).toEqual(new Set(['e1']))
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: FAIL — current implementation matches by `id` only, so it sees `e1` in both and marks no diff.

- [ ] **Step 3: Implement endpoint-swap detection**

Inside the entering-edge loop, refine the "matched by id but endpoints differ" case. Replace the entering-edge loop with:

```ts
  for (const e of next.edges) {
    const id = edgeIdentity(e)
    const prevEdge = prevEdgeById.get(id)
    if (!prevEdge) {
      diff.enteringEdgeIds.add(id)
      continue
    }
    if (prevEdge.source !== e.source || prevEdge.target !== e.target) {
      diff.exitingEdgeIds.add(id)
      diff.enteringEdgeIds.add(id)
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/diagramDiff.ts src/components/sections/diagram/diagramDiff.test.ts
git commit -m "feat(diagramDiff): treat endpoint swap as exit + entry"
```

---

## Task 10: Diff detects changed edge label or highlight

**Files:**
- Modify: `src/components/sections/diagram/diagramDiff.ts`
- Modify: `src/components/sections/diagram/diagramDiff.test.ts`

- [ ] **Step 1: Write the failing test**

Append inside the `describe` block:

```ts
  it('flags an edge as changed when only its label differs', () => {
    const prev: DiagramJSON = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 80, y: 0 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b', label: 'antes' }],
    }
    const next: DiagramJSON = {
      nodes: prev.nodes,
      edges: [{ id: 'e1', source: 'a', target: 'b', label: 'después' }],
    }
    const diff = diffDiagram(prev, next)
    expect(diff.changedEdgeIds).toEqual(new Set(['e1']))
    expect(diff.enteringEdgeIds.size).toBe(0)
    expect(diff.exitingEdgeIds.size).toBe(0)
  })

  it('flags an edge as changed when highlight flips', () => {
    const prev: DiagramJSON = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 80, y: 0 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
    }
    const next: DiagramJSON = {
      nodes: prev.nodes,
      edges: [{ id: 'e1', source: 'a', target: 'b', highlight: true }],
    }
    const diff = diffDiagram(prev, next)
    expect(diff.changedEdgeIds).toEqual(new Set(['e1']))
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: FAIL — `changedEdgeIds` empty.

- [ ] **Step 3: Implement changed-edge detection**

Replace the entering-edge loop with:

```ts
  for (const e of next.edges) {
    const id = edgeIdentity(e)
    const prevEdge = prevEdgeById.get(id)
    if (!prevEdge) {
      diff.enteringEdgeIds.add(id)
      continue
    }
    if (prevEdge.source !== e.source || prevEdge.target !== e.target) {
      diff.exitingEdgeIds.add(id)
      diff.enteringEdgeIds.add(id)
      continue
    }
    const labelChanged = (prevEdge.label ?? '') !== (e.label ?? '')
    const highlightChanged = (prevEdge.highlight ?? false) !== (e.highlight ?? false)
    if (labelChanged || highlightChanged) {
      diff.changedEdgeIds.add(id)
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/sections/diagram/diagramDiff.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/diagramDiff.ts src/components/sections/diagram/diagramDiff.test.ts
git commit -m "feat(diagramDiff): detect changed edge label or highlight"
```

---

## Task 11: Add CSS for move transition + enter/exit keyframes + edge label fade

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Append the new rules**

Append at the bottom of `src/styles.css`:

```css
/* Diagram iterative streaming — move transitions and enter/exit keyframes. */

.react-flow__node {
  transition: transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes azent-node-enter {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes azent-node-exit {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.9); }
}

.azent-node--entering {
  animation: azent-node-enter 400ms ease-out forwards;
}

.azent-node--exiting {
  animation: azent-node-exit 280ms ease-in forwards;
  pointer-events: none;
}

.azent-edge__path {
  transition: stroke 300ms ease-out, stroke-width 300ms ease-out, opacity 240ms ease-in;
}

@keyframes azent-edge-label-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.azent-edge__label-wrap {
  animation: azent-edge-label-in 300ms ease-out forwards;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds. No tests yet because CSS isn't directly testable.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(diagram): css for move transition, node enter/exit, edge transitions"
```

---

## Task 12: Extract `AzentNode` (no behavior change)

**Files:**
- Create: `src/components/sections/diagram/AzentNode.tsx`
- Create: `src/components/sections/diagram/AzentNode.test.tsx`
- Modify: `src/components/sections/diagram/DiagramCanvas.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/sections/diagram/AzentNode.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AzentNode } from './AzentNode'
import type { NodeProps, Node } from '@xyflow/react'

type Data = { label: string; entering?: boolean; exiting?: boolean; labelRev?: number }

function makeProps(data: Data): NodeProps<Node<Data>> {
  // ReactFlow passes a richer prop shape; we cast because the component only
  // reads `data` in V1.
  return { data, id: 'n1' } as unknown as NodeProps<Node<Data>>
}

describe('AzentNode', () => {
  it('renders the label text', () => {
    const { getByText } = render(<AzentNode {...makeProps({ label: 'Hola' })} />)
    expect(getByText('Hola')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/AzentNode.test.tsx`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Create `AzentNode.tsx`**

Create `src/components/sections/diagram/AzentNode.tsx`:

```tsx
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'

export type AzentNodeData = {
  label: string
  entering?: boolean
  exiting?: boolean
  labelRev?: number
}

const HANDLE_STYLE = {
  background: 'transparent',
  border: 'none',
  width: 1,
  height: 1,
  opacity: 0,
} as const

export function AzentNode({ data }: NodeProps<Node<AzentNodeData>>) {
  return (
    <div
      className="azent-node"
      style={{
        background: 'transparent',
        border: '1px solid var(--prose-muted)',
        borderRadius: 8,
        padding: '12px 18px',
        minWidth: 110,
        textAlign: 'center',
        userSelect: 'none',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <Handle id="t-top"    type="target" position={Position.Top}    style={HANDLE_STYLE} />
      <Handle id="s-top"    type="source" position={Position.Top}    style={HANDLE_STYLE} />
      <Handle id="t-right"  type="target" position={Position.Right}  style={HANDLE_STYLE} />
      <Handle id="s-right"  type="source" position={Position.Right}  style={HANDLE_STYLE} />
      <Handle id="t-bottom" type="target" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle id="t-left"   type="target" position={Position.Left}   style={HANDLE_STYLE} />
      <Handle id="s-left"   type="source" position={Position.Left}   style={HANDLE_STYLE} />
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
    </div>
  )
}
```

- [ ] **Step 4: Wire it from `DiagramCanvas.tsx`**

In `src/components/sections/diagram/DiagramCanvas.tsx`:
1. Delete the local `AzentNode` function and the local `AzentNodeData` type alias.
2. At the top of the imports block, add: `import { AzentNode, type AzentNodeData } from './AzentNode'`.
3. The `const nodeTypes = { azent: AzentNode }` line stays.
4. Replace the `data: { label: n.label }` line inside `toRFNodes` with the explicitly typed shape — leave it as is, the inferred `AzentNodeData` is structural.

- [ ] **Step 5: Run all diagram tests**

Run: `pnpm vitest run src/components/sections/diagram`
Expected: PASS (existing canvas test + new AzentNode test).

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/diagram/AzentNode.tsx src/components/sections/diagram/AzentNode.test.tsx src/components/sections/diagram/DiagramCanvas.tsx
git commit -m "refactor(diagram): extract AzentNode into its own file (no behavior change)"
```

---

## Task 13: `AzentNode` consumes `entering` + outline flash + tipea label

**Files:**
- Modify: `src/components/sections/diagram/AzentNode.tsx`
- Modify: `src/components/sections/diagram/AzentNode.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside `describe('AzentNode', ...)`:

```tsx
  it('applies the entering class when entering is true', () => {
    const { container } = render(
      <AzentNode {...makeProps({ label: 'Hola', entering: true })} />,
    )
    const root = container.querySelector('.azent-node')
    expect(root?.classList.contains('azent-node--entering')).toBe(true)
  })

  it('wraps the label in a data-flash span when entering is true', () => {
    const { container } = render(
      <AzentNode {...makeProps({ label: 'Hola', entering: true })} />,
    )
    const span = container.querySelector('span[data-flash]')
    expect(span?.textContent).toBe('Hola')
  })

  it('applies the exiting class when exiting is true', () => {
    const { container } = render(
      <AzentNode {...makeProps({ label: 'Hola', exiting: true })} />,
    )
    const root = container.querySelector('.azent-node')
    expect(root?.classList.contains('azent-node--exiting')).toBe(true)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/sections/diagram/AzentNode.test.tsx`
Expected: FAIL — entering/exiting classes and `data-flash` span don't exist.

- [ ] **Step 3: Update `AzentNode.tsx`**

Replace the entire `AzentNode.tsx` content with:

```tsx
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { streamFlashSpansIn } from '#/utils/streamFlash'
import { flashBlockOutline } from '#/utils/blockAnimations'

export type AzentNodeData = {
  label: string
  entering?: boolean
  exiting?: boolean
  labelRev?: number
}

const HANDLE_STYLE = {
  background: 'transparent',
  border: 'none',
  width: 1,
  height: 1,
  opacity: 0,
} as const

export function AzentNode({ data }: NodeProps<Node<AzentNodeData>>) {
  const { label, entering, exiting, labelRev = 0 } = data
  const containerRef = useRef<HTMLDivElement>(null)
  const labelBoxRef = useRef<HTMLDivElement>(null)

  // Trigger the orange outline flash + label tipea when entering or whenever
  // labelRev bumps. Each effect run is independent — `streamFlashSpansIn`
  // skips spans already marked `data-streamed`, so the `key={labelRev}` on
  // the span guarantees a fresh DOM node and a fresh tipea.
  useEffect(() => {
    if (!labelBoxRef.current) return
    streamFlashSpansIn(labelBoxRef.current)
  }, [entering, labelRev])

  useEffect(() => {
    if (entering && containerRef.current) {
      flashBlockOutline(containerRef.current, 600)
    }
  }, [entering])

  const flashable = entering || labelRev > 0

  return (
    <div
      ref={containerRef}
      className={[
        'azent-node',
        entering ? 'azent-node--entering' : '',
        exiting ? 'azent-node--exiting' : '',
      ].filter(Boolean).join(' ')}
      style={{
        background: 'transparent',
        border: '1px solid var(--prose-muted)',
        borderRadius: 8,
        padding: '12px 18px',
        minWidth: 110,
        textAlign: 'center',
        userSelect: 'none',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <Handle id="t-top"    type="target" position={Position.Top}    style={HANDLE_STYLE} />
      <Handle id="s-top"    type="source" position={Position.Top}    style={HANDLE_STYLE} />
      <Handle id="t-right"  type="target" position={Position.Right}  style={HANDLE_STYLE} />
      <Handle id="s-right"  type="source" position={Position.Right}  style={HANDLE_STYLE} />
      <Handle id="t-bottom" type="target" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle id="s-bottom" type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle id="t-left"   type="target" position={Position.Left}   style={HANDLE_STYLE} />
      <Handle id="s-left"   type="source" position={Position.Left}   style={HANDLE_STYLE} />
      <div
        ref={labelBoxRef}
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--prose-heading)',
          letterSpacing: '0.005em',
        }}
      >
        {flashable ? (
          <span key={labelRev} data-flash="">{label}</span>
        ) : (
          label
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/components/sections/diagram/AzentNode.test.tsx`
Expected: PASS (4 tests).

Note: the `streamFlashSpansIn` `useEffect` will run in tests, but jsdom doesn't actually animate — the function reads `textContent`, clears it, and schedules `setTimeout` ticks to append tokens. The tests don't assert on the resulting text after streaming; they check the initial `data-flash` span exists with text content "Hola" (the original text), which is true at render time before the effect runs.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/AzentNode.tsx src/components/sections/diagram/AzentNode.test.tsx
git commit -m "feat(AzentNode): entering class, outline flash, label tipea via streamFlashSpansIn"
```

---

## Task 14: `AzentNode` re-tipea label when `labelRev` bumps

**Files:**
- Modify: `src/components/sections/diagram/AzentNode.test.tsx`

- [ ] **Step 1: Write the failing test**

Append inside `describe('AzentNode', ...)`:

```tsx
  it('uses labelRev as the span key so re-renders mount a fresh data-flash span', async () => {
    const { container, rerender } = render(
      <AzentNode {...makeProps({ label: 'A', labelRev: 1 })} />,
    )
    const first = container.querySelector('span[data-flash]')
    expect(first?.textContent).toBe('A')

    rerender(<AzentNode {...makeProps({ label: 'B', labelRev: 2 })} />)
    const second = container.querySelector('span[data-flash]')
    expect(second?.textContent).toBe('B')
    // The keys differ so the DOM node identity must have changed.
    expect(first).not.toBe(second)
  })
```

- [ ] **Step 2: Run tests**

Run: `pnpm vitest run src/components/sections/diagram/AzentNode.test.tsx`
Expected: PASS — Task 13's implementation already satisfies this (the `key={labelRev}` line). The test is here to lock the behavior in place against regressions.

If it FAILS, double-check that `flashable = entering || labelRev > 0` and that the `key={labelRev}` is on the rendered span.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/diagram/AzentNode.test.tsx
git commit -m "test(AzentNode): lock label re-mount on labelRev change"
```

---

## Task 15: Extract `AzentEdge` (no behavior change)

**Files:**
- Create: `src/components/sections/diagram/AzentEdge.tsx`
- Create: `src/components/sections/diagram/AzentEdge.test.tsx`
- Modify: `src/components/sections/diagram/DiagramCanvas.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/sections/diagram/AzentEdge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AzentEdge } from './AzentEdge'
import type { EdgeProps, Edge } from '@xyflow/react'
import { Position } from '@xyflow/react'

type Data = { highlight?: boolean; entering?: boolean; exiting?: boolean; edgeRev?: number }

function makeProps(data: Data, label?: string): EdgeProps<Edge<Data>> {
  return {
    id: 'e1',
    source: 'a',
    target: 'b',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 0,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data,
    label,
  } as unknown as EdgeProps<Edge<Data>>
}

describe('AzentEdge', () => {
  it('renders a path inside an svg wrapper', () => {
    const { container } = render(
      <svg>
        <AzentEdge {...makeProps({})} />
      </svg>,
    )
    expect(container.querySelector('path')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/AzentEdge.test.tsx`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Create `AzentEdge.tsx`**

Create `src/components/sections/diagram/AzentEdge.tsx`:

```tsx
import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps, Edge } from '@xyflow/react'

export type AzentEdgeData = {
  highlight?: boolean
  entering?: boolean
  exiting?: boolean
  edgeRev?: number
}

export function AzentEdge({
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
        className="azent-edge__path"
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
```

- [ ] **Step 4: Wire it from `DiagramCanvas.tsx`**

In `src/components/sections/diagram/DiagramCanvas.tsx`:
1. Delete the local `AzentEdge` function and the local `AzentEdgeData` type alias.
2. Delete the now-unused imports from `@xyflow/react` that only the inline edge used: keep `ReactFlow`, `Background`, `useNodesState`, `useEdgesState`, `MarkerType`; drop `getBezierPath`, `BaseEdge`, `Handle`, `Position`, `NodeProps`, `EdgeProps` (these moved into the new files).
3. At the top, add: `import { AzentEdge, type AzentEdgeData } from './AzentEdge'`.
4. Keep the `const edgeTypes = { azent: AzentEdge }` line.

- [ ] **Step 5: Run all diagram tests**

Run: `pnpm vitest run src/components/sections/diagram`
Expected: PASS (canvas + AzentNode + AzentEdge).

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/diagram/AzentEdge.tsx src/components/sections/diagram/AzentEdge.test.tsx src/components/sections/diagram/DiagramCanvas.tsx
git commit -m "refactor(diagram): extract AzentEdge into its own file (no behavior change)"
```

---

## Task 16: `AzentEdge` stroke-draw on entering

**Files:**
- Modify: `src/components/sections/diagram/AzentEdge.tsx`
- Modify: `src/components/sections/diagram/AzentEdge.test.tsx`

- [ ] **Step 1: Write the failing test**

Append inside `describe('AzentEdge', ...)`:

```tsx
  it('sets stroke-dasharray and dashoffset on the path when entering is true', () => {
    const { container } = render(
      <svg>
        <AzentEdge {...makeProps({ entering: true })} />
      </svg>,
    )
    const path = container.querySelector('path.azent-edge__path') as SVGPathElement | null
    expect(path).toBeTruthy()
    // In jsdom getTotalLength returns 0 for synthetic paths, so we only
    // verify that the inline-style dasharray is set (even to "0"), which
    // proves the entering-branch ran.
    expect(path?.style.strokeDasharray).not.toBe('')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/AzentEdge.test.tsx`
Expected: FAIL — no stroke-dasharray applied.

- [ ] **Step 3: Implement stroke-draw**

In `AzentEdge.tsx`, add `useLayoutEffect` and `useRef` from React, and an effect that runs when `entering` is true:

Replace the imports at the top:

```tsx
import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps, Edge } from '@xyflow/react'
import { useLayoutEffect, useRef } from 'react'
```

Inside the component, before the `return`, add:

```tsx
const pathRef = useRef<SVGPathElement>(null)

useLayoutEffect(() => {
  if (!data?.entering) return
  const path = pathRef.current
  if (!path) return
  const length = path.getTotalLength() || 1
  path.style.strokeDasharray = String(length)
  path.style.strokeDashoffset = String(length)
  const animation = path.animate(
    [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
    { duration: 700, easing: 'ease-out', fill: 'forwards' },
  )
  return () => {
    animation.cancel()
    path.style.strokeDasharray = ''
    path.style.strokeDashoffset = ''
  }
}, [data?.entering, edgePath])
```

Then replace the `<BaseEdge>` element with a wrapper that forwards a ref to the underlying `<path>`. `BaseEdge` doesn't accept a ref to its path directly. Replace the `<BaseEdge>` line and its containing fragment with:

```tsx
<path
  ref={pathRef}
  id={id}
  d={edgePath}
  className="azent-edge__path"
  fill="none"
  markerEnd={typeof markerEnd === 'string' ? markerEnd : undefined}
  style={{ stroke, strokeWidth: 1.25, opacity }}
/>
```

Note: ReactFlow's marker URLs are stringified in render, so the `string`-narrowed prop is what we need. We pass the URL string through; the actual `defs/marker` already exists in ReactFlow's SVG.

Verify that `getBezierPath` returns `[d, labelX, labelY]` as we already use — unchanged.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/components/sections/diagram/AzentEdge.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/AzentEdge.tsx src/components/sections/diagram/AzentEdge.test.tsx
git commit -m "feat(AzentEdge): stroke-draw on entering via getTotalLength + WAAPI"
```

---

## Task 17: `AzentEdge` label fade-swap on `edgeRev` + exit fade

**Files:**
- Modify: `src/components/sections/diagram/AzentEdge.tsx`
- Modify: `src/components/sections/diagram/AzentEdge.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside `describe('AzentEdge', ...)`:

```tsx
  it('wraps the label with a key based on edgeRev for fade-swap', () => {
    const { container, rerender } = render(
      <svg>
        <AzentEdge {...makeProps({ edgeRev: 0 }, 'antes')} />
      </svg>,
    )
    const first = container.querySelector('.azent-edge__label-wrap')
    expect(first?.textContent).toBe('antes')

    rerender(
      <svg>
        <AzentEdge {...makeProps({ edgeRev: 1 }, 'después')} />
      </svg>,
    )
    const second = container.querySelector('.azent-edge__label-wrap')
    expect(second?.textContent).toBe('después')
    expect(first).not.toBe(second)
  })

  it('drops opacity to 0 in inline style when exiting is true', () => {
    const { container } = render(
      <svg>
        <AzentEdge {...makeProps({ exiting: true })} />
      </svg>,
    )
    const path = container.querySelector('path.azent-edge__path') as SVGPathElement | null
    expect(path?.style.opacity).toBe('0')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/sections/diagram/AzentEdge.test.tsx`
Expected: FAIL — `.azent-edge__label-wrap` not present, opacity not 0.

- [ ] **Step 3: Wrap the SVG label and adjust opacity on exit**

In `AzentEdge.tsx`, replace the `{label && <text ...>` block with a `<g>` wrapper carrying the class and the rev-based key:

```tsx
{label && (
  <g key={data?.edgeRev ?? 0} className="azent-edge__label-wrap">
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
  </g>
)}
```

Also update the `<path>` style to apply `opacity: 0` when exiting:

```tsx
const exiting = data?.exiting === true
// ... inside the path:
style={{ stroke, strokeWidth: 1.25, opacity: exiting ? 0 : opacity }}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/components/sections/diagram/AzentEdge.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/AzentEdge.tsx src/components/sections/diagram/AzentEdge.test.tsx
git commit -m "feat(AzentEdge): fade-swap label on edgeRev, fade-out on exiting"
```

---

## Task 18: `DiagramCanvas` consumes diff, marks entering on first mount

**Files:**
- Modify: `src/components/sections/diagram/DiagramCanvas.tsx`
- Modify: `src/components/sections/diagram/DiagramCanvas.test.tsx`

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('DiagramCanvas', ...)` block:

```tsx
  it('marks every node and edge as entering on first mount', async () => {
    const data = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 100, y: 0 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
    }
    const { container, findAllByText } = render(<DiagramCanvas data={data} />)
    // Wait one tick for the ClientOnly wrapper to mount.
    await findAllByText('A')
    const nodes = container.querySelectorAll('.azent-node')
    expect(nodes.length).toBe(2)
    nodes.forEach((n) => {
      expect(n.classList.contains('azent-node--entering')).toBe(true)
    })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/DiagramCanvas.test.tsx`
Expected: FAIL — `azent-node--entering` not applied because the canvas hasn't been rewired yet.

- [ ] **Step 3: Rewrite `DiagramCanvas.tsx` to compute the diff**

Replace the body of `DiagramCanvas.tsx` with this (preserving the existing imports for `ReactFlow`, `Background`, `useNodesState`, `useEdgesState`, `MarkerType`, plus the new `AzentNode`, `AzentEdge` imports, plus `useEffect`, `useRef`, `useState`, plus `diffDiagram`, `edgeIdentity`):

```tsx
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'
import type { DiagramJSON, DiagramNodeDef, DiagramEdgeDef } from './types'
import { AzentNode, type AzentNodeData } from './AzentNode'
import { AzentEdge, type AzentEdgeData } from './AzentEdge'
import { diffDiagram, edgeIdentity } from './diagramDiff'
import '@xyflow/react/dist/style.css'

const nodeTypes = { azent: AzentNode }
const edgeTypes = { azent: AzentEdge }

type Side = 'top' | 'right' | 'bottom' | 'left'

function pickSides(source: DiagramNodeDef, target: DiagramNodeDef): { source: Side; target: Side } {
  const dx = target.x - source.x
  const dy = target.y - source.y
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0
      ? { source: 'right', target: 'left' }
      : { source: 'left', target: 'right' }
  }
  return dy > 0
    ? { source: 'bottom', target: 'top' }
    : { source: 'top', target: 'bottom' }
}

function buildNode(
  def: DiagramNodeDef,
  flags: { entering: boolean; exiting: boolean; labelRev: number },
): Node<AzentNodeData> {
  return {
    id: def.id,
    type: 'azent',
    position: { x: def.x, y: def.y },
    data: {
      label: def.label,
      entering: flags.entering,
      exiting: flags.exiting,
      labelRev: flags.labelRev,
    },
  }
}

function buildEdge(
  def: DiagramEdgeDef,
  nodeMap: Map<string, DiagramNodeDef>,
  flags: { entering: boolean; exiting: boolean; edgeRev: number },
): Edge<AzentEdgeData> {
  const sourceNode = nodeMap.get(def.source)
  const targetNode = nodeMap.get(def.target)
  const sides = sourceNode && targetNode
    ? pickSides(sourceNode, targetNode)
    : ({ source: 'bottom', target: 'top' } as const)
  return {
    id: edgeIdentity(def),
    source: def.source,
    target: def.target,
    sourceHandle: `s-${sides.source}`,
    targetHandle: `t-${sides.target}`,
    type: 'azent',
    label: def.label,
    data: {
      highlight: def.highlight === true,
      entering: flags.entering,
      exiting: flags.exiting,
      edgeRev: flags.edgeRev,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: def.highlight ? 'var(--prose-accent)' : 'var(--prose-muted)',
    },
  }
}

function DiagramGraph({ data }: Readonly<{ data: DiagramJSON }>) {
  const prevRef = useRef<DiagramJSON | null>(null)
  const labelRevsRef = useRef<Map<string, number>>(new Map())
  const edgeRevsRef = useRef<Map<string, number>>(new Map())

  const initial = (() => {
    const diff = diffDiagram(null, data)
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]))
    const nodes = data.nodes.map((n) =>
      buildNode(n, {
        entering: diff.enteringNodeIds.has(n.id),
        exiting: false,
        labelRev: 0,
      }),
    )
    const edges = data.edges.map((e) =>
      buildEdge(e, nodeMap, {
        entering: diff.enteringEdgeIds.has(edgeIdentity(e)),
        exiting: false,
        edgeRev: 0,
      }),
    )
    return { nodes, edges }
  })()

  const [nodes, setNodes] = useNodesState<Node<AzentNodeData>>(initial.nodes)
  const [edges, setEdges] = useEdgesState<Edge<AzentEdgeData>>(initial.edges)

  // Persist the initial snapshot as the "previous" baseline so the data-change
  // effect added in Task 19 has something to diff against.
  useEffect(() => {
    prevRef.current = data
    // Quiet unused warnings while the full diff-update logic lands in Task 19.
    void labelRevsRef
    void edgeRevsRef
    void setNodes
    void setEdges
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      nodesFocusable={false}
      edgesFocusable={false}
      elementsSelectable={false}
      panOnDrag={false}
      panOnScroll={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      preventScrolling={false}
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
    <div data-diagram-canvas className="w-full h-[320px] md:h-[480px]">
      <ClientOnly>
        <DiagramGraph data={data} />
      </ClientOnly>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/components/sections/diagram/DiagramCanvas.test.tsx`
Expected: PASS — both nodes are marked entering on first mount.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/DiagramCanvas.tsx src/components/sections/diagram/DiagramCanvas.test.tsx
git commit -m "feat(DiagramCanvas): mark every node/edge as entering on first mount"
```

---

## Task 19: `DiagramCanvas` recomputes on update, persists exiting items, schedules cleanup

**Files:**
- Modify: `src/components/sections/diagram/DiagramCanvas.tsx`
- Modify: `src/components/sections/diagram/DiagramCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside `describe('DiagramCanvas', ...)`:

```tsx
  it('keeps a removed node mounted for ~280ms with the exiting flag, then drops it', async () => {
    vi.useFakeTimers()
    try {
      const initialData = {
        nodes: [
          { id: 'a', label: 'A', x: 0, y: 0 },
          { id: 'b', label: 'B', x: 100, y: 0 },
        ],
        edges: [],
      }
      const { container, rerender, findAllByText } = render(<DiagramCanvas data={initialData} />)
      await vi.runOnlyPendingTimersAsync()
      await findAllByText('A')

      const nextData = {
        nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
        edges: [],
      }
      rerender(<DiagramCanvas data={nextData} />)

      // Right after the update, both A and B are still mounted; B is exiting.
      const exiting = container.querySelector('.azent-node--exiting')
      expect(exiting).toBeTruthy()
      expect(container.querySelectorAll('.azent-node').length).toBe(2)

      // Advance past the exit duration. B unmounts.
      vi.advanceTimersByTime(320)
      expect(container.querySelectorAll('.azent-node').length).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
```

Also add the import for `vi` at the top of the test file if not present:

```tsx
import { describe, it, expect, vi } from 'vitest'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/sections/diagram/DiagramCanvas.test.tsx`
Expected: FAIL — the update path doesn't re-diff, exiting nodes aren't held.

- [ ] **Step 3: Implement the update effect**

In `DiagramCanvas.tsx`, replace the mount-only `useEffect(() => { prevRef.current = data; /* voids */ }, [])` block (the one with the eslint-disable comment from Task 18) with a real data-change effect:

```tsx
  useEffect(() => {
    const prev = prevRef.current
    const diff = diffDiagram(prev, data)

    // Bump label/edge revisions for changed items.
    for (const id of diff.changedLabelNodeIds) {
      labelRevsRef.current.set(id, (labelRevsRef.current.get(id) ?? 0) + 1)
    }
    for (const id of diff.changedEdgeIds) {
      edgeRevsRef.current.set(id, (edgeRevsRef.current.get(id) ?? 0) + 1)
    }

    // Build the next render set: canonical next + ghost exiting items.
    const nextNodeMap = new Map(data.nodes.map((n) => [n.id, n]))

    const renderedNodes: Node<AzentNodeData>[] = data.nodes.map((n) =>
      buildNode(n, {
        entering: diff.enteringNodeIds.has(n.id),
        exiting: false,
        labelRev: labelRevsRef.current.get(n.id) ?? 0,
      }),
    )
    if (prev) {
      for (const n of prev.nodes) {
        if (diff.exitingNodeIds.has(n.id) && !diff.enteringNodeIds.has(n.id)) {
          renderedNodes.push(buildNode(n, { entering: false, exiting: true, labelRev: 0 }))
        }
      }
    }

    const renderedEdges: Edge<AzentEdgeData>[] = data.edges.map((e) =>
      buildEdge(e, nextNodeMap, {
        entering: diff.enteringEdgeIds.has(edgeIdentity(e)),
        exiting: false,
        edgeRev: edgeRevsRef.current.get(edgeIdentity(e)) ?? 0,
      }),
    )
    if (prev) {
      const prevNodeMap = new Map(prev.nodes.map((n) => [n.id, n]))
      for (const e of prev.edges) {
        const id = edgeIdentity(e)
        if (diff.exitingEdgeIds.has(id) && !diff.enteringEdgeIds.has(id)) {
          renderedEdges.push(buildEdge(e, prevNodeMap, { entering: false, exiting: true, edgeRev: 0 }))
        }
      }
    }

    setNodes(renderedNodes)
    setEdges(renderedEdges)

    // Schedule cleanup. Drop exiting items after their animation finishes.
    const nodeTimer = window.setTimeout(() => {
      setNodes((current) => current.filter((n) => !diff.exitingNodeIds.has(n.id) || diff.enteringNodeIds.has(n.id)))
    }, 280)
    const edgeTimer = window.setTimeout(() => {
      setEdges((current) =>
        current.filter((e) => {
          const id = edgeIdentity({ id: e.id, source: e.source, target: e.target })
          return !diff.exitingEdgeIds.has(id) || diff.enteringEdgeIds.has(id)
        }),
      )
    }, 240)
    const enteringTimer = window.setTimeout(() => {
      setNodes((current) =>
        current.map((n) =>
          n.data.entering ? { ...n, data: { ...n.data, entering: false } } : n,
        ),
      )
      setEdges((current) =>
        current.map((e) =>
          e.data?.entering ? { ...e, data: { ...e.data, entering: false } } : e,
        ),
      )
    }, 600)

    prevRef.current = data

    return () => {
      clearTimeout(nodeTimer)
      clearTimeout(edgeTimer)
      clearTimeout(enteringTimer)
    }
  }, [data])
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/components/sections/diagram/DiagramCanvas.test.tsx`
Expected: PASS — exit persistence + cleanup verified.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/diagram/DiagramCanvas.tsx src/components/sections/diagram/DiagramCanvas.test.tsx
git commit -m "feat(DiagramCanvas): diff-driven updates, exiting persistence, cleanup timers"
```

---

## Task 20: Cancel pending timers across rapid updates

**Files:**
- Modify: `src/components/sections/diagram/DiagramCanvas.test.tsx`

- [ ] **Step 1: Write the failing test**

Append inside `describe('DiagramCanvas', ...)`:

```tsx
  it('does not lose the second-update entering flag when a first-update timer fires later', async () => {
    vi.useFakeTimers()
    try {
      const first = {
        nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
        edges: [],
      }
      const second = {
        nodes: [
          { id: 'a', label: 'A', x: 0, y: 0 },
          { id: 'b', label: 'B', x: 80, y: 0 },
        ],
        edges: [],
      }
      const { container, rerender, findAllByText } = render(<DiagramCanvas data={first} />)
      await vi.runOnlyPendingTimersAsync()
      await findAllByText('A')

      // Fire a fast second update before the first's entering timer expires.
      vi.advanceTimersByTime(100)
      rerender(<DiagramCanvas data={second} />)

      // B is entering right now.
      const entering = container.querySelectorAll('.azent-node--entering')
      expect(entering.length).toBeGreaterThanOrEqual(1)

      // Advance to where the FIRST update's 600ms cleanup would have fired
      // (we are at 100 + ?ms from second update's start). If timers weren't
      // cancelled, the first run's setNodes(current => map(...)) would
      // also pass through B, clearing its entering flag prematurely.
      vi.advanceTimersByTime(550) // total: 650ms since first mount
      // B's 600ms timer (from the SECOND update) shouldn't have fired yet:
      // it was scheduled at +100ms, fires at +700ms.
      const stillEntering = container.querySelectorAll('.azent-node--entering')
      expect(Array.from(stillEntering).some((n) => n.textContent === 'B')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
```

- [ ] **Step 2: Run test to verify it fails or passes**

Run: `pnpm vitest run src/components/sections/diagram/DiagramCanvas.test.tsx`
Expected: Behavior depends on whether the Task 19 `return () => clearTimeout(...)` cleanup is firing as expected. React calls the effect cleanup before running the next effect, so timers from the first effect should be cancelled when the second effect runs. The test should already PASS thanks to Task 19's `return` — it is locked here against regression.

If it FAILS, double-check that the Task 19 implementation returns the cleanup function.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/diagram/DiagramCanvas.test.tsx
git commit -m "test(DiagramCanvas): cancel pending timers across rapid updates"
```

---

## Task 21: `fitView` only on first mount

**Files:**
- Modify: `src/components/sections/diagram/DiagramCanvas.tsx`

- [ ] **Step 1: Refit only initially**

In `DiagramCanvas.tsx`, the `ReactFlow` element currently has `fitView` (the boolean shorthand). Replace it so we control it manually. Track a "did first fit" ref and call `fitView` imperatively:

Add to imports:

```tsx
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
```

Wrap `DiagramGraph`'s `ReactFlow` in a `ReactFlowProvider`. Concretely, change the `DiagramCanvas` export's JSX from:

```tsx
<ClientOnly>
  <DiagramGraph data={data} />
</ClientOnly>
```

to:

```tsx
<ClientOnly>
  <ReactFlowProvider>
    <DiagramGraph data={data} />
  </ReactFlowProvider>
</ClientOnly>
```

Inside `DiagramGraph`, remove the `fitView` boolean prop and the `fitViewOptions` prop from the `<ReactFlow>` element. Then add at the top of the component:

```tsx
const rf = useReactFlow()
const fittedRef = useRef(false)

useEffect(() => {
  if (fittedRef.current) return
  if (nodes.length === 0) return
  // Defer to next frame so ReactFlow has laid out the nodes.
  const id = requestAnimationFrame(() => {
    rf.fitView({ padding: 0.2, duration: 0 })
    fittedRef.current = true
  })
  return () => cancelAnimationFrame(id)
}, [nodes, rf])
```

- [ ] **Step 2: Run all diagram tests**

Run: `pnpm vitest run src/components/sections/diagram`
Expected: PASS — fitView change is internal, no observable test assertion changes.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/diagram/DiagramCanvas.tsx
git commit -m "feat(DiagramCanvas): fitView only on first mount via ReactFlowProvider"
```

---

## Task 22: Update MCP tool descriptions

**Files:**
- Modify: `src/server/browserMcp.ts`

- [ ] **Step 1: Rewrite `set_block_diagram` description**

In `src/server/browserMcp.ts`, find the `set_block_diagram` registration. Replace its `description` field with:

```
'Set or update the diagram of a block. Build the diagram iteratively: call this tool multiple times, each time sending the full current state of the diagram with one or two more nodes/edges than the last call. The UI animates new nodes/edges in, moves existing ones smoothly to their new position, fades removed ones out, and re-tipea labels that change — driven by stable ids. Keep each node.id and edge.id identical across calls; that is how the UI knows what is new vs. what just moved. If you omit edge.id, the identity is `${source}->${target}`, which is fine unless you plan to swap endpoints. Reposition existing nodes when you add new ones so the layout stays balanced.'
```

(In source code, this is the single-quoted string passed as the tool's `description`. Escape backticks via the literal characters since the source string is single-quoted.)

- [ ] **Step 2: Augment `add_agent_block` description**

In the same file, find the `add_agent_block` registration and append the following sentence to its description:

```
' If you include a diagram, prefer starting with one or two seed nodes and growing the graph via repeated set_block_diagram calls — the diagram is meant to be built iteratively in real time, not delivered in a single shot.'
```

- [ ] **Step 3: Verify the file still builds**

Run: `pnpm build`
Expected: Build succeeds, no TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/browserMcp.ts
git commit -m "feat(mcp): instruct LLM to build diagrams iteratively with stable ids"
```

---

## Task 23: Update system prompt

**Files:**
- Modify: `src/routes/api/chat/stream.ts`

- [ ] **Step 1: Add a line about diagrams**

In `src/routes/api/chat/stream.ts`, find the `prompt` array construction (around line 101). Append a new bullet just before the closing line — between the existing visual primitives guidance line and the `'Keep the user updated briefly in Spanish while you work.'` line. The array literal currently looks like:

```ts
const prompt = [
  `Browser session id: ${browserSessionId}`,
  '',
  'You can control the current web page through the browser_tools MCP server.',
  'Every browser_tools call requires the exact browserSessionId above.',
  'Prefer using get_page_snapshot first, then apply focused changes with the browser tools.',
  'When generating HTML, prefer the site visual primitives over ad-hoc gray panels: use reflect-grid for a responsive panel grid, reflect-grid--three for three columns, reflect-panel for reflective hover panels, edge-panel for a subtle left-accent callout, corner-frame to add a fine corner mark, signal-list for compact stacked items, block-cards/block-card/block-stat for metric cards, accent for orange emphasis, and outcome-note for an important left-rule note. Keep typography consistent with the site and avoid forcing serif fonts inside generated panels unless the content is a deliberate quote.',
  'Keep the user updated briefly in Spanish while you work.',
  '',
  `User request: ${message}`,
].join('\n')
```

Insert a new entry right after the "When generating HTML…" line:

```ts
'Diagramas: constrúyelos de forma incremental, llamando set_block_diagram varias veces con uno o dos nodos/aristas más en cada llamada. Mantén los id estables entre llamadas para que la UI anime las transiciones (entrada, movimiento, eliminación, cambio de label). Reordena posiciones cuando añadas nodos para mantener el layout equilibrado.',
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/chat/stream.ts
git commit -m "feat(prompt): instruct agent to build diagrams iteratively with stable ids"
```

---

## Task 24: Manual verification + conditional rAF fallback for edge tracking

**Files:**
- Possibly modify: `src/components/sections/diagram/DiagramCanvas.tsx`

- [ ] **Step 1: Run the dev server and exercise the feature**

Run: `pnpm dev`

In a browser, type a prompt that yields a diagram, for example: `"Explícame un proceso de aprobación de gastos como diagrama con 5 pasos."`

Observe:
- Nodes appear one or two at a time with the orange outline flash.
- Labels tipea letra a letra inside each node.
- Edges draw from source to target — not as a sudden full line.
- When the agent adds a node and reorders, existing nodes glide to the new position.
- When a node is removed, it fades out before disappearing.
- When the agent renames a node, the label retipeas.
- When the agent flips an edge highlight, the stroke transitions color.

Take notes of any visual glitches.

- [ ] **Step 2: Check edge tracking during node moves**

Specifically watch whether edges follow the node smoothly during the 600ms move, or whether they snap to the new endpoint immediately while the node visually slides. If they snap, proceed to Step 3. If they follow smoothly, skip Step 3 and go to Step 4.

- [ ] **Step 3 (conditional): Drive moves with rAF interpolation**

If edges snap, implement the rAF fallback. In `src/components/sections/diagram/DiagramCanvas.tsx`, inside `DiagramGraph`, replace the position assignment in `buildNode` so the canvas controls it during moves. Add a ref + helper:

```tsx
const animatingPositionsRef = useRef<Map<string, { fromX: number; fromY: number; toX: number; toY: number; startedAt: number }>>(new Map())

function tweenPositions(diff: DiagramDiff, prev: DiagramJSON | null, next: DiagramJSON) {
  if (!prev) return
  const prevById = new Map(prev.nodes.map((n) => [n.id, n]))
  const startedAt = performance.now()
  for (const id of diff.movedNodeIds) {
    const p = prevById.get(id)
    const n = next.nodes.find((x) => x.id === id)
    if (!p || !n) continue
    animatingPositionsRef.current.set(id, {
      fromX: p.x, fromY: p.y, toX: n.x, toY: n.y, startedAt,
    })
  }
  const duration = 600
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)
  function step() {
    const now = performance.now()
    setNodes((current) =>
      current.map((node) => {
        const entry = animatingPositionsRef.current.get(node.id)
        if (!entry) return node
        const t = Math.min(1, (now - entry.startedAt) / duration)
        const k = ease(t)
        if (t >= 1) {
          animatingPositionsRef.current.delete(node.id)
          return { ...node, position: { x: entry.toX, y: entry.toY } }
        }
        return {
          ...node,
          position: {
            x: entry.fromX + (entry.toX - entry.fromX) * k,
            y: entry.fromY + (entry.toY - entry.fromY) * k,
          },
        }
      }),
    )
    if (animatingPositionsRef.current.size > 0) {
      requestAnimationFrame(step)
    }
  }
  if (animatingPositionsRef.current.size > 0) {
    requestAnimationFrame(step)
  }
}
```

Then, in the data-change `useEffect` (Task 19), call `tweenPositions(diff, prev, data)` right after `setEdges(renderedEdges)`.

Also drop the `.react-flow__node { transition: transform 600ms … }` rule from `src/styles.css` to avoid double animation.

If the rAF tween is added, retest manually.

- [ ] **Step 4: Commit any fix from Step 3 (if applied) and final check**

```bash
# If Step 3 was applied:
git add src/components/sections/diagram/DiagramCanvas.tsx src/styles.css
git commit -m "feat(DiagramCanvas): rAF interpolation for moves so edges follow"
```

Run `pnpm vitest run` once more to confirm no test regression.

- [ ] **Step 5: Final commit (if no fix needed)**

If Step 3 wasn't necessary, just push.
