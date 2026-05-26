import { Eyebrow, Button } from '#/components/ui'

interface CTAProps {
  eyebrow?: string
  headline?: string
  body?: string
  primaryCta?: { label: string; onClick?: () => void }
  email?: string
}

export function CTA({
  eyebrow = '¿LISTO?',
  headline = 'Hablemos de tu próximo agente',
  body = '30 minutos. Sin pitch. Te decimos si podemos ayudarte y cómo lo haríamos.',
  primaryCta = { label: 'Agendar 30 minutos' },
  email = 'hola@azent.io',
}: CTAProps) {
  return (
    <section style={{ padding: '120px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <div
        style={{
          position: 'relative',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-2xl)',
          padding: '80px 64px',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            right: -100,
            top: -100,
            width: 480,
            height: 480,
            background: 'radial-gradient(circle, rgba(255,90,31,0.20), transparent 65%)',
            filter: 'blur(20px)',
            pointerEvents: 'none',
            animation: 'az-glow-breathe 5s ease-in-out infinite',
          }}
        />

        <div style={{ position: 'relative', maxWidth: 720 }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 64,
              fontWeight: 'var(--fw-semibold)',
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              color: 'var(--fg-primary)',
              margin: '20px 0 24px',
            }}
          >
            {headline}<span style={{ color: 'var(--fg-accent)' }}>.</span>
          </h2>
          <p
            style={{
              fontSize: 'var(--fs-18)',
              lineHeight: 1.55,
              color: 'var(--fg-secondary)',
              margin: '0 0 40px',
              maxWidth: 540,
              fontFamily: 'var(--font-body)',
            }}
          >
            {body}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="lg"
              onClick={primaryCta.onClick}
              rightIcon={<span>→</span>}
            >
              {primaryCta.label}
            </Button>
            <a
              href={`mailto:${email}`}
              style={{
                fontFamily: 'var(--font-body)',
                background: 'transparent',
                color: 'var(--fg-primary)',
                border: '1px solid var(--border-default)',
                padding: '16px 28px',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--fs-16)',
                fontWeight: 'var(--fw-medium)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {email}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
