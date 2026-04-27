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

export async function requestUpstreamFromDesktop(payload) {
  const response = await fetch(payload.upstreamUrl, {
    body: createUpstreamBody(payload.upstreamBody, payload.bodyType),
    headers: normalizeUpstreamHeaders(payload.upstreamHeaders, payload.bodyType),
    method: payload.upstreamMethod,
  })

  return {
    bodyBase64: Buffer.from(await response.arrayBuffer()).toString('base64'),
    headers: Object.fromEntries(response.headers.entries()),
    status: response.status,
  }
}
