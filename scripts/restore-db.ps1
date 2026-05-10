# Restaura um ficheiro .sql (ex.: backup de mysqldump) na base definida por DATABASE_URL.
# AVISO: apaga/reescreve dados conforme o conteúdo do dump. Faça backup antes.
# Uso: .\scripts\restore-db.ps1 -SqlFile C:\caminho\backup_pre_projetos_xxx.sql
# Requer mysql no PATH (cliente MySQL).

param(
  [Parameter(Mandatory = $true)]
  [string]$SqlFile,
  [string]$ConnectionString = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $SqlFile)) {
  Write-Error "Ficheiro não encontrado: $SqlFile"
}
if (-not $ConnectionString) {
  Write-Error "Defina DATABASE_URL ou passe -ConnectionString"
}

$u = [Uri]$ConnectionString.Replace("mysql://", "http://")
$userInfo = $u.UserInfo -split ":"
$user = $userInfo[0]
$pass = $userInfo[1]
$hostName = $u.Host
$port = if ($u.Port -ne -1) { $u.Port } else { 3306 }
$db = $u.AbsolutePath.TrimStart("/").Split("?")[0]

Write-Host "A importar para $hostName`:$port / $db (a partir de $SqlFile)..."
Get-Content -LiteralPath $SqlFile -Raw | & mysql -h $hostName -P $port -u $user -p$pass --default-character-set=utf8mb4 $db
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Concluído. Reinicie a API e, se necessário, execute pnpm db:migrate."
