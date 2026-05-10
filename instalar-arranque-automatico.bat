@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo === Fazendas Up — arranque ao ligar o PC ===
echo Instala uma tarefa agendada (uma vez). Depois disso, ao fazer login o MySQL e o servidor sobem sozinhos.
echo.
set "NODE_NO_WARNINGS=1"
set "npm_config_update_notifier=false"
call npm run autostart:install
if errorlevel 1 (
  echo.
  echo Se falhar, tente: npm install
  echo Ou: npm run autostart:install
  exit /b 1
)
echo.
echo Pronto. Na proxima vez que voce fizer login no Windows, o projeto inicia em segundo plano.
echo Log: %TEMP%\fazendas-up-autostart.log
echo Para remover: npm run autostart:uninstall
