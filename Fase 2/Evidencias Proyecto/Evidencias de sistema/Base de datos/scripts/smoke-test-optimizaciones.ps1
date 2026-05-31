<#
.SYNOPSIS
  Smoke test de optimizaciones (consultor, admin, PDF/Excel, batch candidatos).

.DESCRIPTION
  Valida endpoints críticos y tiempos de respuesta tras las optimizaciones.
  Usa la misma base URL que NEXT_PUBLIC_API_URL del frontend.

.PARAMETER BaseUrl
  URL base del API. Ejemplos:
    - Local:  http://localhost:3001
    - Prod:   https://web.llconsulting.cl/api

.PARAMETER Token
  JWT (llc_token). Si no se pasa, use -Email y -Password para login.

.PARAMETER Email
  Email para login automático.

.PARAMETER Password
  Contraseña para login automático.

.PARAMETER SolicitudId
  ID de solicitud para pruebas de detalle/PDF/optimized. Si no se pasa, usa la primera de la lista.

.PARAMETER ConsultorId
  RUT del consultor para probar stats filtrados (opcional).

.PARAMETER MaxStatsMs
  Tiempo máximo aceptable para GET /solicitudes/stats (ms). Default: 3000.

.EXAMPLE
  .\smoke-test-optimizaciones.ps1 -BaseUrl "http://localhost:3001" -Email "admin@ejemplo.cl" -Password "secret"

.EXAMPLE
  $env:SMOKE_TEST_EMAIL = "admin@ejemplo.cl"
  $env:SMOKE_TEST_PASSWORD = "secret"
  .\smoke-test-optimizaciones.ps1 -BaseUrl "http://localhost:3001" -ConsultorId "12345678-9" -SolicitudId 269

.EXAMPLE
  .\smoke-test-optimizaciones.ps1 -BaseUrl "https://web.llconsulting.cl/api" -Token "eyJ..."
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [string]$Token = "",

    # Preferir -Email/-Password en consola o variables de entorno (no guardar credenciales en el archivo)
    [string]$Email = "",

    [string]$Password = "",

    # 0 = usar la primera solicitud de la lista
    [int]$SolicitudId = 0,

    # Vacio = stats globales sin filtrar por consultor
    [string]$ConsultorId = "",

    [int]$MaxStatsMs = 3000
)

# Credenciales opcionales desde entorno local (ej. $env:SMOKE_TEST_EMAIL)
if (-not $Email -and $env:SMOKE_TEST_EMAIL) { $Email = $env:SMOKE_TEST_EMAIL }
if (-not $Password -and $env:SMOKE_TEST_PASSWORD) { $Password = $env:SMOKE_TEST_PASSWORD }
if (-not $Token -and $env:SMOKE_TEST_TOKEN) { $Token = $env:SMOKE_TEST_TOKEN }

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:Passed = 0
$script:Failed = 0
$script:Warnings = 0
$results = [System.Collections.Generic.List[object]]::new()

function Write-Title([string]$Text) {
    Write-Host ""
    Write-Host "=== $Text ===" -ForegroundColor Cyan
}

function Add-Result {
    param(
        [string]$Name,
        [bool]$Ok,
        [string]$Detail = "",
        [switch]$Warn
    )

    if ($Warn) {
        $script:Warnings++
        $icon = "WARN"
        $color = "Yellow"
    }
    elseif ($Ok) {
        $script:Passed++
        $icon = " OK "
        $color = "Green"
    }
    else {
        $script:Failed++
        $icon = "FAIL"
        $color = "Red"
    }

    $line = "[$icon] $Name"
    if ($Detail) { $line += " - $Detail" }
    Write-Host $line -ForegroundColor $color

    $results.Add([PSCustomObject]@{
        Status  = $icon.Trim()
        Test    = $Name
        Detail  = $Detail
    }) | Out-Null
}

function Get-ApiUrl([string]$Path) {
    $base = $BaseUrl.TrimEnd("/")
    if (-not $Path.StartsWith("/")) { $Path = "/$Path" }
    return "$base$Path"
}

