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
