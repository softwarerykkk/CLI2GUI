import type { MessageImage } from '../adapters/types'

const MAX_IMAGE_DIMENSION = 1600
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function createImageId() {
  return crypto.randomUUID()
}

function ensureImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error(`文件 ${file.name} 不是图片。`)
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error(`读取图片 ${file.name} 失败。`))
    }

    reader.onerror = () => reject(new Error(`读取图片 ${file.name} 失败。`))
    reader.readAsDataURL(file)
  })
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败。'))
    image.src = url
  })
}

async function maybeCompressImage(
  file: File,
  dataUrl: string,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const image = await loadImage(dataUrl)
  const needsResize =
    image.width > MAX_IMAGE_DIMENSION || image.height > MAX_IMAGE_DIMENSION

  if (!needsResize && file.size <= MAX_IMAGE_BYTES) {
    return {
      dataUrl,
      width: image.width,
      height: image.height,
    }
  }

  const scale = Math.min(
    MAX_IMAGE_DIMENSION / image.width,
    MAX_IMAGE_DIMENSION / image.height,
    1,
  )
  const width = Math.round(image.width * scale)
  const height = Math.round(image.height * scale)
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('浏览器不支持图片压缩。')
  }

  context.drawImage(image, 0, 0, width, height)

  const compressedDataUrl = canvas.toDataURL(
    file.type === 'image/png' ? 'image/png' : 'image/jpeg',
    0.88,
  )

  return {
    dataUrl: compressedDataUrl,
    width,
    height,
  }
}

export function dataUrlToBase64(dataUrl: string) {
  const [, base64 = ''] = dataUrl.split(',', 2)
  return base64
}

export function base64ToBlob(base64: string, mimeType: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

export function dataUrlToBlob(dataUrl: string) {
  const mimeType = getMimeTypeFromDataUrl(dataUrl)
  return base64ToBlob(dataUrlToBase64(dataUrl), mimeType)
}

export function base64ToObjectUrl(base64: string, mimeType: string) {
  return URL.createObjectURL(base64ToBlob(base64, mimeType))
}

export function getMimeTypeFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)[;,]/)
  return match?.[1] ?? 'image/png'
}

export function isRenderableImageUrl(value: string) {
  return (
    value.startsWith('blob:') ||
    value.startsWith('data:image/') ||
    /^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)(?:\?\S*)?$/i.test(value)
  )
}

export async function fileToMessageImage(file: File): Promise<MessageImage> {
  ensureImageFile(file)

  const rawDataUrl = await fileToDataUrl(file)
  const { dataUrl, width, height } = await maybeCompressImage(file, rawDataUrl)

  return {
    id: createImageId(),
    alt: file.name,
    mimeType: getMimeTypeFromDataUrl(dataUrl),
    name: file.name,
    size: file.size,
    source: 'input',
    url: dataUrl,
    width,
    height,
  }
}

export async function collectMessageImages(files: File[] | FileList) {
  const selectedFiles = Array.from(files).filter((file) =>
    file.type.startsWith('image/'),
  )

  return Promise.all(selectedFiles.map((file) => fileToMessageImage(file)))
}

function dedupeByUrl(images: MessageImage[]) {
  const seen = new Set<string>()

  return images.filter((image) => {
    if (seen.has(image.url)) {
      return false
    }

    seen.add(image.url)
    return true
  })
}

export function createOutputImage(url: string): MessageImage {
  return {
    id: createImageId(),
    alt: '模型返回图片',
    mimeType: url.startsWith('data:image/')
      ? getMimeTypeFromDataUrl(url)
      : url.startsWith('blob:')
        ? 'image/png'
        : 'image/*',
    source: 'output',
    url,
  }
}

export function revokeMessageImages(images: MessageImage[]) {
  images.forEach((image) => {
    if (image.url.startsWith('blob:')) {
      URL.revokeObjectURL(image.url)
    }
  })
}

export function extractStandaloneImages(text: string) {
  const withoutMarkdownImages = text.replace(/!\[[^\]]*]\(([^)]+)\)/g, '')
  const matches = withoutMarkdownImages.match(
    /(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\n\r]+|https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)(?:\?\S*)?)/gi,
  )

  if (!matches) {
    return []
  }

  return dedupeByUrl(
    matches
      .map((match) => match.trim())
      .filter((match) => isRenderableImageUrl(match))
      .map((match) => createOutputImage(match)),
  )
}

export function stripStandaloneImageLines(text: string) {
  const filteredLines = text.split('\n').filter((line) => {
    const trimmed = line.trim()

    return trimmed.length === 0 || !isRenderableImageUrl(trimmed)
  })

  return filteredLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function mergeImages(...imageCollections: MessageImage[][]) {
  return dedupeByUrl(imageCollections.flat())
}
