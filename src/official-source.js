const sources = require('./announcement-sources.json');
const { extractResetEvent, safeSourceUrl } = require('./reset-event');
function decodeXml(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();
}
function extractRssPosts(xml, verifiedOriginal = false) {
  return (String(xml).match(/<(?:entry|item)\b[\s\S]*?<\/(?:entry|item)>/gi) || []).map(block => {
    let href = block.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1] || block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '';
    href = decodeXml(href);
    try { const redirect = new URL(href); if (['www.google.com', 'google.com'].includes(redirect.hostname) && redirect.pathname === '/url') href = redirect.searchParams.get('url') || redirect.searchParams.get('q') || ''; } catch {}
    const sourceUrl = safeSourceUrl(href);
    if (!sourceUrl) return null;
    const author = href.match(/^https:\/\/(?:x|twitter)\.com\/([^/]+)\/status\//i)?.[1];
    const title = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
    const summary = block.match(/<(?:summary|content|description)\b[^>]*>([\s\S]*?)<\/(?:summary|content|description)>/i)?.[1] || '';
    const date = block.match(/<(?:published|pubDate|updated)\b[^>]*>([\s\S]*?)<\/(?:published|pubDate|updated)>/i)?.[1];
    return { id: sourceUrl.split('/').pop(), sourceUrl, author, text: decodeXml(`${title} ${summary}`), created_at: date ? decodeXml(date) : null, verifiedOriginal };
  }).filter(Boolean);
}
class OfficialSource {
  constructor({ fetchImpl = globalThis.fetch, now = () => new Date().toISOString() } = {}) { Object.assign(this, { fetchImpl, now }); }
  async fetchEvents() {
    const results = await Promise.allSettled(sources.officialFeeds.map(async url => {
      const response = await this.fetchImpl(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
      if (!response.ok || !safeSourceUrl(response.url || url)) return [];
      return extractRssPosts(await response.text(), true).map(p => extractResetEvent(p, this.now())).filter(Boolean);
    }));
    const pages = await Promise.allSettled(sources.officialPages.map(url => this.verifyPage(url)));
    return [...results.flatMap(r => r.status === 'fulfilled' ? r.value : []), ...pages.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)];
  }
  async verifyPage(url) {
    const safe = safeSourceUrl(url);
    if (!safe || !sources.officialHosts.includes(new URL(safe).hostname)) return null;
    try {
      const response = await this.fetchImpl(safe, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
      if (!response.ok || !safeSourceUrl(response.url || safe) || !sources.officialHosts.includes(new URL(response.url || safe).hostname)) return null;
      const html = await response.text();
      const date = html.match(/<meta[^>]*(?:property|name)=["'](?:article:published_time|datePublished|date)["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/"datePublished"\s*:\s*"([^"']+)"/i)?.[1];
      const body = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
      if (!date || !body) return null;
      return extractResetEvent({ sourceUrl: response.url || safe, text: decodeXml(body.replace(/<script\b[\s\S]*?<\/script>/gi, '')), created_at: date, verifiedOriginal: true }, this.now());
    } catch { return null; }
  }
}
module.exports = { OfficialSource, decodeXml, extractRssPosts };
