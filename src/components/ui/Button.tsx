import { useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  rightIcon?: ReactNode
  leftIcon?: ReactNode
}

const sizeTokens: Record<ButtonSize, { padding: string; fontSize: string; gap: string; radius: string }> = {
  sm: { padding: '8px 14px',  fontSize: 'var(--fs-13)', gap: '6px',  radius: 'var(--radius-md)' },
  md: { padding: '12px 20px', fontSize: 'var(--fs-15)', gap: '8px',  radius: 'var(--radius-md)' },
  lg: { padding: '16px 28px', fontSize: 'var(--fs-16)', gap: '10px', radius: 'var(--radius-md)' },
}

export function Button({
  variant = 'primary',
  size = 'md',
  rightIcon,
  leftIcon,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const [hover, setHover] = useState(false)
  const [pressed, setPressed] = useState(false)
  const tok = sizeTokens[size]

  const base: React.CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: tok.fontSize,
    fontWeight: 'var(--fw-medium)',
    padding: tok.padding,
    borderRadius: tok.radius,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: tok.gap,
    transition: `all var(--dur-fast) var(--ease-out)`,
    transform: pressed && !disabled ? 'scale(0.98)' : 'scale(1)',
    opacity: disabled ? 0.4 : 1,
    outline: 'none',
    whiteSpace: 'nowrap',
  }

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: hover && !disabled ? 'var(--orange-400)' : 'var(--orange-500)',
      color: '#fff',
      boxShadow: hover && !disabled && !pressed ? 'var(--glow-orange-md)' : 'var(--glow-orange-sm)',
    },
    secondary: {
      background: 'transparent',
      color: hover && !disabled ? 'var(--fg-primary)' : 'var(--fg-secondary)',
      border: `1px solid ${hover && !disabled ? 'var(--border-strong)' : 'var(--border-default)'}`,
      boxShadow: 'none',
    },
    ghost: {
      background: hover && !disabled ? 'var(--bg-raised)' : 'transparent',
      color: hover && !disabled ? 'var(--fg-primary)' : 'var(--fg-secondary)',
      boxShadow: 'none',
    },
  }

  return (
    <button
      {...props}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{ ...base, ...variantStyles[variant], ...style }}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  )
}
