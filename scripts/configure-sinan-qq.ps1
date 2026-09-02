param(
  [Parameter(Mandatory=$true)][string]$SinanProjectRoot,
  [Parameter(Mandatory=$true)][string]$Endpoint,
  [string]$Token = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Endpoint = $Endpoint.TrimEnd('/')
if (-not ($Endpoint -match '^https://')) {
  throw "Endpoint must be an https:// URL"
}
if (-not (Test-Path $SinanProjectRoot)) {
  throw "SINAN project root does not exist: $SinanProjectRoot"
}

$sinanDir = Join-Path $SinanProjectRoot ".sinan"
New-Item -ItemType Directory -Force -Path $sinanDir | Out-Null
$tokenPath = Join-Path $sinanDir "church-ops.token"
$endpointPath = Join-Path $sinanDir "church-ops.endpoint"

if ($Token) {
  Set-Content -Path $tokenPath -Value $Token -Encoding ascii -NoNewline
} elseif (-not (Test-Path $tokenPath)) {
  throw "No token supplied and no existing token file found at $tokenPath"
}

Set-Content -Path $endpointPath -Value $Endpoint -Encoding ascii -NoNewline

[Environment]::SetEnvironmentVariable("SINAN_CHURCH_OPS_ENDPOINT", $Endpoint, "User")
[Environment]::SetEnvironmentVariable("SINAN_CHURCH_OPS_TOKEN_FILE", $tokenPath, "User")

$env:SINAN_CHURCH_OPS_ENDPOINT = $Endpoint
$env:SINAN_CHURCH_OPS_TOKEN_FILE = $tokenPath

Write-Host "SINAN Church Ops wiring complete." -ForegroundColor Green
Write-Host "Endpoint: $Endpoint"
Write-Host "Token file: $tokenPath"
Write-Host "Persistent user environment variables were updated."
Write-Host "Restart the existing QQ gateway process to load the new configuration."