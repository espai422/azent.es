import { describe, it, expect } from 'vitest'
import { parseVariables, evaluate } from './formulaUtils'

describe('parseVariables', () => {
  it('returns single variable name', () => {
    expect(parseVariables('a')).toEqual(['a'])
  })

  it('returns all variable names from arithmetic expression', () => {
    expect(parseVariables('a * b + c').sort()).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array for empty string', () => {
    expect(parseVariables('')).toEqual([])
  })

  it('returns empty array for invalid syntax', () => {
    expect(parseVariables('a *')).toEqual([])
  })

  it('returns empty array for constant expression', () => {
    expect(parseVariables('1 + 2')).toEqual([])
  })
})

describe('evaluate', () => {
  it('computes simple multiplication', () => {
    expect(evaluate('a * b', { a: 2, b: 3 })).toBe(6)
  })

  it('computes mixed expression', () => {
    expect(evaluate('a * b + c', { a: 2, b: 3, c: 4 })).toBe(10)
  })

  it('returns null when a variable is missing', () => {
    expect(evaluate('a * b', { a: 2 })).toBeNull()
  })

  it('returns null when syntax is invalid', () => {
    expect(evaluate('a *', { a: 1 })).toBeNull()
  })

  it('returns null for empty expression', () => {
    expect(evaluate('', {})).toBeNull()
  })
})
