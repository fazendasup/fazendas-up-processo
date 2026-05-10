@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo === Fazendas Up - modo local ===
echo.
echo 1) Abra o Docker Desktop e espere ficar "Running".
echo 2) Este script sobe o MySQL e depois o servidor web.
echo.

docker compose up -d mysql
if errorlevel 1 (
  echo.
  echo ERRO: nao foi possivel subir o MySQL. O Docker Desktop esta aberto?
  echo Sem MySQL, o site pode nao carregar dados corretamente.
  echo.
  exit /b 1
)

echo Aguardando o MySQL ficar pronto ^(12s^)...
ping 127.0.0.1 -n 13 >nul

if not exist ".env" (
  echo Criando .env a partir de env.defaults...
  node scripts\ensure-env.mjs
)

echo.
echo Subindo servidor ^(node scripts\dev.mjs — evita bloqueio do npm.ps1 no PowerShell^).
echo URL padrao: http://localhost:3456/
echo CONFIRME no terminal a linha: Server running on http://localhost:XXXX/
echo Se XXXX nao for 3456, use esse numero ou abra o ficheiro .dev-server-port
echo Sem essa linha, o browser nao abre — espere o MySQL ^(Docker^) ou veja erros em vermelho abaixo.
echo.

set "NODE_NO_WARNINGS=1"
node scripts\dev.mjs
