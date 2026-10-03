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
    resetAlert: '利用上限リセットの告知を検知しました',
    resetAlertSource: '原典を開く',
    xApiLabel: '任意のX API',
    xApiDefault: '公式ステータスと公開フィードを確認します。GoogleアラートRSSは参考情報です。自分のX APIは任意です（料金はXの契約によります）。',
    xApiRss: 'RSS',
    xApiConfigured: 'X API',
    xApiUnavailable: '暗号化不可',
    xApiSave: '保存',
    xApiClear: '削除',
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
    resetAlert: 'A usage-limit reset announcement was detected',
    resetAlertSource: 'Open source',
    xApiLabel: 'Optional X API',
    xApiDefault: 'Checks official status and the public feed. Google Alerts RSS is reference information. Your own X API is optional (X charges may apply).',
    xApiRss: 'RSS',
    xApiConfigured: 'X API',
    xApiUnavailable: 'Encryption unavailable',
    xApiSave: 'Save',
    xApiClear: 'Remove',
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
  resetAlert: document.querySelector('#reset-alert'),
  resetAlertText: document.querySelector('#reset-alert-text'),
  resetAlertLink: document.querySelector('#reset-alert-link'),
  resetCertainty: document.querySelector('#reset-certainty'), resetDetails: document.querySelector('#reset-details'), resetCountdown: document.querySelector('#reset-countdown'), resetSources: document.querySelector('#reset-sources'),
  updatedAt: document.querySelector('#updated-at'),
  planLabel: document.querySelector('#plan-label'),
  refreshButton: document.querySelector('#refresh-button'),
  minimumModeButton: document.querySelector('#minimum-mode-button'),
  opacity: document.querySelector('#opacity'), opacityLabel: document.querySelector('#opacity-label'), opacityValue: document.querySelector('#opacity-value'),
  metricDrive: document.querySelector('#metric-drive'), metricGpu: document.querySelector('#metric-gpu'), metricCpu: document.querySelector('#metric-cpu'), metricMem: document.querySelector('#metric-mem'), metricTemp: document.querySelector('#metric-temp'),
  refreshInterval: document.querySelector('#refresh-interval'),
  refreshIntervalLabel: document.querySelector('#refresh-interval-label'),
  refreshIntervalValue: document.querySelector('#refresh-interval-value'),
  langButton: document.querySelector('#lang-button'),
  pinButton: document.querySelector('#pin-button'),
  minimizeButton: document.querySelector('#minimize-button'),
  closeButton: document.querySelector('#close-button'),
  sourceButton: document.querySelector('#source-button'),
  errorMessage: document.querySelector('#error-message'),
  xApiLabel: document.querySelector('#x-api-label'), xApiNote: document.querySelector('#x-api-note'), xApiStatus: document.querySelector('#x-api-status'), xApiToken: document.querySelector('#x-api-token'), xApiSave: document.querySelector('#x-api-save'), xApiClear: document.querySelector('#x-api-clear'),
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
let currentResetFeed = null;
let notificationSettings = {};
let lastAnnouncementLayout = '';
function fitWindowContent() { requestAnimationFrame(() => window.codexUsage.fitContent?.(document.querySelector('.app-shell').scrollHeight + 2)); }
for (const details of document.querySelectorAll('details')) details.addEventListener('toggle', fitWindowContent);

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
  for (const [key, suffix, kind] of [['drive', '%', 'free'], ['gpu', '%', 'usage'], ['cpu', '%', 'usage'], ['mem', '%', 'usage'], ['temp', '°C', 'temp']]) {
    const el = elements[`metric${key[0].toUpperCase()}${key.slice(1)}`];
    const value = metrics[key];
    if (Number.isFinite(value)) lastSystemMetrics[key] = value;
    const displayedValue = Number.isFinite(value) ? value : lastSystemMetrics[key];
    el.textContent = Number.isFinite(displayedValue) ? `${Math.round(displayedValue)}${suffix}` : '--';
    const tone = kind === 'free'
      ? (displayedValue <= 30 ? 'critical' : displayedValue <= 50 ? 'warning' : 'good')
      : (displayedValue >= 80 ? 'critical' : displayedValue >= (kind === 'temp' ? 60 : 50) ? 'warning' : 'good');
    el.className = Number.isFinite(displayedValue) ? tone : '';
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
  renderResetAlert(currentResetFeed);
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
  elements.opacity.setAttribute('aria-label', elements.opacityLabel.textContent);
  elements.xApiLabel.textContent = t('xApiLabel');
  elements.xApiNote.textContent = t('xApiDefault');
  elements.xApiSave.textContent = t('xApiSave');
  elements.xApiClear.textContent = t('xApiClear');
  renderRefreshInterval();
  applyMinimumMode();
  render(currentSnapshot);
  renderResetAlert(currentResetFeed);
  renderNotificationSettings();
  renderXApiStatus();
}

async function renderXApiStatus() {
  const status = await window.codexUsage.getXApiStatus();
  elements.xApiStatus.textContent = status.configured ? t('xApiConfigured') : status.protected ? t('xApiRss') : t('xApiUnavailable');
  elements.xApiClear.hidden = !status.configured;
  elements.xApiSave.disabled = !status.protected;
}

