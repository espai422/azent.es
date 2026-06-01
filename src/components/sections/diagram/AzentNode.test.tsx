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
})
