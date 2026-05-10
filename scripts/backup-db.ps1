# Etapa 0 do doc multi-projeto: backup MySQL antes de migrações (Windows / PowerShell).
# Uso: defina $env:DATABASE_URL ou passe -ConnectionString. Requer mysqldump no PATH ou cliente MySQL instalado.
param(
  [string]$OutDir = ".",
  [string]$ConnectionString = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"
if (-not $ConnectionString) {
  Write-Error "Defina DATABASE_URL ou passe -ConnectionString (ex.: mysql://user:pass@127.0.0.1:3306/dbname)"
}

# Extrai base do URL mysql:// (simplificado; senha sem caracteres especiais problemáticos)
$u = [Uri]$ConnectionString.Replace("mysql://", "http://")
$userInfo = $u.UserInfo -split ":"
$user = $userInfo[0]
$pass = $userInfo[1]
$hostName = $u.Host
$port = if ($u.Port -ne -1) { $u.Port } else { 3306 }
$db = $u.AbsolutePath.TrimStart("/").Split("?")[0]

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outFile = Join-Path $OutDir "backup_pre_projetos_$stamp.sql"

Write-Host "A gravar: $outFile"
& mysqldump -h $hostName -P $port -u $user -p$pass --single-transaction --routines --triggers $db | Out-File -FilePath $outFile -Encoding utf8
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Get-Item $outFile | Format-List Name, Length, LastWriteTime
