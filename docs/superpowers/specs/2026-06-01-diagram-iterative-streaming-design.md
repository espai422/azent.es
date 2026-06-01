# Diagram Iterative Streaming — Design Spec
**Date:** 2026-06-01

## Context

The HTML side of an agent-generated block already feels alive: `append_to_block` wraps fresh text in `<span data-flash>` and `streamFlashSpansIn` tipea it letra a letra; `set_block_html` runs `diffHtml` so a structural rewrite still highlights only the words that actually changed. The visitor watches the agent *write* in real time.

The diagram side, by contrast, is one-shot. `set_block_diagram` replaces the whole `DiagramJSON`; `DiagramCanvas` calls ReactFlow's `setNodes` / `setEdges` and the entire graph pops into existence. If the agent later updates the diagram, ReactFlow's controlled state silently swaps the arrays — no transition for moves, no entrance for additions, no exit for removals, no signal for label/highlight changes.

This spec makes diagrams stream the same way HTML does. The agent is instructed to call `set_block_diagram` iteratively, sending the full current snapshot each time with one or two more (or fewer, or moved) nodes/edges. The canvas computes a structural diff against the previous snapshot and animates the transition.

---

## Goals

1. The agent grows a diagram via repeated `set_block_diagram` calls, each carrying the full current state. Stable `node.id` and `edge.id` across calls drive identity.
2. `DiagramCanvas` diffs the incoming snapshot against the previous one and animates:
   - **New** nodes/edges fade+scale-in (nodes) or stroke-draw (edges), with an orange highlight flash.
   - **Moved** nodes transition smoothly to their new position; affected edges follow.
   - **Removed** nodes/edges fade-out and unmount after their exit animation completes.
   - **Label** changes (node or edge) re-tipea the new text (node) or fade-swap the text (edge).
   - **Highlight** changes on an edge transition smoothly (stroke color + width).
3. The diff and all animation lifecycle stay inside `DiagramCanvas`. `BrowserToolBridge` keeps writing only the raw `DiagramJSON` into `section.diagram`. `SectionContext` is unaware of animation state.
4. Multiple rapid `set_block_diagram` calls compose naturally: a label whose tipea is mid-flight when a new snapshot arrives restarts with the latest text.
5. The agent receives clear, non-ambiguous instructions about iterative building and id stability via the MCP tool description and the system prompt.

---

## Non-Goals

- Auto-layout (Dagre / ELK / similar). The agent keeps providing `x`, `y` and is responsible for rebalancing positions when the graph grows.
- Granular per-node / per-edge MCP tools (`add_node`, `remove_edge`, etc.). One tool, full snapshot, every call.
- Diff for attribute changes other than `label` (nodes) and `label` + `highlight` (edges). Position changes count as "moved", not as "modified".
- SVG-text tipea on edge labels. Edge labels fade-swap; only node labels (which are HTML) tipea.
- Animating the existing periodic "ball" (`<animateMotion>`) along edges differently — it keeps running unchanged.
- Reframing the viewport on every update. `fitView` runs only on initial mount; subsequent updates leave the camera alone unless the bounding box change is dramatic (see Open Questions).

---

## Architecture

### Data flow

```
LLM (Codex)
   │  set_block_diagram(id, fullDiagram)  — called iteratively
   ▼
BrowserToolBridge.set_block_diagram
   └─ updateSection(id, { diagram })       — unchanged from today
   ▼
SectionContext.section.diagram             — pure DiagramJSON, no animation flags
   ▼
Block → DiagramCanvas                      — all new logic lives here
   ├─ prevDiagramRef = useRef<DiagramJSON | null>
   ├─ useEffect([data]):
   │     diff = diffDiagram(prev, next)
   │     setRendered({
   │       nodes: next.nodes ∪ {prev nodes that are exiting},
   │       edges: next.edges ∪ {prev edges that are exiting},
   │       flags: { entering, exiting, moved, changedLabel } sets,
   │       nodeLabelRevs: Map<id, number>   — incremented on labelChanged
   │       edgeRevs:      Map<id, number>   — incremented on label or highlight change
   │     })
   │     scheduleCleanup:
   │       - 400ms  → entering.clear() (stops orange flash class)
   │       - 280ms  → drop exiting from rendered
   ▼
ReactFlow (controlled)
   ├─ nodeTypes.azent → AzentNode reads data.entering/exiting/labelRev
   └─ edgeTypes.azent → AzentEdge reads data.entering/exiting/edgeRev/highlightChanged
```

