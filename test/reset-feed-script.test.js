const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFeed, extractRssPosts } = require('../scripts/update-reset-feed');
const now = '2026-10-03T01:30:00Z';
test('Google redirect links are decoded but RSS snippets cannot confirm an announcement', () => {
  const posts = extractRssPosts(`<feed><entry><title>We will reset Codex usage limits for all users at 2pm UTC.</title><link href="https://www.google.com/url?url=https%3A%2F%2Fx.com%2Fthsottiaux%2Fstatus%2F123&amp;ct=ga"/><published>${now}</published></entry></feed>`);
  const feed = buildFeed(posts, now);
  assert.equal(feed.schemaVersion, 3);
  assert.equal(feed.events[0].certainty, 'secondary');
  assert.equal(feed.events[0].sourceUrl, 'https://x.com/i/status/123');
  assert.equal('text' in feed.events[0], false);
});
test('only posts from the preceding three days are accepted, without inventing missing dates', () => {
  const base = { author: 'thsottiaux', text: 'We have reset Codex usage limits for all users.' };
  const feed = buildFeed([{ ...base, id: '1', created_at: '2026-09-30T01:30:00Z' }, { ...base, id: '2', created_at: '2026-09-30T01:29:59Z' }, { ...base, id: '3' }], now);
  assert.deepEqual(feed.events.map(e => e.eventId), ['x-1']);
});
test('feed refresh preserves first detection timestamp', () => {
  const post = { id: '1', author: 'thsottiaux', text: 'We have reset Codex usage limits for all users.', created_at: now };
  const previous = buildFeed([post], now);
  assert.equal(buildFeed([post], '2026-10-03T02:30:00Z', previous).events[0].detectedAt, now);
});
