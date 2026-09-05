[CmdletBinding()]
param(
    [string]$Database = 'evkerk-website-db'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-PlainPassword {
    $secure = Read-Host '请设置王牧师登录密码（建议一条自己记得住的短语，至少 10 个字符）' -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

Write-Host '正在确认数据库迁移...' -ForegroundColor Cyan
npx wrangler d1 migrations apply $Database --remote
if ($LASTEXITCODE -ne 0) { throw 'D1_MIGRATION_APPLY_FAILED' }

$email = (Read-Host '请输入找回邮箱（忘记密码时重置链接发到这里）').Trim().ToLowerInvariant()
if ($email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    throw 'RECOVERY_EMAIL_INVALID: 找回邮箱格式不正确。'
}

$password = Read-PlainPassword
if ([string]::IsNullOrWhiteSpace($password) -or $password.Length -lt 10) {
    throw 'PASSWORD_TOO_SHORT: 请至少使用 10 个字符。可以是一句自己记得住的短语。'
}
$confirmSecure = Read-Host '再输入一次确认密码' -AsSecureString
$confirmPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmSecure)
try { $confirm = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPtr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPtr) }
if ($password -cne $confirm) { throw 'PASSWORD_CONFIRM_MISMATCH: 两次密码不一致。' }

$iterations = 210000
$salt = New-Object byte[] 16
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($salt) } finally { $rng.Dispose() }
$pbkdf = [System.Security.Cryptography.Rfc2898DeriveBytes]::new($password,$salt,$iterations,[System.Security.Cryptography.HashAlgorithmName]::SHA256)
try { $passwordHashBytes = $pbkdf.GetBytes(32) } finally { $pbkdf.Dispose() }
$passwordHash = [Convert]::ToBase64String($passwordHashBytes)
$passwordSalt = [Convert]::ToBase64String($salt)

$legacyBytes = New-Object byte[] 32
$rng2 = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng2.GetBytes($legacyBytes) } finally { $rng2.Dispose() }
$sha = [System.Security.Cryptography.SHA256]::Create()
try { $legacyHashBytes = $sha.ComputeHash($legacyBytes) } finally { $sha.Dispose() }
$legacyTokenHash = ($legacyHashBytes | ForEach-Object { $_.ToString('x2') }) -join ''

$password = $null
$confirm = $null
$emailSql = $email.Replace("'","''")
$id = 'ADM-PASTOR'
$sql = @"
INSERT INTO admin_users(id,name,email,role,token_hash,status,password_hash,password_salt,password_iterations,updated_at)
VALUES('$id','王牧师','$emailSql','owner','$legacyTokenHash','active','$passwordHash','$passwordSalt',$iterations,datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  name='王牧师',
  email='$emailSql',
  role='owner',
  token_hash='$legacyTokenHash',
  status='active',
  password_hash='$passwordHash',
  password_salt='$passwordSalt',
  password_iterations=$iterations,
  updated_at=datetime('now');
"@

Write-Host '正在写入主管理员账号（明文密码不会上传）...' -ForegroundColor Cyan
npx wrangler d1 execute $Database --remote --command $sql
if ($LASTEXITCODE -ne 0) { throw 'D1_ADMIN_PASSWORD_UPDATE_FAILED' }

Write-Host ''
Write-Host '已设置完成。' -ForegroundColor Green
Write-Host '账号：王牧师'
Write-Host "找回邮箱：$email"
Write-Host '密码：就是你刚才自己输入的那个。'
Write-Host '登录地址：https://evkerk.nl/team/'
Write-Host ''
Write-Host '提示：为了让忘记密码邮件真正送达，这个找回邮箱需要在 Cloudflare Email Service / Email Routing 中验证为 destination address。' -ForegroundColor Yellow
