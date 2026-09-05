[CmdletBinding()]
param(
    [string]$Database = 'evkerk-website-db'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-PlainPassword {
    $secure = Read-Host 'Set the pastor login password (minimum 10 characters)' -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

Write-Host 'Applying pending D1 migrations...' -ForegroundColor Cyan
npx wrangler d1 migrations apply $Database --remote
if ($LASTEXITCODE -ne 0) {
    throw 'D1_MIGRATION_APPLY_FAILED'
}

$email = (Read-Host 'Recovery email address').Trim().ToLowerInvariant()
if ($email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    throw 'RECOVERY_EMAIL_INVALID'
}

$password = Read-PlainPassword
if ([string]::IsNullOrWhiteSpace($password) -or $password.Length -lt 10) {
    throw 'PASSWORD_TOO_SHORT'
}

$confirmSecure = Read-Host 'Enter the same password again' -AsSecureString
$confirmPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmSecure)
try {
    $confirm = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPtr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPtr)
}
if ($password -cne $confirm) {
    throw 'PASSWORD_CONFIRM_MISMATCH'
}

$iterations = 210000
$salt = New-Object byte[] 16
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $rng.GetBytes($salt)
} finally {
    $rng.Dispose()
}

$pbkdf = [System.Security.Cryptography.Rfc2898DeriveBytes]::new($password, $salt, $iterations, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
try {
    $passwordHashBytes = $pbkdf.GetBytes(32)
} finally {
    $pbkdf.Dispose()
}
$passwordHash = [Convert]::ToBase64String($passwordHashBytes)
$passwordSalt = [Convert]::ToBase64String($salt)

$legacyBytes = New-Object byte[] 32
$rng2 = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $rng2.GetBytes($legacyBytes)
} finally {
    $rng2.Dispose()
}
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
    $legacyHashBytes = $sha.ComputeHash($legacyBytes)
} finally {
    $sha.Dispose()
}
$legacyTokenHash = ($legacyHashBytes | ForEach-Object { $_.ToString('x2') }) -join ''

$password = $null
$confirm = $null
$emailSql = $email.Replace("'", "''")
$id = 'ADM-PASTOR'
$nameSql = 'char(29579,29287,24072)'

$sql = @"
INSERT INTO admin_users(id,name,email,role,token_hash,status,password_hash,password_salt,password_iterations,updated_at)
VALUES('$id',$nameSql,'$emailSql','owner','$legacyTokenHash','active','$passwordHash','$passwordSalt',$iterations,datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  name=$nameSql,
  email='$emailSql',
  role='owner',
  token_hash='$legacyTokenHash',
  status='active',
  password_hash='$passwordHash',
  password_salt='$passwordSalt',
  password_iterations=$iterations,
  updated_at=datetime('now');
"@

Write-Host 'Saving the pastor admin account (plaintext password is not uploaded)...' -ForegroundColor Cyan
npx wrangler d1 execute $Database --remote --command $sql
if ($LASTEXITCODE -ne 0) {
    throw 'D1_ADMIN_PASSWORD_UPDATE_FAILED'
}

Write-Host ''
Write-Host 'Pastor admin account configured.' -ForegroundColor Green
Write-Host 'Login name: use the Chinese account name shown on the site, or use the recovery email.'
Write-Host ("Recovery email: {0}" -f $email)
Write-Host 'Login URL: https://evkerk.nl/team/'
Write-Host ''
Write-Host 'For password recovery email delivery, verify this recovery email as a destination address in Cloudflare Email Service / Email Routing.' -ForegroundColor Yellow
