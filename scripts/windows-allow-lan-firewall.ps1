# Libera entrada TCP na porta do dev (padrao 3456) para acessar pelo IP na rede local.
# Execute no PowerShell COMO ADMINISTRADOR: npm run dev:firewall

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$port = 3456
if ($env:PORT -match '^\d+$') { $port = [int]$env:PORT }
$envFile = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $envFile) {
  foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^\s*PORT\s*=\s*(\d+)\s*$') { $port = [int]$Matches[1]; break }
  }
}

$ruleName = "Fazendas Up Dev TCP $port"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Regra ja existe: $ruleName" -ForegroundColor DarkGray
  exit 0
}

try {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port | Out-Null
}
catch {
  Write-Error "Falhou (precisa de PowerShell como Administrador). Detalhe: $($_.Exception.Message)"
  exit 1
}
Write-Host "Firewall: entrada TCP $port liberada ($ruleName)." -ForegroundColor Green
Write-Host "Teste no celular: http://<IPv4-do-PC>:$port/ (URLs LAN aparecem ao subir o servidor)." -ForegroundColor DarkGray
