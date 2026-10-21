# SPEC 63 HV-1: start every background harvester detached and hidden. Re-running is safe: sources whose PID is still alive are left alone,
# stopped ones resume from their index.jsonl; DONE ones are skipped. Env: HARVEST_NODE (node.exe), HARVEST_UV (uv.exe). Usage: powershell -File harvest\launch.ps1 [-Only name,name]
param([string[]]$Only = @())
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$node = if ($env:HARVEST_NODE) { $env:HARVEST_NODE } else { (Get-Command node).Source }
$uv = if ($env:HARVEST_UV) { $env:HARVEST_UV } else { (Get-Command uv -ErrorAction SilentlyContinue).Source }
$tsx = Join-Path $root 'node_modules\tsx\dist\cli.mjs'
$out = Join-Path $root 'data\raw\harvest'
New-Item -ItemType Directory -Force $out | Out-Null
& $node $tsx 'harvest/decisions.ts' | Out-Null
$jobs = [ordered]@{
  'faust-lukash'             = @('node', 'harvest/faust.ts')
  'hrushevsky'               = @('node', 'harvest/hrushevsky.ts')
  'archive-hrushevsky'       = @('node', 'harvest/archive.ts archive-hrushevsky')
  'wikisource-uk'            = @('node', 'harvest/wiki.ts wikisource-uk')
  'archive-ukr'              = @('node', 'harvest/archive.ts archive-ukr')
  'archive-rusyn'            = @('node', 'harvest/archive.ts archive-rusyn')
  'archive-kuban'            = @('node', 'harvest/archive.ts archive-kuban')
  'archive-novhorod-siversk' = @('node', 'harvest/archive.ts archive-novhorod-siversk')
  'wikipedia-uk'             = @('node', 'harvest/wiki.ts wikipedia-uk')
  'wikipedia-rue'            = @('node', 'harvest/wiki.ts wikipedia-rue')
  'wiktionary-uk'            = @('node', 'harvest/wiki.ts wiktionary-uk')
  'gramoty'                  = @('node', 'harvest/gramoty.ts')
  'poets'                    = @('node', 'harvest/poets.ts')
  'r2u'                      = @('node', 'harvest/r2u.ts')
  'hv4'                      = @('node', 'harvest/hv4.ts')
  'hv5'                      = @('node', 'harvest/hv5.ts')
  'archive-hv5-gaps'         = @('node', 'harvest/archive.ts archive-hv5-gaps')
  'archive-ayuzr'            = @('node', 'harvest/archive.ts archive-ayuzr')
  'archive-hv5-authors'      = @('node', 'harvest/archive.ts archive-hv5-authors')
  'hplt'                     = @('uv', 'run --with pyarrow python -I harvest/hplt.py 1 299')
}
$pidFile = Join-Path $out 'pids.json'
$pids = @{}
if (Test-Path $pidFile) { (Get-Content $pidFile -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $pids[$_.Name] = $_.Value } }
foreach ($name in $jobs.Keys) {
  if ($Only.Count -and $Only -notcontains $name) { continue }
  if ($pids[$name] -and (Get-Process -Id $pids[$name] -ErrorAction SilentlyContinue)) { Write-Host "$name already running (PID $($pids[$name]))"; continue }
  $dir = Join-Path $out $name
  New-Item -ItemType Directory -Force $dir | Out-Null
  $stopped = Join-Path $dir 'STOPPED.json'
  if (Test-Path $stopped) { if ((Get-Content $stopped -Raw) -match '"DONE"') { Write-Host "$name is DONE"; continue }; Remove-Item $stopped }
  $kind, $args1 = $jobs[$name]
  $exe = if ($kind -eq 'uv') { $uv } else { $node }
  $argl = if ($kind -eq 'uv') { $args1 } else { "`"$tsx`" $args1" }
  $log = Join-Path $dir 'log.txt'
  # stdout -> log.txt, stderr -> log.err.txt (Start-Process cannot merge both into one file)
  $p = Start-Process -FilePath $exe -ArgumentList $argl -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput $log -RedirectStandardError (Join-Path $dir 'log.err.txt')
  $pids[$name] = $p.Id
  Write-Host "$name started, PID $($p.Id), log $log"
  Start-Sleep -Seconds 2
}
$pids | ConvertTo-Json | Set-Content -Encoding utf8 $pidFile
