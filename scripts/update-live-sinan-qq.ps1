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

  if ($action.Arguments) {
    $projectMatch = [regex]::Match($action.Arguments, '(?i)-ProjectRoot\s+"([A-Za-z]:\\[^\"]+)"')
    if ($projectMatch.Success -and (Test-Path $projectMatch.Groups[1].Value)) {
      $candidate = (Resolve-Path $projectMatch.Groups[1].Value).Path
      if (Test-Path (Join-Path $candidate ".git")) { return $candidate }
    }
  }

  if ($action.WorkingDirectory -and (Test-Path $action.WorkingDirectory)) {
    $candidate = (Resolve-Path $action.WorkingDirectory).Path
    if (Test-Path (Join-Path $candidate ".git")) {
      $common = (& git -C $candidate rev-parse --git-common-dir 2>$null)
      if ($LASTEXITCODE -eq 0 -and $common) {
        $commonPath = $common.Trim()
        if (-not [IO.Path]::IsPathRooted($commonPath)) {
          $commonPath = Join-Path $candidate $commonPath
        }
        $commonPath = [IO.Path]::GetFullPath($commonPath)
        if ((Split-Path $commonPath -Leaf) -eq ".git") {
          $mainRoot = Split-Path $commonPath -Parent
          if (Test-Path (Join-Path $mainRoot ".git")) { return $mainRoot }
        }
      }
      return $candidate
    }
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

function Get-GatewayProcesses {
  return @(Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and $_.CommandLine -match '(?i)sinan_qq_gateway\.py'
  })
}

