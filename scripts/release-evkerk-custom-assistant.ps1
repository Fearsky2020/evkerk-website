$ErrorActionPreference = 'Stop'
$repo = 'C:\SINAN\evkerk-site'
Set-Location $repo

Write-Host '== EVKERK custom assistant: checks =='
npm run check
node --test tests/assistant-chat.test.mjs

Write-Host '== Stage only custom-assistant files =='
git add -- package.json wrangler.toml src/worker-chatkit.js src/assistant-chat.js public/evkerk-assistant.js tests/assistant-chat.test.mjs scripts/release-evkerk-custom-assistant.ps1

$staged = git diff --cached --name-only
$expected = @(
  'package.json',
  'wrangler.toml',
  'src/worker-chatkit.js',
  'src/assistant-chat.js',
  'public/evkerk-assistant.js',
  'tests/assistant-chat.test.mjs',
  'scripts/release-evkerk-custom-assistant.ps1'
)
foreach ($file in $staged) {
  if ($expected -notcontains $file) { throw "Unexpected staged file: $file" }
}

if (-not $staged) { throw 'No custom-assistant changes staged.' }

Write-Host '== Commit and push =='
git commit -m 'fix: make EVKERK assistant answers deterministic for live facts'
git push origin main

Write-Host '== Deploy =='
npx wrangler deploy

Write-Host '== Production verification =='
Start-Sleep -Seconds 5
$html = (Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/').Content
if ($html -notmatch '/evkerk-assistant\.js\?v=1') { throw 'Custom assistant script is not injected on homepage.' }
if ($html -match '/evkerk-chatkit\.js\?v=2') { throw 'Old Zoho ChatKit injection is still present.' }

$live = Invoke-RestMethod -Method Get -Uri 'https://evkerk.nl/api/assistant/live?kind=sermons&limit=1'
if (-not $live.ok) { throw 'Live assistant data endpoint failed.' }
if (-not $live.sermons -or $live.sermons.Count -lt 1) { throw 'No live sermon returned.' }

$payload = @{
  message = '上个礼拜的信息是什么？'
  history = @()
  page = '/'
} | ConvertTo-Json -Depth 5
$payloadBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
$chat = Invoke-RestMethod -Method Post -Uri 'https://evkerk.nl/api/assistant/chat' -ContentType 'application/json; charset=utf-8' -Body $payloadBytes
if (-not $chat.ok) { throw 'Custom assistant chat endpoint failed.' }
if ([string]::IsNullOrWhiteSpace([string]$chat.answer)) { throw 'Custom assistant returned an empty answer.' }
if ([string]$chat.provider -ne 'live-data') { throw ("Expected live-data provider, got: " + [string]$chat.provider) }
$expectedTitle = [string]$live.sermons[0].title_zh
if ($expectedTitle -and ([string]$chat.answer -notlike ('*' + $expectedTitle + '*'))) {
  throw 'Assistant answer did not contain the current live sermon title.'
}

Write-Host 'EVKERK_CUSTOM_ASSISTANT_RELEASE_OK'
Write-Host ("Provider: " + $chat.provider)
Write-Host ("Model: " + $chat.model)
Write-Host ("Answer: " + $chat.answer)
