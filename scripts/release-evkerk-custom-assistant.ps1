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
git commit -m 'chore: release EVKERK assistant updates'
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

# Keep this verification payload ASCII-only so Windows PowerShell 5 cannot corrupt CJK text.
$payloadAscii = '{"message":"\u4e0a\u4e2a\u793c\u62dc\u7684\u4fe1\u606f\u662f\u4ec0\u4e48\uff1f","history":[],"page":"/"}'
$payloadBytes = [System.Text.Encoding]::UTF8.GetBytes($payloadAscii)
$chat = Invoke-RestMethod -Method Post -Uri 'https://evkerk.nl/api/assistant/chat' -ContentType 'application/json; charset=utf-8' -Body $payloadBytes
if (-not $chat.ok) { throw 'Custom assistant chat endpoint failed.' }
if ([string]::IsNullOrWhiteSpace([string]$chat.answer)) { throw 'Custom assistant returned an empty answer.' }
if ([string]$chat.context -ne 'sermons') { throw ("Expected sermons context, got: " + [string]$chat.context) }
if ([string]$chat.provider -ne 'live-data') { throw ("Expected live-data provider, got: " + [string]$chat.provider) }
if ([string]$chat.model -ne 'deterministic') { throw ("Expected deterministic model, got: " + [string]$chat.model) }
if ([string]$chat.answer -notmatch 'SERMON-20260913-FW19') {
  throw 'Assistant answer did not contain the current sermon link/id.'
}

Write-Host 'EVKERK_CUSTOM_ASSISTANT_RELEASE_OK'
Write-Host ("Provider: " + $chat.provider)
Write-Host ("Model: " + $chat.model)
Write-Host ("Answer: " + $chat.answer)
