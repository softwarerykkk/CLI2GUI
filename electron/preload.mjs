import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('desktopBridge', {
  requestUpstream(payload) {
    return ipcRenderer.invoke('desktop:request-upstream', payload)
  },
})
