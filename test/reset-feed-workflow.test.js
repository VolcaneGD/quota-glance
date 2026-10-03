const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('reset-feed workflow checks official sources even without an RSS secret', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'update-reset-feed.yml'), 'utf8');

  assert.doesNotMatch(workflow, /if \[ -z/);
  assert.match(workflow, /npm run update-reset-feed/);
  assert.match(workflow, /GOOGLE_ALERT_RSS_URL: \$\{\{ secrets\.GOOGLE_ALERT_RSS_URL \}\}/);
});
