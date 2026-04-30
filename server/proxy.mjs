import http from 'node:http'
import { Readable } from 'node:stream'

const HOST = process.env.PROXY_HOST || '127.0.0.1'
const PORT = Number(process.env.PROXY_PORT || '8787')

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
}

function writeJson(response, statusCode, payload) {
  setCorsHeaders(response)
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function normalizeUpstreamHeaders(headers = {}, bodyType = 'json') {
  const nextHeaders = {}

  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value !== 'string' || value.length === 0) {
      return
    }

    const normalizedKey = key.toLowerCase()

    if (bodyType === 'form-data' && normalizedKey === 'content-type') {
      return
    }

    if (['connection', 'content-length', 'host', 'origin', 'referer'].includes(normalizedKey)) {
      return
    }

    nextHeaders[key] = value
  })

  return nextHeaders
}

async function readJsonBody(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim()

  if (!rawBody) {
    return {}
  }

  return JSON.parse(rawBody)
}

function createUpstreamBody(body, bodyType = 'json') {
  if (body === undefined || body === null) {
    return undefined
  }

  if (
    bodyType === 'form-data' &&
    body &&
    typeof body === 'object' &&
    body.type === 'form-data' &&
    Array.isArray(body.fields)
  ) {
    const formData = new FormData()

    body.fields.forEach((field) => {
      if (!field || typeof field !== 'object' || typeof field.name !== 'string') {
        return
      }

      if (field.kind === 'file' && typeof field.value === 'string') {
        const blob = new Blob([Buffer.from(field.value, 'base64')], {
          type:
            typeof field.mimeType === 'string' && field.mimeType.length > 0
              ? field.mimeType
              : 'application/octet-stream',
        })

        formData.append(
          field.name,
          blob,
          typeof field.filename === 'string' && field.filename.length > 0
            ? field.filename
            : 'upload.bin',
        )
        return
      }

      if (typeof field.value === 'string') {
        formData.append(field.name, field.value)
      }
    })

    return formData
  }

  if (typeof body === 'string') {
    return body
  }

  return JSON.stringify(body)
}

async function handleProxy(request, response) {
  try {
    const {
      stream = false,
      upstreamBody = null,
      upstreamBodyType = 'json',
      upstreamHeaders = {},
      upstreamMethod = 'GET',
      upstreamUrl,
    } = await readJsonBody(request)

    if (typeof upstreamUrl !== 'string' || upstreamUrl.length === 0) {
      writeJson(response, 400, {
        error: {
          message: '缺少 upstreamUrl。',
        },
      })
      return
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      body: createUpstreamBody(upstreamBody, upstreamBodyType),
      headers: normalizeUpstreamHeaders(upstreamHeaders, upstreamBodyType),
      method: typeof upstreamMethod === 'string' ? upstreamMethod : 'GET',
    })

    setCorsHeaders(response)
    response.statusCode = upstreamResponse.status

    const contentType = upstreamResponse.headers.get('content-type')

    if (contentType) {
      response.setHeader('Content-Type', contentType)
    }

    const upstreamRequestId =
      upstreamResponse.headers.get('x-request-id') ||
      upstreamResponse.headers.get('x-oneapi-request-id')

    if (upstreamRequestId) {
      response.setHeader('x-upstream-request-id', upstreamRequestId)
    }

    if (stream && upstreamResponse.body) {
      response.setHeader('Cache-Control', 'no-cache')
      response.setHeader('X-Accel-Buffering', 'no')

      Readable.fromWeb(upstreamResponse.body).pipe(response)
      return
    }

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer())
    response.end(buffer)
  } catch (error) {
    writeJson(response, 500, {
      error: {
        message: error instanceof Error ? error.message : '代理请求失败。',
      },
    })
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  if (request.method === 'OPTIONS') {
    setCorsHeaders(response)
    response.statusCode = 204
    response.end()
    return
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    writeJson(response, 200, {
      host: HOST,
      ok: true,
      port: PORT,
    })
    return
  }

  if (request.method === 'POST' && url.pathname === '/proxy') {
    await handleProxy(request, response)
    return
  }

  writeJson(response, 404, {
    error: {
      message: 'Not Found',
    },
  })
})

server.listen(PORT, HOST, () => {
  console.log(`[cli2gui-proxy] listening on http://${HOST}:${PORT}`)
})
