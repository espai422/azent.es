# Sistema de personalidad visual — Diseño

**Fecha:** 2026-05-31
**Secciones afectadas:** Sistema de bloques completo (`src/components/sections/`, `src/styles.css`, `.codex-browser-agent/AGENTS.md`)

---

## Resumen

Subida de personalidad visual del sitio AZENT manteniendo la paleta actual (negro + naranja `#ff6b2b`) y el sistema de bloques con interlocking. Cinco cambios:

1. **Aurora + Glass** — capa atmosférica común a todas las secciones: glow naranja estático en una esquina, hairline-gradiente cruzando el borde superior, dot-grid sutil de fondo, y CTAs/paneles con efecto glass (backdrop-blur).
2. **Contraste de grises mejorado** — los grises actuales (`#888` y `#555`) no son legibles del todo; suben a `#b8b8b8` y `#4a4a4a`. Off-white frío `#f8f8f8` se cambia a un off-white cálido `#f6f4ef` que combina mejor con el naranja.
3. **Tipografía mono** — se añade **JetBrains Mono** para eyebrows, labels, badges, pills, y metadata HUD. Inter se mantiene como cuerpo principal. Da el toque "instrument" sin volverse Awwwards.
4. **Interlocking bidireccional trapezoidal (28px)** — sustituye al puzzle rectangular actual de 12px. Cada sección mete un tab hacia abajo en la siguiente Y la siguiente mete otro tab hacia arriba dentro de la actual, en posiciones distintas. Las dos piezas se muerden de verdad.
5. **Vocabulario HTML ampliado** — el agente Codex gana 5 clases nuevas (`grad`, `pill`, `chip`, `panel`, `glow-dot`) además de las actuales, documentadas en `.codex-browser-agent/AGENTS.md`.

Distribución claro/oscuro: se mantiene el ritmo actual (~60% oscuro / 40% claro), con máximo 65% oscuro como límite estético.

---

## 1. Sistema atmosférico (Aurora + Glass)

Cada sección monta tres capas absolutas detrás del contenido, todas con `pointer-events: none` y `z-index: 0`:

### 1.1 Aurora glow

Glow naranja estático en una esquina. La esquina se elige por sección para variar el ritmo.

**Tema oscuro:**
```css
.block-section[data-theme="dark-1"] .aurora,
.block-section[data-theme="dark-2"] .aurora,
.block-section[data-theme="closing"] .aurora {
  background:
    radial-gradient(ellipse 60% 50% at var(--glow-x, 92%) var(--glow-y, -10%), rgba(255,107,43,0.22), transparent 60%),
    radial-gradient(ellipse 40% 30% at var(--glow-x, 80%) var(--glow-y, -20%), rgba(255,180,140,0.10), transparent 60%);
}
```

**Tema claro:**
```css
.block-section[data-theme="light-1"] .aurora,
.block-section[data-theme="light-2"] .aurora {
  background:
    radial-gradient(ellipse 55% 50% at var(--glow-x, 90%) var(--glow-y, -10%), rgba(255,107,43,0.18), transparent 60%),
    radial-gradient(ellipse 35% 28% at var(--glow-x, 78%) var(--glow-y, -18%), rgba(255,180,140,0.14), transparent 60%);
}
```

**Posición del glow** — atributo `data-glow="tr"|"tl"|"br"|"bl"` en la sección. Cada valor resuelve `--glow-x` y `--glow-y` mediante reglas en CSS:

```css
.block-section[data-glow="tr"] { --glow-x: 92%; --glow-y: -10%; }
.block-section[data-glow="tl"] { --glow-x: 8%;  --glow-y: -10%; }
.block-section[data-glow="br"] { --glow-x: 92%; --glow-y: 110%; }
.block-section[data-glow="bl"] { --glow-x: 8%;  --glow-y: 110%; }
```

Auto-asignado por índice con cycle `['tr', 'bl', 'tl', 'br'][index % 4]` para que dos secciones consecutivas tengan glow en lados opuestos. Override por `glow` opcional en `SectionConfig`.

### 1.2 Hairline-gradiente superior

