const fs = require('node:fs/promises');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const language = process.argv.includes('--language=en') ? 'en' : 'ja';
  const window = new BrowserWindow({
    width: 372,
    height: 548,
    show: false,
    frame: false,
    backgroundColor: '#0b1210',
    webPreferences: {
      preload: path.join(__dirname, 'screenshot-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');
  await window.loadFile(rendererPath);
  await window.webContents.executeJavaScript(`localStorage.setItem('quota-glance-language', '${language}')`);
  await window.loadFile(rendererPath);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const image = await window.webContents.capturePage();
  const output = path.join(__dirname, '..', 'assets', `quota-glance-screenshot-${language}.png`);
  await fs.writeFile(output, image.toPNG());
  console.log(output);
  window.destroy();
  app.exit(0);
});
