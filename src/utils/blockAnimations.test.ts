import { describe, it, expect } from 'vitest'
import { cubicBezier } from './blockAnimations'

describe('cubicBezier', () => {
  it('returns 0 at x=0 and 1 at x=1 for any control points', () => {
    const ease = cubicBezier(0.34, 1.25, 0.4, 1)
    expect(ease(0)).toBeCloseTo(0, 5)
    expect(ease(1)).toBeCloseTo(1, 5)
  })

  it('linear control points (0.25, 0.25, 0.75, 0.75) yield x ≈ y', () => {
    const ease = cubicBezier(0.25, 0.25, 0.75, 0.75)
    for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(ease(x)).toBeCloseTo(x, 3)
    }
  })

  it('spring curve (0.34, 1.25, 0.4, 1) overshoots above 1 between 0.4 and 0.9', () => {
    const ease = cubicBezier(0.34, 1.25, 0.4, 1)
    const peak = Math.max(
      ease(0.4), ease(0.5), ease(0.6), ease(0.7), ease(0.8), ease(0.9),
    )
    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThan(1.2)
  })

  it('clamps inputs below 0 to 0 and above 1 to 1', () => {
    const ease = cubicBezier(0.34, 1.25, 0.4, 1)
    expect(ease(-0.5)).toBe(0)
    expect(ease(1.5)).toBe(1)
  })
})