Línea 1px de gradiente naranja en el borde superior. Estática, no animada (probamos animarla en mockups — cansa).

```css
.block-section::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  pointer-events: none; z-index: 2;
}

.block-section[data-theme="dark-1"]::before,
.block-section[data-theme="dark-2"]::before,
.block-section[data-theme="closing"]::before {
  background: linear-gradient(to right,
    transparent 0%, rgba(255,107,43,0.55) 25%, rgba(255,180,140,0.35) 55%, transparent 100%);
}

.block-section[data-theme="light-1"]::before,
.block-section[data-theme="light-2"]::before {
  background: linear-gradient(to right,
    transparent 0%, rgba(255,107,43,0.7) 25%, rgba(212,74,19,0.4) 55%, transparent 100%);
}
```

**Nota:** la hairline cruza el borde superior recto. Donde la sección anterior protruye con su downTab, la hairline ya no es visible (queda detrás del cut). El efecto se mantiene en los tramos rectos del borde.

### 1.3 Dot grid

Textura de puntos 1px cada 22px, desvanecida hacia abajo con `mask-image`.

```css
.block-section .grid {
  position: absolute; inset: 0;
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, #000 0%, #000 70%, transparent 100%);
  pointer-events: none; z-index: 0;
}

.block-section[data-theme="dark-1"] .grid,
.block-section[data-theme="dark-2"] .grid,
.block-section[data-theme="closing"] .grid {
  background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.045) 1px, transparent 0);
}

.block-section[data-theme="light-1"] .grid,
.block-section[data-theme="light-2"] .grid {
  background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0);
}
```

---

## 2. Tokens de color

Cambian los grises de cuerpo y el off-white frío. Resto se mantiene.

### Tema oscuro

| Token | Antes | Ahora | Rol |
|---|---|---|---|
| `--prose-heading` | `#e8e8e8` | `#f1f1f1` | Heading |
| `--prose-body` | `#888888` | `#b8b8b8` | Cuerpo (sube contraste) |
| `--prose-muted` | `#444444` | `#6e6e6e` | Mute (small caps, code) |
| `--prose-accent` | `#ff6b2b` | `#ff6b2b` | Accent (sin cambio) |
| `--prose-accent-soft` | — | `#ffb27a` | Para gradientes en texto |
| `--prose-line` | `#2a2a2a` | `#1f1f1f` | Líneas de separación |

### Tema claro

| Token | Antes | Ahora | Rol |
|---|---|---|---|
| `--prose-bg` (light-1) | `#f8f8f8` (frío) | `#f6f4ef` (cálido) | Bg principal |
| `--prose-bg` (light-2) | `#f0f0f0` | `#efeae0` | Bg suave |
| `--prose-heading` | `#111111` | `#0e0e0e` | Heading |
| `--prose-body` | `#555555` | `#4a4a4a` | Cuerpo (más sólido) |
| `--prose-muted` | `#999999` | `#7a7a7a` | Mute |
| `--prose-accent` | `#e55a1a` | `#d44a13` | Accent (más profundo) |
| `--prose-line` | `#d0d0d0` | `#d8d2c4` | Líneas |

### Tema closing

| Token | Antes | Ahora | Rol |
|---|---|---|---|
| `--prose-bg` | `#111111` | `#050505` | Bg cierre |

Tema closing se trata como dark-1 oscurecido.

---

## 3. Tipografía

### Fuentes

- **Inter Variable** — cuerpo principal, headings (sin cambio).
- **JetBrains Mono** *(nuevo)* — eyebrows, labels, badges, pills, metadata HUD. Pesos 500 y 600.

Añadir `@fontsource-variable/jetbrains-mono` como dependencia y exponer como `--font-mono`:

```css
@theme {
  --font-sans: 'Inter Variable', sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, monospace;
}
```

### Reglas tipográficas adicionales

```css
/* Eyebrow / label / pill — uso general de mono */
.block-content .eyebrow,
.block-content small,
.block-content .block-topic,
.block-content .pill {
  font-family: var(--font-mono);
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
```

