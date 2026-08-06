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
    remaining: ({ value }) => `残り ${value}%`,
    remainingGood: '余裕あり',
    remainingWarning: '注意',
    remainingCritical: '残りわずか',
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
    refreshInterval: '更新頻度',
    refreshIntervalValue: ({ seconds }) => `${seconds}秒`,
    refreshIntervalAria: '自動更新の頻度',
    pin: '常に手前に表示',
    minimize: 'タスクトレイに最小化',
    close: 'タスクトレイに隠す',
    revealSource: '取得元ファイルを表示',
    fiveHourAria: '5時間利用量',
    weeklyAria: '週間利用量',
    switchLanguage: 'Switch to English',
    enterMinimumMode: 'ミニマムモードに切り替え',
    exitMinimumMode: '通常表示に戻す',
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
    remaining: ({ value }) => `${value}% left`,
    remainingGood: 'Comfortable',
    remainingWarning: 'Caution',
    remainingCritical: 'Low left',
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
    refreshInterval: 'Refresh interval',
    refreshIntervalValue: ({ seconds }) => `${seconds} sec`,
    refreshIntervalAria: 'Automatic refresh interval',
    pin: 'Always on top',
    minimize: 'Minimize to tray',
    close: 'Hide in tray',
    revealSource: 'Show source file',
    fiveHourAria: '5-hour usage',
    weeklyAria: 'Weekly usage',
    switchLanguage: '日本語に切り替える',
    enterMinimumMode: 'Switch to minimum mode',
    exitMinimumMode: 'Return to full view',
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
  minimumModeButton: document.querySelector('#minimum-mode-button'),
  opacity: document.querySelector('#opacity'), opacityLabel: document.querySelector('#opacity-label'), opacityValue: document.querySelector('#opacity-value'),
  metricGpu: document.querySelector('#metric-gpu'), metricCpu: document.querySelector('#metric-cpu'), metricMem: document.querySelector('#metric-mem'), metricTemp: document.querySelector('#metric-temp'),
  refreshInterval: document.querySelector('#refresh-interval'),
  refreshIntervalLabel: document.querySelector('#refresh-interval-label'),
  refreshIntervalValue: document.querySelector('#refresh-interval-value'),
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
const savedRefreshValue = localStorage.getItem('quota-glance-refresh-seconds');
const savedRefreshSeconds = savedRefreshValue === null ? Number.NaN : Number(savedRefreshValue);
let refreshSeconds = Number.isFinite(savedRefreshSeconds)
  ? Math.min(60, Math.max(1, Math.round(savedRefreshSeconds)))
  : 5;
let refreshIntervalDebounce = null;
let minimumMode = false;
let opacity = 1;
let lastSystemMetrics = {};

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

function renderRefreshInterval() {
  const progress = ((refreshSeconds - 1) / 59) * 100;
  elements.refreshInterval.value = String(refreshSeconds);
  elements.refreshInterval.style.setProperty('--range-progress', `${progress}%`);
  elements.refreshIntervalValue.textContent = t('refreshIntervalValue', { seconds: refreshSeconds });
}

function renderOpacity() {
  const percent = Math.round(opacity * 100);
  const progress = ((percent - 40) / 60) * 100;
  elements.opacity.value = String(percent);
  elements.opacity.style.setProperty('--range-progress', `${progress}%`);
  elements.opacityValue.textContent = `${percent}%`;
}

function renderMetrics(metrics = {}) {
  for (const [key, suffix, kind] of [['gpu', '%', 'usage'], ['cpu', '%', 'usage'], ['mem', '%', 'usage'], ['temp', '°C', 'temp']]) {
    const el = elements[`metric${key[0].toUpperCase()}${key.slice(1)}`];
    const value = metrics[key];
    if (Number.isFinite(value)) lastSystemMetrics[key] = value;
    const displayedValue = Number.isFinite(value) ? value : lastSystemMetrics[key];
    el.textContent = Number.isFinite(displayedValue) ? `${Math.round(displayedValue)}${suffix}` : '--';
    el.className = Number.isFinite(displayedValue)
      ? (displayedValue >= (kind === 'temp' ? 80 : 80) ? 'critical' : displayedValue >= (kind === 'temp' ? 60 : 50) ? 'warning' : 'good')
      : '';
  }
}

function limitState(remaining) {
  if (remaining <= 30) return 'critical';
  if (remaining < 50) return 'warning';
  return 'good';
}

