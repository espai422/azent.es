import { createFileRoute } from '@tanstack/react-router'
import { Eyebrow, Button, AIHead } from '#/components/ui'
import { Nav, Footer } from '#/components/layout'
import { CTA, Offering, Philosophy, Differentiators } from '#/components/sections'

export const Route = createFileRoute('/')({ component: Landing })

const navLinks = [
  { label: 'Qué hacemos', href: '#ofrecemos' },
  { label: 'Filosofía',   href: '#filosofia' },
  { label: 'Diferencia',  href: '#diferencia' },
  { label: 'Contacto',    href: '#contacto' },
]

function Landing() {
  return (
    <div style={{ background: 'var(--bg-canvas)', minHeight: '100vh' }}>
      <Nav links={navLinks} ctaLabel="Habla con nosotros" />

      {/* ── HERO / CTA ─────────────────────────────────────── */}
      <LandingHero />

      {/* ── QUÉ OFRECEMOS ─────────────────────────────────── */}
      <div id="ofrecemos">
        <Offering />
      </div>

      {/* ── FILOSOFÍA ─────────────────────────────────────── */}
      <div id="filosofia">
        <Philosophy />
      </div>

      {/* ── LO QUE NOS DIFERENCIA ─────────────────────────── */}
      <div id="diferencia">
        <Differentiators />
      </div>

      {/* ── CTA INFERIOR ──────────────────────────────────── */}
      <div id="contacto">
        <CTA />
      </div>

      <Footer />
    </div>
  )
}

function LandingHero() {
  return (
    <section
      style={{
        position: 'relative',
        padding: '130px 48px 120px',
        maxWidth: 1280,
        margin: '0 auto',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '8%',
          width: 560,
          height: 560,
          background: 'radial-gradient(circle, rgba(255,90,31,0.15), transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'az-glow-breathe 6s ease-in-out infinite',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: '1.3fr 1fr',
          gap: 64,
          alignItems: 'center',
        }}
      >
        {/* Copy */}
        <div>
          <Eyebrow>AZENT — ESTUDIO DE IA · MALLORCA</Eyebrow>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(52px, 6vw, 88px)',
              fontWeight: 'var(--fw-semibold)',
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              color: 'var(--fg-primary)',
              margin: '24px 0 28px',
            }}
          >
            La IA que{' '}
            <span style={{ color: 'var(--fg-accent)' }}>transforma</span>
            .<br />
            No la que impresiona.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 19,
              lineHeight: 1.6,
              color: 'var(--fg-secondary)',
              margin: '0 0 40px',
              maxWidth: 520,
            }}
          >
            Diseñamos, construimos y desplegamos sistemas de inteligencia artificial
            que generan ventaja competitiva real para tu negocio — sin demos vacías,
            sin humo.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="lg"
              rightIcon={<span>→</span>}
              onClick={() =>
                document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Agenda una llamada
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() =>
                document.getElementById('ofrecemos')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Ver qué hacemos
            </Button>
          </div>

          {/* Social proof strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              marginTop: 48,
              paddingTop: 32,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            {[
              { value: '+12k', label: 'horas automatizadas' },
              { value: '4 sem', label: 'de idea a producción' },
              { value: '100%', label: 'proyectos entregados' },
            ].map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--fs-24)',
                    fontWeight: 'var(--fw-semibold)',
                    color: 'var(--fg-primary)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--fs-12)',
                    color: 'var(--fg-muted)',
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Head */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-2xl)',
              overflow: 'hidden',
            }}
          >
            <AIHead />
          </div>
        </div>
      </div>
    </section>
  )
}
