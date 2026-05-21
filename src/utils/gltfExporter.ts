import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

export interface ExportSoundscapeGltfInput {
  lists: number[][]
  zSpacing: number
  fileName: string
  leftTopColor: string
  leftBottomColor: string
  rightTopColor: string
  rightBottomColor: string
  gradientLeftToRight: boolean
}

export async function exportSoundscapeAsGltf(
  input: ExportSoundscapeGltfInput,
) {
  const exportGeometry = buildSoundscapeGeometry(input.lists, input.zSpacing)
  exportGeometry.computeBoundingBox()
  exportGeometry.computeVertexNormals()

  const positionAttribute = exportGeometry.getAttribute(
    'position',
  ) as THREE.BufferAttribute | undefined

  if (!positionAttribute || !exportGeometry.boundingBox) {
    throw new Error('The soundscape mesh has no exportable geometry.')
  }

  const bbox = exportGeometry.boundingBox
  const bboxWidth = Math.max(bbox.max.x - bbox.min.x, 0.0001)
  const bboxDepth = Math.max(bbox.max.z - bbox.min.z, 0.0001)
  const bboxHeight = Math.max(bbox.max.y - bbox.min.y, 0.0001)

  const leftTop = new THREE.Color(input.leftTopColor)
  const leftBottom = new THREE.Color(input.leftBottomColor)
  const rightTop = new THREE.Color(input.rightTopColor)
  const rightBottom = new THREE.Color(input.rightBottomColor)
  const tempLeft = new THREE.Color()
  const tempRight = new THREE.Color()
  const tempFinal = new THREE.Color()
  const colors = new Float32Array(positionAttribute.count * 3)

  for (let index = 0; index < positionAttribute.count; index += 1) {
    const x = positionAttribute.getX(index)
    const y = positionAttribute.getY(index)
    const z = positionAttribute.getZ(index)

    const normalizedWidth = THREE.MathUtils.clamp(
      (x - bbox.min.x) / bboxWidth,
      0,
      1,
    )
    const normalizedDepth = THREE.MathUtils.clamp(
      (z - bbox.min.z) / bboxDepth,
      0,
      1,
    )
    const normalizedHeight = THREE.MathUtils.clamp(
      (y - bbox.min.y) / bboxHeight,
      0,
      1,
    )

    const horizontalBlend = input.gradientLeftToRight
      ? normalizedWidth
      : 1 - normalizedDepth

    tempLeft.copy(leftBottom).lerp(leftTop, normalizedHeight)
    tempRight.copy(rightBottom).lerp(rightTop, normalizedHeight)
    tempFinal.copy(tempLeft).lerp(tempRight, horizontalBlend)

    colors[index * 3] = tempFinal.r
    colors[index * 3 + 1] = tempFinal.g
    colors[index * 3 + 2] = tempFinal.b
  }

  exportGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const exportMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.55,
    metalness: 0.05,
  })

  const exportMesh = new THREE.Mesh(exportGeometry, exportMaterial)
  exportMesh.name = 'Soundscape'

  const exportScene = new THREE.Scene()
  exportScene.add(exportMesh)

  const exporter = new GLTFExporter()
  const result = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      exportScene,
      (output) => {
        if (output instanceof ArrayBuffer) {
          resolve(output)
          return
        }
        reject(new Error('Expected binary glTF export output.'))
      },
      (error) => {
        reject(error instanceof Error ? error : new Error(String(error)))
      },
      { binary: true },
    )
  })

  downloadBlob(new Blob([result], { type: 'model/gltf-binary' }), input.fileName)

  exportGeometry.dispose()
  exportMaterial.dispose()
}

function buildSoundscapeGeometry(lists: number[][], zSpacing: number) {
  const timeLength = lists.length
  const listLength = lists[0]?.length ?? 0
  const vertices: number[] = []
  const indices: number[] = []
  const xCenter = listLength / 2
  const zCenter = ((timeLength - 1) * zSpacing) / 2

  for (let t = 0; t < timeLength; t += 1) {
    const yList = lists[t]
    for (let x = 0; x < listLength; x += 1) {
      vertices.push(x - xCenter, yList[x], t * zSpacing - zCenter)
    }
  }

  for (let t = 0; t < timeLength - 1; t += 1) {
    for (let x = 0; x < listLength - 1; x += 1) {
      const a = t * listLength + x
      const b = a + 1
      const c = a + listLength
      const d = c + 1
      indices.push(a, b, c)
      indices.push(b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  return geometry
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
