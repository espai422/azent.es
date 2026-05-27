# Block Content Guide

Reference for generating HTML content for AZENT landing page blocks.
This file is the contract between the block system and any LLM producing content.

---

## Available tags

| Tag | Visual result |
|-----|---------------|
| `<h2>text</h2>` | Large heading, ~1.5–2rem, semibold, heading color |
| `<h3>text</h3>` | Medium heading, ~1.1–1.35rem, medium weight |
| `<p>text</p>` | Body paragraph, 1rem, muted color |
| `<strong>text</strong>` | Bold, heading color |
| `<em>text</em>` | Italic |
| `<s>text</s>` or `<del>text</del>` | Strikethrough, low opacity |
| `<span class="accent">text</span>` | Orange highlight (#ff6b2b on dark, #e55a1a on light) |
| `<small>text</small>` | Standalone label: 0.7rem, uppercase, muted. Use as first element before a heading |
| `<code>text</code>` | Monospace, subtle background |
| `<ul><li>…</li></ul>` | Bullet list |
| `<ol><li>…</li></ol>` | Numbered list |

---

## Structured component: card grid

For metrics, case examples, or feature lists with prominent numbers:

```html
<div class="block-cards">
  <div class="block-card">
    <span class="block-stat">XX h/semana</span>
    <p><strong>Título del caso</strong></p>
    <p>Descripción breve del impacto.</p>
  </div>
  <div class="block-card">
    <span class="block-stat">€XX k/año</span>
    <p><strong>Otro caso</strong></p>
    <p>Descripción breve.</p>
  </div>
</div>
```

- `block-cards` renders as a 2-column grid (desktop) / 1-column (mobile)
- `block-stat` is the large prominent number/metric
- Card backgrounds adapt automatically to the section theme — do not set colors

---

## Colors adapt automatically

All text colors are controlled by the section's `theme` (dark-1, dark-2, light-1, light-2, closing).
You MUST NOT specify colors in HTML. The only color you can apply is the accent via `class="accent"`.

---

## Content limits (mobile-first)

| Element | Maximum |
|---------|---------|
| `<h2>` | **80 characters** — longer headings wrap to 3+ lines on mobile |
| `<h3>` | 120 characters |
| `<p>` per paragraph | 400 characters |
| Paragraphs per block | 3 max |
| List items | 8 max |
| Cards in `.block-cards` | 4 max (2×2 grid on desktop) |

---

## Hard limits — these break the layout

| ❌ Don't | Why |
|---------|-----|
| `style="..."` | Inline styles conflict with the theme system |
| Custom CSS classes other than `accent`, `block-cards`, `block-card`, `block-stat` | No effect |
| `<img>` | Not supported |
| `<a>` | Not supported |
| `<h1>` | Reserved for the Hero block (index 0) only |
| `<div>` without `block-cards`/`block-card` class | No styles defined |
| `<table>`, `<section>`, `<article>` | No styles defined |
| `<script>`, `<iframe>` | Blocked for security |
| Words longer than 25 characters in headings | Will overflow on narrow screens |

---

## Correct patterns

```html
<!-- Heading with accent word + paragraph -->
<h2>Hay un <span class="accent">antes y un después</span> de la IA.</h2>
<p>El mercado vende atajos. <strong>Los atajos no transforman nada.</strong></p>

<!-- Category label before heading -->
<small>Metodología</small>
<h2>Pragmáticos por encima de todo</h2>
<p>Foco total en crear impacto real.</p>

<!-- Editorial contrast with strikethrough -->
<h2><s>Automatización.</s> Transformación real.</h2>
<p>No automatizamos procesos rotos. Los reemplazamos.</p>

<!-- Multi-paragraph section -->
<h2>Software e IA, sin separación artificial</h2>
<p>Para nosotros es lo mismo: crear soluciones.</p>
<p>El resultado son sistemas que hacen cosas que antes requerían personas.</p>

<!-- Bullet list with strikethrough for contrast -->
<h3>Lo que no hacemos</h3>
<ul>
  <li><s>Consultoras de PowerPoint</s></li>
  <li><s>Proyectos piloto que nunca escalan</s></li>
  <li><s>IA por el hype</s></li>
</ul>
```

---

## addSection() API

```ts
// Minimal call — theme and tab are auto-assigned by position
addSection({
  content: `<h2>Tu título</h2><p>Tu cuerpo.</p>`,
})

// With orange rule before content
addSection({
  content: `<h2>Título</h2><p>Cuerpo.</p>`,
  rule: true,
})

// With explicit theme override
addSection({
  content: `<h2>Título</h2>`,
  theme: 'closing',
})
```

Auto-assignment cycles:
- Theme: `dark-1 → light-2 → dark-2 → light-1 → dark-1 → …` (only non-closing sections advance the counter)
- Tab position: `center → right → left → center → …` (same counter as theme)
