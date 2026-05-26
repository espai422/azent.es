import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'live'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  pulse?: boolean
  children: ReactNode
}

const variantTokens: Record<BadgeVariant, { bg: string; color: string; border: string; dotColor: string }> = {
  default:  { bg: 'var(--ink-3)',                  color: 'var(--fg-secondary)', border: 'var(--border-subtle)', dotColor: 'var(--ink-7)' },
  accent:   { bg: 'rgba(255, 90, 31, 0.10)',       color: 'var(--fg-accent)',    border: 'rgba(255,90,31,0.30)', dotColor: 'var(--orange-500)' },
  success:  { bg: 'rgba(43, 210, 122, 0.10)',      color: '#2BD27A',             border: 'rgba(43,210,122,0.30)', dotColor: '#2BD27A' },
  warning:  { bg: 'rgba(245, 165, 36, 0.10)',      color: 'var(--warn)',         border: 'rgba(245,165,36,0.30)', dotColor: 'var(--warn)' },
  danger:   { bg: 'rgba(242, 59, 59, 0.10)',       color: 'var(--danger)',       border: 'rgba(242,59,59,0.30)', dotColor: 'var(--danger)' },
  live:     { bg: 'rgba(255, 90, 31, 0.10)',       color: 'var(--fg-accent)',    border: 'rgba(255,90,31,0.30)', dotColor: '#FF7333' },
}

const sizeTokens: Record<BadgeSize, { padding: string; fontSize: string; dotSize: number }> = {
  sm: { padding: '2px 7px',  fontSize: 'var(--fs-11)', dotSize: 5 },
  md: { padding: '4px 10px', fontSize: 'var(--fs-12)', dotSize: 6 },
}

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  children,
}: BadgeProps) {
  const v = variantTokens[variant]
  const s = sizeTokens[size]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? 6 : 0,
        padding: s.padding,
        borderRadius: 'var(--radius-pill)',
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.color,
        fontSize: s.fontSize,
        fontFamily: 'var(--font-mono)',
        fontWeight: 'var(--fw-medium)',
        letterSpacing: '0.04em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{
            width: s.dotSize,
            height: s.dotSize,
            borderRadius: '50%',
            background: v.dotColor,
            flexShrink: 0,
            animation: pulse ? 'az-pulse 1.6s ease-in-out infinite' : 'none',
          }}
        />
      )}
      {children}
    </span>
  )
}
