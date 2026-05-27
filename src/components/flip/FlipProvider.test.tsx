import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { FlipProvider } from '#/components/flip/FlipProvider'
import { useFlipControls } from '#/components/flip/useFlipControls'

function wrapper({ children }: { children: ReactNode }) {
  return <FlipProvider>{children}</FlipProvider>
}

describe('useFlipControls', () => {
  it('isFlipped returns false for unknown id', () => {
    const { result } = renderHook(() => useFlipControls(), { wrapper })
    expect(result.current.isFlipped('x')).toBe(false)
  })

  it('toggle flips a section on and off', () => {
    const { result } = renderHook(() => useFlipControls(), { wrapper })
    act(() => result.current.toggle('a'))
    expect(result.current.isFlipped('a')).toBe(true)
    act(() => result.current.toggle('a'))
    expect(result.current.isFlipped('a')).toBe(false)
  })

  it('set forces a specific value', () => {
    const { result } = renderHook(() => useFlipControls(), { wrapper })
    act(() => result.current.set('b', true))
    expect(result.current.isFlipped('b')).toBe(true)
    act(() => result.current.set('b', false))
    expect(result.current.isFlipped('b')).toBe(false)
  })

  it('resetAll sets all flipped sections to false', () => {
    const { result } = renderHook(() => useFlipControls(), { wrapper })
    act(() => { result.current.toggle('a'); result.current.toggle('b') })
    act(() => result.current.resetAll())
    expect(result.current.isFlipped('a')).toBe(false)
    expect(result.current.isFlipped('b')).toBe(false)
  })

  it('multiple sections can be flipped simultaneously', () => {
    const { result } = renderHook(() => useFlipControls(), { wrapper })
    act(() => { result.current.toggle('a'); result.current.toggle('b') })
    expect(result.current.isFlipped('a')).toBe(true)
    expect(result.current.isFlipped('b')).toBe(true)
  })

  it('throws when used outside FlipProvider', () => {
    expect(() => renderHook(() => useFlipControls())).toThrow('FlipProvider')
  })
})
