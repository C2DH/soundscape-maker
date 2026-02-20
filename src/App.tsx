import { useEffect, useRef, useState } from 'react'
import fft from 'fft-js'
import './App.css'

type AudioInputProps = {
  onAudioSelected?: (file: File) => void
}

async function analyseAudioFile(
  file: File,
  options?: { keepCount?: number; numChunks?: number },
): Promise<{ data: number[][]; duration: number }> {
  const keepCount = options?.keepCount ?? 48
  const numChunks = options?.numChunks ?? 200

  const arrayBuffer = await file.arrayBuffer()

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  const audioContext = new AudioCtx()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const channelData = audioBuffer.getChannelData(0)
  const totalSamples = channelData.length

  const fftSize = 1024
  const halfFFT = fftSize / 2
  const frequenciesPerChunk: number[][] = []

  const samplesPerChunk = Math.floor(totalSamples / numChunks)

  for (let i = 0; i < numChunks; i++) {
    const startSample = i * samplesPerChunk
    const endSample = i === numChunks - 1 ? totalSamples : (i + 1) * samplesPerChunk
    const segment = channelData.slice(startSample, endSample)

    const chunkFFTData: number[][] = []
    for (let j = 0; j < segment.length; j += fftSize) {
      const chunk = segment.slice(j, j + fftSize)
      const padded = new Float32Array(fftSize)
      padded.set(chunk)

      const phasors = fft.fft(padded)
      const magnitudes = (fft.util.fftMag(phasors) as number[]).slice(0, halfFFT)

      chunkFFTData.push(magnitudes)
    }

    if (!chunkFFTData.length) continue

    const averaged = chunkFFTData[0].map(
      (_, idx) => chunkFFTData.reduce((sum, arr) => sum + arr[idx], 0) / chunkFFTData.length,
    )

    const cropped = averaged.slice(0, keepCount)
    const padded = [0, ...cropped, 0]

    frequenciesPerChunk.push(extendArrays(padded))
  }

  if (!frequenciesPerChunk.length) {
    return { data: [], duration: audioBuffer.duration }
  }

  const arrayLength = frequenciesPerChunk[0].length
  const zeroArray = Array(arrayLength).fill(0)
  const outputData = [zeroArray, ...frequenciesPerChunk, zeroArray]

  return { data: outputData, duration: audioBuffer.duration }
}

function extendArrays(data: number[] = []) {
  const extended: number[] = []
  // amplifyArray logic is effectively a no-op in the original script;
  // kept here for parity, but we don't use the result directly.
  amplifyArray(data, 2)

  for (let i = 0; i < data.length - 1; i++) {
    extended.push(data[i])
    const midpoint = (data[i] + data[i + 1]) / 2
    extended.push(midpoint)
  }
  extended.push(data[data.length - 1])
  return extended
}

function amplifyArray(arr: number[], factor = 1) {
  return arr.map((value) => Math.pow(value, factor))
}

function AudioInput({ onAudioSelected }: AudioInputProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      window.alert('Please select an audio file.')
      event.target.value = ''
      return
    }

    onAudioSelected?.(file)
  }

  return (
    <div className="card">
      <label htmlFor="audio-input">Choose an audio file</label>
      <input
        id="audio-input"
        type="file"
        accept="audio/*"
        onChange={handleChange}
      />
    </div>
  )
}

