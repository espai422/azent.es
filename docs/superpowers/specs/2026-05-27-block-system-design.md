# Sistema de Bloques — Diseño

**Fecha:** 2026-05-27
**Secciones afectadas:** Landing page completa (`src/routes/index.tsx`, `src/components/landing/`)

---

## Resumen

Rediseño visual y arquitectónico de la landing page. Las secciones dejan de ser rectángulos apilados y pasan a ser bloques con forma poligonal que encajan entre sí mediante un sistema de lengüetas. Los bloques son dinámicos: un React Context expone `addSection()` para que la IA pueda insertar bloques en tiempo real.

---

## 1. Sistema visual de formas

### Lengüeta desplazada

Cada sección tiene una lengüeta rectangular que protruye 12px hacia abajo en su borde inferior. La posición de la lengüeta cicla en 3 variantes:

| Paso | Posición | x-range (% del ancho) |
|------|----------|----------------------|
| 0    | center   | 36% – 64%            |
| 1    | right    | 57% – 85%            |
| 2    | left     | 15% – 43%            |

- **Profundidad:** 12px
- **Ancho:** ~28% del ancho de la sección
- El ciclo se calcula automáticamente por índice: `tabVariant = index % 3`
- La sección siguiente recibe la lengüeta de la anterior con la forma complementaria en su borde superior

### Implementación CSS

```
clip-path tab-center:
  polygon(0 0, 100% 0, 100% calc(100% - 12px),
          64% calc(100% - 12px), 64% 100%,
          36% 100%, 36% calc(100% - 12px), 0 calc(100% - 12px))

clip-path tab-right:
  polygon(0 0, 100% 0, 100% calc(100% - 12px),
          85% calc(100% - 12px), 85% 100%,
          57% 100%, 57% calc(100% - 12px), 0 calc(100% - 12px))

clip-path tab-left:
  polygon(0 0, 100% 0, 100% calc(100% - 12px),
          43% calc(100% - 12px), 43% 100%,
          15% 100%, 15% calc(100% - 12px), 0 calc(100% - 12px))
```

El borde superior de cada sección recibe la lengüeta de la anterior: aplica la misma forma en su top `clip-path`. Las secciones se superponen `margin-top: -12px` con `padding-top: 12px` compensatorio.

### Secciones de cierre (fusión oscura)