function renderResetAlert(state) {
  currentResetFeed = state;
  const event = state?.event;
  const layout = event ? JSON.stringify([event.eventId, event.revision, event.status, language, minimumMode]) : `empty-${minimumMode}`;
  if (layout !== lastAnnouncementLayout) { lastAnnouncementLayout = layout; fitWindowContent(); }
  const observation = document.getElementById('local-reset-observation');
  observation.hidden = !state?.localObservation;
  observation.textContent = language === 'ja' ? 'ローカル記録で週間残り100%への回復を確認。全体リセットの完了確認ではありません。' : 'Local records show weekly quota restored to 100%. A global reset is not confirmed.';
  elements.resetAlert.hidden = !event;
  if (!event) return;

  const ja = language === 'ja';
  const statusLabels = ja ? { scheduled: 'リセット予定', active: 'リセット実施中', completed: 'リセット実施済み' } : { scheduled: 'Reset scheduled', active: 'Reset in progress', completed: 'Reset completed' };
  elements.resetAlertText.textContent = event.certainty === 'confirmed' ? statusLabels[event.status] : ja ? 'リセット関連情報' : 'Reset-related information';
  elements.resetAlert.dataset.certainty = event.certainty;
  elements.resetCertainty.textContent = (ja ? { confirmed: '確定', official: '公式情報', secondary: '参考情報' } : { confirmed: 'CONFIRMED', official: 'OFFICIAL', secondary: 'SECONDARY' })[event.certainty] || (ja ? '未確認' : 'UNCONFIRMED');
  const scope = (ja ? { all_users: '全ユーザー', paid_users: '有料ユーザー', unknown: '未発表' } : { all_users: 'All users', paid_users: 'Paid users', unknown: 'Unspecified' })[event.scope] || event.scope;
  const descriptions = ja ? { today: '投稿日当日・時刻未発表', 'later today': '投稿日当日中・時刻未発表', tomorrow: '投稿日翌日・時刻未発表', 'this evening': '投稿日の夕方・時刻とタイムゾーン未発表', soon: '近日・時刻未発表', shortly: 'まもなく・時刻未発表' } : {};
  let when = event.effectiveAt ? `${formatDate(event.effectiveAt)} JST` : descriptions[event.timeDescription] || event.timeDescription || (ja ? '未発表' : 'Unspecified');
  if (event.effectiveAtWindow) when = `${formatDate(event.effectiveAtWindow.from)} ～ ${formatDate(event.effectiveAtWindow.to)} JST`;
  let details = `${ja ? '対象' : 'Scope'}：${scope}\n${ja ? '実施' : 'When'}：${when}`;
  if (event.previousEffectiveAt) details += `\n${ja ? '変更前' : 'Previously'}：${formatDate(event.previousEffectiveAt)} JST`;
  if (event.certainty !== 'confirmed') details += ja ? '\n公式の確定告知は未確認です。' : '\nA confirmed official announcement has not been verified.';
  if (event.type === 'banked_reset') details += ja ? '\n任意に使用するbanked resetです。' : '\nA banked reset, available for manual use.';
  elements.resetDetails.textContent = minimumMode && event.effectiveAt ? `${new Intl.DateTimeFormat(ja ? 'ja-JP' : 'en-US', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(event.effectiveAt))} JST` : details;
  elements.resetDetails.title = details;
  elements.resetCountdown.textContent = event.status === 'scheduled' && event.effectiveAt ? (Date.parse(event.effectiveAt) > Date.now() ? formatCountdown(event.effectiveAt) : ja ? '予定時刻を経過・実施確認待ち' : 'Scheduled time passed; awaiting confirmation') : '';
  const sourceNames = (event.sources || [event.source]).map(s => s.author ? `@${s.author}` : new URL(s.url).hostname);
  elements.resetSources.textContent = `${ja ? '情報源' : 'Sources'}：${[...new Set(sourceNames)].join(' · ')}\n${ja ? '投稿' : 'Published'}：${formatDate(event.publishedAt)}`;
  const sourceLabel = t('resetAlertSource');
  elements.resetAlertLink.textContent = sourceLabel;
  elements.resetAlertLink.title = sourceLabel;
  elements.resetAlertLink.setAttribute('aria-label', sourceLabel);
}

