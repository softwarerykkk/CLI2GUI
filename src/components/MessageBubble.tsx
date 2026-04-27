import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { ChatMessage } from '../adapters/types'
import {
  extractStandaloneImages,
  mergeImages,
  stripStandaloneImageLines,
} from '../utils/image'
import { formatMessageTime } from '../utils/format'
import { RenderableImage } from './RenderableImage'

const markdownComponents: Components = {
  a(props) {
    return <a {...props} rel="noreferrer" target="_blank" />
  },
  img(props) {
    return <img {...props} className="message-image mt-3" loading="lazy" />
  },
}

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'
  const visibleImages = isUser
    ? message.images
    : mergeImages(message.images, extractStandaloneImages(message.content))
  const content = isUser
    ? message.content
    : stripStandaloneImageLines(message.content)
  const shouldRenderContent =
    Boolean(content) || (message.status === 'streaming' && visibleImages.length === 0)
  const bubbleClassName = isUser
    ? 'bg-gradient-to-br from-sky-500 to-orange-500 text-white shadow-glow'
    : isError
      ? 'soft-card border-rose-400/40 bg-rose-500/10 text-rose-950 dark:text-rose-100'
      : 'soft-card text-slate-900 dark:text-slate-100'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`w-full max-w-3xl rounded-[28px] px-5 py-4 ${bubbleClassName}`}>
        <div className="mb-3 flex items-center justify-between gap-3 text-[0.68rem] uppercase tracking-[0.28em]">
          <span className={isUser ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}>
            {isUser ? '用户' : isError ? '错误' : '助手'}
          </span>
          <span className={isUser ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}>
            {formatMessageTime(message.createdAt)}
          </span>
        </div>

        {visibleImages.length > 0 && (
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            {visibleImages.map((image, index) => (
              <a href={image.url} key={image.id} rel="noreferrer" target="_blank">
                <RenderableImage
                  className="message-image max-h-80 transition hover:opacity-90"
                  image={image}
                  priority={index === 0}
                />
              </a>
            ))}
          </div>
        )}

        {shouldRenderContent ? (
          <div className="markdown-body">
            <ReactMarkdown
              components={markdownComponents}
              rehypePlugins={[rehypeHighlight]}
              remarkPlugins={[remarkGfm]}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : null}

        {message.status === 'streaming' && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="badge-dot pulse-dot bg-orange-500" />
            正在生成图片
          </div>
        )}
      </div>
    </div>
  )
}