### Files

| Path | Status | Purpose |
|---|---|---|
| `src/components/sections/diagram/diagramDiff.ts` | **new** | Pure `diffDiagram(prev, next)`. |
| `src/components/sections/diagram/diagramDiff.test.ts` | **new** | Unit tests for the diff. |
| `src/components/sections/diagram/DiagramCanvas.tsx` | modified | Owns lifecycle, schedules cleanups, passes flags into node/edge data. |
| `src/components/sections/diagram/AzentNode.tsx` | **new** (extracted) | Reads `data.entering`, `data.labelRev`; tipea label; runs outline flash. |
| `src/components/sections/diagram/AzentEdge.tsx` | **new** (extracted) | Reads `data.entering`, `data.edgeRev`, `data.highlightChanged`; stroke-draw, label fade-swap, stroke transitions. |
| `src/components/sections/diagram/types.ts` | unchanged | Public `DiagramJSON`, `DiagramNodeDef`, `DiagramEdgeDef`. |
| `src/styles.css` | modified | Adds `@keyframes` for enter/exit, `transition` on `.react-flow__node`. |
| `src/server/browserMcp.ts` | modified | Rewrites `set_block_diagram` and `add_agent_block` tool descriptions. |
| `src/routes/api/chat/stream.ts` | modified | Adds one line to the system prompt about iterative diagrams. |
| `src/components/BrowserToolBridge.tsx` | modified (small) | Still calls `updateSection({ diagram })`; consume `flashBlockOutline` from `blockAnimations` instead of inlining it. |
| `src/utils/blockAnimations.ts` | modified | Extract `flashBlockOutline(element)` here so node and block share it. |

`BrowserToolBridge` does not change because the contract (`DiagramJSON` in `section.diagram`) does not change. All new behavior lives below it.

---

## Diff algorithm

### Module: `src/components/sections/diagram/diagramDiff.ts`

```ts
import type { DiagramJSON, DiagramEdgeDef } from './types'

export type DiagramDiff = {
  enteringNodeIds: Set<string>
  exitingNodeIds: Set<string>
  movedNodeIds: Set<string>
  changedLabelNodeIds: Set<string>
  enteringEdgeIds: Set<string>
  exitingEdgeIds: Set<string>
  changedEdgeIds: Set<string>        // label or highlight changed, same identity
}

export function edgeIdentity(edge: DiagramEdgeDef): string {
  return edge.id ?? `${edge.source}->${edge.target}`
}

export function diffDiagram(prev: DiagramJSON | null, next: DiagramJSON): DiagramDiff
```

**Node matching:** by `id`. The `id` field is required and unique (validated in `readDiagram` already).

**Edge matching:** by `edgeIdentity(edge)` — explicit `id` if present, otherwise `${source}->${target}`. Documented in the MCP tool description so the agent knows to set `id` when planning to change endpoints.

**Move detection:** for nodes present in both, `movedNodeIds.add(id)` iff `prev.x !== next.x || prev.y !== next.y`. A node can simultaneously be in `movedNodeIds` and `changedLabelNodeIds`.

**Label change detection:**
- Node: `prev.label !== next.label` → `changedLabelNodeIds.add(id)`.
- Edge: any of `prev.label !== next.label`, `(prev.highlight ?? false) !== (next.highlight ?? false)` → `changedEdgeIds.add(identity)`.

`prev = null` → every node and edge in `next` lands in `entering*`. Both arrays empty → all sets empty.

### Test cases (`diagramDiff.test.ts`)

