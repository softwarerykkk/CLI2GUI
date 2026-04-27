import { Plus, Settings2, Trash2, X } from 'lucide-react'
import type { ChatSession } from '../adapters/types'
import { FIXED_MODEL } from '../config/runtime'
import { formatHostLabel, formatSessionTime } from '../utils/format'

interface SidebarProps {
  activeSessionId: string
  baseUrl: string
  isConfigured: boolean
  isOpen: boolean
  onClose: () => void
  onCreateSession: () => void
  onDeleteSession: (sessionId: string) => void
  onOpenSettings: () => void
  onSelectSession: (sessionId: string) => void
  sessions: ChatSession[]
}

export function Sidebar({
  activeSessionId,
  baseUrl,
  isConfigured,
  isOpen,
  onClose,
  onCreateSession,
  onDeleteSession,
  onOpenSettings,
  onSelectSession,
  sessions,
}: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/45 transition md:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`glass-panel fixed inset-y-3 left-3 z-40 flex w-[19rem] flex-col rounded-[30px] p-4 transition duration-300 md:static md:inset-auto md:z-auto md:h-auto md:min-h-[calc(100vh-1.5rem)] md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1.5rem)]'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.35em] text-sky-500">
              CLI2GUI
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
              PackyAPI Image Studio
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              固定接口，专注单轮图片生成。
            </p>
          </div>
          <button
            className="rounded-full border border-slate-300/70 p-2 text-slate-500 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-100 md:hidden"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="soft-card mt-4 rounded-[24px] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                当前连接
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                {formatHostLabel(baseUrl)}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                isConfigured
                  ? 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                  : 'bg-amber-500/12 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
              }`}
            >
              <span
                className={`badge-dot ${
                  isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {isConfigured ? '已配置' : '待配置'}
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
            <span>{`PackyAPI / ${FIXED_MODEL}`}</span>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              onClick={onOpenSettings}
              type="button"
            >
              <Settings2 className="size-3.5" />
              设置
            </button>
          </div>
        </div>

        <button
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-orange-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:translate-y-[-1px]"
          onClick={onCreateSession}
          type="button"
        >
          <Plus className="size-4" />
          新建记录
        </button>

        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            历史记录
          </p>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId

              return (
                <button
                  className={`group soft-card flex items-start justify-between gap-3 rounded-[22px] px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-orange-400/50 bg-orange-500/10 dark:border-orange-400/35 dark:bg-orange-500/10'
                      : 'hover:border-slate-400/35 hover:bg-white/70 dark:hover:bg-slate-900/65'
                  }`}
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id)
                    onClose()
                  }}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {session.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {session.messages.length} 条内容
                    </p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <span className="pt-0.5 text-[0.7rem] uppercase tracking-[0.2em] text-slate-400">
                      {formatSessionTime(session.updatedAt)}
                    </span>
                    <span
                      className="rounded-full p-1.5 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500"
                      onClick={(event) => {
                        event.stopPropagation()
                        onDeleteSession(session.id)
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <Trash2 className="size-4" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </aside>
    </>
  )
}
