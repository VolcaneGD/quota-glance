const fs = require('node:fs/promises');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const language = process.argv.includes('--language=en') ? 'en' : 'ja';
  const window = new BrowserWindow({
    width: 372,
    height: 604,
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
  await window.webContents.executeJavaScript(`
    localStorage.setItem('quota-glance-language', '${language}');
    localStorage.removeItem('quota-glance-refresh-seconds');
  `);
  await window.loadFile(rendererPath);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const defaultInterval = await window.webContents.executeJavaScript(`document.querySelector('#refresh-interval-value').textContent`);
  if (!defaultInterval.startsWith('5')) throw new Error(`Unexpected default refresh interval: ${defaultInterval}`);
  const interaction = await window.webContents.executeJavaScript(`(() => {
    const slider = document.querySelector('#refresh-interval');
    slider.value = '12';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      label: document.querySelector('#refresh-interval-value').textContent,
      stored: localStorage.getItem('quota-glance-refresh-seconds'),
    };
  })()`);
  if (interaction.stored !== '12') throw new Error('Refresh slider did not persist its value');
  await window.webContents.executeJavaScript(`
    localStorage.setItem('quota-glance-refresh-seconds', '5');
    document.querySelector('#refresh-interval').value = '5';
    document.querySelector('#refresh-interval').dispatchEvent(new Event('input', { bubbles: true }));
  `);
  await new Promise((resolve) => setTimeout(resolve, 180));
  const image = await window.webContents.capturePage();
  const output = path.join(__dirname, '..', 'assets', `quota-glance-screenshot-${language}.png`);
  await fs.writeFile(output, image.toPNG());
  console.log(output);
  console.log(JSON.stringify({ defaultInterval, sliderInteraction: interaction }));
  window.destroy();
  app.exit(0);
});
