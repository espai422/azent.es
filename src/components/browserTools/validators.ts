import type { DiagramJSON } from '#/components/sections'

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function readDiagram(value: unknown): DiagramJSON {
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

export function readVariables(value: unknown): Record<string, number> {
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

export function readDiagramPosition(value: unknown): 'before' | 'after' {
  const v = readString(value)
  if (v === 'before' || v === 'after') return v
  throw new Error('diagramPosition must be "before" or "after"')
}
