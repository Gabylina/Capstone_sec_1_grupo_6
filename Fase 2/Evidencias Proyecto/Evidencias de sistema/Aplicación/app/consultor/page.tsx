"use client"

import { useState } from "react"
import type { KeyboardEvent } from "react"
import { useAuth } from "@/hooks/auth"
import { useConsultorProcesses } from "@/hooks/useConsultorProcesses"
import { solicitudService } from "@/lib/api"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, Search, Eye, Calendar, Building2, Target, Clock, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    creado: "bg-blue-100 text-blue-800",
    en_progreso: "bg-purple-100 text-purple-800",
    cerrado: "bg-green-100 text-green-800",
    congelado: "bg-gray-100 text-gray-800",
    cancelado: "bg-red-100 text-red-800",
    cierre_extraordinario: "bg-orange-100 text-orange-800"
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

import { serviceTypeLabels, processStatusLabels } from "@/lib/utils"

export default function ConsultorPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { showToast } = useToastNotification()
  
  // Función helper para procesar mensajes de error de la API y convertirlos en mensajes amigables
  const processApiErrorMessage = (errorMessage: string | undefined | null, defaultMessage: string): string => {
    if (!errorMessage) return defaultMessage
    const message = errorMessage.toLowerCase()
    if (message.includes('validate') && message.includes('field')) {
      return 'Por favor verifica que todos los campos estén completos correctamente'
    }
    if (message.includes('not found') || message.includes('no encontrado')) {
      return 'El recurso solicitado no fue encontrado'
    }
    if (message.includes('unauthorized') || message.includes('no autorizado')) {
      return 'No tienes permisos para realizar esta acción'
    }
    if (message.includes('forbidden') || message.includes('prohibido')) {
      return 'Acceso denegado'
    }
    if (message.includes('network') || message.includes('red')) {
      return 'Error de conexión. Por favor verifica tu conexión a internet'
    }
    if (message.includes('timeout')) {
      return 'La operación tardó demasiado. Por favor intenta nuevamente'
    }
    if (message.includes('duplicate') || message.includes('duplicado')) {
      return 'Ya existe un registro con esta información'
    }
    if (message.includes('constraint') || message.includes('restricción')) {
      return 'No se puede realizar esta acción debido a restricciones de datos'
    }
    if (message.includes('invalid') || message.includes('inválido')) {
      return 'Los datos proporcionados no son válidos'
    }
    // Si el mensaje ya está en español y es claro, devolverlo capitalizado
    if (message.length > 0 && message[0] === message[0].toLowerCase()) {
      return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
    }
    return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
  }
  
  const [startingProcess, setStartingProcess] = useState<string | null>(null)
  
  // Estado local para el término de búsqueda (antes de aplicarlo)
  const [localSearchTerm, setLocalSearchTerm] = useState("")

  // Usar el hook personalizado para manejar procesos del consultor
  const {
    pendingProcesses,
    otherProcesses,
    isLoading,
    stats,
    serviceTypes,
    searchTerm,
    statusFilter,
    serviceFilter,
    setSearchTerm,
    setStatusFilter,
    setServiceFilter,
    currentPage,
    pageSize,
    totalPages,
    totalProcesses,
    goToPage,
    nextPage,
    prevPage,
    handlePageSizeChange,
    refreshData
  } = useConsultorProcesses(user?.id)
  
  // Detectar si hay filtros aplicados
  const hasFiltersApplied = searchTerm !== "" || statusFilter !== "all" || serviceFilter !== "all"
  
  // Función para aplicar la búsqueda
  const handleSearch = () => {
    setSearchTerm(localSearchTerm)
  }
  
  // Función para limpiar todos los filtros
  const handleClearFilters = () => {
    setLocalSearchTerm("")
    setSearchTerm("")
    setStatusFilter("all")
    setServiceFilter("all")
  }
  
  // Manejar Enter en el campo de búsqueda
  const handleSearchKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  if (user?.role !== "consultor") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando procesos...</p>
        </div>
      </div>
    )
  }

  const handleStartProcess = async (processId: string) => {
    try {
      setStartingProcess(processId)
      
      const response = await solicitudService.updateEstado(parseInt(processId), "en_progreso")
      
      if (response.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: "Proceso iniciado exitosamente",
        })
        await refreshData() // Recargar procesos usando el hook
        router.push(`/consultor/proceso/${processId}`)
      } else {
        const errorMsg = processApiErrorMessage(response.message, "Error al iniciar proceso")
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      }
    } catch (error: any) {
      console.error("Error al iniciar proceso:", error)
      const errorMsg = processApiErrorMessage(error.message, "Error al iniciar proceso")
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    } finally {
      setStartingProcess(null)
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Procesos</h1>
          <p className="text-muted-foreground">Gestiona tus procesos de reclutamiento asignados</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asignados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{stats.en_progreso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Congelados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.congelados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cierre Extraordinario</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.cierre_extraordinario}</div>
          </CardContent>
        </Card>
      </div>

      {pendingProcesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-600" />
              Procesos Pendientes de Iniciar
            </CardTitle>
            <CardDescription>Estos procesos están asignados pero aún no han sido iniciados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitud</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo de Servicio</TableHead>
                  <TableHead>Vacantes</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingProcesses.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-semibold text-blue-600">{process.id}</TableCell>
                    <TableCell className="font-medium">{process.position_title || process.cargo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {process.cliente}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {serviceTypeLabels[process.tipo_servicio] || process.tipo_servicio_nombre}
                      </Badge>
                    </TableCell>
                    <TableCell>{process.vacancies || process.vacantes || 0}</TableCell>
                    <TableCell>{new Date(process.created_at || process.fecha_creacion).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleStartProcess(process.id)}
                        disabled={startingProcess === process.id}
                      >
                        {startingProcess === process.id ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Iniciando...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Iniciar
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Los filtros solo se aplican a la tabla "Mis Procesos", no afectan a los procesos pendientes de iniciar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cargo o cliente..."
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-8"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary">
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
                <SelectItem value="congelado">Congelado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="cierre_extraordinario">Cierre Extraordinario</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los servicios</SelectItem>
                {serviceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleClearFilters} 
              variant="outline"
              disabled={!hasFiltersApplied}
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla unificada de Procesos en Curso, Completados, Congelados, Cancelados y Cierre Extraordinario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Mis Procesos
          </CardTitle>
          <CardDescription>
            {totalProcesses > 0 ? `${totalProcesses} procesos encontrados` : 'Sin resultados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando procesos...</p>
              </div>
            </div>
          ) : otherProcesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron procesos</h3>
              <p className="text-muted-foreground max-w-md">
                {searchTerm || statusFilter !== "all" || serviceFilter !== "all"
                  ? "No hay procesos que coincidan con los filtros aplicados. Intenta ajustar los filtros para ver más resultados."
                  : "No tienes procesos en curso, completados o en otros estados en este momento."}
              </p>
              {hasFiltersApplied && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleClearFilters}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitud</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo de Servicio</TableHead>
                  <TableHead>Estado Actual</TableHead>
                  <TableHead>Etapa Específica</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherProcesses.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-semibold text-blue-600">{process.id}</TableCell>
                    <TableCell className="font-medium">{process.position_title || process.cargo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {process.cliente}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {serviceTypeLabels[process.tipo_servicio] || process.tipo_servicio_nombre}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(process.status)}>
                        {process.estado_solicitud || processStatusLabels[process.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">{process.etapa || 'Sin etapa'}</div>
                    </TableCell>
                    <TableCell>
                      {new Date(process.started_at || process.completed_at || process.fecha_creacion).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant={process.estado_solicitud === "Cerrado" ? "outline" : "default"}>
                        <Link href={`/consultor/proceso/${process.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          {process.estado_solicitud === "Cerrado" ? "Ver Detalle" : "Gestionar"}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Controles de Paginación - Solo mostrar si hay resultados */}
      {otherProcesses.length > 0 && (
        <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pageSize">Filas por página:</Label>
                    <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalProcesses)} de {totalProcesses} procesos
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
      )}
    </div>
  )
}
