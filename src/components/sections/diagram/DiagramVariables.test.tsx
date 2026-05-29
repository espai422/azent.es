import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DiagramVariables } from './DiagramVariables'

describe('DiagramVariables', () => {
  it('renders one input per variable', () => {
    render(<DiagramVariables variables={{ a: 1, b: 2 }} onChange={() => {}} />)
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(2)
  })

  it('renders variable names as labels', () => {
    render(<DiagramVariables variables={{ alpha: 5 }} onChange={() => {}} />)
    screen.getByText('alpha')
  })

  it('shows the current value in the input', () => {
    render(<DiagramVariables variables={{ a: 42 }} onChange={() => {}} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('42')
  })

  it('calls onChange with parsed number when input changes', () => {
    const onChange = vi.fn()
    render(<DiagramVariables variables={{ a: 1 }} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '10' } })
    expect(onChange).toHaveBeenCalledWith('a', 10)
  })

  it('calls onChange with 0 when input is cleared (NaN guard)', () => {
    const onChange = vi.fn()
    render(<DiagramVariables variables={{ a: 1 }} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith('a', 0)
  })

  it('renders nothing when variables is empty object', () => {
    const { container } = render(
      <DiagramVariables variables={{}} onChange={() => {}} />,
    )
    expect(container.querySelector('input')).toBeNull()
  })
})
