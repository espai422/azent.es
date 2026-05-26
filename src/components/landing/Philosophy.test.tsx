import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Philosophy } from '#/components/landing/Philosophy'

describe('Philosophy', () => {
  it('renders the heading', () => {
    render(<Philosophy />)
    screen.getByRole('heading', { level: 2, name: /Pragmáticos por encima de todo/i })
  })

  it('renders the anti-hype message', () => {
    render(<Philosophy />)
    screen.getByText(/promesas que no sobreviven al contacto con la realidad/, { selector: 'p' })
  })
})
