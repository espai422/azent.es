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
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: 'var(--prose-muted)', border: 'none', width: 1, height: 1, opacity: 0.5 }}
      />
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
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: 'var(--prose-muted)', border: 'none', width: 1, height: 1, opacity: 0.5 }}
      />
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

function toRFEdges(defs: DiagramEdgeDef[]): Edge[] {
  return defs.map((e, i) => ({
    id: e.id ?? `e-${i}`,
    source: e.source,
    target: e.target,
    type: 'azent',
    label: e.label,
    data: { highlight: e.highlight === true },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: e.highlight ? 'var(--prose-accent)' : 'var(--prose-muted)',
    },
  }))
}

function DiagramGraph({ data }: Readonly<{ data: DiagramJSON }>) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toRFNodes(data.nodes))
  const [edges, setEdges, onEdgesChange] = useEdgesState(toRFEdges(data.edges))

  useEffect(() => {
    setNodes(toRFNodes(data.nodes))
    setEdges(toRFEdges(data.edges))
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
      className="w-full min-h-[280px] md:min-h-[420px] h-full"
    >
      <ClientOnly>
        <DiagramGraph data={data} />
      </ClientOnly>
    </div>
  )
}
