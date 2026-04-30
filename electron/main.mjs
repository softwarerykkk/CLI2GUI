import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { requestUpstreamFromDesktop } from './upstream.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)

function createMainWindow() {
  const window = new BrowserWindow({
    autoHideMenuBar: true,
    backgroundColor: '#fff9f2',
    height: 920,
    minHeight: 760,
    minWidth: 1180,
    title: 'PackyAPI Image Studio',
    width: 1480,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL)
    return window
  }

  void window.loadFile(path.resolve(__dirname, '../dist/index.html'))
  return window
}

app.whenReady().then(() => {
  ipcMain.handle('desktop:request-upstream', (_event, payload) =>
    requestUpstreamFromDesktop(payload),
  )

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
