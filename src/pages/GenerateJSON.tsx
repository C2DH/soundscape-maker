import { useEffect, useRef, useState } from 'react'
import fft from 'fft-js'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { Mesh } from 'three'

// ex-frontend stores (use Scene.tsx as reference)
import { useThemeStore as exUseThemeStore, useMeshStore as exUseMeshStore, useOrbitStore as exUseOrbitStore } from '../../ex-frontend/src/store'

// lightweight mobile check (avoids adding `react-device-detect` dependency)
const isMobile = typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)
import AudioInput from '../components/AudioInput'
import AudioVisualizer from '../components/AudioVisualizer'
import SoundScape from '../components/SoundScape'
 

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


  // resampling/converting to mono 44100Hz before analysis.
  const targetSampleRate = 44100
  const targetChannels = 1

  let processedBuffer = audioBuffer
  if (audioBuffer.sampleRate !== targetSampleRate || audioBuffer.numberOfChannels !== targetChannels) {
    const OfflineCtx = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext || (window as any).OfflineAudioContext
    const offlineCtx = new OfflineCtx(targetChannels, Math.ceil(audioBuffer.duration * targetSampleRate), targetSampleRate)
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
  const [numChunks, setNumChunks] = useState<number>(200)
  const [amplifyFactor, setAmplifyFactor] = useState<number>(0.6)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
      const { data, duration } = await analyseAudioFile(selectedFile, { numChunks })
      setAnalysis(data)
      setDuration(duration)
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

  // scale raw data to reasonable height and also produce vectors
  const { soundLinesVectors, scaledLists } = (() => {
    if (!analysis) return { soundLinesVectors: [] as THREE.Vector3[][], scaledLists: [] as number[][] }
    // optionally amplify values; larger amplifyFactor should yield a taller model
    const amplified = analysis.map((row) => row.map((y) => Math.pow(y, amplifyFactor)))
    // instead of normalizing to a constant height, simply multiply by an overall
    // constant so that increasing amplifyFactor makes the mesh visibly larger
    const baseHeight = 3         // adjust if the mesh is too tall/short
    const scaleFactor = amplifyFactor * baseHeight
    const scaled = amplified.map((row) => row.map((y) => y * scaleFactor))
    const vectors = scaled.map((row, t) =>
      row.map((y, x) =>
        new THREE.Vector3(
          x - row.length / 2,
          y,
          t - Math.floor((analysis.length || 0) / 2),
        ),
      ),
    )
    return { soundLinesVectors: vectors, scaledLists: scaled }
  })()

  // estimate maximum height from scaledLists for light placement
  const modelHeight = scaledLists.length ? Math.max(...scaledLists.flat()) : 0

  // compute adaptive light positions so lights follow amplify changes in real-time
  // base offsets ensure lights remain above the mesh even when modelHeight is small
  const baseLightOffset = 50
  const lightY = baseLightOffset + modelHeight * 2 + amplifyFactor * 20
  const lightXOffset = Math.max(20, modelHeight * 2)

  // Scene refs and ex-frontend store wiring (copying Scene.tsx behavior)
  const meshRef = useRef<Mesh | null>(null)
  const orbitRef = useRef<any>(null)
  const setMesh = exUseMeshStore((s) => s.setMesh)
  const setOrbit = exUseOrbitStore((s) => s.setOrbit)
  const cameraPos = exUseOrbitStore((s) => s.cameraPos)
  const target = exUseOrbitStore((s) => s.target)
  const gridColor = exUseThemeStore((s) => s.colors['--light'])

  useEffect(() => {
    if (meshRef.current) {
      setMesh(meshRef.current)
    }
  }, [meshRef.current])

  useEffect(() => {
    if (meshRef.current && orbitRef.current) {
      const controls = orbitRef.current
      setOrbit(
        controls.object.position.toArray() as [number, number, number],
        controls.target.toArray() as [number, number, number],
      )
    }
  }, [meshRef.current, orbitRef.current])

  return (
    <main className="app-root">
      <h1>Generate JSON</h1>
      <p>Upload an audio file to generate JSON data and preview the resulting soundscape below.</p>

      <AudioInput onAudioSelected={handleAudioSelected} />

      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <strong>Selected file:</strong> {selectedFile ? selectedFile.name : 'None'}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>numChunks:</span>
          <input
            type="number"
            value={numChunks}
            min={1}
            onChange={(e) => setNumChunks(Math.max(1, Number(e.target.value) || 1))}
            style={{ width: 120 }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>amplify:</span>
          <input
            type="number"
            value={amplifyFactor}
            step="0.1"
            min={0}
            onChange={(e) => setAmplifyFactor(Number(e.target.value) || 0)}
            style={{ width: 120 }}
          />
        </label>

        <button type="button" onClick={handleGenerate} disabled={!selectedFile || isProcessing}>
          Generate
        </button>
      </div>

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
          {/* 3D preview canvas */}
          <div style={{ width: '100%', height: '400px', marginBottom: '1rem' }}>
            <Canvas
              shadows
              camera={{ position: [300, 200, 150], fov: 20, far: 1500, near: 0.1, zoom: isMobile ? 0.5 : 1 }}
              touch-action="none"
            >
              {/* Scene.tsx-style OrbitControls + Grid wired to ex-frontend stores */}
              {/* mesh and orbit stores used to mirror Scene behavior */}
              {/* meshRef and orbitRef will be set below */}
              
              <OrbitControls
                ref={orbitRef}
                minDistance={isMobile ? 120 : 40}
                maxDistance={isMobile ? 700 : 600}
                target={target}
                minPolarAngle={0}
                maxPolarAngle={Math.PI / 2}
              />

              <group>
                <SoundScape ref={meshRef as any} lists={scaledLists as any} position={[0, 0, 0]} />
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

              {/* highlight/progress lines on top */}
              <AudioVisualizer
                soundLinesVectors={soundLinesVectors as any}
                currentTime={currentTime}
                duration={duration || 1}
              />

              {/* OrbitControls already instantiated above */}
            </Canvas>
          </div>
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
