const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const REFRESH_INTERVAL_MS = 15_000;
const MAX_FILES = 40;
const MAX_SCAN_BYTES = 8 * 1024 * 1024;
const CHUNK_BYTES = 256 * 1024;

function parseRateLimitLine(line, sourcePath = '') {
  if (!line.includes('"rate_limits"')) return null;
  try {
    const record = JSON.parse(line);
    const rateLimits = record?.payload?.rate_limits;
    if (record?.type !== 'event_msg' || !rateLimits) return null;

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

function normalizeLimit(limit) {
  if (!limit) return null;
  const usedPercent = Number(limit.used_percent);
  const resetsAt = Number(limit.resets_at);
  const windowMinutes = Number(limit.window_minutes);
  return {
    usedPercent: Number.isFinite(usedPercent) ? Math.min(100, Math.max(0, usedPercent)) : null,
    remainingPercent: Number.isFinite(usedPercent) ? Math.min(100, Math.max(0, 100 - usedPercent)) : null,
    resetsAt: Number.isFinite(resetsAt) ? new Date(resetsAt * 1000).toISOString() : null,
    windowMinutes: Number.isFinite(windowMinutes) ? windowMinutes : null,
  };
}

function normalizeCredits(credits) {
  if (!credits) return null;
  const balance = Number(credits.balance);
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

async function findLatestInFile(filePath) {
  let handle;
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
        if (parsed) return parsed;
      }
    }
    return parseRateLimitLine(suffix, filePath);
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
  const latest = snapshots.filter(Boolean).sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];

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
  constructor({ roots, refreshIntervalMs = REFRESH_INTERVAL_MS }) {
    super();
    this.roots = roots;
    this.refreshIntervalMs = refreshIntervalMs;
    this.snapshot = null;
    this.timer = null;
    this.watchers = [];
    this.refreshing = null;
    this.debounceTimer = null;
  }

  async start() {
    await this.refresh();
    this.timer = setInterval(() => this.refresh(), this.refreshIntervalMs);
    for (const root of this.roots) {
      try {
        const watcher = fs.watch(root, { recursive: true }, () => {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => this.refresh(), 500);
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
        const changed = JSON.stringify(snapshot) !== JSON.stringify(this.snapshot);
        this.snapshot = snapshot;
        if (changed) this.emit('change', snapshot);
        return snapshot;
      })
      .finally(() => { this.refreshing = null; });
    return this.refreshing;
  }

  getSnapshot() {
    return this.snapshot;
  }

  stop() {
    clearInterval(this.timer);
    clearTimeout(this.debounceTimer);
    for (const watcher of this.watchers) watcher.close();
    this.watchers = [];
  }
}

module.exports = {
  UsageReader,
  classifyLimits,
  findLatestInFile,
  normalizeCredits,
  normalizeLimit,
  parseRateLimitLine,
  readLatestSnapshot,
};
