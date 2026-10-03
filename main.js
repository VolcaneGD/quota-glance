const path = require('node:path');
const { app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, safeStorage, screen, shell, Tray } = require('electron');
const { UsageReader } = require('./src/usage-reader');
const { ResetFeedReader } = require('./src/reset-feed');
const { collectSystemMetrics } = require('./src/system-metrics');
const { loadWindowState, saveWindowState } = require('./src/window-state');
const { SecureTokenStore } = require('./src/secure-token-store');
const { XApiSource } = require('./src/x-api-source');
const { OfficialSource } = require('./src/official-source');
const { ResetNotifier, normalizeNotifications } = require('./src/reset-notifier');
const { safeSourceUrl } = require('./src/reset-event');
let resetNotifier;
let notificationTimer;
let notificationQueue = Promise.resolve();
const liveNotifications = new Set();
function updateNotifications() {
  const usage = reader.getSnapshot();
  const events = resetFeedReader?.getState()?.events || [];
  notificationQueue = notificationQueue.then(() => resetNotifier?.update(events, usage)).catch(error => console.warn('Notification processing failed:', error.message));
}
function sendResetNotification(copy, { effect = true } = {}) {
  if (!Notification.isSupported()) return Promise.resolve(false);
  return new Promise(resolve => {
    const notification = new Notification({ title: copy.title, body: copy.body, silent: false, icon: path.join(__dirname, 'assets', 'icon.ico') });
    liveNotifications.add(notification);
    const timeout = setTimeout(() => { liveNotifications.delete(notification); resolve(false); }, 10000);
    notification.once('show', () => {
      clearTimeout(timeout);
      if (effect && copy.scheduledEffect && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('reset-notification:shown');
      resolve(true);
    });
    notification.once('failed', () => { clearTimeout(timeout); liveNotifications.delete(notification); resolve(false); });
    notification.once('close', () => liveNotifications.delete(notification));
    notification.on('click', () => { mainWindow.show(); mainWindow.focus(); });
    notification.show();
  });
}

let mainWindow;
let tray;
let isQuitting = false;
let uiLanguage = 'ja';
let isMinimumMode = false;
let standardWindowBounds = { width: 372, height: 800 };
let preferences;
let preferencesPath;
let resetFeedReader;
let xApiTokenStore;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

const codexHome = process.env.CODEX_HOME || path.join(app.getPath('home'), '.codex');
const reader = new UsageReader({
  roots: [
    path.join(codexHome, 'sessions'),
    path.join(codexHome, 'archived_sessions'),
  ],
});

function makeTrayImage(usedPercent = null) {
  const assetName = usedPercent == null
    ? 'tray-idle.png'
    : usedPercent >= 85 ? 'tray-warning.png' : 'tray-normal.png';
  return nativeImage.createFromPath(path.join(__dirname, 'assets', assetName)).resize({ width: 16, height: 16 });
}

const trayStrings = {
  ja: {
    show: '表示',
    refresh: '最新情報に更新',
    quit: '終了',
    waiting: 'データ待機中',
    usage: (fiveHour, weekly, balance) => [
      fiveHour == null ? null : `5時間 ${fiveHour}%`,
      weekly == null ? null : `週間 ${weekly}%`,
      `残高 ${balance}`,
    ].filter(Boolean).join(' / '),
    unlimited: '無制限',
  },
  en: {
    show: 'Open',
    refresh: 'Refresh usage',
    quit: 'Quit',
    waiting: 'Waiting for usage data',
    usage: (fiveHour, weekly, balance) => [
      fiveHour == null ? null : `5-hour ${fiveHour}%`,
      weekly == null ? null : `Weekly ${weekly}%`,
      `Balance ${balance}`,
    ].filter(Boolean).join(' / '),
    unlimited: 'Unlimited',
  },
};

function trayCopy() {
  return trayStrings[uiLanguage] || trayStrings.ja;
}

function createWindow() {
  const bounds = preferences.bounds || { width: 372, height: 800 };
  const display = Number.isFinite(bounds.x) && Number.isFinite(bounds.y)
    ? screen.getDisplayMatching(bounds) : screen.getPrimaryDisplay();
  const availableHeight = display.workArea.height;
  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: Math.max(372, bounds.width),
    height: Math.min(availableHeight, Math.max(800, bounds.height)),
    minWidth: 340,
    minHeight: Math.min(604, availableHeight),
    maxWidth: 460,
    show: false,
    frame: false,
    transparent: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#0b1210',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setOpacity(preferences.opacity);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('resize', savePreferences);
  mainWindow.on('move', savePreferences);
}

function savePreferences() {
  if (!mainWindow || mainWindow.isDestroyed() || !preferencesPath) return;
  preferences.bounds = mainWindow.getBounds();
  preferences.minimumMode = isMinimumMode;
  preferences.refreshIntervalMs = reader.refreshIntervalMs;
  preferences.language = uiLanguage;
  saveWindowState(preferencesPath, preferences);
}

function setMinimumMode(enabled) {
  isMinimumMode = enabled === true;
  if (isMinimumMode) {
    standardWindowBounds = mainWindow.getBounds();
    mainWindow.setMinimumSize(292, 290);
    mainWindow.setSize(310, 310, true);
  } else {
    mainWindow.setMinimumSize(340, 604);
    mainWindow.setSize(
      Math.max(372, standardWindowBounds.width),
      Math.min(screen.getDisplayMatching(mainWindow.getBounds()).workArea.height, Math.max(800, standardWindowBounds.height)),
      true,
    );
  }
  return isMinimumMode;
}

function createTray() {
  tray = new Tray(makeTrayImage());
  tray.setToolTip('Quota Glance');
  updateTrayMenu();
  tray.on('click', () => {
    if (mainWindow.isVisible()) mainWindow.hide();
    else { mainWindow.show(); mainWindow.focus(); }
  });
}

function updateTrayMenu() {
  if (!tray) return;
  const copy = trayCopy();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: copy.show, click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: copy.refresh, click: () => reader.refresh() },
    { type: 'separator' },
    { label: copy.quit, click: () => { isQuitting = true; app.quit(); } },
  ]));
}

