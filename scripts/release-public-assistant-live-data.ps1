$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Assert-ExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE" }
}

Write-Host 'EVKERK_PUBLIC_ASSISTANT_LIVE_RELEASE_START'

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
  'package.json',
  'src/public-assistant-live.js',
  'src/worker-chatkit.js',
  'tests/public-assistant-live.test.mjs',
  'docs/EVKERK_Live_Data_OpenAPI.yaml',
  'scripts/release-public-assistant-live-data.ps1'
)

Write-Host '3/7 Stage exact release files'
git add -- $releaseFiles
Assert-ExitCode 'git add'

$staged = git diff --cached --name-only
Assert-ExitCode 'git diff --cached'
if ($staged) {
  Write-Host $staged
  Write-Host '4/7 Commit'
  git commit -m 'feat: add compact live data API for public assistant'
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

$sermonUrl = 'https://evkerk.nl/api/assistant/live?kind=sermons&limit=2'
$sermons = Invoke-RestMethod -Uri $sermonUrl -Method Get -TimeoutSec 30
if (-not $sermons.ok -or -not $sermons.sermons -or $sermons.sermons.Count -lt 1) {
  throw 'Live sermon endpoint returned no sermon data.'
}
if ($sermons.sermons[0].sermon_date -ne '2026-09-13') {
  throw ('Latest sermon date was unexpected: ' + $sermons.sermons[0].sermon_date)
}
if ($sermons.sermons[0].title_zh -notmatch '十九') {
  throw ('Latest sermon title was unexpected: ' + $sermons.sermons[0].title_zh)
}

$schedule = Invoke-RestMethod -Uri 'https://evkerk.nl/api/assistant/live?kind=schedule' -Method Get -TimeoutSec 30
if (-not $schedule.ok -or $schedule.schedule.Count -ne 2) { throw 'Live schedule endpoint failed.' }
if ($schedule.schedule[0].sunday_service -ne '12:30–15:30') { throw 'Rijswijk Sunday time mismatch.' }
if ($schedule.schedule[1].sunday_service -ne '10:00–12:00') { throw 'Zoetermeer Sunday time mismatch.' }

Write-Host 'EVKERK_PUBLIC_ASSISTANT_LIVE_RELEASE_OK'
Write-Host ('Latest sermon: ' + $sermons.sermons[0].sermon_date + ' | ' + $sermons.sermons[0].title_zh)
