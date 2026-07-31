const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('レンダラーが参照するIDはすべてHTMLに存在する', () => {
  const root = path.join(__dirname, '..');
  const script = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const selectors = [...script.matchAll(/querySelector\('#([^']+)'\)/g)].map((match) => match[1]);

  assert.ok(selectors.length > 0);
  for (const id of selectors) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `#${id} がHTMLに必要です`);
  }
});
