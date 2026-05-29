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

const HANDLE_STYLE = {
  background: 'transparent',
  border: 'none',
  width: 1,
  height: 1,
  opacity: 0,
} as const

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
      {/* Four invisible handles per side (source + target). The edge code picks
          the right pair based on the relative position of the two nodes so
          curves take the shortest natural path instead of always looping
          top-to-bottom. */}
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

type Side = 'top' | 'right' | 'bottom' | 'left'

// Decide which side of the source node and which side of the target node the
// edge should attach to, based on their relative positions. Compares the
// dominant axis between centers; node sizes are similar enough that comparing
// top-left coordinates yields the same dominant axis.
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

function toRFEdges(defs: DiagramEdgeDef[], nodes: DiagramNodeDef[]): Edge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  return defs.map((e, i) => {
    const sourceNode = nodeMap.get(e.source)
    const targetNode = nodeMap.get(e.target)
    const sides = sourceNode && targetNode
      ? pickSides(sourceNode, targetNode)
      : ({ source: 'bottom', target: 'top' } as const)
    return {
      id: e.id ?? `e-${i}`,
      source: e.source,
      target: e.target,
      sourceHandle: `s-${sides.source}`,
      targetHandle: `t-${sides.target}`,
      type: 'azent',
      label: e.label,
      data: { highlight: e.highlight === true },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.highlight ? 'var(--prose-accent)' : 'var(--prose-muted)',
      },
    }
  })
}

function DiagramGraph({ data }: Readonly<{ data: DiagramJSON }>) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toRFNodes(data.nodes))
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRFEdges(data.edges, data.nodes))

  useEffect(() => {
    setNodes(toRFNodes(data.nodes))
    setEdges(toRFEdges(data.edges, data.nodes))
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
      className="w-full h-[320px] md:h-[480px]"
    >
      <ClientOnly>
        <DiagramGraph data={data} />
      </ClientOnly>
    </div>
  )
}
