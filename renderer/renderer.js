const I18N = {
  ja: {
    loading: '読み込み中',
    synced: 'ローカル同期中',
    waiting: 'データ待機中',
    noData: 'Codexの利用状況データがまだ見つかりません。Codexを一度利用してから更新してください。',
    loadError: '利用状況を読み込めませんでした。',
    balanceLabel: '残高・残りクレジット',
    checking: '最新情報を確認しています',
    unlimited: 'クレジット制限なし',
    availableCredits: '利用可能な追加クレジット',
    unavailableCredits: '追加クレジットは利用できません',
    noBalance: '残高情報なし',
    fiveHourLabel: '5時間利用上限',
    weeklyLabel: '週間利用上限',
    used: ({ value }) => `${value}% 使用`,
    remaining: ({ value }) => `残り ${value}%`,
    noInfo: '情報なし',
    resetPrefix: 'リセット',
    noReset: 'リセット日時は取得できません',
    soon: 'まもなく更新されます',
    daysLeft: ({ days, hours }) => `あと ${days}日 ${hours}時間`,
    hoursLeft: ({ hours, minutes }) => `あと ${hours}時間 ${minutes}分`,
    minutesLeft: ({ minutes }) => `あと ${minutes}分`,
    updated: ({ date }) => `最終取得 ${date}`,
    refresh: '更新',
    refreshing: '更新中',
    pin: '常に手前に表示',
    minimize: 'タスクトレイに最小化',
    close: 'タスクトレイに隠す',
    revealSource: '取得元ファイルを表示',
    fiveHourAria: '5時間利用量',
    weeklyAria: '週間利用量',
    switchLanguage: 'Switch to English',
  },
  en: {
    loading: 'Loading',
    synced: 'Synced locally',
    waiting: 'Waiting for data',
    noData: 'No Codex usage data was found. Use Codex once, then refresh.',
    loadError: 'Unable to load usage data.',
    balanceLabel: 'Balance & remaining credits',
    checking: 'Checking the latest local data',
    unlimited: 'Unlimited credits',
    availableCredits: 'Additional credits available',
    unavailableCredits: 'Additional credits unavailable',
    noBalance: 'Balance unavailable',
    fiveHourLabel: '5-hour usage limit',
    weeklyLabel: 'Weekly usage limit',
    used: ({ value }) => `${value}% used`,
    remaining: ({ value }) => `${value}% left`,
    noInfo: 'No data',
    resetPrefix: 'Resets',
    noReset: 'Reset time unavailable',
    soon: 'Updating soon',
    daysLeft: ({ days, hours }) => `${days}d ${hours}h remaining`,
    hoursLeft: ({ hours, minutes }) => `${hours}h ${minutes}m remaining`,
    minutesLeft: ({ minutes }) => `${minutes}m remaining`,
    updated: ({ date }) => `Updated ${date}`,
    refresh: 'Refresh',
    refreshing: 'Refreshing',
    pin: 'Always on top',
    minimize: 'Minimize to tray',
    close: 'Hide in tray',
    revealSource: 'Show source file',
    fiveHourAria: '5-hour usage',
    weeklyAria: 'Weekly usage',
    switchLanguage: '日本語に切り替える',
  },
};

const elements = {
  statusDot: document.querySelector('#status-dot'),
  statusText: document.querySelector('#status-text'),
  balanceLabel: document.querySelector('#balance-label'),
  creditBalance: document.querySelector('#credit-balance'),
  creditUnit: document.querySelector('#credit-unit'),
  creditNote: document.querySelector('#credit-note'),
  fiveHourLabel: document.querySelector('#five-hour-label'),
  fiveHourSummary: document.querySelector('#five-hour-summary'),
  fiveHourBadge: document.querySelector('#five-hour-badge'),
  fiveHourProgressTrack: document.querySelector('#five-hour-progress-track'),
  fiveHourProgressFill: document.querySelector('#five-hour-progress-fill'),
  fiveHourResetTime: document.querySelector('#five-hour-reset-time'),
  fiveHourCountdown: document.querySelector('#five-hour-countdown'),
  weeklyLabel: document.querySelector('#weekly-label'),
  weeklySummary: document.querySelector('#weekly-summary'),
  weeklyBadge: document.querySelector('#weekly-badge'),
  weeklyProgressTrack: document.querySelector('#weekly-progress-track'),
  weeklyProgressFill: document.querySelector('#weekly-progress-fill'),
  weeklyResetTime: document.querySelector('#weekly-reset-time'),
  weeklyCountdown: document.querySelector('#weekly-countdown'),
  updatedAt: document.querySelector('#updated-at'),
  planLabel: document.querySelector('#plan-label'),
  refreshButton: document.querySelector('#refresh-button'),
  langButton: document.querySelector('#lang-button'),
  pinButton: document.querySelector('#pin-button'),
  minimizeButton: document.querySelector('#minimize-button'),
  closeButton: document.querySelector('#close-button'),
  sourceButton: document.querySelector('#source-button'),
  errorMessage: document.querySelector('#error-message'),
};

