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

test('opacity slider keeps its own visual progress', () => {
  const root = path.join(__dirname, '..');
  const script = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'renderer', 'styles.css'), 'utf8');

  assert.match(script, /function renderOpacity\(\)/);
  assert.match(script, /elements\.opacity\.style\.setProperty\('--range-progress', `\$\{progress\}%`\);/);
  assert.match(css, /--range-progress:/);
  assert.match(css, /var\(--range-progress\)/);
});

test('system metric display retains the last successful value', () => {
  const root = path.join(__dirname, '..');
  const script = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

  assert.match(script, /let lastSystemMetrics = \{\};/);
  assert.match(script, /const displayedValue = Number\.isFinite\(value\) \? value : lastSystemMetrics\[key\];/);
});

test('残り割合の色分岐とミニマムモードの契約を維持する', () => {
  const root = path.join(__dirname, '..');
  const script = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'renderer', 'styles.css'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');

  assert.match(script, /if \(remaining <= 30\) return 'critical';/);
  assert.match(script, /if \(remaining < 50\) return 'warning';/);
  assert.match(script, /targets\.progressFill\.style\.width = `\$\{remaining\}%`;/);
  assert.match(script, /setMinimumMode\(!minimumMode\)/);
  assert.match(css, /\.progress-fill\.critical/);
  assert.match(css, /\.minimum-mode \.app-shell/);
  assert.doesNotMatch(css, /\.minimum-mode \.status-strip\s*\{\s*display\s*:\s*none/);
  assert.match(main, /mainWindow\.setSize\(310, 310, true\);/);
});
