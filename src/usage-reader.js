const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const DEFAULT_REFRESH_INTERVAL_MS = 5_000;
const MIN_REFRESH_INTERVAL_MS = 1_000;
const MAX_REFRESH_INTERVAL_MS = 60_000;
const MAX_FILES = 40;
const MAX_SCAN_BYTES = 8 * 1024 * 1024;
const CHUNK_BYTES = 256 * 1024;

function normalizeRefreshInterval(value) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds)) return DEFAULT_REFRESH_INTERVAL_MS;
  return Math.min(MAX_REFRESH_INTERVAL_MS, Math.max(MIN_REFRESH_INTERVAL_MS, Math.round(milliseconds)));
}

function parseRateLimitLine(line, sourcePath = '') {
  if (!line.includes('"rate_limits"')) return null;
  try {
    const record = JSON.parse(line);
    const rateLimits = record?.payload?.rate_limits;
    if (record?.type !== 'event_msg' || !rateLimits) return null;
    // Other buckets (for example premium) are not Codex's quota or credit balance.
    // Accept legacy records without an ID, but never overwrite Codex with another ID.
    if (rateLimits.limit_id && rateLimits.limit_id !== 'codex') return null;

    const timestampMs = Date.parse(record.timestamp);
    if (!Number.isFinite(timestampMs)) return null;

    const primary = normalizeLimit(rateLimits.primary);
    const secondary = normalizeLimit(rateLimits.secondary);
    const { fiveHour, weekly } = classifyLimits(primary, secondary);

    return {
      observedAt: new Date(timestampMs).toISOString(),
      sourcePath,
      planType: rateLimits.plan_type || null,
      limitId: rateLimits.limit_id || null,
      fiveHour,
      weekly,
      primary,
      secondary,
      credits: normalizeCredits(rateLimits.credits),
      spendControlReached: rateLimits.spend_control_reached === true,
      rateLimitReachedType: rateLimits.rate_limit_reached_type || null,
    };
  } catch {
    return null;
  }
}

function classifyLimits(primary, secondary) {
  const limits = [primary, secondary].filter(Boolean);
  const fiveHour = limits.find((limit) => (
    Number.isFinite(limit.windowMinutes)
    && limit.windowMinutes >= 240
    && limit.windowMinutes <= 360
  )) || null;
  const weekly = limits.find((limit) => (
    Number.isFinite(limit.windowMinutes)
    && limit.windowMinutes >= 6 * 24 * 60
  )) || (!fiveHour ? primary : null);

  return { fiveHour, weekly };
}

function numericValue(value) {
  if (value == null || (typeof value === 'string' && !value.trim())) return NaN;
  return typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
}

function normalizeLimit(limit) {
  if (!limit) return null;
  const usedPercent = numericValue(limit.used_percent);
  const resetsAt = numericValue(limit.resets_at);
  const windowMinutes = numericValue(limit.window_minutes);
  return {
    usedPercent: Number.isFinite(usedPercent) ? Math.min(100, Math.max(0, usedPercent)) : null,
    remainingPercent: Number.isFinite(usedPercent) ? Math.min(100, Math.max(0, 100 - usedPercent)) : null,
    resetsAt: Number.isFinite(resetsAt) ? new Date(resetsAt * 1000).toISOString() : null,
    windowMinutes: Number.isFinite(windowMinutes) ? windowMinutes : null,
  };
}

function normalizeCredits(credits) {
  if (!credits) return null;
  const balance = numericValue(credits.balance);
  return {
    hasCredits: credits.has_credits === true,
    unlimited: credits.unlimited === true,
    balance: Number.isFinite(balance) ? balance : null,
  };
}

async function listJsonlFiles(root) {
  const result = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        try {
          const stat = await fsp.stat(fullPath);
          result.push({ path: fullPath, mtimeMs: stat.mtimeMs });
        } catch {
          // A rotating session file may disappear between listing and stat.
        }
      }
    }
  }
  return result;
}

function mergeUsageSnapshots(snapshots) {
  const records = snapshots.filter(snapshot => snapshot && !snapshot.unavailableReason)
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
  if (!records.length) return null;
  const result = { ...records[0], fieldObservedAt: {} };
  // Each field retains its own observation time, even when read from an older line.
  for (const key of ['fiveHour', 'weekly', 'primary', 'secondary', 'credits']) {
    const candidates = records.filter(snapshot => key === 'credits'
      ? snapshot[key] && (Number.isFinite(snapshot[key].balance) || snapshot[key].unlimited)
      : Number.isFinite(snapshot[key]?.remainingPercent));
    candidates.sort((a, b) => Date.parse(b.fieldObservedAt?.[key] || b.observedAt) - Date.parse(a.fieldObservedAt?.[key] || a.observedAt));
    const source = candidates[0];
    result[key] = source?.[key] || null;
    if (source) result.fieldObservedAt[key] = source.fieldObservedAt?.[key] || source.observedAt;
  }
  return result;
}