Los headings, body, code, listas — sin cambios tipográficos respecto al sistema actual.

---

## 4. Interlocking bidireccional trapezoidal

### Geometría

Sustituye al sistema de tab unidireccional de 12px. Cada sección define:

- **`downTab`** — trapezoide isósceles que protruye 28px hacia abajo desde el borde inferior. Va dentro de la sección siguiente.
- **`upTab`** — trapezoide isósceles que protruye 28px hacia arriba desde el borde superior. Va dentro de la sección anterior.

Ambos trapecios son **convergentes**: la base (donde el tab nace de la sección) es más ancha que el extremo (donde penetra en la sección vecina). Esto da la sensación de pieza encajada, no de bloque cuadrado.

### Parámetros

| Parámetro | Valor |
|---|---|
| Profundidad de tab | **28px** |
| Ancho base | 28–32% del ancho de sección |
| Ancho extremo | 16–22% (≈55% del ancho base) |
| Slant lateral | 4–6% sobre 28px → ángulo de ~10° |

### Variantes de patrón

Cada sección recibe **una** `interlockVariant` que define la pareja completa (downTab + upTab) garantizando que las dos posiciones no se solapan en x. Cuatro patrones que cubren bien el ancho:

| Variant | downTab x-base | upTab x-base | gap entre tabs |
|---|---|---|---|
| `A` (down-right / up-left) | 66–94% | 6–34% | 32% |
| `B` (down-left / up-right) | 6–34% | 66–94% | 32% |
| `C` (down-center-right / up-left-narrow) | 50–78% | 4–26% | 24% |
| `D` (down-center-left / up-right-narrow) | 22–50% | 74–96% | 24% |

Todos los tabs son trapezoidales con base 24–28% y extremo ~55% de la base (parámetros de la tabla anterior).

**Asignación automática por índice**:
```
interlockVariant = ['A', 'B', 'C', 'D'][index % 4]
```

Combinado con el ciclo de color (4-step), el patrón completo (color + interlock) se repite cada 4 secciones — aceptable porque la combinación con el aurora (rotativo también) lo enmascara. La variante puede pasarse explícita en el config si una sección concreta lo necesita.

### Clip-path de la sección

Cada sección tiene `clip-path` con dos protrusiones (up + down de su propia `interlockVariant`) y dos cuts (uno por cada tab del vecino: el `downTab` de la sección anterior se mete en el top, el `upTab` de la sección siguiente se mete en el bottom). El polígono se construye con 14 vértices.

**Ejemplo: variante `A` propia (down-right 66–94, up-left 6–34), con vecino superior variante `B` (su down-left 6–34 entra en el top) y vecino inferior variante `B` (su up-right 66–94 entra en el bottom)**:
```
clip-path: polygon(
  /* TOP edge ---- own upTab (left, 6-34) + cut for prev's downTab (B's down-left, 6-34) */
  /* NOTE: in variant A, own upTab is at the same x-range as prev B's downTab would be.
     The "stitch" condition: when prev's downTab x-range == own upTab x-range,
     they form a continuous shape — own upTab fills the area, prev's tab continues
     into it (effectively a single shared volume). See "Stitch rule" below. */
  0% 28px,
  6% 28px,
  12% 0%,        /* own upTab going up */
  28% 0%,
  34% 28px,
  100% 28px,
  /* RIGHT edge ----- */
  100% calc(100% - 28px),
  /* BOTTOM edge — own downTab (right, 66-94) + cut for next's upTab (B's up-right, 66-94) */
  94% calc(100% - 28px),
  88% 100%,      /* own downTab going down */
  72% 100%,
  66% calc(100% - 28px),
  0% calc(100% - 28px)
);
```

(Polígono de 11 vértices en el caso A/B/A — el cut del vecino superior coincide con el upTab propio, fusionándose en una sola apertura, así que no necesita vértices extra. Cuando el vecino tiene otra variante, el polígono crece hasta 14 vértices con el cut adicional.)

### Stitch rule

