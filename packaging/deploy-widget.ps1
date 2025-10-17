# Script para desplegar el widget en Windows 11
# Basado en el tutorial oficial de Microsoft Edge

Write-Host "=== Despliegue de Widget PWA - Datos Curiosos ===" -ForegroundColor Cyan

# Verificar Windows 11
$osVersion = [System.Environment]::OSVersion.Version
if ($osVersion.Major -lt 10 -or ($osVersion.Major -eq 10 -and $osVersion.Build -lt 22000)) {
    Write-Host "ADVERTENCIA: Este script requiere Windows 11 (Build 22000+)" -ForegroundColor Yellow
    Write-Host "Tu versión: $($osVersion.ToString())" -ForegroundColor Yellow
}

# Verificar modo desarrollador
$devMode = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Name "AllowDevelopmentWithoutDevLicense" -ErrorAction SilentlyContinue
if (-not $devMode -or $devMode.AllowDevelopmentWithoutDevLicense -ne 1) {
    Write-Host "PASO 1: Habilitar Modo Desarrollador" -ForegroundColor Yellow
    Write-Host "1. Abre Configuración de Windows (Windows + I)"
    Write-Host "2. Ve a 'Privacidad y seguridad' > 'Para desarrolladores'"
    Write-Host "3. Activa 'Modo de desarrollador'"
    Write-Host "4. Reinicia este script después de habilitar el modo desarrollador"
    Read-Host "Presiona Enter después de habilitar el modo desarrollador..."
}

Write-Host "PASO 2: Verificar WinAppSDK" -ForegroundColor Green
$winAppSDK = Get-AppxPackage | Where-Object { $_.Name -like "*WindowsAppRuntime*" }
if (-not $winAppSDK) {
    Write-Host "WinAppSDK no encontrado. Descárgalo desde:" -ForegroundColor Yellow
    Write-Host "https://learn.microsoft.com/es-es/windows/apps/windows-app-sdk/older-downloads#windows-app-sdk-12"
    Read-Host "Presiona Enter después de instalar WinAppSDK..."
}

Write-Host "PASO 3: Verificar servidores" -ForegroundColor Green
$pwaPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$pwaPath = Split-Path -Parent $pwaPath  # Subir un nivel desde /packaging

Write-Host "Iniciando servidor PWA (puerto 8000)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/c", "cd /d `"$pwaPath`" && npx http-server -p 8000" -WindowStyle Minimized

Write-Host "Iniciando servidor de sincronización (puerto 3001)..." -ForegroundColor Cyan  
Start-Process -FilePath "cmd" -ArgumentList "/c", "cd /d `"$pwaPath`" && npm start" -WindowStyle Minimized

Start-Sleep -Seconds 3

# Verificar que los servidores estén corriendo
try {
    $pwaTest = Invoke-WebRequest -Uri "http://localhost:8000" -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ Servidor PWA corriendo en http://localhost:8000" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: Servidor PWA no responde" -ForegroundColor Red
    exit 1
}

try {
    $apiTest = Invoke-WebRequest -Uri "http://localhost:3001/api/daily-fact" -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ API de sincronización corriendo en http://localhost:3001" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: API de sincronización no responde" -ForegroundColor Red
    exit 1
}

Write-Host "PASO 4: Instalar PWA en Edge" -ForegroundColor Green
Write-Host "1. Abre Microsoft Edge"
Write-Host "2. Ve a http://localhost:8000"
Write-Host "3. Haz clic en el icono de instalación en la barra de direcciones"
Write-Host "4. Sigue las instrucciones para instalar la PWA"

Read-Host "Presiona Enter después de instalar la PWA..."

Write-Host "PASO 5: Agregar widget al Panel de Widgets" -ForegroundColor Green
Write-Host "1. Presiona Windows + W para abrir el Panel de Widgets"
Write-Host "2. Haz clic en 'Agregar widgets' (icono +)"
Write-Host "3. Busca 'Datos Curiosos' en la lista de widgets disponibles"
Write-Host "4. Haz clic en 'Agregar' para añadir el widget"

Write-Host ""
Write-Host "PASO 6: Probar funcionalidad" -ForegroundColor Green
Write-Host "1. El widget debe mostrar el dato curioso actual"
Write-Host "2. Prueba el botón '⟳ Actualizar' - debe cambiar el dato"
Write-Host "3. Prueba el botón '❤ Guardar' - debe abrir la app en favoritos"

Write-Host ""
Write-Host "=== COMANDOS ÚTILES ===" -ForegroundColor Cyan
Write-Host "Probar API manualmente:"
Write-Host "  curl http://localhost:3001/api/daily-fact"
Write-Host "  curl -X POST http://localhost:3001/api/daily-fact/refresh"
Write-Host ""
Write-Host "Ver logs del service worker:"
Write-Host "  F12 en la PWA > Application > Service Workers > Consola"
Write-Host ""
Write-Host "Desinstalar PWA:"
Write-Host "  Edge > Aplicaciones > Administrar aplicaciones > Datos Curiosos > Desinstalar"

Write-Host ""
Write-Host "=== DEPLOYMENT COMPLETO ===" -ForegroundColor Green
Write-Host "Tu widget PWA está configurado según el tutorial oficial de Microsoft."
Write-Host "Widget disponible en: Panel de Widgets de Windows 11"