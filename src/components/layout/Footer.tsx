import { AzentLogo } from '#/components/brand'

export interface FooterColumn {
  heading: string
  items: { label: string; href: string }[]
}

interface FooterProps {
  columns?: FooterColumn[]
  email?: string
  handle?: string
}

const defaultColumns: FooterColumn[] = [
  {
    heading: 'Servicios',
    items: [
      { label: 'Agentes a medida',    href: '#' },
      { label: 'Workflows agénticos', href: '#' },
      { label: 'Software a medida',   href: '#' },
      { label: 'Consultoría',         href: '#' },
    ],
  },
  {
    heading: 'Empresa',
    items: [
      { label: 'Sobre nosotros',  href: '#' },
      { label: 'Casos de éxito', href: '#' },
      { label: 'Blog',           href: '#' },
      { label: 'Carreras',       href: '#' },
    ],
  },
  {
    heading: 'Recursos',
    items: [
      { label: 'Documentación',    href: '#' },
      { label: 'Trust & Security', href: '#' },
      { label: 'Contacto',         href: '#' },
    ],
  },
]

export function Footer({
  columns = defaultColumns,
  email = 'hola@azent.io',
  handle = '@azent',
}: FooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '80px 48px 36px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `1.4fr repeat(${columns.length}, 1fr)`,
            gap: 64,
            paddingBottom: 56,
          }}
        >
          {/* Brand column */}
          <div>
            <div style={{ marginBottom: 18 }}>
              <AzentLogo markSize={28} wordmarkSize={22} />
            </div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--fs-14)',
                color: 'var(--fg-muted)',
                lineHeight: 1.5,
                maxWidth: 280,
                margin: 0,
                letterSpacing: '0.02em',
              }}
            >
              Inteligencia Artificial.<br />
              Soluciones Reales.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.heading}>
              <div
                style={{
                  fontSize: 'var(--fs-11)',
                  fontWeight: 'var(--fw-medium)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-muted)',
                  marginBottom: 18,
                }}
              >
                {col.heading}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      style={{
                        fontSize: 'var(--fs-14)',
                        color: 'var(--fg-secondary)',
                        textDecoration: 'none',
                      }}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 28,
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 'var(--fs-12)',
            color: 'var(--fg-faint)',
          }}
        >
          <span>© {year} AZENT. Todos los derechos reservados.</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {email}
            <span style={{ margin: '0 8px', color: 'var(--ink-5)' }}>·</span>
            {handle}
          </span>
        </div>
      </div>
    </footer>
  )
}
