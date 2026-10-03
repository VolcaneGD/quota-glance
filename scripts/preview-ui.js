// Development-only browser preview. All displayed data is synthetic.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'renderer');
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/preview.css') { const height = Math.min(1200, Math.max(652, Number(url.searchParams.get('height')) || 652)); res.setHeader('Content-Type', 'text/css'); return res.end(`html,body,#recovery-glow{width:372px;height:${height}px}.minimum-mode,.minimum-mode body,.minimum-mode #recovery-glow{width:310px;height:310px} .preview-controls{position:fixed;left:390px;top:24px;display:flex;flex-direction:column;gap:12px}.preview-controls button{padding:12px 16px;border:1px solid #35634d;border-radius:10px;background:#14271e;color:#80f4b8;cursor:pointer}`); }
  if (url.pathname === '/mock.js') {
    res.setHeader('Content-Type', 'text/javascript');
    return res.end(`const snapshot = {credits:{balance:434.53,hasCredits:true},weekly:{remainingPercent:18,resetsAt:new Date(Date.now()+5*86400000).toISOString()},fiveHour:{remainingPercent:42,resetsAt:new Date(Date.now()+7200000).toISOString()},planType:'plus',checkedAt:new Date().toISOString()};
const mode = new URLSearchParams(location.search).get('state');
if(mode==='exhausted') {snapshot.fiveHour.remainingPercent=0;snapshot.weekly.remainingPercent=38;}
const event={eventId:'demo',canonicalId:'demo',sourceUrl:'https://x.com/i/status/123',source:{type:'x',tier:2,author:'thsottiaux',url:'https://x.com/i/status/123'},publishedAt:new Date().toISOString(),status:mode==='completed'?'completed':'scheduled',certainty:mode==='secondary'?'secondary':'confirmed',scope:'paid_users',effectiveAt:new Date(Date.now()+3600000).toISOString(),effectiveAtPrecision:'exact',type:'scheduled_usage_reset'};
let feed={event:['empty','exhausted'].includes(mode)?null:event};let preferences={opacity:1,notifications:{enabled:true,confirmedOnly:true,announceDetection:true,beforeMinutes:[30,10],completed:true,secondarySources:false}};
let changed=()=>{}; let scheduledNotification=()=>{};
document.addEventListener('DOMContentLoaded',()=>{
  const controls=document.createElement('div'); controls.className='preview-controls';
  for(const [label,kind] of [['5時間解除','fiveHour'],['週間解除','weekly'],['クレジット増加','credits'],['リセット予定通知','scheduled']]) {
    const button=document.createElement('button');button.textContent=label;
    button.addEventListener('click',()=>{
      if(kind==='scheduled') {scheduledNotification();return;}
      if(kind==='credits') snapshot.credits.balance+=10;
      else {snapshot[kind].remainingPercent=25;changed(structuredClone(snapshot));snapshot[kind].remainingPercent=100;}
      changed(structuredClone(snapshot));
    });controls.append(button);
  } document.body.append(controls);
  window.codexUsage.onResetNotification=fn=>{scheduledNotification=fn};
});
window.codexUsage={get:async()=>structuredClone(snapshot),refresh:async()=>structuredClone(snapshot),getRefreshInterval:async()=>5000,setRefreshInterval:async v=>v,getPreferences:async()=>preferences,getSystemMetrics:async()=>({drive:61,gpu:27,cpu:13,mem:65,temp:59}),getResetFeed:async()=>feed,refreshResetFeed:async()=>feed,onResetFeedChanged:()=>{},onChanged:fn=>{changed=fn},setLanguage:async v=>v,setOpacity:async v=>v,getMinimumMode:async()=>false,setMinimumMode:async v=>v,isPinned:async()=>true,togglePin:async()=>false,getXApiStatus:async()=>({configured:false,protected:true}),setXApiToken:async()=>({configured:true,protected:true}),clearXApiToken:async()=>{},setNotifications:async v=>(preferences.notifications=v),testNotification:async()=>true,minimize:()=>{},close:()=>{},openExternal:()=>{},revealSource:()=>{}};`);
  }
  const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (!['index.html', 'styles.css', 'renderer.js', 'recovery-effect.js'].includes(name)) { res.writeHead(404); return res.end(); }
  let content = fs.readFileSync(path.join(root, name), 'utf8');
  if (name === 'index.html') content = content.replace('</head>', `<link rel="stylesheet" href="preview.css?height=${Number(url.searchParams.get('height')) || 652}"></head>`).replace('<script src="renderer.js">', '<script src="mock.js"></script><script src="renderer.js">');
  res.setHeader('Content-Type', name.endsWith('html') ? 'text/html; charset=utf-8' : name.endsWith('css') ? 'text/css' : 'text/javascript');
  res.end(content);
}).listen(4177, '127.0.0.1', () => console.log('Synthetic Quota Glance preview: http://localhost:4177'));
