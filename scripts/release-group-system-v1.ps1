param(
  [switch]$ExecuteProduction,
  [string]$AuthorizationPhrase = '',
  [string]$ExpectedBaseHead = 'ecef6e8da70ace567c1b8ea74dd4703921378e9e',
  [string]$ExpectedReleaseHead = ''
)

$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$Root='C:\SINAN\workspace\evkerk-login-fix'
$ManifestPath=Join-Path $Root 'docs\GROUP-SYSTEM-RELEASE-MANIFEST-2026-09-29.json'
$PreflightPath=Join-Path $Root '.sinan\qa\GROUP-SYSTEM-PREFLIGHT-V1.ps1'
Set-Location $Root

Write-Host '== EVKERK GROUP SYSTEM RELEASE RUNNER V1 ==' -ForegroundColor Cyan

if(-not (Test-Path $ManifestPath)){ throw 'RELEASE_MANIFEST_MISSING' }
if(-not (Test-Path $PreflightPath)){ throw 'PREFLIGHT_SCRIPT_MISSING' }
$manifest=Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json

Write-Host '[1/7] Local preflight' -ForegroundColor Yellow
& $PreflightPath
if($LASTEXITCODE -ne 0){ throw 'GROUP_SYSTEM_PREFLIGHT_FAILED' }

if(-not $ExecuteProduction){
  Write-Host ''
  Write-Host 'GROUP_SYSTEM_RELEASE_PREPARED=PASS' -ForegroundColor Green
  Write-Host 'PRODUCTION_CHANGED=NO'
  Write-Host 'To execute production later, explicit release authorization and exact commit hashes are required.'
  exit 0
}

Write-Host '[2/7] Production authorization gate' -ForegroundColor Yellow
if($AuthorizationPhrase -ne 'PUBLISH_EVKERK_GROUP_SYSTEM'){ throw 'PRODUCTION_AUTHORIZATION_MISSING_OR_INVALID' }
if([string]::IsNullOrWhiteSpace($ExpectedReleaseHead)){ throw 'EXPECTED_RELEASE_HEAD_REQUIRED' }

Write-Host '[3/7] Release commit integrity' -ForegroundColor Yellow
$branch=(git branch --show-current).Trim()
if($LASTEXITCODE -ne 0){ throw 'GIT_BRANCH_FAILED' }
if($branch -ne 'feat/group-member-join-v1'){ throw ('UNEXPECTED_BRANCH:'+ $branch) }
$head=(git rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0){ throw 'GIT_HEAD_FAILED' }
if($head -ne $ExpectedReleaseHead){ throw ('RELEASE_HEAD_MISMATCH:'+ $head) }
$dirty=@(git status --porcelain)
if($LASTEXITCODE -ne 0){ throw 'GIT_STATUS_FAILED' }
$ignoredExact=@($manifest.ignoredDirtyPaths)
$ignoredPrefixes=@($manifest.ignoredDirtyPrefixes)
$unexpectedDirty=@()
foreach($line in $dirty){
  if(-not $line){ continue }
  $p=($line.Substring([Math]::Min(3,$line.Length))).Trim().Replace('\','/')
  $ignored=$ignoredExact -contains $p
  if(-not $ignored){
    foreach($prefix in $ignoredPrefixes){
      if($p.StartsWith([string]$prefix)){ $ignored=$true; break }
    }
  }
  if(-not $ignored){ $unexpectedDirty+=$line }
}
if($unexpectedDirty.Count -gt 0){
  $unexpectedDirty | ForEach-Object { Write-Host $_ }
  throw 'RELEASE_WORKTREE_HAS_UNEXPECTED_DIRTY_FILES'
}

$changed=@(git diff --name-only $ExpectedBaseHead $ExpectedReleaseHead | Where-Object { $_ -and $_.Trim() })
if($LASTEXITCODE -ne 0){ throw 'GIT_RELEASE_DIFF_FAILED' }
$allowed=@($manifest.allowedPaths)
$unexpected=@($changed | Where-Object { $allowed -notcontains $_ })
if($unexpected.Count -gt 0){
  Write-Host 'Unexpected release files:' -ForegroundColor Red
  $unexpected | ForEach-Object { Write-Host (' - '+$_) }
  throw 'RELEASE_DIFF_OUTSIDE_ALLOWLIST'
}
if($changed.Count -eq 0){ throw 'RELEASE_DIFF_EMPTY' }
Write-Host ('Release files: '+$changed.Count) -ForegroundColor Green

Write-Host '[4/7] Apply production D1 migrations' -ForegroundColor Yellow
npx wrangler d1 migrations apply evkerk-website-db --remote
if($LASTEXITCODE -ne 0){ throw 'PRODUCTION_MIGRATION_FAILED' }

Write-Host '[5/7] Deploy Worker' -ForegroundColor Yellow
npx wrangler deploy
if($LASTEXITCODE -ne 0){ throw 'WORKER_DEPLOY_FAILED' }

Write-Host '[6/7] Existing production smoke' -ForegroundColor Yellow
& (Join-Path $Root 'scripts\smoke-test.ps1') -Endpoint 'https://evkerk.nl'
if($LASTEXITCODE -ne 0){ throw 'BASE_SMOKE_FAILED' }

Write-Host '[7/7] Group-system production read-only smoke' -ForegroundColor Yellow
$aasa=Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/.well-known/apple-app-site-association' -TimeoutSec 20
if($aasa.StatusCode -ne 200){ throw 'AASA_STATUS_FAILED' }
if(($aasa.Headers['Content-Type'] -join ',') -notmatch 'application/json'){ throw 'AASA_CONTENT_TYPE_FAILED' }
if($aasa.Content -notmatch 'CU2U35ZD7K.nl.evkerk.app'){ throw 'AASA_APP_ID_FAILED' }
if($aasa.Content -notmatch '/join/\*'){ throw 'AASA_JOIN_PATH_FAILED' }

$groups=Invoke-RestMethod -Uri 'https://evkerk.nl/api/app/groups' -Method Get -TimeoutSec 20
if(-not $groups.ok){ throw 'PUBLIC_GROUPS_FAILED' }

try{
  Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/api/organization/tree' -TimeoutSec 20 | Out-Null
  throw 'ORG_TREE_UNAUTHENTICATED_ACCEPTED'
}catch{
  if($_.Exception.Message -eq 'ORG_TREE_UNAUTHENTICATED_ACCEPTED'){ throw }
  if(-not $_.Exception.Response){ throw }
  $code=[int]$_.Exception.Response.StatusCode
  if($code -notin 401,403){ throw ('ORG_TREE_AUTH_BOUNDARY_BAD_STATUS:'+ $code) }
}

$join=Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/join/definitely-invalid-release-smoke-token' -MaximumRedirection 0 -ErrorAction SilentlyContinue -TimeoutSec 20
if($join.StatusCode -notin 301,302,307,308){
  # Some PowerShell versions surface redirects as exceptions; validate through final fallback instead.
  $fallback=Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/join.html?token=definitely-invalid-release-smoke-token' -TimeoutSec 20
  if($fallback.StatusCode -ne 200){ throw 'JOIN_FALLBACK_FAILED' }
}

Write-Host ''
Write-Host 'EVKERK_GROUP_SYSTEM_RELEASE=PASS' -ForegroundColor Green
Write-Host ('RELEASE_HEAD='+$head)
Write-Host 'PRODUCTION_CHANGED=YES'