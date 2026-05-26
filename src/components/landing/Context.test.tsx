import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Context } from '#/components/landing/Context'

describe('Context', () => {
  it('renders the heading', () => {
    render(<Context />)
    screen.getByRole('heading', { level: 2, name: /Hay un antes y un después de la IA/i })
  })

  it('renders the body text', () => {
    render(<Context />)
    screen.getByText(/El mercado vende atajos/, { selector: 'p' })
  })
})
