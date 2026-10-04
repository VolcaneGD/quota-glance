const test = require('node:test');
const assert = require('node:assert/strict');
const { NotificationPump } = require('../src/notification-pump');
const { ResetNotifier } = require('../src/reset-notifier');

test('slow Windows delivery coalesces thousands of updates into the latest snapshot', async () => {
  const seen = []; let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const pump = new NotificationPump(async (_events, usage) => { seen.push(usage.value); if (seen.length === 1) await blocked; });
  const finished = pump.update([], { value: 0 });
  await Promise.resolve();
  for (let value = 1; value <= 10000; value++) pump.update([], { value });
  release(); await finished;
  assert.deepEqual(seen, [0, 10000]);
  await pump.update([], { value: 10001 });
  assert.deepEqual(seen, [0, 10000, 10001]);
});

test('a failed update does not stop the independent notification clock', async () => {
  let attempts = 0; let errors = 0;
  const pump = new NotificationPump(async () => { if (++attempts === 1) throw new Error('test'); }, () => errors++);
  await pump.update([], {}); await pump.update([], {});
  assert.equal(attempts, 2); assert.equal(errors, 1);
});

test('cached reset schedules notify at reminder time while Codex and account reads are idle', async () => {
  let now = Date.parse('2026-10-04T00:00:00Z');
  const sent = [];
  const notifier = new ResetNotifier({ now: () => now, send: async copy => { sent.push(copy); return true; } });
  const pump = new NotificationPump((events, usage) => notifier.update(events, usage));
  const event = { eventId: 'idle-schedule', canonicalId: 'idle-schedule', revision: '1',
    status: 'scheduled', certainty: 'confirmed', scope: 'all_users', quotaWindows: ['fiveHour', 'weekly'],
    publishedAt: new Date(now).toISOString(), effectiveAt: new Date(now + 3600000).toISOString(), effectiveAtPrecision: 'exact' };
  const usage = { fiveHour: { remainingPercent: 0 }, weekly: { remainingPercent: 38 } };
  await pump.update([event], usage);
  assert.equal(sent.length, 1);
  now += 30 * 60000;
  await pump.update([event], usage);
  assert.equal(sent.length, 2); assert.match(sent[1].title, /30分前/);
  now += 20 * 60000;
  await pump.update([event], usage); await pump.update([event], usage);
  assert.equal(sent.length, 3); assert.match(sent[2].title, /10分前/);
});