function renderNotificationSettings() {
  const ja = language === 'ja';
  const labels = ja ? ['告知・Windows通知', 'Windows通知', '確定告知のみ', '告知取得時', '実施済み・ローカル回復', '参考情報も通知', '何分前に通知', '通知テスト', '情報取得・X API'] : ['Announcements & notifications', 'Windows notifications', 'Confirmed only', 'On detection', 'Completed & local recovery', 'Include reference information', 'Minutes before', 'Test notification', 'Sources & X API'];
  document.getElementById('settings-summary').textContent = ja ? '設定' : 'Settings';
  document.getElementById('reset-schedule-label').textContent = ja ? 'リセットスケジュール' : 'Reset schedule';
  ['notification-summary', 'notify-enabled-label', 'notify-confirmed-label', 'notify-detection-label', 'notify-completed-label', 'notify-secondary-label', 'notify-before-label', 'notify-test', 'x-api-summary'].forEach((id, i) => document.getElementById(id).textContent = labels[i]);
  for (const [id, key] of [['enabled', 'enabled'], ['confirmed', 'confirmedOnly'], ['detection', 'announceDetection'], ['completed', 'completed'], ['secondary', 'secondarySources']]) document.getElementById(`notify-${id}`).checked = notificationSettings[key] !== false && (key !== 'secondarySources' || notificationSettings[key] === true);
  document.getElementById('notify-before').value = (notificationSettings.beforeMinutes || [30, 10]).join(', ');
  document.getElementById('notify-before').setAttribute('aria-label', labels[6]);
  document.getElementById('notify-five-hour-label').textContent = ja ? '5時間枠のリセット通知' : '5-hour reset notifications';
  document.getElementById('notify-weekly-label').textContent = ja ? '週間枠のリセット通知' : 'Weekly reset notifications';
  document.getElementById('notify-five-hour').checked = notificationSettings.fiveHour !== false;
  document.getElementById('notify-weekly').checked = notificationSettings.weekly !== false;
}
document.querySelector('.notification-settings').addEventListener('change', async () => {
  const values = document.getElementById('notify-before').value.split(',').map(v => Number(v.trim())).filter(n => Number.isInteger(n) && n > 0 && n <= 1440);
  notificationSettings = await window.codexUsage.setNotifications({ enabled: document.getElementById('notify-enabled').checked, fiveHour: document.getElementById('notify-five-hour').checked, weekly: document.getElementById('notify-weekly').checked, confirmedOnly: document.getElementById('notify-confirmed').checked, announceDetection: document.getElementById('notify-detection').checked, completed: document.getElementById('notify-completed').checked, secondarySources: document.getElementById('notify-secondary').checked, beforeMinutes: values });
  renderNotificationSettings();
});
document.getElementById('notify-test').addEventListener('click', async () => {
  const shown = await window.codexUsage.testNotification();
  document.getElementById('notification-result').textContent = language === 'ja' ? (shown ? 'Windowsに通知を送信しました。' : '通知を送信できませんでした。Windowsの通知設定をご確認ください。') : (shown ? 'Notification sent to Windows.' : 'Unable to send. Check Windows notification settings.');
});

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
elements.resetAlertLink.addEventListener('click', () => {
  const sourceUrl = currentResetFeed?.event?.sourceUrl;
  if (sourceUrl) window.codexUsage.openExternal(sourceUrl);
});
elements.xApiSave.addEventListener('click', async () => {
  if (!elements.xApiToken.value.trim()) return;
  await window.codexUsage.setXApiToken(elements.xApiToken.value);
  elements.xApiToken.value = '';
  await renderXApiStatus();
  renderResetAlert(await window.codexUsage.refreshResetFeed());
});
elements.xApiClear.addEventListener('click', async () => {
  await window.codexUsage.clearXApiToken();
  await renderXApiStatus();
  renderResetAlert(await window.codexUsage.refreshResetFeed());
});

window.codexUsage.onChanged(render);
window.codexUsage.onResetFeedChanged(renderResetAlert);
async function initialize() {
  await window.codexUsage.setLanguage(language);
  const milliseconds = Number.isFinite(savedRefreshSeconds)
    ? await window.codexUsage.setRefreshInterval(refreshSeconds * 1000)
    : await window.codexUsage.getRefreshInterval();
  refreshSeconds = Math.min(60, Math.max(1, Math.round(milliseconds / 1000)));
  renderRefreshInterval();
  currentSnapshot = await window.codexUsage.get();
  const preferences = await window.codexUsage.getPreferences();
  notificationSettings = preferences.notifications || {};
  opacity = preferences.opacity;
  renderOpacity();
  renderMetrics(await window.codexUsage.getSystemMetrics());
  renderResetAlert(await window.codexUsage.getResetFeed());
  await renderXApiStatus();
  const savedMinimumMode = localStorage.getItem('quota-glance-minimum-mode') === 'true';
  minimumMode = savedMinimumMode
    ? await window.codexUsage.setMinimumMode(true)
    : await window.codexUsage.getMinimumMode();
  applyLanguage();
  fitWindowContent();
}
initialize();
window.codexUsage.isPinned().then((pinned) => elements.pinButton.classList.toggle('active', pinned));
setInterval(() => {
  renderResetAlert(currentResetFeed);
  if (currentSnapshot?.fiveHour?.resetsAt) {
    elements.fiveHourCountdown.textContent = formatCountdown(currentSnapshot.fiveHour.resetsAt);
  }
  if (currentSnapshot?.weekly?.resetsAt) {
    elements.weeklyCountdown.textContent = formatCountdown(currentSnapshot.weekly.resetsAt);
  }
}, 30_000);
setInterval(async () => renderMetrics(await window.codexUsage.getSystemMetrics()), 5_000);
