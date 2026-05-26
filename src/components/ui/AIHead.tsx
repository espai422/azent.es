import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'

const N_PARTICLES = 75000

// ─── Exported for tests ───────────────────────────────────────────────────────

export function depthToColor(
  z: number,
  minZ: number,
  maxZ: number,
): [number, number, number] {
  const range = maxZ - minZ
  const t = range === 0 ? 0.5 : (z - minZ) / range
  const front = 0.902
  const back = 0.18
  const v = back + (front - back) * t
  return [v, v, v]
}

// ─── Point cloud de la cabeza ─────────────────────────────────────────────────

function HeadPointCloud() {
  const { scene } = useGLTF('/models/AsaroHead.glb')
  const groupRef = useRef<THREE.Group>(null)
  const autoRotY = useRef(0)
  const mouseSmooth = useRef({ x: 0, y: 0 })

  const geometry = useMemo(() => {
    let headMesh: THREE.Mesh | null = null
    let maxVerts = 0
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const count = child.geometry.attributes.position?.count ?? 0
        if (count > maxVerts) { maxVerts = count; headMesh = child }
      }
    })

    if (!headMesh) return new THREE.BufferGeometry()

    const mesh = headMesh as THREE.Mesh

    // Non-indexed so each triangle gets its own vertices.
    // computeVertexNormals on non-indexed geo = flat (per-face) normals —
    // crucial for the Asaro model to show distinct plane brightness via Fresnel.
    const geo = mesh.geometry.toNonIndexed()
    geo.computeVertexNormals()

    mesh.updateWorldMatrix(true, false)
    const worldMat = mesh.matrixWorld
    const normalMat = new THREE.Matrix3().getNormalMatrix(worldMat)

    const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).build()

    const positions = new Float32Array(N_PARTICLES * 3)
    const colors = new Float32Array(N_PARTICLES * 3)
    const tempPos = new THREE.Vector3()
    const tempNormal = new THREE.Vector3()

    for (let i = 0; i < N_PARTICLES; i++) {
      sampler.sample(tempPos, tempNormal)

      tempPos.applyMatrix4(worldMat)
      tempNormal.applyMatrix3(normalMat).normalize()

      const scatter = Math.random() * 0.05
      const jitter = 0.012
      positions[i * 3]     = tempPos.x + tempNormal.x * scatter + (Math.random() - 0.5) * jitter
      positions[i * 3 + 1] = tempPos.y + tempNormal.y * scatter + (Math.random() - 0.5) * jitter
      positions[i * 3 + 2] = tempPos.z + tempNormal.z * scatter + (Math.random() - 0.5) * jitter

      // Fresnel: bright at silhouette edges, dim face-on.
      // On a low-poly model each flat plane has one normal → distinct Fresnel band per plane.
      const fresnel = 1 - Math.abs(tempNormal.z)
      const rand = Math.random()
      const brightness = 0.06 + fresnel * 0.62 + rand * rand * 0.45

      const b = Math.min(1, brightness)
      colors[i * 3]     = b * 0.82
      colors[i * 3 + 1] = b * 0.88
      colors[i * 3 + 2] = b * 1.0
    }

    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    result.computeBoundingBox()
    if (result.boundingBox) {
      const center = new THREE.Vector3()
      result.boundingBox.getCenter(center)
      result.translate(-center.x, -center.y, -center.z)
    }

    return result
  }, [scene])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    autoRotY.current = (autoRotY.current + delta * 0.3) % (Math.PI * 2)

    const targetX = -state.pointer.y * (Math.PI / 12)
    const targetY = state.pointer.x * (Math.PI / 12)
    mouseSmooth.current.x += (targetX - mouseSmooth.current.x) * 0.05
    mouseSmooth.current.y += (targetY - mouseSmooth.current.y) * 0.05

    groupRef.current.rotation.x = mouseSmooth.current.x
    groupRef.current.rotation.y = autoRotY.current + mouseSmooth.current.y
  })

  return (
    <group ref={groupRef} scale={0.42}>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.8}
          vertexColors
          sizeAttenuation={false}
          transparent
          opacity={0.9}
        />
      </points>
    </group>
  )
}

useGLTF.preload('/models/AsaroHead.glb')

// ─── Componente público ───────────────────────────────────────────────────────

export function AIHead() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 55 }}
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
