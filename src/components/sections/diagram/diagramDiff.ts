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

  const prevNodeById = new Map(prev.nodes.map((n) => [n.id, n]))
  const nextNodeIds = new Set(next.nodes.map((n) => n.id))

  for (const n of next.nodes) {
    if (!prevNodeById.has(n.id)) {
      diff.enteringNodeIds.add(n.id)
    }
  }

  for (const n of prev.nodes) {
    if (!nextNodeIds.has(n.id)) {
      diff.exitingNodeIds.add(n.id)
    }
  }

  const prevEdgeById = new Map(prev.edges.map((e) => [edgeIdentity(e), e]))
  const nextEdgeIds = new Set(next.edges.map((e) => edgeIdentity(e)))
  void prevEdgeById

  for (const e of prev.edges) {
    const id = edgeIdentity(e)
    if (!nextEdgeIds.has(id)) {
      diff.exitingEdgeIds.add(id)
    }
  }

  return diff
}
