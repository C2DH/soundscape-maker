/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Development mode: path to the audio files */
  readonly VITE_SOUNDSCAPE_AUDIO?: string
  /** Development mode: path to the data files */
  readonly VITE_SOUNDSCAPE_DATA?: string
  /** Development mode: path to the metadata files */
  readonly VITE_SOUNDSCAPE_METADATA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
