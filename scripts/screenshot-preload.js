const { contextBridge } = require('electron');

const now = Date.now();
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
    usedPercent: 68,
    remainingPercent: 32,
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
  minimize: () => {},
  close: () => {},
  revealSource: () => {},
  onChanged: () => () => {},
});
