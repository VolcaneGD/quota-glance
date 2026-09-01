const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('reset-feed workflow skips cleanly until its Google Alerts RSS secret is configured', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'update-reset-feed.yml'), 'utf8');

  assert.match(workflow, /if \[ -z "\$GOOGLE_ALERT_RSS_URL" \]; then/);
  assert.match(workflow, /No GOOGLE_ALERT_RSS_URL configured; keeping the public feed empty\./);
  assert.match(workflow, /GOOGLE_ALERT_RSS_URL: \$\{\{ secrets\.GOOGLE_ALERT_RSS_URL \}\}/);
});
