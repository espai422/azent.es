# Diagram Blocks — Diseño

**Fecha:** 2026-05-29
**Estado:** Aprobado para implementación
**Inspirado en:** `../poc-agentic-diagrams` (POC)

## Resumen ejecutivo

Habilitar que cualquier bloque de la landing pueda incluir, opcionalmente,
un diagrama (ReactFlow) y una fórmula con variables editables en vivo por
el visitante. El agente Codex existente recibe nuevas herramientas MCP para
crear y editar esos diagramas mediante el `BrowserToolBridge` que ya está
en marcha.

Decisión de diseño raíz: **no introducimos un "tipo de bloque" nuevo**.
Todos los bloques siguen siendo `SectionConfig`. Los campos de diagrama
son opcionales — su ausencia equivale a un bloque normal de hoy.

## Objetivos

- Mostrar arquitecturas, flujos y ejemplos de servicios de Azent como
  diagramas visuales, con narrativa al lado.
- Cuando aplica, cuantificar el valor con una fórmula interactiva
  (ahorro, throughput, escalabilidad, conversión, etc.). **No siempre es
  ahorro de costes** — también es invertir más para ganar más o habilitar
  AI features antes imposibles.
- Mantener la estética minimalista de azent-es (Inter, dark/light alternado,
  accent naranja, sin emojis).
- Que el agente pueda crear bloques con diagrama, añadir diagrama a bloques
  existentes, editarlos iterativamente, y volverlos solo-texto si decide
  simplificar.
- Layout responsive: el agente piensa en "antes/después del texto"; el
  sistema traduce a izquierda/derecha en desktop y arriba/abajo en mobile.

## Fuera de scope (v1)

- Animación de diff (flash naranja) sobre nodos/edges añadidos por el
  agente. El bloque ya tiene flash de borde al actualizarse, suficiente
  para empezar.
- Persistencia de cambios del visitante sobre las variables: los cambios
  son simulación local y se pierden cuando el agente actualiza el bloque.
- Conectar edges desde el cliente. El visitante puede arrastrar nodos y
  hacer pan/zoom, pero no crear conexiones.
- Múltiples diagramas dentro del mismo bloque.

## Modelo de datos

Extendemos `SectionConfig` y `SectionInput` con cuatro campos opcionales.
Cero ruptura con bloques existentes.

```ts
type DiagramNodeDef = {
  id: string
  label: string
  x: number
  y: number
}

type DiagramEdgeDef = {
  id?: string
  source: string
  target: string
  label?: string
  highlight?: boolean
}

type DiagramJSON = {
  nodes: DiagramNodeDef[]
  edges: DiagramEdgeDef[]
}

interface SectionConfig {
  // existentes (sin cambios)
  id: string
  theme: SectionTheme
  tab: TabVariant
  rule?: boolean
  content: string
  topic?: string
  className?: string
  pinned?: boolean

  // nuevos — todos opcionales
  diagram?: DiagramJSON
  diagramPosition?: 'before' | 'after'    // default 'after'
  formula?: string                         // sintaxis fparser
  variables?: Record<string, number>      // baseline del agente
}
```

`SectionInput` espeja los mismos campos opcionales. El reducer actual
(`UPDATE`) ya hace merge correcto sin tocar campos no incluidos.

## Layout del componente `<Block>`

**Sin diagrama**: renderiza igual que hoy (HTML edge-to-edge, max-w-2xl).
Una `formula` sin `diagram` se considera inconsistente — el agente debe
tratar la fórmula como acoplada conceptualmente al diagrama. La validación
de tools refleja esto: `set_block_formula` exige que el bloque ya tenga
`diagram` o que se cree antes (no es bloqueante en el modelo de datos —
los tipos lo permiten — sino una guideline reforzada por la validación).

**Con diagrama**: grid responsivo.

