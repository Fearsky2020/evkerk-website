$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Assert-ExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE" }
}

Write-Host 'EVKERK_SERMON_PLAY_HOVER_RELEASE_START'

$branch = (git branch --show-current).Trim()
Assert-ExitCode 'git branch'
if ($branch -ne 'main') { throw "Expected main branch, got: $branch" }

Write-Host '1/6 Syntax checks'
npm run check
Assert-ExitCode 'npm run check'

Write-Host '2/6 Automated tests'
npm test
Assert-ExitCode 'npm test'

$releaseFiles = @(
  'public/sermon-play-hover-fix.js',
  'src/worker-chatkit.js',
  'tests/sermon-play-hover.test.mjs',
  'scripts/release-sermon-play-hover-fix.ps1'
)

Write-Host '3/6 Stage exact files'
git add -- $releaseFiles
Assert-ExitCode 'git add'

$staged = git diff --cached --name-only
Assert-ExitCode 'git diff --cached'
if (-not $staged) { throw 'No staged sermon hover changes found.' }
Write-Host $staged

Write-Host '4/6 Commit and push'
git commit -m 'fix: keep sermon play button stable on hover'
Assert-ExitCode 'git commit'
git push origin main
Assert-ExitCode 'git push'

Write-Host '5/6 Deploy Cloudflare Worker'
npx wrangler deploy
Assert-ExitCode 'wrangler deploy'

Start-Sleep -Seconds 4

Write-Host '6/6 Verify live markers'
$page = Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/' -TimeoutSec 30
if ($page.StatusCode -ne 200 -or $page.Content -notmatch 'sermon-play-hover-fix\.js\?v=1') {
  throw 'Homepage hover fix marker was not found after deploy.'
}
$fix = Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/sermon-play-hover-fix.js?v=1' -TimeoutSec 30
if ($fix.StatusCode -ne 200 -or $fix.Content -notmatch 'button\.sermon-play-toggle:hover span') {
  throw 'Hover fix asset verification failed.'
}

Write-Host 'EVKERK_SERMON_PLAY_HOVER_RELEASE_OK'
