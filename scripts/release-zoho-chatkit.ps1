$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host 'EVKERK_CHATKIT_RELEASE_START'

$branch = (git branch --show-current).Trim()
if ($branch -ne 'main') { throw "Expected main branch, got: $branch" }

# Remove the temporary one-off integration helper created during preparation.
Remove-Item -LiteralPath (Join-Path $root 'scripts\integrate-zoho-chatkit.mjs') -Force -ErrorAction SilentlyContinue

Write-Host '1/7 Syntax checks'
npm run check

Write-Host '2/7 Automated tests'
npm test

$releaseFiles = @(
  'package.json',
  'wrangler.toml',
  'public/evkerk-chatkit.js',
  'src/worker-chatkit.js',
  'tests/public-chatkit.test.mjs',
  'scripts/release-zoho-chatkit.ps1'
)

Write-Host '3/7 Stage exact release files'
git add -- $releaseFiles

$staged = git diff --cached --name-only
if (-not $staged) { throw 'No staged ChatKit changes found.' }
Write-Host $staged

Write-Host '4/7 Commit'
git commit -m 'feat: add Zoho Zia ChatKit to public site'

Write-Host '5/7 SINAN QA on clean commit'
node scripts/sinan-qa.mjs

Write-Host '6/7 Push main'
git push origin main

Write-Host '7/7 Deploy Cloudflare Worker'
npx wrangler deploy

Start-Sleep -Seconds 4

$home = Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/' -TimeoutSec 30
if ($home.StatusCode -ne 200 -or $home.Content -notmatch 'evkerk-chatkit\.js\?v=1') {
  throw 'Homepage ChatKit marker verification failed.'
}

$sermons = Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/sermons' -TimeoutSec 30
if ($sermons.StatusCode -ne 200 -or $sermons.Content -notmatch 'evkerk-chatkit\.js\?v=1') {
  throw 'Sermons ChatKit marker verification failed.'
}

$loader = Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/evkerk-chatkit.js?v=1' -TimeoutSec 30
if ($loader.StatusCode -ne 200 -or $loader.Content -notmatch 'agents\.zoho\.eu') {
  throw 'ChatKit loader verification failed.'
}

$admin = Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/admin' -TimeoutSec 30
if ($admin.Content -match 'evkerk-chatkit\.js\?v=1') {
  throw 'ChatKit must not be injected into /admin.'
}

Write-Host 'EVKERK_CHATKIT_RELEASE_OK'
