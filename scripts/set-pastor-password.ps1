[CmdletBinding()]
param(
    [string]$Database = 'evkerk-website-db'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-PlainPassword {
    $secure = Read-Host '请设置王牧师登录密码（建议一条你自己记得住的短语，至少 10 个字符）' -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

$password = Read-PlainPassword
if ([string]::IsNullOrWhiteSpace($password) -or $password.Length -lt 10) {
    throw 'PASSWORD_TOO_SHORT: 请至少使用 10 个字符。可以是一句你自己记得住的短语。'
}

$confirmSecure = Read-Host '再输入一次确认密码' -AsSecureString
$confirmPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmSecure)
try {
    $confirm = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPtr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPtr)
}
if ($password -cne $confirm) {
    throw 'PASSWORD_CONFIRM_MISMATCH: 两次密码不一致。'
}

$sha = [System.Security.Cryptography.SHA256]::Create()
try {
    $hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($password))
} finally {
    $sha.Dispose()
}
$hash = ($hashBytes | ForEach-Object { $_.ToString('x2') }) -join ''
$password = $null
$confirm = $null

$id = 'ADM-PASTOR'
$sql = @"
INSERT INTO admin_users(id,name,email,role,token_hash,status,updated_at)
VALUES('$id','王牧师',NULL,'owner','$hash','active',datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  name='王牧师',
  role='owner',
  token_hash='$hash',
  status='active',
  updated_at=datetime('now');
"@

Write-Host '正在写入主管理员密码（只上传哈希，不上传明文）...' -ForegroundColor Cyan
npx wrangler d1 execute $Database --remote --command $sql
if ($LASTEXITCODE -ne 0) { throw 'D1_ADMIN_PASSWORD_UPDATE_FAILED' }

Write-Host ''
Write-Host '已设置完成。' -ForegroundColor Green
Write-Host '账号：王牧师'
Write-Host '密码：就是你刚才自己输入的那一个。'
Write-Host '登录地址：https://evkerk.nl/team/'