function updateTray(snapshot) {
  if (!tray) return;
  const copy = trayCopy();
  const fiveHour = snapshot?.fiveHour?.usedPercent;
  const weekly = snapshot?.weekly?.usedPercent;
  const indicator = fiveHour ?? weekly;
  tray.setImage(makeTrayImage(indicator));
  if (indicator == null) {
    tray.setToolTip(`Quota Glance — ${copy.waiting}`);
    return;
  }
  const balance = snapshot?.credits?.unlimited
    ? copy.unlimited
    : snapshot?.credits?.balance == null ? '—' : `${snapshot.credits.balance.toFixed(2)} credits`;
  tray.setToolTip(`Quota Glance — ${copy.usage(
    fiveHour == null ? null : Math.round(fiveHour),
    weekly == null ? null : Math.round(weekly),
    balance,
  )}`);
}

function publish(snapshot) {
  updateTray(snapshot);
  resetFeedReader?.setUsageSnapshot(snapshot);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('usage:changed', snapshot);
    mainWindow.webContents.send('reset-feed:changed', resetFeedReader?.getState() || null);
  }
}

if (hasSingleInstanceLock) {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    app.setAppUserModelId('dev.volcane.quota-glance');
    preferencesPath = path.join(app.getPath('userData'), 'quota-glance-state.json');
    xApiTokenStore = new SecureTokenStore(path.join(app.getPath('userData'), 'quota-glance-x-api.json'), safeStorage);
    resetFeedReader = new ResetFeedReader({
      cachePath: path.join(app.getPath('userData'), 'quota-glance-reset-feed.json'),
      directSource: new XApiSource({ getToken: () => xApiTokenStore.getToken() }),
      officialSource: new OfficialSource(),
    });
    preferences = loadWindowState(preferencesPath);
    resetNotifier = new ResetNotifier({ statePath: path.join(app.getPath('userData'), 'quota-glance-notifications.json'), send: sendResetNotification, getSettings: () => preferences.notifications, getLanguage: () => uiLanguage });
    uiLanguage = preferences.language;
    reader.setRefreshInterval(preferences.refreshIntervalMs);
    createWindow();
    if (preferences.minimumMode) setMinimumMode(true);
    createTray();
    reader.on('change', publish);
    resetFeedReader.on('change', (state) => {
      updateNotifications();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('reset-feed:changed', state);
      }
    });
    await reader.start();
    await resetFeedReader.start();
    notificationTimer = setInterval(() => { resetFeedReader.publish('synced'); }, 15000);
  });
}

