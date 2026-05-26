import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HowWeWork } from '#/components/landing/HowWeWork'

describe('HowWeWork', () => {
  it('renders the heading', () => {
    render(<HowWeWork />)
    screen.getByRole('heading', { level: 2, name: /Software e IA, sin separación artificial/i })
  })

  it('renders the core message', () => {
    render(<HowWeWork />)
    screen.getByText(/Para nosotros es lo mismo: crear soluciones/, { selector: 'p' })
  })

  it('renders the competitive advantage text', () => {
    render(<HowWeWork />)
    screen.getByText(/menor coste que la competencia/, { selector: 'p' })
  })
})