1. `prev = null` → all `next` ids in `enteringNodeIds` / `enteringEdgeIds`.
2. Identical snapshots → all sets empty.
3. Add a node → `enteringNodeIds = {n3}`.
4. Remove a node → `exitingNodeIds = {n2}`. Edges that referenced n2 (matched by identity) → `exitingEdgeIds`.
5. Move a node (same id, new x/y) → `movedNodeIds = {n1}`, label set untouched.
6. Change a node label (same id, new label, same x/y) → `changedLabelNodeIds = {n1}`, move set untouched.
7. Edge with explicit `id` whose `source` changes → since identity is preserved by `id`, the edge is *kept*, but because the relationship changed we still want it to feel new — covered by treating source/target change as exit+entry: when explicit `id` exists but `(source, target)` pair differs, push the id into both `exitingEdgeIds` and `enteringEdgeIds`. Documented behavior: changing endpoints is "kill + redraw", not a smooth swap.
8. Edge highlight flips false → true → `changedEdgeIds = {identity}`.
9. Edge label text changes → `changedEdgeIds`.
10. Mixed snapshot: add 2 nodes, move 1, remove 1, change 1 label, add 1 edge, flip 1 edge highlight — every set populated.

The function is pure and synchronous. No DOM, no React.

---

## Canvas lifecycle

### `DiagramCanvas` controlled state

Replace the current `useNodesState` / `useEdgesState` initialization with internal state that holds:

```ts
type RenderState = {
  nodes: Node[]               // ReactFlow nodes (next + still-exiting prev)
  edges: Edge[]               // ReactFlow edges (next + still-exiting prev)
  enteringNodeIds: Set<string>
  enteringEdgeIds: Set<string>
  // Revs are passed into node/edge `data` so AzentNode/AzentEdge can use them
  // as React `key`s or comparison values to retrigger animations.
  nodeLabelRev: Map<string, number>
  edgeRev: Map<string, number>
}
```

`prevDiagramRef` holds the last `DiagramJSON` we computed the diff against — never the visible "rendered" state. This guarantees that mid-flight exits don't leak into the next diff. (If a node is exiting and the LLM re-adds it with the same id before the exit finishes, the diff sees `prev` does not contain that id, so it's `entering` — we drop the exiting copy and the new copy enters fresh. Acceptable; the alternative would conflate exiting with re-entering and tangle state.)

### On each new `data` prop

1. Compute `diff = diffDiagram(prevDiagramRef.current, data)`.
2. Build the new `nodes` array:
   - Start from `data.nodes` (the canonical set).
   - For each node in `prevDiagramRef.current?.nodes` whose id is in `diff.exitingNodeIds`, append it (still at its last position) and mark it exiting in its `data`. Skip if the same id is also entering (re-added before exit finished — see note above; we drop the exiting ghost).
3. Build the new `edges` array similarly: take `data.edges`, append exiting edges by identity from prev, mark them.
4. For each entering node, mark its `data.entering = true`.
5. For each `changedLabelNodeIds`, bump its entry in `nodeLabelRev`. `AzentNode` uses this as a React `key` on the label span, which remounts and re-tipeas.
6. For each `changedEdgeIds`, bump its entry in `edgeRev`. `AzentEdge` uses it analogously for label + highlight transition.
7. Push the result into ReactFlow via `setNodes` / `setEdges`.
8. Schedule cleanups:
   - `setTimeout(() => clearEnteringFlags(), 600)` — 600ms is enough for the outline flash to finish; node fade-in (400ms) and edge stroke-draw (700ms) are visual only and self-terminate. Clearing `entering` after 600ms re-renders nodes without the entering class, which is harmless.
   - `setTimeout(() => dropExiting(), 280)` for nodes, `setTimeout(..., 240)` for edges — matches the exit animation durations.
9. `prevDiagramRef.current = data` (the canonical snapshot, not the rendered one).

### Cleanup races

If two `set_block_diagram` calls arrive within one cleanup window, the second call's `useEffect` runs after the first's. The first's `setTimeout`s are still pending. Behavior:
- The pending "clear entering" from call 1 fires later than the entering flags set by call 2. That would prematurely clear call 2's entering flags. Mitigation: every `useEffect` run captures and stores its `setTimeout` ids in a ref, and cancels any pending ids from prior runs before scheduling new ones.
- Pending "drop exiting" from call 1 dropping nodes that call 2 may have re-introduced as exiting: same cancellation strategy.

Implementation: `pendingTimeoutsRef.current.push(id)`, cleared at the top of each `useEffect`.

---

## Visual layer

### `AzentNode` (new file)

```ts
type AzentNodeData = {
  label: string
  entering?: boolean
  exiting?: boolean
  labelRev: number   // bumped when label changes
}
```

Container `<div>` keeps its current border/padding/typography. Adds a class based on flags:

