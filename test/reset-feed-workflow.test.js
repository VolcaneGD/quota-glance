const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('reset-feed workflow skips cleanly until its X token secret is configured', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'update-reset-feed.yml'), 'utf8');

  assert.match(workflow, /if \[ -z "\$X_BEARER_TOKEN" \]; then/);
  assert.match(workflow, /No X_BEARER_TOKEN configured; keeping the public feed empty\./);
});
