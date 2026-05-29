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
})
