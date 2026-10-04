const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { NotificationSound } = require('../src/notification-sound');

test('custom sound uses a hidden isolated player and coalesces overlapping notices', async () => {
  let plays = 0; let windows = 0; let finish; let destroyed = false;
  const player = new NotificationSound({ createWindow: options => {
    windows++;
    assert.equal(options.show, false); assert.equal(options.webPreferences.backgroundThrottling, false);
    assert.equal(options.webPreferences.sandbox, true);
    return { isDestroyed: () => destroyed, destroy: () => { destroyed = true; }, loadFile: async () => {},
      webContents: { setWindowOpenHandler() {}, executeJavaScript: () => { plays++; return new Promise(resolve => { finish = resolve; }); } } };
  } });
  const first = player.play(); const second = player.play();
  assert.equal(first, second);
  await Promise.resolve(); finish(true); assert.equal(await first, true);
  const third = player.play(); finish(true); await third;
  assert.equal(plays, 2); assert.equal(windows, 1);
  player.stop(); assert.equal(destroyed, true);
});

test('notification sound failure does not fail or retry the Windows toast', async () => {
  let errors = 0;
  const player = new NotificationSound({ createWindow: () => { throw new Error('unavailable'); }, onError: () => errors++ });
  assert.equal(await player.play(), false); assert.equal(errors, 1);
});

test('custom MP3 is packaged and Windows default sound is disabled', () => {
  const root = path.join(__dirname, '..');
  assert.ok(fs.statSync(path.join(root, 'assets', 'notification.mp3')).size > 0);
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.match(main, /new Notification\(\{[^\n]*silent: true/);
  assert.match(main, /notificationSound\?\.play\(\)/);
});
