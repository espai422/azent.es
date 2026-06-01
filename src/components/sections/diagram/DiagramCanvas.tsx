import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
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
  const fittedRef = useRef(false)
  const rf = useReactFlow()

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

  useEffect(() => {
    if (fittedRef.current) return
    if (nodes.length === 0) return
    const id = requestAnimationFrame(() => {
      rf.fitView({ padding: 0.2, duration: 0 })
      fittedRef.current = true
    })
    return () => cancelAnimationFrame(id)
  }, [nodes, rf])

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
        <ReactFlowProvider>
          <DiagramGraph data={data} />
        </ReactFlowProvider>
      </ClientOnly>
    </div>
  )
}
