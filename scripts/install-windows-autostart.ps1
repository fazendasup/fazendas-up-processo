# Instala arranque ao login: tenta tarefa agendada; se der "Acesso negado", usa atalho na Inicialização (não precisa admin).

$ErrorActionPreference = 'Stop'
$taskName = 'FazendasUpProcessoDev'
$runScript = Join-Path $PSScriptRoot 'windows-autostart-run.ps1'
$projectRoot = Split-Path -Parent $PSScriptRoot
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Startup')) 'Fazendas Up Dev.lnk'

if (-not (Test-Path -LiteralPath $runScript)) {
  Write-Error "Arquivo não encontrado: $runScript"
  exit 1
}

$arg = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runScript`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

$usedTask = $false
try {
  Register-ScheduledTask `
    -TaskName $taskName `
    -Description 'Fazendas Up: sobe Docker (MySQL) e servidor de desenvolvimento ao iniciar sessão.' `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Force | Out-Null
  $usedTask = $true
}
catch {
  $msg = $_.Exception.Message
  if ($msg -notmatch 'Acesso negado|Access is denied|0x80070005|PermissionDenied') {
    throw
  }
  Write-Host "Tarefa agendada bloqueada (acesso negado). Usando atalho na pasta Inicialização…" -ForegroundColor Yellow
}

if ($usedTask) {
  Remove-Item -LiteralPath $shortcutPath -Force -ErrorAction SilentlyContinue
  Write-Host "Instalado: tarefa agendada '$taskName'." -ForegroundColor Green
  Write-Host "Testar: schtasks /Run /TN `"$taskName`"" -ForegroundColor DarkGray
}
else {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  $shell = New-Object -ComObject WScript.Shell
  $sc = $shell.CreateShortcut($shortcutPath)
  $sc.TargetPath = 'powershell.exe'
  $sc.Arguments = $arg
  $sc.WorkingDirectory = $projectRoot
  $sc.WindowStyle = 7
  $sc.Description = 'Fazendas Up — Docker + servidor dev ao iniciar sessão'
  $sc.Save()
  Write-Host "Instalado: atalho na Inicialização do usuário (sem administrador)." -ForegroundColor Green
  Write-Host "Atalho: $shortcutPath" -ForegroundColor DarkGray
}

Write-Host "Log: $env:TEMP\fazendas-up-autostart.log  |  Node: $env:TEMP\fazendas-up-dev.log" -ForegroundColor DarkGray
Write-Host "Remover: npm run autostart:uninstall" -ForegroundColor DarkGray
