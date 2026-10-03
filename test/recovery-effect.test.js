const test = require('node:test');
const assert = require('node:assert/strict');
const { RecoveryTracker } = require('../renderer/recovery-effect');
test('initial data and repeated refreshes never play the success effect', () => {
  const tracker = new RecoveryTracker();
  const snapshot = { fiveHour: { remainingPercent: 100 }, weekly: { remainingPercent: 100 }, credits: { balance: 30 } };
  assert.equal(tracker.update(snapshot), false);
  assert.equal(tracker.update(snapshot), false);
});
test('each quota recovery and credit increase triggers only on the transition', () => {
  const tracker = new RecoveryTracker();
  tracker.update({ fiveHour: { remainingPercent: 3 }, weekly: { remainingPercent: 7 }, credits: { balance: 10 } });
  assert.equal(tracker.update({ fiveHour: { remainingPercent: 100 } }), true);
  assert.equal(tracker.update({ fiveHour: { remainingPercent: 100 } }), false);
  assert.equal(tracker.update({ weekly: { remainingPercent: 100 } }), true);
  assert.equal(tracker.update({ credits: { balance: 20 } }), true);
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
