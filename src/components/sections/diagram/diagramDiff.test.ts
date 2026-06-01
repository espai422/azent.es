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
})

// Unused but keeps the import warning quiet for future cases.
void empty
