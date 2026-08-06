const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

function metricTone(kind, value) {
  if (!Number.isFinite(value)) return 'unknown';
  const warning = kind === 'temp' ? 60 : 50;
  const critical = kind === 'temp' ? 80 : 80;
  return value >= critical ? 'critical' : value >= warning ? 'warning' : 'good';
}
function parseNvidiaSmi(output) {
  const [gpu, temp] = String(output).trim().split(',').map((part) => Number(part.trim()));
  return { gpu: Number.isFinite(gpu) ? gpu : null, temp: Number.isFinite(temp) ? temp : null };
}
async function collectSystemMetrics() {
  let cpu = null; let mem = null; let gpu = null; let temp = null;
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', "$c=(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples[0].CookedValue;$m=Get-CimInstance Win32_OperatingSystem;[math]::Round($c),[math]::Round((1-($m.FreePhysicalMemory/$m.TotalVisibleMemorySize))*100)"], { windowsHide: true, timeout: 3000 });
    const values = stdout.trim().split(/[\r\n,]+/).map(Number); cpu = Number.isFinite(values[0]) ? values[0] : null; mem = Number.isFinite(values[1]) ? values[1] : null;
  } catch {}
  try { ({ gpu, temp } = parseNvidiaSmi((await execFileAsync('nvidia-smi', ['--query-gpu=utilization.gpu,temperature.gpu', '--format=csv,noheader,nounits'], { windowsHide: true, timeout: 3000 })).stdout)); } catch {}
  return { gpu, cpu, mem, temp };
}
module.exports = { collectSystemMetrics, metricTone, parseNvidiaSmi };
