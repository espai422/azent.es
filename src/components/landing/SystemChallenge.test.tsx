import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SystemChallenge } from '#/components/landing/SystemChallenge'

describe('SystemChallenge', () => {
  it('renders the heading', () => {
    render(<SystemChallenge />)
    screen.getByRole('heading', { level: 2, name: /Cuestionamos el sistema/i })
  })

  it('renders the opening statement', () => {
    render(<SystemChallenge />)
    screen.getByText(/La IA no mejora procesos rotos/, { selector: 'p' })
  })

  it('renders the closing statement', () => {
    render(<SystemChallenge />)
    screen.getByText(/algo que antes directamente no era posible/, { selector: 'p' })
  })
})