Cuando el `downTab` de la sección anterior cae en el mismo x-range que el `upTab` propio, se fusionan visualmente: una sola apertura por la que la sección anterior "entra" mientras esta sección "sube" a llenarla. Eso significa que la **variante A seguida de variante B** crea una zona donde las dos secciones se fusionan limpiamente.

Si los rangos están en x DISTINTOS (caso común con el cycle A→B→C→D), el clip-path tiene 4 features separadas: 2 protrusions propias + 2 cuts.

En el código, el polígono se genera programáticamente a partir de `interlockVariant` propia + `prevVariant` + `nextVariant` recibidos como props.

### Margin / padding

Para que los tabs penetren en las secciones vecinas, cada sección tiene `margin-top: -56px` (28 del up-tab + 28 del down-tab del vecino superior).

```css
.block-section {
  margin-top: -56px;            /* solapa 56px con el anterior */
  padding-top: calc(VISUAL + 56px);
  padding-bottom: calc(VISUAL + 28px);
}
```

Excepciones:
- **Primera sección** (sin sección anterior): `margin-top: 0`, `padding-top: VISUAL`, clip-path con top recto.
- **Última sección** (sin siguiente): `padding-bottom: VISUAL`, clip-path con bottom recto. Si hay 2 closing consecutivos, la línea entre ellos es recta (sin tabs).

### Secciones closing

Los bloques con `theme: 'closing'` mantienen su tratamiento especial:
- Sin interlocking entre dos closing consecutivos (borde recto, separados por `border-top: 1px solid #1f1f1f`).
- Sí pueden recibir interlocking del bloque anterior no-closing (su top tiene cut + upTab normal).

---

## 5. Vocabulario HTML para el agente

5 clases nuevas que el agente puede componer dentro del HTML que inyecta. Todas funcionan en tema oscuro y claro vía los tokens CSS.

### 5.1 `.grad` — gradient text

```html
<h2>Hay un <span class="grad">antes y un después</span> de la IA.</h2>
```

Aplica un gradiente naranja→naranja-suave al texto que envuelve. Equivalente al `accent` actual pero con más vida. **Uso:** 1 frase clave por sección, dentro de un heading. No abusar.

```css
.block-content .grad {
  background: linear-gradient(120deg, var(--prose-accent-soft) 0%, var(--prose-accent) 70%);
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
}
```

### 5.2 `.pill` — mono badge

```html
<span class="pill">v2026.05</span>
<span class="pill live">● Live</span>
```

Píldora pequeña con tipografía mono. Modificador `.live` añade un dot naranja con glow al inicio. **Uso:** metadata pequeña, etiquetas de versión, estados.

```css
.block-content .pill {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--prose-muted);
  padding: 5px 9px;
  border: 1px solid var(--prose-line);
  border-radius: 4px;
}

.block-content .pill.live { color: var(--prose-accent); }
.block-content .pill.live::before {
  content: '';
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--prose-accent);
  box-shadow: 0 0 8px var(--prose-accent);
}
```

### 5.3 `.chip` — glass CTA

```html
<a class="chip" href="#contact">Hablar con AZENT <span class="arrow">→</span></a>
```

Píldora glass para acciones primarias. Backdrop blur + borde sutil + inset highlight. **Uso:** un CTA por sección como máximo.

```css
.block-content .chip {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 11px 17px 11px 15px;
  border-radius: 999px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: transform .2s ease;
}

.block-content .chip:hover { transform: translateY(-1px); }
.block-content .chip .arrow { font-family: var(--font-mono); color: var(--prose-accent); }

/* dark theme */
.block-section[data-theme="dark-1"] .block-content .chip,
.block-section[data-theme="dark-2"] .block-content .chip,
.block-section[data-theme="closing"] .block-content .chip {
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  color: var(--prose-heading);
}

/* light theme */
.block-section[data-theme="light-1"] .block-content .chip,
.block-section[data-theme="light-2"] .block-content .chip {
  background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35));
  border: 1px solid rgba(0,0,0,0.08);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(0,0,0,0.04);
  color: var(--prose-heading);
}
```

`.panel` usa los mismos selectores de tema con valores ligeramente distintos (padding 20-28px, border-radius 10px en lugar de 999px).

