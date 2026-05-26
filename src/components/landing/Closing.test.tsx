import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Closing } from '#/components/landing/Closing'

describe('Closing', () => {
  it('renders the closing statement', () => {
    render(<Closing />)
    screen.getByText(/No buscamos clientes/, { selector: 'p' })
  })

  it('renders the secondary line', () => {
    render(<Closing />)
    screen.getByText(/Buscamos empresas que quieran operar diferente/, { selector: 'p' })
  })
})
