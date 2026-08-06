const test = require('node:test');
const assert = require('node:assert/strict');
const { metricTone, parseNvidiaSmi } = require('../src/system-metrics');

test('metric thresholds select the requested colors', () => {
  assert.equal(metricTone('usage', 49), 'good');
  assert.equal(metricTone('usage', 50), 'warning');
  assert.equal(metricTone('usage', 80), 'critical');
  assert.equal(metricTone('temp', 59), 'good');
  assert.equal(metricTone('temp', 60), 'warning');
  assert.equal(metricTone('temp', 80), 'critical');
  assert.equal(metricTone('usage', null), 'unknown');
});

test('nvidia-smi parsing returns unavailable values for invalid output', () => {
  assert.deepEqual(parseNvidiaSmi('61, 72'), { gpu: 61, temp: 72 });
  assert.deepEqual(parseNvidiaSmi('broken'), { gpu: null, temp: null });
});
