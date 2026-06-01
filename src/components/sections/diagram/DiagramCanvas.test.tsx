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

  it('keeps a removed node mounted for ~500ms with the exiting flag, then drops it', async () => {
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
        vi.advanceTimersByTime(550)
      })
      expect(container.querySelectorAll('.azent-node').length).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not lose the second-update entering flag when a first-update timer fires later', async () => {
    const first = {
      nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }],
      edges: [],
    }
    const second = {
      nodes: [
        { id: 'a', label: 'A', x: 0, y: 0 },
        { id: 'b', label: 'B', x: 80, y: 0 },
      ],
      edges: [],
    }
    const { container, rerender, findAllByText } = render(<DiagramCanvas data={first} />)
    await findAllByText('A')

    vi.useFakeTimers()
    try {
      // Fire a fast second update before the first's entering timer expires.
      vi.advanceTimersByTime(100)
      await act(async () => {
        rerender(<DiagramCanvas data={second} />)
      })

      // B is entering right now.
      const entering = container.querySelectorAll('.azent-node--entering')
      expect(entering.length).toBeGreaterThanOrEqual(1)

      // Advance to where the FIRST update's 1100ms entering-clear would have
      // fired (we are at 100ms + ?). If timers weren't cancelled, the first
      // run's setNodes(current => map(...)) would also pass through B,
      // clearing its entering flag prematurely.
      await act(async () => {
        vi.advanceTimersByTime(1050) // total: 1150ms since first mount
      })
      // B's 1100ms timer (from the SECOND update) shouldn't have fired yet:
      // it was scheduled at +100ms, fires at +1200ms.
      const stillEntering = container.querySelectorAll('.azent-node--entering')
      expect(Array.from(stillEntering).some((n) => n.textContent === 'B')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
