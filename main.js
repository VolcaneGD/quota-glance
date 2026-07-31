const path = require('node:path');
const { app, BrowserWindow, ipcMain, Menu, nativeImage, shell, Tray } = require('electron');
const { UsageReader } = require('./src/usage-reader');

let mainWindow;
let tray;
let isQuitting = false;
let uiLanguage = 'ja';

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
  mainWindow = new BrowserWindow({
    width: 372,
    height: 604,
    minWidth: 340,
    minHeight: 556,
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
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('usage:changed', snapshot);
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
    createWindow();
    createTray();
    reader.on('change', publish);
    await reader.start();
  });
}

app.on('window-all-closed', (event) => event.preventDefault());
app.on('before-quit', () => { isQuitting = true; reader.stop(); });

ipcMain.handle('usage:get', () => reader.getSnapshot());
ipcMain.handle('usage:refresh', () => reader.refresh());
ipcMain.handle('usage:get-refresh-interval', () => reader.refreshIntervalMs);
ipcMain.handle('usage:set-refresh-interval', (_event, milliseconds) => reader.setRefreshInterval(milliseconds));
ipcMain.handle('window:toggle-pin', () => {
  const pinned = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(pinned, 'floating');
  return pinned;
});
ipcMain.handle('window:is-pinned', () => mainWindow.isAlwaysOnTop());
ipcMain.handle('app:set-language', (_event, language) => {
  uiLanguage = language === 'en' ? 'en' : 'ja';
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
