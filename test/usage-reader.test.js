const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { normalizeRefreshInterval, parseRateLimitLine, mergeUsageSnapshots, findLatestInFile, readLatestSnapshot, normalizeLimit, normalizeCredits } = require('../src/usage-reader');
const fs = require('node:fs/promises');
const os = require('node:os');

test('更新頻度を1秒から60秒の範囲に収める', () => {
  assert.equal(normalizeRefreshInterval(100), 1_000);
  assert.equal(normalizeRefreshInterval(5_000), 5_000);
  assert.equal(normalizeRefreshInterval(120_000), 60_000);
  assert.equal(normalizeRefreshInterval('invalid'), 5_000);
});

test('Codex token_countイベントから週間上限とクレジットを抽出する', () => {
  const line = JSON.stringify({
    timestamp: '2026-07-31T11:31:40.715Z',
    type: 'event_msg',
    payload: {
      type: 'token_count',
      rate_limits: {
        limit_id: 'codex',
        primary: { used_percent: 72, window_minutes: 10080, resets_at: 1785903004 },
        secondary: null,
        credits: { has_credits: true, unlimited: false, balance: '42.5000000000' },
        plan_type: 'plus',
      },
    },
  });

  const result = parseRateLimitLine(line, path.join('sessions', 'sample.jsonl'));
  assert.equal(result.planType, 'plus');
  assert.equal(result.fiveHour, null);
  assert.equal(result.weekly.usedPercent, 72);
  assert.equal(result.weekly.remainingPercent, 28);
  assert.equal(result.weekly.windowMinutes, 10080);
  assert.equal(result.credits.balance, 42.5);
  assert.equal(result.credits.hasCredits, true);
  assert.match(result.weekly.resetsAt, /^2026-/);
});

test('5時間枠と週間枠をwindow_minutesから分類する', () => {
  const line = JSON.stringify({
    timestamp: '2026-07-31T11:31:40.715Z',
    type: 'event_msg',
    payload: {
      type: 'token_count',
      rate_limits: {
        limit_id: 'codex',
        primary: { used_percent: 46, window_minutes: 300, resets_at: 1785903004 },
        secondary: { used_percent: 72, window_minutes: 10080, resets_at: 1786303004 },
      },
    },
  });

  const result = parseRateLimitLine(line);
  assert.equal(result.fiveHour.usedPercent, 46);
  assert.equal(result.fiveHour.remainingPercent, 54);
  assert.equal(result.fiveHour.windowMinutes, 300);
  assert.equal(result.weekly.usedPercent, 72);
  assert.equal(result.weekly.windowMinutes, 10080);
});

test('壊れた行と利用量を含まない行は無視する', () => {
  assert.equal(parseRateLimitLine('{broken'), null);
  assert.equal(parseRateLimitLine(JSON.stringify({ type: 'event_msg', payload: {} })), null);
});

test('使用率は0から100の範囲に収める', () => {
  const line = JSON.stringify({
    timestamp: '2026-07-31T11:31:40.715Z',
    type: 'event_msg',
    payload: { rate_limits: { primary: { used_percent: 130, window_minutes: 10080 } } },
  });
  const result = parseRateLimitLine(line);
  assert.equal(result.weekly.usedPercent, 100);
  assert.equal(result.weekly.remainingPercent, 0);
});

function quotaRecord(at, rate_limits) {
  return JSON.stringify({ timestamp: at, type: 'event_msg', payload: { type: 'token_count', rate_limits } });
}
const fiveHour = { used_percent: 100, window_minutes: 300, resets_at: 1791087058 };
const weekly = { used_percent: 62, window_minutes: 10080, resets_at: 1791599506 };
test('premium bucket cannot replace Codex quota or credits', () => {
  assert.equal(parseRateLimitLine(quotaRecord('2026-10-04T01:01:00Z', {
    limit_id: 'premium', primary: null, secondary: null, credits: { balance: 0 },
  })), null);
  const snapshot = parseRateLimitLine(quotaRecord('2026-10-04T01:00:00Z', {
    limit_id: 'codex', primary: fiveHour, secondary: weekly, credits: { balance: 250 },
  }));
  assert.equal(snapshot.fiveHour.remainingPercent, 0);
  assert.equal(snapshot.weekly.remainingPercent, 38);
  assert.equal(snapshot.credits.balance, 250);
});
test('missing numeric fields are unknown, not a false 100 percent recovery or zero credit balance', () => {
  assert.equal(normalizeLimit({ used_percent: null }).remainingPercent, null);
  assert.equal(normalizeLimit({ used_percent: '' }).remainingPercent, null);
  assert.equal(normalizeLimit({ resets_at: null }).resetsAt, null);
  assert.equal(normalizeCredits({ balance: null }).balance, null);
});
test('independent field times preserve the freshest weekly value across files', () => {
  const older = parseRateLimitLine(quotaRecord('2026-10-04T01:00:00Z', { primary: fiveHour, secondary: weekly, credits: { balance: 10 } }));
  const partial = parseRateLimitLine(quotaRecord('2026-10-04T01:02:00Z', { primary: fiveHour }));
  const mergedFile = mergeUsageSnapshots([older, partial]);
  const newerWeekly = parseRateLimitLine(quotaRecord('2026-10-04T01:01:00Z', { secondary: { ...weekly, used_percent: 63 } }));
  const result = mergeUsageSnapshots([mergedFile, newerWeekly]);
  assert.equal(result.fiveHour.remainingPercent, 0);
  assert.equal(result.weekly.remainingPercent, 37);
  assert.equal(result.credits.balance, 10);
});
test('restart scan finds 5-hour 0%, weekly 38% beneath partial and unrelated latest records', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'quota-independent-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'sample.jsonl');
  await fs.writeFile(file, [
    quotaRecord('2026-10-04T01:00:00Z', { limit_id: 'codex', primary: fiveHour, secondary: weekly, credits: { balance: 250 } }),
    quotaRecord('2026-10-04T01:01:00Z', { limit_id: 'codex', primary: fiveHour, secondary: null }),
    quotaRecord('2026-10-04T01:02:00Z', { limit_id: 'premium', credits: { balance: 0 } }),
  ].join('\n'));
  for (const snapshot of [await findLatestInFile(file), await readLatestSnapshot([root])]) {
    assert.equal(snapshot.fiveHour.remainingPercent, 0);
    assert.equal(snapshot.weekly.remainingPercent, 38);
    assert.equal(snapshot.credits.balance, 250);
  }
});
