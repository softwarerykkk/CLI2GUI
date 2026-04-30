import {
  FIXED_IMAGE_COUNT,
  FIXED_IMAGE_OUTPUT_FORMAT,
  FIXED_IMAGE_QUALITY,
  FIXED_IMAGE_SIZE,
  FIXED_MODEL,
} from '../config/runtime'
import { base64ToObjectUrl, createOutputImage, dataUrlToBlob } from '../utils/image'
import { requestUpstream } from '../utils/upstream'
import type {
  ApiConfig,
  ChatAdapter,
  ChatMessage,
  StreamChunk,
} from './types'

type ImageApiResponse = {
  data?: Array<{
    b64_json?: string
    revised_prompt?: string
    url?: string
  }>
  error?: {
    message?: string
  }
  message?: string
}

function normalizePackyBaseUrl(baseUrl: string) {
  return baseUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/v1\/images\/generations$/, '')
    .replace(/\/images\/generations$/, '')
    .replace(/\/v1\/images\/edits$/, '')
    .replace(/\/images\/edits$/, '')
}

function buildImagesUrl(baseUrl: string, path: 'edits' | 'generations') {
  const normalizedBaseUrl = normalizePackyBaseUrl(baseUrl)

  if (normalizedBaseUrl.endsWith('/v1')) {
    return `${normalizedBaseUrl}/images/${path}`
  }

  return `${normalizedBaseUrl}/v1/images/${path}`
}

function createJsonHeaders(config: ApiConfig) {
  return {
    Accept: '*/*',
    Authorization: `Bearer ${config.apiKey.trim()}`,
    'Content-Type': 'application/json',
  }
}

function createUploadHeaders(config: ApiConfig) {
  return {
    Accept: '*/*',
    Authorization: `Bearer ${config.apiKey.trim()}`,
  }
}

function getLatestUserMessage(messages: ChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user') ?? null
}

function createBaseRequest(prompt: string) {
  return {
    model: FIXED_MODEL,
    n: FIXED_IMAGE_COUNT,
    output_format: FIXED_IMAGE_OUTPUT_FORMAT,
    prompt,
    quality: FIXED_IMAGE_QUALITY,
    size: FIXED_IMAGE_SIZE,
  }
}

function createImageEditFormData(
  message: ChatMessage,
  imageFieldName: 'image' | 'image[]' = 'image[]',
) {
  const prompt = message.content.trim()
  const sourceImage = message.images[0]

  if (!sourceImage) {
    throw new Error('图生图模式缺少输入图片。')
  }

  const formData = new FormData()
  const filename = sourceImage.name?.trim() || `input.${FIXED_IMAGE_OUTPUT_FORMAT}`

  formData.append('model', FIXED_MODEL)
  formData.append('prompt', prompt)
  formData.append('size', FIXED_IMAGE_SIZE)
  formData.append('quality', FIXED_IMAGE_QUALITY)
  formData.append('output_format', FIXED_IMAGE_OUTPUT_FORMAT)
  formData.append('n', String(FIXED_IMAGE_COUNT))
  formData.append(imageFieldName, dataUrlToBlob(sourceImage.url), filename)

  return formData
}

function parseImageResponse(payload: ImageApiResponse) {
  const item = payload.data?.find(
    (candidate) =>
      typeof candidate?.b64_json === 'string' || typeof candidate?.url === 'string',
  )

  if (!item) {
    return null
  }

  if (typeof item.b64_json === 'string' && item.b64_json.length > 0) {
    return createOutputImage(
      base64ToObjectUrl(item.b64_json, `image/${FIXED_IMAGE_OUTPUT_FORMAT}`),
    )
  }

  if (typeof item.url === 'string' && item.url.length > 0) {
    return createOutputImage(item.url)
  }

  return null
}

async function parseErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as ImageApiResponse

    return payload.error?.message ?? payload.message ?? `请求失败 (${response.status})`
  } catch {
    return `请求失败 (${response.status})`
  }
}

async function requestImageEdit(
  message: ChatMessage,
  config: ApiConfig,
  signal?: AbortSignal,
) {
  const fieldNames: Array<'image' | 'image[]'> = ['image[]', 'image']
  let latestResponse: Response | null = null

  for (const fieldName of fieldNames) {
    const response = await requestUpstream({
      body: createImageEditFormData(message, fieldName),
      bodyType: 'form-data',
      config,
      headers: createUploadHeaders(config),
      method: 'POST',
      signal,
      url: buildImagesUrl(config.baseUrl, 'edits'),
    })

    latestResponse = response

    if (
      response.ok ||
      ![400, 415, 422].includes(response.status) ||
      fieldName === fieldNames.at(-1)
    ) {
      return response
    }
  }

  if (!latestResponse) {
    throw new Error('图生图请求未能发出。')
  }

  return latestResponse
}

export const openAiAdapter: ChatAdapter = {
  async *sendMessage(messages, config, signal): AsyncGenerator<StreamChunk> {
    const userMessage = getLatestUserMessage(messages)

    if (!userMessage) {
      throw new Error('没有找到本次要提交的用户输入。')
    }

    const prompt = userMessage.content.trim()

    if (!prompt) {
      throw new Error('请输入提示词后再生成图片。')
    }

    const response =
      userMessage.images.length > 0
        ? await requestImageEdit(userMessage, config, signal)
        : await requestUpstream({
            body: {
              ...createBaseRequest(prompt),
              response_format: 'b64_json',
            },
            config,
            headers: createJsonHeaders(config),
            method: 'POST',
            signal,
            url: buildImagesUrl(config.baseUrl, 'generations'),
          })

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response))
    }

    const payload = (await response.json()) as ImageApiResponse
    const image = parseImageResponse(payload)

    if (!image) {
      throw new Error('接口没有返回可渲染的图片。')
    }

    yield { image, type: 'image' }
    yield { type: 'done' }
  },
}
