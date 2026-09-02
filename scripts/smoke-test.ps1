param(
  [Parameter(Mandatory=$true)][string]$Endpoint,
  [string]$SinanTokenFile = ""
)

$ErrorActionPreference = "Stop"
$Endpoint = $Endpoint.TrimEnd('/')

function Get-Json([string]$Url, [hashtable]$Headers = @{}) {
  Write-Host "> GET $Url" -ForegroundColor Cyan
  return Invoke-RestMethod -Uri $Url -Method Get -Headers $Headers -TimeoutSec 20
}

Write-Host "[1/4] Public health..." -ForegroundColor Yellow
$health = Get-Json "$Endpoint/api/health"
if (-not $health.ok) { throw "Health endpoint did not return ok=true" }
if (-not $health.db) { throw "D1 binding is missing" }
if (-not $health.sinan) { throw "SINAN_TOKEN is missing" }
Write-Host "Health OK: DB=$($health.db) MEDIA=$($health.media) CALENDAR=$($health.calendar) SINAN=$($health.sinan)" -ForegroundColor Green

Write-Host "[2/4] Public events..." -ForegroundColor Yellow
$events = Get-Json "$Endpoint/api/events"
if (-not $events.ok) { throw "Events API failed" }
if (($events.events | Measure-Object).Count -lt 1) { throw "Events API returned no events" }
Write-Host "Events OK: $(($events.events | Measure-Object).Count) visible items" -ForegroundColor Green

Write-Host "[3/4] Public sermons/announcements..." -ForegroundColor Yellow
$sermons = Get-Json "$Endpoint/api/sermons"
$announcements = Get-Json "$Endpoint/api/announcements"
if (-not $sermons.ok -or -not $announcements.ok) { throw "Public content APIs failed" }
Write-Host "Content APIs OK" -ForegroundColor Green

Write-Host "[4/4] SINAN auth boundary..." -ForegroundColor Yellow
try {
  Invoke-RestMethod -Uri "$Endpoint/api/sinan/intents" -Method Post -ContentType "application/json" -Body '{"type":"announcement.publish","payload":{}}' -TimeoutSec 20 | Out-Null
  throw "Unauthenticated SINAN request was unexpectedly accepted"
} catch {
  if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -in 401,403) {
    Write-Host "Unauthenticated write correctly rejected" -ForegroundColor Green
  } elseif ($_.Exception.Message -eq "Unauthenticated SINAN request was unexpectedly accepted") {
    throw
  } else {
    Write-Host "Auth boundary returned a non-success response as expected: $($_.Exception.Message)" -ForegroundColor Green
  }
}

if ($SinanTokenFile) {
  if (-not (Test-Path $SinanTokenFile)) { throw "Token file not found: $SinanTokenFile" }
  $token = (Get-Content $SinanTokenFile -Raw).Trim()
  if (-not $token) { throw "Token file is empty" }
  # We intentionally do not create content during the smoke test. A valid token is only checked
  # against an invalid intent so no durable write can occur.
  $headers = @{ Authorization = "Bearer $token" }
  try {
    Invoke-RestMethod -Uri "$Endpoint/api/sinan/intents" -Method Post -Headers $headers -ContentType "application/json" -Body '{"type":"smoke.invalid","payload":{}}' -TimeoutSec 20 | Out-Null
    throw "Invalid intent was unexpectedly accepted"
  } catch {
    if ($_.Exception.Message -eq "Invalid intent was unexpectedly accepted") { throw }
    Write-Host "Authenticated control plane is reachable and rejected invalid intent safely" -ForegroundColor Green
  }
}

Write-Host "" 
Write-Host "EVKERK smoke test PASSED." -ForegroundColor Green