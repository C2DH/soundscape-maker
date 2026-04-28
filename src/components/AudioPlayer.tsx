// AudioPlayer.tsx
import React, { useEffect, useRef, useState } from 'react'
import AudioControlsProgress from './AudioControlProgress'
import { useAudioStore } from '../store'

interface AudioPlayerProps {
  src: string
  seek: number
  debugMode?: boolean
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  seek,
  debugMode = true,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const setCurrentTime = useAudioStore((s) => s.setCurrentTime)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = seek
      if (!isPlaying) {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }, [seek])

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleTimeUpdate = () => {
    if (debugMode && audioRef.current) {
      console.debug('Audio current time:', audioRef.current.currentTime)
      setCurrentTime(audioRef.current.currentTime)
    }
  }
  return (
    <div>
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
      />
      <button onClick={isPlaying ? handlePause : handlePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <AudioControlsProgress />
    </div>
  )
}

export default AudioPlayer
