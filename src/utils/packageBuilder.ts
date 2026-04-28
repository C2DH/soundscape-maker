import JSZip from 'jszip'
import { getPackageTemplateFiles } from './packageTemplate'

export interface BuildSoundscapePackageInput {
  sourceFile: File
  analysis: number[][]
  duration: number
}

interface PackageMetadata {
  sourceFileName: string
  exportedAudioPath: string
  duration: number
  chunkCount: number
  binCount: number
  generatedAt: string
}

export async function buildAndDownloadSoundscapePackage(
  input: BuildSoundscapePackageInput,
) {
  const audioFileName = sanitizeFileName(input.sourceFile.name)
  const packageName = toPackageName(input.sourceFile.name)

  const zip = new JSZip()

  const metadata: PackageMetadata = {
    sourceFileName: input.sourceFile.name,
    exportedAudioPath: `audio/${audioFileName}`,
    duration: input.duration,
    chunkCount: input.analysis.length,
    binCount: input.analysis[0]?.length ?? 0,
    generatedAt: new Date().toISOString(),
  }

  const tokens = {
    __SOUNDSCAPE_AUDIO__: `./${metadata.exportedAudioPath}`,
    __SOUNDSCAPE_DATA__: './data/soundscape.json',
    __SOUNDSCAPE_METADATA__: './data/metadata.json',
  }

  for (const file of getPackageTemplateFiles(tokens)) {
    zip.file(file.path, file.content)
  }

  zip.file(metadata.exportedAudioPath, input.sourceFile)
  zip.file('data/soundscape.json', JSON.stringify(input.analysis, null, 2))
  zip.file('data/metadata.json', JSON.stringify(metadata, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${packageName}.zip`)
}

function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return sanitized || 'audio.mp3'
}

function toPackageName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, '')
  const normalized = sanitizeFileName(withoutExtension).toLowerCase()
  return normalized ? `${normalized}-soundscape-package` : 'soundscape-package'
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
