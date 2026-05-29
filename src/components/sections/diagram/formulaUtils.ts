import Formula from 'fparser'

export function parseVariables(expression: string): string[] {
  if (!expression.trim()) return []
  try {
    const f = new Formula(expression)
    return f.getVariables()
  } catch {
    return []
  }
}

export function evaluate(
  expression: string,
  vars: Record<string, number>,
): number | null {
  if (!expression.trim()) return null
  try {
    const f = new Formula(expression)
    const needed = f.getVariables()
    for (const name of needed) {
      if (!(name in vars)) return null
    }
    const result = f.evaluate(vars)
    return typeof result === 'number' && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}
