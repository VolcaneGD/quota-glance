const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

function metricTone(kind, value) {
  if (!Number.isFinite(value)) return 'unknown';
  if (kind === 'free') return value <= 30 ? 'critical' : value <= 50 ? 'warning' : 'good';
  const warning = kind === 'temp' ? 60 : 50;
  const critical = kind === 'temp' ? 80 : 80;
  return value >= critical ? 'critical' : value >= warning ? 'warning' : 'good';
}
function parseNvidiaSmi(output) {
  const [gpu, temp] = String(output).trim().split(',').map((part) => Number(part.trim()));
  return { gpu: Number.isFinite(gpu) ? gpu : null, temp: Number.isFinite(temp) ? temp : null };
}

function parseWindowsMetrics(output) {
  const fields = Object.fromEntries(String(output).split(/\r?\n/)
    .map((line) => line.split('='))
    .filter(([key]) => key === 'drive' || key === 'cpu' || key === 'mem'));
  const readNumber = (value) => value?.trim() === '' || value == null ? null : Number(value.trim());
  const drive = readNumber(fields.drive);
  const cpu = readNumber(fields.cpu);
  const mem = readNumber(fields.mem);
  return {
    drive: Number.isFinite(drive) ? drive : null,
    cpu: Number.isFinite(cpu) ? cpu : null,
    mem: Number.isFinite(mem) ? mem : null,
  };
}

async function collectSystemMetrics() {
  let drive = null; let cpu = null; let mem = null; let gpu = null; let temp = null;
  try {
    const command = [
      '$drive=$null;$cpu=$null;$mem=$null',
      "try{$disk=Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='C:'\" -ErrorAction Stop;if($disk.Size -gt 0){$drive=[math]::Round(($disk.FreeSpace/$disk.Size)*100)}}catch{}",
      "try{$cpu=(Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter \"Name='_Total'\" -ErrorAction Stop).PercentProcessorTime}catch{}",
      'try{$os=Get-CimInstance Win32_OperatingSystem -ErrorAction Stop;$mem=[math]::Round((1-($os.FreePhysicalMemory/$os.TotalVisibleMemorySize))*100)}catch{}',
      'Write-Output "drive=$drive";Write-Output "cpu=$cpu";Write-Output "mem=$mem"',
    ].join(';');
    ({ drive, cpu, mem } = parseWindowsMetrics((await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command], { windowsHide: true, timeout: 3000 })).stdout));
  } catch {}
  try { ({ gpu, temp } = parseNvidiaSmi((await execFileAsync('nvidia-smi', ['--query-gpu=utilization.gpu,temperature.gpu', '--format=csv,noheader,nounits'], { windowsHide: true, timeout: 3000 })).stdout)); } catch {}
  return { drive, gpu, cpu, mem, temp };
}
module.exports = { collectSystemMetrics, metricTone, parseNvidiaSmi, parseWindowsMetrics };
