const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { parseRateLimitLine } = require('../src/usage-reader');

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
  assert.equal(result.weekly.usedPercent, 72);
  assert.equal(result.weekly.remainingPercent, 28);
  assert.equal(result.weekly.windowMinutes, 10080);
  assert.equal(result.credits.balance, 42.5);
  assert.equal(result.credits.hasCredits, true);
  assert.match(result.weekly.resetsAt, /^2026-/);
});

test('壊れた行と利用量を含まない行は無視する', () => {
  assert.equal(parseRateLimitLine('{broken'), null);
  assert.equal(parseRateLimitLine(JSON.stringify({ type: 'event_msg', payload: {} })), null);
});

test('使用率は0から100の範囲に収める', () => {
  const line = JSON.stringify({
    timestamp: '2026-07-31T11:31:40.715Z',
    type: 'event_msg',
    payload: { rate_limits: { primary: { used_percent: 130 } } },
  });
  const result = parseRateLimitLine(line);
  assert.equal(result.weekly.usedPercent, 100);
  assert.equal(result.weekly.remainingPercent, 0);
});
