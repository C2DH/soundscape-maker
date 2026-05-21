import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import fft from 'fft-js'
import { Leva, button, folder, useControls } from 'leva'
import * as THREE from 'three'
import AudioInput from '../components/AudioInput'
import { SoundscapePreview } from '../components/SoundscapePreview'
import { buildAndDownloadSoundscapePackage } from '../utils/packageBuilder'

const STANDARD_NUM_CHUNKS = 200
const STANDARD_SOUNDSCAPE_LENGTH = 200

type AudioContextCtor = typeof AudioContext
type OfflineAudioContextCtor = typeof OfflineAudioContext
type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: AudioContextCtor
    webkitOfflineAudioContext?: OfflineAudioContextCtor
  }

async function analyseAudioFile(
  file: File,
  options?: { keepCount?: number; numChunks?: number },
): Promise<{ data: number[][]; duration: number }> {
  const keepCount = options?.keepCount ?? 48
  const numChunks = options?.numChunks ?? 200

  const arrayBuffer = await file.arrayBuffer()

  const audioWindow = window as AudioWindow
  const AudioCtx = audioWindow.AudioContext || audioWindow.webkitAudioContext
  if (!AudioCtx) {
    throw new Error('AudioContext is not available in this browser.')
  }
  const audioContext = new AudioCtx()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  // resampling/converting to mono 44100Hz before analysis.
  const targetSampleRate = 44100
  const targetChannels = 1

  let processedBuffer = audioBuffer
  if (
    audioBuffer.sampleRate !== targetSampleRate ||
    audioBuffer.numberOfChannels !== targetChannels
  ) {
    const OfflineCtx =
      audioWindow.OfflineAudioContext || audioWindow.webkitOfflineAudioContext
    if (!OfflineCtx) {
      throw new Error('OfflineAudioContext is not available in this browser.')
    }
    const offlineCtx = new OfflineCtx(
      targetChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate,
    )
    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineCtx.destination)
    source.start(0)
    processedBuffer = await offlineCtx.startRendering()
  }

  const channelData = processedBuffer.getChannelData(0)
  const totalSamples = channelData.length

  const fftSize = 1024
  const halfFFT = fftSize / 2
  const frequenciesPerChunk: number[][] = []

  const samplesPerChunk = Math.floor(totalSamples / numChunks)

  for (let i = 0; i < numChunks; i++) {
    const startSample = i * samplesPerChunk
    const endSample =
      i === numChunks - 1 ? totalSamples : (i + 1) * samplesPerChunk
    const segment = channelData.slice(startSample, endSample)

    const chunkFFTData: number[][] = []
    for (let j = 0; j < segment.length; j += fftSize) {
      const chunk = segment.slice(j, j + fftSize)
      const padded = new Float32Array(fftSize)
      padded.set(chunk)

      const phasors = fft.fft(padded)
      const magnitudes = (fft.util.fftMag(phasors) as number[]).slice(
        0,
        halfFFT,
      )

      chunkFFTData.push(magnitudes)
    }

    if (!chunkFFTData.length) continue

    const averaged = chunkFFTData[0].map(
      (_, idx) =>
        chunkFFTData.reduce((sum, arr) => sum + arr[idx], 0) /
        chunkFFTData.length,
    )

    const cropped = averaged.slice(0, keepCount)
    const padded = [0, ...cropped, 0]

    frequenciesPerChunk.push(extendArrays(padded))
  }

  if (!frequenciesPerChunk.length) {
    return { data: [], duration: processedBuffer.duration }
  }

  const arrayLength = frequenciesPerChunk[0].length
  const zeroArray = Array(arrayLength).fill(0)
  const outputData = [zeroArray, ...frequenciesPerChunk, zeroArray]

  return { data: outputData, duration: processedBuffer.duration }
}

