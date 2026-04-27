import { useEffect, useState } from 'react'
import { ChatView } from './components/ChatView'
import { ConfigPanel } from './components/ConfigPanel'
import { Sidebar } from './components/Sidebar'
import { FIXED_BASE_URL } from './config/runtime'
import { useChatStore } from './store/chatStore'
import { useConfigStore } from './store/configStore'

const LEGACY_STORAGE_KEYS = [
  'cli2gui-chat',
  'cli2gui-config',
  'packyapi-image-chat-v2',
  'packyapi-image-config-v2',
]

function App() {
  const config = useConfigStore((state) => state.config)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const sessions = useChatStore((state) => state.sessions)
  const createSession = useChatStore((state) => state.createSession)
  const deleteSession = useChatStore((state) => state.deleteSession)
  const resetSessions = useChatStore((state) => state.resetSessions)
  const selectSession = useChatStore((state) => state.selectSession)
  const [configOpen, setConfigOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isConfigured =
    Boolean(FIXED_BASE_URL.trim()) && Boolean(config.apiKey.trim())

  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((storageKey) => {
      window.localStorage.removeItem(storageKey)
      window.sessionStorage.removeItem(storageKey)
    })
  }, [])

  if (!isConfigured) {
    return (
      <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
        <ConfigPanel
          isOpen
          isRequired
          onClearHistory={resetSessions}
          onClose={() => {}}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-3 py-3 md:px-4 md:py-4">
      <div className="mx-auto flex max-w-[1680px] gap-4">
        <Sidebar
          activeSessionId={activeSessionId}
          baseUrl={config.baseUrl}
          isConfigured={isConfigured}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onCreateSession={() => {
            createSession()
            setSidebarOpen(false)
          }}
          onDeleteSession={deleteSession}
          onOpenSettings={() => setConfigOpen(true)}
          onSelectSession={selectSession}
          sessions={sessions}
        />
        <ChatView
          config={config}
          isConfigured={isConfigured}
          onOpenSettings={() => setConfigOpen(true)}
          onToggleSidebar={() => setSidebarOpen(true)}
        />
      </div>
      {configOpen ? (
        <ConfigPanel
          isOpen
          onClearHistory={resetSessions}
          onClose={() => setConfigOpen(false)}
        />
      ) : null}
    </div>
  )
}

export default App
