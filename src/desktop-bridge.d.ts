export {}

declare global {
  interface Window {
    desktopBridge?: {
      requestUpstream(payload: {
        bodyType: 'form-data' | 'json'
        stream: boolean
        upstreamBody: unknown
        upstreamHeaders: Record<string, string>
        upstreamMethod: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT'
        upstreamUrl: string
      }): Promise<{
        bodyBase64: string
        headers: Record<string, string>
        status: number
      }>
    }
  }
}
