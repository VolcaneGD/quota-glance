const test = require('node:test');
const assert = require('node:assert/strict');
const { extractResetEvent, extractTime, mergeEvents } = require('../src/reset-event');
const now = '2026-10-03T01:30:00Z';
const post = text => ({ id: '123', author: 'thsottiaux', created_at: now, verifiedOriginal: true, text });
test('explicit scheduled, active and completed announcements are distinguished', () => {
  for (const [text, status] of [['We will reset Codex usage limits for all users at 2pm UTC.', 'scheduled'], ['We are resetting Codex usage limits for everyone.', 'active'], ['We have reset Codex usage limits for all paid users.', 'completed']]) {
    const e = extractResetEvent(post(text), now); assert.equal(e.status, status); assert.equal(e.certainty, 'confirmed');
  }
});
test('speculation, incidents, negation and absent scope never become confirmed', () => {
  for (const text of ['We may reset Codex limits for everyone tomorrow.', 'We are investigating Codex rate-limit issues.', 'Codex usage limits remain unchanged.', 'Some Codex users are seeing incorrect usage.', 'We will not reset Codex limits for everyone tomorrow.', "We'll reset Codex limits at 2pm UTC."]) {
    const e = extractResetEvent(post(text), now); assert.notEqual(e?.certainty, 'confirmed', text);
  }
});
test('clock parsing preserves explicit zones and calendar dates', () => {
  assert.equal(extractTime('at 2pm UTC', now).effectiveAt, '2026-10-03T14:00:00.000Z');
  assert.equal(extractTime('14:00 UTC', now).effectiveAt, '2026-10-03T14:00:00.000Z');
  assert.equal(extractTime('2pm PT', now).effectiveAt, '2026-10-02T21:00:00.000Z');
  assert.equal(extractTime('October 4 at 2pm UTC', now).effectiveAt, '2026-10-04T14:00:00.000Z');
  assert.equal(extractTime('2pm PT', '2026-01-03T18:00:00Z').effectiveAt, '2026-01-03T22:00:00.000Z');
  assert.equal(extractTime('2 PM', now).effectiveAt, null);
  assert.equal(extractTime('2026-02-30 at 2pm UTC', now).effectiveAt, null);
});
test('edited X posts preserve event identity while changing revision and time', () => {
  const first = extractResetEvent(post('We will reset Codex limits for all users at 2pm UTC.'), now);
  const edited = extractResetEvent({ ...post('We will reset Codex limits for all users at 3pm UTC.'), id: '124', edit_history_tweet_ids: ['123', '124'] }, now);
  assert.equal(edited.eventId, first.eventId); assert.notEqual(edited.revision, first.revision);
  assert.equal(edited.sourceUrl, 'https://x.com/i/status/124');
});
test('relative times remain windows, vague times remain descriptions', () => {
  const relative = extractTime('within an hour', now);
  assert.equal(relative.effectiveAt, null);
  assert.equal(relative.effectiveAtWindow.to, '2026-10-03T02:30:00.000Z');
  assert.equal(extractTime('in 30 minutes', now).effectiveAtWindow.to, '2026-10-03T02:00:00.000Z');
  for (const t of ['tomorrow', 'later today', 'this evening', 'soon', 'shortly']) assert.equal(extractTime(t, now).effectiveAt, null);
});
test('multiple verified sources merge on scope and explicit schedule', () => {
  const first = extractResetEvent(post('We will reset Codex limits for all users at 2pm UTC.'), now);
  const second = extractResetEvent({ ...post('We will reset Codex limits for all users at 2pm UTC.'), sourceUrl: 'https://openai.com/index/reset/', author: 'OpenAI' }, now);
  const events = mergeEvents([first, second]);
  assert.equal(events.length, 1); assert.equal(events[0].sources.length, 2); assert.equal(events[0].source.tier, 1);
});