function Invoke-Api {
    param(
        [string]$Method = "GET",
        [string]$Path,
        [object]$Body = $null,
        [hashtable]$ExtraHeaders = @{}
    )

    $url = Get-ApiUrl -Path $Path
    $headers = @{
        "Accept" = "application/json"
    }
    if ($script:AuthToken) {
        $headers["Authorization"] = "Bearer $($script:AuthToken)"
    }
    foreach ($k in $ExtraHeaders.Keys) {
        $headers[$k] = $ExtraHeaders[$k]
    }

    $params = @{
        Uri         = $url
        Method      = $Method
        Headers     = $headers
        TimeoutSec  = 60
    }

    if ($null -ne $Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 20 -Compress)
        $params["ContentType"] = "application/json"
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $response = Invoke-WebRequest @params -UseBasicParsing
        $sw.Stop()
        $json = $null
        if ($response.Content) {
            try { $json = $response.Content | ConvertFrom-Json } catch { }
        }
        return @{
            Ok         = $true
            StatusCode = [int]$response.StatusCode
            Ms         = $sw.ElapsedMilliseconds
            Json       = $json
            Raw        = $response.Content
            Headers    = $response.Headers
        }
    }
    catch {
        $sw.Stop()
        $status = 0
        $raw = $_.Exception.Message
        $json = $null
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $raw = $reader.ReadToEnd()
                $reader.Close()
                $json = $raw | ConvertFrom-Json
            }
            catch { }
        }
        return @{
            Ok         = $false
            StatusCode = $status
            Ms         = $sw.ElapsedMilliseconds
            Json       = $json
            Raw        = $raw
            Headers    = @{}
        }
    }
}

function Get-ApiMessage {
    param(
        [object]$Json,
        [string]$Fallback = ""
    )

    if ($null -eq $Json) { return $Fallback }
    $prop = $Json.PSObject.Properties["message"]
    if ($prop) { return [string]$prop.Value }
    return $Fallback
}

function Test-JsonSuccess($Response, [string]$Name) {
    if (-not $Response.Ok) {
        $msg = Get-ApiMessage -Json $Response.Json -Fallback $Response.Raw
        if (-not $msg) { $msg = "sin detalle" }
        Add-Result -Name $Name -Ok $false -Detail "HTTP $($Response.StatusCode): $msg"
        return $null
    }
    if ($Response.Json -and $Response.Json.success -eq $false) {
        $msg = Get-ApiMessage -Json $Response.Json -Fallback "success=false"
        Add-Result -Name $Name -Ok $false -Detail $msg
        return $null
    }
    return $Response.Json
}

# --- Inicio ---
Write-Title "LLConsulting - Smoke test optimizaciones"
Write-Host "Base URL: $BaseUrl"
Write-Host "Fecha:    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Auth
$script:AuthToken = $Token
if (-not $script:AuthToken -and $Email -and $Password) {
    Write-Title "Login"
    $login = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
        email    = $Email
        password = $Password
    }
    $loginJson = Test-JsonSuccess -Response $login -Name "POST /api/auth/login"
    if ($loginJson -and $loginJson.data.token) {
        $script:AuthToken = $loginJson.data.token
        Add-Result -Name "Token obtenido" -Ok $true -Detail "Login OK ($($login.Ms) ms)"
    }
    elseif ($loginJson -and $loginJson.token) {
        $script:AuthToken = $loginJson.token
        Add-Result -Name "Token obtenido" -Ok $true -Detail "Login OK ($($login.Ms) ms)"
    }
    else {
        Add-Result -Name "Login" -Ok $false -Detail "No se obtuvo token. Use -Token o revise credenciales."
        exit 1
    }
}
elseif (-not $script:AuthToken) {
    Write-Host "Sin token: solo se ejecutan endpoints publicos." -ForegroundColor Yellow
}

# --- 1. Stats optimizados ---
Write-Title "1. Stats de solicitudes (getFilteredStats)"
$statsPath = "/api/solicitudes/stats"
if ($ConsultorId) { $statsPath += "?consultor_id=$ConsultorId" }

$statsRes = Invoke-Api -Path $statsPath
$statsJson = Test-JsonSuccess -Response $statsRes -Name "GET $statsPath"
if ($statsJson) {
    $d = $statsJson.data
    $fields = @("total", "pendientes", "en_progreso", "completadas", "congelados", "cancelados", "cierre_extraordinario")
    $missing = @($fields | Where-Object { $null -eq $d.$_ })
    if ($missing.Count -gt 0) {
        Add-Result -Name "Campos stats extendidos" -Ok $false -Detail "Faltan: $($missing -join ', ')"
    }
    else {
        Add-Result -Name "Campos stats extendidos" -Ok $true -Detail "total=$($d.total), en_progreso=$($d.en_progreso) ($($statsRes.Ms) ms)"
    }
    if ($statsRes.Ms -le $MaxStatsMs) {
        Add-Result -Name "Tiempo stats <= ${MaxStatsMs}ms" -Ok $true -Detail "$($statsRes.Ms) ms"
    }
    else {
        Add-Result -Name "Tiempo stats <= ${MaxStatsMs}ms" -Ok $false -Detail "$($statsRes.Ms) ms (revisar getFilteredStats)"
    }
}