function Stop-OfficialGateway([string]$Name) {
  Stop-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  foreach ($proc in (Get-GatewayProcesses)) {
    Write-Host "Stopping Sinan QQ gateway PID=$($proc.ProcessId)"
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

function Wait-RuntimeGateway([string]$RuntimeRoot, [int]$TimeoutSeconds = 45) {
  $needle = (Join-Path $RuntimeRoot "scripts\sinan_qq_gateway.py").ToLowerInvariant()
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $matches = @(Get-CimInstance Win32_Process | Where-Object {
      if (-not $_.CommandLine) { return $false }
      $line = $_.CommandLine.ToLowerInvariant().Replace('/', '\')
      return $line.Contains($needle)
    })
    if ($matches.Count -eq 1) { return $true }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)
  return $false
}

function Set-ChurchOpsAutostartConfig([string]$ProjectRoot) {
  $endpointFile = Join-Path $ProjectRoot ".sinan\church-ops.endpoint"
  $tokenFile = Join-Path $ProjectRoot ".sinan\church-ops.token"
  $configDir = Join-Path $ProjectRoot "data\qq-autostart"
  $configPath = Join-Path $configDir "config.json"
  $churchSecretPath = Join-Path $configDir "church_ops_token.dpapi"

  if (-not (Test-Path $configPath)) { throw "QQ_AUTOSTART_CONFIG_NOT_FOUND:$configPath" }
  if (-not (Test-Path $endpointFile)) { throw "CHURCH_OPS_ENDPOINT_FILE_NOT_FOUND:$endpointFile" }
  if (-not (Test-Path $tokenFile)) { throw "CHURCH_OPS_TOKEN_FILE_NOT_FOUND:$tokenFile" }

  $endpoint = (Get-Content $endpointFile -Raw).Trim().TrimEnd('/')
  $token = (Get-Content $tokenFile -Raw).Trim()
  if ([string]::IsNullOrWhiteSpace($endpoint) -or [string]::IsNullOrWhiteSpace($token)) {
    throw "CHURCH_OPS_LOCAL_CONFIG_EMPTY"
  }

  $config = Get-Content $configPath -Raw | ConvertFrom-Json
  $config | Add-Member -NotePropertyName church_ops_endpoint -NotePropertyValue $endpoint -Force
  $config | ConvertTo-Json -Depth 8 | Set-Content $configPath -Encoding UTF8

  $secureToken = ConvertTo-SecureString $token -AsPlainText -Force
  $secureToken | ConvertFrom-SecureString | Set-Content $churchSecretPath -Encoding ASCII

  Write-Host "Church Ops endpoint stored in QQ autostart config." -ForegroundColor Green
  Write-Host "Church Ops token stored with current-user DPAPI." -ForegroundColor Green
}

function Deploy-CleanRuntime([string]$ProjectRoot, [string]$Name) {
  $pythonExe = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
  if (-not (Test-Path $pythonExe)) { throw "SINAN_VENV_PYTHON_NOT_FOUND:$pythonExe" }

  $runtimeRoot = Join-Path (Split-Path $ProjectRoot -Parent) "Sinan-qq-runtime"
  $task = Get-ScheduledTask -TaskName $Name -ErrorAction Stop
  $oldAction = @($task.Actions)[0]
  $oldExecute = [string]$oldAction.Execute
  $oldArguments = [string]$oldAction.Arguments
  $oldWorkingDirectory = [string]$oldAction.WorkingDirectory

  $configPath = Join-Path $ProjectRoot "data\qq-autostart\config.json"
  $churchSecretPath = Join-Path $ProjectRoot "data\qq-autostart\church_ops_token.dpapi"
  $backupDir = Join-Path $env:TEMP ("sinan-qq-runtime-backup-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  $configBackup = Join-Path $backupDir "config.json"
  $secretBackup = Join-Path $backupDir "church_ops_token.dpapi"
  if (Test-Path $configPath) { Copy-Item $configPath $configBackup -Force }
  $hadChurchSecret = Test-Path $churchSecretPath
  if ($hadChurchSecret) { Copy-Item $churchSecretPath $secretBackup -Force }

  $taskChanged = $false
  try {
    Write-Host "Workspace is dirty; using isolated clean runtime." -ForegroundColor Yellow
    Write-Host "Runtime root: $runtimeRoot"

    Stop-OfficialGateway $Name

    & git -C $ProjectRoot worktree prune
    if ($LASTEXITCODE -ne 0) { throw "git worktree prune failed." }

    if (Test-Path $runtimeRoot) {
      $inside = (& git -C $runtimeRoot rev-parse --is-inside-work-tree 2>$null).Trim()
      if ($LASTEXITCODE -ne 0 -or $inside -ne "true") {
        throw "RUNTIME_PATH_EXISTS_BUT_IS_NOT_GIT_WORKTREE:$runtimeRoot"
      }
      & git -C $runtimeRoot checkout --detach origin/main
      if ($LASTEXITCODE -ne 0) { throw "runtime checkout failed." }
      & git -C $runtimeRoot reset --hard origin/main
      if ($LASTEXITCODE -ne 0) { throw "runtime reset failed." }
      & git -C $runtimeRoot clean -fd
      if ($LASTEXITCODE -ne 0) { throw "runtime clean failed." }
    } else {
      & git -C $ProjectRoot worktree add --detach $runtimeRoot origin/main
      if ($LASTEXITCODE -ne 0) { throw "runtime worktree creation failed." }
    }

    $runtimeLauncher = Join-Path $runtimeRoot "scripts\start_sinan_qq_runtime.ps1"
    if (-not (Test-Path $runtimeLauncher)) { throw "RUNTIME_LAUNCHER_MISSING:$runtimeLauncher" }

    Write-Host "Running church-aware QQ candidate tests..." -ForegroundColor Yellow
    Push-Location $runtimeRoot
    try {
      & $pythonExe -m pytest `
        tests/test_qq_church_web.py `
        tests/test_sinan_qq_gateway_script.py `
        tests/test_phase2b_qq_autostart.py `
        -q
      if ($LASTEXITCODE -ne 0) { throw "RUNTIME_CANDIDATE_TESTS_FAILED:$LASTEXITCODE" }
    } finally {
      Pop-Location
    }

    & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -Command `
      "[void][ScriptBlock]::Create((Get-Content -LiteralPath '$runtimeLauncher' -Raw)); exit 0"
    if ($LASTEXITCODE -ne 0) { throw "RUNTIME_LAUNCHER_PARSE_FAILED" }

    Set-ChurchOpsAutostartConfig $ProjectRoot

    $PowerShellExe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $actionArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runtimeLauncher`" -ProjectRoot `"$ProjectRoot`" -CodeRoot `"$runtimeRoot`" -StartupDelaySeconds 0"
    $newAction = New-ScheduledTaskAction -Execute $PowerShellExe -Argument $actionArgs -WorkingDirectory $runtimeRoot
    Set-ScheduledTask -TaskName $Name -Action $newAction | Out-Null
    $taskChanged = $true

    Start-ScheduledTask -TaskName $Name
    if (-not (Wait-RuntimeGateway -RuntimeRoot $runtimeRoot -TimeoutSeconds 45)) {
      $info = Get-ScheduledTaskInfo -TaskName $Name
      throw "RUNTIME_GATEWAY_HEALTHCHECK_FAILED:LastTaskResult=$($info.LastTaskResult)"
    }

    $statusScript = Join-Path $runtimeRoot "scripts\status_sinan_qq_autostart.ps1"
    if (Test-Path $statusScript) {
      & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" `
        -NoProfile -ExecutionPolicy Bypass -File $statusScript -ProjectRoot $ProjectRoot
    }

    Write-Host "STATUS=PASS" -ForegroundColor Green
    Write-Host "UPDATE=RUNTIME_ISOLATED"
    Write-Host "PROJECT_ROOT=$ProjectRoot"
    Write-Host "RUNTIME_ROOT=$runtimeRoot"
    Write-Host "PROJECT_WORKTREE_TOUCHED=NO"
    Write-Host "GATEWAY_PROCESS_COUNT=$((Get-GatewayProcesses).Count)"
    return
  } catch {
    $deployError = $_
    Write-Host "Runtime deployment failed; restoring previous gateway action..." -ForegroundColor Red
    Stop-OfficialGateway $Name

    if ($taskChanged) {
      $restoreAction = New-ScheduledTaskAction -Execute $oldExecute -Argument $oldArguments -WorkingDirectory $oldWorkingDirectory
      Set-ScheduledTask -TaskName $Name -Action $restoreAction | Out-Null
    }

    if (Test-Path $configBackup) { Copy-Item $configBackup $configPath -Force }
    if ($hadChurchSecret -and (Test-Path $secretBackup)) {
      Copy-Item $secretBackup $churchSecretPath -Force
    } elseif (-not $hadChurchSecret) {
      Remove-Item $churchSecretPath -Force -ErrorAction SilentlyContinue
    }

    Start-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
    throw "RUNTIME_DEPLOYMENT_ROLLED_BACK:$deployError"
  } finally {
    Remove-Item $backupDir -Recurse -Force -ErrorAction SilentlyContinue
  }
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
Write-Host "SINAN project root: $root" -ForegroundColor Green

$remote = (& git -C $root remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0) { throw "SINAN origin remote is unavailable." }
if ($remote -notmatch 'Fearsky2020[\\/]sinan(?:\.git)?$') {
  throw "Unexpected SINAN origin: $remote"
}
Write-Host "Origin OK: $remote" -ForegroundColor Green

Write-Host "[2/5] Fetching origin/main..." -ForegroundColor Yellow
& git -C $root fetch --prune origin main
if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }
$remoteHead = (& git -C $root rev-parse origin/main).Trim()
$localHead = (& git -C $root rev-parse HEAD).Trim()
Write-Host "Current: $localHead"
Write-Host "Remote : $remoteHead"

$dirty = @(& git -C $root status --porcelain)
if ($LASTEXITCODE -ne 0) { throw "Could not read SINAN git status." }
if ($dirty.Count -gt 0) {
  Write-Host "[3/5] Local development work detected; it will NOT be stashed, reset or overwritten." -ForegroundColor Yellow
  Write-Host "Dirty entries: $($dirty.Count)"
  Deploy-CleanRuntime -ProjectRoot $root -Name $TaskName
  Write-Host ""
  Write-Host "LIVE SINAN QQ UPDATE PASSED." -ForegroundColor Green
  Write-Host "The dirty development workspace was preserved; QQ now runs from a clean runtime worktree."
  Write-Host "Now test the church announcement flow in private QQ."
  exit 0
}

Write-Host "[3/5] Worktree is clean; using normal safe updater." -ForegroundColor Green
Write-Host "[4/5] Loading updater from origin/main..." -ForegroundColor Yellow
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
Write-Host "Now test the church announcement flow in private QQ."
