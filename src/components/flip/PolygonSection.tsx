import type { ReactNode } from 'react'

type Props = { shape: string; children: ReactNode }

export function PolygonSection({ shape, children }: Props) {
  return (
    <div style={{ clipPath: shape, background: '#0c0c0c' }}>
      {children}
    </div>
  )
}
