import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Examples } from '#/components/landing/Examples'

describe('Examples', () => {
  it('renders the intro statement', () => {
    render(<Examples />)
    screen.getByText(/cuánto estás dejando sobre la mesa/, { selector: 'p' })
  })

  it('renders example cards', () => {
    render(<Examples />)
    const cards = screen.getAllByRole('article')
    if (cards.length < 3) throw new Error(`Expected at least 3 cards, got ${cards.length}`)
  })
})
