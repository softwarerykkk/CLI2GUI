export type ConnectionMode = 'direct' | 'proxy'
export type MessageRole = 'system' | 'user' | 'assistant' | 'error'
export type MessageStatus = 'pending' | 'streaming' | 'done' | 'error'

export interface MessageImage {
  id: string
  url: string
  mimeType: string
  alt: string
  source: 'input' | 'output'
  name?: string
  size?: number
  width?: number
  height?: number
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  images: MessageImage[]
  createdAt: number
  status: MessageStatus
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

export interface ApiConfig {
  baseUrl: string
  apiKey: string
  connectionMode: ConnectionMode
  proxyUrl: string
}

export interface StreamChunk {
  type: 'text-delta' | 'image' | 'done' | 'error'
  text?: string
  image?: MessageImage
  error?: string
}

export interface ChatAdapter {
  sendMessage(
    messages: ChatMessage[],
    config: ApiConfig,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamChunk>
}
