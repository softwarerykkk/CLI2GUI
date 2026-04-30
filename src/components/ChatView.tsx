import { Menu, Settings2 } from 'lucide-react'
import type { ApiConfig } from '../adapters/types'
import { FIXED_MODEL } from '../config/runtime'
import { useChatStore } from '../store/chatStore'
import { formatHostLabel } from '../utils/format'
import { InputBar } from './InputBar'
import { MessageList } from './MessageList'

interface ChatViewProps {
  config: ApiConfig
  isConfigured: boolean
  onOpenSettings: () => void
  onToggleSidebar: () => void
}

export function ChatView({
  config,
  isConfigured,
  onOpenSettings,
  onToggleSidebar,
}: ChatViewProps) {
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const error = useChatStore((state) => state.error)
  const isSending = useChatStore((state) => state.isSending)
  const sessions = useChatStore((state) => state.sessions)
  const abortStreaming = useChatStore((state) => state.abortStreaming)
  const sendMessage = useChatStore((state) => state.sendMessage)
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0]

  return (
    <section className="glass-panel flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-1 flex-col rounded-[32px]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/55 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-slate-300/80 bg-white/90 p-2 text-slate-600 transition hover:border-slate-400 hover:text-slate-950 md:hidden"
            onClick={onToggleSidebar}
            type="button"
          >
            <Menu className="size-4" />
          </button>
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.35em] text-slate-500">
              当前记录
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              {activeSession?.title ?? '新记录'}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700">
            <span className="badge-dot bg-sky-500" />
            PackyAPI Desktop
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700">
            <span className={`badge-dot ${isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {isConfigured ? FIXED_MODEL : '待配置'}
          </span>
          <span className="hidden rounded-full border border-slate-300/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-500 md:inline-flex">
            {formatHostLabel(config.baseUrl)}
          </span>
          <button
            className="rounded-full border border-slate-300/80 bg-white/90 p-2 text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
            onClick={onOpenSettings}
            type="button"
          >
            <Settings2 className="size-4" />
          </button>
        </div>
      </header>

      <MessageList
        error={error}
        isConfigured={isConfigured}
        isSending={isSending}
        messages={activeSession?.messages ?? []}
        onOpenSettings={onOpenSettings}
      />

      <div className="border-t border-white/55 px-4 py-4 md:px-6">
        <InputBar
          disabled={!isConfigured}
          isSending={isSending}
          onSend={(payload) => sendMessage(config, payload)}
          onStop={abortStreaming}
        />
      </div>
    </section>
  )
}
