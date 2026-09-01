const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('codexUsage', {
  get: () => ipcRenderer.invoke('usage:get'),
  refresh: () => ipcRenderer.invoke('usage:refresh'),
  getRefreshInterval: () => ipcRenderer.invoke('usage:get-refresh-interval'),
  setRefreshInterval: (milliseconds) => ipcRenderer.invoke('usage:set-refresh-interval', milliseconds),
  getSystemMetrics: () => ipcRenderer.invoke('system:get-metrics'),
  getResetFeed: () => ipcRenderer.invoke('reset-feed:get'),
  refreshResetFeed: () => ipcRenderer.invoke('reset-feed:refresh'),
  getXApiStatus: () => ipcRenderer.invoke('x-api:get-status'),
  setXApiToken: (token) => ipcRenderer.invoke('x-api:set-token', token),
  clearXApiToken: () => ipcRenderer.invoke('x-api:clear-token'),
  onResetFeedChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('reset-feed:changed', listener);
    return () => ipcRenderer.removeListener('reset-feed:changed', listener);
  },
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
  openExternal: (url) => ipcRenderer.send('external:open', url),
  onChanged: (callback) => {
    const handler = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on('usage:changed', handler);
    return () => ipcRenderer.removeListener('usage:changed', handler);
  },
});