# --- 2. Lista paginada ---
Write-Title "2. Lista paginada solicitudes"
$listRes = Invoke-Api -Path "/api/solicitudes?page=1&limit=5"
$listJson = Test-JsonSuccess -Response $listRes -Name "GET /api/solicitudes?page=1&limit=5"
$firstId = $SolicitudId
if ($listJson) {
    $items = $listJson.data.solicitudes
    if (-not $items) { $items = $listJson.data }
    $total = $listJson.data.pagination.total
    Add-Result -Name "Paginacion" -Ok ($null -ne $total) -Detail "total=$total ($($listRes.Ms) ms)"
    if ($firstId -le 0 -and $items -and $items.Count -gt 0) {
        if ($items[0].id) { $firstId = [int]$items[0].id }
        elseif ($items[0].id_solicitud) { $firstId = [int]$items[0].id_solicitud }
        Write-Host "  Usando solicitudId=$firstId para pruebas de detalle" -ForegroundColor DarkGray
    }
}

# --- 3. Tipos de servicio (consultor hook) ---
Write-Title "3. Tipos de servicio"
$tsRes = Invoke-Api -Path "/api/tipos-servicio"
$tsJson = Test-JsonSuccess -Response $tsRes -Name "GET /api/tipos-servicio"
if ($tsJson) {
    $count = @($tsJson.data).Count
    Add-Result -Name "Tipos de servicio" -Ok ($count -gt 0) -Detail "$count tipos ($($tsRes.Ms) ms)"
}

# --- 4. Batch candidatos ---
Write-Title "4. Resumen batch candidatos"
if ($firstId -gt 0) {
    $batchRes = Invoke-Api -Path "/api/postulaciones/resumen-batch?ids=$firstId"
    $batchJson = Test-JsonSuccess -Response $batchRes -Name "GET /api/postulaciones/resumen-batch"
    if ($batchJson) {
        $keys = @($batchJson.data.PSObject.Properties.Name)
        Add-Result -Name "Resumen batch" -Ok $true -Detail "ids=$firstId, keys=$($keys -join ',') ($($batchRes.Ms) ms)"
    }
}
else {
    Add-Result -Name "Resumen batch" -Ok $false -Detail "Sin solicitudId disponible"
}

