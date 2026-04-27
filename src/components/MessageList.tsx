import { useEffect, useRef } from 'react'
import { ImagePlus, Settings2, Sparkles } from 'lucide-react'
import type { ChatMessage } from '../adapters/types'
import { MessageBubble } from './MessageBubble'

interface MessageListProps {
  error: string | null
  isConfigured: boolean
  isSending: boolean
  messages: ChatMessage[]
  onOpenSettings: () => void
}

export function MessageList({
  error,
  isConfigured,
  isSending,
  messages,
  onOpenSettings,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const lastMessage = messages.at(-1)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [lastMessage?.content, lastMessage?.id, lastMessage?.images.length, messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-orange-700 dark:text-orange-300">
            <Sparkles className="size-3.5" />
            PackyAPI image workspace
          </div>
          <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-950 dark:text-white md:text-5xl">
            固定 `PackyAPI` 图片接口，直接在浏览器里做单轮生图。
          </h2>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-600 dark:text-slate-300">
            支持两种模式：输入一段文本生成图片，或上传 1 张图片并结合文本生成新图。
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="soft-card rounded-[24px] p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                第一步：填写 API Key
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                API 地址和模型已经写死在代码里，前端只保留 API Key 和连接方式。
              </p>
              <button
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
                onClick={onOpenSettings}
                type="button"
              >
                <Settings2 className="size-4" />
                打开设置
              </button>
            </div>
            <div className="soft-card rounded-[24px] p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                第二步：选择生成模式
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                不上传图片就是文生图；上传 1 张图片并写提示词就是图生图。
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-300/70 px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <ImagePlus className="size-4" />
                图片输入已就绪
              </div>
            </div>
          </div>

          {!isConfigured && (
            <p className="mt-6 text-sm text-amber-700 dark:text-amber-300">
              当前还没有可用配置，保存 API Key 后输入框会自动解锁。
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 md:px-8">
      {error && (
        <div className="rounded-[22px] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-900 dark:text-rose-100">
          {error}
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isSending && (
        <div className="px-2 text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
          正在生成图片
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
