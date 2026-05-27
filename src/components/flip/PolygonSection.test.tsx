import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PolygonSection } from '#/components/flip/PolygonSection'

const SHAPE = 'polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)'

describe('PolygonSection', () => {
  it('renders children', () => {
    render(<PolygonSection shape={SHAPE}><p>hello</p></PolygonSection>)
    expect(screen.getByText('hello')).toBeDefined()
  })

  it('applies clip-path shape', () => {
    const { container } = render(<PolygonSection shape={SHAPE}><p>x</p></PolygonSection>)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.style.clipPath).toBe(SHAPE)
  })
})
