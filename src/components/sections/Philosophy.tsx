import { Eyebrow } from '#/components/ui'

interface Principle {
  title: string
  body: string
}

interface PhilosophyProps {
  eyebrow?: string
  statement?: string
  body?: string
  principles?: Principle[]
}

const defaultPrinciples: Principle[] = [
  {
    title: 'Técnica sin atajos',
    body: 'Somos ingenieros, no comerciales. Construimos con el mismo rigor que aplicaríamos a nuestros propios productos.',
  },
  {
    title: 'Honestidad con la IA',
    body: 'Conocemos tanto las posibilidades como los límites reales de la inteligencia artificial. Eso nos permite diseñar soluciones que funcionan, no que impresionan en demos.',
  },
  {
    title: 'Resultados, no propuestas',
    body: 'Medimos el éxito en producción. En procesos automatizados. En horas devueltas. En costes reducidos. No en presentaciones entregadas.',
  },
]

export function Philosophy({
  eyebrow = 'FILOSOFÍA',
  statement = 'No vendemos demos. Construimos soluciones que entran en producción y se quedan.',
  body = 'Muchas agencias ofrecen IA sin la capacidad técnica para construir sistemas sólidos. AZENT es diferente: un equipo técnico con experiencia real en ingeniería de software moderna, que entiende cómo diseñar soluciones creativas, eficientes y sostenibles.',
  principles = defaultPrinciples,
}: PhilosophyProps) {
  return (
    <section
      style={{
        background: 'var(--ink-0)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Statement block */}
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '100px 48px 80px',
        }}
      >
        <Eyebrow muted>{eyebrow}</Eyebrow>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 4vw, 56px)',
            fontWeight: 'var(--fw-semibold)',
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
            color: 'var(--fg-primary)',
            margin: '28px 0 32px',
            maxWidth: 900,
          }}
        >
          {statement}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--fs-18)',
            lineHeight: 1.65,
            color: 'var(--fg-secondary)',
            margin: 0,
            maxWidth: 680,
          }}
        >
          {body}
        </p>
      </div>

      {/* Principles */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${principles.length}, 1fr)`,
            padding: '0 48px',
          }}
        >
          {principles.map((p, i) => (
            <div
              key={p.title}
              style={{
                padding: '48px 32px 64px',
                borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--fs-11)',
                  color: 'var(--fg-accent)',
                  letterSpacing: '0.1em',
                  marginBottom: 20,
                }}
              >
                {String(i + 1).padStart(2, '0')} ·
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--fs-20)',
                  fontWeight: 'var(--fw-semibold)',
                  lineHeight: 'var(--lh-snug)',
                  letterSpacing: '-0.01em',
                  color: 'var(--fg-primary)',
                  margin: '0 0 14px',
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--fs-14)',
                  lineHeight: 1.65,
                  color: 'var(--fg-muted)',
                  margin: 0,
                }}
              >
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
