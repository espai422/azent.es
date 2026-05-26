# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a componentized landing page for AZENT with varied section layouts, copy already defined in the spec, Tailwind-only styling, and a single quality font — structured so applying a design system later requires no HTML restructuring.

**Architecture:** Each section is an independent React component in `src/components/landing/`. The index route composes them vertically. Layouts vary per section (bottom-aligned hero, two-column grid, full-width titles, card grid) to create visual rhythm without decorative elements. Tailwind is used exclusively for spacing, typography, and layout — no colors beyond black/white/neutrals.

**Tech Stack:** TanStack Start, React 19, Tailwind v4, Vitest + @testing-library/react (jsdom), Inter Variable via @fontsource-variable/inter.

**Spec:** `docs/superpowers/specs/2026-05-27-landing-page-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/styles.css` | Import Inter Variable font, set `--font-sans` theme token |
| Modify | `src/routes/__root.tsx` | Update page title and lang |
| Create | `src/routes/index.tsx` | Landing route — composes all section components |
| Create | `src/components/landing/Hero.tsx` | 01 — Hero section |
| Create | `src/components/landing/Context.tsx` | 02 — El contexto |
| Create | `src/components/landing/Partner.tsx` | 03 — Partner, no proveedor |
| Create | `src/components/landing/SystemChallenge.tsx` | 04 — Cuestionamos el sistema |
| Create | `src/components/landing/HowWeWork.tsx` | 05 — Software e IA |
| Create | `src/components/landing/Philosophy.tsx` | 06 — Filosofía / Anti-hype |
| Create | `src/components/landing/Examples.tsx` | 07+08 — Intro + tarjetas (connected block) |
| Create | `src/components/landing/Closing.tsx` | 09 — Cierre final |
| Create | `src/components/landing/Hero.test.tsx` | Tests for Hero |
| Create | `src/components/landing/Context.test.tsx` | Tests for Context |
| Create | `src/components/landing/Partner.test.tsx` | Tests for Partner |
| Create | `src/components/landing/SystemChallenge.test.tsx` | Tests for SystemChallenge |
| Create | `src/components/landing/HowWeWork.test.tsx` | Tests for HowWeWork |
| Create | `src/components/landing/Philosophy.test.tsx` | Tests for Philosophy |
| Create | `src/components/landing/Examples.test.tsx` | Tests for Examples |
| Create | `src/components/landing/Closing.test.tsx` | Tests for Closing |

---

## Task 1: Install font and update styles

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Install Inter Variable**

```bash
pnpm add @fontsource-variable/inter
```

Expected: package added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Update `src/styles.css`**

```css
@import "tailwindcss";
@import "@fontsource-variable/inter";

@theme {
  --font-sans: 'Inter Variable', sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #000;
  color: #fff;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles.css package.json pnpm-lock.yaml
git commit -m "feat: add Inter Variable font and dark base styles"
```

---

## Task 2: Hero component

**Files:**
- Create: `src/components/landing/Hero.tsx`
- Create: `src/components/landing/Hero.test.tsx`

**Layout intent:** Bottom-aligned, min-h-[85vh]. Title very large. Gives a strong editorial opening — the visitor lands in a tall section, reads the big statement, then scrolls into the manifesto.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/landing/Hero.test.tsx
import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '#/components/landing/Hero'

