import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'

export type AzentNodeData = {
  label: string
  entering?: boolean
  exiting?: boolean
  labelRev?: number
}

const HANDLE_STYLE = {
  background: 'transparent',
  border: 'none',
  width: 1,
  height: 1,
  opacity: 0,
} as const

export function AzentNode({ data }: NodeProps<Node<AzentNodeData>>) {
  return (
    <div
      className="azent-node"
      style={{
        background: 'transparent',
        border: '1px solid var(--prose-muted)',
        borderRadius: 8,
        padding: '12px 18px',
        minWidth: 110,
        textAlign: 'center',
        userSelect: 'none',
        fontFamily: 'var(--font-sans)',
      }}
    >
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
