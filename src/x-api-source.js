const SOURCE_ACCOUNT = 'thsottiaux';
const X_SEARCH_URL = 'https://api.x.com/2/tweets/search/recent';

function isResetAnnouncement(post) {
  const text = String(post?.text || '');
  if (!/\b(codex|chatgpt work)\b/i.test(text)) return false;
  return /\bbanked reset\b|\b(i|we) have reset\b|\breset(ting)? usage limits\b|\busage limits reset\b|\brate limits reset\b/i.test(text)
    || (/\b(reset|limits|usage)\b/i.test(text) && /\b(all users|all paid|paid users|subscriptions|within an hour|this evening)\b/i.test(text));
}

function safeEvent(post, detectedAt) {
  return /^\d+$/.test(String(post?.id || '')) && isResetAnnouncement(post)
    ? { postId: String(post.id), detectedAt }
    : null;
}

class XApiSource {
  constructor({ getToken, fetchImpl = globalThis.fetch, now = () => new Date().toISOString() } = {}) {
    this.getToken = getToken;
    this.fetchImpl = fetchImpl;
    this.now = now;
  }

  async fetchEvent() {
    const token = this.getToken?.();
    if (!token || typeof this.fetchImpl !== 'function') return null;
    try {
      const params = new URLSearchParams({
        query: `from:${SOURCE_ACCOUNT} (Codex OR "ChatGPT Work" OR reset OR limits OR usage) -is:retweet`,
        max_results: '20',
        'tweet.fields': 'created_at',
      });
      const response = await this.fetchImpl(`${X_SEARCH_URL}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return null;
      const detectedAt = this.now();
      const cutoff = Date.parse(detectedAt) - (3 * 24 * 60 * 60 * 1000);
      return ((await response.json()).data || [])
        .filter((post) => Date.parse(post.created_at) >= cutoff)
        .map((post) => safeEvent(post, detectedAt))
        .filter(Boolean)
        .sort((a, b) => Number(b.postId) - Number(a.postId))[0] || null;
    } catch { return null; }
  }
}

module.exports = { XApiSource, isResetAnnouncement, safeEvent };
