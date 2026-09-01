const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFeed, classifyPost } = require('../scripts/update-reset-feed');

test('classifies direct reset declaration as a high-confidence reset alert', () => {
  const event = classifyPost({
    id: '2081096447718723984',
    text: 'I have reset usage limits for all Codex and ChatGPT Work users.',
    created_at: '2026-09-01T07:45:00.000Z',
  });

  assert.deepEqual(event, {
    id: '2081096447718723984',
    postedAt: '2026-09-01T07:45:00.000Z',
    kind: 'possible_reset',
    confidence: 'high',
    messageJa: '26/09/01: リセットの可能性あり',
    messageEn: '26/09/01: Reset may be coming',
    sourceUrl: 'https://x.com/thsottiaux/status/2081096447718723984',
  });
});

test('classifies banked reset announcements separately', () => {
  const event = classifyPost({
    id: '2081096447718723985',
    text: 'We added one banked reset for all paid Codex and ChatGPT Work users.',
    created_at: '2026-09-01T08:00:00.000Z',
  });

  assert.equal(event.kind, 'banked_reset');
  assert.equal(event.confidence, 'high');
  assert.equal(event.messageJa, '26/09/01: banked reset あり');
});

test('ignores unrelated announcements', () => {
  assert.equal(classifyPost({
    id: '2081096447718723986',
    text: 'Luna is faster today and the team is happy with the rollout.',
    created_at: '2026-09-01T08:15:00.000Z',
  }), null);
});

test('buildFeed orders events newest first', () => {
  const feed = buildFeed([
    { id: '1', text: 'I have reset usage limits for Codex.', created_at: '2026-09-01T07:00:00.000Z' },
    { id: '2', text: 'I have reset usage limits for ChatGPT Work and Codex.', created_at: '2026-09-01T08:00:00.000Z' },
  ], '2026-09-01T08:30:00.000Z');

  assert.equal(feed.schemaVersion, 1);
  assert.equal(feed.sourceAccount, 'thsottiaux');
  assert.deepEqual(feed.events.map((event) => event.id), ['2', '1']);
});

test('buildFeed excludes posts older than three days', () => {
  const feed = buildFeed([
    { id: 'recent', text: 'I have reset usage limits for Codex.', created_at: '2026-08-29T12:00:01.000Z' },
    { id: 'stale', text: 'I have reset usage limits for Codex.', created_at: '2026-08-29T11:59:59.000Z' },
  ], '2026-09-01T12:00:00.000Z');

  assert.deepEqual(feed.events.map((event) => event.id), ['recent']);
});
