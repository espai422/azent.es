import { getBezierPath } from '@xyflow/react'
import type { EdgeProps, Edge } from '@xyflow/react'
import { useLayoutEffect, useRef } from 'react'

export type AzentEdgeData = {
  highlight?: boolean
  entering?: boolean
  exiting?: boolean
  edgeRev?: number
}

export function AzentEdge({
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

  const pathRef = useRef<SVGPathElement>(null)

  useLayoutEffect(() => {
    if (!data?.entering) return
    const path = pathRef.current
    if (!path) return
    const length = typeof path.getTotalLength === 'function' ? path.getTotalLength() || 1 : 1
    path.style.strokeDasharray = String(length)
    path.style.strokeDashoffset = String(length)
    if (typeof path.animate !== 'function') return
    const animation = path.animate(
      [{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
      { duration: 700, easing: 'ease-out', fill: 'forwards' },
    )
    return () => {
      animation.cancel()
      path.style.strokeDasharray = ''
      path.style.strokeDashoffset = ''
    }
  }, [data?.entering, edgePath])

  return (
    <>
      <path
        ref={pathRef}
        id={id}
        d={edgePath}
        className="azent-edge__path"
        fill="none"
        markerEnd={typeof markerEnd === 'string' ? markerEnd : undefined}
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
