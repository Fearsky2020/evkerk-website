$ErrorActionPreference = 'Stop'
$repo = 'C:\SINAN\evkerk-site'
Set-Location $repo

Write-Host '== EVKERK custom assistant: checks =='
npm run check
node --test tests/assistant-chat.test.mjs tests/assistant-chat-v2.test.mjs

Write-Host '== Stage only custom-assistant files =='
git add -- package.json src/worker-chatkit.js src/assistant-chat-v2.js tests/assistant-chat-v2.test.mjs scripts/release-evkerk-custom-assistant.ps1

$staged = git diff --cached --name-only
$expected = @(
  'package.json',
  'src/worker-chatkit.js',
  'src/assistant-chat-v2.js',
  'tests/assistant-chat-v2.test.mjs',
  'scripts/release-evkerk-custom-assistant.ps1'
)
foreach ($file in $staged) {
  if ($expected -notcontains $file) { throw "Unexpected staged file: $file" }
}
if (-not $staged) { throw 'No custom-assistant changes staged.' }

Write-Host '== Commit and push =='
git commit -m 'fix: improve EVKERK assistant Bible routing and plain-text replies'
git push origin main

Write-Host '== Deploy =='
npx wrangler deploy

Write-Host '== Production verification =='
Start-Sleep -Seconds 5
$html = (Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/').Content
if ($html -notmatch '/evkerk-assistant\.js\?v=1') { throw 'Custom assistant script is not injected on homepage.' }

# Pure-ASCII JSON bodies: Windows PowerShell 5 must not corrupt Chinese test text.
$sermonBody = '{"message":"\u4e0a\u4e2a\u793c\u62dc\u7684\u4fe1\u606f\u662f\u4ec0\u4e48\uff1f","history":[],"page":"/"}'
$sermon = Invoke-RestMethod -Method Post -Uri 'https://evkerk.nl/api/assistant/chat' -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($sermonBody))
if (-not $sermon.ok -or [string]$sermon.provider -ne 'live-data' -or [string]$sermon.context -ne 'sermons') {
  throw 'Live sermon verification failed.'
}

$wildernessBody = '{"message":"\u4ee5\u8272\u5217\u4eba\u4e3a\u4ec0\u4e48\u5728\u65f7\u91ce\u6d41\u6d6a\uff1f","history":[],"page":"/"}'
$wilderness = Invoke-RestMethod -Method Post -Uri 'https://evkerk.nl/api/assistant/chat' -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($wildernessBody))
if (-not $wilderness.ok -or [string]$wilderness.context -ne 'bible' -or [string]$wilderness.provider -ne 'bible-facts') {
  throw 'Bible routing verification failed.'
}
if ([string]$wilderness.answer -notmatch '14:26') { throw 'Wilderness answer did not cite Numbers 14.' }
if ([string]$wilderness.answer -match '预备发旺') { throw 'Wilderness answer incorrectly used latest sermon.' }

$capBody = '{"message":"\u4f60\u80fd\u7ed9\u6211\u4ec0\u4e48","history":[],"page":"/"}'
$cap = Invoke-RestMethod -Method Post -Uri 'https://evkerk.nl/api/assistant/chat' -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($capBody))
if (-not $cap.ok -or [string]$cap.context -ne 'capabilities' -or [string]$cap.provider -ne 'live-data') {
  throw 'Capability answer verification failed.'
}
if ([string]$cap.answer -match '\*\*') { throw 'Capability answer still contains Markdown bold markers.' }

Write-Host 'EVKERK_CUSTOM_ASSISTANT_RELEASE_OK'
Write-Host ('Sermon provider: ' + $sermon.provider)
Write-Host ('Bible provider: ' + $wilderness.provider)
Write-Host ('Capability provider: ' + $cap.provider)
Write-Host ('Bible answer: ' + $wilderness.answer)
