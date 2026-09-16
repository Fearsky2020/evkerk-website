$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Assert-ExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE" }
}

Write-Host 'EVKERK_BIBLE_CHATKIT_ENTITY_FIX_START'

$branch = (git branch --show-current).Trim()
Assert-ExitCode 'git branch'
if ($branch -ne 'main') { throw "Expected main branch, got: $branch" }

Write-Host '1/7 Syntax checks'
npm run check
Assert-ExitCode 'npm run check'

Write-Host '2/7 Automated tests'
npm test
Assert-ExitCode 'npm test'

$releaseFiles = @(
  'public/evkerk-chatkit.js',
  'tests/public-chatkit.test.mjs',
  'scripts/release-bible-chatkit-entity-fix.ps1'
)

Write-Host '3/7 Stage exact release files'
git add -- $releaseFiles
Assert-ExitCode 'git add'

$staged = git diff --cached --name-only
Assert-ExitCode 'git diff --cached'
if (-not $staged) { throw 'No staged ChatKit entity fix changes found.' }
Write-Host $staged

Write-Host '4/7 Commit'
git commit -m 'fix: use Bible Finder ChatKit entity id'
Assert-ExitCode 'git commit'

Write-Host '5/7 SINAN QA on clean commit'
node scripts/sinan-qa.mjs
Assert-ExitCode 'SINAN QA'

Write-Host '6/7 Push main'
git push origin main
Assert-ExitCode 'git push'

Write-Host '7/7 Deploy Cloudflare Worker'
npx wrangler deploy
Assert-ExitCode 'wrangler deploy'

Start-Sleep -Seconds 4

$loaderUrl = 'https://evkerk.nl/evkerk-chatkit.js?v=2'
$loader = Invoke-WebRequest -UseBasicParsing -Uri $loaderUrl -TimeoutSec 30
if ($loader.StatusCode -ne 200) { throw 'ChatKit loader did not return HTTP 200.' }
if ($loader.Content -notmatch '3612000000002240') { throw 'Bible Finder ChatKit entity id was not found in deployed loader.' }
if ($loader.Content -match '3612000000002179') { throw 'Old Bible Finder Agent id is still present in deployed loader.' }

$bible = Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/bible' -TimeoutSec 30
if ($bible.StatusCode -ne 200 -or $bible.Content -notmatch 'evkerk-chatkit\.js\?v=2') { throw 'Bible page does not include ChatKit v2 loader.' }

Write-Host 'EVKERK_BIBLE_CHATKIT_ENTITY_FIX_OK'
