# Script para subir imágenes Docker a Docker Hub
# Uso: .\push-to-dockerhub.ps1

Write-Host "=== Subir Imágenes Docker a Docker Hub ===" -ForegroundColor Cyan
Write-Host ""

# Detectar el usuario autenticado primero
$dockerConfigPath = "$env:USERPROFILE\.docker\config.json"
$authenticatedUser = $null

if (Test-Path $dockerConfigPath) {
    try {
        $dockerConfig = Get-Content $dockerConfigPath | ConvertFrom-Json
        if ($dockerConfig.auths.'https://index.docker.io/v1/'.auth) {
            $authString = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($dockerConfig.auths.'https://index.docker.io/v1/'.auth))
            $credentials = $authString -split ':'
            if ($credentials.Length -ge 1) {
                $authenticatedUser = $credentials[0]
            }
        }
    } catch {
        # Ignorar errores de lectura
    }
}

# Solicitar nombre de usuario de Docker Hub (con sugerencia del autenticado)
if ($authenticatedUser) {
    Write-Host "Usuario autenticado detectado: $authenticatedUser" -ForegroundColor Green
    $defaultUser = $authenticatedUser
} else {
    $defaultUser = ""
}

$dockerHubUsername = Read-Host "Ingresa tu nombre de usuario de Docker Hub (presiona Enter para usar '$defaultUser')"

if ([string]::IsNullOrWhiteSpace($dockerHubUsername)) {
    if ($authenticatedUser) {
        $dockerHubUsername = $authenticatedUser
        Write-Host "Usando usuario autenticado: $dockerHubUsername" -ForegroundColor Yellow
    } else {
        Write-Host "Error: El nombre de usuario no puede estar vacío" -ForegroundColor Red
        exit 1
    }
}

# Solicitar versión/tag (opcional, por defecto 'latest')
$tag = Read-Host "Ingresa el tag/versión (presiona Enter para usar 'latest')"
if ([string]::IsNullOrWhiteSpace($tag)) {
    $tag = "latest"
}

Write-Host ""
Write-Host "Configuración:" -ForegroundColor Yellow
Write-Host "  Usuario Docker Hub: $dockerHubUsername"
Write-Host "  Tag: $tag"
Write-Host ""

# Hacer login en Docker Hub
Write-Host "Iniciando sesión en Docker Hub..." -ForegroundColor Cyan
docker login

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: No se pudo iniciar sesión en Docker Hub" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Login exitoso!" -ForegroundColor Green
Write-Host ""

# Verificar nuevamente el usuario autenticado después del login (puede haber cambiado)
if (Test-Path $dockerConfigPath) {
    try {
        $dockerConfig = Get-Content $dockerConfigPath | ConvertFrom-Json
        if ($dockerConfig.auths.'https://index.docker.io/v1/'.auth) {
            $authString = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($dockerConfig.auths.'https://index.docker.io/v1/'.auth))
            $credentials = $authString -split ':'
            if ($credentials.Length -ge 1) {
                $currentAuthenticatedUser = $credentials[0]
                if ($currentAuthenticatedUser -ne $dockerHubUsername) {
                    Write-Host "Advertencia: El usuario ingresado ($dockerHubUsername) difiere del autenticado ($currentAuthenticatedUser)" -ForegroundColor Yellow
                    Write-Host "Usando el usuario autenticado: $currentAuthenticatedUser" -ForegroundColor Yellow
                    $dockerHubUsername = $currentAuthenticatedUser
                }
            }
        }
    } catch {
        # Ignorar errores
    }
}

Write-Host "Usuario final: $dockerHubUsername" -ForegroundColor Cyan
Write-Host ""

# Nombres de las imágenes locales (con tag)
$backendImageLocal = "evidenciasdesistema-backend:latest"
$frontendImageLocal = "evidenciasdesistema-frontend:latest"

# Nombre del repositorio único en Docker Hub
$repositoryName = "llconsulting"

