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
    }] }) }),
    now: () => '2026-09-01T08:30:00.000Z',
  });

  assert.deepEqual(await source.fetchEvent(), {
    postId: '2081096447718723984',
    detectedAt: '2026-09-01T08:30:00.000Z',
  });
});

test('direct X source falls back cleanly when no local token is configured', async () => {
  const source = new XApiSource({ getToken: () => null, fetchImpl: () => { throw new Error('must not fetch'); } });
  assert.equal(await source.fetchEvent(), null);
});
