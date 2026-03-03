import React, { useEffect, useRef, useState } from 'react'
import fft from 'fft-js'
import AudioInput from '../components/AudioInput'

async function analyseAudioFile(
  file: File,
  options?: { keepCount?: number; numChunks?: number },
): Promise<{ data: number[][]; duration: number }> {
  const keepCount = options?.keepCount ?? 48
  const numChunks = options?.numChunks ?? 600

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

export default function GenerateJSON() {
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

  return (
    <main className="app-root">
      <h1>Generate JSON</h1>
      <p>Upload an audio file to generate JSON data (no 3D visualization).</p>

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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '0.5rem' }}>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(outputJson || JSON.stringify(analysis, null, 2))
                  // small visual feedback could be added later
                } catch (e) {
                  // fallback
                  const ta = document.createElement('textarea')
                  ta.value = outputJson || JSON.stringify(analysis, null, 2)
                  document.body.appendChild(ta)
                  ta.select()
                  try {
                    document.execCommand('copy')
                  } catch {}
                  document.body.removeChild(ta)
                }
              }}
            >
              Copy JSON
            </button>

            <button
              type="button"
              onClick={() => {
                const data = outputJson || JSON.stringify(analysis, null, 2)
                const blob = new Blob([data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'soundscape.json'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
              }}
            >
              Download .json
            </button>
          </div>

          <div className="output-json"><pre>{outputJson}</pre></div>
        </div>
      )}
    </main>
  )
}
