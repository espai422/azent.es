import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'

const N_SURFACE = 40000
const N_EDGES   = 4000

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
  const { scene } = useGLTF('/models/head.glb')
  const groupRef = useRef<THREE.Group>(null)
  const mouseSmooth = useRef({ x: 0, y: 0 })

  const { surfGeo, edgeGeo } = useMemo(() => {
    let headMesh: THREE.Mesh | null = null
    let maxVerts = 0
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const count = child.geometry.attributes.position?.count ?? 0
        if (count > maxVerts) { maxVerts = count; headMesh = child }
      }
    })

    if (!headMesh) {
      const empty = new THREE.BufferGeometry()
      return { surfGeo: empty, edgeGeo: empty }
    }

    const mesh = headMesh as THREE.Mesh
    mesh.updateWorldMatrix(true, false)
    const worldMat = mesh.matrixWorld
    const normalMat = new THREE.Matrix3().getNormalMatrix(worldMat)

    // ── Surface particles ──────────────────────────────────────────────────────
    // Non-indexed + computeVertexNormals → flat (per-face) normals → distinct
    // Fresnel brightness per plane on the low-poly model.
    const geo = mesh.geometry.toNonIndexed()
    geo.computeVertexNormals()

    const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).build()
    const surfPositions = new Float32Array(N_SURFACE * 3)
    const surfColors    = new Float32Array(N_SURFACE * 3)
    const tempPos    = new THREE.Vector3()
    const tempNormal = new THREE.Vector3()

    for (let i = 0; i < N_SURFACE; i++) {
      sampler.sample(tempPos, tempNormal)
      tempPos.applyMatrix4(worldMat)
      tempNormal.applyMatrix3(normalMat).normalize()

      const scatter = Math.random() * 0.05
      const jitter  = 0.012
      surfPositions[i * 3]     = tempPos.x + tempNormal.x * scatter + (Math.random() - 0.5) * jitter
      surfPositions[i * 3 + 1] = tempPos.y + tempNormal.y * scatter + (Math.random() - 0.5) * jitter
      surfPositions[i * 3 + 2] = tempPos.z + tempNormal.z * scatter + (Math.random() - 0.5) * jitter

      const fresnel = 1 - Math.abs(tempNormal.z)
      const rand    = Math.random()
      const b = Math.min(1, 0.06 + fresnel * 0.62 + rand * rand * 0.45)
      surfColors[i * 3]     = b * 0.82
      surfColors[i * 3 + 1] = b * 0.88
      surfColors[i * 3 + 2] = b * 1.0
    }

    const surfGeo = new THREE.BufferGeometry()
    surfGeo.setAttribute('position', new THREE.Float32BufferAttribute(surfPositions, 3))
    surfGeo.setAttribute('color',    new THREE.Float32BufferAttribute(surfColors,    3))

    // Compute center from the surface cloud, apply to both geometries
    surfGeo.computeBoundingBox()
    const center = new THREE.Vector3()
    if (surfGeo.boundingBox) surfGeo.boundingBox.getCenter(center)
    surfGeo.translate(-center.x, -center.y, -center.z)

    // ── Edge particles ─────────────────────────────────────────────────────────
    const edgesGeom  = new THREE.EdgesGeometry(mesh.geometry)
    const edgePosAttr = edgesGeom.attributes.position as THREE.BufferAttribute
    const edgeCount  = edgePosAttr.count / 2  // each edge = 2 vertices

    const edgePositions = new Float32Array(N_EDGES * 3)
    const edgeColors    = new Float32Array(N_EDGES * 3)

    for (let i = 0; i < N_EDGES; i++) {
      const e = Math.floor(Math.random() * edgeCount)
      const t = Math.random()
      const ax = edgePosAttr.getX(e * 2),     ay = edgePosAttr.getY(e * 2),     az = edgePosAttr.getZ(e * 2)
      const bx = edgePosAttr.getX(e * 2 + 1), by = edgePosAttr.getY(e * 2 + 1), bz = edgePosAttr.getZ(e * 2 + 1)

      const pos = new THREE.Vector3(
        ax + (bx - ax) * t,
        ay + (by - ay) * t,
        az + (bz - az) * t,
      ).applyMatrix4(worldMat)

      edgePositions[i * 3]     = pos.x - center.x
      edgePositions[i * 3 + 1] = pos.y - center.y
      edgePositions[i * 3 + 2] = pos.z - center.z

      // Edge particles are visibly brighter than the surface fill
      const brightness = 0.75 + Math.random() * 0.25
      edgeColors[i * 3]     = brightness * 0.82
      edgeColors[i * 3 + 1] = brightness * 0.88
      edgeColors[i * 3 + 2] = brightness * 1.0
    }

    const edgeGeo = new THREE.BufferGeometry()
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3))
    edgeGeo.setAttribute('color',    new THREE.Float32BufferAttribute(edgeColors,    3))

    return { surfGeo, edgeGeo }
  }, [scene])

  useFrame((state) => {
    if (!groupRef.current) return

    const targetX = -state.pointer.y * (Math.PI / 4)
    const targetY =  state.pointer.x * (Math.PI / 4)
    mouseSmooth.current.x += (targetX - mouseSmooth.current.x) * 0.05
    mouseSmooth.current.y += (targetY - mouseSmooth.current.y) * 0.05

    groupRef.current.rotation.x = mouseSmooth.current.x
    groupRef.current.rotation.y = mouseSmooth.current.y
  })

  return (
    <group ref={groupRef} scale={0.08}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* Surface fill — dimmer, smaller points */}
        <points geometry={surfGeo}>
          <pointsMaterial size={0.7} vertexColors sizeAttenuation={false} transparent opacity={0.75} />
        </points>
        {/* Edge highlight — brighter, larger points */}
        <points geometry={edgeGeo}>
          <pointsMaterial size={1.4} vertexColors sizeAttenuation={false} transparent opacity={1.0} />
        </points>
      </group>
    </group>
  )
}

useGLTF.preload('/models/head.glb')

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
