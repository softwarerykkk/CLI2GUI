import { create } from 'zustand'
import { getAdapter } from '../adapters'
import type { ApiConfig, ChatMessage, ChatSession, MessageImage } from '../adapters/types'
import { formatRequestError } from '../utils/errors'
import { mergeImages, revokeMessageImages } from '../utils/image'

interface SendPayload {
  images: MessageImage[]
  text: string
}

interface ChatState {
  activeSessionId: string
  error: string | null
  isSending: boolean
  sessions: ChatSession[]
  abortStreaming: () => void
  createSession: () => void
  deleteSession: (sessionId: string) => void
  resetSessions: () => void
  selectSession: (sessionId: string) => void
  sendMessage: (config: ApiConfig, payload: SendPayload) => Promise<void>
}

function createId() {
  return crypto.randomUUID()
}

function createSession(title = '新记录'): ChatSession {
  const now = Date.now()

  return {
    createdAt: now,
    id: createId(),
    messages: [],
    title,
    updatedAt: now,
  }
}

function createMessage(
  role: ChatMessage['role'],
  content: string,
  options?: {
    images?: MessageImage[]
    status?: ChatMessage['status']
  },
): ChatMessage {
  return {
    content,
    createdAt: Date.now(),
    id: createId(),
    images: options?.images ?? [],
    role,
    status: options?.status ?? 'done',
  }
}

function buildTitle(text: string, images: MessageImage[]) {
  if (text.trim()) {
    return text.trim().replace(/\s+/g, ' ').slice(0, 24)
  }

  if (images.length > 0) {
    return images.length === 1 ? '图像编辑' : '图像任务'
  }

  return '新记录'
}

function sortSessions(sessions: ChatSession[]) {
  return [...sessions].sort((left, right) => right.updatedAt - left.updatedAt)
}

function replaceSession(
  sessions: ChatSession[],
  nextSession: ChatSession,
  appendIfMissing = false,
) {
  const hasExistingSession = sessions.some((session) => session.id === nextSession.id)

  if (!hasExistingSession && appendIfMissing) {
    return sortSessions([...sessions, nextSession])
  }

  return sortSessions(
    sessions.map((session) =>
      session.id === nextSession.id ? nextSession : session,
    ),
  )
}

let activeAbortController: AbortController | null = null
const initialSession = createSession()

