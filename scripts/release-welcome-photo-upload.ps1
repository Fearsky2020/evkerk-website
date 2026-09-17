$ErrorActionPreference='Stop'
$repo='C:\SINAN\evkerk-site'
Set-Location $repo

Write-Host '== EVKERK welcome photo upload: checks =='
npm run check
node --test tests/welcome-photo-json.test.mjs tests/group-recommendation.test.mjs tests/welcome-group-postcodes-complete.test.mjs

Write-Host '== Stage only welcome-photo files =='
git add -- package.json src/worker-enhanced-v2.js src/welcome-photo-json.js tests/welcome-photo-json.test.mjs scripts/release-welcome-photo-upload.ps1

$staged=git diff --cached --name-only
$expected=@(
  'package.json',
  'src/worker-enhanced-v2.js',
  'src/welcome-photo-json.js',
  'tests/welcome-photo-json.test.mjs',
  'scripts/release-welcome-photo-upload.ps1'
)
foreach($file in $staged){if($expected -notcontains $file){throw "Unexpected staged file: $file"}}

if($staged){
  Write-Host '== Commit and push =='
  git commit -m 'feat: complete app newcomer card photo upload'
  git push origin main
}else{
  Write-Host 'No new welcome-photo changes to commit; continuing with current HEAD.'
}

Write-Host '== Deploy =='
npx wrangler deploy

Write-Host '== Production verification =='
Start-Sleep -Seconds 5

# New iOS JSON photo route must exist and require authentication.
try {
  Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'https://evkerk.nl/api/app/welcome/submissions/test-request/photo-json' -ContentType 'application/json; charset=utf-8' -Body '{}' | Out-Null
  throw 'JSON photo route unexpectedly allowed unauthenticated upload.'
}catch{
  if($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401){
    Write-Host 'iOS JSON photo route: AUTH_REQUIRED_OK'
  }elseif($_.Exception.Message -eq 'JSON photo route unexpectedly allowed unauthenticated upload.'){
    throw
  }else{throw 'iOS JSON photo route verification failed.'}
}

# Existing multipart Android photo route must still exist and require authentication.
try {
  Invoke-WebRequest -UseBasicParsing -Method Post -Uri 'https://evkerk.nl/api/app/welcome/submissions/test-request/photos' | Out-Null
  throw 'Android photo route unexpectedly allowed unauthenticated upload.'
}catch{
  if($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401){
    Write-Host 'Android multipart photo route: AUTH_REQUIRED_OK'
  }elseif($_.Exception.Message -eq 'Android photo route unexpectedly allowed unauthenticated upload.'){
    throw
  }else{throw 'Android multipart photo route verification failed.'}
}

# Existing deterministic assistant sanity check.
$body='{"message":"\u4e0a\u4e2a\u793c\u62dc\u7684\u4fe1\u606f\u662f\u4ec0\u4e48\uff1f","history":[],"page":"/"}'
$assistant=Invoke-RestMethod -Method Post -Uri 'https://evkerk.nl/api/assistant/chat' -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
if(-not $assistant.ok -or [string]$assistant.context -ne 'sermons' -or [string]$assistant.provider -ne 'live-data'){throw 'Existing assistant sanity check failed.'}

Write-Host 'EVKERK_WELCOME_PHOTO_UPLOAD_RELEASE_OK'
Write-Host 'Android: multipart field=image'
Write-Host 'iOS: authenticated JSON photo upload route live'
Write-Host 'Idempotency: existing active photo reused'
Write-Host ('Assistant provider: '+$assistant.provider)
