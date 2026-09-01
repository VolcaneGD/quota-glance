const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFeed, classifyPost, extractRssPosts } = require('../scripts/update-reset-feed');

test('classifies a direct reset declaration without carrying its text into the event', () => {
  const event = classifyPost({
    id: '2081096447718723984',
    text: 'I have reset usage limits for all Codex and ChatGPT Work users.',
    created_at: '2026-09-01T07:45:00.000Z',
  });

  assert.deepEqual(event, {
    postId: '2081096447718723984',
    createdAt: '2026-09-01T07:45:00.000Z',
  });
});

test('classifies banked reset announcements without exposing their classification', () => {
  const event = classifyPost({
    id: '2081096447718723985',
    text: 'We added one banked reset for all paid Codex and ChatGPT Work users.',
    created_at: '2026-09-01T08:00:00.000Z',
  });

  assert.deepEqual(event, {
    postId: '2081096447718723985',
    createdAt: '2026-09-01T08:00:00.000Z',
  });
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

  assert.equal(feed.schemaVersion, 2);
  assert.deepEqual(feed.events.map((event) => event.postId), ['2', '1']);
});

test('buildFeed excludes posts older than three days', () => {
  const feed = buildFeed([
    { id: 'recent', text: 'I have reset usage limits for Codex.', created_at: '2026-08-29T12:00:01.000Z' },
    { id: 'stale', text: 'I have reset usage limits for Codex.', created_at: '2026-08-29T11:59:59.000Z' },
  ], '2026-09-01T12:00:00.000Z');

  assert.deepEqual(feed.events.map((event) => event.postId), ['recent']);
});

test('buildFeed publishes only a post ID and local detection time', () => {
  const sourceText = 'I have reset usage limits for all Codex users.';
  const feed = buildFeed([
    { id: '2081096447718723984', text: sourceText, created_at: '2026-09-01T08:00:00.000Z' },
  ], '2026-09-01T08:30:00.000Z');

  assert.deepEqual(feed, {
    schemaVersion: 2,
    updatedAt: '2026-09-01T08:30:00.000Z',
    events: [{ postId: '2081096447718723984', detectedAt: '2026-09-01T08:30:00.000Z' }],
  });
  assert.doesNotMatch(JSON.stringify(feed), new RegExp(sourceText));
});

test('extractRssPosts accepts only Tibo X post links from an Atom feed', () => {
  const posts = extractRssPosts(`<?xml version="1.0"?><feed>
    <entry><title>Codex usage limits reset</title><link href="https://x.com/thsottiaux/status/2081096447718723984" /></entry>
    <entry><title>Ignore this</title><link href="https://x.com/other/status/2081096447718723985" /></entry>
  </feed>`);

  assert.deepEqual(posts, [{
    id: '2081096447718723984',
    text: 'Codex usage limits reset',
    created_at: null,
  }]);
});
