const fs = require('node:fs/promises');
const { EventEmitter } = require('node:events');
const { safeSourceUrl, mergeEvents, MAX_AGE_MS } = require('./reset-event');

const DEFAULT_FEED_URL = 'https://raw.githubusercontent.com/VolcaneGD/quota-glance/main/docs/reset-feed.json';
const DEFAULT_REFRESH_INTERVAL_MS = 60_000;
const ALERT_TIMEOUT_MS = 48 * 60 * 60 * 1000;
const DEFAULT_ALERT_STATE = Object.freeze({
  eventId: null,
  displayedAt: null,
  dismissedEventIds: [],
});

function normalizeFeed(feed) {
  if (!feed || ![2, 3].includes(feed.schemaVersion) || !Array.isArray(feed.events)) {
    return { schemaVersion: 3, updatedAt: null, events: [] };
  }
  return {
    schemaVersion: 3,
    updatedAt: typeof feed.updatedAt === 'string' ? feed.updatedAt : null,
    events: mergeEvents(feed.events.map(event => {
      if (feed.schemaVersion === 2) {
        if (!/^\d+$/.test(event?.postId) || !Number.isFinite(Date.parse(event.detectedAt))) return null;
        const id = `x-${event.postId}`;
        return { id, eventId: id, canonicalId: id, detectedAt: event.detectedAt, publishedAt: event.detectedAt, sourceUrl: `https://x.com/i/status/${event.postId}`, source: { type: 'x', tier: 3, url: `https://x.com/i/status/${event.postId}` }, certainty: 'secondary', type: 'unknown', status: 'active', scope: 'unknown', effectiveAt: null, effectiveAtPrecision: 'unknown', revision: 'legacy' };
      }
      const url = safeSourceUrl(event?.sourceUrl || event?.source?.url);
      if (!url || typeof event.eventId !== 'string' || !Number.isFinite(Date.parse(event.publishedAt)) || !Number.isFinite(Date.parse(event.detectedAt))) return null;
      if (!['scheduled', 'active', 'completed', 'expired'].includes(event.status)) return null;
      const effectiveAt = Number.isFinite(Date.parse(event.effectiveAt)) ? event.effectiveAt : null;
      const window = event.effectiveAtWindow;
      const effectiveAtWindow = Number.isFinite(Date.parse(window?.from)) && Number.isFinite(Date.parse(window?.to)) && Date.parse(window.to) >= Date.parse(window.from) ? window : null;
      const tier = [1, 2, 3].includes(event.source?.tier) ? event.source.tier : 3;
      const quotaWindows = (event.quotaWindows || []).filter(w => ['fiveHour', 'weekly'].includes(w));
      const certainty = tier < 3 && event.certainty === 'confirmed' && event.evidence?.explicitReset && event.evidence?.explicitScope ? 'confirmed' : tier < 3 ? 'official' : 'secondary';
      return { eventId: event.eventId, id: event.eventId, canonicalId: typeof event.canonicalId === 'string' ? event.canonicalId : event.eventId, sourceUrl: url, source: { type: event.source?.type || 'official', tier, author: event.source?.author || null, url }, sources: (event.sources || []).filter(s => safeSourceUrl(s.url)), publishedAt: event.publishedAt, detectedAt: event.detectedAt, type: event.type, status: event.status, certainty, scope: event.scope || 'unknown', quotaWindows, effectiveAt, effectiveAtWindow, effectiveAtPrecision: event.effectiveAtPrecision || 'unknown', timeDescription: event.timeDescription || null, previousEffectiveAt: Number.isFinite(Date.parse(event.previousEffectiveAt)) ? event.previousEffectiveAt : null, revision: String(event.revision || '1'), evidence: event.evidence };
    }).filter(Boolean)),
  };
}

function normalizeAlertState(state) {
  return {
    eventId: typeof state?.eventId === 'string' ? state.eventId : null,
    displayedAt: typeof state?.displayedAt === 'string' ? state.displayedAt : null,
    dismissedEventIds: [...new Set(Array.isArray(state?.dismissedEventIds) ? state.dismissedEventIds.filter((id) => typeof id === 'string') : [])].slice(-20),
  };
}

function selectDisplayEvent(feed, now = new Date().toISOString(), dismissed = []) {
  return normalizeFeed(feed).events
    .filter(e => e.status !== 'expired' && Date.parse(now) - Date.parse(e.publishedAt) <= MAX_AGE_MS && Date.parse(e.publishedAt) <= Date.parse(now) && !dismissed.includes(`${e.id}:${e.revision || 'legacy'}`) && !dismissed.includes(e.id))
    .sort((a, b) => Number(b.certainty === 'confirmed') - Number(a.certainty === 'confirmed') || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))[0] || null;
}

