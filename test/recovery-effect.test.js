const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { RecoveryTracker } = require('../renderer/recovery-effect');
test('initial data and repeated refreshes never play the success effect', () => {
  const tracker = new RecoveryTracker();
  const snapshot = { fiveHour: { remainingPercent: 100 }, weekly: { remainingPercent: 100 }, credits: { balance: 30 } };
  assert.equal(tracker.update(snapshot), false);
  assert.equal(tracker.update(snapshot), false);
});
test('only quota recovery triggers the effect; credit increases never do', () => {
  const tracker = new RecoveryTracker();
  tracker.update({ fiveHour: { remainingPercent: 3 }, weekly: { remainingPercent: 7 }, credits: { balance: 10 } });
  assert.equal(tracker.update({ fiveHour: { remainingPercent: 100 } }), true);
  assert.equal(tracker.update({ fiveHour: { remainingPercent: 100 } }), false);
  assert.equal(tracker.update({ weekly: { remainingPercent: 100 } }), true);
  assert.equal(tracker.update({ credits: { balance: 20 } }), false);
  assert.equal(tracker.update({ credits: { balance: 20 } }), false);
  assert.equal(tracker.update({ credits: { balance: 18 } }), false);
});
test('missing data and unavailable responses do not discard baselines', () => {
  const tracker = new RecoveryTracker();
  tracker.update({ weekly: { remainingPercent: 0 }, credits: { balance: 0 } });
  assert.equal(tracker.update({ unavailableReason: 'offline' }), false);
  assert.equal(tracker.update({ credits: { balance: null } }), false);
  assert.equal(tracker.update({ weekly: { remainingPercent: 100 }, credits: { balance: 5 } }), true);
});
test('delayed credit balances do not flash while quotas remain unchanged', () => {
  const tracker = new RecoveryTracker();
  for (const balance of [250, 219.99224, 216.23505, 219.99224, 213.25475, 204.07104, 205.17974, 203.49195, 206.7063]) {
    assert.equal(tracker.update({ fiveHour: { remainingPercent: 0 }, weekly: { remainingPercent: 38 }, credits: { balance } }), false);
  }
  assert.equal(tracker.update({ credits: { balance: 300 } }), false);
  assert.equal(tracker.update({ credits: { balance: 299 } }), false);
  assert.equal(tracker.update({ credits: { balance: 300 } }), false);
});
test('both glow colors share two sweeps and reduced motion repeats twice', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  assert.match(css, /animation: recovery-sweep \.8s[^;]* 2 both/);
  assert.match(css, /animation: recovery-soft-glow \.3s[^;]* 2 both/);
});
