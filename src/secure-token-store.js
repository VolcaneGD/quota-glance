function encryptToken(safeStorage, token) {
  if (typeof token !== 'string' || !token.trim() || !safeStorage?.isEncryptionAvailable?.()) return null;
  return safeStorage.encryptString(token.trim()).toString('base64');
}

function decryptToken(safeStorage, encryptedToken) {
  if (typeof encryptedToken !== 'string' || !encryptedToken || !safeStorage?.isEncryptionAvailable?.()) return null;
  try { return safeStorage.decryptString(Buffer.from(encryptedToken, 'base64')); } catch { return null; }
}

function tokenStatus(encryptedToken, encryptionAvailable) {
  return { configured: typeof encryptedToken === 'string' && encryptedToken.length > 0, protected: encryptionAvailable === true };
}

class SecureTokenStore {
  constructor(filePath, safeStorage) { this.filePath = filePath; this.safeStorage = safeStorage; this.encryptedToken = null; this.load(); }
  load() { try { this.encryptedToken = JSON.parse(fs.readFileSync(this.filePath, 'utf8')).encryptedToken || null; } catch { this.encryptedToken = null; } }
  getToken() { return decryptToken(this.safeStorage, this.encryptedToken); }
  status() { return tokenStatus(this.encryptedToken, this.safeStorage?.isEncryptionAvailable?.() === true); }
  setToken(token) { const encryptedToken = encryptToken(this.safeStorage, token); if (!encryptedToken) throw new Error('Windows encryption is unavailable'); this.encryptedToken = encryptedToken; fs.mkdirSync(path.dirname(this.filePath), { recursive: true }); fs.writeFileSync(this.filePath, JSON.stringify({ encryptedToken }), 'utf8'); return this.status(); }
  clear() { this.encryptedToken = null; try { fs.unlinkSync(this.filePath); } catch {} return this.status(); }
}

module.exports = { SecureTokenStore, decryptToken, encryptToken, tokenStatus };
const fs = require('node:fs');
const path = require('node:path');
