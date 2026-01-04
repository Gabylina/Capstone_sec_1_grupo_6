# Script para construir y subir imágenes Docker a Docker Hub
# Uso: .\push-to-dockerhub.ps1 [--rebuild]
#   --rebuild: Reconstruye las imágenes antes de subirlas

param(
    [switch]$rebuild = $false
)

Write-Host "=== Construir y Subir Imágenes Docker a Docker Hub ===" -ForegroundColor Cyan
Write-Host ""

# Obtener el directorio del script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $scriptDir "docker-compose.yml"

# Verificar si existe docker-compose.yml
if (-not (Test-Path $composeFile)) {
    Write-Host "Error: No se encontró docker-compose.yml en $scriptDir" -ForegroundColor Red
    exit 1
}

# Si se solicita reconstrucción, construir las imágenes
if ($rebuild) {
    Write-Host "=== Reconstruyendo imágenes con docker-compose ===" -ForegroundColor Cyan
    Write-Host ""
    Push-Location $scriptDir
    docker-compose build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: No se pudieron construir las imágenes" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host ""
    Write-Host "Imágenes reconstruidas exitosamente!" -ForegroundColor Green
    Write-Host ""
}

# Detectar nombres de imágenes generadas por docker-compose
# Docker Compose genera nombres basados en el directorio y nombre del servicio
$composeProjectName = Split-Path -Leaf (Split-Path -Parent $scriptDir)
$composeProjectName = $composeProjectName -replace '[^a-zA-Z0-9]', ''  # Limpiar caracteres especiales
$composeProjectName = $composeProjectName.ToLower()

# Nombres que docker-compose probablemente generó
$backendImageLocal = "${composeProjectName}_backend:latest"
$frontendImageLocal = "${composeProjectName}_frontend:latest"
$postgresImageLocal = "${composeProjectName}_postgres:latest"

# Verificar si las imágenes existen, si no, intentar con nombres alternativos
$backendFound = $false
$frontendFound = $false
$postgresFound = $false

# Obtener todas las imágenes locales
$allImages = docker images --format "{{.Repository}}:{{.Tag}}"

# Buscar imágenes del backend
# Prioridad: 1) evidenciasdesistema-backend, 2) {proyecto}_backend, 3) cualquier backend con latest
$backendImages = $allImages | Select-String "backend"
if ($backendImages) {
    foreach ($img in $backendImages) {
        $imgStr = $img.ToString().Trim()
        # Priorizar evidenciasdesistema-backend
        if ($imgStr -match "evidenciasdesistema-backend.*latest" -or $imgStr -eq "evidenciasdesistema-backend:latest") {
            $backendImageLocal = $imgStr
            $backendFound = $true
            break
        }
        # Luego buscar por nombre del proyecto
        if ($imgStr -match "${composeProjectName}_backend.*latest" -or $imgStr -eq "${composeProjectName}_backend:latest") {
            $backendImageLocal = $imgStr
            $backendFound = $true
            # No hacer break aquí, seguir buscando evidenciasdesistema
        }
    }
    # Si no se encontró evidenciasdesistema, usar la primera que coincida
    if (-not $backendFound) {
        foreach ($img in $backendImages) {
            $imgStr = $img.ToString().Trim()
            if ($imgStr -match "backend.*latest" -or ($imgStr -match "backend$" -and -not $imgStr.Contains("/"))) {
                $backendImageLocal = $imgStr
                $backendFound = $true
                break
            }
        }
    }
}

# Buscar imágenes del frontend
# Prioridad: 1) evidenciasdesistema-frontend, 2) {proyecto}_frontend, 3) cualquier frontend con latest
$frontendImages = $allImages | Select-String "frontend"
if ($frontendImages) {
    foreach ($img in $frontendImages) {
        $imgStr = $img.ToString().Trim()
        # Priorizar evidenciasdesistema-frontend
        if ($imgStr -match "evidenciasdesistema-frontend.*latest" -or $imgStr -eq "evidenciasdesistema-frontend:latest") {
            $frontendImageLocal = $imgStr
            $frontendFound = $true
            break
        }
        # Luego buscar por nombre del proyecto
        if ($imgStr -match "${composeProjectName}_frontend.*latest" -or $imgStr -eq "${composeProjectName}_frontend:latest") {
            $frontendImageLocal = $imgStr
            $frontendFound = $true
            # No hacer break aquí, seguir buscando evidenciasdesistema
        }
    }
    # Si no se encontró evidenciasdesistema, usar la primera que coincida
    if (-not $frontendFound) {
        foreach ($img in $frontendImages) {
            $imgStr = $img.ToString().Trim()
            if ($imgStr -match "frontend.*latest" -or ($imgStr -match "frontend$" -and -not $imgStr.Contains("/"))) {
                $frontendImageLocal = $imgStr
                $frontendFound = $true
                break
            }
        }
    }
}

# Buscar imágenes de PostgreSQL (puede ser postgres, postgresql, o llconsulting:postgresql)
$postgresImages = $allImages | Select-String -Pattern "postgres|llconsulting"
if ($postgresImages) {
    foreach ($img in $postgresImages) {
        $imgStr = $img.ToString().Trim()
        # Buscar imágenes que contengan postgresql o que sean del proyecto
        if (($imgStr -match "postgresql" -and -not $imgStr.Contains("postgres:16")) -or 
            ($imgStr -match "llconsulting.*postgresql")) {
            $postgresImageLocal = $imgStr
            $postgresFound = $true
            break
        }
    }
}

