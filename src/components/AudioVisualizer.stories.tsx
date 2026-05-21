import type { Meta, StoryObj } from '@storybook/react-vite'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import AudioVisualizer, {
  type AudioVisualizerProps,
} from '../components/AudioVisualizer'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useState } from 'react'

const meta: Meta<typeof AudioVisualizer> = {
  title: 'Components/AudioVisualizer',
  component: AudioVisualizer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '100%', height: 600, background: 'grey' }}>
        <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
          <ambientLight />
          <directionalLight position={[10, 10, 5]} />
          <Story />
          <OrbitControls />
        </Canvas>
      </div>
    ),
  ],
} satisfies Meta<typeof AudioVisualizer>

export default meta
type Story = StoryObj<typeof AudioVisualizer>

const generateRandomLines = (
  lineCount = 10,
  pointsPerLine = 100,
): THREE.Vector3[][] => {
  return Array.from({ length: lineCount }, (_, i) =>
    Array.from({ length: pointsPerLine }, (_, j) => {
      const x = j
      const y = Math.sin(j * 0.1 + i * 0.5) * 2
      const z = i
      return new THREE.Vector3(x, y, z)
    }),
  )
}

const AudioVisualizerWrapper = ({
  soundLinesVectors,
  duration = 1000,
  currentTime: defaultCurrentTime = 0,
  delay = 100,
}: AudioVisualizerProps & { delay: number }) => {
  const [currentTime, setCurrentTime] = useState(defaultCurrentTime)
  useEffect(() => {
    // Simulate audio updates
    let currentTime = 0
    const interval = setInterval(() => {
      setCurrentTime(currentTime)
      currentTime += 0.5
      if (currentTime > duration) currentTime = 0
      console.log('Current Time:', currentTime)
    }, delay)
    return () => clearInterval(interval)
  }, [delay, duration])
  return (
    <AudioVisualizer
      duration={duration}
      currentTime={currentTime}
      soundLinesVectors={soundLinesVectors}
    />
  )
}

export const Default: Story = {
  args: {
    soundLinesVectors: generateRandomLines(20, 100),
    duration: 2000,
    currentTime: 200,
  },
  name: 'Live Updating Line',
}

export const SimulateStreaming: Story = {
  args: {
    soundLinesVectors: generateRandomLines(50, 200),
    duration: 2000,
    currentTime: 0,
    delay: 100, // custom prop to control update speed in the wrapper
  } as AudioVisualizerProps & { delay: number },
  render: (args) => (
    <AudioVisualizerWrapper {...(args as AudioVisualizerProps & { delay: number })} />
  ),

  name: 'Simulate Streaming Data',
}
