import { useState } from 'react'
import { Eyebrow } from '#/components/ui'

interface Differentiator {
  number: string
  title: string
  body: string
  tag?: string
}

interface DifferentiatorsProps {
  eyebrow?: string
  headline?: string
  items?: Differentiator[]
}

const defaultItems: Differentiator[] = [
  {
    number: '01',
    title: 'Equipo técnico real',
    body: 'No somos una agencia de marketing que subcontrata desarrollo. Somos ingenieros con experiencia en arquitectura de sistemas, automatización y productos escalables. Construimos lo que prometemos.',
    tag: 'Ingeniería',
  },
  {
    number: '02',
    title: 'IA honesta',
    body: 'Entendemos tanto las posibilidades como las limitaciones actuales de la inteligencia artificial. Eso nos permite proponer soluciones que funcionan de verdad — no demos que impresionan en reuniones.',
    tag: 'Criterio',
  },
  {
    number: '03',
    title: 'Partner a largo plazo',
    body: 'No entregamos un proyecto y desaparecemos. Acompañamos a las empresas en su modernización tecnológica y evolucionamos con ellas conforme avanza la IA.',
    tag: 'Relación',
  },
  {
    number: '04',
    title: 'Personalización real',
    body: 'Cada solución está diseñada para el contexto concreto de tu negocio. No herramientas genéricas ni plantillas. Analizamos tu operación y construimos lo que genera ventaja competitiva para ti.',
    tag: 'Adaptación',
  },
]

function DifferentiatorRow({ number, title, body, tag }: Differentiator) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '64px 1fr auto',
        gap: '0 48px',
        alignItems: 'start',
        padding: '40px 0',
        borderTop: '1px solid var(--border-subtle)',
        transition: 'opacity var(--dur-fast) var(--ease-out)',
        cursor: 'default',
      }}
    >
      {/* Number */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-12)',
          color: hover ? 'var(--fg-accent)' : 'var(--fg-faint)',
          letterSpacing: '0.1em',
          paddingTop: 4,
          transition: 'color var(--dur-fast) var(--ease-out)',
        }}
      >
        {number}
      </span>

      {/* Content */}
      <div>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-24)',
            fontWeight: 'var(--fw-semibold)',
            lineHeight: 'var(--lh-snug)',
            letterSpacing: '-0.015em',
            color: 'var(--fg-primary)',
            margin: '0 0 12px',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--fs-15)',
            lineHeight: 1.65,
            color: 'var(--fg-secondary)',
            margin: 0,
            maxWidth: 640,
          }}
        >
          {body}
        </p>
      </div>

      {/* Tag */}
      {tag && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-11)',
            color: hover ? 'var(--fg-muted)' : 'var(--fg-faint)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            paddingTop: 6,
            transition: 'color var(--dur-fast) var(--ease-out)',
            whiteSpace: 'nowrap',
          }}
        >
          {tag} →
        </span>
      )}
    </div>
  )
}

export function Differentiators({
  eyebrow = 'LO QUE NOS DIFERENCIA',
  headline = 'Por qué AZENT.',
  items = defaultItems,
}: DifferentiatorsProps) {
  return (
    <section style={{ padding: '120px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 8,
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
              letterSpacing: '-0.025em',
              color: 'var(--fg-primary)',
              margin: '16px 0 0',
            }}
          >
            {headline}
          </h2>
        </div>
      </div>

      <div>
        {items.map((item) => (
          <DifferentiatorRow key={item.number} {...item} />
        ))}
        {/* Closing border */}
        <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
      </div>
    </section>
  )
}
