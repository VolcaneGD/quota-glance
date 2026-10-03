const { createHash } = require('node:crypto');
const sources = require('./announcement-sources.json');
const MAX_AGE_MS = 3 * 86400000;

function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (['x.com', 'twitter.com'].includes(url.hostname) && /^\/(?:i\/status|[\w]+\/status)\/\d+$/.test(url.pathname)) {
      return `https://x.com/i/status/${url.pathname.split('/').pop()}`;
    }
    if ([...sources.officialHosts, ...sources.secondaryHosts].includes(url.hostname)) return url.href;
  } catch {}
  return null;
}

function extractTime(text, publishedAt) {
  const published = new Date(publishedAt);
  const relative = text.match(/\b(?:within|in|in the next|within the next)\s+(an?|one|\d+)\s+(hours?|minutes?)\b/i);
  if (relative) {
    const amount = /^\d+$/.test(relative[1]) ? Number(relative[1]) : 1;
    const end = new Date(+published + amount * (/hour/i.test(relative[2]) ? 3600000 : 60000));
    if (!Number.isFinite(+end)) return unknownTime();
    return { effectiveAt: null, effectiveAtWindow: { from: published.toISOString(), to: end.toISOString() }, effectiveAtPrecision: 'relative', timeDescription: null };
  }
  const clock = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(UTC|GMT|JST|PST|PDT|PT)\b/i);
  if (clock) {
    let hour = Number(clock[1]);
    const minute = Number(clock[2] || 0);
    if ((clock[3] && (hour < 1 || hour > 12)) || hour > 23 || minute > 59) return unknownTime();
    if (clock[3]) hour = hour % 12 + (/pm/i.test(clock[3]) ? 12 : 0);
    const zone = clock[4].toUpperCase();
    const tz = zone === 'PT' ? 'America/Los_Angeles' : zone === 'JST' ? 'Asia/Tokyo' : zone === 'PST' ? 'Etc/GMT+8' : zone === 'PDT' ? 'Etc/GMT+7' : 'UTC';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(published).map(p => [p.type, p.value]));
    let year = Number(parts.year), month = Number(parts.month), day = Number(parts.day);
    // A supplied calendar date takes precedence over the publication date.
    const isoDate = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    const namedDate = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i);
    if (isoDate) [year, month, day] = isoDate.slice(1).map(Number);
    else if (namedDate) { month = new Date(`${namedDate[1]} 1 2000`).getMonth() + 1; day = Number(namedDate[2]); year = Number(namedDate[3] || year); }
    else if (/\btomorrow\b/i.test(text)) day++;
    if ((isoDate || namedDate) && (month < 1 || month > 12 || day < 1 || new Date(Date.UTC(year, month - 1, day)).getUTCMonth() !== month - 1)) return unknownTime();
    let stamp = Date.UTC(year, month - 1, day, hour, minute);
    let offset = ({ UTC: 0, GMT: 0, JST: 9, PST: -8, PDT: -7 })[zone];
    if (zone === 'PT') {
      // Resolve the date's actual Pacific offset, including daylight saving time.
      const offsetAt = (value) => Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date(value)).find(p => p.type === 'timeZoneName').value.replace('GMT', ''));
      offset = offsetAt(stamp); stamp -= offset * 3600000;
      const adjusted = offsetAt(stamp);
      if (adjusted !== offset) stamp += (offset - adjusted) * 3600000;
    } else stamp -= offset * 3600000;
    return { effectiveAt: new Date(stamp).toISOString(), effectiveAtPrecision: 'exact', effectiveAtWindow: null, timeDescription: null };
  }
  const dateOnly = text.match(/\b(tomorrow|later today|today|this evening|soon|shortly)\b/i);
  if (dateOnly) return { ...unknownTime(), effectiveAtPrecision: /soon|shortly/i.test(dateOnly[1]) ? 'unknown' : 'date_only', timeDescription: dateOnly[1].toLowerCase() };
  // A clock with no timezone is deliberately not assigned a timezone.
  const unzoned = text.match(/\b\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/i);
  return { ...unknownTime(), timeDescription: unzoned ? `${unzoned[0]} (timezone unspecified)` : null };
}

function unknownTime() { return { effectiveAt: null, effectiveAtWindow: null, effectiveAtPrecision: 'unknown', timeDescription: null }; }

