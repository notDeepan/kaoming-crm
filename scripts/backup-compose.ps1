param()

$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backupDir = Join-Path $project 'backup'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$name = "kaoming-$stamp.dump"
$partialName = "$name.partial"
$partialPath = Join-Path $backupDir $partialName
$finalPath = Join-Path $backupDir $name

Push-Location $project
$stopAttempted = $false
try {
  $stopAttempted = $true
  docker compose stop app jobs
  if ($LASTEXITCODE -ne 0) { throw 'Could not stop the app and job worker for backup' }
  docker compose exec -T postgres pg_dump -U kaoming -d kaoming --format=custom --file="/backup/$partialName"
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed' }
  if (-not (Test-Path -LiteralPath $partialPath)) { throw 'Backup file was not created' }
  if ((Get-Item -LiteralPath $partialPath).Length -eq 0) { throw 'Backup file is empty' }
  Move-Item -LiteralPath $partialPath -Destination $finalPath
  $hash = (Get-FileHash -LiteralPath $finalPath -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $name" | Set-Content -LiteralPath (Join-Path $backupDir "$name.sha256") -Encoding ascii
  Write-Output "Backup created: $finalPath"
} finally {
  $restartFailed = $false
  if ($stopAttempted) {
    docker compose up -d app jobs
    $restartFailed = $LASTEXITCODE -ne 0
  }
  Pop-Location
  if (Test-Path -LiteralPath $partialPath) { Remove-Item -LiteralPath $partialPath }
  if ($restartFailed) { throw 'App or jobs did not restart; check docker compose ps and logs' }
}
