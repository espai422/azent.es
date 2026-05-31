# Streaming autoscroll — design

## Context

Cuando el agente LLM modifica un bloque (típicamente añadiendo texto con `append_to_block`, o reemplazando con `set_block_html`), el sistema actual hace un único focus inicial vía `focusBlockIfNeeded` y luego no vuelve a tocar el scroll. Si el bloque sigue creciendo durante el streaming, el contenido nuevo se queda por debajo del viewport.

Queremos el efecto típico de un chat de IA: mientras el bloque crece, el scroll va siguiendo el bottom para mantenerlo en frame, sin esperar a que se salga. Reactivo, no predictivo: si el bottom llega al 90% del viewport, lo seguimos; si momentáneamente se va a 95–105% por un párrafo de golpe, se corrige en los siguientes frames.

El usuario debe poder salir del autoscroll moviendo el scroll lo suficiente, y debe quedarse fuera mientras siga ese mismo bloque streameando.

## Goals

- Seguir el bottom del bloque activo (último tocado) manteniéndolo a ~90% del viewport.
- Reactivo, no predictivo: medir cada frame, corregir lo que se haya pasado.
- Detectar opt-out: si el scroll real diverge > 150 px del target, el usuario se ha salido.
- Una vez fuera, no re-armar autoscroll para ese bloque mientras siga activo. Sí re-armar si otro bloque pasa a ser activo (o tras periodo idle).
- Reutilizar las primitivas existentes (`prefersReducedMotion`, patrón de rAF de `blockAnimations.ts`).
- Respetar `prefers-reduced-motion`.

Fuera de scope:
- Subir el scroll si el bloque se encoge.
- Botón "scroll to bottom" para volver al autoscroll después de salir.
- Seguir contenido en bloques que no son el último tocado.
- Cambios en el comportamiento existente de `add_agent_block` reveal o `focusBlockIfNeeded` one-shot.

## Architecture

Un módulo singleton `src/utils/streamingAutoscroll.ts` mantiene el estado del autoscroll y corre un rAF loop mientras hay un bloque activo. `BrowserToolBridge.tsx` lo invoca tras cada tool que muta contenido.

`Block.tsx`, `useAnimatedHeight.ts` y el resto de `blockAnimations.ts` quedan intactos. El controlador lee el DOM por `getElementById` + `getBoundingClientRect` igual que hace `focusBlockIfNeeded`.

### `src/utils/streamingAutoscroll.ts`

Exporta:

```ts
// Engancha (o re-engancha) el follow sobre el bloque. Idempotente: llamadas
// repetidas refrescan el timestamp idle y reusan el loop existente.
export function engageStreamingAutoscroll(blockId: string): void

// Para tests / cleanup. Normalmente no se llama desde fuera — el controlador
// se desengancha solo por idle u opt-out.
export function disengageStreamingAutoscroll(): void
```

Estado interno (module-level):

```ts
type State =
  | { kind: 'idle' }
  | { kind: 'engaged'; blockId: string; lastTouchAt: number; lastScrollY: number; rafId: number }
  | { kind: 'optedOut'; blockId: string }

const TARGET_VIEWPORT_RATIO = 0.9
const OPT_OUT_PX = 150
const IDLE_MS = 1500
const FOLLOW_LERP = 0.25
```

Transiciones:

| Desde | Evento | A | Acción |
|---|---|---|---|
| `idle` | `engage(id)` | `engaged{id}` | arrancar rAF, instalar listener de `scroll` |
| `engaged{id}` | `engage(id)` (mismo) | `engaged{id}` | refrescar `lastTouchAt` |
| `engaged{id}` | `engage(otherId)` | `engaged{otherId}` | cambiar `blockId`, refrescar `lastTouchAt` |
| `engaged{id}` | rAF: bottom > 0.9·vh | `engaged{id}` | scroll lerp, guardar `lastScrollY` |
| `engaged{id}` | scroll user (>150 px) | `optedOut{id}` | parar rAF, quitar listener |
| `engaged{id}` | idle (>1500 ms sin engage) | `idle` | parar rAF, quitar listener |
| `optedOut{id}` | `engage(otherId)` | `engaged{otherId}` | re-armar en bloque distinto |
| `optedOut{id}` | `engage(id)` (mismo) | `optedOut{id}` | no-op |
| `optedOut{id}` | idle | `idle` | limpieza; al próximo engage se re-arma |

### El rAF loop

Solo corre mientras `state.kind === 'engaged'`. Cada frame:

```ts
function tick() {
  if (state.kind !== 'engaged') return

  const el = document.getElementById(state.blockId)
  if (!el) { setIdle(); return }

  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  const targetBottomY = vh * TARGET_VIEWPORT_RATIO
  const overflow = rect.bottom - targetBottomY

  if (overflow > 0) {
    const newScrollY = window.scrollY + overflow * FOLLOW_LERP
    state.lastScrollY = newScrollY
    suppressed = true
    window.scrollTo({ top: newScrollY, behavior: 'auto' })
  }

  if (performance.now() - state.lastTouchAt > IDLE_MS) { setIdle(); return }

  state.rafId = requestAnimationFrame(tick)
}
```

Decisiones:

