const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeWindowState } = require('../src/window-state');

test('window state falls back to safe defaults and clamps opacity', () => {
  assert.deepEqual(normalizeWindowState({ opacity: 0.1 }), { bounds: null, language: 'ja', refreshIntervalMs: 5000, opacity: 0.4, minimumMode: false });
});
