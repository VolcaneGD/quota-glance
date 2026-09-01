const test = require('node:test');
const assert = require('node:assert/strict');
const { decryptToken, encryptToken, tokenStatus } = require('../src/secure-token-store');

const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(`encrypted:${value}`),
  decryptString: (value) => value.toString('utf8').replace('encrypted:', ''),
};

test('encrypts an optional X token and exposes only its status', () => {
  const encrypted = encryptToken(safeStorage, 'secret-token-value');

  assert.notEqual(encrypted, 'secret-token-value');
  assert.equal(decryptToken(safeStorage, encrypted), 'secret-token-value');
  assert.deepEqual(tokenStatus(encrypted, true), { configured: true, protected: true });
});

test('does not persist a token when platform encryption is unavailable', () => {
  assert.equal(encryptToken({ isEncryptionAvailable: () => false }, 'secret-token-value'), null);
});
