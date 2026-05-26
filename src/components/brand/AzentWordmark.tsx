import type { CSSProperties } from 'react'

interface AzentWordmarkProps {
  size?: number
  color?: string
  accentColor?: string
  style?: CSSProperties
}

export function AzentWordmark({
  size = 18,
  color = '#FFFFFF',
  accentColor = 'var(--orange-500)',
  style,
}: AzentWordmarkProps) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: size,
        fontWeight: 600,
        letterSpacing: '0.06em',
        color,
        lineHeight: 1,
        userSelect: 'none',
        ...style,
      }}
    >
      AZENT<span style={{ color: accentColor }}>.</span>
    </span>
  )
}
