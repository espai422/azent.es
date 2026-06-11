import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { streamFlashSpansIn } from '#/utils/streamFlash'
import { flashBlockOutline } from '#/utils/blockAnimations'

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
  const { label, entering, exiting, labelRev = 0 } = data
  const containerRef = useRef<HTMLDivElement>(null)
  const labelBoxRef = useRef<HTMLDivElement>(null)

  // Trigger the orange outline flash + label tipea when entering or whenever
  // labelRev bumps. Each effect run is independent — `streamFlashSpansIn`
  // skips spans already marked `data-streamed`, so the `key={labelRev}` on
  // the span guarantees a fresh DOM node and a fresh tipea.
  useEffect(() => {
    if (!labelBoxRef.current) return
    streamFlashSpansIn(labelBoxRef.current)
  }, [entering, labelRev])

  useEffect(() => {
    if (entering && containerRef.current) {
      // Guard: jsdom does not implement element.animate
      if (typeof containerRef.current.animate === 'function') {
        flashBlockOutline(containerRef.current, 900)
      }
    }
  }, [entering])

  const flashable = entering || labelRev > 0

  return (
    <div
      ref={containerRef}
      className={[
        'azent-node',
        entering ? 'azent-node--entering' : '',
        exiting ? 'azent-node--exiting' : '',
      ].filter(Boolean).join(' ')}
      style={{
        background: 'var(--section-bg)',
        border: '1px solid var(--prose-line)',
        borderRadius: 0,
        padding: '12px 18px',
        minWidth: 110,
        textAlign: 'center',
        userSelect: 'none',
        fontFamily: 'var(--font-mono)',
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
        ref={labelBoxRef}
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--prose-heading)',
          letterSpacing: '0.02em',
        }}
      >
        {flashable ? (
          <span key={labelRev} data-flash="">{label}</span>
        ) : (
          label
        )}
      </div>
    </div>
  )
}
