const fs = require('node:fs/promises');
const path = require('node:path');

const SOURCE_ACCOUNT = 'thsottiaux';
const X_SEARCH_URL = 'https://api.x.com/2/tweets/search/recent';
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

async function fetchRecentPosts() {
  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) throw new Error('X_BEARER_TOKEN is required');
  const params = new URLSearchParams({
    query: `from:${SOURCE_ACCOUNT} (Codex OR "ChatGPT Work" OR reset OR limits OR usage) -is:retweet`,
    max_results: '20',
    'tweet.fields': 'created_at',
  });
  const response = await fetch(`${X_SEARCH_URL}?${params}`, { headers: { Authorization: `Bearer ${bearerToken}` } });
  if (!response.ok) throw new Error(`X API request failed: ${response.status} ${await response.text()}`);
  return (await response.json()).data || [];
}

async function main() {
  const feed = buildFeed(await fetchRecentPosts());
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(feed, null, 2)}\n`, 'utf8');
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });

module.exports = { buildFeed, classifyPost };
