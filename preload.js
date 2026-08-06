const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('codexUsage', {
  get: () => ipcRenderer.invoke('usage:get'),
  refresh: () => ipcRenderer.invoke('usage:refresh'),
  getRefreshInterval: () => ipcRenderer.invoke('usage:get-refresh-interval'),
  setRefreshInterval: (milliseconds) => ipcRenderer.invoke('usage:set-refresh-interval', milliseconds),
  getSystemMetrics: () => ipcRenderer.invoke('system:get-metrics'),
  getPreferences: () => ipcRenderer.invoke('app:get-preferences'),
  setOpacity: (opacity) => ipcRenderer.invoke('app:set-opacity', opacity),
  setLanguage: (language) => ipcRenderer.invoke('app:set-language', language),
  isPinned: () => ipcRenderer.invoke('window:is-pinned'),
  togglePin: () => ipcRenderer.invoke('window:toggle-pin'),
  getMinimumMode: () => ipcRenderer.invoke('window:get-minimum-mode'),
  setMinimumMode: (enabled) => ipcRenderer.invoke('window:set-minimum-mode', enabled),
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  revealSource: (sourcePath) => ipcRenderer.send('source:reveal', sourcePath),
  onChanged: (callback) => {
    const handler = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on('usage:changed', handler);
    return () => ipcRenderer.removeListener('usage:changed', handler);
  },
});