```tsx
<div
  className={[
    'azent-node',
    entering ? 'azent-node--entering' : '',
    exiting ? 'azent-node--exiting' : '',
  ].filter(Boolean).join(' ')}
>
  <span
    key={labelRev}
    data-flash={entering || labelRev > 0 ? '' : undefined}
    ref={labelRef}
  >
    {label}
  </span>
  …handles…
</div>
```

`useEffect(() => { if (labelRef.current?.parentElement) streamFlashSpansIn(labelRef.current.parentElement) }, [labelRev, entering])` triggers the tipea. `streamFlashSpansIn` already skips spans marked `data-streamed`, so the `key` change ensures we get a fresh unmarked span each time the label changes.

When `entering`, also call `element.animate(...)` (WAAPI) on the container with the same orange outline keyframes used by `flashBlockOutline` (currently inline in `BrowserToolBridge.tsx`). We extract that function into `src/utils/blockAnimations.ts` (which already houses the rest of the block animation primitives — `revealBlockSymmetric`, `scrollSoElementFocused`, etc.) so node and block share one implementation, and update both `BrowserToolBridge` and `AzentNode` to consume it from there.

### `AzentEdge` (new file)

```ts
type AzentEdgeData = {
  highlight?: boolean
  entering?: boolean
  exiting?: boolean
  edgeRev: number
}
```

The `<BaseEdge>` path keeps a ref. On `entering`, `useLayoutEffect` reads `pathRef.current.getTotalLength()`, sets `stroke-dasharray = len; stroke-dashoffset = len`, then animates `stroke-dashoffset` to `0` with WAAPI over 700ms. If the path's geometry changes mid-animation (because a connected node is moving), we restart from the new length on the next render. That can look jittery for edges connected to a moving + entering node; in practice when a node is entering it isn't moving, so the case is rare.

For `exiting`, animate opacity 1→0 over 240ms.

For `data.edgeRev` changes:
- Wrap the SVG `<text>` in a wrapper with `key={edgeRev}`. The new node mounts with opacity 0 and fades in (CSS); the old one is gone immediately (no DOM persistence). This is the "fade-swap" — close enough to fade-out/in for SVG and far simpler than juggling two `<text>` elements.
- Stroke color and stroke-width changes use CSS `transition: stroke 300ms ease-out, stroke-width 300ms ease-out`. The `highlight` flag drives the stroke color the same way it does today.

The periodic ball (`<animateMotion>`) stays as-is; it picks up the new path automatically when the geometry changes.

### CSS additions (`src/styles.css`)

