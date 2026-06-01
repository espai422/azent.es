import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AzentNode } from './AzentNode'
import type { NodeProps, Node } from '@xyflow/react'

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>()
  return {
    ...actual,
    // Handle requires the ReactFlow Zustand store; replace with a no-op div in tests
    Handle: () => null,
  }
})

// Prevent streamFlashSpansIn from clearing span text in tests (it starts async
// streaming which wipes textContent immediately on effect run).
vi.mock('#/utils/streamFlash', () => ({ streamFlashSpansIn: vi.fn() }))
// Prevent flashBlockOutline from calling element.animate (not in jsdom).
vi.mock('#/utils/blockAnimations', () => ({ flashBlockOutline: vi.fn() }))

type Data = { label: string; entering?: boolean; exiting?: boolean; labelRev?: number }

function makeProps(data: Data): NodeProps<Node<Data>> {
  // ReactFlow passes a richer prop shape; we cast because the component only
  // reads `data` in V1.
  return { data, id: 'n1' } as unknown as NodeProps<Node<Data>>
}

describe('AzentNode', () => {
  it('renders the label text', () => {
    const { getByText } = render(<AzentNode {...makeProps({ label: 'Hola' })} />)
    expect(getByText('Hola')).toBeTruthy()
  })

  it('applies the entering class when entering is true', () => {
    const { container } = render(
      <AzentNode {...makeProps({ label: 'Hola', entering: true })} />,
    )
    const root = container.querySelector('.azent-node')
    expect(root?.classList.contains('azent-node--entering')).toBe(true)
  })

  it('wraps the label in a data-flash span when entering is true', () => {
    const { container } = render(
      <AzentNode {...makeProps({ label: 'Hola', entering: true })} />,
    )
    const span = container.querySelector('span[data-flash]')
    expect(span?.textContent).toBe('Hola')
  })

  it('applies the exiting class when exiting is true', () => {
    const { container } = render(
      <AzentNode {...makeProps({ label: 'Hola', exiting: true })} />,
    )
    const root = container.querySelector('.azent-node')
    expect(root?.classList.contains('azent-node--exiting')).toBe(true)
  })

  it('uses labelRev as the span key so re-renders mount a fresh data-flash span', async () => {
    const { container, rerender } = render(
      <AzentNode {...makeProps({ label: 'A', labelRev: 1 })} />,
    )
    const first = container.querySelector('span[data-flash]')
    expect(first?.textContent).toBe('A')

    rerender(<AzentNode {...makeProps({ label: 'B', labelRev: 2 })} />)
    const second = container.querySelector('span[data-flash]')
    expect(second?.textContent).toBe('B')
    // The keys differ so the DOM node identity must have changed.
    expect(first).not.toBe(second)
  })
})