Los bloques con `theme: 'closing'` (#111111) no tienen lengüeta — `tab` se fuerza a `'none'` independientemente de su posición en el array. La separación entre dos bloques `closing` consecutivos es una línea de 1px de `#181818`. El último bloque `closing` tiene borde inferior recto.

En el config inicial, los últimos 2 bloques son `closing`. Con bloques programáticos, cualquier bloque puede ser `closing` si se pasa explícitamente — no se auto-asigna por posición.

---

## 2. Sistema de color

Cuatro tokens de contenido + un token de cierre + un token de acento:

| Token     | Hex       | Rol                        |
|-----------|-----------|----------------------------|
| `dark-1`  | `#0c0c0c` | Negro base                 |
| `dark-2`  | `#1a1a1a` | Negro suave                |
| `light-1` | `#f8f8f8` | Blanco base                |
| `light-2` | `#f0f0f0` | Blanco suave               |
| `closing` | `#111111` | Bloques de cierre (últimos 2) |
| `accent`  | `#ff6b2b` | Acento naranja (opcional)  |

El ciclo de color por índice: `['dark-1', 'light-2', 'dark-2', 'light-1'][index % 4]`

Los ciclos de color (4-step) y de tab (3-step) corren independientes, creando un patrón que no se repite hasta el bloque 12.

### Texto por tema

- Sobre dark-1 / dark-2 / closing: texto `#e8e8e8`, secundario `#444444`
- Sobre light-1 / light-2: texto `#111111`, secundario `#888888`

### Color de acento

El naranja `#ff6b2b` aparece únicamente en dos usos, ambos opcionales por bloque:
1. **Línea decorativa:** regla de `2px × 28px` antes del heading
2. **Palabras clave:** fragmentos del heading marcados en naranja

El naranja **no se usa** en los bordes entre secciones. Los bordes son simplemente el color de una sección contra el de la siguiente, sin overlay ni highlight.

---

## 3. Modelo de contenido y Block Prose

### Cómo llega el contenido

El LLM inyecta HTML directamente en el bloque. `SectionConfig.content` es un string de HTML que se renderiza con `dangerouslySetInnerHTML`. El componente no interpreta el HTML — solo lo contiene y lo estiliza.

```ts
// El LLM genera algo como:
const content = `
  <h2>Hay un <span class="accent">antes y un después</span> de la IA.</h2>
  <p>El mercado vende atajos. Los atajos no transforman nada.</p>
  <p><strong>Nosotros operamos al revés.</strong> Entendemos bien qué puede hacer la IA hoy.</p>
`
addSection({ content, rule: true })
```

### Block Prose stylesheet (`.block-content`)

Una clase CSS `.block-content` estiliza todos los tags que el LLM pueda generar. Los colores se adaptan al tema del bloque mediante el atributo `data-theme` en el contenedor de sección.

```css
/* Variables por tema — aplicadas en el <section data-theme="dark-1|dark-2|light-1|light-2|closing"> */
[data-theme="dark-1"],
[data-theme="dark-2"],
[data-theme="closing"] {
  --prose-heading: #e8e8e8;
  --prose-body: #aaaaaa;
  --prose-muted: #444444;
  --prose-accent: #ff6b2b;
  --prose-strong: #e8e8e8;
  --prose-strike-opacity: 0.25;
  --prose-code-bg: #1e1e1e;
  --prose-code-color: #888888;
}

[data-theme="light-1"],
[data-theme="light-2"] {
  --prose-heading: #111111;
  --prose-body: #555555;
  --prose-muted: #999999;
  --prose-accent: #e55a1a;   /* naranja ligeramente más oscuro sobre blanco */
  --prose-strong: #111111;
  --prose-strike-opacity: 0.3;
  --prose-code-bg: #eeeeee;
  --prose-code-color: #555555;
}

.block-content h1 {
  font-size: clamp(2rem, 5vw, 3.75rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--prose-heading);
  margin-bottom: 1.5rem;
}
.block-content h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.2;
  color: var(--prose-heading);
  margin-bottom: 1rem;
}
.block-content h3 {
  font-size: clamp(1.1rem, 2vw, 1.35rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: var(--prose-heading);
  margin-bottom: 0.75rem;
}
.block-content p {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--prose-body);
  margin-bottom: 1rem;
}
.block-content p:last-child { margin-bottom: 0; }
.block-content strong { font-weight: 600; color: var(--prose-strong); }
.block-content em { font-style: italic; }
.block-content s, .block-content del {
  text-decoration: line-through;
  opacity: var(--prose-strike-opacity);
}
.block-content .accent, .block-content [data-accent] {
  color: var(--prose-accent);
}
.block-content code {
  font-family: ui-monospace, monospace;
  font-size: 0.875em;
  background: var(--prose-code-bg);
  color: var(--prose-code-color);
  padding: 0.1em 0.35em;
  border-radius: 3px;
}
.block-content ul, .block-content ol {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
  color: var(--prose-body);
}
.block-content li { margin-bottom: 0.35rem; line-height: 1.6; }
.block-content ul { list-style-type: disc; }
.block-content ol { list-style-type: decimal; }
```

### Contenedor flexible

El bloque crece con el contenido. El `clip-path` usa `calc(100% - 12px)` para la tab, que es relativo a la altura real del elemento — funciona con cualquier altura de contenido sin bugs. El padding inferior del bloque garantiza que el contenido no quede cortado por la tab:

```css
.block-section {
  padding-bottom: calc(1.5rem + 12px);  /* espacio de contenido + profundidad de tab */
}
/* Para secciones closing: sin tab, padding normal */
.block-section[data-tab="none"] {
  padding-bottom: 1.5rem;
}
```

---

## 4. Arquitectura — Context API

### `SectionProvider` + `useSections`

```ts
// src/components/sections/SectionContext.tsx

type SectionTheme = 'dark-1' | 'light-2' | 'dark-2' | 'light-1' | 'closing'
type TabVariant = 'center' | 'right' | 'left' | 'none'

interface SectionConfig {
  id: string
  theme?: SectionTheme   // auto-asignado si se omite
  tab?: TabVariant       // auto-asignado si se omite; 'none' forzado si theme === 'closing'
  rule?: boolean         // línea naranja decorativa antes del contenido (default: false)
  content: string        // HTML que renderiza el LLM — se usa con dangerouslySetInnerHTML
}

type SectionsAction =
  | { type: 'ADD'; payload: SectionConfig }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' }
  | { type: 'RESET'; payload: SectionConfig[] }

interface SectionsContextValue {
  sections: SectionConfig[]
  addSection: (config: Omit<SectionConfig, 'id'>) => void
  removeSection: (id: string) => void
  clearSections: () => void
  resetSections: (configs: Omit<SectionConfig, 'id'>[]) => void
}
```

- `addSection()` genera un `id` automático con `crypto.randomUUID()`
- `theme` se auto-asigna si se omite: `['dark-1', 'light-2', 'dark-2', 'light-1'][nonClosingCount % 4]` donde `nonClosingCount` es el número de bloques no-`closing` ya existentes
- `tab` se auto-asigna si se omite: `['center', 'right', 'left'][nonClosingCount % 3]`; si `theme === 'closing'`, `tab` se fuerza a `'none'`
- El Provider vive en `src/routes/__root.tsx` para que server functions y cualquier ruta puedan acceder al mismo estado
- El consumer principal es `<Landing />` en `src/routes/index.tsx`, que itera `sections` y renderiza `<Block />` por cada uno

### `<Block />` — componente de renderizado

```tsx
// src/components/sections/Block.tsx

interface BlockProps {
  config: SectionConfig  // ya resuelta: theme y tab siempre presentes
  index: number
  prevTab: TabVariant    // tab del bloque anterior, para construir el top clip-path complementario
}
```

- Recibe la config resuelta (con `theme` y `tab` ya asignados por el context o explícitos)
- `prevTab` determina la forma del borde superior (complementario al bottom del bloque anterior)
- Aplica `clip-path` correcto según `tab` (bottom) y `prevTab` (top)
- Aplica colores de texto según `theme`
- Renderiza `rule`, heading con `accentWords`, body, y `children`
- Cuando `theme === 'closing'`: `margin-top: -12px` no aplica (borde superior recto recibiendo el tab del bloque anterior)

---

## 5. Secciones actuales — mapeado inicial

El contenido de cada sección existente se migra a HTML estático dentro de `content`. Los componentes individuales en `src/components/landing/` se eliminan — su markup pasa a ser el string `content` de cada config.

| Sección          | Índice | Theme   | Tab    | rule  |
|------------------|--------|---------|--------|-------|
| Hero             | 0      | dark-1  | center | false |
| Context          | 1      | light-2 | right  | true  |
| Partner          | 2      | dark-2  | left   | false |
| SystemChallenge  | 3      | light-1 | center | false |
| HowWeWork        | 4      | dark-1  | right  | true  |
| Philosophy       | 5      | light-2 | left   | false |
| Examples         | 6      | closing | none   | false |
| Closing          | 7      | closing | none   | false |

Ejemplo de config para "Context":
```ts
{
  theme: 'light-2',
  rule: true,
  content: `
    <h2>Hay un <span class="accent">antes y un después</span> de la IA. Pocas empresas han cruzado esa línea.</h2>
    <p>No porque la tecnología no esté disponible. Sino porque aplicarla bien requiere
    entender a fondo el negocio, los procesos y los límites reales de la IA — y eso
    no viene en ningún SaaS genérico. El mercado vende atajos. Los atajos no
    transforman nada.</p>
  `
}
```

---

## 6. Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/sections/SectionContext.tsx` | Nuevo — Provider + hook + tipos |
| `src/components/sections/Block.tsx` | Nuevo — componente de bloque renderizado |
| `src/components/sections/index.ts` | Nuevo — re-exports |
| `src/styles.css` | Añadir variables CSS para tokens de color y clip-paths |
| `src/routes/index.tsx` | Reemplazar secciones individuales — `Landing` itera `sections` del context y renderiza `<Block />` por cada uno |
| `src/components/landing/*.tsx` | Cada componente se migra a `SectionConfig` o se elimina |
| `src/routes/__root.tsx` | Envolver en `SectionProvider` si el scope lo requiere |

---

## 7. Fuera de scope

- Integración con IA para generar bloques (el context queda listo, la IA se conecta en iteración futura)
- Animaciones de entrada al añadir bloques
- Persistencia de bloques generados
- Panel de administración de bloques
