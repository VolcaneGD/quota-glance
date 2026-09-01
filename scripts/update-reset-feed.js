const fs = require('node:fs/promises');
const path = require('node:path');

const SOURCE_ACCOUNT = 'thsottiaux';
const X_SEARCH_URL = 'https://api.x.com/2/tweets/search/recent';
const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'reset-feed.json');

function formatYyMmDdJst(value) {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: '2-digit', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}/${part('month')}/${part('day')}`;
}

function classifyPost(post) {
  const text = String(post?.text || '');
  if (!/\b(codex|chatgpt work)\b/i.test(text)) return null;
  const banked = /\bbanked reset\b/i.test(text);
  const direct = /\b(i|we) have reset\b|\breset(ting)? usage limits\b|\busage limits reset\b|\brate limits reset\b/i.test(text);
  const hint = /\b(reset|limits|usage)\b/i.test(text) && /\b(all users|all paid|paid users|subscriptions|within an hour|this evening)\b/i.test(text);
  if (!banked && !direct && !hint) return null;

  const date = formatYyMmDdJst(post.created_at);
  const kind = banked ? 'banked_reset' : 'possible_reset';
  return {
    id: String(post.id),
    postedAt: post.created_at,
    kind,
    confidence: banked || direct ? 'high' : 'medium',
    messageJa: kind === 'banked_reset' ? `${date}: banked reset あり` : `${date}: リセットの可能性あり`,
    messageEn: kind === 'banked_reset' ? `${date}: Banked reset available` : `${date}: Reset may be coming`,
    sourceUrl: `https://x.com/${SOURCE_ACCOUNT}/status/${post.id}`,
  };
}

function buildFeed(posts, now = new Date().toISOString()) {
  const cutoff = Date.parse(now) - (3 * 24 * 60 * 60 * 1000);
  return {
    schemaVersion: 1,
    updatedAt: now,
    sourceAccount: SOURCE_ACCOUNT,
    events: posts
      .map(classifyPost)
      .filter((event) => event && Date.parse(event.postedAt) >= cutoff)
      .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt)),
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

module.exports = { buildFeed, classifyPost, formatYyMmDdJst };
