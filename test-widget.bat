@echo off
echo === Verificación completa del Widget PWA ===
echo.

echo 1. Verificando estructura de archivos...
if not exist "manifest.json" (
    echo ERROR: manifest.json no encontrado
    goto :error
) else (
    echo ✓ manifest.json encontrado
)

if not exist "widgets\daily-fact-template.json" (
    echo ERROR: daily-fact-template.json no encontrado
    goto :error
) else (
    echo ✓ daily-fact-template.json encontrado
)

if not exist "widgets\daily-fact-data.json" (
    echo ERROR: daily-fact-data.json no encontrado
    goto :error
) else (
    echo ✓ daily-fact-data.json encontrado
)

if not exist "sw.js" (
    echo ERROR: sw.js no encontrado
    goto :error
) else (
    echo ✓ sw.js encontrado
)

if not exist "server.js" (
    echo ERROR: server.js no encontrado
    goto :error
) else (
    echo ✓ server.js encontrado
)

echo.
echo 2. Verificando dependencias Node.js...
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo ERROR: Falló la instalación de dependencias
        goto :error
    )
) else (
    echo ✓ Dependencias ya instaladas
)

echo.
echo 3. Iniciando servidor de sincronización...
start /min cmd /c "node server.js"
timeout /t 3 /nobreak >nul

echo.
echo 4. Probando endpoints...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/daily-fact' -UseBasicParsing; Write-Host '✓ API responde:'; Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Compress) } catch { Write-Host '✗ API no responde:' $_.Exception.Message }"

echo.
echo 5. Iniciando servidor PWA...
start /min cmd /c "npx http-server -p 8000"
timeout /t 3 /nobreak >nul

echo.
echo 6. Probando servidor PWA...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000' -UseBasicParsing; Write-Host '✓ PWA responde en puerto 8000' } catch { Write-Host '✗ PWA no responde:' $_.Exception.Message }"

echo.
echo === INSTRUCCIONES DE USO ===
echo.
echo 1. Habilita el modo desarrollador en Windows 11:
echo    - Configuración ^> Para desarrolladores ^> Activar modo desarrollador
echo.
echo 2. Instala WinAppSDK 1.2:
echo    - https://learn.microsoft.com/es-es/windows/apps/windows-app-sdk/older-downloads#windows-app-sdk-12
echo.
echo 3. Instala la PWA:
echo    - Abre Edge en http://localhost:8000
echo    - Haz clic en el icono de instalación
echo.
echo 4. Agrega el widget:
echo    - Presiona Windows + W
echo    - Haz clic en "Agregar widgets"
echo    - Busca "Datos Curiosos"
echo    - Agrega el widget
echo.
echo 5. Prueba funcionalidad:
echo    - Botón "⟳ Actualizar" debe cambiar el dato
echo    - Botón "❤ Guardar" debe abrir la PWA en favoritos
echo.
echo === SERVIDORES CORRIENDO ===
echo - API de sincronización: http://localhost:3001
echo - PWA: http://localhost:8000
echo.
echo Presiona cualquier tecla para continuar...
pause >nul
goto :end

:error
echo.
echo ERROR: La verificación falló. Revisa los archivos del proyecto.
pause
exit /b 1

:end
echo Verificación completada exitosamente.