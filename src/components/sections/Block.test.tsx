import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Block } from './Block'
import type { SectionConfig } from './SectionContext'

const base: SectionConfig = {
  id: 'test-id',
  theme: 'dark-1',
  tab: 'center',
  content: '<h2>Test heading</h2><p>Test body</p>',
}

describe('Block', () => {
  it('renders heading from content HTML', () => {
    render(<Block config={base} index={0} prevTab="none" />)
    screen.getByRole('heading', { level: 2, name: /Test heading/i })
  })

  it('renders paragraph from content HTML', () => {
    render(<Block config={base} index={0} prevTab="none" />)
    screen.getByText(/Test body/, { selector: 'p' })
  })

  it('sets data-theme attribute', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    expect(container.querySelector('[data-theme="dark-1"]')).toBeTruthy()
  })

  it('sets data-tab attribute', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    expect(container.querySelector('[data-tab="center"]')).toBeTruthy()
  })

  it('renders .block-rule when rule is true', () => {
    const { container } = render(
      <Block config={{ ...base, rule: true }} index={0} prevTab="none" />,
    )
    expect(container.querySelector('.block-rule')).toBeTruthy()
  })

  it('does not render .block-rule when rule is omitted', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    expect(container.querySelector('.block-rule')).toBeNull()
  })

  it('sets margin-top to -12px when index > 0 and prevTab is not none', () => {
    const { container } = render(<Block config={base} index={2} prevTab="center" />)
    const section = container.querySelector('section') as HTMLElement
    expect(section.style.marginTop).toBe('-12px')
  })

  it('does not set negative margin-top when prevTab is none', () => {
    const { container } = render(<Block config={base} index={2} prevTab="none" />)
    const section = container.querySelector('section') as HTMLElement
    expect(section.style.marginTop).not.toBe('-12px')
  })

  it('applies className from config', () => {
    const { container } = render(
      <Block config={{ ...base, className: 'custom-class' }} index={0} prevTab="none" />,
    )
    expect(container.querySelector('.custom-class')).toBeTruthy()
  })
})
