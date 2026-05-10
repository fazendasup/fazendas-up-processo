@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo === Fazendas Up - acesso pelo celular ===
echo.
echo Vou abrir DUAS janelas pretas. NAO feche enquanto estiver testando no celular.
echo.
echo Janela 1: servidor do site ^(localhost^)
echo Janela 2: tunel ngrok - A URL PARA O CELULAR aparece ai ^(linha ngrok: https://...^)
echo.
echo Precisa ter Node.js instalado e NGROK_AUTHTOKEN no arquivo .env nesta pasta.
echo Se aparecer erro de porta em uso, feche outro servidor ^(outro pnpm dev^) antes.
echo.

start "Fazendas Up - servidor ^(nao feche^)" /D "%~dp0." cmd /k "npx --yes pnpm@10.4.1 run dev"

echo Aguardando o servidor iniciar ^(20 segundos^)...
ping 127.0.0.1 -n 21 >nul

start "Fazendas Up - COPIE A URL PARA O CELULAR" /D "%~dp0." cmd /k "npx --yes pnpm@10.4.1 run tunnel"

echo.
echo Pronto. Olhe a janela "COPIE A URL PARA O CELULAR".
echo No celular abra o Chrome ou Safari e cole o link que comeca com https://
echo.
echo IMPORTANTE: links ngrok antigos deixam de funcionar ao fechar o tunel.
echo A URL atual tambem e gravada no arquivo .ngrok-public-url nesta pasta.
echo.
