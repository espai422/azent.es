# Polygonal Flip Sections

**Date:** 2026-05-27

## Resumen

Cada sección de la landing adopta una silueta poligonal angular (estética Cybertruck / sci-fi) y las secciones seleccionadas pueden voltearse con un flip 3D al hacer clic, revelando contenido en la cara trasera. El flip es un arco suave de 0.8s que combina zoom hacia el espectador y rotación en X e Y simultáneos.

---

## Comportamiento

- La landing sigue siendo una página vertical con scroll.
- Cada sección tiene una silueta poligonal propia (clip-path). Las formas son asimétricas y angulares, estilo Cybertruck — ninguna igual a otra, pero todas coherentes como piezas de un mismo chasis.
- Las formas son **independientes**: cada sección tiene su propio clip-path con un pequeño gap entre ellas. No interbloquean.
- Al hacer clic en una sección con flip, esta se voltea. Varias secciones pueden estar volteadas simultáneamente.
- Un segundo clic vuelve la sección a su posición original con la misma animación.

### Secciones con flip
`Context`, `Partner`, `SystemChallenge`, `HowWeWork`, `Philosophy`

### Secciones solo con forma (sin flip)
`Hero`, `Examples`, `Closing`

---

## Animación

Arco único de **0.8s** — zoom y rotación simultáneos, sin fases separadas:

```
0s    → escala 1,   translateZ 0,   rotateX 0°   rotateY 0°
0.4s  → escala 1.22, translateZ 90px, rotateX 90°  rotateY 90°   ← pico
0.8s  → escala 1,   translateZ 0,   rotateX 180° rotateY 180°
```

Easing: `ease-in` en la primera mitad, `ease-out` en la segunda.

La cara trasera se pre-posiciona con `transform: rotateX(180deg) rotateY(180deg)` para aparecer orientada correctamente al finalizar el flip.

---

## Arquitectura de componentes

### Archivos nuevos

```
src/components/flip/
  FlipProvider.tsx       ← contexto React + useReducer
  useFlipControls.ts     ← hook público
  FlipSection.tsx        ← wrapper con flip (secciones con back)
  PolygonSection.tsx     ← wrapper solo con forma (sin flip)

src/components/landing/
  ContextBack.tsx        ← placeholder, contenido TBD
  PartnerBack.tsx        ← placeholder, contenido TBD
  SystemChallengeBack.tsx ← placeholder, contenido TBD
  HowWeWorkBack.tsx      ← placeholder, contenido TBD
  PhilosophyBack.tsx     ← placeholder, contenido TBD
```

### Archivos modificados

- `src/routes/index.tsx` — añade `FlipProvider` y wrappers.

### Archivos sin cambios

Todos los componentes de sección existentes (`Hero.tsx`, `Context.tsx`, etc.) permanecen intactos.

---

## API de componentes

### `<FlipSection>`

```tsx
<FlipSection
  id="howWeWork"
  shape="polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)"
  back={<HowWeWorkBack />}
>
  <HowWeWork />
</FlipSection>
```

| Prop    | Tipo        | Descripción                              |
|---------|-------------|------------------------------------------|
| `id`    | `string`    | Identificador único en el FlipProvider   |
| `shape` | `string`    | Valor CSS `clip-path` del polígono       |
| `back`  | `ReactNode` | Contenido de la cara trasera             |

### `<PolygonSection>`

```tsx
<PolygonSection shape="polygon(0% 0%, 100% 0%, 94% 100%, 6% 100%)">
  <Hero />
</PolygonSection>
```

| Prop    | Tipo     | Descripción                        |
|---------|----------|------------------------------------|
| `shape` | `string` | Valor CSS `clip-path` del polígono |

---

## Estado — FlipProvider

```ts
type FlipState = Record<string, boolean>

type FlipAction =
  | { type: 'TOGGLE'; id: string }
  | { type: 'SET'; id: string; value: boolean }
  | { type: 'RESET_ALL' }
```

### `useFlipControls()`

```ts
const { toggle, set, resetAll, isFlipped } = useFlipControls()

toggle('howWeWork')         // invierte el estado
set('context', true)        // fuerza un valor
resetAll()                  // todos a false
isFlipped('howWeWork')      // boolean
```

Disponible desde cualquier componente dentro del `FlipProvider`.

---

## Estructura DOM (FlipSection)

```
div.polygon-wrapper    ← clip-path, position:relative, sin transform
  div.flip-card        ← transform-style:preserve-3d, cursor:pointer
    div.face.front     ← backface-visibility:hidden
      {children}
    div.face.back      ← backface-visibility:hidden, pre-rotated
      {back}
```

El `clip-path` va en `polygon-wrapper` (sin transform) para no interferir con `transform-style:preserve-3d` del `flip-card` interior.

---

## Formas poligonales

Los valores exactos se ajustan durante la implementación. Orientación de cada sección:

| Sección         | Estilo de corte                                  |
|-----------------|--------------------------------------------------|
| Hero            | Diagonal pronunciada abajo-derecha               |
| Context         | Inclinado izquierda, corte esquina superior-derecha |
| Partner         | Trapecio invertido, más ancho abajo              |
| SystemChallenge | Asimétrico, corte profundo abajo-izquierda       |
| HowWeWork       | Paralelogramo con offset                         |
| Philosophy      | Corte en ambas esquinas inferiores               |
| Examples        | Forma plana, cortes suaves                       |
| Closing         | Apertura triangular hacia arriba                 |

---

## Contenido de caras traseras

TBD — los componentes `*Back.tsx` se crean como placeholders vacíos. El contenido se definirá en una iteración posterior.

---

## Tests

Cada nuevo componente tiene su archivo `.test.tsx` siguiendo el patrón existente en `src/components/landing/`. Los tests verifican:
- `FlipSection` renderiza `children` y `back`.
- `useFlipControls` — `toggle`, `set`, `resetAll` actualizan el estado correctamente.
- `PolygonSection` renderiza `children`.
