const path = require('node:path');

class NotificationSound {
  constructor({ createWindow, root = path.join(__dirname, '..'), onError = () => {} }) {
    Object.assign(this, { createWindow, root, onError });
    this.window = null;
    this.playing = null;
  }

  play() {
    // Simultaneous notices share one sound instead of layering multiple copies.
    if (this.playing) return this.playing;
    this.playing = (async () => {
      try {
        if (!this.window || this.window.isDestroyed()) {
          this.window = this.createWindow({ show: false, skipTaskbar: true, width: 1, height: 1,
            webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true,
              backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' } });
          this.window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
          await this.window.loadFile(path.join(this.root, 'renderer', 'notification-sound.html'));
        }
        return await this.window.webContents.executeJavaScript('window.playNotificationSound()');
      } catch (error) { this.onError(error); return false; }
    })().finally(() => { this.playing = null; });
    return this.playing;
  }

  stop() { if (this.window && !this.window.isDestroyed()) this.window.destroy(); this.window = null; }
}
module.exports = { NotificationSound };