app.on('window-all-closed', (event) => event.preventDefault());
app.on('before-quit', () => { isQuitting = true; clearInterval(notificationTimer); reader.stop(); resetFeedReader?.stop(); });

ipcMain.handle('usage:get', () => reader.getSnapshot());
ipcMain.handle('usage:refresh', () => reader.refresh());
ipcMain.handle('usage:get-refresh-interval', () => reader.refreshIntervalMs);
ipcMain.handle('usage:set-refresh-interval', (_event, milliseconds) => { const value = reader.setRefreshInterval(milliseconds); preferences.refreshIntervalMs = value; savePreferences(); return value; });
ipcMain.handle('system:get-metrics', () => collectSystemMetrics());
ipcMain.handle('reset-feed:get', () => resetFeedReader?.getState() || null);
ipcMain.handle('reset-feed:refresh', () => resetFeedReader?.refresh() || null);
ipcMain.handle('x-api:get-status', () => xApiTokenStore?.status() || { configured: false, protected: false });
ipcMain.handle('x-api:set-token', async (_event, token) => { const status = xApiTokenStore.setToken(token); await resetFeedReader.refresh(); return status; });
ipcMain.handle('x-api:clear-token', () => xApiTokenStore.clear());
ipcMain.handle('app:get-preferences', () => preferences);
ipcMain.handle('notifications:set', (_event, value) => { preferences.notifications = normalizeNotifications(value); savePreferences(); updateNotifications(); return preferences.notifications; });
ipcMain.handle('notifications:test', () => sendResetNotification({ title: 'Quota Glance', body: uiLanguage === 'ja' ? 'Windows通知のテストです。' : 'Windows notification test.' }, { effect: false }));
ipcMain.handle('app:set-opacity', (_event, opacity) => {
  preferences.opacity = Math.min(1, Math.max(0.4, Number(opacity) || 1));
  mainWindow.setOpacity(preferences.opacity); savePreferences(); return preferences.opacity;
});
ipcMain.handle('window:get-minimum-mode', () => isMinimumMode);
ipcMain.handle('window:fit-content', (_event, requiredHeight) => {
  if (isMinimumMode || !Number.isFinite(requiredHeight)) return;
  const bounds = mainWindow.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  const height = Math.min(area.height, Math.max(bounds.height, Math.ceil(requiredHeight)));
  if (height > bounds.height) mainWindow.setBounds({ ...bounds, height, y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - height)) });
});
ipcMain.handle('window:set-minimum-mode', (_event, enabled) => { const value = setMinimumMode(enabled); savePreferences(); return value; });
ipcMain.handle('window:toggle-pin', () => {
  const pinned = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(pinned, 'floating');
  return pinned;
});
ipcMain.handle('window:is-pinned', () => mainWindow.isAlwaysOnTop());
ipcMain.handle('app:set-language', (_event, language) => {
  uiLanguage = language === 'en' ? 'en' : 'ja';
  preferences.language = uiLanguage;
  savePreferences();
  updateTrayMenu();
  updateTray(reader.getSnapshot());
  return uiLanguage;
});
ipcMain.on('window:minimize', () => mainWindow.hide());
ipcMain.on('window:close', () => mainWindow.hide());
ipcMain.on('source:reveal', (_event, sourcePath) => {
  if (typeof sourcePath === 'string' && sourcePath.startsWith(codexHome)) {
    shell.showItemInFolder(sourcePath);
  }
});
ipcMain.on('external:open', (_event, url) => {
  if (typeof url === 'string' && safeSourceUrl(url)) {
    shell.openExternal(safeSourceUrl(url));
  }
});
