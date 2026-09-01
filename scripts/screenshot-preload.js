const { contextBridge } = require('electron');

const now = Date.now();
const criticalPreview = process.argv.includes('--critical');
const resetAlertPreview = process.argv.includes('--reset-alert-preview');
const snapshot = {
  observedAt: new Date(now).toISOString(),
  checkedAt: new Date(now).toISOString(),
  sourcePath: null,
  planType: 'plus',
  limitId: 'codex',
  fiveHour: {
    usedPercent: 46,
    remainingPercent: 54,
    resetsAt: new Date(now + (2 * 60 + 18) * 60 * 1000).toISOString(),
    windowMinutes: 300,
  },
  weekly: {
    usedPercent: criticalPreview ? 72 : 68,
    remainingPercent: criticalPreview ? 28 : 32,
    resetsAt: new Date(now + (3 * 24 + 7) * 60 * 60 * 1000).toISOString(),
    windowMinutes: 10080,
  },
  primary: null,
  secondary: null,
  credits: {
    hasCredits: true,
    unlimited: false,
    balance: 128.5,
  },
  spendControlReached: false,
  rateLimitReachedType: null,
};

let refreshIntervalMs = 5_000;
let minimumMode = false;
let opacity = 1;

const resetFeedState = resetAlertPreview ? {
  event: {
    id: 'preview-reset-alert',
    messageJa: '26/09/01: リセットの可能性あり',
    messageEn: '26/09/01: Reset may be coming',
    sourceUrl: 'https://x.com/thsottiaux/status/2081096447718723984',
  },
  status: 'synced',
} : { event: null, status: 'synced' };

contextBridge.exposeInMainWorld('codexUsage', {
  get: async () => snapshot,
  refresh: async () => snapshot,
  getRefreshInterval: async () => refreshIntervalMs,
  setRefreshInterval: async (milliseconds) => {
    refreshIntervalMs = milliseconds;
    return refreshIntervalMs;
  },
  setLanguage: async (language) => language,
  isPinned: async () => true,
  togglePin: async () => true,
  getMinimumMode: async () => minimumMode,
  setMinimumMode: async (enabled) => {
    minimumMode = enabled === true;
    return minimumMode;
  },
  getPreferences: async () => ({
    bounds: null,
    language: 'ja',
    refreshIntervalMs,
    opacity,
    minimumMode,
  }),
  setOpacity: async (value) => {
    opacity = value;
    return opacity;
  },
  getSystemMetrics: async () => ({ drive: 41, gpu: 27, cpu: 13, mem: 65, temp: 59 }),
  getResetFeed: async () => resetFeedState,
  refreshResetFeed: async () => resetFeedState,
  minimize: () => {},
  close: () => {},
  revealSource: () => {},
  openExternal: () => {},
  onChanged: () => () => {},
  onResetFeedChanged: () => () => {},
});