function extractResetEvent(post, detectedAt = new Date().toISOString()) {
  const text = String(post.text || '').replace(/\s+/g, ' ');
  const publishedAt = post.created_at || post.publishedAt;
  const age = Date.parse(detectedAt) - Date.parse(publishedAt);
  if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_MS || !/\b(codex|chatgpt(?: work)?)\b/i.test(text)) return null;
  const sourceUrl = safeSourceUrl(post.sourceUrl || `https://x.com/${post.author || 'thsottiaux'}/status/${post.id}`);
  if (!sourceUrl) return null;
  const isX = new URL(sourceUrl).hostname === 'x.com';
  const author = String(post.author || '').toLowerCase();
  const verified = post.verifiedOriginal === true && (isX ? sources.xAccounts.some(a => a.toLowerCase() === author) : sources.officialHosts.includes(new URL(sourceUrl).hostname));
  const tier = verified ? (isX && author === 'thsottiaux' ? 2 : 1) : 3;
  const speculative = /\b(may|might|maybe|possibly|considering|could|suggest(?:ion)?|would|should)\b|\b(?:not|never|won't|will not)\s+(?:\w+\s+){0,2}reset/i.test(text);
  const explicitReset = !speculative && /\b(?:(?:we|i)\s+(?:have\s+|are\s+|will\s+)?reset(?:ting)?|we're\s+resetting|we'll\s+reset|will\s+(?:receive\s+(?:a\s+)?(?:full\s+)?reset|be\s+reset)|(?:usage|rate)\s+limits\s+(?:have\s+been\s+|are\s+being\s+|will\s+be\s+)?reset|full\s+reset\s+(?:within|in)|(?:added|receive|available).*banked reset)\b/i.test(text);
  const scope = /\b(?:all|every)\s+paid|\bpaid users\b/i.test(text) ? 'paid_users'
    : /\b(?:all|every)\b.*\busers\b|\beveryone\b/i.test(text) ? 'all_users'
      : /\b(?:pro|plus|team|business|enterprise)\b/i.test(text) ? (text.match(/\b(?:pro|plus|team|business|enterprise)\b/i)[0].toLowerCase()) : 'unknown';
  const banked = /banked reset/i.test(text);
  const completed = /\b(?:have reset|has reset|we reset|i reset|have been reset|was reset|were reset)\b/i.test(text);
  const scheduled = /\b(?:will|we'll|within|tomorrow|today|this evening|soon|shortly)\b/i.test(text) || /\bat\s+\d/i.test(text);
  const time = extractTime(text, publishedAt);
  const status = /\b(?:cancelled|canceled|withdrawn|postponed indefinitely)\b/i.test(text) ? 'expired' : completed ? 'completed' : scheduled ? 'scheduled' : 'active';
  const type = banked ? 'banked_reset' : explicitReset ? (scheduled ? 'scheduled_usage_reset' : completed ? 'global_usage_reset' : 'immediate_usage_reset')
    : /investigat|incident|incorrect|outage/i.test(text) ? 'incident_only' : /increas|decreas|chang/i.test(text) ? 'usage_limit_change' : 'unknown';
  if (!/reset|usage limits|rate.limit/i.test(text)) return null;
  const explicitTime = time.effectiveAtPrecision !== 'unknown';
  const certainty = verified ? (explicitReset && scope !== 'unknown' && (status !== 'scheduled' || explicitTime) ? 'confirmed' : 'official') : 'secondary';
  const originalId = /^\d+$/.test(String(post.edit_history_tweet_ids?.[0])) ? post.edit_history_tweet_ids[0] : sourceUrl.split('/').pop();
  const eventId = isX ? `x-${originalId}` : `official-${createHash('sha256').update(sourceUrl).digest('hex').slice(0, 20)}`;
  const products = [/codex/i.test(text) ? 'codex' : null, /chatgpt/i.test(text) ? 'chatgpt' : null].filter(Boolean);
  const quotaWindows = [/\b(?:5[- ]hour|five[- ]hour)\b/i.test(text) ? 'fiveHour' : null, /\b(?:weekly|week|7[- ]day)\b/i.test(text) ? 'weekly' : null].filter(Boolean);
  const semantic = [products.join(','), quotaWindows.join(','), type.replace(/scheduled_usage_reset|immediate_usage_reset|global_usage_reset/, 'usage_reset'), scope, time.effectiveAt || time.effectiveAtWindow?.to || ''];
  return { eventId, id: eventId, sourceUrl, source: { type: isX ? 'x' : 'official', tier, author: author || null, url: sourceUrl }, publishedAt: new Date(publishedAt).toISOString(), detectedAt, type, status, certainty, scope, ...time,
    products, quotaWindows, evidence: { explicitReset, explicitTime, explicitScope: scope !== 'unknown' },
    canonicalId: time.effectiveAt || time.effectiveAtWindow ? `reset-${createHash('sha256').update(semantic.join('|')).digest('hex').slice(0, 20)}` : eventId,
    revision: createHash('sha256').update(JSON.stringify([type, status, scope, quotaWindows, time, certainty])).digest('hex').slice(0, 12) };
}

function mergeEvents(events) {
  const merged = new Map();
  for (const event of events) {
    const key = event.canonicalId || event.eventId;
    const previous = merged.get(key);
    const allSources = [...(previous?.sources || (previous ? [previous.source] : [])), event.source, ...(event.sources || [])].filter(Boolean);
    const best = !previous || event.source.tier < previous.source.tier || (event.source.tier === previous.source.tier && Date.parse(event.publishedAt) >= Date.parse(previous.publishedAt)) ? event : previous;
    merged.set(key, { ...best, detectedAt: previous && Date.parse(previous.detectedAt) < Date.parse(event.detectedAt) ? previous.detectedAt : event.detectedAt, sources: [...new Map(allSources.map(s => [s.url, s])).values()] });
  }
  return [...merged.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

module.exports = { MAX_AGE_MS, safeSourceUrl, extractTime, extractResetEvent, mergeEvents };
