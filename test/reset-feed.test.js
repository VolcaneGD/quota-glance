const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_ALERT_STATE,
  getWeeklyQuotaSignature,
  normalizeFeed,
  reconcileAlertState,
  selectDisplayEvent,
} = require('../src/reset-feed');

const EVENT = {
  id: 'event-1',
  postedAt: '2026-09-01T08:00:00.000Z',
  kind: 'possible_reset',
  confidence: 'high',
  messageJa: '26/09/01: リセットの可能性あり',
  messageEn: '26/09/01: Reset may be coming',
  sourceUrl: 'https://x.com/thsottiaux/status/event-1',
};

test('selectDisplayEvent returns the newest reset announcement', () => {
  const event = selectDisplayEvent({ schemaVersion: 1, events: [EVENT, { ...EVENT, id: 'new', postedAt: '2026-09-01T09:00:00.000Z' }] });
  assert.equal(event.id, 'new');
});

test('alert hides immediately when weekly remaining reaches 100 percent', () => {
  const result = reconcileAlertState(EVENT, { remainingPercent: 100 }, DEFAULT_ALERT_STATE, '2026-09-01T10:00:00.000Z');
  assert.equal(result.visible, false);
  assert.deepEqual(result.alertState.dismissedEventIds, ['event-1']);
});

test('alert hides after two days when the weekly quota did not change', () => {
  const weekly = { remainingPercent: 42, usedPercent: 58, resetsAt: '2026-09-07T08:00:00.000Z' };
  const baseline = getWeeklyQuotaSignature(weekly);
  const result = reconcileAlertState(EVENT, weekly, {
    eventId: EVENT.id,
    displayedAt: '2026-09-01T10:00:00.000Z',
    baselineWeeklySignature: baseline,
    weeklyChanged: false,
    dismissedEventIds: [],
  }, '2026-09-03T10:00:00.000Z');

  assert.equal(result.visible, false);
});

test('alert remains visible after weekly quota changes', () => {
  const result = reconcileAlertState(EVENT, { remainingPercent: 41, usedPercent: 59, resetsAt: '2026-09-07T08:00:00.000Z' }, {
    eventId: EVENT.id,
    displayedAt: '2026-09-01T10:00:00.000Z',
    baselineWeeklySignature: getWeeklyQuotaSignature({ remainingPercent: 42, usedPercent: 58, resetsAt: '2026-09-07T08:00:00.000Z' }),
    weeklyChanged: false,
    dismissedEventIds: [],
  }, '2026-09-03T10:00:00.000Z');

  assert.equal(result.visible, true);
  assert.equal(result.alertState.weeklyChanged, true);
});

test('normalizeFeed rejects invalid feed data without throwing', () => {
  assert.deepEqual(normalizeFeed({ schemaVersion: 2, events: 'invalid' }), {
    schemaVersion: 1,
    updatedAt: null,
    sourceAccount: 'thsottiaux',
    events: [],
  });
});
