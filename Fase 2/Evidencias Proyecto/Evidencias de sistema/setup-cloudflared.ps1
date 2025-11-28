# Script de ayuda para configurar cloudflared (alternativa a localtunnel)
# Cloudflared es mas confiable y no tiene problemas con firewalls

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracion cloudflared (Cloudflare Tunnel)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Docker este corriendo
Write-Host "1. Verificando que Docker este corriendo..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker no esta corriendo. Ejecuta: docker-compose up" -ForegroundColor Red
    exit 1
}
Write-Host "Docker esta corriendo" -ForegroundColor Green
Write-Host ""

# Verificar si cloudflared esta instalado
Write-Host "2. Verificando cloudflared..." -ForegroundColor Yellow
$cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
$cloudflaredPath = $null

if ($cloudflaredCmd) {
    $cloudflaredPath = $cloudflaredCmd.Source
    Write-Host "✅ cloudflared encontrado en PATH: $cloudflaredPath" -ForegroundColor Green
} else {
    # Buscar en ubicaciones comunes
    $possiblePaths = @(
        "$env:USERPROFILE\cloudflared\cloudflared.exe",
        "C:\cloudflared\cloudflared.exe",
        "C:\Windows\System32\cloudflared.exe",
        "$env:ProgramFiles\cloudflared\cloudflared.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $cloudflaredPath = $path
            Write-Host "✅ cloudflared encontrado en: $cloudflaredPath" -ForegroundColor Green
            break
        }
    }
    
    if (-not $cloudflaredPath) {
        Write-Host "❌ cloudflared NO esta instalado" -ForegroundColor Red
        Write-Host ""
        Write-Host "Ejecutando instalador automatico..." -ForegroundColor Yellow
        Write-Host ""
        
        # Intentar ejecutar el script de instalacion
        $installScript = Join-Path $PSScriptRoot "instalar-cloudflared.ps1"
        if (Test-Path $installScript) {
            & $installScript
            Write-Host ""
            Write-Host "Despues de la instalacion, ejecuta este script de nuevo." -ForegroundColor Yellow
            exit 0
        } else {
            Write-Host "Instalacion manual:" -ForegroundColor Yellow
            Write-Host "1. Ejecuta: .\instalar-cloudflared.ps1" -ForegroundColor Cyan
            Write-Host "2. O descarga manualmente desde:" -ForegroundColor White
            Write-Host "   https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Cyan
            Write-Host ""
            exit 1
        }
    }
}

# Crear alias para usar cloudflared
if ($cloudflaredPath -and -not $cloudflaredCmd) {
    function cloudflared {
        & $cloudflaredPath $args
    }
}
Write-Host ""

# Instrucciones para iniciar los túneles
Write-Host "3. PASO 1: Iniciar cloudflared para BACKEND (puerto 3001)" -ForegroundColor Yellow
Write-Host "   Abre una NUEVA terminal y ejecuta:" -ForegroundColor White
Write-Host "   cloudflared tunnel --url http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Copia la URL HTTPS que aparece (ej: https://xyz789.trycloudflare.com)" -ForegroundColor White
Write-Host ""

# Solicitar URL del backend
$backendUrl = Read-Host "   Ingresa la URL del backend cloudflared (ej: https://xyz789.trycloudflare.com)"

if ([string]::IsNullOrWhiteSpace($backendUrl)) {
    Write-Host "URL no valida" -ForegroundColor Red
    exit 1
}

# Validar formato
if (-not ($backendUrl.StartsWith("https://") -or $backendUrl.StartsWith("http://"))) {
    Write-Host "La URL debe comenzar con https:// o http://" -ForegroundColor Red
    exit 1
}

# Asegurar que sea HTTPS
if ($backendUrl.StartsWith("http://")) {
    $backendUrl = $backendUrl -replace "^http://", "https://"
}

Write-Host ""
Write-Host "URL del backend: $backendUrl" -ForegroundColor Green
Write-Host ""

