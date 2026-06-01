import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
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
})