# Nombres de las imágenes en Docker Hub (mismo repositorio, diferentes tags)
$backendImageHub = "$dockerHubUsername/$repositoryName"
$frontendImageHub = "$dockerHubUsername/$repositoryName"
$backendTag = "backend"
$frontendTag = "frontend"

# Si se especificó un tag personalizado, agregarlo al tag del servicio
if ($tag -ne "latest") {
    $backendTag = "backend-$tag"
    $frontendTag = "frontend-$tag"
}

# Etiquetar y subir imagen del backend
Write-Host "=== Procesando Backend ===" -ForegroundColor Cyan
Write-Host "Etiquetando imagen: $backendImageLocal -> $backendImageHub`:$backendTag" -ForegroundColor Yellow
docker tag $backendImageLocal "$backendImageHub`:$backendTag"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: No se pudo etiquetar la imagen del backend" -ForegroundColor Red
    exit 1
}

Write-Host "Subiendo imagen del backend a Docker Hub..." -ForegroundColor Yellow
docker push "$backendImageHub`:$backendTag"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backend subido exitosamente!" -ForegroundColor Green
} else {
    Write-Host "Error al subir el backend" -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles soluciones:" -ForegroundColor Yellow
    Write-Host "1. El repositorio no existe. Créalo manualmente en https://hub.docker.com/repositories" -ForegroundColor White
    Write-Host "   - Ve a: https://hub.docker.com/repository/create" -ForegroundColor White
    Write-Host "   - Nombre del repositorio: $repositoryName" -ForegroundColor White
    Write-Host "   - Visibilidad: Pública o Privada (según prefieras)" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Verifica que el nombre de usuario sea correcto: $dockerHubUsername" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Si el repositorio es privado, asegúrate de tener permisos de escritura" -ForegroundColor White
}

Write-Host ""

# Etiquetar y subir imagen del frontend
Write-Host "=== Procesando Frontend ===" -ForegroundColor Cyan
Write-Host "Etiquetando imagen: $frontendImageLocal -> $frontendImageHub`:$frontendTag" -ForegroundColor Yellow
docker tag $frontendImageLocal "$frontendImageHub`:$frontendTag"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: No se pudo etiquetar la imagen del frontend" -ForegroundColor Red
    exit 1
}

Write-Host "Subiendo imagen del frontend a Docker Hub..." -ForegroundColor Yellow
docker push "$frontendImageHub`:$frontendTag"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Frontend subido exitosamente!" -ForegroundColor Green
} else {
    Write-Host "Error al subir el frontend" -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles soluciones:" -ForegroundColor Yellow
    Write-Host "1. El repositorio no existe. Créalo manualmente en https://hub.docker.com/repositories" -ForegroundColor White
    Write-Host "   - Ve a: https://hub.docker.com/repository/create" -ForegroundColor White
    Write-Host "   - Nombre del repositorio: $repositoryName" -ForegroundColor White
    Write-Host "   - Visibilidad: Pública o Privada (según prefieras)" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Verifica que el nombre de usuario sea correcto: $dockerHubUsername" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Si el repositorio es privado, asegúrate de tener permisos de escritura" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Proceso Completado ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Imágenes disponibles en Docker Hub (mismo repositorio):" -ForegroundColor Green
Write-Host "  Repositorio: $backendImageHub" -ForegroundColor Cyan
Write-Host "  - Backend:  $backendImageHub`:$backendTag"
Write-Host "  - Frontend: $frontendImageHub`:$frontendTag"
Write-Host ""
Write-Host "Para usar estas imágenes, actualiza tu docker-compose.yml con:" -ForegroundColor Yellow
Write-Host "  backend:"
Write-Host "    image: $backendImageHub`:$backendTag"
Write-Host ""
Write-Host "  frontend:"
Write-Host "    image: $frontendImageHub`:$frontendTag"
Write-Host ""
Write-Host "Nota: Ambas imágenes están en el mismo repositorio '$repositoryName' con tags diferentes." -ForegroundColor Gray
Write-Host ""