# --- 5. Detalle solicitud optimizado ---
Write-Title "5. Detalle solicitud + flag PDF"
if ($firstId -gt 0) {
    $detailRes = Invoke-Api -Path "/api/solicitudes/$firstId"
    $detailJson = Test-JsonSuccess -Response $detailRes -Name "GET /api/solicitudes/$firstId"
    if ($detailJson) {
        $data = $detailJson.data
        $dcId = $null
        if ($data.id_descripcion_cargo) { $dcId = $data.id_descripcion_cargo }
        elseif ($data.id_descripcioncargo) { $dcId = $data.id_descripcioncargo }
        elseif ($data.descripcion_cargo -and $data.descripcion_cargo.id_descripcioncargo) {
            $dcId = $data.descripcion_cargo.id_descripcioncargo
        }
        $hasPdfFlag = $data.tiene_datos_pdf
        if ($null -eq $hasPdfFlag -and $data.descripcion_cargo) {
            $hasPdfFlag = $data.descripcion_cargo.tiene_datos_pdf
        }
        $hasPdfBool = ($hasPdfFlag -eq $true) -or ($hasPdfFlag -eq "True") -or ($hasPdfFlag -eq "true")
        Add-Result -Name "Detalle solicitud" -Ok $true -Detail "id_descripcion_cargo=$dcId ($($detailRes.Ms) ms)"
        Add-Result -Name "Campo tiene_datos_pdf" -Ok ($null -ne $hasPdfFlag) -Detail "tiene_datos_pdf=$hasPdfFlag"

        # --- 6. Candidatos optimized ---
        Write-Title "6. Postulaciones optimized"
        $optRes = Invoke-Api -Path "/api/postulaciones/solicitud/$firstId/optimized"
        $optJson = Test-JsonSuccess -Response $optRes -Name "GET .../optimized"
        if ($optJson) {
            $cCount = @($optJson.data).Count
            Add-Result -Name "Candidatos optimized" -Ok $true -Detail "$cCount candidatos ($($optRes.Ms) ms)"
        }

        # --- 7. PDF HEAD ---
        Write-Title "7. PDF descripcion de cargo"
        if ($dcId) {
            $pdfUrl = Get-ApiUrl -Path "/api/descripciones-cargo/$dcId/pdf"
            try {
                $pdfSw = [System.Diagnostics.Stopwatch]::StartNew()
                $pdfHead = Invoke-WebRequest -Uri $pdfUrl -Method HEAD -UseBasicParsing -TimeoutSec 30
                $pdfSw.Stop()
                $contentType = [string]$pdfHead.Headers["Content-Type"]
                $pdfOk = ($pdfHead.StatusCode -eq 200) -and ($contentType -like "*application/pdf*")
                if ($pdfOk) {
                    Add-Result -Name "HEAD PDF" -Ok $true -Detail "$pdfUrl ($($pdfSw.ElapsedMilliseconds) ms)"
                }
                else {
                    Add-Result -Name "HEAD PDF" -Ok $false -Detail "HTTP $($pdfHead.StatusCode)"
                }
                if ($hasPdfBool -and -not $pdfOk) {
                    Add-Result -Name "Consistencia flag vs PDF" -Ok $false -Detail "tiene_datos_pdf=true pero HEAD no devolvio application/pdf"
                }
                elseif (-not $hasPdfBool -and $pdfOk) {
                    Add-Result -Name "Consistencia flag vs PDF" -Warn -Detail "PDF existe pero tiene_datos_pdf=false (revisar API)"
                }
                elseif ($hasPdfBool -and $pdfOk) {
                    Add-Result -Name "Consistencia flag vs PDF" -Ok $true
                }
            }
            catch {
                if ($hasPdfBool) {
                    Add-Result -Name "HEAD PDF" -Ok $false -Detail $_.Exception.Message
                }
                else {
                    Add-Result -Name "HEAD PDF" -Ok $true -Detail "Sin PDF (esperado si no se subio)"
                }
            }

            # Excel metadata
            $excelRes = Invoke-Api -Path "/api/descripciones-cargo/$dcId/excel"
            if ($excelRes.Ok -and $excelRes.Json.success -ne $false) {
                Add-Result -Name "GET Excel metadata" -Ok $true -Detail "$($excelRes.Ms) ms"
            }
            else {
                Add-Result -Name "GET Excel metadata" -Warn -Detail "Sin Excel o no disponible ($($excelRes.StatusCode))"
            }
        }
        else {
            Add-Result -Name "PDF/Excel" -Warn -Detail "Solicitud sin id_descripcion_cargo"
        }
    }
}
else {
    Add-Result -Name "Detalle solicitud" -Ok $false -Detail "No hay solicitudes en BD para probar"
}

# --- 8. Reportes (muestra endpoints lazy) ---
Write-Title "8. Endpoints reportes (smoke)"
$reportEndpoints = @(
    "/api/solicitudes/reportes/estadisticas",
    "/api/solicitudes/reportes/carga-operativa"
)
foreach ($ep in $reportEndpoints) {
    $r = Invoke-Api -Path $ep
    if ($r.Ok -or $r.StatusCode -eq 200) {
        Add-Result -Name "GET $ep" -Ok $true -Detail "$($r.Ms) ms"
    }
    else {
        $msg = Get-ApiMessage -Json $r.Json -Fallback "HTTP $($r.StatusCode)"
        Add-Result -Name "GET $ep" -Warn -Detail $msg
    }
}

# --- Resumen ---
Write-Title "Resumen"
Write-Host "Pasaron:  $($script:Passed)" -ForegroundColor Green
Write-Host "Fallaron: $($script:Failed)" -ForegroundColor $(if ($script:Failed -gt 0) { "Red" } else { "Green" })
Write-Host "Avisos:   $($script:Warnings)" -ForegroundColor Yellow

$reportPath = Join-Path $PSScriptRoot ("smoke-report-{0}.txt" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
@(
    "LLConsulting smoke test - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "BaseUrl: $BaseUrl",
    "Pasaron: $($script:Passed) | Fallaron: $($script:Failed) | Avisos: $($script:Warnings)",
    "",
    ($results | ForEach-Object { "[$($_.Status)] $($_.Test) - $($_.Detail)" })
) | Set-Content -Path $reportPath -Encoding UTF8

Write-Host ""
Write-Host "Reporte guardado en: $reportPath" -ForegroundColor DarkGray

if ($script:Failed -gt 0) { exit 1 }
exit 0
