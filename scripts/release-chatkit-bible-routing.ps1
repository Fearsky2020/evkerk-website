$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Assert-ExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE" }
}

Write-Host 'EVKERK_CHATKIT_BIBLE_ROUTING_RELEASE_START'

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
  'src/worker-chatkit.js',
  'tests/public-chatkit.test.mjs',
  'scripts/release-chatkit-bible-routing.ps1'
)

Write-Host '3/7 Stage exact release files'
git add -- $releaseFiles
Assert-ExitCode 'git add'

$staged = git diff --cached --name-only
Assert-ExitCode 'git diff --cached'
if ($staged) {
  Write-Host $staged
  Write-Host '4/7 Commit'
  git commit -m 'feat: route Bible page to Bible Finder ChatKit'
  Assert-ExitCode 'git commit'
} else {
  Write-Host '4/7 Commit skipped: no new staged changes'
}

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

$homeResponse = Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/' -TimeoutSec 30
if ($homeResponse.StatusCode -ne 200 -or $homeResponse.Content -notmatch 'evkerk-chatkit\.js\?v=2') {
  throw 'Homepage ChatKit v2 marker verification failed.'
}

$bibleResponse = Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/bible' -TimeoutSec 30
if ($bibleResponse.StatusCode -ne 200 -or $bibleResponse.Content -notmatch 'evkerk-chatkit\.js\?v=2') {
  throw 'Bible page ChatKit v2 marker verification failed.'
}

$loaderResponse = Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/evkerk-chatkit.js?v=2' -TimeoutSec 30
if ($loaderResponse.StatusCode -ne 200) { throw 'ChatKit loader fetch failed.' }
if ($loaderResponse.Content -notmatch '3612000000002179') { throw 'Bible Finder entity id missing from live ChatKit loader.' }
if ($loaderResponse.Content -notmatch '3612000000002124') { throw 'Public Assistant entity id missing from live ChatKit loader.' }
if ($loaderResponse.Content -notmatch "visibility = 'hidden'") { throw 'ChatKit flash suppression marker missing from live loader.' }

Write-Host 'EVKERK_CHATKIT_BIBLE_ROUTING_RELEASE_OK'
