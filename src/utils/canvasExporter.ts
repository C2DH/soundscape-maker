import * as THREE from 'three'

const SCREEN_DPI = 96

export interface ExportHighQualityCanvasInput {
  sourceCanvas: HTMLCanvasElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  fileName?: string
  targetDpi?: number
}

export async function exportHighQualityCanvas(
  input: ExportHighQualityCanvasInput,
) {
  const {
    sourceCanvas,
    renderer: sourceRenderer,
    scene,
    camera,
    fileName = 'soundscape-print.png',
    targetDpi = 300,
  } = input

  const sourceWidth = sourceCanvas.clientWidth || sourceCanvas.width
  const sourceHeight = sourceCanvas.clientHeight || sourceCanvas.height

  if (!sourceWidth || !sourceHeight) {
    throw new Error('The soundscape preview is not ready to export.')
  }

  const scaleFactor = targetDpi / SCREEN_DPI
  const targetWidth = Math.max(1, Math.round(sourceWidth * scaleFactor))
  const targetHeight = Math.max(1, Math.round(sourceHeight * scaleFactor))
  const offScreenCanvas = document.createElement('canvas')
  const offScreenRenderer = new THREE.WebGLRenderer({
    canvas: offScreenCanvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })
  const exportCamera = camera.clone()

  try {
    offScreenRenderer.setPixelRatio(1)
    offScreenRenderer.setSize(targetWidth, targetHeight, false)
    offScreenRenderer.outputColorSpace = sourceRenderer.outputColorSpace
    offScreenRenderer.toneMapping = sourceRenderer.toneMapping
    offScreenRenderer.toneMappingExposure = sourceRenderer.toneMappingExposure
    offScreenRenderer.shadowMap.enabled = sourceRenderer.shadowMap.enabled
    offScreenRenderer.shadowMap.type = sourceRenderer.shadowMap.type
    offScreenRenderer.setClearColor(
      sourceRenderer.getClearColor(new THREE.Color()),
      sourceRenderer.getClearAlpha(),
    )

    updateCameraProjection(exportCamera, targetWidth, targetHeight)
    offScreenRenderer.render(scene, exportCamera)

    const outputCanvas = composeCanvasWithBackground(
      offScreenCanvas,
      sourceCanvas.parentElement,
    )
    const blob = await canvasToBlob(outputCanvas)
    downloadBlob(blob, fileName)

    if (outputCanvas !== offScreenCanvas) {
      outputCanvas.width = 0
      outputCanvas.height = 0
    }
  } finally {
    offScreenRenderer.dispose()
    offScreenRenderer.forceContextLoss()
    offScreenCanvas.width = 0
    offScreenCanvas.height = 0
  }
}

function updateCameraProjection(
  camera: THREE.Camera,
  width: number,
  height: number,
) {
  if (camera instanceof THREE.PerspectiveCamera) {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    return
  }

  if (camera instanceof THREE.OrthographicCamera) {
    const aspect = width / height
    const currentHeight = camera.top - camera.bottom
    const halfWidth = (currentHeight * aspect) / 2
    camera.left = -halfWidth
    camera.right = halfWidth
    camera.updateProjectionMatrix()
  }
}

function composeCanvasWithBackground(
  renderedCanvas: HTMLCanvasElement,
  container: HTMLElement | null,
) {
  const backgroundColor = container
    ? window.getComputedStyle(container).backgroundColor
    : ''

  if (
    !backgroundColor ||
    backgroundColor === 'transparent' ||
    backgroundColor === 'rgba(0, 0, 0, 0)'
  ) {
    return renderedCanvas
  }

  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = renderedCanvas.width
  outputCanvas.height = renderedCanvas.height

  const context = outputCanvas.getContext('2d')
  if (!context) {
    throw new Error('Could not get 2D context for canvas export.')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.fillStyle = backgroundColor
  context.fillRect(0, 0, outputCanvas.width, outputCanvas.height)
  context.drawImage(renderedCanvas, 0, 0)

  return outputCanvas
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas to Blob conversion failed.'))
        return
      }

      resolve(blob)
    }, 'image/png', 1)
  })
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 100)
}
