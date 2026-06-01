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
