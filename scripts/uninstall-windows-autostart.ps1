# Remove tarefa agendada e/ou atalho da Inicialização.

$ErrorActionPreference = 'Stop'
$taskName = 'FazendasUpProcessoDev'
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$shortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'Fazendas Up Dev.lnk'
Remove-Item -LiteralPath $shortcutPath -Force -ErrorAction SilentlyContinue

Write-Host "Removido: tarefa '$taskName' (se existia) e atalho 'Fazendas Up Dev.lnk' (se existia)." -ForegroundColor Green
