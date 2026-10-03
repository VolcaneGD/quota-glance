const fs = require('node:fs');
const path = require('node:path');
const DEFAULT_NOTIFICATIONS = Object.freeze({ enabled: true, fiveHour: true, weekly: true, confirmedOnly: true, announceDetection: true, beforeMinutes: [30, 10], completed: true, secondarySources: false });
function normalizeNotifications(value = {}) {
  const result = { ...DEFAULT_NOTIFICATIONS };
  for (const key of ['enabled', 'fiveHour', 'weekly', 'confirmedOnly', 'announceDetection', 'completed', 'secondarySources']) if (typeof value[key] === 'boolean') result[key] = value[key];
  if (Array.isArray(value.beforeMinutes)) result.beforeMinutes = [...new Set(value.beforeMinutes.filter(n => Number.isInteger(n) && n > 0 && n <= 1440))].sort((a, b) => b - a).slice(0, 5);
  return result;
}
function notificationCopy(event, kind, language = 'ja', minutes) {
  const ja = language !== 'en';
  const titles = ja ? { detection: 'リセット予定を検知', active: 'リセット実施中の告知', completed: 'リセット実施済みの告知', revision: 'リセット告知が変更されました', reminder: `リセット予定の${minutes}分前`, local: '利用枠の回復をローカルデータで検知', cancelled: 'リセット予定の撤回を検知' }
    : { detection: 'Reset scheduled', active: 'Reset in progress', completed: 'Reset announced as completed', revision: 'Reset announcement updated', reminder: `Reset scheduled in ${minutes} minutes`, local: 'Local quota recovery observed', cancelled: 'Reset schedule withdrawn' };
  const scope = ({ all_users: ja ? '全ユーザー' : 'All users', paid_users: ja ? '有料ユーザー' : 'Paid users', unknown: ja ? '対象未発表' : 'Scope unspecified' })[event.scope] || event.scope;
  let when = event.effectiveAt ? new Intl.DateTimeFormat(ja ? 'ja-JP' : 'en-US', { timeZone: 'Asia/Tokyo', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(event.effectiveAt)) + ' JST' : event.timeDescription || (ja ? '時刻未発表' : 'Time unspecified');
  if (event.effectiveAtWindow) when = `${event.effectiveAtWindow.from} – ${event.effectiveAtWindow.to}`;
  const body = kind === 'local' ? (ja ? 'Codexの記録で週間残り100%への回復を確認しました。OpenAI全体の完了確認ではありません。' : 'Codex local records show weekly quota restored to 100%. This does not confirm a global reset.')
    : `${scope} · ${when}${event.certainty === 'confirmed' ? '' : ja ? '\n参考情報：公式の確定告知ではありません。' : '\nReference information, not a confirmed announcement.'}`;
  const previous = kind === 'revision' && event.previousEffectiveAt ? `\n${ja ? '変更前' : 'Previously'}: ${event.previousEffectiveAt}` : '';
  return { title: `Quota Glance — ${titles[kind]}`, body: body + previous, sourceUrl: event.sourceUrl };
}
class ResetNotifier {
  constructor({ statePath = null, send, getSettings = () => DEFAULT_NOTIFICATIONS, getLanguage = () => 'ja', now = () => Date.now() } = {}) {
    Object.assign(this, { statePath, send, getSettings, getLanguage, now });
    this.state = { events: {}, sent: {}, quotaSchedules: {}, previousLimits: {}, pendingRecoveries: {} };
    try { const stored = JSON.parse(fs.readFileSync(statePath, 'utf8')); if (stored.events && stored.sent) this.state = stored; } catch {}
    this.previousLimits = this.state.previousLimits ||= {};
    this.state.pendingRecoveries ||= {};
  }
  persist() {
    if (!this.statePath) return;
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    const tmp = `${this.statePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state), 'utf8'); fs.renameSync(tmp, this.statePath);
  }
  async update(events = [], usage = {}) {
    const settings = normalizeNotifications(this.getSettings());
    const now = this.now();
    const limits = usage?.weekly || usage?.fiveHour ? usage : { weekly: usage };
    this.state.quotaSchedules ||= {};
    for (const window of ['fiveHour', 'weekly']) {
      const limit = limits[window];
      const remaining = limit?.remainingPercent;
      const recovered = Number.isFinite(this.previousLimits[window]) && this.previousLimits[window] < 100 && remaining === 100;
      if (recovered) this.state.pendingRecoveries[window] = { resetsAt: limit.resetsAt, observedAt: new Date(now).toISOString() };
      if (now - Date.parse(this.state.pendingRecoveries[window]?.observedAt) >= 10 * 60000) delete this.state.pendingRecoveries[window];
      if (Number.isFinite(remaining)) this.previousLimits[window] = remaining;
      const ja = this.getLanguage() !== 'en';
      const label = window === 'fiveHour' ? (ja ? '5時間枠' : '5-hour quota') : (ja ? '週間枠' : 'Weekly quota');
      const scheduledAt = this.state.quotaSchedules[window];
      const scheduled = Date.parse(scheduledAt);
      const due = Number.isFinite(scheduled) && now >= scheduled && now - scheduled < 10 * 60000;
      if (settings.enabled && settings[window]) {
        const sendOnce = async (key, copy) => { if (!this.state.sent[key] && await this.send(copy)) this.state.sent[key] = new Date(now).toISOString(); };
        const pending = this.state.pendingRecoveries[window];
        if (settings.completed && pending) {
          const copy = notificationCopy({}, 'local', this.getLanguage());
          copy.body = ja ? `${label}：Codexのローカル記録で残り100%への回復を確認しました。OpenAI全体の完了確認ではありません。` : `${label}: Codex local records show quota restored to 100%. This does not confirm a global reset.`;
          const key = `local:${window}:${pending.resetsAt || pending.observedAt}`;
          await sendOnce(key, copy);
          if (this.state.sent[key]) delete this.state.pendingRecoveries[window];
        }
        if (due && !recovered) await sendOnce(`quota-time:${window}:${scheduledAt}`, { title: ja ? `Quota Glance — ${label}のリセット時刻` : `Quota Glance — ${label} reset time`, body: ja ? 'Codexが記録した通常のリセット時刻になりました。利用枠への反映は次のローカル記録で確認します。' : 'The regular reset time recorded by Codex has arrived. Quota recovery awaits the next local record.' });
      }
      // Evaluate the old deadline before accepting the next cycle's schedule.
      const retryDeadline = due && !recovered && settings.enabled && settings[window] && !this.state.sent[`quota-time:${window}:${scheduledAt}`];
      if (!retryDeadline && Number.isFinite(Date.parse(limit?.resetsAt)) && Date.parse(limit.resetsAt) > now) this.state.quotaSchedules[window] = limit.resetsAt;
      if (!settings.enabled || !settings[window] || !settings.completed) delete this.state.pendingRecoveries[window];
    }
    for (const event of events) {
      const id = event.canonicalId || event.eventId;
      const old = this.state.events[id] || Object.values(this.state.events).find(e => e.eventId === event.eventId);
      const changed = old && old.revision !== event.revision;
      const firstSeen = old?.firstSeen ?? now;
      this.state.events[id] = { eventId: event.eventId, revision: event.revision, effectiveAt: event.effectiveAt, firstSeen };
      if (now - firstSeen >= 48 * 3600000 || now - Date.parse(event.publishedAt) > 3 * 86400000) continue;
      if (!settings.enabled || (settings.confirmedOnly && event.certainty !== 'confirmed') || (event.certainty === 'secondary' && !settings.secondarySources)) continue;
      const windows = Array.isArray(event.quotaWindows) && event.quotaWindows.length ? event.quotaWindows : ['fiveHour', 'weekly'];
      if (!windows.some(window => settings[window] === true)) continue;
      const emit = async (kind, minutes) => {
        const key = `${id}:${event.revision}:${kind}:${minutes || ''}`;
        if (this.state.sent[key]) return;
        // send resolves only after Windows accepts the notification; failures remain retryable.
        if (await this.send(notificationCopy({ ...event, previousEffectiveAt: old?.effectiveAt }, kind, this.getLanguage(), minutes))) this.state.sent[key] = new Date(now).toISOString();
      };
      if (event.status === 'expired') { if (changed) await emit('cancelled'); continue; }
      if (changed) {
        await emit('revision');
        if (this.state.sent[`${id}:${event.revision}:revision:`]) this.state.sent[`${id}:${event.revision}:${event.status === 'scheduled' ? 'detection' : 'active'}:`] = new Date(now).toISOString();
      }
      else if (settings.announceDetection && event.status !== 'completed') await emit(event.status === 'scheduled' ? 'detection' : 'active');
      if (settings.completed && event.status === 'completed') await emit('completed');
      if (event.status === 'scheduled' && event.effectiveAt && event.effectiveAtPrecision === 'exact') {
        const left = (Date.parse(event.effectiveAt) - now) / 60000;
        const due = settings.beforeMinutes.filter(n => left > 0 && left <= n).sort((a, b) => a - b);
        if (due.length) {
          await emit('reminder', due[0]);
          for (const n of due.slice(1)) this.state.sent[`${id}:${event.revision}:reminder:${n}`] = new Date(now).toISOString();
        }
      }
    }
    for (const [id, record] of Object.entries(this.state.events)) if (now - record.firstSeen > 7 * 86400000) delete this.state.events[id];
    for (const [key, sentAt] of Object.entries(this.state.sent)) if (now - Date.parse(sentAt) > 7 * 86400000) delete this.state.sent[key];
    this.persist();
  }
}
module.exports = { ResetNotifier, DEFAULT_NOTIFICATIONS, normalizeNotifications, notificationCopy };
