import { describe, expect, it } from 'vitest'
import { readDiagram, readDiagramPosition, readVariables } from './validators'

describe('browser tool validators', () => {
  it('normalizes a valid diagram', () => {
    expect(readDiagram({
      nodes: [{ id: 'a', label: 'A', x: 1, y: 2 }],
      edges: [],
    })).toEqual({
      nodes: [{ id: 'a', label: 'A', x: 1, y: 2 }],
      edges: [],
    })
  })

  it('rejects edges pointing to missing nodes', () => {
    expect(() => readDiagram({
      nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
      edges: [{ source: 'a', target: 'b' }],
    })).toThrow('edges[0].target b not in nodes')
  })

  it('rejects duplicate node ids', () => {
    expect(() => readDiagram({
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'a', label: 'A again', x: 1, y: 1 },
      ],
      edges: [],
    })).toThrow('duplicate node id: a')
  })

  it('normalizes finite variables and rejects invalid values', () => {
    expect(readVariables({ horas: 12 })).toEqual({ horas: 12 })
    expect(() => readVariables({ horas: Number.NaN })).toThrow('variables.horas must be a finite number')
  })

  it('reads only supported diagram positions', () => {
    expect(readDiagramPosition('before')).toBe('before')
    expect(readDiagramPosition('after')).toBe('after')
    expect(() => readDiagramPosition('middle')).toThrow('diagramPosition must be "before" or "after"')
  })
})
