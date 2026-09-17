$ErrorActionPreference = 'Stop'
$repo = 'C:\SINAN\evkerk-site'
Set-Location $repo

Write-Host '== EVKERK assistant + Bible smart search: checks =='
npm run check
node --test tests/assistant-chat.test.mjs tests/assistant-chat-v2.test.mjs tests/bible-ai-entry.test.mjs

Write-Host '== Stage only assistant files =='
git add -- package.json src/worker-chatkit.js src/assistant-chat-v2.js tests/assistant-chat-v2.test.mjs tests/bible-ai-entry.test.mjs public/evkerk-bible-ai-entry.js scripts/release-evkerk-custom-assistant.ps1

$staged = git diff --cached --name-only
$expected = @(
  'package.json',
  'src/worker-chatkit.js',
  'src/assistant-chat-v2.js',
  'tests/assistant-chat-v2.test.mjs',
  'tests/bible-ai-entry.test.mjs',
  'public/evkerk-bible-ai-entry.js',
  'scripts/release-evkerk-custom-assistant.ps1'
)
foreach ($file in $staged) {
  if ($expected -notcontains $file) { throw "Unexpected staged file: $file" }
}

if ($staged) {
  Write-Host '== Commit and push =='
  git commit -m 'feat: add Bible smart search entry and safer assistant routing'
  git push origin main
} else {
  Write-Host 'No new assistant changes to commit; continuing with current HEAD.'
}

Write-Host '== Deploy =='
npx wrangler deploy

Write-Host '== Production verification =='
Start-Sleep -Seconds 5
$homeHtml = (Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/').Content
if ($homeHtml -notmatch '/evkerk-assistant\.js\?v=1') { throw 'Custom assistant script is not injected on homepage.' }
$bibleHtml = (Invoke-WebRequest -UseBasicParsing -Uri 'https://evkerk.nl/bible').Content
if ($bibleHtml -notmatch '/evkerk-bible-ai-entry\.js\?v=1') { throw 'Bible smart-search entry script is not injected.' }

function Post-AsciiJson([string]$Body) {
  return Invoke-RestMethod -Method Post -Uri 'https://evkerk.nl/api/assistant/chat' -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($Body))
}

$sermon = Post-AsciiJson '{"message":"\u4e0a\u4e2a\u793c\u62dc\u7684\u4fe1\u606f\u662f\u4ec0\u4e48\uff1f","history":[],"page":"/"}'
if (-not $sermon.ok -or [string]$sermon.provider -ne 'live-data' -or [string]$sermon.context -ne 'sermons') {
  throw 'Live sermon verification failed.'
}

$wilderness = Post-AsciiJson '{"message":"\u4ee5\u8272\u5217\u4eba\u4e3a\u4ec0\u4e48\u5728\u65f7\u91ce\u6d41\u6d6a\uff1f","history":[],"page":"/"}'
if (-not $wilderness.ok -or [string]$wilderness.context -ne 'bible' -or [string]$wilderness.provider -ne 'bible-facts') {
  throw 'Bible routing verification failed.'
}
if ([string]$wilderness.answer -notmatch '14:26') { throw 'Wilderness answer did not cite Numbers 14.' }

$loaves = Post-AsciiJson '{"message":"\u4e94\u997c\u4e8c\u9c7c\u5728\u54ea\u91cc\uff1f","history":[],"page":"/"}'
if (-not $loaves.ok -or [string]$loaves.context -ne 'bible') { throw 'Five-loaves question did not route to Bible context.' }

$cap = Post-AsciiJson '{"message":"\u4f60\u80fd\u7ed9\u6211\u4ec0\u4e48","history":[],"page":"/"}'
if (-not $cap.ok -or [string]$cap.context -ne 'capabilities' -or [string]$cap.provider -ne 'live-data') {
  throw 'Capability answer verification failed.'
}
if ([string]$cap.answer -match '\*\*') { throw 'Capability answer still contains Markdown bold markers.' }

$crisis = Post-AsciiJson '{"message":"\u6211\u60f3\u81ea\u6740","history":[],"page":"/"}'
if (-not $crisis.ok -or [string]$crisis.context -ne 'safety' -or [string]$crisis.provider -ne 'safety-guidance') {
  throw 'Suicide-crisis routing verification failed.'
}
if ([string]$crisis.answer -notmatch '112') { throw 'Crisis answer is missing 112.' }
if ([string]$crisis.answer -notmatch '0800-0113') { throw 'Crisis answer is missing 0800-0113.' }
if ([string]$crisis.answer -notmatch '113\.nl') { throw 'Crisis answer is missing 113.nl.' }
if ([string]$crisis.answer -match '\*\*|\[[^\]]+\]\(') { throw 'Crisis answer contains Markdown markers.' }

Write-Host 'EVKERK_ASSISTANT_BIBLE_SMART_SEARCH_RELEASE_OK'
Write-Host ('Sermon provider: ' + $sermon.provider)
Write-Host ('Bible provider: ' + $wilderness.provider)
Write-Host ('Five-loaves context: ' + $loaves.context)
Write-Host ('Capability provider: ' + $cap.provider)
Write-Host ('Crisis provider: ' + $crisis.provider)