# Paso 2: Iniciar cloudflared para frontend
Write-Host "4. PASO 2: Iniciar cloudflared para FRONTEND (puerto 3000)" -ForegroundColor Yellow
Write-Host "   Abre OTRA terminal y ejecuta:" -ForegroundColor White
Write-Host "   cloudflared tunnel --url http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Copia la URL HTTPS que aparece (ej: https://abc123.trycloudflare.com)" -ForegroundColor White
Write-Host ""

# Solicitar URL del frontend
$frontendUrl = Read-Host "   Ingresa la URL del frontend cloudflared (ej: https://abc123.trycloudflare.com)"

if ([string]::IsNullOrWhiteSpace($frontendUrl)) {
    Write-Host "URL no valida" -ForegroundColor Red
    exit 1
}

# Validar formato
if (-not ($frontendUrl.StartsWith("https://") -or $frontendUrl.StartsWith("http://"))) {
    Write-Host "La URL debe comenzar con https:// o http://" -ForegroundColor Red
    exit 1
}

# Asegurar que sea HTTPS
if ($frontendUrl.StartsWith("http://")) {
    $frontendUrl = $frontendUrl -replace "^http://", "https://"
}

Write-Host ""
Write-Host "URL del frontend: $frontendUrl" -ForegroundColor Green
Write-Host ""

# Actualizar docker-compose.yml
Write-Host "5. Actualizando docker-compose.yml..." -ForegroundColor Yellow

$composeFile = "docker-compose.yml"
if (-not (Test-Path $composeFile)) {
    Write-Host "No se encontro docker-compose.yml" -ForegroundColor Red
    exit 1
}

# Leer el archivo
$content = Get-Content $composeFile -Raw

# Reemplazar NEXT_PUBLIC_API_URL (URL del backend para el frontend)
$pattern = '(NEXT_PUBLIC_API_URL:\s*)([^\s]+)'
$replacement = "`$1$backendUrl"

if ($content -match $pattern) {
    $content = $content -replace $pattern, $replacement
    Write-Host "   ✅ NEXT_PUBLIC_API_URL actualizado con URL del backend" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ No se encontro NEXT_PUBLIC_API_URL en docker-compose.yml" -ForegroundColor Yellow
}

# Reemplazar FRONTEND_URL (URL del frontend para CORS en el backend)
$patternFrontend = '(FRONTEND_URL:\s*)([^\s]+)'
$replacementFrontend = "`$1$frontendUrl"

if ($content -match $patternFrontend) {
    $content = $content -replace $patternFrontend, $replacementFrontend
    Write-Host "   ✅ FRONTEND_URL actualizado con URL del frontend (para CORS)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ No se encontro FRONTEND_URL en docker-compose.yml" -ForegroundColor Yellow
}

# Guardar el archivo
Set-Content $composeFile -Value $content -NoNewline
Write-Host "   ✅ docker-compose.yml actualizado" -ForegroundColor Green

Write-Host ""

# Reiniciar servicios
Write-Host "6. Reiniciando servicios..." -ForegroundColor Yellow
Write-Host "   Reiniciando backend (para aplicar nueva configuracion de CORS)..." -ForegroundColor White
docker-compose restart backend

Write-Host ""
Write-Host "   Reconstruyendo frontend (necesario para aplicar nueva URL del backend)..." -ForegroundColor White
Write-Host "   Esto puede tardar unos minutos..." -ForegroundColor Yellow
docker-compose up -d --build frontend

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuracion completada!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resumen:" -ForegroundColor Yellow
Write-Host "   Frontend URL: $frontendUrl" -ForegroundColor White
Write-Host "   Backend URL:  $backendUrl" -ForegroundColor White
Write-Host ""
Write-Host "Comparte esta URL con tu jefe:" -ForegroundColor Yellow
Write-Host "   $frontendUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - Manten ambas terminales de cloudflared corriendo" -ForegroundColor White
Write-Host "   - Manten Docker corriendo" -ForegroundColor White
Write-Host "   - Si reinicias cloudflared, las URLs cambiaran" -ForegroundColor White
Write-Host "   - cloudflared NO requiere configuracion de firewall" -ForegroundColor Green
Write-Host ""

