import { describe, it, expect, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { DiagramCanvas } from './DiagramCanvas'

describe('DiagramCanvas', () => {
  it('renders without crashing with empty diagram (client-only wrapper)', () => {
    const { container } = render(
      <DiagramCanvas data={{ nodes: [], edges: [] }} />,
    )
    expect(container.querySelector('[data-diagram-canvas]')).toBeTruthy()
  })

  it('marks every node and edge as entering on first mount', async () => {
    const data = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 100, y: 0 },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }],
    }
    const { container, findAllByText } = render(<DiagramCanvas data={data} />)
    // Wait one tick for the ClientOnly wrapper to mount.
    await findAllByText('A')
    const nodes = container.querySelectorAll('.azent-node')
    expect(nodes.length).toBe(2)
    nodes.forEach((n) => {
      expect(n.classList.contains('azent-node--entering')).toBe(true)
    })
  })

  it('keeps a removed node mounted for ~280ms with the exiting flag, then drops it', async () => {
    const initialData = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 100, y: 0 },
      ],
      edges: [],
    }
    const { container, rerender, findAllByText } = render(<DiagramCanvas data={initialData} />)
    await findAllByText('A')

    vi.useFakeTimers()
    try {
      const nextData = {
        nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
        edges: [],
      }
      rerender(<DiagramCanvas data={nextData} />)

      // Right after the update, both A and B are still mounted; B is exiting.
      const exiting = container.querySelector('.azent-node--exiting')
      expect(exiting).toBeTruthy()
      expect(container.querySelectorAll('.azent-node').length).toBe(2)

      // Advance past the exit duration. B unmounts.
      await act(async () => {
        vi.advanceTimersByTime(320)
      })
      expect(container.querySelectorAll('.azent-node').length).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
