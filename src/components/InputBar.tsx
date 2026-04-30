import { useEffect, useRef, useState } from 'react'
import { ImagePlus, SendHorizontal, Square } from 'lucide-react'
import type { MessageImage } from '../adapters/types'
import { collectMessageImages, mergeImages } from '../utils/image'
import { RenderableImage } from './RenderableImage'

const MAX_ATTACHMENTS = 1

interface InputBarProps {
  disabled: boolean
  isSending: boolean
  onSend: (payload: { images: MessageImage[]; text: string }) => Promise<void>
  onStop: () => void
}

export function InputBar({
  disabled,
  isSending,
  onSend,
  onStop,
}: InputBarProps) {
  const [draft, setDraft] = useState('')
  const [dragging, setDragging] = useState(false)
  const [images, setImages] = useState<MessageImage[]>([])
  const [localError, setLocalError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`
  }, [draft])

  async function appendImages(files: File[] | FileList) {
    try {
      setLocalError(null)
      const nextImages = await collectMessageImages(files)

      setImages((currentImages) => {
        const mergedImages = mergeImages(currentImages, nextImages)

        if (mergedImages.length > MAX_ATTACHMENTS) {
          setLocalError(`最多只能上传 ${MAX_ATTACHMENTS} 张图片。`)
        }

        return mergedImages.slice(0, MAX_ATTACHMENTS)
      })
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '处理图片失败。')
    }
  }

  async function handleSend() {
    if (disabled || isSending) {
      return
    }

    if (!draft.trim()) {
      setLocalError('请输入提示词后再生成图片。')
      return
    }

    await onSend({ images, text: draft })
    setDraft('')
    setImages([])
    setLocalError(null)
  }

  return (
    <div
      className={`glass-panel rounded-[28px] border px-4 py-4 shadow-glow transition ${
        dragging ? 'border-sky-400/70 bg-sky-500/10' : 'border-white/10'
      }`}
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        const relatedTarget = event.relatedTarget

        if (!(relatedTarget instanceof Node) || !event.currentTarget.contains(relatedTarget)) {
          setDragging(false)
        }
      }}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)

        if (event.dataTransfer.files.length > 0) {
          void appendImages(event.dataTransfer.files)
        }
      }}
    >
      {images.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {images.map((image) => (
            <div className="soft-card relative overflow-hidden rounded-[22px] p-2" key={image.id}>
              <RenderableImage className="message-image h-28" image={image} />
              <button
                className="absolute right-4 top-4 rounded-full bg-slate-950/75 px-2 py-1 text-xs font-medium text-white"
                onClick={() => {
                  setImages((currentImages) =>
                    currentImages.filter((item) => item.id !== image.id),
                  )
                }}
                type="button"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="field-shell flex items-end gap-3 rounded-[24px] px-3 py-3">
        <textarea
          className="min-h-[3rem] flex-1 border-0 bg-transparent px-2 text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          disabled={disabled || isSending}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
          onPaste={(event) => {
            const clipboardFiles = Array.from(event.clipboardData.items)
              .filter((item) => item.kind === 'file')
              .map((item) => item.getAsFile())
              .filter((file): file is File => Boolean(file))

            if (clipboardFiles.length > 0) {
              event.preventDefault()
              void appendImages(clipboardFiles)
            }
          }}
          placeholder={
            disabled
              ? '先在设置中填写 API Key'
              : images.length > 0
                ? '输入修改说明，例如“保留主体，改成温暖插画风格”'
                : '输入提示词，按 Enter 生成图片，Shift + Enter 换行'
          }
          ref={textareaRef}
          rows={1}
          value={draft}
        />

        <input
          accept="image/*"
          className="hidden"
          multiple
          onChange={(event) => {
            if (event.target.files) {
              void appendImages(event.target.files)
            }

            event.target.value = ''
          }}
          ref={fileInputRef}
          type="file"
        />

        <button
          className="rounded-full border border-slate-300/70 p-3 text-slate-600 transition hover:border-slate-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-50"
          disabled={disabled || isSending}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <ImagePlus className="size-4" />
        </button>

        {isSending ? (
          <button
            className="rounded-full bg-rose-500 p-3 text-white transition hover:bg-rose-400"
            onClick={onStop}
            type="button"
          >
            <Square className="size-4 fill-current" />
          </button>
        ) : (
          <button
            className="rounded-full bg-slate-950 p-3 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            disabled={disabled || !draft.trim()}
            onClick={() => {
              void handleSend()
            }}
            type="button"
          >
            <SendHorizontal className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          模式一：纯文本生图。模式二：上传 1 张图片并输入说明生成新图。
        </p>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          {isSending ? '点击停止可取消当前生成' : '支持拖拽、粘贴、上传 1 张图片'}
        </p>
      </div>

      {localError && (
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{localError}</p>
      )}
    </div>
  )
}
