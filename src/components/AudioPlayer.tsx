import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  src: string
  seek: number
  debugMode?: boolean
  onTimeUpdate?: (time: number) => void
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  seek,
  debugMode = true,
  onTimeUpdate,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
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
      const time = audioRef.current.currentTime
      console.debug('Audio current time:', time)
      if (onTimeUpdate) {
        onTimeUpdate(time)
      }
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
    </div>
  )
}

export default AudioPlayer
