interface AzentMarkProps {
  size?: number
  color?: string
  className?: string
}

export function AzentMark({ size = 24, color = 'currentColor', className }: AzentMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M30 180 L66 180 L122 30 L86 30 Z" fill={color} />
      <path d="M114 78 L140 78 L178 180 L152 180 Z" fill={color} />
    </svg>
  )
}
