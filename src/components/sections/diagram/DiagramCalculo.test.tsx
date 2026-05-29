import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DiagramCalculo } from './DiagramCalculo'

describe('DiagramCalculo', () => {
  it('renders the formula as monospace text', () => {
    render(<DiagramCalculo formula="a * b" result={42} />)
    const formulaEl = screen.getByText('a * b')
    expect(formulaEl.className).toMatch(/font-mono/)
  })

  it('renders the result when present', () => {
    render(<DiagramCalculo formula="a + b" result={10} />)
    screen.getByText('10')
  })

  it('renders em dash when result is null', () => {
    render(<DiagramCalculo formula="a + b" result={null} />)
    screen.getByText('—')
  })

  it('renders nothing when formula is empty', () => {
    const { container } = render(<DiagramCalculo formula="" result={null} />)
    expect(container.firstChild).toBeNull()
  })
})