function reconcileAlertState(event, weeklyLimit, previousState, now = new Date().toISOString()) {
  const state = normalizeAlertState(previousState);
  const dismissalId = event ? `${event.id}:${event.revision || 'legacy'}` : null;
  if (!event || state.dismissedEventIds.includes(dismissalId) || state.dismissedEventIds.includes(event.id)) return { visible: false, alertState: state };
  if ((event.status !== 'scheduled' || weeklyLimit?.recovered === true) && Number.isFinite(weeklyLimit?.remainingPercent) && weeklyLimit.remainingPercent >= 100) {
    state.dismissedEventIds = [...state.dismissedEventIds, dismissalId].slice(-20);
    return { visible: false, alertState: state };
  }

  if (state.eventId !== event.id) {
    state.eventId = event.id;
    state.displayedAt = now;
  }

  const displayedAt = Date.parse(state.displayedAt);
  if (Number.isFinite(displayedAt) && Date.parse(now) - displayedAt >= ALERT_TIMEOUT_MS) {
    state.dismissedEventIds = [...state.dismissedEventIds, dismissalId].slice(-20);
    return { visible: false, alertState: state };
  }
  return { visible: true, alertState: state };
}

class ResetFeedReader extends EventEmitter {
  constructor({ feedUrl = DEFAULT_FEED_URL, refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS, fetchImpl = globalThis.fetch, cachePath = null, directSource = null, officialSource = null, now = () => new Date().toISOString() } = {}) {
    super();
    this.feedUrl = feedUrl;
    this.refreshIntervalMs = refreshIntervalMs;
    this.fetchImpl = fetchImpl;
    this.cachePath = cachePath;
    this.directSource = directSource;
    this.officialSource = officialSource;
    this.inFlight = null;
    this.cacheWrite = Promise.resolve();
    this.now = now;
    this.timer = null;
    this.feed = normalizeFeed(null);
    this.alertState = normalizeAlertState(DEFAULT_ALERT_STATE);
    this.usageSnapshot = null;
    this.state = { event: null, status: 'idle', updatedAt: null };
  }

  getState() { return this.state; }

  setUsageSnapshot(snapshot) {
    const previous = this.usageSnapshot?.weekly?.remainingPercent;
    if (Number.isFinite(previous) && previous < 100 && snapshot?.weekly?.remainingPercent === 100) this.localObservation = { observedAt: this.now(), type: 'quota_recovery' };
    this.usageSnapshot = snapshot;
    this.publish('synced');
  }

  async start() {
    await this.loadCache();
    await this.refresh();
    this.stop();
    this.timer = setInterval(() => this.refresh(), this.refreshIntervalMs);
  }

  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async refresh() {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.refreshSources().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  async refreshSources() {
    const results = await Promise.allSettled([
      this.directSource?.fetchEvents?.() || [], this.officialSource?.fetchEvents?.() || [],
      (async () => {
        if (typeof this.fetchImpl !== 'function') return [];
        const response = await this.fetchImpl(this.feedUrl, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('Feed unavailable');
        return normalizeFeed(await response.json()).events;
      })(),
    ]);
    const incoming = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    for (const event of incoming) {
      const old = this.feed.events.find(e => e.eventId === event.eventId);
      if (old && old.effectiveAt !== event.effectiveAt) event.previousEffectiveAt = old.effectiveAt;
    }
    const updatedIds = new Set(incoming.map(e => e.eventId));
    this.feed = normalizeFeed({ schemaVersion: 3, updatedAt: this.now(), events: [...this.feed.events.filter(e => !updatedIds.has(e.eventId) && Date.parse(this.now()) - Date.parse(e.publishedAt) <= MAX_AGE_MS), ...incoming] });
    this.publish(results.some(r => r.status === 'rejected') ? 'partial' : 'synced');
    return this.state;
  }

  async loadCache() {
    if (!this.cachePath) return;
    try {
      const cache = JSON.parse(await fs.readFile(this.cachePath, 'utf8'));
      this.feed = normalizeFeed(cache.feed);
      this.alertState = normalizeAlertState(cache.alertState);
    } catch {}
  }

  persistCache() {
    if (!this.cachePath) return;
    const data = `${JSON.stringify({ feed: this.feed, alertState: this.alertState })}\n`;
    this.cacheWrite = this.cacheWrite.then(() => fs.writeFile(this.cachePath, data, 'utf8')).catch(() => {});
  }

  publish(status) {
    const event = selectDisplayEvent(this.feed, this.now(), this.alertState.dismissedEventIds);
    const weekly = this.usageSnapshot?.weekly;
    const recovered = this.localObservation && Date.parse(this.localObservation.observedAt) >= Date.parse(this.alertState.displayedAt || this.now());
    const result = reconcileAlertState(event, weekly ? { ...weekly, recovered: !!recovered } : weekly, this.alertState, this.now());
    this.alertState = result.alertState;
    this.state = { event: result.visible ? event : null, events: this.feed.events.filter(e => Date.parse(this.now()) - Date.parse(e.publishedAt) <= MAX_AGE_MS), localObservation: this.localObservation && Date.parse(this.now()) - Date.parse(this.localObservation.observedAt) < ALERT_TIMEOUT_MS ? this.localObservation : null, status, updatedAt: this.feed.updatedAt };
    this.persistCache();
    this.emit('change', this.state);
  }
}

module.exports = {
  ALERT_TIMEOUT_MS,
  DEFAULT_ALERT_STATE,
  DEFAULT_FEED_URL,
  ResetFeedReader,
  normalizeFeed,
  reconcileAlertState,
  selectDisplayEvent,
};
