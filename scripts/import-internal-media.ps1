param(
  [Parameter(Mandatory=$true)][string]$File,
  [Parameter(Mandatory=$true)][string]$Id,
  [Parameter(Mandatory=$true)][string]$TitleZh,
  [string]$TitleNl = '',
  [string]$Category = 'hymn',
  [int]$SortOrder = 100,
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not (Test-Path -LiteralPath $File -PathType Leaf)) { throw "File not found: $File" }
if ($Id -notmatch '^[a-z0-9][a-z0-9-]{1,80}$') { throw 'Id must use lowercase letters, numbers and hyphens.' }
$ext = [IO.Path]::GetExtension($File).ToLowerInvariant()
$types = @{
  '.mp4'='video/mp4'; '.webm'='video/webm'; '.m4v'='video/x-m4v'
  '.mp3'='audio/mpeg'; '.m4a'='audio/mp4'; '.wav'='audio/wav'
}
if (-not $types.ContainsKey($ext)) { throw "Unsupported media extension: $ext" }
$contentType = $types[$ext]
$r2Key = "internal-hymns/reference/$Id$ext"
$objectPath = "evkerk-website-media/$r2Key"
if ($DryRun) {
  Write-Host "DRY RUN" -ForegroundColor Yellow
  Write-Host "File: $File"
  Write-Host "Id: $Id"
  Write-Host "Title: $TitleZh"
  Write-Host "R2: $objectPath"
  Write-Host "MIME: $contentType"
  exit 0
}
Write-Host "Uploading $File -> $objectPath" -ForegroundColor Cyan
& npx.cmd wrangler r2 object put $objectPath --file $File --content-type $contentType --remote -y
if ($LASTEXITCODE -ne 0) { throw 'R2 upload failed.' }
function Sql([string]$value) { return "'" + $value.Replace("'","''") + "'" }
$filename = [IO.Path]::GetFileName($File)
$sql = @"
INSERT INTO internal_media
  (id,category,title_zh,title_nl,r2_key,mime_type,filename,status,sort_order,updated_at)
VALUES
  ($(Sql $Id),$(Sql $Category),$(Sql $TitleZh),$(Sql $TitleNl),$(Sql $r2Key),$(Sql $contentType),$(Sql $filename),'active',$SortOrder,datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  category=excluded.category,title_zh=excluded.title_zh,title_nl=excluded.title_nl,
  r2_key=excluded.r2_key,mime_type=excluded.mime_type,filename=excluded.filename,
  status='active',sort_order=excluded.sort_order,updated_at=datetime('now');
"@
Write-Host "Registering $Id in D1" -ForegroundColor Cyan
& npx.cmd wrangler d1 execute evkerk-website-db --remote --command $sql
if ($LASTEXITCODE -ne 0) { throw "D1 registration failed. R2 object remains at $r2Key for manual recovery." }
Write-Host "Imported: $TitleZh ($Id)" -ForegroundColor Green
Write-Host "Private API: /api/internal-media/hymns/$Id" -ForegroundColor DarkGray
