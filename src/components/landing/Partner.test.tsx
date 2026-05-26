import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Partner } from '#/components/landing/Partner'

describe('Partner', () => {
  it('renders the heading', () => {
    render(<Partner />)
    screen.getByRole('heading', { level: 2, name: /Nos involucramos como si fuera nuestro negocio/i })
  })

  it('renders the key differentiator text', () => {
    render(<Partner />)
    screen.getByText(/el otro pregunta si lo que se pide es lo correcto/, { selector: 'p' })
  })
})
