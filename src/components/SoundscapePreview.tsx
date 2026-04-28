import type { ElementRef } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import type { Mesh } from 'three'
import * as THREE from 'three'
import AudioVisualizer from './AudioVisualizer'
import HoverLine from './HoverLine'
import SoundScape from './SoundScape'
import { useMeshStore, useOrbitStore, useThemeStore } from '../store'

const isMobile =
  typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)

export interface SoundscapePreviewProps {
  soundLinesVectors: THREE.Vector3[][]
  scaledLists: number[][]
  currentTime: number
  duration: number
  onSeek: (clickTime: number) => void
}

export function SoundscapePreview({
  soundLinesVectors,
  scaledLists,
  currentTime,
  duration,
  onSeek,
}: SoundscapePreviewProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const meshRef = useRef<Mesh | null>(null)
  const orbitRef = useRef<ElementRef<typeof OrbitControls> | null>(null)
  const setMesh = useMeshStore((s) => s.setMesh)
  const setOrbit = useOrbitStore((s) => s.setOrbit)
  const target = useOrbitStore((s) => s.target)
  const gridColor = useThemeStore((s) => s.colors['--light'])

  const handleMeshHover = useCallback((newHoverIndex: number | null) => {
    setHoverIndex((currentHoverIndex) =>
      currentHoverIndex === newHoverIndex ? currentHoverIndex : newHoverIndex,
    )
  }, [])

  const handleMeshClick = useCallback(
    (_clickIndex: number, clickTime: number) => {
      onSeek(clickTime)
    },
    [onSeek],
  )

  useEffect(() => {
    if (meshRef.current) {
      setMesh(meshRef.current)
    }
  }, [setMesh])

  useEffect(() => {
    if (meshRef.current && orbitRef.current) {
      const controls = orbitRef.current
      setOrbit(
        controls.object.position.toArray() as [number, number, number],
        controls.target.toArray() as [number, number, number],
      )
    }
  }, [setOrbit])

  return (
    <div style={{ width: '100%', height: '400px', marginBottom: '1rem' }}>
      <Canvas
        shadows
        camera={{
          position: [300, 200, 150],
          fov: 20,
          far: 1500,
          near: 0.1,
          zoom: isMobile ? 0.5 : 1,
        }}
        touch-action='none'
      >
        <OrbitControls
          ref={orbitRef}
          minDistance={isMobile ? 120 : 40}
          maxDistance={isMobile ? 700 : 600}
          target={target}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2}
        />

        <group>
          <SoundScape
            ref={meshRef}
            lists={scaledLists}
            position={[0, 0, 0]}
            onHover={handleMeshHover}
            onClick={handleMeshClick}
          />
          <Grid
            args={[164, 164]}
            cellSize={5}
            cellColor={gridColor}
            sectionSize={82}
            sectionColor={gridColor}
            fadeDistance={600}
            fadeStrength={1}
          />
        </group>

        <AudioVisualizer
          soundLinesVectors={soundLinesVectors}
          currentTime={currentTime}
          duration={duration}
        />
        <HoverLine
          soundLinesVectors={soundLinesVectors}
          hoverIndex={hoverIndex}
          duration={duration}
        />
      </Canvas>
    </div>
  )
}
