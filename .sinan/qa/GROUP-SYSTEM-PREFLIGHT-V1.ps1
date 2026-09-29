$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

$Root='C:\SINAN\workspace\evkerk-login-fix'
Set-Location $Root

function Assert-Contains([string]$Path,[string]$Needle){
  if(-not (Test-Path -LiteralPath $Path)){ throw ('MISSING_FILE:'+ $Path) }
  $text=[IO.File]::ReadAllText($Path)
  if(-not $text.Contains($Needle)){ throw ('MISSING_EXPECTED_TEXT:'+ $Path +'::'+ $Needle) }
}

Write-Host '[1/6] Syntax checks'
node --check src/organization.js
if($LASTEXITCODE -ne 0){ throw 'ORGANIZATION_SYNTAX_FAIL' }
node --check src/worker-chatkit.js
if($LASTEXITCODE -ne 0){ throw 'WORKER_CHATKIT_SYNTAX_FAIL' }
node --check public/team/groups/app.js
if($LASTEXITCODE -ne 0){ throw 'GROUP_APP_SYNTAX_FAIL' }
node --check public/team/groups/governance.js
if($LASTEXITCODE -ne 0){ throw 'GOVERNANCE_SYNTAX_FAIL' }

Write-Host '[2/6] Full group-system tests'
$tests=@(
  'tests/app-welcome-idempotency.test.mjs',
  'tests/group-questions.test.mjs',
  'tests/group-recommendation.test.mjs',
  'tests/group-universal-link.test.mjs',
  'tests/group-weekly-scripture.test.mjs',
  'tests/member-app-auth.test.mjs',
  'tests/member-app-scope-consistency.test.mjs',
  'tests/organization-management.test.mjs',
  'tests/welcome-group-postcodes-complete.test.mjs',
  'tests/welcome-group-postcodes-second-cluster.test.mjs',
  'tests/welcome-group-postcodes-third-fourth-cluster.test.mjs',
  'tests/welcome-group-postcodes.test.mjs',
  'tests/welcome-intake-quality.test.mjs',
  'tests/welcome-photo-json.test.mjs',
  'tests/welcome-photos.test.mjs'
)
& node --test @tests
if($LASTEXITCODE -ne 0){ throw 'GROUP_SYSTEM_TESTS_FAIL' }

Write-Host '[3/6] Migration files'
foreach($m in 31..36){
  $pattern=('00{0}_*.sql' -f $m)
  $files=@(Get-ChildItem -LiteralPath (Join-Path $Root 'migrations') -Filter $pattern)
  if($files.Count -ne 1){ throw ('MIGRATION_COUNT_'+$m+'='+$files.Count) }
}

Write-Host '[4/6] Production bindings are unchanged'
Assert-Contains (Join-Path $Root 'wrangler.toml') 'database_name = "evkerk-website-db"'
Assert-Contains (Join-Path $Root 'wrangler.toml') '2817f829-f9d3-4426-b35c-f8eb21b6b934'
Assert-Contains (Join-Path $Root 'wrangler.toml') '{ pattern = "evkerk.nl", custom_domain = true }'
Assert-Contains (Join-Path $Root 'wrangler.toml') '"/.well-known/apple-app-site-association"'

Write-Host '[5/6] Universal Link contract'
Assert-Contains (Join-Path $Root 'src\worker-chatkit.js') 'CU2U35ZD7K.nl.evkerk.app'
Assert-Contains (Join-Path $Root 'src\worker-chatkit.js') '/.well-known/apple-app-site-association'
Assert-Contains (Join-Path $Root 'src\worker-chatkit.js') '/join/*'

Write-Host '[6/6] Release safety guards'
$bootstrap=[IO.File]::ReadAllText((Join-Path $Root 'scripts\bootstrap-cloudflare.ps1'))
if(-not ($bootstrap.Contains('wrangler secret put SINAN_TOKEN') -and $bootstrap.Contains('wrangler secret put INGEST_TOKEN'))){
  throw 'BOOTSTRAP_SECRET_ROTATION_GUARD_MISSING'
}
Write-Host 'BOOTSTRAP_FORBIDDEN_FOR_GROUP_RELEASE=CONFIRMED'

Write-Host ''
Write-Host 'GROUP_SYSTEM_PREFLIGHT=PASS'
Write-Host 'PRODUCTION_CHANGED=NO'