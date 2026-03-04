import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import vertexSoundScape from '../shaders/soundscape/vertex.glsl?raw'
import fragmentSoundScape from '../shaders/soundscape/fragment.glsl?raw'
import { useThemeStore } from '../store'

export type SoundScapeProps = {
  lists: number[][]
  position?: [number, number, number]
}

const SoundScape = forwardRef<THREE.Mesh, SoundScapeProps>(({ lists, position = [0, 0, 0] }, ref) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  const [bbox, setBbox] = useState({
    min: new THREE.Vector3(),
    max: new THREE.Vector3(),
  })
  const colors = useThemeStore((s) => s.colors)
  const { camera } = useThree()

  // build geometry once when lists change
  const geometry = useMemo(() => {
    const timeLength = lists.length
    const listLength = lists[0]?.length ?? 0

    const vertices: number[] = []
    const indices: number[] = []

    const xCenter = listLength / 2
    const zCenter = timeLength / 2

    for (let t = 0; t < timeLength; t++) {
      const yList = lists[t]
      for (let x = 0; x < listLength; x++) {
        const y = yList[x]
        vertices.push(x - xCenter, y, t - zCenter)
      }
    }

    for (let t = 0; t < timeLength - 1; t++) {
      for (let x = 0; x < listLength - 1; x++) {
        const a = t * listLength + x
        const b = a + 1
        const c = a + listLength
        const d = c + 1
        indices.push(a, b, c)
        indices.push(b, d, c)
      }
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geom.setIndex(indices)
    geom.computeVertexNormals()

    const uvs: number[] = []
    for (let t = 0; t < timeLength; t++) {
      for (let x = 0; x < listLength; x++) {
        const u = x / (listLength - 1)
        const v = t / (timeLength - 1)
        uvs.push(u, v)
      }
    }
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geom.computeBoundingBox()
    if (geom.boundingBox) {
      setBbox({
        min: geom.boundingBox.min.clone(),
        max: geom.boundingBox.max.clone(),
      })
    }
    return geom
  }, [lists])

  // expose ref
  useImperativeHandle(ref, () => meshRef.current as THREE.Mesh)

  // update camera uniform each frame
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uCameraPosition.value.copy(camera.position)
    }
  })

  if (lists.length === 0) return null

  return (
    <mesh geometry={geometry} ref={meshRef} position={position}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexSoundScape}
        fragmentShader={fragmentSoundScape}
        uniforms={{
          color1: { value: new THREE.Color(colors['--dark']) },
          // override pink accent with a more purple tone
          color2: { value: new THREE.Color('rgb(150,50,200)') },
          uBboxMin: { value: bbox.min },
          uBboxMax: { value: bbox.max },
          uRoughness: { value: 0.5 },
          uRoughnessPower: { value: 0.5 },
          uCameraPosition: { value: camera.position },
          uReverse: { value: 0 },
        }}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
})

export default SoundScape