describe('Hero', () => {
  it('renders the main heading', () => {
    render(<Hero />)
    screen.getByRole('heading', { level: 1, name: /No hacemos software/i })
  })

  it('renders the body text', () => {
    render(<Hero />)
    screen.getByText(/Desarrollo de software e inteligencia artificial aplicada al negocio real/)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm vitest run src/components/landing/Hero.test.tsx
```

Expected: FAIL — `Cannot find module '#/components/landing/Hero'`

- [ ] **Step 3: Implement Hero**

```tsx
// src/components/landing/Hero.tsx
export function Hero() {
  return (
    <section className="flex min-h-[85vh] flex-col justify-end px-6 pb-20 md:px-16">
      <h1 className="mb-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
        No hacemos software. Transformamos cómo opera tu empresa.
      </h1>
      <p className="max-w-xl text-base leading-relaxed text-neutral-400 md:text-lg">
        Desarrollo de software e inteligencia artificial aplicada al negocio real.
        Nos sentamos contigo, entendemos qué frena el crecimiento y construimos
        los sistemas que lo desbloquean — con o sin IA, según lo que tiene sentido.
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm vitest run src/components/landing/Hero.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Hero.tsx src/components/landing/Hero.test.tsx
git commit -m "feat: add Hero section component"
```

---

## Task 3: Context component

**Files:**
- Create: `src/components/landing/Context.tsx`
- Create: `src/components/landing/Context.test.tsx`

**Layout intent:** Narrow reading column (`max-w-2xl`), left-aligned. Tight and editorial — no grid, just focused text.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/landing/Context.test.tsx
import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Context } from '#/components/landing/Context'

describe('Context', () => {
  it('renders the heading', () => {
    render(<Context />)
    screen.getByRole('heading', { level: 2, name: /Hay un antes y un después de la IA/i })
  })

  it('renders the body text', () => {
    render(<Context />)
    screen.getByText(/El mercado vende atajos/)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm vitest run src/components/landing/Context.test.tsx
```

Expected: FAIL — `Cannot find module '#/components/landing/Context'`

- [ ] **Step 3: Implement Context**

```tsx
// src/components/landing/Context.tsx
export function Context() {
  return (
    <section className="border-t border-neutral-900 px-6 py-24 md:px-16">
      <div className="max-w-2xl">
        <h2 className="mb-6 text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
          Hay un antes y un después de la IA. Pocas empresas han cruzado esa línea.
        </h2>
        <p className="leading-relaxed text-neutral-400">
          No porque la tecnología no esté disponible. Sino porque aplicarla bien requiere
          entender a fondo el negocio, los procesos y los límites reales de la IA — y eso
          no viene en ningún SaaS genérico. El mercado vende atajos. Los atajos no
          transforman nada.
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm vitest run src/components/landing/Context.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Context.tsx src/components/landing/Context.test.tsx
git commit -m "feat: add Context section component"
```

---

## Task 4: Partner component

**Files:**
- Create: `src/components/landing/Partner.tsx`
- Create: `src/components/landing/Partner.test.tsx`

**Layout intent:** Two-column grid on desktop — left column has a short vertical label, right column has the content. Creates clear visual variety from the single-column sections.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/landing/Partner.test.tsx
import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Partner } from '#/components/landing/Partner'

describe('Partner', () => {
  it('renders the heading', () => {
    render(<Partner />)
    screen.getByRole('heading', { level: 2, name: /Nos involucramos como si fuera nuestro negocio/i })
  })

  it('renders the key differentiator text', () => {
    render(<Partner />)
    screen.getByText(/el otro pregunta si lo que se pide es lo correcto/)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm vitest run src/components/landing/Partner.test.tsx
```

- [ ] **Step 3: Implement Partner**

```tsx
// src/components/landing/Partner.tsx
export function Partner() {
  return (
    <section className="border-t border-neutral-900 px-6 py-24 md:px-16">
      <div className="grid max-w-5xl gap-12 md:grid-cols-[180px_1fr]">
        <div className="pt-1">
          <span className="text-xs font-medium uppercase tracking-widest text-neutral-600">
            Partner
          </span>
        </div>
        <div>
          <h2 className="mb-6 text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
            Nos involucramos como si fuera nuestro negocio
          </h2>
          <p className="leading-relaxed text-neutral-400">
            La diferencia entre una agencia y un partner técnico real es que uno ejecuta
            lo que se le pide y el otro pregunta si lo que se pide es lo correcto.
            Nosotros preguntamos. Entendemos la empresa, sus procesos, sus objetivos.
            Proponemos lo que tiene sentido, aunque no sea lo más obvio. Y cuando algo
            no funciona, lo decimos.
          </p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm vitest run src/components/landing/Partner.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Partner.tsx src/components/landing/Partner.test.tsx
git commit -m "feat: add Partner section component"
```

---

## Task 5: SystemChallenge component

**Files:**
- Create: `src/components/landing/SystemChallenge.tsx`
- Create: `src/components/landing/SystemChallenge.test.tsx`

**Layout intent:** Full-width section. Title is very large and wider than other headings — visually the heaviest block of the page. Body is constrained to a narrower column below. This section earns more visual weight because it's the most diferencial.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/landing/SystemChallenge.test.tsx
import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SystemChallenge } from '#/components/landing/SystemChallenge'

describe('SystemChallenge', () => {
  it('renders the heading', () => {
    render(<SystemChallenge />)
    screen.getByRole('heading', { level: 2, name: /Cuestionamos el sistema/i })
  })

  it('renders the opening statement', () => {
    render(<SystemChallenge />)
    screen.getByText(/La IA no mejora procesos rotos/)
  })

  it('renders the closing statement', () => {
    render(<SystemChallenge />)
    screen.getByText(/algo que antes directamente no era posible/)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm vitest run src/components/landing/SystemChallenge.test.tsx
```

- [ ] **Step 3: Implement SystemChallenge**

```tsx
// src/components/landing/SystemChallenge.tsx
export function SystemChallenge() {
  return (
    <section className="border-t border-neutral-900 px-6 py-24 md:px-16">
      <h2 className="mb-10 max-w-4xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
        Cuestionamos el sistema
      </h2>
      <p className="max-w-2xl leading-relaxed text-neutral-400">
        La IA no mejora procesos rotos. Los reemplaza. Automatizar algo ineficiente solo
        lo hace ineficiente más rápido. Por eso nuestro punto de partida nunca es
        "¿cómo automatizamos esto?" sino "¿tiene sentido que esto exista?". Si la
        respuesta es no, lo tiramos y empezamos de cero. El resultado no es lo de
        siempre más barato — es algo que antes directamente no era posible.
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm vitest run src/components/landing/SystemChallenge.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/SystemChallenge.tsx src/components/landing/SystemChallenge.test.tsx
git commit -m "feat: add SystemChallenge section component"
```

---

## Task 6: HowWeWork component

**Files:**
- Create: `src/components/landing/HowWeWork.tsx`
- Create: `src/components/landing/HowWeWork.test.tsx`

**Layout intent:** Reading column (`max-w-2xl`), three paragraphs with a small vertical gap between them. Uses the same two-column grid as Partner — label left, paragraphs right.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/landing/HowWeWork.test.tsx
import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HowWeWork } from '#/components/landing/HowWeWork'

describe('HowWeWork', () => {
  it('renders the heading', () => {
    render(<HowWeWork />)
    screen.getByRole('heading', { level: 2, name: /Software e IA, sin separación artificial/i })
  })

  it('renders the core message', () => {
    render(<HowWeWork />)
    screen.getByText(/Para nosotros es lo mismo: crear soluciones/)
  })

  it('renders the competitive advantage text', () => {
    render(<HowWeWork />)
    screen.getByText(/menor coste que la competencia/)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm vitest run src/components/landing/HowWeWork.test.tsx
```

- [ ] **Step 3: Implement HowWeWork**

```tsx
// src/components/landing/HowWeWork.tsx
export function HowWeWork() {
  return (
    <section className="border-t border-neutral-900 px-6 py-24 md:px-16">
      <div className="grid max-w-5xl gap-12 md:grid-cols-[180px_1fr]">
        <div className="pt-1">
          <span className="text-xs font-medium uppercase tracking-widest text-neutral-600">
            El cómo
          </span>
        </div>
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
            Software e IA, sin separación artificial
          </h2>
          <p className="leading-relaxed text-neutral-400">
            No hacemos "proyectos de IA" por un lado y "proyectos de software" por otro.
            Para nosotros es lo mismo: crear soluciones. Lo que importa no es la
            tecnología que hay debajo — es que el sistema resuelva el problema real.
          </p>
          <p className="leading-relaxed text-neutral-400">
            Cuando la IA aporta valor, la integramos con la profundidad que requiere
            cada caso — desde una integración puntual hasta sistemas que razonan y
            actúan de forma autónoma. Cuando no hace falta, construimos con desarrollo
            tradicional apoyado en IA, lo que nos permite mover más rápido y a menor
            coste que la competencia sin sacrificar calidad.
          </p>
          <p className="leading-relaxed text-neutral-400">
            El resultado, en cualquier caso, son sistemas que hacen cosas que antes
            requerían personas: analizar, decidir, actuar, comunicar. Arquitectura que
            escala con el negocio y devuelve tiempo al equipo para invertirlo en lo que
            realmente importa.
          </p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm vitest run src/components/landing/HowWeWork.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/HowWeWork.tsx src/components/landing/HowWeWork.test.tsx
git commit -m "feat: add HowWeWork section component"
```

---

## Task 7: Philosophy component

**Files:**
- Create: `src/components/landing/Philosophy.tsx`
- Create: `src/components/landing/Philosophy.test.tsx`

**Layout intent:** Narrow column, right-side of the page on desktop (`ml-auto`) — the only section that breaks left-alignment. Creates a visual pause before the final impact block.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/landing/Philosophy.test.tsx
import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Philosophy } from '#/components/landing/Philosophy'

describe('Philosophy', () => {
  it('renders the heading', () => {
    render(<Philosophy />)
    screen.getByRole('heading', { level: 2, name: /Pragmáticos por encima de todo/i })
  })

  it('renders the anti-hype message', () => {
    render(<Philosophy />)
    screen.getByText(/promesas que no sobreviven al contacto con la realidad/)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm vitest run src/components/landing/Philosophy.test.tsx
```

- [ ] **Step 3: Implement Philosophy**

```tsx
// src/components/landing/Philosophy.tsx
export function Philosophy() {
  return (
    <section className="border-t border-neutral-900 px-6 py-24 md:px-16">
      <div className="ml-auto max-w-2xl">
        <h2 className="mb-6 text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
          Pragmáticos por encima de todo
        </h2>
        <p className="leading-relaxed text-neutral-400">
          El mercado de la IA está lleno de promesas que no sobreviven al contacto
          con la realidad. Nosotros operamos al revés: entendemos bien qué puede hacer
          la IA hoy — y qué no puede — y desde ahí encontramos las soluciones más
          creativas y útiles. Sin burocracia innecesaria, sin procesos que existen para
          justificarse a sí mismos. Foco total en crear impacto real.
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm vitest run src/components/landing/Philosophy.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Philosophy.tsx src/components/landing/Philosophy.test.tsx
git commit -m "feat: add Philosophy section component"
```

---

## Task 8: Examples component

**Files:**
- Create: `src/components/landing/Examples.tsx`
- Create: `src/components/landing/Examples.test.tsx`

**Layout intent:** Intro text is large (almost a statement heading). Cards grid below — 2 columns on desktop, 1 on mobile. Intro and grid share the same section element with no visual separator between them (the text flows into the numbers). Cards have a bordered treatment using `divide` utilities.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/landing/Examples.test.tsx
import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Examples } from '#/components/landing/Examples'

describe('Examples', () => {
  it('renders the intro statement', () => {
    render(<Examples />)
    screen.getByText(/cuánto estás dejando sobre la mesa/)
  })

  it('renders example cards', () => {
    render(<Examples />)
    const cards = screen.getAllByRole('article')
    // at least 3 placeholder cards
    if (cards.length < 3) throw new Error(`Expected at least 3 cards, got ${cards.length}`)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm vitest run src/components/landing/Examples.test.tsx
```

- [ ] **Step 3: Implement Examples**

```tsx
// src/components/landing/Examples.tsx
const EXAMPLES = [
  {
    metric: 'XX h/semana',
    title: 'Onboarding de clientes automatizado',
    description: 'Sin emails manuales, sin formularios, sin seguimiento a mano.',
  },
  {
    metric: '€XX k/año',
    title: 'Procesado de documentos y contratos',
    description: 'Lo que cuesta un perfil administrativo haciendo tareas que un sistema puede hacer.',
  },
  {
    metric: 'XX%',
    title: 'Reducción de tiempo en reporting',
    description: 'Dashboards y análisis que antes costaban horas, generados en segundos.',
  },
  {
    metric: '···',
    title: 'El tuyo aquí',
    description: 'Cada empresa tiene un proceso que no tiene sentido en un mundo con IA.',
  },
]

export function Examples() {
  return (
    <section className="border-t border-neutral-900 px-6 py-24 md:px-16">
      <p className="mb-16 max-w-3xl text-2xl font-semibold leading-snug tracking-tight md:text-4xl">
        La pregunta no es si tu empresa puede mejorar con IA. Es cuánto estás dejando
        sobre la mesa cada día que no lo hace.
      </p>
      <div className="grid grid-cols-1 gap-px bg-neutral-900 md:grid-cols-2">
        {EXAMPLES.map((example) => (
          <article key={example.title} className="bg-black px-8 py-10">
            <p className="mb-2 text-3xl font-semibold tabular-nums md:text-4xl">
              {example.metric}
            </p>
            <p className="mb-2 font-medium">{example.title}</p>
            <p className="text-sm leading-relaxed text-neutral-500">{example.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm vitest run src/components/landing/Examples.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Examples.tsx src/components/landing/Examples.test.tsx
git commit -m "feat: add Examples section component"
```

---

## Task 9: Closing component

**Files:**
- Create: `src/components/landing/Closing.tsx`
- Create: `src/components/landing/Closing.test.tsx`

**Layout intent:** Tall bottom section (`min-h-[40vh]`), content bottom-right aligned. Very minimal — just two lines of text, generous whitespace. Acts as a breathing room at the end of the manifesto.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/landing/Closing.test.tsx
import { describe, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Closing } from '#/components/landing/Closing'

describe('Closing', () => {
  it('renders the closing statement', () => {
    render(<Closing />)
    screen.getByText(/No buscamos clientes/)
  })

  it('renders the secondary line', () => {
    render(<Closing />)
    screen.getByText(/Buscamos empresas que quieran operar diferente/)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm vitest run src/components/landing/Closing.test.tsx
```

- [ ] **Step 3: Implement Closing**

```tsx
// src/components/landing/Closing.tsx
export function Closing() {
  return (
    <section className="flex min-h-[40vh] flex-col items-end justify-end border-t border-neutral-900 px-6 pb-16 pt-24 md:px-16">
      <p className="text-sm text-neutral-600">
        No buscamos clientes. Buscamos empresas que quieran operar diferente.
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
pnpm vitest run src/components/landing/Closing.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/Closing.tsx src/components/landing/Closing.test.tsx
git commit -m "feat: add Closing section component"
```

---

## Task 10: Wire landing route

**Files:**
- Create: `src/routes/index.tsx`
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Update root title**

In `src/routes/__root.tsx`, update the head meta title:

```tsx
{ title: 'AZENT — Tu partner tecnológico' },
```

- [ ] **Step 2: Create `src/routes/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Hero } from '#/components/landing/Hero'
import { Context } from '#/components/landing/Context'
import { Partner } from '#/components/landing/Partner'
import { SystemChallenge } from '#/components/landing/SystemChallenge'
import { HowWeWork } from '#/components/landing/HowWeWork'
import { Philosophy } from '#/components/landing/Philosophy'
import { Examples } from '#/components/landing/Examples'
import { Closing } from '#/components/landing/Closing'

export const Route = createFileRoute('/')({ component: Landing })

function Landing() {
  return (
    <main>
      <Hero />
      <Context />
      <Partner />
      <SystemChallenge />
      <HowWeWork />
      <Philosophy />
      <Examples />
      <Closing />
    </main>
  )
}
```

- [ ] **Step 3: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Start dev server and verify visually**

```bash
pnpm dev
```

Open `http://localhost:3000`. Check:
- Font loads (Inter Variable, not system fallback)
- All 8 sections render in order
- Hero is tall and bottom-aligned
- Partner and HowWeWork show two-column grid on wide viewport
- SystemChallenge has a larger title than other sections
- Philosophy text is right-aligned
- Examples show 4 cards in a 2×2 grid
- Closing is minimal and bottom-right aligned

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.tsx src/routes/__root.tsx
git commit -m "feat: wire landing page route"
```
