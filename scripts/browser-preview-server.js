const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');

const rendererRoot = path.join(__dirname, '..', 'renderer');
const previewBridge = `<script>
window.codexUsage = {
  get: async () => ({
    observedAt: new Date().toISOString(), checkedAt: new Date().toISOString(), planType: 'plus', sourcePath: null,
    credits: { hasCredits: true, unlimited: false, balance: 128.5 },
    fiveHour: { usedPercent: 46, remainingPercent: 54, resetsAt: new Date(Date.now() + 8280000).toISOString() },
    weekly: { usedPercent: 72, remainingPercent: 28, resetsAt: new Date(Date.now() + 284400000).toISOString() },
  }), refresh: async () => window.codexUsage.get(), getRefreshInterval: async () => 5000,
  setRefreshInterval: async (value) => value, setLanguage: async (value) => value,
  isPinned: async () => true, togglePin: async () => true,
  getMinimumMode: async () => false, setMinimumMode: async (value) => value,
  minimize: () => {}, close: () => {}, revealSource: () => {}, onChanged: () => () => {},
};
</script>`;

http.createServer(async (request, response) => {
  const requestPath = request.url === '/' ? 'index.html' : request.url.slice(1);
  const safePath = path.normalize(requestPath).replace(/^([.][.][\\/])+/, '');
  const filePath = path.join(rendererRoot, safePath);
  if (!filePath.startsWith(rendererRoot)) {
    response.writeHead(403).end();
    return;
  }
  try {
    let content = await fs.readFile(filePath);
    const extension = path.extname(filePath);
    if (extension === '.html') {
      content = Buffer.from(content.toString('utf8')
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
        .replace('<script src="renderer.js"></script>', `${previewBridge}<script src="renderer.js"></script>`));
    }
    const type = extension === '.css' ? 'text/css' : extension === '.js' ? 'text/javascript' : 'text/html';
    response.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4173, '127.0.0.1', () => console.log('Quota Glance preview: http://127.0.0.1:4173'));
