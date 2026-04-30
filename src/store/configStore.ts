import { create } from 'zustand'
import type { ApiConfig } from '../adapters/types'
import { FIXED_BASE_URL } from '../config/runtime'

interface ConfigState {
  config: ApiConfig
  setConfig: (config: ApiConfig) => void
}

export const defaultConfig: ApiConfig = {
  apiKey: '',
  baseUrl: FIXED_BASE_URL,
  connectionMode: 'direct',
  proxyUrl: 'http://localhost:8787',
}

export const useConfigStore = create<ConfigState>()((set) => ({
  config: defaultConfig,
  setConfig: (config) =>
    set({
      config: {
        apiKey: config.apiKey.trim(),
        baseUrl: FIXED_BASE_URL,
        connectionMode: config.connectionMode,
        proxyUrl: config.proxyUrl.trim(),
      },
    }),
}))
