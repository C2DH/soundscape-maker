import React, { use, useEffect, useState } from 'react'
import * as THREE from 'three'
import SoundLine from './SoundLine'

export interface HoverLineProps {
  soundLinesVectors: THREE.Vector3[][]
  hoverIndex: number | null
  duration: number
  reverseOutput: boolean
}

/**
 * HoverLine component that displays a single yellow line with timecode when hovering over the mesh.
 * Separate from the playback progress visualization.
 */
const HoverLine: React.FC<HoverLineProps> = ({
  soundLinesVectors,
  hoverIndex,
  duration,
  reverseOutput
}) => {
  // Only show hover line if hovering
  if (hoverIndex === null || hoverIndex === undefined) {
    return null
  }

  const [safeHoverIndex, setSafeHoverIndex] = useState<number>(0)

  useEffect(() => {
    setSafeHoverIndex(Math.max(0, Math.min(hoverIndex, soundLinesVectors.length - 1)))
  }, [hoverIndex])

  const totalLinesCount = soundLinesVectors.length
  useEffect(() => {
    if (reverseOutput===true){
      setSafeHoverIndex(totalLinesCount - Math.max(0, Math.min(hoverIndex, totalLinesCount - 1)))
    }
    else{
      setSafeHoverIndex(Math.max(0, Math.min(hoverIndex, totalLinesCount - 1)))
    }
  }, [reverseOutput, hoverIndex, totalLinesCount])
  const displayTime =
    totalLinesCount > 1
      ? (safeHoverIndex / (totalLinesCount - 1)) * duration
      : 0
  return (
    <SoundLine
      points={soundLinesVectors[safeHoverIndex] || []}
      scale={[1, 1, 1]}
      position={[0, 1, 0]}
      color='#ffff00'
      lineWidth={0.3}
      showCurrentTimeAsHtml={true}
      currentTime={displayTime}
      duration={duration}
      totalLines={totalLinesCount}
      highlightIndex={safeHoverIndex}
    />
  )
}

export default HoverLine
