import { useState } from 'react'
import { Eyebrow } from '#/components/ui'

interface OfferingItem {
  number: string
  title: string
  body: string
}

interface OfferingProps {
  eyebrow?: string
  headline?: string
  body?: string
  items?: OfferingItem[]
}

const defaultItems: OfferingItem[] = [
  {
    number: '01',
    title: 'Agentes de IA a medida',
    body: 'Automatizamos procesos complejos con agentes que actúan sobre tus sistemas — no que solo responden preguntas.',
  },
  {
    number: '02',
    title: 'Automatización e integración',
    body: 'Conectamos tus herramientas, eliminamos el trabajo manual repetitivo y construimos flujos que operan solos.',
  },
  {
    number: '03',
    title: 'Productos IA desde cero',
    body: 'Diseñamos y construimos plataformas, dashboards y productos digitales impulsados por inteligencia artificial.',
  },
  {
    number: '04',
    title: 'Consultoría estratégica',
    body: 'Mapeamos tu operación, identificamos oportunidades concretas y definimos qué IA te da ventaja competitiva real.',
  },
]

function OfferingCard({ number, title, body }: OfferingItem) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '28px 24px',
        border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border-color var(--dur-fast) var(--ease-out)',
        cursor: 'default',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-11)',
          color: hover ? 'var(--fg-accent)' : 'var(--fg-faint)',
          letterSpacing: '0.1em',
          transition: 'color var(--dur-fast) var(--ease-out)',
        }}
      >
        {number}
      </span>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-18)',
          fontWeight: 'var(--fw-semibold)',
          lineHeight: 'var(--lh-snug)',
          letterSpacing: '-0.01em',
          color: 'var(--fg-primary)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--fs-14)',
          lineHeight: 1.6,
          color: 'var(--fg-muted)',
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  )
}

export function Offering({
  eyebrow = 'QUÉ HACEMOS',
  headline = 'No aplicamos IA de forma genérica. Analizamos tu negocio.',
  body = 'Cada empresa tiene partes que pueden transformarse con inteligencia artificial para generar ventaja competitiva real. Nuestro trabajo es encontrarlas y construirlas.',
  items = defaultItems,
}: OfferingProps) {
  return (
    <section style={{ padding: '120px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 80,
          alignItems: 'start',
        }}
      >
        {/* Left — headline */}
        <div style={{ position: 'sticky', top: 120 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 44,
              fontWeight: 'var(--fw-semibold)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              color: 'var(--fg-primary)',
              margin: '20px 0 24px',
            }}
          >
            {headline}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--fs-16)',
              lineHeight: 1.65,
              color: 'var(--fg-secondary)',
              margin: 0,
              maxWidth: 420,
            }}
          >
            {body}
          </p>
        </div>

        {/* Right — 2×2 card grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
          }}
        >
          {items.map((item) => (
            <OfferingCard key={item.number} {...item} />
          ))}
        </div>
      </div>
    </section>
  )
}
