param()

$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envPath = Join-Path $project '.env.local'
$dump = Join-Path $project '.local/postgresql16/bin/pg_dump.exe'
if (-not (Test-Path -LiteralPath $dump)) { throw 'Workspace-local PostgreSQL pg_dump.exe is missing' }
if (-not (Test-Path -LiteralPath $envPath)) { throw '.env.local is missing' }
$databaseLine = Get-Content -LiteralPath $envPath | Where-Object { $_ -like 'DATABASE_URL=*' } | Select-Object -First 1
if (-not $databaseLine) { throw 'DATABASE_URL is missing from .env.local' }
$uri = [Uri]$databaseLine.Substring(13)
if ($uri.Scheme -notin @('postgres', 'postgresql') -or $uri.Host -notin @('localhost', '127.0.0.1')) {
  throw 'This script only backs up the local PostgreSQL instance'
}
$separator = $uri.UserInfo.IndexOf(':')
if ($separator -lt 1) { throw 'DATABASE_URL needs a username and password' }
$database = $uri.AbsolutePath.TrimStart('/')
if ($database -notin @('kaoming', 'kaoming_live')) {
  throw 'This script only backs up the local demo or live CRM database'
}
$username = [Uri]::UnescapeDataString($uri.UserInfo.Substring(0, $separator))
$password = [Uri]::UnescapeDataString($uri.UserInfo.Substring($separator + 1))
$port = if ($uri.IsDefaultPort) { 5432 } else { $uri.Port }
$backupDir = Join-Path $project 'backup'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$label = if ($database -eq 'kaoming_live') { 'live' } else { 'demo' }
$name = "kaoming-$label-$stamp.dump"
$partialPath = Join-Path $backupDir "$name.partial"
$finalPath = Join-Path $backupDir $name
if ((Test-Path -LiteralPath $partialPath) -or (Test-Path -LiteralPath $finalPath)) {
  throw 'A backup with this timestamp already exists'
}

$previousPgPassword = [Environment]::GetEnvironmentVariable('PGPASSWORD', 'Process')
$env:PGPASSWORD = $password
try {
  & $dump -h $uri.Host -p $port -U $username -d $database --format=custom --file=$partialPath
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed' }
  if ((Get-Item -LiteralPath $partialPath).Length -eq 0) { throw 'Backup file is empty' }
  Move-Item -LiteralPath $partialPath -Destination $finalPath
  $hash = (Get-FileHash -LiteralPath $finalPath -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $name" | Set-Content -LiteralPath (Join-Path $backupDir "$name.sha256") -Encoding ascii
  Write-Output "Local backup created: $finalPath"
} finally {
  if ($null -eq $previousPgPassword) {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  } else {
    $env:PGPASSWORD = $previousPgPassword
  }
  if (Test-Path -LiteralPath $partialPath) { Remove-Item -LiteralPath $partialPath }
}
