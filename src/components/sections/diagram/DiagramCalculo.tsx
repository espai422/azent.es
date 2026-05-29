type Props = {
  formula: string
  result: number | null
}

export function DiagramCalculo({ formula, result }: Props) {
  if (!formula.trim()) return null

  return (
    <div className="mt-4">
      <p className="font-mono text-xs text-[var(--prose-muted)] mb-1 break-words">
        {formula}
      </p>
      <p className="text-2xl font-semibold tabular-nums text-[var(--prose-heading)]">
        {result !== null ? formatResult(result) : '—'}
      </p>
    </div>
  )
}

function formatResult(value: number): string {
  if (Number.isInteger(value)) return value.toString()
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}
