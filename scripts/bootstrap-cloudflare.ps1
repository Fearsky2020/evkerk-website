param(
  [string]$DatabaseName = "evkerk-website-db",
  [string]$MediaBucket = "evkerk-website-media",
  [string]$SinanProjectRoot = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

function Invoke-Wrangler([string]$ArgsLine) {
  $cmd = "npx wrangler $ArgsLine"
  Write-Host "> $cmd" -ForegroundColor Cyan
  # Route native stdout+stderr through cmd.exe so Windows PowerShell does not
  # promote harmless Wrangler warnings written to stderr into terminating errors.
  $output = & cmd.exe /d /s /c "$cmd 2>&1" | Out-String
  $exitCode = $LASTEXITCODE
  Write-Host $output
  if ($exitCode -ne 0) { throw "Wrangler command failed ($exitCode): $ArgsLine" }
  return $output
}

function New-SecretValue {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

Require-Command node
Require-Command npm
Require-Command npx

if (-not (Test-Path package.json)) {
  throw "Run this script from the evkerk-website repository root."
}

Write-Host "[1/9] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "[2/9] Checking Cloudflare login..." -ForegroundColor Yellow
try {
  Invoke-Wrangler "whoami" | Out-Null
} catch {
  Write-Host "Cloudflare login is required. A browser window will open." -ForegroundColor Yellow
  Invoke-Wrangler "login" | Out-Null
}

Write-Host "[3/9] Creating or reusing D1 database..." -ForegroundColor Yellow
$dbId = $null
$uuidPattern = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
try {
  $createOutput = Invoke-Wrangler "d1 create $DatabaseName"
  $m = [regex]::Match($createOutput, $uuidPattern)
  if ($m.Success) { $dbId = $m.Value }
} catch {
  Write-Host "D1 already exists or create failed; checking database list..." -ForegroundColor Yellow
  $listOutput = Invoke-Wrangler "d1 list"
  $nameIndex = $listOutput.IndexOf($DatabaseName, [StringComparison]::OrdinalIgnoreCase)
  if ($nameIndex -ge 0) {
    $windowStart = [Math]::Max(0, $nameIndex - 200)
    $windowLength = [Math]::Min(500, $listOutput.Length - $windowStart)
    $window = $listOutput.Substring($windowStart, $windowLength)
    $m = [regex]::Match($window, $uuidPattern)
    if ($m.Success) { $dbId = $m.Value }
  }
}
if (-not $dbId) {
  throw "Could not determine the UUID for D1 '$DatabaseName'. Run 'npx wrangler d1 list' to inspect the account."
}
Write-Host "D1 UUID: $dbId" -ForegroundColor Green

Write-Host "[4/9] Creating or reusing R2 media bucket..." -ForegroundColor Yellow
$r2Available = $false
try {
  try {
    Invoke-Wrangler "r2 bucket create $MediaBucket" | Out-Null
    $r2Available = $true
  } catch {
    $r2List = Invoke-Wrangler "r2 bucket list"
    if ($r2List -match [regex]::Escape($MediaBucket)) {
      $r2Available = $true
      Write-Host "R2 bucket already exists: $MediaBucket" -ForegroundColor Green
    }
  }
} catch {
  $r2Available = $false
}
if (-not $r2Available) {
  Write-Warning "R2 is not available in this Cloudflare account right now."
  Write-Host "Continuing without MEDIA storage. Website, QQ announcements, calendar metadata and sermon text can still deploy." -ForegroundColor Yellow
  Write-Host "Audio/photo uploads will remain disabled until R2 is enabled and rebound later." -ForegroundColor Yellow
}

Write-Host "[5/9] Updating wrangler.toml bindings..." -ForegroundColor Yellow
$tomlPath = Join-Path (Get-Location) "wrangler.toml"
$toml = Get-Content $tomlPath -Raw
$toml = [regex]::Replace($toml, '(?ms)\n\[\[d1_databases\]\].*?(?=\n\[|\z)', '')
$toml = [regex]::Replace($toml, '(?ms)\n\[\[r2_buckets\]\].*?(?=\n\[|\z)', '')
$bindings = @"

[[d1_databases]]
binding = "DB"
database_name = "$DatabaseName"
database_id = "$dbId"
"@
if ($r2Available) {
  $bindings += @"

[[r2_buckets]]
binding = "MEDIA"
bucket_name = "$MediaBucket"
"@
}
$toml = $toml.TrimEnd() + $bindings + "`n"
Set-Content -Path $tomlPath -Value $toml -Encoding utf8

Write-Host "[6/9] Applying all D1 migrations..." -ForegroundColor Yellow
Invoke-Wrangler "d1 migrations apply $DatabaseName --remote" | Out-Null

Write-Host "[7/9] Creating control secrets..." -ForegroundColor Yellow
$sinanToken = New-SecretValue
$ingestToken = New-SecretValue
$sinanToken | npx wrangler secret put SINAN_TOKEN
if ($LASTEXITCODE -ne 0) { throw "Failed to set SINAN_TOKEN" }
$ingestToken | npx wrangler secret put INGEST_TOKEN
if ($LASTEXITCODE -ne 0) { throw "Failed to set INGEST_TOKEN" }

Write-Host "[8/9] Running checks and deploying Worker..." -ForegroundColor Yellow
npm run check
if ($LASTEXITCODE -ne 0) { throw "Site checks failed" }
$deployOutput = Invoke-Wrangler "deploy"
$urlMatch = [regex]::Match($deployOutput, 'https://[^\s]+\.workers\.dev')
$endpoint = if ($urlMatch.Success) { $urlMatch.Value.TrimEnd('/') } else { "" }

Write-Host "[9/9] Writing local SINAN connection files and smoke testing..." -ForegroundColor Yellow
$sinanTokenPath = ""
if ($SinanProjectRoot) {
  if (-not (Test-Path $SinanProjectRoot)) { throw "SINAN project root does not exist: $SinanProjectRoot" }
  $sinanDir = Join-Path $SinanProjectRoot ".sinan"
  New-Item -ItemType Directory -Force -Path $sinanDir | Out-Null
  $sinanTokenPath = Join-Path $sinanDir "church-ops.token"
  $ingestTokenPath = Join-Path $sinanDir "church-ingest.token"
  Set-Content -Path $sinanTokenPath -Value $sinanToken -Encoding ascii -NoNewline
  Set-Content -Path $ingestTokenPath -Value $ingestToken -Encoding ascii -NoNewline
  if ($endpoint) {
    Set-Content -Path (Join-Path $sinanDir "church-ops.endpoint") -Value $endpoint -Encoding ascii -NoNewline
    [Environment]::SetEnvironmentVariable("SINAN_CHURCH_OPS_ENDPOINT", $endpoint, "User")
    [Environment]::SetEnvironmentVariable("SINAN_CHURCH_OPS_TOKEN_FILE", $sinanTokenPath, "User")
  }
}

if ($endpoint -and (Test-Path "scripts/smoke-test.ps1")) {
  $smokeArgs = @{ Endpoint = $endpoint }
  if ($sinanTokenPath) { $smokeArgs.SinanTokenFile = $sinanTokenPath }
  & "scripts/smoke-test.ps1" @smokeArgs
  if ($LASTEXITCODE -ne 0) { throw "Smoke test failed" }
}

Write-Host ""
Write-Host "EVKERK bootstrap complete." -ForegroundColor Green
Write-Host "D1: $DatabaseName ($dbId)"
if ($r2Available) { Write-Host "R2: $MediaBucket" } else { Write-Host "R2: unavailable (skipped)" }
if ($endpoint) {
  Write-Host "Worker: $endpoint"
  Write-Host "QQ gateway endpoint was configured when -SinanProjectRoot was provided."
} else {
  Write-Host "Worker deployed, but workers.dev URL was not detected automatically. Copy it from Wrangler output."
}
Write-Host "SINAN_TOKEN and INGEST_TOKEN were stored as Cloudflare secrets and are not printed here."