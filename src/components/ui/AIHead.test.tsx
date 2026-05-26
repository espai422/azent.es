import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}))

vi.mock('three/addons/math/MeshSurfaceSampler.js', () => ({
  MeshSurfaceSampler: vi.fn(function (this: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    this.build = vi.fn().mockReturnThis()
    this.sample = vi.fn()
  }),
}))

vi.mock('@react-three/drei', () => ({
  useGLTF: Object.assign(
    vi.fn(() => ({
      scene: {
        traverse: vi.fn(),
      },
    })),
    { preload: vi.fn() }
  ),
}))

// ─── Tests de la función pura depthToColor ────────────────────────────────────

import { depthToColor } from '#/components/ui/AIHead'

describe('depthToColor', () => {
  it('devuelve color frontal (#E6E6E6 ≈ 0.902) cuando z = maxZ', () => {
    const [r, g, b] = depthToColor(10, 0, 10)
    expect(r).toBeCloseTo(0.902, 1)
    expect(g).toBeCloseTo(0.902, 1)
    expect(b).toBeCloseTo(0.902, 1)
  })

  it('devuelve color trasero (#2E2E2E ≈ 0.18) cuando z = minZ', () => {
    const [r, g, b] = depthToColor(0, 0, 10)
    expect(r).toBeCloseTo(0.18, 1)
    expect(g).toBeCloseTo(0.18, 1)
    expect(b).toBeCloseTo(0.18, 1)
  })

  it('devuelve punto medio cuando z está a mitad del rango', () => {
    const [r] = depthToColor(5, 0, 10)
    const expected = (0.902 + 0.18) / 2
    expect(r).toBeCloseTo(expected, 1)
  })

  it('maneja rango degenerado (minZ === maxZ) sin NaN', () => {
    const [r, g, b] = depthToColor(5, 5, 5)
    expect(Number.isNaN(r)).toBe(false)
    expect(Number.isNaN(g)).toBe(false)
    expect(Number.isNaN(b)).toBe(false)
  })
})

// ─── Smoke test del componente ────────────────────────────────────────────────

import { AIHead } from '#/components/ui/AIHead'

describe('AIHead', () => {
  it('renderiza el canvas sin lanzar errores', () => {
    const { getByTestId } = render(<AIHead />)
    expect(getByTestId('r3f-canvas')).toBeDefined()
  })
})
