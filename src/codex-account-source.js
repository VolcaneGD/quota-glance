const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { parseRateLimitLine } = require('./usage-reader');

// Reuse Codex's authentication through its documented, read-only account RPC.
// Never read auth.json, start a conversation, or copy credentials into this app.
async function resolveCodexExecutable() {
  const names = process.platform === 'win32' ? ['codex.exe'] : ['codex'];
  const candidates = (process.env.PATH || '').split(path.delimiter)
    .flatMap(dir => names.map(name => path.join(dir, name)));
  if (process.platform === 'win32') {
    const npmRoot = path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@openai', 'codex');
    candidates.push(path.join(npmRoot, 'node_modules', '@openai', 'codex-win32-x64', 'vendor', 'x86_64-pc-windows-msvc', 'bin', 'codex.exe'));
    candidates.push(path.join(npmRoot, 'vendor', 'x86_64-pc-windows-msvc', 'bin', 'codex.exe'));
    try {
      const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        "Get-AppxPackage '*Codex*' | ForEach-Object { $_.InstallLocation }"], { windowsHide: true, timeout: 8000 });
      for (const dir of stdout.trim().split(/\r?\n/).filter(Boolean)) candidates.push(path.join(dir, 'app', 'resources', 'codex.exe'));
    } catch {}
  }
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function accountSnapshot(result, observedAt = new Date().toISOString()) {
  const bucket = result?.rateLimitsByLimitId ? result.rateLimitsByLimitId.codex : result?.rateLimits;
  if (!bucket || (bucket.limitId && bucket.limitId !== 'codex')) return null;
  const window = value => value && ({ used_percent: value.usedPercent, window_minutes: value.windowDurationMins, resets_at: value.resetsAt });
  const snapshot = parseRateLimitLine(JSON.stringify({ timestamp: observedAt, type: 'event_msg', payload: { rate_limits: {
    limit_id: 'codex', primary: window(bucket.primary), secondary: window(bucket.secondary),
    credits: bucket.credits && { has_credits: bucket.credits.hasCredits, unlimited: bucket.credits.unlimited, balance: bucket.credits.balance },
    plan_type: bucket.planType, spend_control_reached: bucket.spendControlReached, rate_limit_reached_type: bucket.rateLimitReachedType,
  } } }), 'codex:account/rateLimits/read');
  return snapshot && { ...snapshot, dataSource: 'account' };
}

class CodexAccountSource {
  constructor({ resolveExecutable = resolveCodexExecutable, spawnImpl = spawn, now = () => Date.now(), timeoutMs = 15000 } = {}) {
    Object.assign(this, { resolveExecutable, spawnImpl, now, timeoutMs });
    this.pending = new Map();
    this.nextId = 1;
    this.nextPollAt = 0;
    this.snapshot = null;
    this.stopped = false;
  }

  async connect() {
    if (this.connecting) return this.connecting;
    if (this.child && this.initialized) return;
    this.connecting = (async () => {
      const executable = await this.resolveExecutable();
      if (!executable || this.stopped) throw new Error('Codex unavailable');
      const child = this.spawnImpl(executable, ['app-server', '--listen', 'stdio://'], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
      this.child = child;
      this.buffer = '';
      this.initialized = false;
      child.stdout.on('data', chunk => {
        this.buffer += chunk.toString();
        if (this.buffer.length > 4 * 1024 * 1024) { this.disconnect(); return; }
        let boundary;
        while ((boundary = this.buffer.indexOf('\n')) >= 0) {
          const line = this.buffer.slice(0, boundary); this.buffer = this.buffer.slice(boundary + 1);
          try {
            const message = JSON.parse(line);
            const request = this.pending.get(message.id);
            if (!request) continue;
            this.pending.delete(message.id); clearTimeout(request.timer);
            if (message.error) request.reject(new Error('Codex account request failed'));
            else request.resolve(message.result);
          } catch {}
        }
      });
      child.stdin.on('error', () => this.disconnect(child));
      child.on('error', () => this.disconnect(child));
      child.on('exit', () => this.disconnect(child));
      await this.request('initialize', { clientInfo: { name: 'quota_glance', title: 'Quota Glance', version: require('../package.json').version } });
      child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
      this.initialized = true;
    })().finally(() => { this.connecting = null; });
    return this.connecting;
  }

  request(method, params) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Codex account timeout')); this.disconnect(); }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.child.stdin.write(JSON.stringify({ id, method, ...(params ? { params } : {}) }) + '\n'); }
      catch { this.disconnect(); }
    });
  }

  disconnect(child = this.child) {
    if (child !== this.child) return;
    this.child = null; this.initialized = false;
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('Codex disconnected')); }
    this.pending.clear();
    child?.kill();
  }

  async read({ force = false } = {}) {
    if (this.stopped) return this.snapshot;
    if (this.inFlight) return this.inFlight;
    if (!force && this.now() < this.nextPollAt) return this.snapshot;
    this.nextPollAt = this.now() + 15000;
    this.inFlight = (async () => {
      try {
        await this.connect();
        const snapshot = accountSnapshot(await this.request('account/rateLimits/read'), new Date(this.now()).toISOString());
        if (snapshot) this.snapshot = snapshot;
      } catch {
        // Fail closed: retain the last real observation; never synthesize 100%.
        this.nextPollAt = this.now() + 60000;
        this.disconnect();
      }
      return this.snapshot;
    })().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  stop() { this.stopped = true; this.disconnect(); }
}

module.exports = { CodexAccountSource, accountSnapshot, resolveCodexExecutable };