- **Solo baja.** Si el agente quita texto y el bottom queda en 60% vh, no rescatamos: el usuario ya está viendo bien el bloque.
- **Lerp 0.25.** Suaviza el seguimiento — un párrafo de golpe se persigue en ~4 frames en vez de un salto seco. Coopera con la altura interpolada por `useAnimatedHeight` (`getBoundingClientRect` refleja el alto interpolado).
- **`lastScrollY` = el scrollY que comandamos** (post-lerp), no el "target nominal pleno". Así, sin intervención del usuario, `window.scrollY === lastScrollY` y el delta de opt-out es 0 — sólo se acumula cuando el usuario mueve el scroll por su cuenta.
- **Idle por timestamp dentro del tick**, no por `setTimeout`. Cero overhead extra.

### Listener de scroll y detección de opt-out

```ts
let suppressed = false

function onScroll() {
  if (state.kind !== 'engaged') return
  if (suppressed) { suppressed = false; return }
  if (Math.abs(window.scrollY - state.lastScrollY) > OPT_OUT_PX) {
    setOptedOut(state.blockId)
  }
}
```

`suppressed` se pone a `true` justo antes de cada `window.scrollTo` programatico y se consume en el primer `scroll` event que llegue. Si el navegador colapsa varios scrolls en uno, el flag se consume una vez — eventos posteriores son del usuario.

### `BrowserToolBridge.tsx`

Cambio: importar `engageStreamingAutoscroll` y llamarlo tras cada tool mutadora.

```ts
import { engageStreamingAutoscroll } from '#/utils/streamingAutoscroll'
```

Puntos de llamada:

- `append_to_block`: `engage(id)` tras `updateSection`.
- `set_block_html`: `engage(id)` tras `updateSection`.
- `set_block_diagram`: `engage(id)` tras `updateSection`.
- `set_block_formula`: `engage(id)` tras `updateSection`.
- `add_agent_block`: `engage(newId)` tras `revealBlockSymmetric` (no antes — el reveal manipula `scrollY`).

No se llama desde:
- `focus_section`, `remove_block`, `clear_block_diagram`, `clear_block_formula`, `set_document_title`, `get_page_snapshot`.

El orden es **`focusBlockIfNeeded` → `updateSection` → `engageStreamingAutoscroll`**. El one-shot inicial sigue haciendo su trabajo en el primer toque; el engage arma el follow continuo.

## Data flow

```
LLM tool call (ej. append_to_block)
  ↓
BrowserToolBridge.append_to_block
  ↓
focusBlockIfNeeded(id)         ── one-shot scroll si no fully visible
  ↓
updateSection(id, ...)          ── React re-render
  ↓                                ↓
engageStreamingAutoscroll(id)   useAnimatedHeight (existente)
  ↓                                ↓ smooth height transition
state: engaged{id}              getBoundingClientRect().bottom
  ↓                                refleja altura interpolada
rAF tick cada frame:
  ├── measure el.getBoundingClientRect()
  ├── overflow = bottom - 0.9·vh
  ├── if overflow > 0 → scrollTo(scrollY + overflow * 0.25)
  ├── lastScrollY = scrollY + overflow * 0.25 (post-lerp)
  └── if now - lastTouchAt > 1500 ms → setIdle()

scroll event (no programatico):
  ↓
|scrollY - lastScrollY| > 150 px ?
  ├── sí → state: optedOut{id}, parar rAF
  └── no → ignorar
```

## Error handling

- Si `document.getElementById(blockId)` devuelve `null` durante el loop (bloque eliminado mid-stream), `setIdle()` y termina.
- Si `vh === 0` (caso patológico SSR / measurement), el loop no actúa ese frame.
- Si `prefersReducedMotion()`, `engage()` es no-op: nunca arranca el loop.
- Si se llama `engage()` con un `blockId` cuyo elemento no existe todavía en el DOM, igualmente transicionamos a `engaged` — el rAF tick siguiente lo encontrará (o lo limpiará). Esto cubre el caso de `add_agent_block` llamando `engage` justo después del reveal, antes de que un `append_to_block` posterior re-confirme.

## Testing

Vitest + happy-dom (mismo patrón que `blockAnimations.test.ts`):

- `engage(id)` transiciona de `idle` a `engaged`.
- `engage(other)` desde `engaged{id}` cambia el `blockId` y refresca `lastTouchAt`.
- `engage(id)` desde `optedOut{id}` no re-engancha (queda en `optedOut`).
- `engage(other)` desde `optedOut{id}` re-engancha en el nuevo bloque.
- rAF tick: con un bloque cuyo `getBoundingClientRect` devuelve `bottom = 0.95·vh`, el siguiente `window.scrollTo` recibe un target = `scrollY + overflow * 0.25` y `lastScrollY` queda igual a ese target post-lerp.
- rAF tick: si `bottom = 0.5·vh` (no overflow), no llama `scrollTo`.
- Opt-out: simular `scroll` event con `window.scrollY` desviado > 150 px de `lastScrollY` transiciona a `optedOut`.
- Opt-out: simular `scroll` event con `suppressed = true` no transiciona.
- Idle: avanzar `performance.now` mock más de 1500 ms sin `engage()` → siguiente tick va a `idle`.
- Reduced motion: con `matchMedia('(prefers-reduced-motion: reduce)')` matched, `engage(id)` no arranca el loop y queda en `idle`.

Manual:
- Stream largo (varios `append_to_block` en serie): el bottom queda alrededor del 90 % de viewport durante toda la sesión.
- Scroll del usuario hacia arriba durante stream: el autoscroll para y deja al usuario donde quiera.
- Tras opt-out, una nueva tool sobre otro bloque distinto re-arma el follow.
- Reduced motion enabled: el scroll no se mueve durante stream.

## Open questions

Ninguna.