async function findLatestInFile(filePath) {
  let handle;
  let latest = null;
  try {
    handle = await fsp.open(filePath, 'r');
    const { size } = await handle.stat();
    let position = size;
    let suffix = '';
    let scanned = 0;

    while (position > 0 && scanned < MAX_SCAN_BYTES) {
      const length = Math.min(CHUNK_BYTES, position, MAX_SCAN_BYTES - scanned);
      position -= length;
      scanned += length;
      const buffer = Buffer.allocUnsafe(length);
      await handle.read(buffer, 0, length, position);
      const text = buffer.toString('utf8') + suffix;
      const lines = text.split(/\r?\n/);
      suffix = lines.shift() || '';

      for (let index = lines.length - 1; index >= 0; index -= 1) {
        const parsed = parseRateLimitLine(lines[index], filePath);
        if (parsed) latest = mergeUsageSnapshots([latest, parsed]);
        if (latest?.fiveHour && latest?.weekly && latest?.credits) return latest;
      }
    }
    return mergeUsageSnapshots([latest, parseRateLimitLine(suffix, filePath)]);
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => {});
  }
}

async function readLatestSnapshot(roots) {
  const groups = await Promise.all(roots.map(listJsonlFiles));
  const files = groups.flat().sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, MAX_FILES);
  const snapshots = await Promise.all(files.map((file) => findLatestInFile(file.path)));
  const latest = mergeUsageSnapshots(snapshots);

  return latest || {
    observedAt: null,
    sourcePath: null,
    planType: null,
    limitId: null,
    fiveHour: null,
    weekly: null,
    primary: null,
    secondary: null,
    credits: null,
    spendControlReached: false,
    rateLimitReachedType: null,
    unavailableReason: 'no_usage_data',
  };
}

class UsageReader extends EventEmitter {
  constructor({ roots, refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS, accountSource = null }) {
    super();
    this.roots = roots;
    this.refreshIntervalMs = normalizeRefreshInterval(refreshIntervalMs);
    this.snapshot = null;
    this.timer = null;
    this.accountTimer = null;
    this.watchers = [];
    this.refreshing = null;
    this.debounceTimer = null;
    this.running = false;
    this.accountSource = accountSource;
    this.accountSnapshot = null;
    this.localSnapshot = null;
    this.accountRefreshing = null;
  }

  async start() {
    this.running = true;
    this.scheduleRefresh();
    this.refreshAccount();
    await this.refresh();
    for (const root of this.roots) {
      try {
        const watcher = fs.watch(root, { recursive: true }, () => {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => this.refresh(), 150);
        });
        watcher.on('error', () => {});
        this.watchers.push(watcher);
      } catch {
        // The periodic refresh remains active if a directory is absent or unwatchable.
      }
    }
    return this.snapshot;
  }

  async refresh() {
    if (this.refreshing) return this.refreshing;
    this.refreshing = readLatestSnapshot(this.roots)
      .then((snapshot) => {
        this.localSnapshot = snapshot;
        this.publishSnapshot();
        return this.snapshot;
      })
      .finally(() => { this.refreshing = null; });
    return this.refreshing;
  }

  getSnapshot() {
    return this.snapshot;
  }

  publishSnapshot() {
    const snapshot = mergeUsageSnapshots([this.localSnapshot, this.accountSnapshot]) || this.localSnapshot;
    if (!snapshot) return;
    snapshot.checkedAt = new Date().toISOString();
    const changed = JSON.stringify(snapshot) !== JSON.stringify(this.snapshot);
    this.snapshot = snapshot;
    if (changed) this.emit('change', snapshot);
  }

  async refreshAccount(force = false) {
    if (!this.accountSource || this.accountRefreshing) return this.accountRefreshing;
    this.accountRefreshing = this.accountSource.read({ force }).then(snapshot => {
      if (!this.running) return;
      if (snapshot) this.accountSnapshot = snapshot;
      this.publishSnapshot();
    }).catch(() => {}).finally(() => { this.accountRefreshing = null; });
    return this.accountRefreshing;
  }

  scheduleRefresh() {
    clearInterval(this.timer);
    clearInterval(this.accountTimer);
    this.timer = this.running
      ? setInterval(() => this.refresh(), this.refreshIntervalMs)
      : null;
    // Account polling must not wait for a large local directory scan.
    this.accountTimer = this.running && this.accountSource
      ? setInterval(() => this.refreshAccount(), Math.max(15000, this.refreshIntervalMs))
      : null;
  }

  setRefreshInterval(value) {
    this.refreshIntervalMs = normalizeRefreshInterval(value);
    this.scheduleRefresh();
    if (this.running) this.refresh();
    return this.refreshIntervalMs;
  }

  stop() {
    this.running = false;
    clearInterval(this.timer);
    clearInterval(this.accountTimer);
    clearTimeout(this.debounceTimer);
    for (const watcher of this.watchers) watcher.close();
    this.watchers = [];
    this.accountSource?.stop();
  }
}

module.exports = {
  DEFAULT_REFRESH_INTERVAL_MS,
  MAX_REFRESH_INTERVAL_MS,
  MIN_REFRESH_INTERVAL_MS,
  UsageReader,
  classifyLimits,
  findLatestInFile,
  mergeUsageSnapshots,
  normalizeCredits,
  normalizeLimit,
  normalizeRefreshInterval,
  parseRateLimitLine,
  readLatestSnapshot,
};
