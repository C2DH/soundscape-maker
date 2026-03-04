import React from 'react'

type AudioInputProps = {
  onAudioSelected?: (file: File) => void
}

export default function AudioInput({ onAudioSelected }: AudioInputProps) {
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
      <label htmlFor="audio-input">Choose an audio file: </label>
      <input
        id="audio-input"
        type="file"
        accept="audio/*"
        onChange={handleChange}
      />
    </div>
  )
}