### 5.4 `.panel` — glass container

```html
<div class="panel">
  <h3>Onboarding automatizado</h3>
  <p>Sin emails manuales, sin formularios.</p>
</div>
```

Caja glass más grande. Mismo tratamiento que `.chip` pero como contenedor de bloque (padding 20–28px, border-radius 10px). **Uso:** destacar bloques de contenido secundario, ejemplos, breakouts.

### 5.5 `.glow-dot` — inline glowing anchor

```html
<h2><span class="glow-dot"></span> Partner técnico</h2>
```

Dot naranja inline con glow + animación pulse. **Uso:** anclar visualmente una frase importante. Una vez por sección máximo.

```css
.block-content .glow-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--prose-accent);
  box-shadow: 0 0 12px var(--prose-accent);
  vertical-align: 1px;
  margin-right: 8px;
  animation: glow-dot-pulse 2.4s ease-in-out infinite;
}

@keyframes glow-dot-pulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
}
```

### Clases ya existentes que se mantienen

`<.accent>`, `<.block-topic>`, `<small>`, `<.block-cards>`, `<.block-card>`, `<.block-stat>`, `[data-flash]`, `<code>`, `<strong>`, `<em>`, `<s>`, `<ul>/<ol>/<li>`, `<h1>/<h2>/<h3>`, `<p>`.

### Tarjetas con glow de esquina

Las `.block-card` existentes ganan un glow naranja sutil en la esquina superior derecha (aplicado automáticamente, no requiere markup del agente):

```css
.block-content .block-card::after {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 90px; height: 90px;
  background: radial-gradient(circle at 100% 0%, rgba(255,107,43,0.10), transparent 70%);
  pointer-events: none;
}
```

---

## 6. Documentación en AGENTS.md

Las clases nuevas se documentan en `.codex-browser-agent/AGENTS.md` para que el agente Codex sepa que existen y cuándo usarlas. Se añade una sección **"Vocabulario semántico"** después de la sección **"Content and Style Rules"** (línea ~205), antes de **"Contact"**.

Nueva sección:

```markdown
### Vocabulario semántico (componentes del sistema)

Además de las utility classes de Tailwind, AZENT tiene un pequeño set de componentes con identidad visual propia. Úsalos en lugar de re-implementarlos con Tailwind cuando encajen — son el "vocabulario" visual del sitio.

| Clase | Para qué | Ejemplo de uso |
|---|---|---|
| `.grad` | Resaltar 2–5 palabras clave en un heading con gradiente naranja | `<h2>Hay un <span class="grad">antes y un después</span> de la IA.</h2>` |
| `.pill` | Mostrar metadata corta en estilo mono (versión, etiqueta, estado) | `<span class="pill">v2026.05</span>` |
| `.pill.live` | Pill con dot naranja animado (estados activos) | `<span class="pill live">En producción</span>` |
| `.chip` | CTA principal de la sección (1 max), estilo glass blur | `<a class="chip" href="#contact">Hablar con AZENT <span class="arrow">→</span></a>` |
| `.panel` | Caja glass para destacar contenido secundario | `<div class="panel"><h3>…</h3><p>…</p></div>` |
| `.glow-dot` | Dot naranja con glow, inline, para anclar una frase clave (1 max por bloque) | `<h2><span class="glow-dot"></span>Partner técnico</h2>` |
| `.accent` | Acento naranja simple en texto (mantener para palabras cortas, prefiere `.grad` para frases) | `<span class="accent">por encima</span>` |

**Reglas de composición:**

- Una sección no debería tener más de **1 `.chip`**, **1 `.glow-dot`**, **1 `.grad`** simultáneos. Si necesitas varios resaltes, usa `<strong>` para el resto.
- `.pill` es flexible — se pueden agrupar 2–3 en una fila como header de sección.
- `.panel` no se anida dentro de `.block-cards` (los cards tienen ya su propio fondo).
- Los componentes ya estilizan colores por tema — no añadas Tailwind text-orange-XXX encima.

**Cuándo usar Tailwind vs vocabulario semántico:**

Usa **vocabulario semántico** cuando el componente exista y encaje (CTA → `.chip`, no `<button class="bg-orange-500 ...">`).
Usa **Tailwind** para layout (`grid`, `flex`, `gap-*`, `mt-*`) y para variaciones tipográficas puntuales que no entran en los componentes anteriores.
```

