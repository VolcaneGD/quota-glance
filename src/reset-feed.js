const fs = require('node:fs/promises');
const { EventEmitter } = require('node:events');

const DEFAULT_FEED_URL = 'https://raw.githubusercontent.com/VolcaneGD/quota-glance/main/docs/reset-feed.json';
const DEFAULT_REFRESH_INTERVAL_MS = 60_000;
const ALERT_TIMEOUT_MS = 48 * 60 * 60 * 1000;
const DEFAULT_ALERT_STATE = Object.freeze({
  eventId: null,
  displayedAt: null,
  dismissedEventIds: [],
});

function normalizeFeed(feed) {
  if (!feed || feed.schemaVersion !== 2 || !Array.isArray(feed.events)) {
    return { schemaVersion: 2, updatedAt: null, events: [] };
  }
  return {
    schemaVersion: 2,
    updatedAt: typeof feed.updatedAt === 'string' ? feed.updatedAt : null,
    events: feed.events.filter((event) => event && /^\d+$/.test(event.postId) && Number.isFinite(Date.parse(event.detectedAt)))
      .map((event) => ({
        id: event.postId,
        detectedAt: event.detectedAt,
        sourceUrl: `https://x.com/i/status/${event.postId}`,
      })),
  };
}

function normalizeAlertState(state) {
  return {
    eventId: typeof state?.eventId === 'string' ? state.eventId : null,
    displayedAt: typeof state?.displayedAt === 'string' ? state.displayedAt : null,
    dismissedEventIds: [...new Set(Array.isArray(state?.dismissedEventIds) ? state.dismissedEventIds.filter((id) => typeof id === 'string') : [])].slice(-20),
  };
}

function selectDisplayEvent(feed) {
  return normalizeFeed(feed).events
    .sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt))[0] || null;
}

function reconcileAlertState(event, weeklyLimit, previousState, now = new Date().toISOString()) {
  const state = normalizeAlertState(previousState);
  if (!event || state.dismissedEventIds.includes(event.id)) return { visible: false, alertState: state };
  if (Number.isFinite(weeklyLimit?.remainingPercent) && weeklyLimit.remainingPercent >= 100) {
    state.dismissedEventIds = [...state.dismissedEventIds, event.id].slice(-20);
    return { visible: false, alertState: state };
  }

  if (state.eventId !== event.id) {
    state.eventId = event.id;
    state.displayedAt = now;
  }

  const displayedAt = Date.parse(state.displayedAt);
  if (Number.isFinite(displayedAt) && Date.parse(now) - displayedAt >= ALERT_TIMEOUT_MS) {
    state.dismissedEventIds = [...state.dismissedEventIds, event.id].slice(-20);
    return { visible: false, alertState: state };
  }
  return { visible: true, alertState: state };
}

class ResetFeedReader extends EventEmitter {
  constructor({ feedUrl = DEFAULT_FEED_URL, refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS, fetchImpl = globalThis.fetch, cachePath = null, directSource = null, now = () => new Date().toISOString() } = {}) {
    super();
    this.feedUrl = feedUrl;
    this.refreshIntervalMs = refreshIntervalMs;
    this.fetchImpl = fetchImpl;
    this.cachePath = cachePath;
    this.directSource = directSource;
    this.now = now;
    this.timer = null;
    this.feed = normalizeFeed(null);
    this.alertState = normalizeAlertState(DEFAULT_ALERT_STATE);
    this.usageSnapshot = null;
    this.state = { event: null, status: 'idle', updatedAt: null };
  }

  getState() { return this.state; }

  setUsageSnapshot(snapshot) {
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
    const directEvent = await this.directSource?.fetchEvent?.();
    if (directEvent) {
      this.feed = normalizeFeed({ schemaVersion: 2, updatedAt: directEvent.detectedAt, events: [directEvent] });
      this.publish('direct');
      return this.state;
    }
    if (typeof this.fetchImpl !== 'function') { this.publish('unavailable'); return this.state; }
    try {
      const response = await this.fetchImpl(this.feedUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Reset feed request failed: ${response.status}`);
      this.feed = normalizeFeed(await response.json());
      this.publish('synced');
    } catch {
      this.publish('error');
    }
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
    fs.writeFile(this.cachePath, `${JSON.stringify({ feed: this.feed, alertState: this.alertState })}\n`, 'utf8').catch(() => {});
  }

  publish(status) {
    const event = selectDisplayEvent(this.feed);
    const result = reconcileAlertState(event, this.usageSnapshot?.weekly, this.alertState, this.now());
    this.alertState = result.alertState;
    this.state = { event: result.visible ? event : null, status, updatedAt: this.feed.updatedAt };
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
