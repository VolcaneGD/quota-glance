const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_ALERT_STATE,
  normalizeFeed,
  reconcileAlertState,
  selectDisplayEvent,
} = require('../src/reset-feed');
const fs = require('node:fs');
const path = require('node:path');

const EVENT = {
  id: '2081096447718723984',
  detectedAt: '2026-09-01T08:00:00.000Z',
  sourceUrl: 'https://x.com/i/status/2081096447718723984',
};

test('selectDisplayEvent returns the newest local detection', () => {
  const event = selectDisplayEvent({ schemaVersion: 2, events: [
    { postId: EVENT.id, detectedAt: EVENT.detectedAt },
    { postId: '2081096447718723985', detectedAt: '2026-09-01T09:00:00.000Z' },
  ] });
  assert.equal(event.id, '2081096447718723985');
  assert.equal(event.sourceUrl, 'https://x.com/i/status/2081096447718723985');
});

test('alert hides immediately when weekly remaining reaches 100 percent', () => {
  const result = reconcileAlertState(EVENT, { remainingPercent: 100 }, DEFAULT_ALERT_STATE, '2026-09-01T10:00:00.000Z');
  assert.equal(result.visible, false);
  assert.deepEqual(result.alertState.dismissedEventIds, [EVENT.id]);
});

test('alert hides after 48 hours even when the weekly quota changed', () => {
  const weekly = { remainingPercent: 42, usedPercent: 58, resetsAt: '2026-09-07T08:00:00.000Z' };
  const result = reconcileAlertState(EVENT, weekly, {
    eventId: EVENT.id,
    displayedAt: '2026-09-01T10:00:00.000Z',
    dismissedEventIds: [],
  }, '2026-09-03T10:00:00.000Z');

  assert.equal(result.visible, false);
});

test('alert hides after 48 hours even when only the weekly usage changed', () => {
  const result = reconcileAlertState(EVENT, { remainingPercent: 41, usedPercent: 59, resetsAt: '2026-09-07T08:00:00.000Z' }, {
    eventId: EVENT.id,
    displayedAt: '2026-09-01T10:00:00.000Z',
    baselineWeeklySignature: 'previous-weekly-value',
    dismissedEventIds: [],
  }, '2026-09-03T10:00:00.000Z');

  assert.equal(result.visible, false);
});

test('normalizeFeed rejects invalid feed data without throwing', () => {
  assert.deepEqual(normalizeFeed({ schemaVersion: 2, events: 'invalid' }), {
    schemaVersion: 2,
    updatedAt: null,
    events: [],
  });
});

test('the committed public feed contains no X post content', () => {
  const feed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'reset-feed.json'), 'utf8'));

  assert.equal(feed.schemaVersion, 2);
  for (const event of feed.events) {
    assert.deepEqual(Object.keys(event).sort(), ['detectedAt', 'postId']);
  }
});
