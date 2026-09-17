$ErrorActionPreference='Stop'
Set-Location 'C:\SINAN\evkerk-site'
Write-Host 'EVKERK_PUBLIC_HYMNS_RELEASE_START'
& node --check .\src\public-hymns.js
if($LASTEXITCODE-ne0){throw 'public-hymns syntax failed'}
& npm.cmd test
if($LASTEXITCODE-ne0){throw 'tests failed'}
& git add -- src/public-hymns.js src/worker-enhanced.js tests/public-hymns-api.test.mjs scripts/release-public-hymns-api.ps1
if($LASTEXITCODE-ne0){throw 'git add failed'}
$staged=& git diff --cached --name-only
if($staged){& git commit -m 'feat: expose public hymn library API';if($LASTEXITCODE-ne0){throw 'commit failed'}}else{Write-Host 'No new commit needed'}
& git push origin main
if($LASTEXITCODE-ne0){throw 'push failed'}
& npx.cmd --yes wrangler deploy
if($LASTEXITCODE-ne0){throw 'deploy failed'}
Start-Sleep -Seconds 3
$catalog=Invoke-RestMethod -Uri 'https://evkerk.nl/api/hymns' -Method Get -TimeoutSec 30
if(-not $catalog.ok){throw 'catalog not ok'}
if([int]$catalog.count-ne151){throw "expected 151 hymns, got $($catalog.count)"}
$indexes=@(0,74,106,150)
foreach($i in $indexes){$h=$catalog.hymns[$i];if(-not $h.video_url){throw "missing video_url at index $i"};Write-Host ("CHECK {0:D3}: {1}" -f [int]$h.no,$h.title_zh);$probeUrl='https://evkerk.nl'+$h.video_url;$headers=& curl.exe -sS -r 0-0 -D - -o NUL $probeUrl;if($LASTEXITCODE-ne0){throw "range probe failed for $($h.no)"};$headerText=$headers -join "`n";if($headerText-notmatch '206 Partial Content'){throw "stream did not return 206 for $($h.no)"};if($headerText-notmatch 'Content-Type:\s*video/mp4'){throw "content-type mismatch for $($h.no)"}}
Write-Host 'EVKERK_PUBLIC_HYMNS_RELEASE_OK'