```
desktop (≥768px), dos columnas iguales:
  diagramPosition='before'  →  [DIAGRAMA] │ [HTML + variables + cálculo]
  diagramPosition='after'   →  [HTML + variables + cálculo] │ [DIAGRAMA]

mobile (<768px), una columna apilada:
  before  →  diagrama → html → variables → cálculo
  after   →  html → variables → cálculo → diagrama
```

Implementación: `grid grid-cols-1 md:grid-cols-2 gap-8` con CSS `order`
para invertir según `diagramPosition`. El lado del diagrama tiene altura
mínima (`min-h-[280px] md:min-h-[420px]`) para que ReactFlow tenga espacio.

Themes y tabs geométricos (`clipPath`) siguen aplicándose al bloque entero
exactamente igual que hoy. Los nodos del diagrama heredan colores del
theme vía variables CSS.

## `<DiagramCanvas>` — el lado del diagrama

Wrapper sobre `@xyflow/react` (ReactFlow) configurado como "presentación
interactiva":

- `nodesDraggable: true`
- `nodesConnectable: false`
- `edgesFocusable: false`
- `deleteKeyCode: null`
- `fitView` con `padding: 0.2`
- Controls de ReactFlow ocultos por defecto

Pan + zoom + drag de nodos disponibles para el visitante, sin riesgo de
romper la estructura.

**`<ClientOnly>` wrapper** porque ReactFlow no es SSR-friendly. Se acepta
el pop-in mínimo tras hidratación (mismo trade-off que el POC).

### Nodo custom `AzentNode`

- Rectángulo con `border: 1px solid var(--prose-muted)`
- `border-radius: 8px`, padding `12px 18px`, `min-width: 110px`
- Label en Inter `font-medium` color `var(--prose-heading)`
- **Sin emojis, sin iconos**
- Handles top/bottom muy sutiles (1×1px, color `--prose-muted`)
- Hover/selected: borde pasa a `--prose-accent`

### Edge custom `AzentEdge`

- Bezier path con `stroke: var(--prose-muted)`, `stroke-width: 1.25`
- Si `highlight: true` → `stroke: var(--prose-accent)`, opacity 1
- Animación de partícula viajera con `<animateMotion>` (igual que el POC,
  pero más sutil: radio 3px + 1px blanco interior)
- Label opcional centrado en el path, color `--prose-muted`

### Adaptación al theme

Como los colores se leen de variables CSS (`--prose-heading`, `--prose-muted`,
`--prose-accent`) que ya cambian por `data-theme` del `<section>` padre,
el diagrama se adapta automáticamente sin JS extra.

### Dimensiones

- Width: 100% del grid cell
- Height: `min-h-[280px] md:min-h-[420px]`
- Background ReactFlow: dots `--prose-muted` opacity 0.2, gap 24px

## `<DiagramVariables>` y `<DiagramCalculo>`

Análogos al POC pero con la estética azent.

### `<DiagramVariables>`

Lista `<ul>` minimalista. Por fila:
- Nombre en `font-mono text-sm` color `--prose-body`
- `<input type="number">` ancho 16-20 chars, borde fino `--prose-muted`,
  fondo transparente, focus ring `--prose-accent`

Sin sección "DEBUG" del POC. Solo aparece si hay `formula` definida en el bloque.

### `<DiagramCalculo>`

- Fórmula como texto monoespaciado (`{formula}`) en color `--prose-muted`
- Resultado en bloque grande: `text-2xl font-semibold tabular-nums` color
  `--prose-heading`
- Si la fórmula no parsea o falta una variable, resultado es `—`

### Separación visual

Cuando aparecen, van bajo el HTML content separadas por un `<hr>` fino
`border-t border-[var(--prose-grid-gap)]` con margen vertical.

### Estado y reset

```ts
const [localVars, setLocalVars] = useState(config.variables ?? {})
useEffect(() => { setLocalVars(config.variables ?? {}) }, [config.variables])

const result = useMemo(
  () => (config.formula ? evaluate(config.formula, localVars) : null),
  [config.formula, localVars],
)
```

