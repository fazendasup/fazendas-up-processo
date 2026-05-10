# Arranque automático — sobe MySQL (Docker) e servidor dev.
# Tarefa: FazendasUpProcessoDev. Log: %TEMP%\fazendas-up-autostart.log
# Saída do Node: %TEMP%\fazendas-up-dev.log

$ErrorActionPreference = 'Stop'
$env:NODE_NO_WARNINGS = '1'
$env:npm_config_update_notifier = 'false'
$env:CI = 'true'

$root = Split-Path -Parent $PSScriptRoot
$log = Join-Path $env:TEMP 'fazendas-up-autostart.log'
$devLog = Join-Path $env:TEMP 'fazendas-up-dev.log'

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $log -Value $line -Encoding UTF8
}

function Initialize-FullUserPath {
  try {
    $m = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $u = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($m -and $u) { $env:Path = "$m;$u" }
    elseif ($m) { $env:Path = $m }
    elseif ($u) { $env:Path = $u }
  } catch { }
}

function Find-NodeExe {
  $cmd = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  $pf86 = [Environment]::GetFolderPath('ProgramFilesX86')
  foreach ($p in @(
      (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
      (Join-Path $pf86 'nodejs\node.exe'),
      (Join-Path $env:LocalAppData 'Programs\node\node.exe')
    )) {
    if ($p -and (Test-Path -LiteralPath $p)) { return $p }
  }
  return $null
}

function Find-DockerExe {
  $cmd = Get-Command docker.exe -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  foreach ($p in @(
      'C:\Program Files\Docker\Docker\resources\bin\docker.exe',
      (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe')
    )) {
    if (Test-Path -LiteralPath $p) { return $p }
  }
  return $null
}

function Invoke-DockerInfo([string]$dockerExe) {
  $out = [IO.Path]::GetTempFileName()
  $err = [IO.Path]::GetTempFileName()
  try {
    $p = Start-Process -FilePath $dockerExe -ArgumentList @('info') -Wait -PassThru -NoNewWindow `
      -RedirectStandardOutput $out -RedirectStandardError $err
    return $p.ExitCode
  } finally {
    Remove-Item -LiteralPath $out, $err -ErrorAction SilentlyContinue
  }
}

try {
  Write-Log '--- execução iniciada ---'
  Initialize-FullUserPath
  Write-Log ("PATH (resumo): " + ($env:Path -split ';' | Select-Object -First 6) -join ' | ')

  $delaySec = 30
  if ($env:FAZENDASUP_AUTOSTART_DELAY_SEC -match '^\d+$') { $delaySec = [int]$env:FAZENDASUP_AUTOSTART_DELAY_SEC }
  Write-Log "Aguardando ${delaySec}s (sessão / Docker)..."
  Start-Sleep -Seconds $delaySec

  Set-Location -LiteralPath $root
  Write-Log "Diretório: $root"

  $nodeExe = Find-NodeExe
  if (-not $nodeExe) {
    Write-Log 'ERRO: node.exe não encontrado. Instale Node LTS e rode de novo npm run autostart:install.'
    exit 1
  }
  Write-Log "Node: $nodeExe"

  $dockerExe = Find-DockerExe
  if (-not $dockerExe) {
    Write-Log 'ERRO: docker.exe não encontrado. Instale Docker Desktop.'
    exit 1
  }
  Write-Log "Docker: $dockerExe"

  $dockerPaths = @(
    'C:\Program Files\Docker\Docker\Docker Desktop.exe',
    (Join-Path $env:LocalAppData 'Docker\Docker Desktop.exe'),
    (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe')
  )

  $deadline = (Get-Date).AddMinutes(10)
  while ((Get-Date) -lt $deadline) {
    $code = Invoke-DockerInfo $dockerExe
    if ($code -eq 0) { break }
    foreach ($dp in $dockerPaths) {
      if (Test-Path -LiteralPath $dp) {
        Start-Process -FilePath $dp -WindowStyle Hidden -ErrorAction SilentlyContinue
        break
      }
    }
    Start-Sleep -Seconds 5
  }

  $finalCode = Invoke-DockerInfo $dockerExe
  if ($finalCode -ne 0) {
    Write-Log 'ERRO: Docker não respondeu. Abra o Docker Desktop uma vez e confira o log.'
    exit 1
  }

  Write-Log 'docker compose up -d mysql'
  $compose = Start-Process -FilePath $dockerExe -ArgumentList @('compose', 'up', '-d', 'mysql') -WorkingDirectory $root -Wait -PassThru -NoNewWindow `
    -RedirectStandardOutput ([IO.Path]::GetTempFileName()) -RedirectStandardError ([IO.Path]::GetTempFileName())
  if ($compose.ExitCode -ne 0) {
    Write-Log ('ERRO: docker compose exit ' + $compose.ExitCode)
    exit 1
  }

  Start-Sleep -Seconds 12

  if (-not (Test-Path -LiteralPath (Join-Path $root '.env'))) {
    Write-Log 'Criando .env (ensure-env)...'
    $ensure = Join-Path $root 'scripts\ensure-env.mjs'
    $ens = Start-Process -FilePath $nodeExe -ArgumentList @($ensure) -WorkingDirectory $root -Wait -PassThru -NoNewWindow `
      -RedirectStandardOutput ([IO.Path]::GetTempFileName()) -RedirectStandardError ([IO.Path]::GetTempFileName())
    if ($ens.ExitCode -ne 0) { Write-Log ('ERRO: ensure-env exit ' + $ens.ExitCode) }
  }

  try {
    $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3456/' -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
      Write-Log 'Servidor já responde em :3456; não inicia outro.'
      exit 0
    }
  } catch { }

  # .cmd temporário: aspas corretas + start /MIN desanexa do processo da tarefa agendada
  $wrap = Join-Path $env:TEMP 'fazendas-up-wrap.cmd'
  $devScript = Join-Path $root 'scripts\dev.mjs'
  $wrapBody = @"
@echo off
cd /d "$root"
set NODE_NO_WARNINGS=1
(
echo.
echo === START %date% %time% ===
"$nodeExe" "$devScript"
) >> "$devLog" 2>&1
"@
  [System.IO.File]::WriteAllText($wrap, $wrapBody, [Text.Encoding]::Default)
  Write-Log "Subindo servidor via start /MIN (wrap: $wrap)…"
  $starter = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', 'start', 'FazendasUpDev', '/MIN', 'cmd', '/c', $wrap) -WorkingDirectory $root -WindowStyle Hidden -PassThru -Wait
  if ($starter.ExitCode -ne 0) {
    Write-Log ('AVISO: cmd start exit ' + $starter.ExitCode)
  }
  Write-Log 'Servidor disparado. Teste http://localhost:3456/ — detalhes em %TEMP%\fazendas-up-dev.log'
}
catch {
  Write-Log ("EXCEÇÃO: " + $_.Exception.Message)
  exit 1
}
