import { useEffect, useMemo, useState } from 'react'

// These constants hold relative paths to the packaged assets.
// In development (npm run dev inside package/), values come from .env.
// At export time, the packaging tool replaces the token strings directly
// in this file before bundling into the ZIP — .env is not included.
const AUDIO_PATH =
  import.meta.env.VITE_SOUNDSCAPE_AUDIO ?? '__SOUNDSCAPE_AUDIO__'
const DATA_PATH = import.meta.env.VITE_SOUNDSCAPE_DATA ?? '__SOUNDSCAPE_DATA__'
const METADATA_PATH =
  import.meta.env.VITE_SOUNDSCAPE_METADATA ?? '__SOUNDSCAPE_METADATA__'

function App() {
  const [status, setStatus] = useState('Loading package files...')
  const [metadata, setMetadata] = useState(null)
  const [pointCount, setPointCount] = useState(0)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [metadataResponse, dataResponse] = await Promise.all([
          fetch(METADATA_PATH),
          fetch(DATA_PATH),
        ])

        if (!metadataResponse.ok || !dataResponse.ok) {
          throw new Error('Failed to fetch package data files')
        }

        const metadataJson = await metadataResponse.json()
        const soundscapeData = await dataResponse.json()

        if (!active) return

        const points = soundscapeData.reduce((sum, row) => sum + row.length, 0)
        setPointCount(points)
        setMetadata(metadataJson)
        setStatus('Ready')
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unknown load error')
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const summary = useMemo(() => {
    if (!metadata) return null
    return {
      duration:
        typeof metadata.duration === 'number'
          ? metadata.duration.toFixed(2)
          : 'n/a',
      chunks: metadata.chunkCount ?? 'n/a',
      bins: metadata.binCount ?? 'n/a',
      sourceName: metadata.sourceFileName ?? 'n/a',
    }
  }, [metadata])

  return (
    <main className='app-shell'>
      <h1>Soundscape Package</h1>
      <p className='status'>Status: {status}</p>

      <audio controls src={AUDIO_PATH} className='audio-player'>
        Your browser does not support audio playback.
      </audio>

      {summary && (
        <section className='summary'>
          <h2>Generated Data</h2>
          <ul>
            <li>Source file: {summary.sourceName}</li>
            <li>Duration: {summary.duration}s</li>
            <li>Chunks: {summary.chunks}</li>
            <li>Bins per chunk: {summary.bins}</li>
            <li>Total points: {pointCount}</li>
          </ul>
        </section>
      )}
    </main>
  )
}

export default App
