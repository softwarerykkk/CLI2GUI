import type { ConnectionMode } from '../adapters/types'

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
})

const shortDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  day: 'numeric',
  month: 'numeric',
})

export function formatSessionTime(timestamp: number) {
  const date = new Date(timestamp)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return timeFormatter.format(date)
  }

  return shortDateFormatter.format(date)
}

export function formatMessageTime(timestamp: number) {
  return timeFormatter.format(new Date(timestamp))
}

export function formatHostLabel(baseUrl: string) {
  if (!baseUrl.trim()) {
    return '尚未配置'
  }

  try {
    return new URL(baseUrl).host
  } catch {
    return baseUrl.replace(/^https?:\/\//, '')
  }
}

export function getConnectionModeLabel(mode: ConnectionMode) {
  return mode === 'proxy' ? '本地代理' : '浏览器直连'
}