Cambios del visitante son locales y se pierden si el agente actualiza la
baseline (`config.variables` cambia → reset). Decisión explícita: simple y
predecible.

`parseVariables(formula)` y `evaluate(formula, vars)` viven en
`formulaUtils.ts` (extraídas del POC).

## Herramientas MCP

Extendemos `src/server/browserMcp.ts` (registro Zod) y
`src/components/BrowserToolBridge.tsx` (implementación cliente).

### Extendida

`add_agent_block(sessionId, topic, diagram?, diagramPosition?, formula?, variables?)`
- Permite crear un bloque con diagrama y/o fórmula en un solo paso.
- Backward-compatible: sin los nuevos params, comportamiento idéntico al actual.

### Nuevas

`set_block_diagram(sessionId, id, diagram, diagramPosition?)`
- Añade o reemplaza el diagrama de un bloque. No toca formula/variables.
- Si el bloque no tenía `diagramPosition`, default a `'after'`.

`set_block_formula(sessionId, id, formula, variables)`
- Añade o reemplaza fórmula + variables. `variables` debe contener todos
  los nombres usados en la fórmula con valores numéricos.
- Rechaza si el bloque no tiene `diagram`: la fórmula solo tiene sentido
  acompañando un diagrama. El agente debe crear/añadir el diagrama primero.

`clear_block_diagram(sessionId, id)`
- Quita `diagram`, `diagramPosition`, `formula` y `variables`. El bloque
  vuelve a ser solo-texto.

`clear_block_formula(sessionId, id)`
- Quita solo `formula` y `variables`. Deja el diagrama intacto.

### Sin cambios

`get_page_snapshot` — ahora también reporta los nuevos campos cuando existen.
`set_block_html`, `append_to_block`, `focus_section`, `set_document_title`,
`remove_block` — exactamente igual.

### Validación

Cada herramienta valida estructura con Zod:
- Nodos: id no vacío, label no vacío, x/y numéricos finitos
- Edges: source y target deben referenciar nodos existentes en el mismo diagram
- `formula` no vacío cuando se pasa; `variables` debe ser objeto con valores numéricos

### Feedback visual

Flash naranja del borde del bloque al recibir `set_block_diagram` y
`set_block_formula` (mismo patrón que `set_block_html` actual).

## Prompt del agente

Extender el system message en `src/routes/api/chat/stream.ts` con:

```
DIAGRAMAS Y BLOQUES CON CÁLCULO

Cualquier bloque puede tener opcionalmente un diagrama (ReactFlow),
una fórmula y variables editables en vivo por el visitante.

CUÁNDO USAR DIAGRAMA
- Cuando describes un sistema/flujo con piezas que se relacionan:
  agentes que se hablan, integraciones, arquitecturas, pipelines,
  ejemplos de cómo y cuándo intervienen las piezas.
- Cuando el visitante pide explícitamente "muéstrame un ejemplo" o
  "cómo funciona".
- Bloques puramente narrativos NO llevan diagrama.

CUÁNDO AÑADIR FÓRMULA + VARIABLES
- SOLO si hay un número clave que cuantifica el valor de la solución.
- No todo es ahorro de costes: también vale escalabilidad (capacidad
  nueva imposible antes), aumento de conversión, throughput, latencia, etc.
- Para explicar una AI feature pura (chat, generación, etc.) o un
  concepto que no se cuantifica → diagrama sin fórmula.

ESTRUCTURA DEL DIAGRAMA
- DiagramJSON: { nodes: [{id, label, x, y}], edges: [{source, target, label?, highlight?}] }
- Posiciones en un canvas ~600×420. Distribuye nodos con formas
  equilibradas (ni muy verticales ni muy horizontales) que rendericen
  bien tanto en split desktop (mitad de ancho) como en mobile full-width.
- Usa edges con highlight:true para subrayar la ruta crítica del flujo.
- Labels en el idioma del usuario, sin emojis.

POSICIÓN
- diagramPosition: 'before' (diagrama antes del texto) o 'after' (después).
- Alterna entre bloques para que la página respire.

FÓRMULA
- Sintaxis fparser: + - * / ^, variables alfanuméricas (no empezar por
  dígito).
- Ejemplo: "horas_ahorradas * empleados * coste_hora_eur"
- variables debe contener TODOS los nombres usados en la fórmula con
  valores baseline numéricos sensatos.
```