Esta sección se inserta como punto **9** en el AGENTS.md, manteniendo el orden actual.

---

## 7. Mobile / responsive

El sistema funciona desde 320px sin ajustes adicionales — los tabs son porcentuales, el aurora y el grid escalan con `inset: 0`. Tres notas:

- **Tabs en móvil:** en 375px, un tab de 28% de ancho = ~105px. La profundidad 28px se mantiene fija para no romper la proporción visual. Es legible.
- **Aurora glow:** los gradientes radiales son `ellipse 60% × 50%`, escalan con el tamaño de la sección. En móvil llenan más relativo, pero al ser muy sutiles (opacity 0.18–0.22) no agreden.
- **Glass chip:** `backdrop-filter` soportado en iOS Safari 14+ y Android Chrome 76+. En navegadores antiguos cae a fondo semitransparente sin blur — funcional pero menos vivo. Aceptable.

---

## 8. Animaciones — alcance acotado

Solo dos cosas animadas:
1. **`.glow-dot`** — pulse de opacidad cada 2.4s. Sutil.
2. **`.pill.live::before`** — el mismo pulse de opacidad cada 2.4s.

El hairline-gradiente del borde superior, el aurora glow, y el dot-grid son **estáticos**. Probamos animarlos en mockups — cansa visualmente y compite con el contenido. Si en iteración futura queremos un sweep ocasional en la hairline, lo añadimos como variante opt-in.

`prefers-reduced-motion: reduce` desactiva el pulse de `.glow-dot` y `.pill.live::before` (vía media query existente del proyecto).

---

## 9. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/styles.css` | Nuevos tokens de color, nuevas clases (`.aurora`, `.grad`, `.pill`, `.chip`, `.panel`, `.glow-dot`), reestructurar `.block-section` para interlocking bidireccional, actualizar contrastes |
| `src/components/sections/Block.tsx` | Render de `.aurora` y `.grid` dentro del `<section>`. Compute clip-path bidireccional a partir de `interlockVariant` propia + `prevVariant` + `nextVariant`. Eliminar lookup de `CLIP_BOTTOM`. |
| `src/components/sections/SectionContext.tsx` | Tipos: añadir `interlockVariant` y `glow` opcionales al `SectionConfig`. Auto-asignar por `index % 4`. Eliminar `TabVariant` actual o marcar como legacy si se necesita compat. |
| `src/routes/index.tsx` | Pasar `prevVariant` y `nextVariant` a cada `<Block />` (en lugar del `prevTab` actual) |
| `package.json` | Añadir `@fontsource-variable/jetbrains-mono` |
| `.codex-browser-agent/AGENTS.md` | Nueva sección "Vocabulario semántico" con tabla de componentes + reglas de composición |
| `src/components/sections/Block.test.tsx` | Tests del clip-path bidireccional, del cycle de variants, y de la composición no-solapante |

---

## 10. Fuera de scope

- **SVG mask trace** del corte con glow naranja siguiendo todo el interlocking. Probamos esta variante (opción 2 del paso 4 del brainstorming) — interesante pero compleja de implementar bien sobre `clip-path`. Si se quiere más adelante, se añade como overlay SVG separado.
- **Sweep animado** en el hairline del borde superior. Decidido estático en el brainstorming.
- **Variantes de glow por sección** controlables por config. Se auto-asignan por índice; no hay UI para forzar una posición concreta. Iteración futura si hace falta.
- **Migración del contenido actual** a usar el nuevo vocabulario (`.grad`, `.chip`, etc.). El spec describe el sistema; aplicar el vocabulario a los textos de `INITIAL_SECTIONS` en `index.tsx` es una decisión de copy posterior.
- **Imágenes / media** dentro de los bloques. Sigue sin soporte (consistente con el spec del sistema de bloques original).
