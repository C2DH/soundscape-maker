import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { easeOutQuint } from '../easing.ts'
import { formatTime } from '../audio.ts'
import { Html } from '@react-three/drei'

export type SoundLineProps = {
  points: THREE.Vector3[]
  color?: string
  lineWidth?: number
  depthTest?: boolean
  tweenDuration?: number
  easing?: (t: number) => number
  scale?: [number, number, number]
  position?: [number, number, number]
  showCurrentTimeAsHtml?: boolean
  // additional props to replicate store behaviour
  currentTime?: number
  duration?: number
  totalLines?: number
  highlightIndex?: number
}

const lerpVector3 = (start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 => {
  return new THREE.Vector3(
    start.x + (end.x - start.x) * t,
    start.y + (end.y - start.y) * t,
    start.z + (end.z - start.z) * t,
  )
}

const SoundLine: React.FC<SoundLineProps> = ({
  points,
  color = 'white',
  lineWidth = 0.2,
  depthTest = false,
  tweenDuration = 200,
  easing = easeOutQuint,
  scale = [0.6, 1.05, -0.8],
  position = [0, 1, 0],
  showCurrentTimeAsHtml = false,
  currentTime = 0,
  duration = 1,
  totalLines = 1,
  highlightIndex = 0,
}) => {
  const lineRef = useRef<Line2 | null>(null)
  const { size } = useThree()

  const lineTime = (highlightIndex / totalLines) * duration
  const [lineTimeState] = useState(lineTime)

  // Animation state
  const isAnimatingRef = useRef(false)
  const startPointsRef = useRef<THREE.Vector3[]>([])
  const targetPointsRef = useRef<THREE.Vector3[]>([])
  const currentPointsRef = useRef<THREE.Vector3[]>(points)
  const animationStartTimeRef = useRef<number>(0)
  const positionsBufferRef = useRef<Float32Array>(new Float32Array(points.length * 3))

  // HTML Z animation
  const htmlZStartRef = useRef(0)
  const htmlZTargetRef = useRef(0)
  const htmlZCurrentRef = useRef(0)
  const htmlRef = useRef<any>(null)
  const htmlGroupRef = useRef<THREE.Group>(null)

  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size],
  )

  // Initialize buffer
  const updatePositionsBuffer = (pts: THREE.Vector3[]) => {
    pts.forEach((p, i) => {
      positionsBufferRef.current[i * 3] = p.x * scale[0]
      positionsBufferRef.current[i * 3 + 1] = p.y * scale[1]
      positionsBufferRef.current[i * 3 + 2] = p.z * scale[2]
    })
  }

  // Tween animation
  useEffect(() => {
    if (!points.length) return

    if (!startPointsRef.current.length) {
      startPointsRef.current = [...points]
      currentPointsRef.current = [...points]
      updatePositionsBuffer(points)
      return
    }

    startPointsRef.current = [...currentPointsRef.current]
    targetPointsRef.current = [...points]

    const middleIdx = Math.floor(points.length / 2)
    htmlZStartRef.current = htmlZCurrentRef.current || points[middleIdx].z * scale[2]
    htmlZTargetRef.current = points[middleIdx].z * scale[2]

    isAnimatingRef.current = true
    animationStartTimeRef.current = performance.now()
  }, [points, scale])

  useFrame(() => {
    if (!lineRef.current || !htmlGroupRef.current) return

    if (isAnimatingRef.current) {
      const now = performance.now()
      const elapsed = now - animationStartTimeRef.current
      const progress = Math.min(elapsed / tweenDuration, 1)
      const easedProgress = easing(progress)

      // Update line points
      for (let i = 0; i < startPointsRef.current.length; i++) {
        currentPointsRef.current[i] = lerpVector3(
          startPointsRef.current[i],
          targetPointsRef.current[i],
          easedProgress,
        )
      }
      updatePositionsBuffer(currentPointsRef.current)

      const geometry = lineRef.current.geometry as LineGeometry
      geometry.setPositions(positionsBufferRef.current)
      lineRef.current.computeLineDistances()

      // pick the middle point as anchor
      const mid = Math.floor(currentPointsRef.current.length / 2)
      const anchor = currentPointsRef.current[mid]

      htmlGroupRef.current.position.set(
        currentPointsRef.current[1].x * scale[0] + 3,
        0,
        anchor.z * scale[2] - 0.4, // use same scaling as line
      )

      // Update text
      if (htmlRef.current) {
        const lineTime = (highlightIndex / totalLines) * duration
        htmlRef.current.textContent = formatTime(lineTime)
      }
      if (progress >= 1) isAnimatingRef.current = false
    }
  })

  const line = useMemo(() => {
    updatePositionsBuffer(currentPointsRef.current)
    const geometry = new LineGeometry()
    geometry.setPositions(positionsBufferRef.current)
    const material = new LineMaterial({
      color,
      linewidth: lineWidth,
      resolution,
      worldUnits: true,
      transparent: true,
      depthTest,
      side: THREE.DoubleSide,
    })
    const line = new Line2(geometry, material)
    line.computeLineDistances() // Ensure line distances are calculated for dashed/material effects
    return line
  }, [color, depthTest, lineWidth, resolution])

  return (
    <>
      <primitive object={line} ref={lineRef} position={position} />
      {points.length > 0 && (
        <group ref={htmlGroupRef}>
          <Html
            transform
            sprite
            scale={4}
            rotation={showCurrentTimeAsHtml ? [0, 0, 0] : [Math.PI / -2, 0, Math.PI / 2]}
            position={[showCurrentTimeAsHtml ? 96 : 58, 0, 0]}
          >
            <div ref={htmlRef} style={{ color: 'white', fontSize: '16px' }}>
              {showCurrentTimeAsHtml ? formatTime(currentTime) : formatTime(lineTimeState)}
            </div>
          </Html>
        </group>
      )}
    </>
  )
}

export default SoundLine
// export type { SoundLineProps }
