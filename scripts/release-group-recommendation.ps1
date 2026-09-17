$ErrorActionPreference = 'Stop'
$repo = 'C:\SINAN\evkerk-site'
Set-Location $repo

Write-Host '== EVKERK group recommendation: checks =='
npm run check
node --test tests/group-recommendation.test.mjs tests/welcome-group-postcodes-complete.test.mjs

Write-Host '== Stage only group-recommendation files =='
git add -- package.json src/worker-chatkit.js src/worker-enhanced-v2.js src/group-recommendation.js migrations/0030_complete_group_postcodes.sql tests/group-recommendation.test.mjs tests/welcome-group-postcodes-complete.test.mjs scripts/release-group-recommendation.ps1

$staged = git diff --cached --name-only
$expected = @(
  'package.json',
  'src/worker-chatkit.js',
  'src/worker-enhanced-v2.js',
  'src/group-recommendation.js',
  'migrations/0030_complete_group_postcodes.sql',
  'tests/group-recommendation.test.mjs',
  'tests/welcome-group-postcodes-complete.test.mjs',
  'scripts/release-group-recommendation.ps1'
)
foreach ($file in $staged) {
  if ($expected -notcontains $file) { throw "Unexpected staged file: $file" }
}

if ($staged) {
  Write-Host '== Commit and push =='
  git commit -m 'feat: complete group postcodes and recommend top three groups'
  git push origin main
} else {
  Write-Host 'No new group-recommendation changes to commit; continuing with current HEAD.'
}

Write-Host '== Apply D1 migrations =='
npx wrangler d1 migrations apply evkerk-website-db --remote

Write-Host '== Deploy =='
npx wrangler deploy

Write-Host '== Production verification =='
Start-Sleep -Seconds 5

# Public assistant sanity check: this release must not break the existing site worker.
$body = '{"message":"\u4e0a\u4e2a\u793c\u62dc\u7684\u4fe1\u606f\u662f\u4ec0\u4e48\uff1f","history":[],"page":"/"}'
$assistant = Invoke-RestMethod -Method Post -Uri 'https://evkerk.nl/api/assistant/chat' -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
if (-not $assistant.ok -or [string]$assistant.context -ne 'sermons' -or [string]$assistant.provider -ne 'live-data') {
  throw 'Existing assistant sanity check failed.'
}

# The App recommendation route is authenticated. 401 confirms the new route is live before auth.
try {
  Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'https://evkerk.nl/api/app/welcome/recommend' -ContentType 'application/json; charset=utf-8' -Body '{"postcode":"2511EC"}' | Out-Null
  throw 'App recommendation route unexpectedly allowed an unauthenticated request.'
} catch {
  if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) {
    Write-Host 'App recommendation route: AUTH_REQUIRED_OK'
  } elseif ($_.Exception.Message -eq 'App recommendation route unexpectedly allowed an unauthenticated request.') {
    throw
  } else {
    throw 'App recommendation route verification failed.'
  }
}

Write-Host 'EVKERK_GROUP_RECOMMENDATION_RELEASE_OK'
Write-Host 'Postcodes: 33/33 migration coverage'
Write-Host 'Recommendation limit: 3'
Write-Host 'Eligibility: active + accepting + not closed/paused + not full'
Write-Host ('Assistant provider: ' + $assistant.provider)
