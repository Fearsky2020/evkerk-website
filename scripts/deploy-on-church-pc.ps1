param(
  [string]$QQTaskName = "Sinan_QQ_Gateway",
  [string]$MediaTaskName = "Sinan_Church_Media",
  [string]$DatabaseName = "evkerk-website-db",
  [string]$MediaBucket = "evkerk-website-media"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-SinanRootFromTask([string]$TaskName) {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  $action = @($task.Actions)[0]
  if (-not $action) { throw "Scheduled task '$TaskName' has no action" }

  if ($action.WorkingDirectory -and (Test-Path $action.WorkingDirectory)) {
    return (Resolve-Path $action.WorkingDirectory).Path
  }

  $candidates = @()
  if ($action.Execute) { $candidates += $action.Execute }
  if ($action.Arguments) {
    $quoted = [regex]::Matches($action.Arguments, '"([A-Za-z]:\\[^\"]+)"')
    foreach ($m in $quoted) { $candidates += $m.Groups[1].Value }
    $plain = [regex]::Matches($action.Arguments, '([A-Za-z]:\\[^\s]+)')
    foreach ($m in $plain) { $candidates += $m.Groups[1].Value }
  }

  foreach ($candidate in $candidates) {
    if (-not $candidate) { continue }
    $path = $candidate.Trim('"')
    if (Test-Path $path -PathType Leaf) { $path = Split-Path $path -Parent }
    if (-not (Test-Path $path)) { continue }

    $cursor = (Resolve-Path $path).Path
    for ($i = 0; $i -lt 6; $i++) {
      if (Test-Path (Join-Path $cursor "pyproject.toml")) { return $cursor }
      if (Test-Path (Join-Path $cursor ".git")) { return $cursor }
      $parent = Split-Path $cursor -Parent
      if (-not $parent -or $parent -eq $cursor) { break }
      $cursor = $parent
    }
  }

  throw "Could not infer SINAN project root from scheduled task '$TaskName'."
}

if (-not (Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue)) {
  throw "Windows ScheduledTasks module is required."
}
if (-not (Test-Path ".\scripts\bootstrap-cloudflare.ps1")) {
  throw "Run this script from the evkerk-website repository root."
}

Write-Host "Detecting existing SINAN QQ gateway..." -ForegroundColor Yellow
$sinanRoot = Resolve-SinanRootFromTask $QQTaskName
Write-Host "SINAN root: $sinanRoot" -ForegroundColor Green

Write-Host "Bootstrapping Cloudflare + Church Ops..." -ForegroundColor Yellow
& ".\scripts\bootstrap-cloudflare.ps1" `
  -DatabaseName $DatabaseName `
  -MediaBucket $MediaBucket `
  -SinanProjectRoot $sinanRoot

$wranglerText = Get-Content ".\wrangler.toml" -Raw
if ($wranglerText -notmatch '(?ms)\[\[d1_databases\]\].*?binding\s*=\s*"DB"') {
  throw "D1 DB binding is missing after bootstrap."
}
if ($wranglerText -notmatch '(?ms)\[\[r2_buckets\]\].*?binding\s*=\s*"MEDIA"') {
  throw "R2 MEDIA binding is required for Church Media Ingest but was not created. Enable R2 and run this script again."
}

$endpointPath = Join-Path $sinanRoot ".sinan\church-ops.endpoint"
if (-not (Test-Path $endpointPath)) {
  throw "Church Ops endpoint file was not created: $endpointPath"
}
$endpoint = (Get-Content $endpointPath -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($endpoint)) {
  throw "Church Ops endpoint is empty: $endpointPath"
}

$mediaInstaller = Join-Path $sinanRoot "scripts\install_church_media_autostart.ps1"
if (-not (Test-Path $mediaInstaller)) {
  throw "SINAN church media installer not found: $mediaInstaller. Update the SINAN repository first."
}

Write-Host "Installing / refreshing church media worker '$MediaTaskName'..." -ForegroundColor Yellow
& $mediaInstaller `
  -ProjectRoot $sinanRoot `
  -DataRoot $sinanRoot `
  -ApiUrl $endpoint `
  -TaskName $MediaTaskName

$mediaTask = Get-ScheduledTask -TaskName $MediaTaskName -ErrorAction Stop
if ($mediaTask.State -eq 'Disabled') {
  throw "Church media worker task is disabled after installation."
}
Write-Host "Church media worker: $($mediaTask.State)" -ForegroundColor Green

Write-Host "Restarting ONLY scheduled task '$QQTaskName'..." -ForegroundColor Yellow
try { Stop-ScheduledTask -TaskName $QQTaskName -ErrorAction SilentlyContinue } catch {}
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName $QQTaskName
Start-Sleep -Seconds 3

$taskInfo = Get-ScheduledTaskInfo -TaskName $QQTaskName
Write-Host "QQ gateway task restarted." -ForegroundColor Green
Write-Host "LastTaskResult: $($taskInfo.LastTaskResult)"
Write-Host "Church media worker is installed and polling: $endpoint"
Write-Host "Next step: upload a short real sermon recording at /admin/media.html and verify it reaches ready_for_review."
