$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host 'EVKERK_BIBLE_SEARCH_RELEASE_START'

$branch = (git branch --show-current).Trim()
if ($branch -ne 'main') { throw "Expected main branch, got: $branch" }

Write-Host '1/7 Syntax checks'
npm run check

Write-Host '2/7 Automated tests'
npm test

$releaseFiles = @(
  'package.json',
  'src/worker-chatkit.js',
  'src/bible-search.js',
  'public/bible-deeplink.js',
  'tests/bible-search-api.test.mjs',
  'scripts/release-bible-search-api.ps1'
)

Write-Host '3/7 Stage exact release files'
git add -- $releaseFiles

$staged = git diff --cached --name-only
if (-not $staged) { throw 'No staged Bible search changes found.' }
Write-Host $staged

Write-Host '4/7 Commit'
git commit -m 'feat: add public Bible search API for Zia Bible Finder'

Write-Host '5/7 SINAN QA on clean commit'
node scripts/sinan-qa.mjs

Write-Host '6/7 Push main'
git push origin main

Write-Host '7/7 Deploy Cloudflare Worker'
npx wrangler deploy

Start-Sleep -Seconds 4

# Keep this release script ASCII-only so Windows PowerShell 5.1 parses it reliably.
$searchUrl = 'https://evkerk.nl/api/bible/search?q=%E4%B8%8D%E8%A6%81%E4%B8%BA%E6%98%8E%E5%A4%A9%E5%BF%A7%E8%99%91'
$searchResponse = Invoke-RestMethod -Uri $searchUrl -Method Get -TimeoutSec 30
if (-not $searchResponse.ok) { throw 'Bible search API did not return ok=true.' }
if (-not $searchResponse.results -or $searchResponse.results.Count -lt 1) { throw 'Bible search API returned no results.' }
$expectedMatthew = $searchResponse.results | Where-Object { $_.book_index -eq 39 -and $_.chapter -eq 6 -and $_.verse -eq 34 }
if (-not $expectedMatthew) {
  $returned = $searchResponse.results | ForEach-Object { "book_index=$($_.book_index),chapter=$($_.chapter),verse=$($_.verse)" }
  Write-Host ('Returned results: ' + ($returned -join '; '))
  throw 'Expected Matthew 6:34 was not returned.'
}

$referenceUrl = 'https://evkerk.nl/api/bible/search?q=%E7%BA%A6%E7%BF%B0%E7%A6%8F%E9%9F%B33%3A16'
$referenceResponse = Invoke-RestMethod -Uri $referenceUrl -Method Get -TimeoutSec 30
if (-not $referenceResponse.ok -or -not $referenceResponse.results -or $referenceResponse.results.Count -lt 1) {
  throw 'Reference lookup failed.'
}
$first = $referenceResponse.results[0]
if ($first.book_index -ne 42 -or $first.chapter -ne 3 -or $first.verse -ne 16) {
  throw 'Reference lookup returned an unexpected verse.'
}

$biblePageUrl = "https://evkerk.nl/bible?book=39&chapter=6&verse=34"
$biblePageResponse = Invoke-WebRequest -UseBasicParsing -Uri $biblePageUrl -TimeoutSec 30
if ($biblePageResponse.StatusCode -ne 200 -or $biblePageResponse.Content -notmatch 'bible-deeplink\.js\?v=1') {
  throw 'Bible deeplink script verification failed.'
}

Write-Host 'EVKERK_BIBLE_SEARCH_RELEASE_OK'
Write-Host ('Top result coordinates: ' + $searchResponse.results[0].book_index + ':' + $searchResponse.results[0].chapter + ':' + $searchResponse.results[0].verse)
