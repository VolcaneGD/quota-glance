const fs = require('node:fs/promises');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

app.setPath('userData', path.join(app.getPath('temp'), `quota-glance-capture-${process.pid}`));

app.whenReady().then(async () => {
  const captureTimeout = setTimeout(() => {
    console.error('Screenshot capture timed out');
    app.exit(1);
  }, 15_000);
  const language = process.argv.includes('--language=en') ? 'en' : 'ja';
  const minimumMode = process.argv.includes('--minimum');
  const criticalPreview = process.argv.includes('--critical');
  const window = new BrowserWindow({
    width: minimumMode ? 310 : 372,
    height: minimumMode ? 310 : 604,
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
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) console.error(`Renderer console (${sourceId}:${line}): ${message}`);
  });

  const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');
  await window.loadFile(rendererPath);
  await window.webContents.executeJavaScript(`
    localStorage.setItem('quota-glance-language', '${language}');
    localStorage.removeItem('quota-glance-refresh-seconds');
    localStorage.setItem('quota-glance-minimum-mode', '${minimumMode}');
  `);
  await window.loadFile(rendererPath);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const defaultInterval = await window.webContents.executeJavaScript(`document.querySelector('#refresh-interval-value').textContent`);
  if (!defaultInterval.startsWith('5')) throw new Error(`Unexpected default refresh interval: ${defaultInterval}`);
  const stateCheck = await window.webContents.executeJavaScript(`(() => ({
    minimum: document.documentElement.classList.contains('minimum-mode'),
    fiveHour: document.querySelector('#five-hour-progress-fill').className,
    weekly: document.querySelector('#weekly-progress-fill').className,
  }))()`);
  if (stateCheck.minimum !== minimumMode) throw new Error('Minimum mode did not match the saved preference');
  if (!stateCheck.fiveHour.includes('good')) throw new Error('Green remaining state did not render');
  if (!stateCheck.weekly.includes(criticalPreview ? 'critical' : 'warning')) throw new Error('Remaining threshold state did not render');
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
  const opacityInteraction = await window.webContents.executeJavaScript(`(() => {
    const slider = document.querySelector('#opacity');
    slider.value = '85';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      label: document.querySelector('#opacity-value').textContent,
      progress: slider.style.getPropertyValue('--range-progress'),
    };
  })()`);
  if (opacityInteraction.label !== '85%' || opacityInteraction.progress !== '75%') {
    throw new Error(`Opacity slider visual progress did not match: ${JSON.stringify(opacityInteraction)}`);
  }
  const minimumInteraction = await window.webContents.executeJavaScript(`(async () => {
    const button = document.querySelector('#minimum-mode-button');
    const wasMinimum = document.documentElement.classList.contains('minimum-mode');
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const toggled = document.documentElement.classList.contains('minimum-mode');
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { wasMinimum, toggled, restored: document.documentElement.classList.contains('minimum-mode') };
  })()`);
  if (minimumInteraction.toggled === minimumInteraction.wasMinimum || minimumInteraction.restored !== minimumInteraction.wasMinimum) {
    throw new Error('Minimum mode toggle did not change and restore the view');
  }
  await window.webContents.executeJavaScript(`
    localStorage.setItem('quota-glance-refresh-seconds', '5');
    document.querySelector('#refresh-interval').value = '5';
    document.querySelector('#refresh-interval').dispatchEvent(new Event('input', { bubbles: true }));
  `);
  await new Promise((resolve) => setTimeout(resolve, 180));
  const image = await window.webContents.capturePage();
  const suffix = minimumMode ? '-minimum' : '';
  const output = path.join(__dirname, '..', 'assets', `quota-glance-screenshot-${language}${suffix}.png`);
  await fs.writeFile(output, image.toPNG());
  console.log(output);
  console.log(JSON.stringify({ defaultInterval, stateCheck, sliderInteraction: interaction, opacityInteraction, minimumInteraction }));
  clearTimeout(captureTimeout);
  window.destroy();
  app.exit(0);
});
