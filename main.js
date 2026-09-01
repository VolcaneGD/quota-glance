const path = require('node:path');
const { app, BrowserWindow, ipcMain, Menu, nativeImage, safeStorage, shell, Tray } = require('electron');
const { UsageReader } = require('./src/usage-reader');
const { ResetFeedReader } = require('./src/reset-feed');
const { collectSystemMetrics } = require('./src/system-metrics');
const { loadWindowState, saveWindowState } = require('./src/window-state');
const { SecureTokenStore } = require('./src/secure-token-store');
const { XApiSource } = require('./src/x-api-source');

let mainWindow;
let tray;
let isQuitting = false;
let uiLanguage = 'ja';
let isMinimumMode = false;
let standardWindowBounds = { width: 372, height: 652 };
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
  const bounds = preferences.bounds || { width: 372, height: 652 };
  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: Math.max(372, bounds.width),
    height: Math.max(652, bounds.height),
    minWidth: 340,
    minHeight: 604,
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
      Math.max(652, standardWindowBounds.height),
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
    preferencesPath = path.join(app.getPath('userData'), 'quota-glance-state.json');
    xApiTokenStore = new SecureTokenStore(path.join(app.getPath('userData'), 'quota-glance-x-api.json'), safeStorage);
    resetFeedReader = new ResetFeedReader({
      cachePath: path.join(app.getPath('userData'), 'quota-glance-reset-feed.json'),
      directSource: new XApiSource({ getToken: () => xApiTokenStore.getToken() }),
    });
    preferences = loadWindowState(preferencesPath);
    uiLanguage = preferences.language;
    reader.setRefreshInterval(preferences.refreshIntervalMs);
    createWindow();
    if (preferences.minimumMode) setMinimumMode(true);
    createTray();
    reader.on('change', publish);
    resetFeedReader.on('change', (state) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('reset-feed:changed', state);
      }
    });
    await reader.start();
    await resetFeedReader.start();
  });
}

app.on('window-all-closed', (event) => event.preventDefault());
app.on('before-quit', () => { isQuitting = true; reader.stop(); resetFeedReader?.stop(); });

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
ipcMain.handle('app:set-opacity', (_event, opacity) => {
  preferences.opacity = Math.min(1, Math.max(0.4, Number(opacity) || 1));
  mainWindow.setOpacity(preferences.opacity); savePreferences(); return preferences.opacity;
});
ipcMain.handle('window:get-minimum-mode', () => isMinimumMode);
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
  if (typeof url === 'string' && /^https:\/\/x\.com\/i\/status\/\d+$/.test(url)) {
    shell.openExternal(url);
  }
});
