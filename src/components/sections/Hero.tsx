import type { ReactNode } from 'react'
import { AzentMark } from '#/components/brand'
import { Eyebrow, Button } from '#/components/ui'

interface HeroProps {
  eyebrow?: string
  headline?: ReactNode
  body?: string
  primaryCta?: { label: string; onClick?: () => void }
  secondaryCta?: { label: string; onClick?: () => void }
}

export function Hero({
  eyebrow = 'INTELIGENCIA ARTIFICIAL — SOLUCIONES REALES',
  headline = (
    <>
      Agentes que <span style={{ color: 'var(--fg-accent)' }}>ejecutan</span>.<br />
      No prompts.
    </>
  ),
  body = 'Construimos agentes que se conectan a tus sistemas, automatizan tu operación y escalan con tu negocio. Software a medida. IA que entrega.',
  primaryCta = { label: 'Agenda una demo' },
  secondaryCta = { label: 'Ver capacidades' },
}: HeroProps) {
  return (
    <section
      style={{
        position: 'relative',
        padding: '140px 48px 120px',
        maxWidth: 1280,
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(255,90,31,0.18), transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'az-glow-breathe 5s ease-in-out infinite',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 64,
          alignItems: 'center',
        }}
      >
        {/* Copy */}
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 88,
              fontWeight: 'var(--fw-semibold)',
              lineHeight: 'var(--lh-tight)',
              letterSpacing: '-0.03em',
              color: 'var(--fg-primary)',
              margin: '24px 0 28px',
            }}
          >
            {headline}
          </h1>
          <p
            style={{
              fontSize: 19,
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
            <Button variant="secondary" size="lg" onClick={secondaryCta.onClick}>
              {secondaryCta.label}
            </Button>
          </div>
        </div>

        {/* Brand mark display */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: 320,
              height: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-2xl)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(255,90,31,0.18), transparent 60%)',
                borderRadius: 'var(--radius-2xl)',
              }}
            />
            <AzentMark size={200} color="#FF5A1F" />
          </div>
        </div>
      </div>
    </section>
  )
}
