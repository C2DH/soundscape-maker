import type { ThreeEvent } from '@react-three/fiber'
import { useFrame, useThree } from '@react-three/fiber'
import {
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
} from 'react'
import * as THREE from 'three'
import vertexSoundScape from '../shaders/soundscape/vertex.glsl?raw'
import fragmentSoundScape from '../shaders/soundscape/fragment.glsl?raw'

export interface SoundScapeProps {
  lists: number[][]
  position?: [number, number, number]
  onHover?: (hoverIndex: number | null) => void
  onClick?: (clickIndex: number, clickTime: number) => void
  zSpacing?: number
  leftTopColor?: string
  leftBottomColor?: string
  rightTopColor?: string
  rightBottomColor?: string
  gradientLeftToRight?: boolean
}

const SoundScape = forwardRef<THREE.Mesh, SoundScapeProps>(
  (
    {
      lists,
      position = [0, 0, 0],
      onHover,
      onClick,
      zSpacing = 1,
      leftTopColor = '#561577',
      leftBottomColor = '#2f0f45',
      rightTopColor = '#9632c8',
      rightBottomColor = '#5a1f7d',
      gradientLeftToRight = false,
    },
    ref,
  ) => {
    const meshRef = useRef<THREE.Mesh>(null)
    const materialRef = useRef<THREE.ShaderMaterial>(null!)
    const { camera, pointer } = useThree()
    const raycasterRef = useRef(new THREE.Raycaster())
    const lastHoverIndexRef = useRef<number | null>(null)
    const uniforms = useMemo(
      () => ({
        colorLeftTop: { value: new THREE.Color('#561577') },
        colorLeftBottom: { value: new THREE.Color('#2f0f45') },
        colorRightTop: { value: new THREE.Color('#9632c8') },
        colorRightBottom: { value: new THREE.Color('#5a1f7d') },
        uBboxMin: { value: new THREE.Vector3() },
        uBboxMax: { value: new THREE.Vector3() },
        uGradientLeftToRight: { value: 0 },
        uRoughness: { value: 0.5 },
        uRoughnessPower: { value: 0.5 },
        uCameraPosition: { value: new THREE.Vector3() },
        uReverse: { value: 0 },
      }),
      [],
    )

    const handleMeshClick = useCallback(
      (event: ThreeEvent<MouseEvent>) => {
        const point = event.point
        const timeLength = lists.length

        if (timeLength > 0) {
          const zExtent = Math.max((timeLength - 1) * zSpacing, 1e-6)
          const zNorm = (point.z + zExtent / 2) / zExtent
          const clickIndex = Math.round(zNorm * (timeLength - 1))
          const clickTime =
            (clickIndex / Math.max(1, timeLength - 1)) * lists.length

          if (onClick) {
            onClick(clickIndex, clickTime)
          }
        }
      },
      [lists, onClick, zSpacing],
    )

    // build geometry once when lists change
    const { bbox, geometry } = useMemo(() => {
      const timeLength = lists.length
      const listLength = lists[0]?.length ?? 0

      const vertices: number[] = []
      const indices: number[] = []

      const xCenter = listLength / 2
      const zCenter = ((timeLength - 1) * zSpacing) / 2

      for (let t = 0; t < timeLength; t++) {
        const yList = lists[t]
        for (let x = 0; x < listLength; x++) {
          const y = yList[x]
          vertices.push(x - xCenter, y, t * zSpacing - zCenter)
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
      const bbox = geom.boundingBox
        ? {
            min: geom.boundingBox.min.clone(),
            max: geom.boundingBox.max.clone(),
          }
        : {
            min: new THREE.Vector3(),
            max: new THREE.Vector3(),
          }
      return { bbox, geometry: geom }
    }, [lists, zSpacing])

    useEffect(() => {
      uniforms.colorLeftTop.value.set(leftTopColor)
    }, [leftTopColor, uniforms])

    useEffect(() => {
      uniforms.colorLeftBottom.value.set(leftBottomColor)
    }, [leftBottomColor, uniforms])

    useEffect(() => {
      uniforms.colorRightTop.value.set(rightTopColor)
    }, [rightTopColor, uniforms])

    useEffect(() => {
      uniforms.colorRightBottom.value.set(rightBottomColor)
    }, [rightBottomColor, uniforms])

    useEffect(() => {
      uniforms.uBboxMin.value.copy(bbox.min)
      uniforms.uBboxMax.value.copy(bbox.max)
    }, [bbox, uniforms])

    useEffect(() => {
      uniforms.uGradientLeftToRight.value = gradientLeftToRight ? 1 : 0
      if (materialRef.current) {
        materialRef.current.uniforms.uGradientLeftToRight.value =
          gradientLeftToRight ? 1 : 0
        materialRef.current.needsUpdate = true
      }
    }, [gradientLeftToRight, uniforms])

    // expose ref
    useImperativeHandle(ref, () => meshRef.current as THREE.Mesh)

    // update camera uniform each frame
    useFrame(() => {
      if (materialRef.current) {
        uniforms.uCameraPosition.value.copy(camera.position)
      }

      // Raycasting for hover (visual only, no seeking)
      if (meshRef.current) {
        raycasterRef.current.setFromCamera(pointer, camera)
        const intersects = raycasterRef.current.intersectObject(meshRef.current)

        if (intersects.length > 0) {
          const point = intersects[0].point
          const timeLength = lists.length

          if (timeLength > 0) {
            const zExtent = Math.max((timeLength - 1) * zSpacing, 1e-6)
            const zNorm = (point.z + zExtent / 2) / zExtent
            const hoverIndex = Math.round(zNorm * (timeLength - 1))

            // Only trigger callback if hover index changed
            if (hoverIndex !== lastHoverIndexRef.current) {
              lastHoverIndexRef.current = hoverIndex

              if (onHover) {
                onHover(hoverIndex)
              }
            }
          }
        } else {
          // Clear hover when mouse leaves mesh
          if (lastHoverIndexRef.current !== null) {
            lastHoverIndexRef.current = null
            if (onHover) {
              onHover(null)
            }
          }
        }
      }
    })

    if (lists.length === 0) return null

    return (
      <mesh
        geometry={geometry}
        ref={meshRef}
        position={position}
        onClick={handleMeshClick}
      >
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexSoundScape}
          fragmentShader={fragmentSoundScape}
          uniforms={uniforms}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
    )
  },
)

export default SoundScape