export const useChatStore = create<ChatState>()((set, get) => ({
  activeSessionId: initialSession.id,
  error: null,
  isSending: false,
  sessions: [initialSession],
  abortStreaming: () => {
    activeAbortController?.abort()
  },
  createSession: () => {
    const session = createSession()
    set((state) => ({
      activeSessionId: session.id,
      sessions: sortSessions([session, ...state.sessions]),
    }))
  },
  resetSessions: () => {
    const session = createSession()

    set((state) => {
      state.sessions.forEach((item) => {
        item.messages.forEach((message) => {
          revokeMessageImages(message.images)
        })
      })

      return {
        activeSessionId: session.id,
        error: null,
        isSending: false,
        sessions: [session],
      }
    })
  },
  deleteSession: (sessionId) => {
    set((state) => {
      const removedSession = state.sessions.find((session) => session.id === sessionId)

      removedSession?.messages.forEach((message) => {
        revokeMessageImages(message.images)
      })

      const remainingSessions = state.sessions.filter(
        (session) => session.id !== sessionId,
      )
      const nextSessions =
        remainingSessions.length > 0 ? remainingSessions : [createSession()]
      const nextActiveSession = nextSessions.some(
        (session) => session.id === state.activeSessionId,
      )
        ? state.activeSessionId
        : nextSessions[0].id

      return {
        activeSessionId: nextActiveSession,
        sessions: sortSessions(nextSessions),
      }
    })
  },
  selectSession: (sessionId) => set({ activeSessionId: sessionId }),
  async sendMessage(config, payload) {
        const trimmedText = payload.text.trim()

        if (!trimmedText && payload.images.length === 0) {
          return
        }

        if (!config.apiKey.trim()) {
          set({
            error: '请先在设置中填写 API Key。',
          })
          return
        }

        const currentState = get()
        const controller = new AbortController()
        const existingSession =
          currentState.sessions.find(
            (session) => session.id === currentState.activeSessionId,
          ) ?? currentState.sessions[0] ?? createSession()
        const userMessage = createMessage('user', payload.text, {
          images: payload.images,
        })
        const assistantMessage = createMessage('assistant', '', {
          status: 'streaming',
        })
        const nextSession: ChatSession = {
          ...existingSession,
          messages: [...existingSession.messages, userMessage, assistantMessage],
          title:
            existingSession.messages.length === 0
              ? buildTitle(trimmedText, payload.images)
              : existingSession.title,
          updatedAt: Date.now(),
        }

        activeAbortController = controller

        set({
          activeSessionId: nextSession.id,
          error: null,
          isSending: true,
          sessions: replaceSession(currentState.sessions, nextSession, true),
        })

        try {
          const adapter = getAdapter()

          for await (const chunk of adapter.sendMessage(
            [userMessage],
            config,
            controller.signal,
          )) {
            if (chunk.type === 'text-delta' && chunk.text) {
              set((state) => {
                const session = state.sessions.find(
                  (item) => item.id === nextSession.id,
                )

                if (!session) {
                  return state
                }

                const updatedSession = {
                  ...session,
                  messages: session.messages.map((message) =>
                    message.id === assistantMessage.id
                      ? {
                          ...message,
                          content: message.content + chunk.text,
                        }
                      : message,
                  ),
                  updatedAt: Date.now(),
                }

                return {
                  sessions: replaceSession(state.sessions, updatedSession),
                }
              })
            }

            if (chunk.type === 'image' && chunk.image) {
              const image = chunk.image

              set((state) => {
                const session = state.sessions.find(
                  (item) => item.id === nextSession.id,
                )

                if (!session) {
                  return state
                }

                const updatedSession = {
                  ...session,
                  messages: session.messages.map((message) =>
                    message.id === assistantMessage.id
                      ? {
                          ...message,
                          images: mergeImages(message.images, [image]),
                        }
                      : message,
                  ),
                  updatedAt: Date.now(),
                }

                return {
                  sessions: replaceSession(state.sessions, updatedSession),
                }
              })
            }

            if (chunk.type === 'error') {
              throw new Error(chunk.error ?? '流式响应中断。')
            }
          }

          set((state) => {
            const session = state.sessions.find((item) => item.id === nextSession.id)

            if (!session) {
              return state
            }

            const updatedSession = {
              ...session,
              messages: session.messages.map((message) =>
                message.id === assistantMessage.id
                  ? {
                      ...message,
                      status: 'done' as const,
                    }
                  : message,
              ),
              updatedAt: Date.now(),
            }

            return {
              isSending: false,
              sessions: replaceSession(state.sessions, updatedSession),
            }
          })
        } catch (error) {
          const message = formatRequestError(error, {
            baseUrl: config.baseUrl,
            connectionMode: config.connectionMode,
            proxyUrl: config.proxyUrl,
          })
          const isAbortError =
            error instanceof DOMException && error.name === 'AbortError'
          const nextRole: ChatMessage['role'] = isAbortError ? 'assistant' : 'error'

          set((state) => {
            const session = state.sessions.find((item) => item.id === nextSession.id)

            if (!session) {
              return {
                error: message,
                isSending: false,
              }
            }

            const updatedSession: ChatSession = {
              ...session,
              messages: session.messages.map((item): ChatMessage =>
                item.id === assistantMessage.id
                  ? {
                      ...item,
                      content:
                        item.content ||
                        (isAbortError ? '已停止生成。' : `请求失败：${message}`),
                      role: nextRole,
                      status: 'error' as const,
                    }
                  : item,
              ),
              updatedAt: Date.now(),
            }

            return {
              error: isAbortError ? null : message,
              isSending: false,
              sessions: replaceSession(state.sessions, updatedSession),
            }
          })
        } finally {
          activeAbortController = null
        }
      },
}))
