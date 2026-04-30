@echo off
REM Inicia o Vite escutando em todas interfaces e mostra o IP local
SETLOCAL EnableDelayedExpansion

SET PORT=8080

REM Detecta IPv4 da maquina
FOR /F "tokens=2 delims=:" %%a IN ('ipconfig ^| findstr /C:"IPv4"') DO (
  SET "LAN_IP=%%a"
  SET "LAN_IP=!LAN_IP: =!"
  GOTO :found
)
:found

echo.
echo ==========================================
echo   Acesso via Wi-Fi (mesma rede)
echo ==========================================
echo   PC:      http://localhost:%PORT%
echo   Celular: http://%LAN_IP%:%PORT%
echo ==========================================
echo.
echo Dicas se o celular nao conectar:
echo   1. PC e celular na MESMA rede Wi-Fi
echo   2. Liberar porta %PORT% no Firewall do Windows
echo   3. Use o IP (http://%LAN_IP%:%PORT%) e NAO o nome do PC
echo.

call npx qrcode-terminal http://%LAN_IP%:%PORT% 2>nul

call npx vite --host 0.0.0.0 --port %PORT%
