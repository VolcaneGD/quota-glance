const fs = require('node:fs/promises');
const path = require('node:path');

const SOURCE_ACCOUNT = 'thsottiaux';
const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'reset-feed.json');

function classifyPost(post) {
  const text = String(post?.text || '');
  if (!/\b(codex|chatgpt work)\b/i.test(text)) return null;
  const banked = /\bbanked reset\b/i.test(text);
  const direct = /\b(i|we) have reset\b|\breset(ting)? usage limits\b|\busage limits reset\b|\brate limits reset\b/i.test(text);
  const hint = /\b(reset|limits|usage)\b/i.test(text) && /\b(all users|all paid|paid users|subscriptions|within an hour|this evening)\b/i.test(text);
  if (!banked && !direct && !hint) return null;

  return {
    postId: String(post.id),
    createdAt: post.created_at,
  };
}

function buildFeed(posts, now = new Date().toISOString()) {
  const cutoff = Date.parse(now) - (3 * 24 * 60 * 60 * 1000);
  return {
    schemaVersion: 2,
    updatedAt: now,
    events: posts
      .map(classifyPost)
      .filter((event) => event && Date.parse(event.createdAt) >= cutoff)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(({ postId }) => ({ postId, detectedAt: now })),
  };
}

function decodeXml(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function extractRssPosts(xml) {
  const blocks = String(xml).match(/<(?:entry|item)\b[\s\S]*?<\/(?:entry|item)>/gi) || [];
  return blocks.map((block) => {
    const href = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1]
      || block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '';
    const match = href.match(/^https:\/\/x\.com\/thsottiaux\/status\/(\d+)(?:[/?#].*)?$/i);
    if (!match) return null;
    const title = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
    const summary = block.match(/<(?:summary|content|description)\b[^>]*>([\s\S]*?)<\/(?:summary|content|description)>/i)?.[1] || '';
    const date = block.match(/<(?:published|updated|pubDate)\b[^>]*>([\s\S]*?)<\/(?:published|updated|pubDate)>/i)?.[1] || null;
    return { id: match[1], text: decodeXml(`${title} ${summary}`), created_at: date ? decodeXml(date) : null };
  }).filter(Boolean);
}

async function fetchRecentPosts() {
  const rssUrl = process.env.GOOGLE_ALERT_RSS_URL;
  if (!rssUrl) throw new Error('GOOGLE_ALERT_RSS_URL is required');
  const response = await fetch(rssUrl, { headers: { Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml' } });
  if (!response.ok) throw new Error(`Google Alerts RSS request failed: ${response.status}`);
  return extractRssPosts(await response.text());
}

async function main() {
  const feed = buildFeed(await fetchRecentPosts());
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(feed, null, 2)}\n`, 'utf8');
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { buildFeed, classifyPost, extractRssPosts };
