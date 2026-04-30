import { useEffect, useState } from 'react'
import type { MessageImage } from '../adapters/types'
import { dataUrlToBlob } from '../utils/image'

const PREVIEW_MAX_SIDE = 1440
const PREVIEW_TRIGGER_URL_LENGTH = 240000
const previewCache = new Map<string, string>()
const previewTasks = new Map<string, Promise<string>>()

function canOptimizeImage(image: MessageImage) {
  return (
    image.source === 'output' &&
    image.url.startsWith('data:image/') &&
    image.url.length >= PREVIEW_TRIGGER_URL_LENGTH
  )
}

function blobToObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('预览图生成失败。'))
          return
        }

        resolve(blob)
      },
      type,
      quality,
    )
  })
}

async function createPreviewUrl(image: MessageImage) {
  if (!canOptimizeImage(image) || typeof window === 'undefined' || !('createImageBitmap' in window)) {
    return image.url
  }

  const bitmap = await createImageBitmap(dataUrlToBlob(image.url))
  const longestSide = Math.max(bitmap.width, bitmap.height)

  if (longestSide <= PREVIEW_MAX_SIDE) {
    bitmap.close()
    return image.url
  }

  const scale = PREVIEW_MAX_SIDE / longestSide
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  if (!context) {
    bitmap.close()
    return image.url
  }

  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const previewBlob = await canvasToBlob(canvas, 'image/webp', 0.86)
  return blobToObjectUrl(previewBlob)
}

async function resolvePreviewUrl(image: MessageImage) {
  const cachedPreview = previewCache.get(image.url)

  if (cachedPreview) {
    return cachedPreview
  }

  const runningTask = previewTasks.get(image.url)

  if (runningTask) {
    return runningTask
  }

  const nextTask = createPreviewUrl(image)
    .then((previewUrl) => {
      previewCache.set(image.url, previewUrl)
      previewTasks.delete(image.url)
      return previewUrl
    })
    .catch((error) => {
      previewTasks.delete(image.url)
      throw error
    })

  previewTasks.set(image.url, nextTask)
  return nextTask
}

interface RenderableImageProps {
  className: string
  image: MessageImage
  priority?: boolean
}

export function RenderableImage({
  className,
  image,
  priority = false,
}: RenderableImageProps) {
  const [displayUrl, setDisplayUrl] = useState(() =>
    canOptimizeImage(image) ? '' : image.url,
  )

  useEffect(() => {
    let cancelled = false

    if (!canOptimizeImage(image)) {
      return () => {
        cancelled = true
      }
    }

    void resolvePreviewUrl(image)
      .then((previewUrl) => {
        if (!cancelled) {
          setDisplayUrl(previewUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayUrl(image.url)
        }
      })

    return () => {
      cancelled = true
    }
  }, [image])

  if (!displayUrl) {
    return (
      <div
        className={`image-placeholder ${className}`}
        style={{ aspectRatio: image.width && image.height ? `${image.width} / ${image.height}` : '16 / 9' }}
      />
    )
  }

  return (
    <img
      alt={image.alt}
      className={className}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      loading={priority ? 'eager' : 'lazy'}
      src={displayUrl}
    />
  )
}
