const fs = require('node:fs');
function normalizeWindowState(value = {}) { return { bounds: value.bounds && Number.isFinite(value.bounds.width) && Number.isFinite(value.bounds.height) ? value.bounds : null, language: value.language === 'en' ? 'en' : 'ja', refreshIntervalMs: Number.isFinite(value.refreshIntervalMs) ? Math.min(60000, Math.max(1000, value.refreshIntervalMs)) : 5000, opacity: Number.isFinite(value.opacity) ? Math.min(1, Math.max(.4, value.opacity)) : 1, minimumMode: value.minimumMode === true }; }
function loadWindowState(filePath) { try { return normalizeWindowState(JSON.parse(fs.readFileSync(filePath, 'utf8'))); } catch { return normalizeWindowState(); } }
function saveWindowState(filePath, value) { fs.mkdirSync(require('node:path').dirname(filePath), { recursive: true }); fs.writeFileSync(filePath, JSON.stringify(normalizeWindowState(value)), 'utf8'); }
module.exports = { loadWindowState, normalizeWindowState, saveWindowState };