```css
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

.azent-node {
  /* base styles already inline; keep there */
}

.azent-node--entering {
  /* Tip: the animation only affects the *inner* container of the node, not the
     ReactFlow positioning wrapper, so it never fights the transform-based move. */
  animation: azent-node-enter 400ms ease-out forwards;
}

.azent-node--exiting {
  animation: azent-node-exit 280ms ease-in forwards;
  pointer-events: none;
}

.azent-edge__path {
  transition: stroke 300ms ease-out, stroke-width 300ms ease-out, opacity 240ms ease-in;
}

.azent-edge__label-wrap {
  animation: azent-edge-label-in 300ms ease-out forwards;
}

@keyframes azent-edge-label-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

The `transform`-based move transition on `.react-flow__node` is the cornerstone of "free" move animation. The enter/exit animations apply to the inner `.azent-node` div, so they compose with (rather than fight) ReactFlow's outer positioning transform.

### Edge follow during node move — empirical risk

ReactFlow recomputes edge geometry on every node position change. The question is whether it does so during a CSS transition or only at the transition endpoints. CSS transitions don't fire `onNodesChange`, so the worst case is that edges snap to the new endpoints instantly while the node visually slides — looking like a rubber band.

Mitigation plan, in order of preference:
1. **First test empirically.** Often ReactFlow polls position via `getBoundingClientRect` on each render, so edges may track smoothly anyway.
2. If they snap: drive the move ourselves by interpolating `position` in component state across the 600ms window (rAF), so ReactFlow gets a stream of intermediate positions. Implementation: when `movedNodeIds` is non-empty, start a rAF loop, ease each affected node from its old position to its new position over 600ms, and call `setNodes` with the interpolated positions every frame. Disable the CSS transform transition in that mode to avoid double animation.

Option 2 is the fallback; we measure option 1 first.

---

## MCP and system prompt changes

### `src/server/browserMcp.ts → set_block_diagram` description (new text)

> Set or update the diagram of a block. **Build the diagram iteratively: call this tool multiple times, each time sending the full current state of the diagram with one or two more nodes/edges than the last call.** The UI animates new nodes/edges in, moves existing ones smoothly to their new position, fades removed ones out, and re-tipea labels that change — driven by stable ids. Keep each `node.id` and `edge.id` identical across calls; that is how the UI knows what is new vs. what just moved. If you omit `edge.id`, the identity is `${source}->${target}`, which is fine unless you plan to swap endpoints. Reposition existing nodes when you add new ones so the layout stays balanced.

### `src/server/browserMcp.ts → add_agent_block` description addition

> If you include a `diagram`, prefer starting with one or two seed nodes and growing the graph via repeated `set_block_diagram` calls — the diagram is meant to be built iteratively in real time, not delivered in a single shot.

### `src/routes/api/chat/stream.ts` — system prompt

Append to the existing visual-primitives guidance:

> Diagramas: constrúyelos de forma incremental, llamando `set_block_diagram` varias veces con uno o dos nodos/aristas más en cada llamada. Mantén los `id` estables entre llamadas para que la UI anime las transiciones (entrada, movimiento, eliminación, cambio de label). Reordena posiciones cuando añadas nodos para mantener el layout equilibrado.

No new tools, no schema changes.

---

## Testing

### Unit (`vitest`, jsdom)

- `diagramDiff.test.ts` — the 10 cases listed above.
- `AzentNode.test.tsx` — given `data.entering = true`, the container gets `azent-node--entering` and the label gets `data-flash`. Given `labelRev` bumps, the label span remounts (new DOM node) and `data-flash` reapplies.
- `DiagramCanvas.test.tsx`:
  - First render with N nodes: every node ends with `entering` flag for 600ms, then it clears.
  - Drop one node: the dropped node stays in the rendered set for 280ms with `exiting` flag, then unmounts.
  - Move one node: the node's position prop updates immediately; `entering` stays false; `movedNodeIds` populated.
  - Two rapid updates within 100ms: pending timeouts from the first are cancelled; the second's flags don't get cleared prematurely.

### Manual / dev-mode

Run `pnpm dev`, send the agent a prompt that benefits from a multi-step diagram ("explícame un proceso de aprobación de gastos con 5 pasos"). Watch that:
- Nodes appear one or two at a time with the orange flash.
- Edges draw from source to target, not as a sudden line.
- When the agent adds a node and rebalances, existing nodes glide to their new positions and edges follow without snapping.
- When the agent renames a node, the label retipeas.
- When the agent flips an edge highlight, the stroke transitions color.

### Performance smoke

Eight to twelve nodes, six to ten edges. The animation should stay at 60fps on a recent MacBook in dev mode (no production optimizations needed yet).

---

## Open questions resolved during implementation

These are not blockers — they will be answered by trying the simpler path first:

1. **Does ReactFlow track edge endpoints during a `transform` transition on the node?** If yes, no rAF interpolation is needed. If no, fall back to driving moves with rAF interpolation as described in "Edge follow during node move".
2. **Does `fitView` need to run on updates?** Plan is: only on first mount. If the diagram grows beyond the viewport, the agent is expected to keep the layout reasonable; if visitor feedback shows nodes clipping off-screen, add an opt-in "auto refit on large bbox change" later.
3. **Should the agent be allowed to omit `x` / `y` for entering nodes?** Today the schema requires both. Keep that requirement in V1. If the agent reliably produces good layouts we don't need auto-placement; if it doesn't, that's a V2 problem with auto-layout, not a missing-field problem.

---

## Out of scope (V2 candidates)

- Auto-layout (Dagre / ELK) so the agent doesn't have to manage `x`, `y`.
- Granular MCP tools (`add_diagram_node`, `move_diagram_node`, etc.) if iterative full-snapshot turns out to be token-expensive at scale.
- Bidirectional smooth swap of edge endpoints (treating `id`-preserving source/target swap as a single animated transition rather than exit + enter).
- Per-node entrance "writing" of the label with the cursor caret visible, matching the HTML tipea style exactly.
- Diff-driven viewport auto-fit with animated `fitView`.
