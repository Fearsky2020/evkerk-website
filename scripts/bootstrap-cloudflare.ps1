param(
  [string]$DatabaseName = "evkerk-website-db",
  [string]$WorkerName = "evkerk-website-preview",
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
  $output = Invoke-Expression $cmd 2>&1 | Out-String
  Write-Host $output
  if ($LASTEXITCODE -ne 0) { throw "Wrangler command failed: $ArgsLine" }
  return $output
}

Require-Command node
Require-Command npm
Require-Command npx

if (-not (Test-Path package.json)) {
  throw "Run this script from the evkerk-website repository root."
}

Write-Host "[1/7] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "[2/7] Checking Cloudflare login..." -ForegroundColor Yellow
try {
  Invoke-Wrangler "whoami" | Out-Null
} catch {
  Write-Host "Cloudflare login is required. A browser window will open." -ForegroundColor Yellow
  Invoke-Wrangler "login" | Out-Null
}

Write-Host "[3/7] Creating or reusing D1 database..." -ForegroundColor Yellow
$dbId = $null
$createOutput = ""
try {
  $createOutput = Invoke-Wrangler "d1 create $DatabaseName"
} catch {
  Write-Host "D1 create did not succeed; checking existing databases..." -ForegroundColor Yellow
  $createOutput = Invoke-Wrangler "d1 list"
}

$uuidPattern = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
$matches = [regex]::Matches($createOutput, $uuidPattern)
if ($matches.Count -gt 0) {
  $dbId = $matches[$matches.Count - 1].Value
}

if (-not $dbId) {
  throw "Could not determine D1 database UUID automatically. Run 'npx wrangler d1 list' and add the DB binding manually."
}

Write-Host "D1 UUID: $dbId" -ForegroundColor Green

Write-Host "[4/7] Updating wrangler.toml DB binding..." -ForegroundColor Yellow
$tomlPath = Join-Path (Get-Location) "wrangler.toml"
$toml = Get-Content $tomlPath -Raw
$toml = [regex]::Replace($toml, '(?ms)\n\[\[d1_databases\]\].*?(?=\n\[|\z)', '')
$binding = @"

[[d1_databases]]
binding = "DB"
database_name = "$DatabaseName"
database_id = "$dbId"
"@
$toml = $toml.TrimEnd() + $binding + "`n"
Set-Content -Path $tomlPath -Value $toml -Encoding utf8

Write-Host "[5/7] Applying D1 migrations..." -ForegroundColor Yellow
Invoke-Wrangler "d1 migrations apply $DatabaseName --remote" | Out-Null

Write-Host "[6/7] Creating SINAN control token and deploying..." -ForegroundColor Yellow
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$token = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
$token | npx wrangler secret put SINAN_TOKEN
if ($LASTEXITCODE -ne 0) { throw "Failed to set SINAN_TOKEN" }

$deployOutput = Invoke-Wrangler "deploy"
$urlMatch = [regex]::Match($deployOutput, 'https://[^\s]+\.workers\.dev')
$endpoint = if ($urlMatch.Success) { $urlMatch.Value.TrimEnd('/') } else { "" }

Write-Host "[7/7] Writing local SINAN connection files..." -ForegroundColor Yellow
if ($SinanProjectRoot) {
  $sinanDir = Join-Path $SinanProjectRoot ".sinan"
  New-Item -ItemType Directory -Force -Path $sinanDir | Out-Null
  Set-Content -Path (Join-Path $sinanDir "church-ops.token") -Value $token -Encoding ascii -NoNewline
  if ($endpoint) {
    Set-Content -Path (Join-Path $sinanDir "church-ops.endpoint") -Value $endpoint -Encoding ascii -NoNewline
  }
}

Write-Host "" 
Write-Host "EVKERK bootstrap complete." -ForegroundColor Green
Write-Host "D1: $DatabaseName ($dbId)"
if ($endpoint) {
  Write-Host "Worker: $endpoint"
  Write-Host "Set on QQ gateway: SINAN_CHURCH_OPS_ENDPOINT=$endpoint"
} else {
  Write-Host "Worker deployed, but workers.dev URL was not detected automatically. Copy it from Wrangler output."
}
Write-Host "SINAN_TOKEN was stored in Cloudflare and is not printed here."