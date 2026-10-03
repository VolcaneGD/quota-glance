const test = require('node:test');
const assert = require('node:assert/strict');
const { OfficialSource } = require('../src/official-source');
const now = '2026-10-03T01:30:00Z';
test('official feed requires an explicit reset; incidents alone remain incomplete', async () => {
  const source = new OfficialSource({ now: () => now, fetchImpl: async () => ({ ok: true, url: 'https://status.openai.com/history.rss', text: async () => `<rss><channel><item><title>Codex: We are investigating rate-limit issues.</title><link>https://status.openai.com/incidents/one</link><pubDate>${now}</pubDate></item></channel></rss>` }) });
  const events = await source.fetchEvents();
  assert.equal(events[0].certainty, 'official'); assert.equal(events[0].type, 'incident_only');
});
test('official article verification needs an original publication date and never trusts a news host', async () => {
  const source = new OfficialSource({ now: () => now, fetchImpl: async () => ({ ok: true, url: 'https://openai.com/index/reset/', text: async () => `<meta property="article:published_time" content="${now}"><article>We will reset Codex usage limits for all users at 2pm UTC.</article>` }) });
  assert.equal((await source.verifyPage('https://openai.com/index/reset/')).certainty, 'confirmed');
  assert.equal(await source.verifyPage('https://www.itmedia.co.jp/aiplus/'), null);
});
