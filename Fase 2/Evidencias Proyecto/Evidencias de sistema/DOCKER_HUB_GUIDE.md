# Guía para Subir y Usar Imágenes en Docker Hub

## 📋 Resumen

Este proyecto incluye un script PowerShell (`push-to-dockerhub.ps1`) que automatiza la construcción y subida de las imágenes Docker (Backend, Frontend y opcionalmente PostgreSQL) a Docker Hub.

## 🚀 Flujo de Trabajo

### 1. Subir Imágenes a Docker Hub

#### Opción A: Reconstruir y Subir (Recomendado)
```powershell
.\push-to-dockerhub.ps1 --rebuild
```

Este comando:
- Reconstruye las imágenes localmente usando `docker-compose build`
- Detecta automáticamente las imágenes construidas
- Las etiqueta con tu usuario de Docker Hub
- Las sube al repositorio `{usuario}/llconsulting` con tags:
  - `backend`
  - `frontend`
  - `postgresql` (si existe imagen local)

#### Opción B: Solo Subir (si las imágenes ya están construidas)
```powershell
.\push-to-dockerhub.ps1
```

### 2. Usar Imágenes del Docker Hub

#### Desarrollo Local (construye imágenes)
```powershell
docker-compose up -d
```

#### Producción (usa imágenes del Docker Hub)
```powershell
# Configurar tu usuario de Docker Hub
$env:DOCKER_HUB_USERNAME = "niconav1"

# Usar docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

O edita manualmente `docker-compose.prod.yml` y reemplaza `niconav1` con tu usuario.

## 📝 Requisitos Previos

1. **Cuenta en Docker Hub**: Crea una cuenta en https://hub.docker.com
2. **Repositorio creado**: El script intentará crear el repositorio automáticamente, pero si falla:
   - Ve a https://hub.docker.com/repository/create
   - Nombre del repositorio: `llconsulting`
   - Visibilidad: Pública o Privada (según prefieras)
3. **Login en Docker**: El script te pedirá hacer login cuando lo ejecutes

## 🔧 Configuración

### Variables de Entorno (Opcional)

Puedes configurar variables de entorno para automatizar el proceso:

```powershell
# Usuario de Docker Hub
$env:DOCKER_HUB_USERNAME = "niconav1"

# Tag personalizado (opcional, por defecto usa 'latest')
$env:DOCKER_TAG = "v1.0.0"
```

### Estructura de Imágenes en Docker Hub

Todas las imágenes se suben al mismo repositorio con diferentes tags:

```
{usuario}/llconsulting:backend
{usuario}/llconsulting:frontend
{usuario}/llconsulting:postgresql  (opcional)
```

## 📦 Archivos Importantes

- **`push-to-dockerhub.ps1`**: Script principal para subir imágenes
- **`docker-compose.yml`**: Configuración para desarrollo (construye localmente)
- **`docker-compose.prod.yml`**: Configuración para producción (usa imágenes del Hub)

## 🐛 Solución de Problemas

### Error: "No se encontró imagen del backend/frontend"

**Solución**: Asegúrate de haber construido las imágenes primero:
```powershell
docker-compose build
```

### Error: "No se pudo iniciar sesión en Docker Hub"

**Solución**: 
1. Verifica tus credenciales de Docker Hub
2. Ejecuta manualmente: `docker login`
3. Vuelve a ejecutar el script

### Error: "repository does not exist"

**Solución**: 
1. Crea el repositorio manualmente en Docker Hub:
   - Ve a https://hub.docker.com/repository/create
   - Nombre: `llconsulting`
   - Visibilidad: Pública o Privada
2. Vuelve a ejecutar el script

### Las imágenes no se detectan correctamente

**Solución**: El script busca imágenes con estos nombres (en orden de prioridad):
- `evidenciasdesistema-backend:latest`
- `evidenciasdesistema-frontend:latest`
- `{nombre-proyecto}_backend:latest`
- `{nombre-proyecto}_frontend:latest`

Si tus imágenes tienen otro nombre, puedes etiquetarlas manualmente:
```powershell
docker tag {imagen-original} evidenciasdesistema-backend:latest
docker tag {imagen-original} evidenciasdesistema-frontend:latest
```

## 🔄 Actualizar Imágenes en Producción

1. Realiza cambios en el código
2. Reconstruye y sube las nuevas imágenes:
   ```powershell
   .\push-to-dockerhub.ps1 --rebuild
   ```
3. En el servidor de producción, actualiza las imágenes:
   ```powershell
   docker-compose -f docker-compose.prod.yml pull
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 📌 Notas Importantes

- **PostgreSQL**: Por defecto, el proyecto usa la imagen oficial `postgres:16-alpine`. Si tienes una imagen personalizada de PostgreSQL, el script la detectará y la subirá automáticamente.
- **Tags**: Si especificas un tag personalizado (ej: `v1.0.0`), las imágenes se subirán como:
  - `backend-v1.0.0`
  - `frontend-v1.0.0`
  - `postgresql-v1.0.0`
- **Volúmenes**: Los volúmenes de datos (postgres_data, backend_uploads, etc.) se mantienen locales y no se suben a Docker Hub.

