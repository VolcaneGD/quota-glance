// Isolated runtime check: does not use the user's application settings or X token.
const { app, BrowserWindow, Notification } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'quota-glance-smoke-'));
app.setPath('userData', temp);
app.setName('quota-glance-smoke');
require('../main');
app.whenReady().then(() => {
  const timer = setInterval(() => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window && !window.webContents.isLoading()) {
      clearInterval(timer);
      console.log('Runtime ready:', app.getVersion(), 'notifications supported:', Notification.isSupported());
      window.setTitle('Quota Glance — Runtime QA');
      window.webContents.on('console-message', (_event, _level, message) => console.log('Renderer:', message));
    }
  }, 300);
});
