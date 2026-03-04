import React from 'react'
import * as THREE from 'three'
import SoundLines from './SoundLines'
import SoundLine from './SoundLine'
import { useThemeStore } from '../store'

export interface AudioVisualizerProps {
  /** Array of 3D vector arrays representing sound wave lines */
  soundLinesVectors: THREE.Vector3[][]
  currentTime: number
  duration: number
}

/**
 * AudioVisualizer component that renders animated sound wave visualization.
 * Displays progressive sound lines based on current playback time and highlights
 * the current time position with a distinct line.
 */
const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  soundLinesVectors,
  currentTime,
  duration,
}) => {
  const totalLinesCount = soundLinesVectors.length

  /** Number of lines to display based on playback progress */
  let progressBasedLineCount =
    totalLinesCount > 0 ? Math.ceil((currentTime / duration) * totalLinesCount) : 0
  // always show at least one line so preview isn’t empty when paused
  if (progressBasedLineCount < 1 && totalLinesCount > 0) {
    progressBasedLineCount = 1
  }

  const colors = useThemeStore((s) => s.colors)
  return (
    <>
      <SoundLines
        lines={soundLinesVectors}
        lineIdx={progressBasedLineCount}
        position={[0, 0.5, 0]}
        color={colors['--accent-3d']}
      />
      <SoundLine
        points={soundLinesVectors[progressBasedLineCount] || []}
        scale={[1, 1, 1]}
        position={[0, 1, 0]}
        color={colors['--accent-3d-time']}
        showCurrentTimeAsHtml={true}
        currentTime={currentTime}
        duration={duration}
        totalLines={totalLinesCount}
        highlightIndex={progressBasedLineCount}
      />
    </>
  )
}

export default AudioVisualizer