function Soundscape3D({
  chunks,
  currentIndex,
  onSeek,
}: {
  chunks: number[][]
  currentIndex: number
  onSeek?: (index: number) => void
}) {
  if (!chunks.length) return null

  const flat = chunks.flat()
  const maxVal = flat.length ? Math.max(...flat) : 1
  const safeMax = maxVal || 1

  const [rotX, setRotX] = useState(60)
  const [rotY, setRotY] = useState(0)
  const [scale, setScale] = useState(1)
  const dragging = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const startRef = useRef({ x: 0, y: 0, rotX: 60, rotY: 0 })
  const [hovered, setHovered] = useState<number | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragging.current = true
    pointerIdRef.current = e.pointerId
    startRef.current = { x: e.clientX, y: e.clientY, rotX, rotY }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    setRotY(startRef.current.rotY + dx * 0.25)
    setRotX(Math.max(-85, Math.min(85, startRef.current.rotX - dy * 0.25)))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {}
    dragging.current = false
    pointerIdRef.current = null
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setScale((s) => Math.min(2, Math.max(0.4, s - e.deltaY * 0.001)))
  }

  const mid = (chunks.length - 1) / 2

  return (
    <div
      style={{
        perspective: '1000px',
        marginTop: '1.5rem',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{
          display: 'flex',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(40px) scale(${scale})`,
          transformOrigin: 'center center',
          gap: '6px',
          alignItems: 'end',
          cursor: dragging.current ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
          {chunks.map((freqs, i) => {
          const avg = freqs.reduce((sum, v) => sum + v, 0) / (freqs.length || 1)
          const height = (avg / safeMax) * 380 + 8
          const isCurrent = i === currentIndex
          const isHovered = hovered === i

          return (
            <div
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              onClick={() => onSeek?.(i)}
              role="button"
              aria-label={`chunk-${i}`}
              style={{
                width: '10px',
                height: `${height}px`,
                background: isCurrent
                  ? 'linear-gradient(180deg, #ffb266, #ff6a00)'
                  : isHovered
                  ? 'linear-gradient(180deg, #7ee8fa, #00c2ff)'
                  : 'linear-gradient(180deg, rgba(0,200,255,0.9), rgba(0,120,180,0.6))',
                boxShadow: isCurrent
                  ? '0 0 18px rgba(255,150,50,0.9)'
                  : '0 0 6px rgba(0,200,255,0.45)',
                transform: `translateZ(${(i - mid) * 6}px) ${isHovered ? 'translateY(-12px)' : ''}`,
                borderRadius: '3px',
                transition: 'transform 160ms, box-shadow 160ms, background 160ms',
                willChange: 'transform',
                cursor: 'pointer',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function App() {
  const [outputJson, setOutputJson] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<number[][] | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleAudioSelected = async (file: File) => {
    setIsProcessing(true)
    setError(null)
    setOutputJson('')
    setAnalysis(null)
    setDuration(null)
    setCurrentTime(0)

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }

    const url = URL.createObjectURL(file)
    setAudioUrl(url)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    try {
      const { data, duration } = await analyseAudioFile(file)
      setAnalysis(data)
        setDuration(duration)
        setOutputJson(JSON.stringify(data, null, 2))
    } catch (e) {
      console.error(e)
      setError('Failed to analyse audio.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePlayPause = () => {
    if (!audioUrl) return

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  useEffect(() => {
    let frameId: number

    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime)
      }
      frameId = requestAnimationFrame(updateTime)
    }

    if (isPlaying) {
      frameId = requestAnimationFrame(updateTime)
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [isPlaying])

  const totalChunks = analysis?.length ?? 0
  const currentIndex =
    analysis && duration
      ? Math.min(
          totalChunks - 1,
          Math.max(
            0,
            Math.floor((currentTime / duration) * totalChunks),
          ),
        )
      : 0

  return (
    <main className="app-root">
      <h1>Soundscape Visual</h1>
      <p>Upload an audio file to see its frequency spectrum.</p>
      <AudioInput onAudioSelected={handleAudioSelected} />

      <div style={{ marginTop: '1rem' }}>
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={!audioUrl || !analysis}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        {duration !== null && (
          <span style={{ marginLeft: '0.75rem', fontSize: '0.9rem' }}>
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </span>
        )}
      </div>

      {isProcessing && <p>Processing audio…</p>}
      {error && <p>{error}</p>}

      {analysis && totalChunks > 0 && (
        <div className="visual-section">
          <Soundscape3D
            chunks={analysis}
            currentIndex={currentIndex}
            onSeek={(i) => {
              const total = analysis.length
              if (!duration || !audioRef.current) return
              const fraction = i / total
              const newTime = Math.max(0, Math.min(duration, fraction * duration))
              try {
                audioRef.current.currentTime = newTime
              } catch (e) {}
              setCurrentTime(newTime)
            }}
          />
          <div className="output-json"><pre>{outputJson}</pre></div>
        </div>
      )}
    </main>
  )
}

export default App
