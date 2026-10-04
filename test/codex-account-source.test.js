const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { CodexAccountSource, accountSnapshot } = require('../src/codex-account-source');
const { UsageReader } = require('../src/usage-reader');
const bucket = { limitId: 'codex', primary: { usedPercent: 100, windowDurationMins: 300, resetsAt: 1791100000 }, secondary: { usedPercent: 62, windowDurationMins: 10080 }, credits: { hasCredits: true, balance: '180.37' } };

test('account RPC maps independent windows, excludes premium and preserves unknowns', () => {
  const snapshot = accountSnapshot({ rateLimitsByLimitId: { codex: bucket, premium: { credits: { balance: 0 } } } });
  assert.equal(snapshot.fiveHour.remainingPercent, 0);
  assert.equal(snapshot.weekly.remainingPercent, 38);
  assert.equal(snapshot.credits.balance, 180.37);
  assert.equal(accountSnapshot({ rateLimits: { limitId: 'premium' } }), null);
  assert.equal(accountSnapshot({ rateLimitsByLimitId: { premium: bucket }, rateLimits: bucket }), null);
  assert.equal(accountSnapshot({ rateLimits: { ...bucket, primary: { usedPercent: null } } }).fiveHour, null);
});

function fakeServer(getBucket) {
  const calls = [];
  const spawnImpl = () => {
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stdin = new EventEmitter();
    child.kill = () => {};
    child.stdin.write = line => {
      const request = JSON.parse(line); calls.push(request.method);
      if (request.id) queueMicrotask(() => {
        const result = request.method === 'initialize' ? {} : { rateLimitsByLimitId: { codex: getBucket() } };
        child.stdout.emit('data', Buffer.from(JSON.stringify({ id: request.id, result }) + '\n'));
      });
    };
    return child;
  };
  return { calls, spawnImpl };
}

test('polls account without conversation or file changes and throttles network reads', async () => {
  let time = 1791099999000; let usedPercent = 100;
  const server = fakeServer(() => ({ ...bucket, primary: { ...bucket.primary, usedPercent } }));
  const source = new CodexAccountSource({ resolveExecutable: async () => 'codex.exe', spawnImpl: server.spawnImpl, now: () => time });
  assert.equal((await source.read()).fiveHour.remainingPercent, 0);
  usedPercent = 0; time += 1000;
  assert.equal((await source.read()).fiveHour.remainingPercent, 0, 'not a fabricated reset at the deadline');
  time += 15000;
  assert.equal((await source.read()).fiveHour.remainingPercent, 100);
  assert.equal(server.calls.filter(method => method === 'account/rateLimits/read').length, 2);
  assert.deepEqual([...new Set(server.calls)], ['initialize', 'initialized', 'account/rateLimits/read']);
  source.stop();
});

test('hung RPC is bounded and retains the previous observation', async () => {
  let time = 0; const server = fakeServer(() => bucket);
  const source = new CodexAccountSource({ resolveExecutable: async () => 'codex.exe', spawnImpl: server.spawnImpl, now: () => time, timeoutMs: 10 });
  const previous = await source.read();
  source.child.stdin.write = () => {}; time += 16000;
  assert.equal(await source.read(), previous);
  assert.equal(source.child, null);
  source.stop();
});

test('missing executable falls back without throwing or inferring a reset', async () => {
  const source = new CodexAccountSource({ resolveExecutable: async () => null });
  assert.equal(await source.read(), null);
  source.stop();
});

test('UsageReader publishes remote changes independently of an unchanged local snapshot', async () => {
  let usedPercent = 100;
  const accountSource = { read: async () => accountSnapshot({ rateLimits: { ...bucket, primary: { ...bucket.primary, usedPercent } } }), stop() {} };
  const reader = new UsageReader({ roots: [], accountSource });
  reader.running = true;
  await reader.refresh(); await reader.refreshAccount(true);
  assert.equal(reader.getSnapshot().fiveHour.remainingPercent, 0);
  usedPercent = 0;
  await reader.refreshAccount(true);
  assert.equal(reader.getSnapshot().fiveHour.remainingPercent, 100);
  assert.equal(reader.getSnapshot().weekly.remainingPercent, 38);
  reader.stop();
});
