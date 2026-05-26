import { useState } from 'react'
import type { ReactNode, CSSProperties, MouseEventHandler } from 'react'

type CardVariant = 'default' | 'featured'
type CardPadding = 'sm' | 'md' | 'lg'

interface CardProps {
  variant?: CardVariant
  padding?: CardPadding
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: MouseEventHandler<HTMLDivElement>
  hoverable?: boolean
}

const paddingTokens: Record<CardPadding, string> = {
  sm: 'var(--space-5)',
  md: 'var(--space-8)',
  lg: 'var(--space-10)',
}

export function Card({
  variant = 'default',
  padding = 'md',
  children,
  className,
  style,
  onClick,
  hoverable = false,
}: CardProps) {
  const [hover, setHover] = useState(false)

  const base: CSSProperties = {
    background: variant === 'featured'
      ? 'linear-gradient(180deg, rgba(255,90,31,0.05), transparent 60%), var(--bg-surface)'
      : 'var(--bg-surface)',
    border: `1px solid ${
      variant === 'featured'
        ? 'rgba(255,90,31,0.25)'
        : hoverable && hover
          ? 'var(--border-strong)'
          : 'var(--border-subtle)'
    }`,
    borderRadius: 'var(--radius-lg)',
    padding: paddingTokens[padding],
    transition: `border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out)`,
    cursor: onClick ? 'pointer' : 'default',
  }

  return (
    <div
      className={className}
      style={{ ...base, ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