function applyMinimumMode() {
  document.documentElement.classList.toggle('minimum-mode', minimumMode);
  elements.minimumModeButton.classList.toggle('active', minimumMode);
  elements.minimumModeButton.textContent = minimumMode ? 'FULL' : 'MIN';
  const label = t(minimumMode ? 'exitMinimumMode' : 'enterMinimumMode');
  elements.minimumModeButton.title = label;
  elements.minimumModeButton.setAttribute('aria-label', label);
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
  elements.refreshIntervalLabel.textContent = t('refreshInterval');
  elements.refreshInterval.setAttribute('aria-label', t('refreshIntervalAria'));
  elements.opacityLabel.textContent = language === 'ja' ? '透明度' : 'Opacity';
  renderRefreshInterval();
  applyMinimumMode();
  render(currentSnapshot);
}

function renderLimit(limit, targets) {
  const remaining = limit?.remainingPercent;
  if (remaining != null) {
    const roundedRemaining = Math.round(remaining);
    const state = limitState(roundedRemaining);
    targets.summary.textContent = t('remaining', { value: roundedRemaining });
    targets.badge.textContent = t(`remaining${state[0].toUpperCase()}${state.slice(1)}`);
    targets.progressFill.style.width = `${remaining}%`;
    targets.progressTrack.setAttribute('aria-valuenow', String(remaining));
    for (const className of ['good', 'warning', 'critical']) {
      targets.badge.classList.toggle(className, className === state);
      targets.progressFill.classList.toggle(className, className === state);
    }
  } else {
    targets.summary.textContent = '—';
    targets.badge.textContent = t('noInfo');
    targets.progressFill.style.width = '0%';
    targets.progressTrack.setAttribute('aria-valuenow', '0');
    targets.badge.classList.remove('good', 'warning', 'critical');
    targets.progressFill.classList.remove('good', 'warning', 'critical');
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
  elements.updatedAt.textContent = t('updated', { date: formatDate(snapshot.checkedAt || snapshot.observedAt) });
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
elements.opacity.addEventListener('input', () => {
  opacity = Number(elements.opacity.value) / 100;
  renderOpacity();
  window.codexUsage.setOpacity(opacity);
});
elements.minimumModeButton.addEventListener('click', async () => {
  minimumMode = await window.codexUsage.setMinimumMode(!minimumMode);
  localStorage.setItem('quota-glance-minimum-mode', String(minimumMode));
  applyMinimumMode();
});
elements.refreshInterval.addEventListener('input', () => {
  refreshSeconds = Number(elements.refreshInterval.value);
  localStorage.setItem('quota-glance-refresh-seconds', String(refreshSeconds));
  renderRefreshInterval();
  clearTimeout(refreshIntervalDebounce);
  refreshIntervalDebounce = setTimeout(() => {
    window.codexUsage.setRefreshInterval(refreshSeconds * 1000);
  }, 120);
});
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
async function initialize() {
  await window.codexUsage.setLanguage(language);
  const milliseconds = Number.isFinite(savedRefreshSeconds)
    ? await window.codexUsage.setRefreshInterval(refreshSeconds * 1000)
    : await window.codexUsage.getRefreshInterval();
  refreshSeconds = Math.min(60, Math.max(1, Math.round(milliseconds / 1000)));
  renderRefreshInterval();
  currentSnapshot = await window.codexUsage.get();
  const preferences = await window.codexUsage.getPreferences();
  opacity = preferences.opacity;
  renderOpacity();
  renderMetrics(await window.codexUsage.getSystemMetrics());
  const savedMinimumMode = localStorage.getItem('quota-glance-minimum-mode') === 'true';
  minimumMode = savedMinimumMode
    ? await window.codexUsage.setMinimumMode(true)
    : await window.codexUsage.getMinimumMode();
  applyLanguage();
}
initialize();
window.codexUsage.isPinned().then((pinned) => elements.pinButton.classList.toggle('active', pinned));
setInterval(() => {
  if (currentSnapshot?.fiveHour?.resetsAt) {
    elements.fiveHourCountdown.textContent = formatCountdown(currentSnapshot.fiveHour.resetsAt);
  }
  if (currentSnapshot?.weekly?.resetsAt) {
    elements.weeklyCountdown.textContent = formatCountdown(currentSnapshot.weekly.resetsAt);
  }
}, 30_000);
setInterval(async () => renderMetrics(await window.codexUsage.getSystemMetrics()), 5_000);
