const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('codexUsage', {
  get: () => ipcRenderer.invoke('usage:get'),
  refresh: () => ipcRenderer.invoke('usage:refresh'),
  setLanguage: (language) => ipcRenderer.invoke('app:set-language', language),
  isPinned: () => ipcRenderer.invoke('window:is-pinned'),
  togglePin: () => ipcRenderer.invoke('window:toggle-pin'),
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  revealSource: (sourcePath) => ipcRenderer.send('source:reveal', sourcePath),
  onChanged: (callback) => {
    const handler = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on('usage:changed', handler);
    return () => ipcRenderer.removeListener('usage:changed', handler);
  },
});
