import { Eyebrow } from '#/components/ui'

interface Stat {
  value: string
  unit: string
  description: string
}

interface Testimonial {
  quote: string
  name: string
  role: string
}

interface ResultsProps {
  eyebrow?: string
  headline?: string
  stats?: Stat[]
  testimonial?: Testimonial
}

const defaultStats: Stat[] = [
  { value: '+12,400', unit: 'horas / mes',  description: 'automatizadas para nuestros clientes' },
  { value: '4 sem',   unit: 'promedio',      description: 'de la primera reunión a producción' },
  { value: '98.7%',   unit: 'uptime',        description: 'en agentes desplegados' },
]

const defaultTestimonial: Testimonial = {
  quote: '"AZENT no nos vendió IA. Nos entregó tres agentes en producción que procesan 800 facturas al día. La diferencia se nota."',
  name: 'Lucía Fernández',
  role: 'COO — Pagos del Sur',
}

export function Results({
  eyebrow = 'RESULTADOS',
  headline = 'Lo medimos en horas devueltas, no en demos.',
  stats = defaultStats,
  testimonial = defaultTestimonial,
}: ResultsProps) {
  return (
    <section style={{ padding: '120px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 52,
          fontWeight: 'var(--fw-semibold)',
          lineHeight: 'var(--lh-tight)',
          letterSpacing: '-0.02em',
          color: 'var(--fg-primary)',
          margin: '16px 0 64px',
          maxWidth: 720,
        }}
      >
        {headline}
      </h2>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {stats.map((s, i) => (
          <div
            key={s.unit}
            style={{
              padding: '48px 32px',
              borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 64,
                fontWeight: 'var(--fw-semibold)',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: 'var(--fg-primary)',
                marginBottom: 4,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--fs-12)',
                color: 'var(--fg-accent)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              {s.unit}
            </div>
            <p
              style={{
                fontSize: 'var(--fs-14)',
                color: 'var(--fg-muted)',
                margin: 0,
                lineHeight: 1.55,
                fontFamily: 'var(--font-body)',
              }}
            >
              {s.description}
            </p>
          </div>
        ))}
      </div>

      {/* Testimonial */}
      {testimonial && (
        <blockquote style={{ margin: '64px 0 0', padding: 0, maxWidth: 820 }}>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 'var(--fw-medium)',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              color: 'var(--fg-primary)',
              margin: '0 0 20px',
            }}
          >
            {testimonial.quote}
          </p>
          <footer style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--ink-3)',
                border: '1px solid var(--border-subtle)',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontSize: 'var(--fs-14)', color: 'var(--fg-primary)', fontWeight: 'var(--fw-medium)' }}>
                {testimonial.name}
              </div>
              <div style={{ fontSize: 'var(--fs-12)', color: 'var(--fg-muted)' }}>
                {testimonial.role}
              </div>
            </div>
          </footer>
        </blockquote>
      )}
    </section>
  )
}
