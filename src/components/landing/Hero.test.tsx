import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '#/components/landing/Hero'

describe('Hero', () => {
  it('renders the main heading', () => {
    render(<Hero />)
    screen.getByRole('heading', { level: 1, name: /No hacemos software/i })
  })

  it('renders the body text', () => {
    render(<Hero />)
    screen.getAllByText(
      /Desarrollo de software e inteligencia artificial aplicada al negocio real/
    )
  })
})
