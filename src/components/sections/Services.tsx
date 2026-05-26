import { useState } from 'react'
import { Eyebrow } from '#/components/ui'

export interface ServiceItem {
  number: string
  title: string
  body: string
  featured?: boolean
}

interface ServicesProps {
  eyebrow?: string
  headline?: string
  tagline?: string
  items?: ServiceItem[]
}

const defaultItems: ServiceItem[] = [
  {
    number: '01',
    title: 'Agentes a medida',
    body: 'Agentes que se conectan a tus sistemas y ejecutan tareas reales — facturación, soporte, ventas, operaciones.',
    featured: true,
  },
  {
    number: '02',
    title: 'Workflows agénticos',
    body: 'Pipelines multi-agente con observabilidad, retries y handoffs entre LLMs, APIs y humanos.',
  },
  {
    number: '03',
    title: 'Software a medida',
    body: 'Plataformas, dashboards, integraciones. Lo construimos en producción, no en demos.',
  },
  {
    number: '04',
    title: 'Consultoría técnica',
    body: 'Auditamos tu stack, identificamos oportunidades de IA y definimos el camino — sin slop, sin humo.',
  },
]

interface ServiceCardProps extends ServiceItem {}

function ServiceCard({ number, title, body, featured = false }: ServiceCardProps) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: featured
          ? 'linear-gradient(180deg, rgba(255,90,31,0.05), transparent 60%), var(--bg-surface)'
          : 'var(--bg-surface)',
        border: `1px solid ${
          featured ? 'rgba(255,90,31,0.25)' : hover ? 'var(--border-strong)' : 'var(--border-subtle)'
        }`,
        borderRadius: 14,
        padding: 28,
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color var(--dur-base) var(--ease-out)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-12)',
          color: featured ? 'var(--fg-accent)' : 'var(--fg-muted)',
          letterSpacing: '0.1em',
          marginBottom: 80,
        }}
      >
        {number} —
      </div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 'var(--fw-semibold)',
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
          color: 'var(--fg-primary)',
          margin: '0 0 12px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 'var(--fs-14)',
          lineHeight: 1.55,
          color: 'var(--fg-muted)',
          margin: 0,
          flex: 1,
          fontFamily: 'var(--font-body)',
        }}
      >
        {body}
      </p>
      <div
        style={{
          marginTop: 20,
          color: featured ? 'var(--fg-accent)' : 'var(--fg-secondary)',
          fontSize: 'var(--fs-13)',
          fontWeight: 'var(--fw-medium)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Conocer más{' '}
        <span
          style={{
            display: 'inline-block',
            transform: hover ? 'translateX(3px)' : 'translateX(0)',
            transition: 'transform var(--dur-fast) var(--ease-out)',
          }}
        >
          →
        </span>
      </div>
    </div>
  )
}

export function Services({
  eyebrow = 'QUÉ HACEMOS',
  headline = 'Construimos el software.\nTú escalas.',
  tagline = 'Cuatro capacidades. Un equipo. Resultados en producción, no prototipos.',
  items = defaultItems,
}: ServicesProps) {
  const lines = headline.split('\n')

  return (
    <section style={{ padding: '120px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 56,
          gap: 48,
        }}
      >
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 52,
              fontWeight: 'var(--fw-semibold)',
              lineHeight: 'var(--lh-tight)',
              letterSpacing: '-0.02em',
              color: 'var(--fg-primary)',
              margin: '16px 0 0',
              maxWidth: 640,
            }}
          >
            {lines.map((line, i) => (
              <span key={i}>
                {line}
                {i < lines.length - 1 && <br />}
              </span>
            ))}
          </h2>
        </div>
        <p
          style={{
            color: 'var(--fg-muted)',
            fontSize: 'var(--fs-15)',
            maxWidth: 280,
            margin: 0,
            lineHeight: 1.6,
            fontFamily: 'var(--font-body)',
          }}
        >
          {tagline}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 16 }}>
        {items.map((item) => (
          <ServiceCard key={item.number} {...item} />
        ))}
      </div>
    </section>
  )
}
