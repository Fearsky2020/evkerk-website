param(
  [string]$TaskName = "Sinan_QQ_Gateway"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Resolve-SinanRootFromTask([string]$Name) {
  $task = Get-ScheduledTask -TaskName $Name -ErrorAction Stop
  $action = @($task.Actions)[0]
  if (-not $action) { throw "Scheduled task '$Name' has no action." }

  if ($action.WorkingDirectory -and (Test-Path $action.WorkingDirectory)) {
    $candidate = (Resolve-Path $action.WorkingDirectory).Path
    if (Test-Path (Join-Path $candidate ".git")) { return $candidate }
  }

  $values = @($action.Execute, $action.Arguments) | Where-Object { $_ }
  foreach ($value in $values) {
    $matches = [regex]::Matches($value, '([A-Za-z]:\\[^\"\r\n]+?)\b(?:scripts\\sinan_qq_gateway\.py|\.venv\\Scripts\\python\.exe)')
    foreach ($m in $matches) {
      $path = $m.Groups[1].Value.Trim().Trim('"')
      if (Test-Path $path) {
        $cursor = (Resolve-Path $path).Path
        if (Test-Path $cursor -PathType Leaf) { $cursor = Split-Path $cursor -Parent }
        for ($i = 0; $i -lt 6; $i++) {
          if (Test-Path (Join-Path $cursor ".git")) { return $cursor }
          $parent = Split-Path $cursor -Parent
          if (-not $parent -or $parent -eq $cursor) { break }
          $cursor = $parent
        }
      }
    }
  }

  throw "Could not infer the SINAN git root from scheduled task '$Name'."
}

if (-not (Test-IsAdministrator)) {
  Write-Host "Administrator rights are required for the safe gateway updater." -ForegroundColor Yellow
  Write-Host "Opening an elevated PowerShell window; approve the Windows UAC prompt." -ForegroundColor Yellow
  $args = "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -TaskName `"$TaskName`""
  Start-Process "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Verb RunAs -ArgumentList $args
  exit 0
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git is required." }
if (-not (Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue)) { throw "ScheduledTasks module is required." }

Write-Host "[1/5] Resolving the live SINAN installation..." -ForegroundColor Yellow
$root = Resolve-SinanRootFromTask $TaskName
Write-Host "SINAN root: $root" -ForegroundColor Green

Write-Host "[2/5] Refusing to overwrite local work..." -ForegroundColor Yellow
$dirty = & git -C $root status --porcelain
if ($LASTEXITCODE -ne 0) { throw "Could not read SINAN git status." }
if ($dirty) {
  Write-Host $dirty
  throw "SINAN_WORKTREE_DIRTY_REFUSING_UPDATE. Commit/stash these changes first; nothing was changed."
}

$remote = (& git -C $root remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0) { throw "SINAN origin remote is unavailable." }
if ($remote -notmatch 'Fearsky2020[\\/]sinan(?:\.git)?$') {
  throw "Unexpected SINAN origin: $remote"
}
Write-Host "Origin OK: $remote" -ForegroundColor Green

Write-Host "[3/5] Fetching the latest tested candidate..." -ForegroundColor Yellow
& git -C $root fetch --prune origin main
if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }
$remoteHead = (& git -C $root rev-parse origin/main).Trim()
$localHead = (& git -C $root rev-parse HEAD).Trim()
Write-Host "Current: $localHead"
Write-Host "Remote : $remoteHead"

Write-Host "[4/5] Loading the updater from origin/main..." -ForegroundColor Yellow
$tempUpdater = Join-Path $env:TEMP ("sinan-qq-updater-" + [Guid]::NewGuid().ToString("N") + ".ps1")
try {
  $updaterText = & git -C $root show "origin/main:scripts/update_sinan_qq_autostart.ps1"
  if ($LASTEXITCODE -ne 0 -or -not $updaterText) { throw "Could not read updater from origin/main." }
  Set-Content -Path $tempUpdater -Value ($updaterText -join "`n") -Encoding utf8

  Write-Host "[5/5] Running candidate tests, safe update and gateway health check..." -ForegroundColor Yellow
  & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" `
    -NoProfile -ExecutionPolicy Bypass -File $tempUpdater `
    -ProjectRoot $root -Remote origin -Branch main -ForceRestart
  if ($LASTEXITCODE -ne 0) { throw "SINAN safe updater failed with exit code $LASTEXITCODE" }
} finally {
  Remove-Item $tempUpdater -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path (Join-Path $root "sinan\channels\qq_church_web.py"))) {
  throw "Update completed but qq_church_web.py is missing."
}
if (-not (Test-Path (Join-Path $root "sinan\channels\qq_church_service.py"))) {
  throw "Update completed but qq_church_service.py is missing."
}

Write-Host "" 
Write-Host "LIVE SINAN QQ UPDATE PASSED." -ForegroundColor Green
Write-Host "The existing $TaskName task is running the updated church-aware gateway."
Write-Host "Now test in private QQ: 帮我发个测试公告：教会网站自动更新测试成功。"