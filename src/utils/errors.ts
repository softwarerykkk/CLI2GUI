import type { ConnectionMode } from '../adapters/types'

function isBrowserFetchFailure(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message === 'Failed to fetch' ||
    error.message === 'NetworkError when attempting to fetch resource.' ||
    error.name === 'TypeError'
  )
}

export function formatRequestError(
  error: unknown,
  options?: {
    baseUrl?: string
    connectionMode?: ConnectionMode
    proxyUrl?: string
  },
) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return '已停止生成。'
  }

  if (isBrowserFetchFailure(error)) {
    const baseUrl = options?.baseUrl?.trim()
    const proxyUrl = options?.proxyUrl?.trim()

    if (options?.connectionMode === 'proxy') {
      return [
        '浏览器请求本地代理失败，通常是代理服务没有启动或代理地址写错了。',
        '当前接口类型：PackyAPI 图片接口',
        proxyUrl ? `代理地址：${proxyUrl}` : null,
        baseUrl ? `目标地址：${baseUrl}` : null,
        '请确认本地代理已启动，例如运行 `npm run proxy` 或 `npm run dev:all`。',
      ]
        .filter(Boolean)
        .join('\n')
    }

    return [
      '浏览器请求失败，服务端没有返回任何 HTTP 响应。',
      '当前接口类型：PackyAPI 图片接口',
      baseUrl ? `当前地址：${baseUrl}` : null,
      '常见原因：',
      '1. 目标 API 被浏览器 CORS 策略拦截',
      '2. API 地址填写错误，或服务本身不可达',
      '3. 页面是 HTTPS，但你请求的是 HTTP 接口，触发 Mixed Content',
      '4. 本地网络、证书、反向代理或防火墙拦截了请求',
      '建议先打开浏览器开发者工具 Console / Network，看是否出现 blocked by CORS policy。',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (error instanceof Error) {
    return error.message
  }

  return '请求失败，发生未知错误。'
}
