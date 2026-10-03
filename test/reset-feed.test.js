const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFeed, selectDisplayEvent, reconcileAlertState, ResetFeedReader } = require('../src/reset-feed');
const { extractResetEvent } = require('../src/reset-event');
const now = '2026-10-03T01:30:00Z';
const event = extractResetEvent({ id: '123', author: 'thsottiaux', verifiedOriginal: true, created_at: now, text: 'We will reset Codex usage limits for all users at 2pm UTC.' }, now);
test('schema v3 remains valid through normalization and cache reload', () => {
  const feed = normalizeFeed({ schemaVersion: 3, events: [event] });
  assert.equal(normalizeFeed(feed).events[0].eventId, event.eventId);
  assert.equal(selectDisplayEvent(feed, now).certainty, 'confirmed');
});
test('legacy ID-only feeds migrate as secondary information', () => {
  const feed = normalizeFeed({ schemaVersion: 2, events: [{ postId: '123', detectedAt: now }] });
  assert.equal(feed.events[0].certainty, 'secondary');
  assert.equal(feed.events[0].eventId, 'x-123');
});
test('scheduled cards survive an already full local quota, but expire after 48 hours', () => {
  const result = reconcileAlertState(event, { remainingPercent: 100 }, {}, now);
  assert.equal(result.visible, true);
  assert.equal(reconcileAlertState(event, { remainingPercent: 42 }, result.alertState, '2026-10-05T01:30:00Z').visible, false);
});
test('active cards close at 100 percent and dismissed events are not redisplayed', () => {
  const active = { ...event, status: 'active' };
  const result = reconcileAlertState(active, { remainingPercent: 100 }, {}, now);
  assert.equal(result.visible, false);
  assert.equal(reconcileAlertState(active, { remainingPercent: 0 }, result.alertState, now).visible, false);
});
test('stale and future-published events are not displayed', () => {
  assert.equal(selectDisplayEvent({ schemaVersion: 3, events: [event] }, '2026-10-07T01:30:00Z'), null);
  assert.equal(selectDisplayEvent({ schemaVersion: 3, events: [event] }, '2026-10-02T01:30:00Z'), null);
});
test('a failing direct source does not prevent the public feed from loading', async () => {
  const reader = new ResetFeedReader({ now: () => now, directSource: { fetchEvents: async () => { throw new Error('offline'); } }, fetchImpl: async () => ({ ok: true, json: async () => ({ schemaVersion: 3, events: [event] }) }) });
  await reader.refresh();
  assert.equal(reader.getState().event.eventId, event.eventId);
});
