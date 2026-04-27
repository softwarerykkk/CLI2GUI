import { useEffect, useState } from 'react'
import { Eye, EyeOff, RotateCcw, Save, Sparkles, X } from 'lucide-react'
import type { ApiConfig } from '../adapters/types'
import { FIXED_BASE_URL, FIXED_MODEL } from '../config/runtime'
import { useConfigStore } from '../store/configStore'

interface ConfigPanelProps {
  isOpen: boolean
  isRequired?: boolean
  onClearHistory: () => void
  onClose: () => void
}

type Feedback =
  | {
      message: string
      type: 'error' | 'success'
    }
  | null

function normalizeConfig(config: ApiConfig): ApiConfig {
  return {
    apiKey: config.apiKey.trim(),
    baseUrl: FIXED_BASE_URL,
    connectionMode: 'direct',
    proxyUrl: 'http://localhost:8787',
  }
}

export function ConfigPanel({
  isOpen,
  isRequired = false,
  onClearHistory,
  onClose,
}: ConfigPanelProps) {
  const config = useConfigStore((state) => state.config)
  const setConfig = useConfigStore((state) => state.setConfig)
  const [draft, setDraft] = useState<ApiConfig>(() => config)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isRequired) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [config, isOpen, isRequired, onClose])

  function handleSave() {
    const normalizedConfig = normalizeConfig(draft)

    if (!normalizedConfig.apiKey) {
      setFeedback({
        message: '请先填写 API Key。',
        type: 'error',
      })
      return
    }

    setConfig(normalizedConfig)
    setFeedback({
      message: isRequired ? 'API Key 已保存，已解锁图片生成功能。' : 'API Key 已更新。',
      type: 'success',
    })

    if (!isRequired) {
      window.setTimeout(() => {
        onClose()
      }, 220)
    }
  }

function handleClearHistory() {
  onClearHistory()
  setFeedback({
      message: '当前运行中的记录已清空。',
      type: 'success',
    })
  }

  if (!isOpen) {
    return null
  }

  const shellClassName = isRequired
    ? 'mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl items-center justify-center'
    : 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/18 px-3 py-6 backdrop-blur-sm'

  return (
    <div className={shellClassName}>
      <div className="glass-panel relative w-full max-w-2xl rounded-[34px] p-6 md:p-7">
        {!isRequired ? (
          <button
            className="absolute right-5 top-5 rounded-full border border-slate-300/80 bg-white/90 p-2 text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        ) : null}

        <div className="rounded-[28px] bg-gradient-to-br from-orange-100 via-white to-sky-100 p-5 shadow-[0_30px_80px_rgba(249,115,22,0.12)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/50 bg-white/85 px-4 py-2 text-xs font-medium uppercase tracking-[0.32em] text-orange-700">
            <Sparkles className="size-3.5" />
            PackyAPI Image Studio
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
            {isRequired ? '先输入 API Key，马上开始生图。' : '更新 API Key 与本地记录。'}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
            客户端固定使用 `{FIXED_MODEL}` 和 `{FIXED_BASE_URL}`。你只需要输入 API Key，
            保存后就能直接文生图或图生图。
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-800">API Key</span>
            <div className="field-shell flex items-center gap-3 rounded-[20px] px-4 py-3">
              <input
                autoFocus
                className="flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    apiKey: event.target.value,
                  }))
                }
                placeholder="输入你的 Sora 分组令牌"
                type={showKey ? 'text' : 'password'}
                value={draft.apiKey}
              />
              <button
                className="rounded-full p-1 text-slate-500 transition hover:text-slate-900"
                onClick={() => setShowKey((current) => !current)}
                type="button"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>

          <div className="soft-card rounded-[22px] p-4 text-sm leading-7 text-slate-600">
            <p className="font-medium text-slate-900">当前模式</p>
            <p className="mt-1">文生图：纯文本直接生成 1 张图片。</p>
            <p className="mt-1">图生图：上传 1 张图片并输入说明生成 1 张新图。</p>
            <p className="mt-3 text-xs text-slate-500">
              当前客户端不做本地持久化。关闭应用后，API Key 与会话记录都会被清空。
            </p>
          </div>

          {feedback ? (
            <div
              className={`rounded-[22px] px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border border-emerald-400/40 bg-emerald-50 text-emerald-900'
                  : 'border border-rose-400/40 bg-rose-50 text-rose-900'
              }`}
            >
              {feedback.message}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {!isRequired ? (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              onClick={handleClearHistory}
              type="button"
            >
              <RotateCcw className="size-4" />
              清空当前记录
            </button>
          ) : (
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">
              仅需一步配置
            </span>
          )}

          <button
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={handleSave}
            type="button"
          >
            <Save className="size-4" />
            {isRequired ? '保存并开始' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
