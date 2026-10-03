const sources = require('./announcement-sources.json');
const { extractResetEvent, mergeEvents } = require('./reset-event');
const X_SEARCH_URL = 'https://api.x.com/2/tweets/search/recent';
class XApiSource {
  constructor({ getToken, fetchImpl = globalThis.fetch, now = () => new Date().toISOString() } = {}) { Object.assign(this, { getToken, fetchImpl, now }); }
  async fetchPosts() {
    const token = this.getToken?.();
    if (!token || typeof this.fetchImpl !== 'function') return [];
    try {
      const params = new URLSearchParams({ query: `(${sources.xAccounts.map(a => `from:${a}`).join(' OR ')}) (Codex OR "ChatGPT Work" OR reset OR limits) -is:retweet`, max_results: '20', 'tweet.fields': 'created_at,author_id,edit_history_tweet_ids', expansions: 'author_id', 'user.fields': 'username' });
      const response = await this.fetchImpl(`${X_SEARCH_URL}?${params}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) return [];
      const payload = await response.json();
      const authors = new Map((payload.includes?.users || []).map(u => [u.id, u.username]));
      return (payload.data || []).map(p => ({ ...p, author: authors.get(p.author_id), verifiedOriginal: authors.has(p.author_id) }));
    } catch { return []; }
  }
  async fetchEvents() { return mergeEvents((await this.fetchPosts()).map(p => extractResetEvent(p, this.now())).filter(Boolean)); }
  async fetchEvent() { return (await this.fetchEvents())[0] || null; }
}
function isResetAnnouncement(post) { return !!extractResetEvent(post, post.created_at)?.evidence.explicitReset; }
function safeEvent(post, detectedAt) { return extractResetEvent(post, detectedAt); }
module.exports = { XApiSource, isResetAnnouncement, safeEvent };