## Archivos

### Nuevos (`src/components/sections/diagram/`)

- `types.ts` — `DiagramJSON`, `DiagramNodeDef`, `DiagramEdgeDef`
- `DiagramCanvas.tsx` — ReactFlow + nodo y edge custom
- `DiagramVariables.tsx`
- `DiagramCalculo.tsx`
- `formulaUtils.ts` — `parseVariables`, `evaluate` (envuelven fparser)

### Editados

- `src/components/sections/SectionContext.tsx` — campos opcionales en
  `SectionConfig` y `SectionInput`; re-exportar tipos diagrama
- `src/components/sections/Block.tsx` — render condicional split layout
- `src/components/sections/index.ts` — exportar tipos diagrama
- `src/components/BrowserToolBridge.tsx` — implementaciones cliente de las
  tools nuevas/extendidas
- `src/server/browserMcp.ts` — registrar tools MCP nuevas con Zod;
  extender `add_agent_block` y `get_page_snapshot`
- `src/routes/api/chat/stream.ts` — extender prompt del agente
- `src/styles.css` — estilos del split layout, separador
  variables/cálculo, override de styling de ReactFlow para alinear con
  variables `--prose-*`
- `package.json` — añadir `@xyflow/react`, `fparser`

## Tests

- `SectionContext.test.ts`: UPDATE merge no toca campos no incluidos
  (incluyendo los nuevos `diagram`, `formula`, `variables`,
  `diagramPosition`).
- `Block.test.tsx`:
  - renderiza split cuando hay `diagram`
  - orden de columnas correcto según `diagramPosition`
  - NO renderiza variables/cálculo si no hay `formula`
- `formulaUtils.test.ts`: `parseVariables` y `evaluate` (felices + casos
  edge: fórmula vacía, sintaxis inválida, variable faltante).
- `DiagramVariables.test.tsx`: cambio de input dispara `setLocalVars`;
  reset al cambiar `config.variables`.

## Trade-offs asumidos

- **+~150 KB bundle** por ReactFlow (`@xyflow/react`). Necesario para
  drag/pan/zoom según decisión de UX.
- **+~15 KB** por fparser. Aceptable.
- **SSR pop-in** del diagrama por el wrapper `<ClientOnly>`. Equivalente
  al POC.
- **Diagramas mal posicionados** en mobile si el agente coloca nodos muy
  pegados. Mitigación: instrucción en prompt + `fitView` + el visitante
  puede arrastrar nodos.
- **Variables editadas se pierden** al actualizar el agente. Decisión
  explícita; predecible y simple.
- **Animación de diff en diagrama fuera de scope** v1. El bloque ya tiene
  flash de borde al actualizarse.

## Riesgos abiertos

- React Flow puede generar warnings en SSR si el wrapper `<ClientOnly>` no
  está bien aislado. Plan: copiar el patrón exacto del POC.
- Generación inicial: el agente puede tardar varias iteraciones en
  aprender a posicionar nodos compactos. El prompt incluye guidelines pero
  habrá que iterar tras observar respuestas reales.
- `nodesDraggable: true` con `fitView` puede causar que un nodo arrastrado
  fuera del viewport quede "perdido" tras un fit posterior. Se acepta:
  fitView solo se dispara en mount.
