const test = require('node:test');
const assert = require('node:assert/strict');
const { metricTone, parseNvidiaSmi, parseWindowsMetrics } = require('../src/system-metrics');

test('metric thresholds select the requested colors', () => {
  assert.equal(metricTone('usage', 49), 'good');
  assert.equal(metricTone('usage', 50), 'warning');
  assert.equal(metricTone('usage', 80), 'critical');
  assert.equal(metricTone('temp', 59), 'good');
  assert.equal(metricTone('temp', 60), 'warning');
  assert.equal(metricTone('temp', 80), 'critical');
  assert.equal(metricTone('usage', null), 'unknown');
  assert.equal(metricTone('free', 51), 'good');
  assert.equal(metricTone('free', 50), 'warning');
  assert.equal(metricTone('free', 30), 'critical');
});

test('nvidia-smi parsing returns unavailable values for invalid output', () => {
  assert.deepEqual(parseNvidiaSmi('61, 72'), { gpu: 61, temp: 72 });
  assert.deepEqual(parseNvidiaSmi('broken'), { gpu: null, temp: null });
});

test('Windows CPU and memory values are parsed independently', () => {
  assert.deepEqual(parseWindowsMetrics('cpu=23\r\nmem=67'), { drive: null, cpu: 23, mem: 67 });
  assert.deepEqual(parseWindowsMetrics('cpu=23\r\nmem='), { drive: null, cpu: 23, mem: null });
  assert.deepEqual(parseWindowsMetrics('cpu=\r\nmem=67'), { drive: null, cpu: null, mem: 67 });
});

test('Windows system metrics include the free space percentage for the C drive', () => {
  assert.deepEqual(parseWindowsMetrics('drive=41\r\ncpu=23\r\nmem=67'), { drive: 41, cpu: 23, mem: 67 });
  assert.deepEqual(parseWindowsMetrics('drive=\r\ncpu=23\r\nmem=67'), { drive: null, cpu: 23, mem: 67 });
});
