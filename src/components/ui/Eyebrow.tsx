import type { ReactNode } from 'react'

interface EyebrowProps {
  children: ReactNode
  muted?: boolean
}

export function Eyebrow({ children, muted = false }: EyebrowProps) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--fs-12)',
        fontWeight: 'var(--fw-medium)',
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-widest)',
        color: muted ? 'var(--fg-muted)' : 'var(--fg-accent)',
      }}
    >
      {children}
    </div>
  )
}
