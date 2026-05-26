import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// ─── Color de profundidad: blanco frontal → gris trasero ──────────────────────

export function depthToColor(
  z: number,
  minZ: number,
  maxZ: number,
): [number, number, number] {
  const range = maxZ - minZ
  const t = range === 0 ? 0.5 : (z - minZ) / range
  // t=1 → frontal (#E6E6E6 = 0.902), t=0 → trasero (#2E2E2E = 0.18)
  const front = 0.902
  const back = 0.18
  const v = back + (front - back) * t
  return [v, v, v]
}

// ─── Point cloud de la cabeza ─────────────────────────────────────────────────

function HeadPointCloud() {
  const { scene } = useGLTF('/models/LeePerrySmith.glb')
  const groupRef = useRef<THREE.Group>(null)
  const autoRotY = useRef(0)
  const mouseSmooth = useRef({ x: 0, y: 0 })

  const geometry = useMemo(() => {
    const allPositions: number[] = []
    const allColors: number[] = []
    let minZ = Infinity
    let maxZ = -Infinity

    // Primer paso: calcular rango Z global
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const pos = child.geometry.attributes.position
        if (!(pos instanceof THREE.BufferAttribute)) return
        child.updateWorldMatrix(true, false)
        const mat = child.matrixWorld
        const v = new THREE.Vector3()
        for (let i = 0; i < pos.count; i++) {
          v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat)
          if (v.z < minZ) minZ = v.z
          if (v.z > maxZ) maxZ = v.z
        }
      }
    })

    // Segundo paso: extraer posiciones y colores
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const pos = child.geometry.attributes.position
        if (!(pos instanceof THREE.BufferAttribute)) return
        const mat = child.matrixWorld
        const v = new THREE.Vector3()
        for (let i = 0; i < pos.count; i++) {
          v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat)
          allPositions.push(v.x, v.y, v.z)
          const [r, g, b] = depthToColor(v.z, minZ, maxZ)
          allColors.push(r, g, b)
        }
      }
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3))
    return geo
  }, [scene])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Rotación automática
    autoRotY.current += delta * 0.3

    // Seguimiento de ratón (interpolado)
    const targetX = -state.pointer.y * (Math.PI / 12)
    const targetY = state.pointer.x * (Math.PI / 12)
    mouseSmooth.current.x += (targetX - mouseSmooth.current.x) * 0.05
    mouseSmooth.current.y += (targetY - mouseSmooth.current.y) * 0.05

    groupRef.current.rotation.x = mouseSmooth.current.x
    groupRef.current.rotation.y = autoRotY.current + mouseSmooth.current.y
  })

  return (
    <group ref={groupRef}>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.012}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.9}
        />
      </points>
    </group>
  )
}

useGLTF.preload('/models/LeePerrySmith.glb')

// ─── Componente público ───────────────────────────────────────────────────────

export function AIHead() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      dpr={[1, 1.5]}
      frameloop="always"
      gl={{ alpha: true }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <HeadPointCloud />
      </Suspense>
    </Canvas>
  )
}
