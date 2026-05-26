import { Eyebrow, TracePanel } from '#/components/ui'
import type { TraceEntry } from '#/components/ui'

interface Feature {
  text: string
}

interface AgentsProps {
  eyebrow?: string
  headline?: string
  body?: string
  features?: Feature[]
  traces?: TraceEntry[]
}

const defaultFeatures: Feature[] = [
  { text: 'Multi-modelo (Anthropic, OpenAI, local)' },
  { text: 'Integración con tus APIs y bases de datos' },
  { text: 'Eval suite + traces auditables' },
  { text: 'Deploy en tu nube o la nuestra' },
]

const defaultTraces: TraceEntry[] = [
  { status: 'running', name: 'invoice_processor', meta: '→ extracting line items', time: '2.4s' },
  { status: 'ok',      name: 'crm_sync',          meta: '→ 124 records updated',  time: '12.1s' },
  { status: 'ok',      name: 'slack_notifier',    meta: '→ 8 messages sent',       time: '0.6s' },
  { status: 'running', name: 'lead_qualifier',    meta: '→ scoring 14 leads',      time: '1.9s' },
  { status: 'pending', name: 'report_builder',    meta: '→ queued',                time: '—' },
]

export function Agents({
  eyebrow = 'AGENTES EN PRODUCCIÓN',
  headline = 'Workflow agéntico, en producción en',
  body = 'Observabilidad nativa. Retries automáticos. Handoffs entre agentes, APIs y tu equipo. Sin caja negra — ves cada paso, cada decisión, cada token.',
  features = defaultFeatures,
  traces = defaultTraces,
}: AgentsProps) {
  return (
    <section
      style={{
        background: 'var(--ink-0)',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '120px 48px',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 80,
          alignItems: 'center',
        }}
      >
        {/* Copy */}
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
              margin: '16px 0 24px',
            }}
          >
            {headline}{' '}
            <span style={{ color: 'var(--fg-accent)' }}>4 semanas</span>.
          </h2>
          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
              color: 'var(--fg-secondary)',
              margin: '0 0 32px',
              maxWidth: 480,
              fontFamily: 'var(--font-body)',
            }}
          >
            {body}
          </p>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {features.map((f) => (
              <li
                key={f.text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: 'var(--fg-secondary)',
                  fontSize: 'var(--fs-14)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--orange-500)',
                    boxShadow: '0 0 8px rgba(255,90,31,0.6)',
                    flexShrink: 0,
                  }}
                />
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Trace panel */}
        <TracePanel traces={traces} />
      </div>
    </section>
  )
}
