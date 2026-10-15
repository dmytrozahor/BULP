# SPEC 63 HV-1: items and bytes per harvester, PID alive?, why stopped. Usage: powershell -File harvest\status.ps1
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'data\raw\harvest'
$pids = @{}
$pf = Join-Path $out 'pids.json'
if (Test-Path $pf) { (Get-Content $pf -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $pids[$_.Name] = $_.Value } }
$rows = foreach ($d in Get-ChildItem $out -Directory -ErrorAction SilentlyContinue) {
  $idx = Join-Path $d.FullName 'index.jsonl'
  $n = 0; $b = 0
  if (Test-Path $idx) { foreach ($l in [IO.File]::ReadLines($idx)) { if ($l) { $n++; if ($l -match '"bytes":(\d+)') { $b += [int64]$Matches[1] } } } }
  $items = Join-Path $d.FullName 'items'
  $disk = if (Test-Path $items) { (Get-ChildItem $items -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum } else { 0 }
  $alive = if ($pids[$d.Name]) { [bool](Get-Process -Id $pids[$d.Name] -ErrorAction SilentlyContinue) } else { $false }
  $stop = ''
  $sf = Join-Path $d.FullName 'STOPPED.json'
  if (Test-Path $sf) { try { $stop = (Get-Content $sf -Raw | ConvertFrom-Json).reason } catch {} }
  [pscustomobject]@{ source = $d.Name; items = $n; payloadMB = [math]::Round($b / 1MB, 1); diskMB = [math]::Round($disk / 1MB, 1); pid = $pids[$d.Name]; alive = $alive; stopped = $stop }
}
$rows | Format-Table -AutoSize
$r2u = Join-Path $root 'data\raw\r2u\index.jsonl'
if (Test-Path $r2u) { Write-Host ("r2u dump total lookups: " + (@([IO.File]::ReadLines($r2u)).Count)) }