let currentSnapshot = null;
const savedLanguage = localStorage.getItem('quota-glance-language') || localStorage.getItem('codex-usage-language');
let language = savedLanguage === 'en' ? 'en' : 'ja';

const limitElements = {
  fiveHour: {
    summary: elements.fiveHourSummary,
    badge: elements.fiveHourBadge,
    progressTrack: elements.fiveHourProgressTrack,
    progressFill: elements.fiveHourProgressFill,
    resetTime: elements.fiveHourResetTime,
    countdown: elements.fiveHourCountdown,
  },
  weekly: {
    summary: elements.weeklySummary,
    badge: elements.weeklyBadge,
    progressTrack: elements.weeklyProgressTrack,
    progressFill: elements.weeklyProgressFill,
    resetTime: elements.weeklyResetTime,
    countdown: elements.weeklyCountdown,
  },
};

function t(key, values = {}) {
  const value = I18N[language][key];
  return typeof value === 'function' ? value(values) : value;
}

function formatNumber(value) {
  const locale = language === 'ja' ? 'ja-JP' : 'en-US';
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

function formatDate(value) {
  if (!value) return '—';
  const japanese = language === 'ja';
  return new Intl.DateTimeFormat(japanese ? 'ja-JP' : 'en-US', {
    timeZone: 'Asia/Tokyo',
    month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
    hour12: !japanese,
    ...(japanese ? {} : { timeZoneName: 'short' }),
  }).format(new Date(value));
}

function formatCountdown(value) {
  if (!value) return t('noReset');
  const remaining = Math.max(0, Date.parse(value) - Date.now());
  if (remaining === 0) return t('soon');
  const totalMinutes = Math.ceil(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return t('daysLeft', { days, hours });
  if (hours > 0) return t('hoursLeft', { hours, minutes });
  return t('minutesLeft', { minutes });
}

function applyLanguage() {
  document.documentElement.lang = language;
  elements.balanceLabel.textContent = t('balanceLabel');
  elements.fiveHourLabel.textContent = t('fiveHourLabel');
  elements.weeklyLabel.textContent = t('weeklyLabel');
  elements.fiveHourProgressTrack.setAttribute('aria-label', t('fiveHourAria'));
  elements.weeklyProgressTrack.setAttribute('aria-label', t('weeklyAria'));
  elements.sourceButton.title = t('revealSource');
  elements.pinButton.title = t('pin');
  elements.pinButton.setAttribute('aria-label', t('pin'));
  elements.minimizeButton.title = t('minimize');
  elements.minimizeButton.setAttribute('aria-label', t('minimize'));
  elements.closeButton.title = t('close');
  elements.closeButton.setAttribute('aria-label', t('close'));
  elements.langButton.textContent = language === 'ja' ? 'EN' : 'JA';
  elements.langButton.title = t('switchLanguage');
  elements.langButton.setAttribute('aria-label', t('switchLanguage'));
  elements.refreshButton.textContent = t('refresh');
  render(currentSnapshot);
}

function renderLimit(limit, targets) {
  const used = limit?.usedPercent;
  const remaining = limit?.remainingPercent;
  if (used != null) {
    const roundedUsed = Math.round(used);
    const roundedRemaining = Math.round(remaining);
    targets.summary.textContent = t('used', { value: roundedUsed });
    targets.badge.textContent = t('remaining', { value: roundedRemaining });
    targets.progressFill.style.width = `${used}%`;
    targets.progressTrack.setAttribute('aria-valuenow', String(used));
    const warning = used >= 85;
    targets.badge.classList.toggle('warn', warning);
    targets.progressFill.classList.toggle('warn', warning);
  } else {
    targets.summary.textContent = '—';
    targets.badge.textContent = t('noInfo');
    targets.progressFill.style.width = '0%';
    targets.progressTrack.setAttribute('aria-valuenow', '0');
    targets.badge.classList.remove('warn');
    targets.progressFill.classList.remove('warn');
  }

  targets.resetTime.textContent = limit?.resetsAt
    ? `${t('resetPrefix')} ${formatDate(limit.resetsAt)}`
    : t('noReset');
  targets.countdown.textContent = limit?.resetsAt ? formatCountdown(limit.resetsAt) : '';
}

function render(snapshot) {
  currentSnapshot = snapshot;
  if (!snapshot || snapshot.unavailableReason) {
    elements.statusText.textContent = t('waiting');
    elements.statusDot.classList.add('stale');
    elements.creditNote.textContent = t('checking');
    elements.errorMessage.hidden = false;
    elements.errorMessage.textContent = snapshot?.unavailableReason ? t('noData') : t('loadError');
    return;
  }

  const credits = snapshot.credits;
  if (credits?.unlimited) {
    elements.creditBalance.textContent = '∞';
    elements.creditUnit.textContent = 'unlimited';
    elements.creditNote.textContent = t('unlimited');
  } else if (credits?.balance != null) {
    elements.creditBalance.textContent = formatNumber(credits.balance);
    elements.creditUnit.textContent = 'credits';
    elements.creditNote.textContent = credits.hasCredits ? t('availableCredits') : t('unavailableCredits');
  } else {
    elements.creditBalance.textContent = '—';
    elements.creditUnit.textContent = 'credits';
    elements.creditNote.textContent = t('noBalance');
  }

  renderLimit(snapshot.fiveHour, limitElements.fiveHour);
  renderLimit(snapshot.weekly, limitElements.weekly);
  elements.updatedAt.textContent = t('updated', { date: formatDate(snapshot.observedAt) });
  elements.planLabel.textContent = snapshot.planType || 'Codex';
  elements.statusText.textContent = t('synced');
  elements.statusDot.classList.remove('stale');
  elements.errorMessage.hidden = true;
}

async function refresh() {
  elements.refreshButton.classList.add('loading');
  elements.refreshButton.textContent = t('refreshing');
  try { render(await window.codexUsage.refresh()); }
  finally {
    elements.refreshButton.classList.remove('loading');
    elements.refreshButton.textContent = t('refresh');
  }
}

elements.refreshButton.addEventListener('click', refresh);
elements.langButton.addEventListener('click', async () => {
  language = language === 'ja' ? 'en' : 'ja';
  localStorage.setItem('quota-glance-language', language);
  await window.codexUsage.setLanguage(language);
  applyLanguage();
});
elements.pinButton.addEventListener('click', async () => {
  const pinned = await window.codexUsage.togglePin();
  elements.pinButton.classList.toggle('active', pinned);
});
elements.minimizeButton.addEventListener('click', () => window.codexUsage.minimize());
elements.closeButton.addEventListener('click', () => window.codexUsage.close());
elements.sourceButton.addEventListener('click', () => {
  if (currentSnapshot?.sourcePath) window.codexUsage.revealSource(currentSnapshot.sourcePath);
});

window.codexUsage.onChanged(render);
window.codexUsage.setLanguage(language).then(() => window.codexUsage.get()).then((snapshot) => {
  currentSnapshot = snapshot;
  applyLanguage();
});
window.codexUsage.isPinned().then((pinned) => elements.pinButton.classList.toggle('active', pinned));
setInterval(() => {
  if (currentSnapshot?.fiveHour?.resetsAt) {
    elements.fiveHourCountdown.textContent = formatCountdown(currentSnapshot.fiveHour.resetsAt);
  }
  if (currentSnapshot?.weekly?.resetsAt) {
    elements.weeklyCountdown.textContent = formatCountdown(currentSnapshot.weekly.resetsAt);
  }
}, 30_000);