function extendArrays(data: number[] = []) {
  const extended: number[] = []
  const amplifiedData = amplifyArray(data, 2)

  for (let i = 0; i < amplifiedData.length - 1; i++) {
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [generatedNumChunks, setGeneratedNumChunks] = useState(
    STANDARD_NUM_CHUNKS,
  )
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [
    {
      numChunks,
      amplifyFactor,
      soundscapeLength,
      reverseOutput,
      leftTopColor,
      leftBottomColor,
      rightTopColor,
      rightBottomColor,
      gradientLeftToRight,
    },
    setControls,
    getControls,
  ] = useControls('Soundscape Controls', () => ({
    Analysis: folder({
      numChunks: {
        value: STANDARD_NUM_CHUNKS,
        min: 50,
        max: 1000,
        step: 10,
      },
      soundscapeLength: {
        value: STANDARD_SOUNDSCAPE_LENGTH,
        min: 50,
        max: 1000,
        step: 10,
      },
      amplifyFactor: {
        value: 0.6,
        min: 0.01,
        max: 1.5,
        step: 0.01,
      },
      reverseOutput: false,
    }),
    Appearance: folder({
      leftTopColor: '#561577',
      leftBottomColor: '#2f0f45',
      rightTopColor: '#9632c8',
      rightBottomColor: '#5a1f7d',
      gradientLeftToRight: false,
    }),
  }))

  useControls('Soundscape Controls', {
    Actions: folder({
      swapGradientSides: button(() => {
        const currentLeftTopColor = getControls('leftTopColor')
        const currentLeftBottomColor = getControls('leftBottomColor')
        const currentRightTopColor = getControls('rightTopColor')
        const currentRightBottomColor = getControls('rightBottomColor')

        setControls({
          leftTopColor: currentRightTopColor,
          leftBottomColor: currentRightBottomColor,
          rightTopColor: currentLeftTopColor,
          rightBottomColor: currentLeftBottomColor,
        })
      }),
    }),
  })

  const handleAudioSelected = (file: File) => {
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
    setSelectedFile(file)

    // prepare audio element immediately so we can play later
    if (audioRef.current) {
      audioRef.current.pause()
    }
    audioRef.current = new Audio(url)
    audioRef.current.onended = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  const handleGenerate = async () => {
    if (!selectedFile) return
    setIsProcessing(true)
    setError(null)
    setOutputJson('')
    setAnalysis(null)
    setDuration(null)
    setCurrentTime(0)

    try {
      const { data, duration } = await analyseAudioFile(selectedFile, {
        numChunks,
      })
      setAnalysis(data)
      setDuration(duration)
      setGeneratedNumChunks(numChunks)
      setOutputJson(JSON.stringify(data, null, 2))
      // autoplay disabled: user will press play manually
      // (audioRef already prepared in handleAudioSelected)
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

  const handleSeek = useCallback((clickTime: number) => {
    if (audioRef.current && duration) {
      const seekTime = (clickTime / (analysis?.length || 1)) * duration
      if (reverseOutput === true){
        audioRef.current.currentTime = duration-Math.max(0, Math.min(seekTime, duration))
      }
      else{
        audioRef.current.currentTime = Math.max(0, Math.min(seekTime, duration))
      }
      
      setCurrentTime(audioRef.current.currentTime)
    }
  }, [analysis?.length, duration, reverseOutput])

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
  const appliedNumChunks = analysis ? generatedNumChunks : numChunks
  const zSpacing = soundscapeLength / Math.max(1, appliedNumChunks)

  const handleExport = async () => {
    if (!selectedFile || !analysis || duration === null) return

    setError(null)
    setIsExporting(true)

    try {
      await buildAndDownloadSoundscapePackage({
        sourceFile: selectedFile,
        analysis,
        duration,
      })
    } catch (e) {
      console.error(e)
      setError('Failed to export package.')
    } finally {
      setIsExporting(false)
    }
  }

  // scale raw data to reasonable height and also produce vectors
  const { soundLinesVectors, scaledLists } = useMemo(() => {
    if (!analysis)
      return {
        soundLinesVectors: [] as THREE.Vector3[][],
        scaledLists: [] as number[][],
      }
    // optionally amplify values; larger amplifyFactor should yield a taller model
    let tempAmplified = null
    if (reverseOutput === true) {
      tempAmplified = analysis.map((row) =>
        row.map((y) => Math.pow(y, amplifyFactor)),
      ).reverse()
    } else {
      tempAmplified = analysis.map((row) =>
        row.map((y) => Math.pow(y, amplifyFactor)),
      )
    }
    const amplified = tempAmplified
    // instead of normalizing to a constant height, simply multiply by an overall
    // constant so that increasing amplifyFactor makes the mesh visibly larger
    const baseHeight = 3 // adjust if the mesh is too tall/short
    const scaleFactor = amplifyFactor * baseHeight
    const zOffset = ((analysis.length || 0) - 1) * zSpacing * 0.5
    const scaled = amplified.map((row) => row.map((y) => y * scaleFactor))
    const vectors = scaled.map((row, t) =>
      row.map(
        (y, x) =>
          new THREE.Vector3(
            x - row.length / 2,
            y,
            t * zSpacing - zOffset,
          ),
      ),
    )
    if (reverseOutput === true) {
      return { soundLinesVectors: vectors.reverse(), scaledLists: scaled }
    } else {
      return { soundLinesVectors: vectors, scaledLists: scaled }
    }
  }, [amplifyFactor, analysis, reverseOutput, zSpacing])

  return (
    <main className='app-root'>
      <Leva collapsed={false} oneLineLabels />
      <h1>Generate JSON</h1>
      <p>
        Upload an audio file to generate JSON data and preview the resulting
        soundscape below.
      </p>

      <AudioInput onAudioSelected={handleAudioSelected} />

      <div
        style={{
          marginTop: '0.75rem',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <strong>Selected file:</strong>{' '}
          {selectedFile ? selectedFile.name : 'None'}
        </div>

        <button
          type='button'
          onClick={handleGenerate}
          disabled={!selectedFile || isProcessing}
        >
          Generate
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <button
          type='button'
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
        <div className='visual-section'>
          <SoundscapePreview
            soundLinesVectors={soundLinesVectors}
            scaledLists={scaledLists}
            zSpacing={zSpacing}
            currentTime={currentTime}
            duration={duration || 1}
            onSeek={handleSeek}
            reverseOutput={reverseOutput}
            leftTopColor={leftTopColor}
            leftBottomColor={leftBottomColor}
            rightTopColor={rightTopColor}
            rightBottomColor={rightBottomColor}
            gradientLeftToRight={gradientLeftToRight}
          />
          <div
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}
          >
            <button
              type='button'
              onClick={handleExport}
              disabled={
                !analysis || !selectedFile || duration === null || isExporting
              }
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>

          <div className='output-json'>
            <pre>{outputJson}</pre>
          </div>
        </div>
      )}
    </main>
  )
}
