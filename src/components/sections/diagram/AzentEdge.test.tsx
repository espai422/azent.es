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

  it('sets stroke-dasharray and dashoffset on the path when entering is true', () => {
    const { container } = render(
      <svg>
        <AzentEdge {...makeProps({ entering: true })} />
      </svg>,
    )
    const path = container.querySelector('path.azent-edge__path') as SVGPathElement | null
    expect(path).toBeTruthy()
    // In jsdom getTotalLength returns 0 for synthetic paths, so we only
    // verify that the inline-style dasharray is set (even to "0"), which
    // proves the entering-branch ran.
    expect(path?.style.strokeDasharray).not.toBe('')
  })

  it('wraps the label with a key based on edgeRev for fade-swap', () => {
    const { container, rerender } = render(
      <svg>
        <AzentEdge {...makeProps({ edgeRev: 0 }, 'antes')} />
      </svg>,
    )
    const first = container.querySelector('.azent-edge__label-wrap')
    expect(first?.textContent).toBe('antes')

    rerender(
      <svg>
        <AzentEdge {...makeProps({ edgeRev: 1 }, 'después')} />
      </svg>,
    )
    const second = container.querySelector('.azent-edge__label-wrap')
    expect(second?.textContent).toBe('después')
    expect(first).not.toBe(second)
  })

  it('drops opacity to 0 in inline style when exiting is true', () => {
    const { container } = render(
      <svg>
        <AzentEdge {...makeProps({ exiting: true })} />
      </svg>,
    )
    const path = container.querySelector('path.azent-edge__path') as SVGPathElement | null
    expect(path?.style.opacity).toBe('0')
  })
})
