$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Assert-ExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) { throw "$Step failed with exit code $LASTEXITCODE" }
}

Write-Host 'EVKERK_BIBLE_STORY_SEARCH_RELEASE_START'

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
  'src/bible-search.js',
  'tests/bible-search-api.test.mjs',
  'scripts/release-bible-story-search.ps1'
)

Write-Host '3/7 Stage exact release files'
git add -- $releaseFiles
Assert-ExitCode 'git add'

$staged = git diff --cached --name-only
Assert-ExitCode 'git diff --cached'
if ($staged) {
  Write-Host $staged
  Write-Host '4/7 Commit'
  git commit -m 'feat: add Bible story shorthand search hints'
  Assert-ExitCode 'git commit'
} else {
  Write-Host '4/7 Commit skipped; no staged changes'
}

Write-Host '5/7 SINAN QA'
node scripts/sinan-qa.mjs
Assert-ExitCode 'SINAN QA'

Write-Host '6/7 Push main'
git push origin main
Assert-ExitCode 'git push'

Write-Host '7/7 Deploy Cloudflare Worker'
npx wrangler deploy
Assert-ExitCode 'wrangler deploy'

Start-Sleep -Seconds 4

# Query: someone ate poisonous gourds
$poisonUrl = 'https://evkerk.nl/api/bible/search?q=%E6%9C%89%E4%BA%BA%E5%90%83%E4%BA%86%E6%AF%92%E7%93%9C&limit=5'
$poison = Invoke-RestMethod -Uri $poisonUrl -Method Get -TimeoutSec 30
if (-not $poison.ok) { throw 'Poison-gourd story search did not return ok=true.' }
$poisonHit = $poison.results | Where-Object { $_.book_index -eq 11 -and $_.chapter -eq 4 -and ($_.verse -eq 39 -or $_.verse -eq 40) }
if (-not $poisonHit) { throw 'Poison-gourd story search did not reach 2 Kings 4:39-40.' }

# Query: a man went to a prophet for healing
$prophetUrl = 'https://evkerk.nl/api/bible/search?q=%E6%9C%89%E4%B8%AA%E4%BA%BA%E6%9B%BE%E7%BB%8F%E5%8E%BB%E6%89%BE%E4%B8%80%E4%B8%AA%E5%85%88%E7%9F%A5%E6%B2%BB%E7%97%85&limit=5'
$prophet = Invoke-RestMethod -Uri $prophetUrl -Method Get -TimeoutSec 30
if (-not $prophet.ok) { throw 'Prophet-healing story search did not return ok=true.' }
$prophetHit = $prophet.results | Where-Object { $_.book_index -eq 11 -and $_.chapter -eq 5 }
if (-not $prophetHit) { throw 'Prophet-healing story search did not reach 2 Kings 5.' }

Write-Host 'EVKERK_BIBLE_STORY_SEARCH_RELEASE_OK'
Write-Host ('Poison-gourd mode: ' + $poison.mode)
Write-Host ('Prophet-healing mode: ' + $prophet.mode)
