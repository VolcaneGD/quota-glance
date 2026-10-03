const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ResetNotifier, normalizeNotifications, notificationCopy } = require('../src/reset-notifier');
const { extractResetEvent } = require('../src/reset-event');
const start = Date.parse('2026-10-03T13:00:00Z');
const event = extractResetEvent({ id: '123', author: 'thsottiaux', verifiedOriginal: true, created_at: '2026-10-03T12:00:00Z', text: 'We will reset Codex usage limits for all users at 2pm UTC.' }, new Date(start).toISOString());
test('yellow effect is limited to scheduled announcement notifications', () => {
  for (const kind of ['detection', 'reminder', 'revision']) assert.equal(notificationCopy(event, kind).scheduledEffect, true);
  for (const kind of ['active', 'completed', 'local', 'cancelled']) assert.equal(notificationCopy(event, kind).scheduledEffect, false);
  assert.equal(notificationCopy({ ...event, status: 'completed' }, 'revision').scheduledEffect, false);
});

test('5-hour recovery survives restart and retries failed Windows delivery', async () => {
  const statePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'quota-recovery-')), 'state.json');
  let attempts = 0;
  const options = { statePath, now: () => start, send: async () => ++attempts > 1 };
  await new ResetNotifier(options).update([], { fiveHour: { remainingPercent: 12 } });
  const restarted = new ResetNotifier(options);
  await restarted.update([], { fiveHour: { remainingPercent: 100 } });
  assert.equal(attempts, 1);
  await new ResetNotifier(options).update([], { fiveHour: { remainingPercent: 100 } });
  assert.equal(attempts, 2);
  await new ResetNotifier(options).update([], { fiveHour: { remainingPercent: 100 } });
  assert.equal(attempts, 2);
});

test('next-cycle timestamp does not erase a due 5-hour reset notification', async () => {
  let time = start; const sent = [];
  const notifier = new ResetNotifier({ now: () => time, send: async copy => { sent.push(copy); return true; } });
  await notifier.update([], { fiveHour: { remainingPercent: 4, resetsAt: new Date(start + 60000).toISOString() } });
  time += 60000;
  await notifier.update([], { fiveHour: { remainingPercent: 96, resetsAt: new Date(time + 5 * 3600000).toISOString() } });
  assert.equal(sent.length, 1);
  assert.match(sent[0].title, /5時間枠/);
});
test('detection, reminders and revision notifications are deduplicated across restart', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quota-notifier-'));
  const statePath = path.join(dir, 'state.json'); let time = start; const sent = [];
  const options = { statePath, now: () => time, send: async copy => { sent.push(copy); return true; } };
  const notifier = new ResetNotifier(options);
  await notifier.update([event], { remainingPercent: 0 }); await notifier.update([event]);
  assert.equal(sent.length, 1);
  time = start + 30 * 60000; await notifier.update([event]); assert.equal(sent.length, 2);
  const restarted = new ResetNotifier(options); await restarted.update([event]); assert.equal(sent.length, 2);
  time = start + 50 * 60000; await restarted.update([event]); assert.equal(sent.length, 3);
  const revised = { ...event, revision: 'new', effectiveAt: '2026-10-03T15:00:00Z' };
  await restarted.update([revised]); await restarted.update([revised]); assert.equal(sent.length, 4);
});
test('unconfirmed events and already full initial quota do not produce false completion', async () => {
  const sent = []; const notifier = new ResetNotifier({ now: () => start, send: async copy => { sent.push(copy); return true; } });
  await notifier.update([{ ...event, certainty: 'secondary' }], { remainingPercent: 100 }); assert.equal(sent.length, 0);
  await notifier.update([event], { remainingPercent: 100 }); assert.equal(sent.length, 1);
  await notifier.update([event], { remainingPercent: 2 }); await notifier.update([event], { remainingPercent: 100 });
  assert.equal(sent.length, 2); assert.match(sent[1].body, /OpenAI全体の完了確認ではありません/);
});
test('failed delivery retries, expired events and past deadlines do not generate reminders', async () => {
  let calls = 0; const notifier = new ResetNotifier({ now: () => start + 2 * 3600000, send: async () => ++calls > 1 });
  await notifier.update([event]); await notifier.update([event]); await notifier.update([event]); assert.equal(calls, 2);
  await notifier.update([{ ...event, status: 'expired', revision: 'cancelled' }]); assert.equal(calls, 3);
  assert.deepEqual(normalizeNotifications({ beforeMinutes: [10, 10, -1, 2000, 30] }).beforeMinutes, [30, 10]);
});
test('5-hour and weekly reset notifications can be enabled independently', async () => {
  const sent = []; let time = start;
  const settings = { fiveHour: false, weekly: true };
  const notifier = new ResetNotifier({ now: () => time, getSettings: () => settings, send: async copy => { sent.push(copy); return true; } });
  const resetsAt = new Date(start + 60000).toISOString();
  await notifier.update([], { fiveHour: { remainingPercent: 2, resetsAt }, weekly: { remainingPercent: 2, resetsAt } });
  time += 60000; await notifier.update([], { fiveHour: { remainingPercent: 2, resetsAt }, weekly: { remainingPercent: 2, resetsAt } });
  assert.equal(sent.length, 1); assert.match(sent[0].title, /週間枠/);
  await notifier.update([], { fiveHour: { remainingPercent: 100, resetsAt }, weekly: { remainingPercent: 100, resetsAt } });
  assert.equal(sent.length, 1); // Recovery is the same reset as the deadline toast.
  settings.fiveHour = true; settings.weekly = false;
  time += 11 * 60000;
  await notifier.update([{ ...event, quotaWindows: ['weekly'] }]); assert.equal(sent.length, 1);
  await notifier.update([{ ...event, quotaWindows: ['fiveHour'] }]); assert.equal(sent.length, 2);
});

for (const window of ['fiveHour', 'weekly']) {
  test(`${window}: deadline and later recovery notify once even across restart`, async () => {
    const statePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'quota-once-')), 'state.json');
    let time = start; const sent = [];
    const options = { statePath, now: () => time, send: async copy => { sent.push(copy); return true; } };
    const resetsAt = new Date(start + 60000).toISOString();
    await new ResetNotifier(options).update([], { [window]: { remainingPercent: 4, resetsAt } });
    time += 60000;
    const nextDeadline = new Date(time + 3600000).toISOString();
    await new ResetNotifier(options).update([], { [window]: { remainingPercent: 4, resetsAt: nextDeadline } });
    time += 60000;
    await new ResetNotifier(options).update([], { [window]: { remainingPercent: 100, resetsAt: nextDeadline } });
    assert.equal(sent.length, 1);
    time += 3600000;
    await new ResetNotifier(options).update([], { [window]: { remainingPercent: 40 } });
    assert.equal(sent.length, 2, 'The next cycle must still notify');
  });
  test(`${window}: recovery before deadline does not produce a second deadline toast`, async () => {
    let time = start; const sent = [];
    const notifier = new ResetNotifier({ now: () => time, send: async copy => { sent.push(copy); return true; } });
    const resetsAt = new Date(start + 60000).toISOString();
    await notifier.update([], { [window]: { remainingPercent: 5, resetsAt } });
    time += 60000;
    await notifier.update([], { [window]: { remainingPercent: 100, resetsAt } });
    await notifier.update([], { [window]: { remainingPercent: 100, resetsAt } });
    assert.equal(sent.length, 1);
  });
}
