import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AzentEdge } from './AzentEdge'
import type { EdgeProps, Edge } from '@xyflow/react'
import { Position } from '@xyflow/react'

type Data = { highlight?: boolean; entering?: boolean; exiting?: boolean; edgeRev?: number }

function makeProps(data: Data, label?: string): EdgeProps<Edge<Data>> {
  return {
    id: 'e1',
    source: 'a',
    target: 'b',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 0,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data,
    label,
  } as unknown as EdgeProps<Edge<Data>>
}

describe('AzentEdge', () => {
  it('renders a path inside an svg wrapper', () => {
    const { container } = render(
      <svg>
        <AzentEdge {...makeProps({})} />
      </svg>,
    )
    expect(container.querySelector('path')).toBeTruthy()
  })
})
