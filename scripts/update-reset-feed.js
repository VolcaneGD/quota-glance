const fs = require('node:fs/promises');
const path = require('node:path');
const { extractResetEvent, mergeEvents } = require('../src/reset-event');
const { OfficialSource, extractRssPosts } = require('../src/official-source');
const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'reset-feed.json');
function classifyPost(post, now = new Date().toISOString()) { return extractResetEvent(post, now); }
function buildFeed(posts, now = new Date().toISOString(), previous = { events: [] }, officialEvents = []) {
  const events = mergeEvents([...officialEvents, ...posts.map(p => classifyPost(p, now)).filter(Boolean)]);
  for (const event of events) {
    const old = previous.events?.find(e => e.eventId === event.eventId || e.canonicalId === event.canonicalId);
    if (old && Number.isFinite(Date.parse(old.detectedAt))) event.detectedAt = old.detectedAt;
  }
  return { schemaVersion: 3, updatedAt: now, events };
}
async function main() {
  let previous;
  try { previous = JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf8')); } catch { previous = { events: [] }; }
  let posts = [];
  if (process.env.GOOGLE_ALERT_RSS_URL) {
    const response = await fetch(process.env.GOOGLE_ALERT_RSS_URL, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`RSS request failed: ${response.status}`);
    posts = extractRssPosts(await response.text());
  }
  const official = new OfficialSource();
  const verified = await Promise.allSettled(posts.filter(p => !new URL(p.sourceUrl).hostname.endsWith('x.com')).slice(0, 10).map(p => official.verifyPage(p.sourceUrl)));
  const events = [...await official.fetchEvents(), ...verified.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)];
  const feed = buildFeed(posts, new Date().toISOString(), previous, events);
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(feed, null, 2)}\n`, 'utf8');
}
if (require.main === module) main().catch(() => { console.error('Reset feed update failed; existing feed preserved.'); process.exitCode = 1; });
module.exports = { buildFeed, classifyPost, extractRssPosts };
