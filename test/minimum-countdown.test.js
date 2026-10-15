const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const script = fs.readFileSync(path.join(__dirname, '../renderer/renderer.js'), 'utf8');
const formatter = script.slice(script.indexOf('function formatMinimumCountdown('), script.indexOf('function renderMinimumCountdowns('));
const context = vm.createContext({ language: 'ja' });
vm.runInContext(formatter, context);
const now = Date.parse('2026-10-15T00:00:00Z');
const at = (ms) => new Date(now + ms).toISOString();
const format = (value, weekly = false) => context.formatMinimumCountdown(value, weekly, now);

test('minimum countdown formats hours and zero-padded minutes with ceiling', () => {
  assert.equal(format(at(182 * 60_000)), '3:02');
  assert.equal(format(at(60 * 60_000 + 1)), '1:01');
  assert.equal(format(at(1)), '0:01');
  assert.equal(format(at(0)), '0:00');
  assert.equal(format(at(-1)), '0:00');
});

test('weekly countdown rounds partial days up and stops at zero', () => {
  assert.equal(format(at(7 * 86_400_000), true), '7日');
  assert.equal(format(at(86_400_001), true), '2日');
  assert.equal(format(at(1), true), '1日');
  assert.equal(format(at(-1), true), '0日');
  context.language = 'en';
  assert.equal(format(at(86_400_000), true), '1d');
  context.language = 'ja';
});

test('unknown reset times never produce a fake countdown', () => {
  for (const value of [undefined, null, '', 'invalid']) {
    assert.equal(format(value), '—');
    assert.equal(format(value, true), '—');
  }
});
