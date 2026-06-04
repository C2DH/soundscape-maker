import React, { useRef, useState } from 'react'

export interface AudioInputProps {
  onAudioSelected?: (file: File) => void
}

const ACCEPTED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.aiff',
  '.aif',
  '.ogg',
  '.flac',
  '.mp4',
  '.caf',
]

export default function AudioInput({ onAudioSelected }: AudioInputProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return

    const fileName = file.name.toLowerCase()
    const hasAcceptedExtension = ACCEPTED_AUDIO_EXTENSIONS.some((extension) =>
      fileName.endsWith(extension),
    )
    const hasAudioMimeType = file.type.startsWith('audio/')
    const hasLikelyAudioMimeType =
      file.type === 'video/mp4' && fileName.endsWith('.m4a')

    if (!hasAudioMimeType && !hasLikelyAudioMimeType && !hasAcceptedExtension) {
      window.alert('Please select an audio file.')
      return
    }

    onAudioSelected?.(file)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    handleFile(file)
    event.target.value = ''
  }

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragEnter = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    const file = event.dataTransfer.files?.[0]
    handleFile(file)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLLabelElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <label
      className='audio-input-dropzone'
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      role='button'
      tabIndex={0}
      aria-label='Upload audio file'
      htmlFor='audio-input'
      style={{
        border: `2px dashed ${isDragOver ? '#646cff' : 'rgba(255,255,255,0.3)'}`,
        borderRadius: '12px',
        padding: '2rem 3rem',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragOver ? 'rgba(100, 108, 255, 0.1)' : 'transparent',
        transition: 'border-color 0.2s, background-color 0.2s',
        userSelect: 'none',
        width: '100%',
        maxWidth: '720px',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎵</div>
      <p style={{ margin: '0 0 0.25rem' }}>
        {isDragOver ? 'Drop your audio file here' : 'Drag & drop an audio file here'}
      </p>
      <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.6 }}>
        or click to browse
      </p>
      <input
        ref={inputRef}
        id='audio-input'
        type='file'
        accept='audio/*,.mp3,.m4a,.aac,.wav,.aiff,.aif,.ogg,.flac,.mp4,.caf'
        onChange={handleChange}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
    </label>
  )
}
