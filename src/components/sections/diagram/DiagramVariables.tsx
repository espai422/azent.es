type Props = {
  variables: Record<string, number>
  onChange: (name: string, value: number) => void
}

export function DiagramVariables({ variables, onChange }: Props) {
  const entries = Object.entries(variables)
  if (entries.length === 0) return null

  return (
    <ul className="space-y-2 mt-6">
      {entries.map(([name, value]) => (
        <li key={name} className="flex items-center gap-3">
          <label
            htmlFor={`var-${name}`}
            className="font-mono text-sm text-[var(--prose-body)] flex-1 truncate"
            title={name}
          >
            {name}
          </label>
          <input
            id={`var-${name}`}
            type="number"
            value={value}
            onChange={(e) => onChange(name, parseFloat(e.target.value) || 0)}
            className="w-24 text-sm font-mono bg-transparent border border-[var(--prose-muted)] rounded px-2 py-1 text-[var(--prose-heading)] focus:outline-none focus:border-[var(--prose-accent)] focus:ring-1 focus:ring-[var(--prose-accent)]"
          />
        </li>
      ))}
    </ul>
  )
}
