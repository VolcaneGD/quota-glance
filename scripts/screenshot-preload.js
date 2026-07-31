const { contextBridge } = require('electron');

const now = Date.now();
const snapshot = {
  observedAt: new Date(now).toISOString(),
  sourcePath: null,
  planType: 'plus',
  limitId: 'codex',
  weekly: {
    usedPercent: 68,
    remainingPercent: 32,
    resetsAt: new Date(now + (3 * 24 + 7) * 60 * 60 * 1000).toISOString(),
    windowMinutes: 10080,
  },
  secondary: null,
  credits: {
    hasCredits: true,
    unlimited: false,
    balance: 128.5,
  },
  spendControlReached: false,
  rateLimitReachedType: null,
};

contextBridge.exposeInMainWorld('codexUsage', {
  get: async () => snapshot,
  refresh: async () => snapshot,
  setLanguage: async (language) => language,
  isPinned: async () => true,
  togglePin: async () => true,
  minimize: () => {},
  close: () => {},
  revealSource: () => {},
  onChanged: () => () => {},
});
