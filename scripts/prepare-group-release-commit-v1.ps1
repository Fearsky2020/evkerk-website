param(
  [string]$ExpectedBaseHead = 'ecef6e8da70ace567c1b8ea74dd4703921378e9e',
  [string]$CommitMessage = 'feat: complete group member and my-group release'
)

$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$Root='C:\SINAN\workspace\evkerk-login-fix'
$ManifestPath=Join-Path $Root 'docs\GROUP-SYSTEM-RELEASE-MANIFEST-2026-09-29.json'
$PreflightPath=Join-Path $Root '.sinan\qa\GROUP-SYSTEM-PREFLIGHT-V1.ps1'
Set-Location $Root

Write-Host '== EVKERK GROUP RELEASE COMMIT PREP V1 ==' -ForegroundColor Cyan
if(-not (Test-Path $ManifestPath)){ throw 'RELEASE_MANIFEST_MISSING' }
$manifest=Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json

Write-Host '[1/6] Preflight' -ForegroundColor Yellow
& $PreflightPath
if($LASTEXITCODE -ne 0){ throw 'PREFLIGHT_FAILED' }

Write-Host '[2/6] Branch and base HEAD' -ForegroundColor Yellow
$branch=(git branch --show-current).Trim()
if($LASTEXITCODE -ne 0){ throw 'GIT_BRANCH_FAILED' }
if($branch -ne 'feat/group-member-join-v1'){ throw ('UNEXPECTED_BRANCH:'+ $branch) }
$head=(git rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0){ throw 'GIT_HEAD_FAILED' }
if($head -ne $ExpectedBaseHead){ throw ('BASE_HEAD_CHANGED:'+ $head) }

Write-Host '[3/6] Validate worktree paths' -ForegroundColor Yellow
$status=@(git status --porcelain)
if($LASTEXITCODE -ne 0){ throw 'GIT_STATUS_FAILED' }
$allowed=@($manifest.allowedPaths)
$ignoredExact=@($manifest.ignoredDirtyPaths)
$ignoredPrefixes=@($manifest.ignoredDirtyPrefixes)
$stage=@()
$unexpected=@()
foreach($line in $status){
  if(-not $line){ continue }
  $p=($line.Substring([Math]::Min(3,$line.Length))).Trim().Replace('\','/')
  if($allowed -contains $p){ $stage+=$p; continue }
  $ignored=$ignoredExact -contains $p
  if(-not $ignored){
    foreach($prefix in $ignoredPrefixes){ if($p.StartsWith([string]$prefix)){ $ignored=$true; break } }
  }
  if(-not $ignored){ $unexpected+=$line }
}
if($unexpected.Count -gt 0){
  Write-Host 'Unexpected dirty paths:' -ForegroundColor Red
  $unexpected | ForEach-Object { Write-Host $_ }
  throw 'UNEXPECTED_DIRTY_PATHS'
}
$stage=@($stage | Sort-Object -Unique)
if($stage.Count -eq 0){ throw 'NO_RELEASE_FILES_TO_STAGE' }

Write-Host '[4/6] Stage exact allowlisted paths' -ForegroundColor Yellow
git reset
if($LASTEXITCODE -ne 0){ throw 'GIT_RESET_INDEX_FAILED' }
git add -- $stage
if($LASTEXITCODE -ne 0){ throw 'GIT_ADD_FAILED' }
$staged=@(git diff --cached --name-only | Where-Object { $_ -and $_.Trim() })
if($LASTEXITCODE -ne 0){ throw 'GIT_CACHED_DIFF_FAILED' }
$bad=@($staged | Where-Object { $allowed -notcontains $_ })
if($bad.Count -gt 0){ $bad | ForEach-Object { Write-Host $_ }; throw 'STAGED_PATH_OUTSIDE_ALLOWLIST' }
if($staged.Count -ne $stage.Count){
  Write-Host ('Expected stage count='+$stage.Count+', actual='+$staged.Count)
  throw 'STAGED_PATH_COUNT_MISMATCH'
}

Write-Host '[5/6] Commit locally only' -ForegroundColor Yellow
git commit -m $CommitMessage
if($LASTEXITCODE -ne 0){ throw 'GIT_COMMIT_FAILED' }
$newHead=(git rev-parse HEAD).Trim()

Write-Host '[6/6] Post-commit verify' -ForegroundColor Yellow
$changed=@(git diff --name-only $ExpectedBaseHead $newHead | Where-Object { $_ -and $_.Trim() })
$badCommit=@($changed | Where-Object { $allowed -notcontains $_ })
if($badCommit.Count -gt 0){ $badCommit | ForEach-Object { Write-Host $_ }; throw 'COMMIT_DIFF_OUTSIDE_ALLOWLIST' }

Write-Host ''
Write-Host 'GROUP_RELEASE_COMMIT_PREP=PASS' -ForegroundColor Green
Write-Host ('BASE_HEAD='+$ExpectedBaseHead)
Write-Host ('RELEASE_HEAD='+$newHead)
Write-Host ('FILES='+$changed.Count)
Write-Host 'PUSHED=NO'
Write-Host 'PRODUCTION_CHANGED=NO'