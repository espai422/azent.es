import { useState, useEffect } from 'react'
import { AzentLogo } from '#/components/brand'
import { Button } from '#/components/ui'

export interface NavLink {
  label: string
  href: string
}

interface NavProps {
  links?: NavLink[]
  ctaLabel?: string
  onCtaClick?: () => void
}

const defaultLinks: NavLink[] = [
  { label: 'Servicios', href: '#servicios' },
  { label: 'Agentes',   href: '#agentes' },
  { label: 'Casos',     href: '#casos' },
  { label: 'Nosotros',  href: '#nosotros' },
]

export function Nav({
  links = defaultLinks,
  ctaLabel = 'Habla con nosotros',
  onCtaClick,
}: NavProps) {
  const [scrolled, setScrolled] = useState(false)
  const [linkHover, setLinkHover] = useState<number | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 48px',
        background: scrolled ? 'rgba(10,10,10,0.72)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border-subtle)' : '1px solid transparent',
        transition: 'all var(--dur-base) var(--ease-out)',
      }}
    >
      <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <AzentLogo markSize={26} wordmarkSize={20} />
      </a>

      <div style={{ display: 'flex', gap: 36 }}>
        {links.map((link, i) => (
          <a
            key={link.href}
            href={link.href}
            onMouseEnter={() => setLinkHover(i)}
            onMouseLeave={() => setLinkHover(null)}
            style={{
              fontSize: 'var(--fs-14)',
              fontWeight: 'var(--fw-medium)',
              fontFamily: 'var(--font-body)',
              color: linkHover === i ? 'var(--fg-primary)' : 'var(--fg-secondary)',
              textDecoration: 'none',
              transition: 'color var(--dur-fast) var(--ease-out)',
            }}
          >
            {link.label}
          </a>
        ))}
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={onCtaClick}
        rightIcon={<span style={{ display: 'inline-block' }}>→</span>}
      >
        {ctaLabel}
      </Button>
    </nav>
  )
}
