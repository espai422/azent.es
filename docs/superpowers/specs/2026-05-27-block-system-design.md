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

## 3. Tipografía de bloque

Estilos disponibles dentro de un bloque (tokens Tailwind v4):

| Elemento      | Tailwind classes                                        | Notas                              |
|---------------|---------------------------------------------------------|------------------------------------|
| H1            | `text-4xl md:text-6xl font-semibold tracking-tight`     | Solo en Hero                       |
| H2            | `text-2xl md:text-3xl font-semibold tracking-tight`     | Heading principal de bloque        |
| H3            | `text-lg md:text-xl font-medium tracking-tight`         | Subheading o bloque secundario     |
| Body          | `text-base leading-relaxed`                             | Párrafo principal                  |
| Body small    | `text-sm leading-relaxed`                               | Secundario, closing                |
| Bold inline   | `font-semibold`                                         | Énfasis dentro de párrafo          |
| Strikethrough | `line-through opacity-40`                               | Para contraste editorial           |
| Accent span   | `text-[#ff6b2b]`                                        | Palabras clave en heading (opt.)   |

---

## 4. Arquitectura — Context API

### `SectionProvider` + `useSections`

```ts
// src/components/sections/SectionContext.tsx

type SectionTheme = 'dark-1' | 'light-2' | 'dark-2' | 'light-1' | 'closing'
type TabVariant = 'center' | 'right' | 'left' | 'none'

interface SectionConfig {
  id: string
  // Si se omite, se auto-asigna por posición en el array
  theme?: SectionTheme
  tab?: TabVariant
  // Contenido
  heading?: string
  headingLevel?: 'h1' | 'h2' | 'h3'
  accentWords?: string[]        // palabras del heading que van en naranja
  rule?: boolean                // línea naranja antes del heading
  body?: string
  children?: ReactNode
}

interface SectionsState {
  sections: SectionConfig[]
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

| Sección          | Índice | Theme   | Tab    | Acento       |
|------------------|--------|---------|--------|--------------|
| Hero             | 0      | dark-1  | center | —            |
| Context          | 1      | light-2 | right  | rule         |
| Partner          | 2      | dark-2  | left   | —            |
| SystemChallenge  | 3      | light-1 | center | accentWords  |
| HowWeWork        | 4      | dark-1  | right  | rule         |
| Philosophy       | 5      | light-2 | left   | accentWords  |
| Examples         | 6      | closing | none   | —            |
| Closing          | 7      | closing | none   | —            |

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
