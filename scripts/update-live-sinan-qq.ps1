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

function New-SafeTaskAction([string]$Execute, [string]$Arguments, [string]$WorkingDirectory) {
  if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
    return New-ScheduledTaskAction -Execute $Execute -Argument $Arguments
  }
  return New-ScheduledTaskAction -Execute $Execute -Argument $Arguments -WorkingDirectory $WorkingDirectory
}

function Resolve-SinanProjectRoot([string]$Name) {
  $task = Get-ScheduledTask -TaskName $Name -ErrorAction Stop
  $action = @($task.Actions)[0]
  if (-not $action) { throw "QQ_TASK_HAS_NO_ACTION:$Name" }

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

  throw "SINAN_PROJECT_ROOT_NOT_FOUND_FROM_TASK:$Name"
}

function Get-GatewayProcesses {
  return @(Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and $_.CommandLine -match '(?i)sinan_qq_gateway\.py'
  })
}

function Stop-Gateway([string]$Name) {
  Stop-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  foreach ($proc in (Get-GatewayProcesses)) {
    Write-Host "Stopping QQ gateway PID=$($proc.ProcessId)"
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

function Ensure-WindowsTimezoneData([string]$PythonExe) {
  Write-Host "Checking Europe/Amsterdam timezone data..." -ForegroundColor Yellow
  & $PythonExe -c "from zoneinfo import ZoneInfo; ZoneInfo('Europe/Amsterdam')"
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Timezone data OK." -ForegroundColor Green
    return
  }

  Write-Host "tzdata is missing from the existing SINAN venv; installing declared Windows runtime dependency..." -ForegroundColor Yellow
  $uv = Get-Command uv -ErrorAction SilentlyContinue
  if ($uv) {
    & $uv.Source pip install --python $PythonExe "tzdata>=2025.2"
    if ($LASTEXITCODE -ne 0) { throw "TZDATA_UV_INSTALL_FAILED:$LASTEXITCODE" }
  } else {
    & $PythonExe -m ensurepip --upgrade
    if ($LASTEXITCODE -ne 0) { throw "ENSUREPIP_FAILED:$LASTEXITCODE" }
    & $PythonExe -m pip install "tzdata>=2025.2"
    if ($LASTEXITCODE -ne 0) { throw "TZDATA_PIP_INSTALL_FAILED:$LASTEXITCODE" }
  }

  & $PythonExe -c "from zoneinfo import ZoneInfo; ZoneInfo('Europe/Amsterdam')"
  if ($LASTEXITCODE -ne 0) { throw "TZDATA_INSTALL_DID_NOT_FIX_ZONEINFO" }
  Write-Host "Timezone data repaired." -ForegroundColor Green
}

function Ensure-GitSafeDirectory([string]$Path) {
  $normalized = $Path.Replace('\', '/')
  $existing = @(& git config --global --get-all safe.directory 2>$null)
  if ($LASTEXITCODE -ne 0) { $existing = @() }
  if ($existing -contains $normalized) {
    Write-Host "Git safe.directory already configured for runtime." -ForegroundColor Green
    return
  }

  & git config --global --add safe.directory $normalized
  if ($LASTEXITCODE -ne 0) { throw "GIT_SAFE_DIRECTORY_CONFIG_FAILED:$LASTEXITCODE" }
  Write-Host "Git safe.directory configured for isolated runtime." -ForegroundColor Green
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
  Write-Host "Church Ops config stored for QQ autostart." -ForegroundColor Green
}

if (-not (Test-IsAdministrator)) {
  Write-Host "Administrator rights are required." -ForegroundColor Yellow
  Write-Host "Opening elevated PowerShell; approve the UAC prompt." -ForegroundColor Yellow
  $args = "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -TaskName `"$TaskName`""
  Start-Process "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Verb RunAs -ArgumentList $args
  exit 0
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "GIT_NOT_FOUND" }
if (-not (Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue)) { throw "SCHEDULED_TASKS_MODULE_NOT_FOUND" }

Write-Host "[1/6] Resolving SINAN project and runtime..." -ForegroundColor Yellow
$projectRoot = Resolve-SinanProjectRoot $TaskName
$pythonExe = Join-Path $projectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) { throw "SINAN_VENV_PYTHON_NOT_FOUND:$pythonExe" }
$runtimeRoot = Join-Path (Split-Path $projectRoot -Parent) "Sinan-qq-runtime"
Write-Host "PROJECT_ROOT=$projectRoot"
Write-Host "RUNTIME_ROOT=$runtimeRoot"

$remote = (& git -C $projectRoot remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0) { throw "SINAN_ORIGIN_UNAVAILABLE" }
if ($remote -notmatch 'Fearsky2020[\\/]sinan(?:\.git)?$') { throw "UNEXPECTED_SINAN_ORIGIN:$remote" }

Write-Host "[2/6] Fetching latest SINAN main..." -ForegroundColor Yellow
& git -C $projectRoot fetch --prune origin main
if ($LASTEXITCODE -ne 0) { throw "SINAN_FETCH_FAILED:$LASTEXITCODE" }
$remoteHead = (& git -C $projectRoot rev-parse origin/main).Trim()
Write-Host "REMOTE_HEAD=$remoteHead"

Write-Host "[3/6] Repairing required Windows runtime dependency if needed..." -ForegroundColor Yellow
Ensure-WindowsTimezoneData $pythonExe

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
$oldAction = @($task.Actions)[0]
$oldExecute = [string]$oldAction.Execute
$oldArguments = [string]$oldAction.Arguments
$oldWorkingDirectory = [string]$oldAction.WorkingDirectory

$configPath = Join-Path $projectRoot "data\qq-autostart\config.json"
$churchSecretPath = Join-Path $projectRoot "data\qq-autostart\church_ops_token.dpapi"
if (-not (Test-Path $configPath)) { throw "QQ_AUTOSTART_CONFIG_NOT_FOUND:$configPath" }

$backupDir = Join-Path $env:TEMP ("sinan-qq-runtime-backup-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$configBackup = Join-Path $backupDir "config.json"
$secretBackup = Join-Path $backupDir "church_ops_token.dpapi"
Copy-Item $configPath $configBackup -Force
$hadChurchSecret = Test-Path $churchSecretPath
if ($hadChurchSecret) { Copy-Item $churchSecretPath $secretBackup -Force }

$taskChanged = $false
try {
  Write-Host "[4/6] Updating isolated clean runtime..." -ForegroundColor Yellow
  Stop-Gateway $TaskName

  & git -C $projectRoot worktree prune
  if ($LASTEXITCODE -ne 0) { throw "WORKTREE_PRUNE_FAILED:$LASTEXITCODE" }

  Ensure-GitSafeDirectory $runtimeRoot

  if (Test-Path $runtimeRoot) {
    $inside = (& git -C $runtimeRoot rev-parse --is-inside-work-tree 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or $inside -ne "true") { throw "RUNTIME_PATH_NOT_GIT_WORKTREE:$runtimeRoot" }
    & git -C $runtimeRoot checkout --detach origin/main
    if ($LASTEXITCODE -ne 0) { throw "RUNTIME_CHECKOUT_FAILED:$LASTEXITCODE" }
    & git -C $runtimeRoot reset --hard origin/main
    if ($LASTEXITCODE -ne 0) { throw "RUNTIME_RESET_FAILED:$LASTEXITCODE" }
    & git -C $runtimeRoot clean -fd
    if ($LASTEXITCODE -ne 0) { throw "RUNTIME_CLEAN_FAILED:$LASTEXITCODE" }
  } else {
    & git -C $projectRoot worktree add --detach $runtimeRoot origin/main
    if ($LASTEXITCODE -ne 0) { throw "RUNTIME_WORKTREE_CREATE_FAILED:$LASTEXITCODE" }
  }

  $runtimeLauncher = Join-Path $runtimeRoot "scripts\start_sinan_qq_runtime.ps1"
  if (-not (Test-Path $runtimeLauncher)) { throw "RUNTIME_LAUNCHER_MISSING:$runtimeLauncher" }

  Write-Host "[5/6] Running church-aware QQ candidate tests..." -ForegroundColor Yellow
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

  Write-Host "[6/6] Wiring Church Ops and starting isolated QQ runtime..." -ForegroundColor Yellow
  Set-ChurchOpsAutostartConfig $projectRoot

  $PowerShellExe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $actionArgs = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runtimeLauncher`" -ProjectRoot `"$projectRoot`" -CodeRoot `"$runtimeRoot`" -StartupDelaySeconds 0"
  $newAction = New-SafeTaskAction $PowerShellExe $actionArgs $runtimeRoot
  Set-ScheduledTask -TaskName $TaskName -Action $newAction | Out-Null
  $taskChanged = $true

  Start-ScheduledTask -TaskName $TaskName
  if (-not (Wait-RuntimeGateway -RuntimeRoot $runtimeRoot -TimeoutSeconds 45)) {
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    throw "RUNTIME_GATEWAY_HEALTHCHECK_FAILED:LastTaskResult=$($info.LastTaskResult)"
  }

  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host ""
  Write-Host "STATUS=PASS" -ForegroundColor Green
  Write-Host "UPDATE=RUNTIME_ISOLATED"
  Write-Host "PROJECT_ROOT=$projectRoot"
  Write-Host "RUNTIME_ROOT=$runtimeRoot"
  Write-Host "PROJECT_WORKTREE_TOUCHED=NO"
  Write-Host "GATEWAY_PROCESS_COUNT=$((Get-GatewayProcesses).Count)"
  Write-Host "LAST_TASK_RESULT=$($info.LastTaskResult)"
  Write-Host "LIVE SINAN QQ UPDATE PASSED." -ForegroundColor Green
  Write-Host "Now test the church announcement flow in private QQ."
} catch {
  $deployError = $_
  Write-Host "Runtime deployment failed; restoring previous QQ task action and config..." -ForegroundColor Red
  Stop-Gateway $TaskName

  if ($taskChanged) {
    $restoreAction = New-SafeTaskAction $oldExecute $oldArguments $oldWorkingDirectory
    Set-ScheduledTask -TaskName $TaskName -Action $restoreAction | Out-Null
  }

  if (Test-Path $configBackup) { Copy-Item $configBackup $configPath -Force }
  if ($hadChurchSecret -and (Test-Path $secretBackup)) {
    Copy-Item $secretBackup $churchSecretPath -Force
  } elseif (-not $hadChurchSecret) {
    Remove-Item $churchSecretPath -Force -ErrorAction SilentlyContinue
  }

  Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  throw "RUNTIME_DEPLOYMENT_ROLLED_BACK:$deployError"
} finally {
  Remove-Item $backupDir -Recurse -Force -ErrorAction SilentlyContinue
}
