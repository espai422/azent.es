import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('sets id attribute from config.id', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    const section = container.querySelector('section')
    expect(section?.id).toBe('test-id')
  })

  it('renders topic as <small> when present', () => {
    render(<Block config={{ ...base, topic: 'Sobre precios' }} index={0} prevTab="none" />)
    screen.getByText('Sobre precios', { selector: 'small' })
  })

  it('does not render <small> when topic is absent', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    expect(container.querySelector('small')).toBeNull()
  })

  // ── Diagram split layout ───────────────────────────────────────────────

  it('does not render diagram region when config.diagram is absent', () => {
    const { container } = render(<Block config={base} index={0} prevTab="none" />)
    expect(container.querySelector('[data-diagram-canvas]')).toBeNull()
  })

  it('renders diagram region when config.diagram is present', () => {
    const { container } = render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [{ id: 'a', label: 'A', x: 0, y: 0 }], edges: [] },
        }}
        index={0}
        prevTab="none"
      />,
    )
    expect(container.querySelector('[data-diagram-canvas]')).toBeTruthy()
  })

  it('uses data-diagram-position="after" by default when diagram is present', () => {
    const { container } = render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
        }}
        index={0}
        prevTab="none"
      />,
    )
    expect(container.querySelector('[data-diagram-position="after"]')).toBeTruthy()
  })

  it('uses data-diagram-position="before" when explicitly set', () => {
    const { container } = render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
          diagramPosition: 'before',
        }}
        index={0}
        prevTab="none"
      />,
    )
    expect(container.querySelector('[data-diagram-position="before"]')).toBeTruthy()
  })

  it('renders variables when both diagram and formula are present', () => {
    render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
          formula: 'a * b',
          variables: { a: 1, b: 2 },
        }}
        index={0}
        prevTab="none"
      />,
    )
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(2)
  })

  it('does not render variables when formula is absent (even with diagram)', () => {
    const { container } = render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
        }}
        index={0}
        prevTab="none"
      />,
    )
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0)
  })

  it('renders the formula text inside the calculo region', () => {
    render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
          formula: 'x + y',
          variables: { x: 1, y: 2 },
        }}
        index={0}
        prevTab="none"
      />,
    )
    screen.getByText('x + y')
  })

  it('resets edited variable values when config.variables baseline changes', () => {
    const { rerender } = render(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
          formula: 'a',
          variables: { a: 5 },
        }}
        index={0}
        prevTab="none"
      />,
    )
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('5')

    fireEvent.change(input, { target: { value: '99' } })
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('99')

    rerender(
      <Block
        config={{
          ...base,
          diagram: { nodes: [], edges: [] },
          formula: 'a',
          variables: { a: 10 },
        }}
        index={0}
        prevTab="none"
      />,
    )
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('10')
  })
})
