import type { ApiConfig } from '../adapters/types'

type RequestBodyType = 'form-data' | 'json'

interface UpstreamRequestOptions {
  body?: unknown
  bodyType?: RequestBodyType
  config: ApiConfig
  headers?: Record<string, string>
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT'
  signal?: AbortSignal
  stream?: boolean
  url: string
}

interface SerializedFormField {
  filename?: string
  kind: 'file' | 'text'
  mimeType?: string
  name: string
  value: string
}

interface SerializedFormDataBody {
  fields: SerializedFormField[]
  type: 'form-data'
}

interface DesktopBridgeResponse {
  bodyBase64: string
  headers: Record<string, string>
  status: number
}

function normalizeProxyUrl(proxyUrl: string) {
  return proxyUrl.trim().replace(/\/+$/, '')
}

function redactHeaders(headers: Record<string, string>) {
  const nextHeaders = { ...headers }

  if (nextHeaders.Authorization) {
    nextHeaders.Authorization = 'Bearer ***'
  }

  if (nextHeaders.authorization) {
    nextHeaders.authorization = 'Bearer ***'
  }

  if (nextHeaders['x-api-key']) {
    nextHeaders['x-api-key'] = '***'
  }

  return nextHeaders
}

function logRequest(label: string, payload: unknown) {
  if (!import.meta.env.DEV) {
    return
  }

  console.debug(label, payload)
}

function createRequestBody(body: unknown, bodyType: RequestBodyType) {
  if (body === undefined || body === null) {
    return undefined
  }

  if (bodyType === 'form-data') {
    return body as FormData
  }

  return typeof body === 'string' ? body : JSON.stringify(body)
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }

  return btoa(binary)
}

async function serializeFormDataBody(formData: FormData): Promise<SerializedFormDataBody> {
  const fields: SerializedFormField[] = []

  for (const [name, value] of formData.entries()) {
    if (typeof value === 'string') {
      fields.push({
        kind: 'text',
        name,
        value,
      })
      continue
    }

    fields.push({
      filename: 'name' in value && typeof value.name === 'string' ? value.name : 'upload.bin',
      kind: 'file',
      mimeType: value.type || 'application/octet-stream',
      name,
      value: arrayBufferToBase64(await value.arrayBuffer()),
    })
  }

  return {
    fields,
    type: 'form-data',
  }
}

async function serializeBodyForProxy(body: unknown, bodyType: RequestBodyType) {
  if (body === undefined || body === null) {
    return null
  }

  if (bodyType === 'form-data') {
    return serializeFormDataBody(body as FormData)
  }

  return body
}

export function shouldUseProxy(config: ApiConfig) {
  return config.connectionMode === 'proxy'
}

function shouldUseDesktopBridge() {
  return typeof window !== 'undefined' && typeof window.desktopBridge?.requestUpstream === 'function'
}

async function requestViaDesktopBridge(
  options: UpstreamRequestOptions,
  serializedBody: unknown,
) {
  const result = (await window.desktopBridge!.requestUpstream({
    bodyType: options.bodyType ?? 'json',
    stream: options.stream ?? false,
    upstreamBody: serializedBody,
    upstreamHeaders: options.headers ?? {},
    upstreamMethod: options.method ?? 'GET',
    upstreamUrl: options.url,
  })) as DesktopBridgeResponse

  return new Response(base64ToUint8Array(result.bodyBase64), {
    headers: result.headers,
    status: result.status,
  })
}

async function requestViaProxy(
  proxyUrl: string,
  options: UpstreamRequestOptions,
  serializedBody: unknown,
) {
  logRequest('[CLI2GUI] proxy request', {
    body: options.bodyType === 'form-data' ? '[form-data]' : options.body,
    bodyType: options.bodyType ?? 'json',
    headers: redactHeaders(options.headers ?? {}),
    method: options.method ?? 'GET',
    proxyUrl: `${normalizeProxyUrl(proxyUrl)}/proxy`,
    stream: options.stream ?? false,
    upstreamUrl: options.url,
  })

  return fetch(`${normalizeProxyUrl(proxyUrl)}/proxy`, {
    body: JSON.stringify({
      stream: options.stream ?? false,
      upstreamBody: serializedBody,
      upstreamBodyType: options.bodyType ?? 'json',
      upstreamHeaders: options.headers ?? {},
      upstreamMethod: options.method ?? 'GET',
      upstreamUrl: options.url,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal: options.signal,
  })
}

export async function requestUpstream({
  body,
  bodyType = 'json',
  config,
  headers = {},
  method = 'GET',
  signal,
  stream = false,
  url,
}: UpstreamRequestOptions) {
  const serializedBody = await serializeBodyForProxy(body, bodyType)

  if (shouldUseDesktopBridge()) {
    logRequest('[CLI2GUI] desktop request', {
      body: bodyType === 'form-data' ? '[form-data]' : body,
      bodyType,
      headers: redactHeaders(headers),
      method,
      stream,
      url,
    })

    return requestViaDesktopBridge(
      {
        body,
        bodyType,
        config,
        headers,
        method,
        signal,
        stream,
        url,
      },
      serializedBody,
    )
  }

  if (!shouldUseProxy(config)) {
    logRequest('[CLI2GUI] direct request', {
      body: bodyType === 'form-data' ? '[form-data]' : body,
      bodyType,
      headers: redactHeaders(headers),
      method,
      stream,
      url,
    })

    try {
      return await fetch(url, {
        body: createRequestBody(body, bodyType),
        headers,
        method,
        signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }

      return requestViaProxy(
        config.proxyUrl,
        {
          body,
          bodyType,
          config,
          headers,
          method,
          signal,
          stream,
          url,
        },
        serializedBody,
      )
    }
  }

  return requestViaProxy(
    config.proxyUrl,
    {
      body,
      bodyType,
      config,
      headers,
      method,
      signal,
      stream,
      url,
    },
    serializedBody,
  )
}
