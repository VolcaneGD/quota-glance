const test = require('node:test');
const assert = require('node:assert/strict');
const { XApiSource } = require('../src/x-api-source');

test('direct X source returns only a safe reset event', async () => {
  const source = new XApiSource({
    getToken: () => 'user-owned-token',
    fetchImpl: async () => ({ ok: true, json: async () => ({ data: [{
      id: '2081096447718723984',
      text: 'We have reset usage limits for all Codex users.',
      created_at: '2026-09-01T08:00:00.000Z',
      author_id: '456',
    }], includes: { users: [{ id: '456', username: 'thsottiaux' }] } }) }),
    now: () => '2026-09-01T08:30:00.000Z',
  });

  const event = await source.fetchEvent();
  assert.equal(event.eventId, 'x-2081096447718723984');
  assert.equal(event.certainty, 'confirmed');
  assert.equal(event.status, 'completed');
  assert.equal('text' in event, false);
});

test('direct X source falls back cleanly when no local token is configured', async () => {
  const source = new XApiSource({ getToken: () => null, fetchImpl: () => { throw new Error('must not fetch'); } });
  assert.equal(await source.fetchEvent(), null);
});