# Si no se encontraron, usar nombres por defecto
if (-not $backendFound) {
    Write-Host "Advertencia: No se encontró imagen del backend. Usando nombre por defecto." -ForegroundColor Yellow
    $backendImageLocal = "evidenciasdesistema-backend:latest"
}

if (-not $frontendFound) {
    Write-Host "Advertencia: No se encontró imagen del frontend. Usando nombre por defecto." -ForegroundColor Yellow
    $frontendImageLocal = "evidenciasdesistema-frontend:latest"
}

if (-not $postgresFound) {
    Write-Host "Info: No se encontró imagen personalizada de PostgreSQL. Se usará la imagen oficial postgres:16-alpine." -ForegroundColor Cyan
    $postgresImageLocal = $null
}

Write-Host "Imágenes detectadas:" -ForegroundColor Cyan
Write-Host "  Backend:  $backendImageLocal" -ForegroundColor White
Write-Host "  Frontend: $frontendImageLocal" -ForegroundColor White
if ($postgresImageLocal) {
    Write-Host "  PostgreSQL: $postgresImageLocal" -ForegroundColor White
} else {
    Write-Host "  PostgreSQL: (usando imagen oficial)" -ForegroundColor Gray
}
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

# Nombre del repositorio único en Docker Hub
$repositoryName = "llconsulting"

# Nombres de las imágenes en Docker Hub (mismo repositorio, diferentes tags)
$backendImageHub = "$dockerHubUsername/$repositoryName"
$frontendImageHub = "$dockerHubUsername/$repositoryName"
$postgresImageHub = "$dockerHubUsername/$repositoryName"
$backendTag = "backend"
$frontendTag = "frontend"
$postgresTag = "postgresql"

# Si se especificó un tag personalizado, agregarlo al tag del servicio
if ($tag -ne "latest") {
    $backendTag = "backend-$tag"
    $frontendTag = "frontend-$tag"
    $postgresTag = "postgresql-$tag"
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

# Procesar PostgreSQL si existe imagen local
if ($postgresImageLocal) {
    Write-Host "=== Procesando PostgreSQL ===" -ForegroundColor Cyan
    Write-Host "Etiquetando imagen: $postgresImageLocal -> $postgresImageHub`:$postgresTag" -ForegroundColor Yellow
    docker tag $postgresImageLocal "$postgresImageHub`:$postgresTag"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: No se pudo etiquetar la imagen de PostgreSQL" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Subiendo imagen de PostgreSQL a Docker Hub..." -ForegroundColor Yellow
    docker push "$postgresImageHub`:$postgresTag"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PostgreSQL subido exitosamente!" -ForegroundColor Green
    } else {
        Write-Host "Error al subir PostgreSQL" -ForegroundColor Red
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
}

Write-Host "=== Proceso Completado ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Imágenes disponibles en Docker Hub (mismo repositorio):" -ForegroundColor Green
Write-Host "  Repositorio: $backendImageHub" -ForegroundColor Cyan
Write-Host "  - Backend:  $backendImageHub`:$backendTag"
Write-Host "  - Frontend: $frontendImageHub`:$frontendTag"
if ($postgresImageLocal) {
    Write-Host "  - PostgreSQL: $postgresImageHub`:$postgresTag"
}
Write-Host ""
Write-Host "Para usar estas imágenes, actualiza tu docker-compose.yml con:" -ForegroundColor Yellow
Write-Host "  backend:"
Write-Host "    image: $backendImageHub`:$backendTag"
Write-Host ""
Write-Host "  frontend:"
Write-Host "    image: $frontendImageHub`:$frontendTag"
if ($postgresImageLocal) {
    Write-Host ""
    Write-Host "  postgres:"
    Write-Host "    image: $postgresImageHub`:$postgresTag"
}
Write-Host ""
if ($postgresImageLocal) {
    Write-Host "Nota: Todas las imágenes están en el mismo repositorio '$repositoryName' con tags diferentes." -ForegroundColor Gray
} else {
    Write-Host "Nota: Backend y Frontend están en el mismo repositorio '$repositoryName' con tags diferentes." -ForegroundColor Gray
    Write-Host "      PostgreSQL usa la imagen oficial postgres:16-alpine." -ForegroundColor Gray
}
Write-Host ""
Write-Host "=== Flujo de trabajo recomendado ===" -ForegroundColor Cyan
Write-Host "1. Realiza cambios en tu código" -ForegroundColor White
Write-Host "2. Ejecuta: .\push-to-dockerhub.ps1 --rebuild" -ForegroundColor Yellow
Write-Host "   (Esto reconstruirá las imágenes y las subirá a Docker Hub)" -ForegroundColor Gray
Write-Host ""
Write-Host "O si las imágenes ya están construidas:" -ForegroundColor White
Write-Host "   .\push-to-dockerhub.ps1" -ForegroundColor Yellow
Write-Host ""

