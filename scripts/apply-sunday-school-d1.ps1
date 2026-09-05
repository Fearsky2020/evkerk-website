[CmdletBinding()]
param(
    [string]$Database = 'evkerk-website-db'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    Write-Host '== EVKERK Sunday School D1 migration ==' -ForegroundColor Cyan
    Write-Host "Repository: $repoRoot"
    Write-Host "Database:   $Database"

    $npx = Get-Command npx -ErrorAction Stop

    Write-Host "`n[1/4] Checking Cloudflare login..." -ForegroundColor Cyan
    & $npx.Source wrangler whoami
    if ($LASTEXITCODE -ne 0) {
        throw 'WRANGLER_NOT_AUTHENTICATED. Run this script from the Windows user account that can already deploy evkerk.nl.'
    }

    Write-Host "`n[2/4] Checking the D1 migration ledger..." -ForegroundColor Cyan
    $migrationOutput = (& $npx.Source wrangler d1 migrations list $Database --remote 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) {
        Write-Host $migrationOutput
        throw 'D1_MIGRATION_LIST_FAILED'
    }
    Write-Host $migrationOutput

    $oldPending = @()
    foreach ($number in 1..7) {
        $prefix = ('{0:D4}_' -f $number)
        if ($migrationOutput -match [regex]::Escape($prefix)) {
            $oldPending += $prefix
        }
    }
    if ($oldPending.Count -gt 0) {
        throw ("MIGRATION_LEDGER_NOT_READY: Wrangler reports old migrations as unapplied ({0}). Do not apply automatically." -f ($oldPending -join ', '))
    }

    $has0008 = $migrationOutput -match '0008_sunday_school\.sql'
    $has0009 = $migrationOutput -match '0009_sunday_school_course_studio\.sql'

    if ($has0008 -or $has0009) {
        Write-Host "`n[3/4] Applying pending Sunday School migrations..." -ForegroundColor Cyan
        & $npx.Source wrangler d1 migrations apply $Database --remote
        if ($LASTEXITCODE -ne 0) {
            throw 'D1_MIGRATION_APPLY_FAILED'
        }
    } else {
        Write-Host "`n[3/4] No Sunday School migrations are pending." -ForegroundColor Green
    }

    Write-Host "`n[4/4] Verifying production schema..." -ForegroundColor Cyan

    $tableSql = @"
SELECT COUNT(*) AS c
FROM sqlite_schema
WHERE type='table'
  AND name IN (
    'sunday_school_music',
    'sunday_school_lesson_pages',
    'sunday_school_schedule_pages',
    'sunday_school_generation_requests'
  );
"@
    $tableJson = (& $npx.Source wrangler d1 execute $Database --remote --command $tableSql --json | Out-String)
    if ($LASTEXITCODE -ne 0) { throw 'D1_TABLE_VERIFY_FAILED' }
    $tableResult = $tableJson | ConvertFrom-Json
    $tableCount = [int]$tableResult[0].results[0].c
    if ($tableCount -ne 4) {
        throw "D1_TABLE_VERIFY_FAILED: expected 4 course-studio tables, found $tableCount"
    }

    $columnSql = @"
SELECT COUNT(*) AS c
FROM pragma_table_info('sunday_school_lessons')
WHERE name IN ('source','generation_id','approved_by','approved_at');
"@
    $columnJson = (& $npx.Source wrangler d1 execute $Database --remote --command $columnSql --json | Out-String)
    if ($LASTEXITCODE -ne 0) { throw 'D1_COLUMN_VERIFY_FAILED' }
    $columnResult = $columnJson | ConvertFrom-Json
    $columnCount = [int]$columnResult[0].results[0].c
    if ($columnCount -ne 4) {
        throw "D1_COLUMN_VERIFY_FAILED: expected 4 lesson AI columns, found $columnCount"
    }

    $remaining = (& $npx.Source wrangler d1 migrations list $Database --remote 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0) { throw 'D1_FINAL_MIGRATION_LIST_FAILED' }
    if ($remaining -match '0008_sunday_school\.sql' -or $remaining -match '0009_sunday_school_course_studio\.sql') {
        Write-Host $remaining
        throw 'D1_SUNDAY_SCHOOL_MIGRATIONS_STILL_PENDING'
    }

    Write-Host "`nSunday School D1 schema is ready." -ForegroundColor Green
} finally {
    Pop-Location
}
