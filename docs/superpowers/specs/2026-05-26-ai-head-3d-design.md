# AI Head 3D — Diseño

**Fecha:** 2026-05-26  
**Sección afectada:** Hero (`src/routes/index.tsx`) — columna derecha del grid

---

## Resumen

Reemplazar el `AzentMark` estático de la columna derecha del Hero por un elemento 3D interactivo: una cabeza humana realista renderizada como nube de partículas (point cloud), implementada con React Three Fiber.

---

## Dependencias nuevas

| Paquete | Rol |
|---|---|
| `@react-three/fiber` | Render loop de React sobre Three.js |
| `@react-three/drei` | Helpers: `useGLTF`, `Preload` |
| `three` | Motor 3D |
| `@types/three` | Tipos TypeScript |

---

## Modelo 3D

- **Fuente:** `LeePerrySmith.glb` del repositorio oficial de Three.js (licencia libre)
- **Ruta en el proyecto:** `public/models/LeePerrySmith.glb`
- **Descarga:** automatizada durante implementación desde el repo de three.js en GitHub

---

## Componente: `src/components/ui/AIHead.tsx`

### Geometría
- Se carga el GLTF con `useGLTF`
- Se extraen las posiciones de los vértices del mesh en un `useMemo` → `Float32Array`
- Se renderizan como `<Points>` de Three.js con `<PointsMaterial>`

### Color de los puntos
- Sin iluminación tradicional; el color depende de la posición Z (profundidad) de cada punto
- Frontal: blanco `#E6E6E6`
- Lateral/trasero: gris oscuro `#2E2E2E`
- Degradado suave entre ambos extremos, simulando volumen

### Tamaño de punto
- `size: 0.012` Three.js units (denso, textura uniforme)

### Animación
- **Rotación automática:** eje Y continua a ~0.3 rad/s
- **Seguimiento de ratón:** cuando el cursor está sobre el canvas, la cabeza gira ±15° en X e Y hacia el puntero; interpolación `lerp` para suavidad
- En móvil (< 768px): seguimiento de ratón desactivado; solo rotación automática

---

## Integración en el Hero

- **Archivo:** `src/routes/index.tsx`
- **Cambio:** reemplazar el bloque `<AzentMark>` (líneas 185–210) por `<AIHead />`
- La tarjeta contenedora de 340×340 con borde y `--radius-2xl` se conserva
- El `<Canvas>` de R3F ocupa el interior completo con fondo transparente
- El `<Canvas>` se envuelve en `<Suspense>` con fallback: `div` del mismo tamaño con `background: var(--bg-surface)` y animación `az-pulse`

---

## Rendimiento

- `useGLTF.preload('/models/LeePerrySmith.glb')` — precarga antes de montar
- `<Canvas dpr={[1, 1.5]}>` — limita resolución en pantallas retina
- `frameloop="demand"` — solo renderiza cuando hay movimiento activo
- Vértices extraídos una sola vez en `useMemo`

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `public/models/LeePerrySmith.glb` | Nuevo asset |
| `src/components/ui/AIHead.tsx` | Nuevo componente |
| `src/components/ui/index.ts` | Exportar `AIHead` |
| `src/routes/index.tsx` | Sustituir `AzentMark` por `AIHead` |
| `package.json` | Añadir `@react-three/fiber`, `@react-three/drei`, `three`, `@types/three` |
