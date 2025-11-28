"use client"

import { useState, useEffect, type KeyboardEvent } from "react"
import { useAuth } from "@/hooks/auth"
import { logService, userService, type LogCambio, type LogEstadisticas } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, History, User, FileText, Calendar, Loader2, Eye, ChevronLeft, ChevronRight, X } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToastNotification } from "@/components/ui/use-toast-notification"

// Interfaces para enriquecimiento de datos
interface LogEnriquecido extends LogCambio {
  usuarioNombre?: string;
}

interface Usuario {
  rut_usuario: string;
  nombre_usuario: string;
  apellido_usuario?: string;
}

export default function HistorialPage() {
  const { user } = useAuth()
  const { showToast } = useToastNotification()
  
  // Función helper para procesar mensajes de error de la API
  const processApiErrorMessage = (errorMessage: string | undefined | null, defaultMessage: string): string => {
    if (!errorMessage) return defaultMessage
    const message = errorMessage.toLowerCase()
    
    // Mensajes específicos de historial
    if (message.includes('error al cargar historial') || message.includes('error al obtener historial')) {
      return 'Error al cargar el historial de cambios'
    }
    if (message.includes('error al obtener estadísticas') || message.includes('error al obtener estadisticas')) {
      return 'Error al obtener estadísticas del historial'
    }
    if (message.includes('error al obtener usuarios')) {
      return 'Error al obtener información de usuarios'
    }
    
    // Mensajes generales
    if (message.includes('not found') || message.includes('no encontrado')) {
      return 'No se encontraron los datos solicitados'
    }
    if (message.includes('unauthorized') || message.includes('no autorizado')) {
      return 'No tienes permisos para acceder a estos datos'
    }
    if (message.includes('network') || message.includes('red')) {
      return 'Error de conexión. Por favor verifica tu conexión a internet'
    }
    if (message.includes('timeout')) {
      return 'La operación tardó demasiado. Por favor intenta nuevamente'
    }
    if (message.includes('server error') || message.includes('error del servidor')) {
      return 'Error en el servidor. Por favor intenta más tarde'
    }
    
    // Si el mensaje ya está en español y es claro, devolverlo tal cual
    return errorMessage || defaultMessage
  }
  
  const [logs, setLogs] = useState<LogEnriquecido[]>([])
  const [stats, setStats] = useState<LogEstadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localSearchTerm, setLocalSearchTerm] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [tablaFilter, setTablaFilter] = useState<string>("all")
  const [accionFilter, setAccionFilter] = useState<string>("all")
  const [usuarioFilter, setUsuarioFilter] = useState<string>("all")
  const [usuariosMap, setUsuariosMap] = useState<Map<string, string>>(new Map())
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalLogs, setTotalLogs] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Valores únicos para filtros (cargados una vez al inicio)
  const [allTablasUnicas, setAllTablasUnicas] = useState<string[]>([])
  const [allUsuariosUnicos, setAllUsuariosUnicos] = useState<string[]>([])

  // Cargar usuarios y valores únicos para filtros (solo una vez al inicio)
  useEffect(() => {
    async function loadInitialData() {
      if (user?.role !== "admin") return

      try {
        // Cargar usuarios para enriquecer logs
        const usuariosResponse = await userService.getAll()
        if (usuariosResponse.success && usuariosResponse.data) {
          const responseData: any = usuariosResponse.data
          const usuariosData = responseData.users || responseData
          const rutToNombre = new Map<string, string>()
          
          const normalizarRut = (rut: string): string => {
            return rut.replace(/[.\-]/g, '').toLowerCase()
          }
          
          usuariosData.forEach((u: any) => {
            const nombreCompleto = `${u.nombre_usuario || ''} ${u.apellido_usuario || ''}`.trim()
            const rutNormalizado = normalizarRut(u.rut_usuario)
            rutToNombre.set(rutNormalizado, nombreCompleto)
          })
          
          setUsuariosMap(rutToNombre)
        }

        // Cargar todos los logs sin paginación para obtener valores únicos de tablas y usuarios
        // Usamos un límite alto para obtener todos los valores únicos
        const allLogsResponse = await logService.getLogs({ limit: 10000 })
        if (allLogsResponse.success && allLogsResponse.data) {
          const allLogs = allLogsResponse.data
          
          // Obtener valores únicos de tablas
          const tablasUnicas = [...new Set(allLogs.map((log: LogCambio) => log.tabla_afectada))].sort()
          setAllTablasUnicas(tablasUnicas)
          
          // Obtener valores únicos de usuarios
          const usuariosUnicos = [...new Set(allLogs.map((log: LogCambio) => log.usuario_responsable))].sort()
          setAllUsuariosUnicos(usuariosUnicos)
        }
      } catch (err: any) {
        console.error('Error cargando datos iniciales:', err)
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(err?.message, "Error al cargar datos iniciales del historial"),
        })
      }
    }

    loadInitialData()
  }, [user])

  // Cargar logs con paginación del servidor
  useEffect(() => {
    async function loadData() {
      if (user?.role !== "admin") return

      try {
        setLoading(true)
        setError(null)

        // Calcular offset basado en la página actual
        const offset = (currentPage - 1) * pageSize

        // Preparar filtros para el backend
        const searchParams: any = {
          limit: pageSize,
          offset: offset
        }

        if (tablaFilter !== "all") {
          searchParams.tabla = tablaFilter
        }
        if (accionFilter !== "all") {
          searchParams.accion = accionFilter
        }
        if (usuarioFilter !== "all") {
          searchParams.usuario = usuarioFilter
        }

        // Cargar logs y estadísticas en paralelo
        const [logsResponse, statsResponse, totalResponse] = await Promise.all([
          logService.search(searchParams),
          logService.getEstadisticas(),
          // Para obtener el total, hacemos una búsqueda sin limit para contar
          logService.search({
            ...searchParams,
            limit: 10000, // Límite alto para contar
            offset: 0
          })
        ])

        if (logsResponse.success && logsResponse.data) {
          const logsData = logsResponse.data

          // Enriquecer con nombres de usuario
          const normalizarRut = (rut: string): string => {
            return rut.replace(/[.\-]/g, '').toLowerCase()
          }
          
          const logsEnriquecidos: LogEnriquecido[] = logsData.map((log: LogCambio) => ({
            ...log,
            usuarioNombre: usuariosMap.get(normalizarRut(log.usuario_responsable))
          }))
          
          setLogs(logsEnriquecidos)

          // Calcular total de registros filtrados
          if (totalResponse.success && totalResponse.data) {
            const totalFiltered = totalResponse.data.length
            setTotalLogs(totalFiltered)
            setTotalPages(Math.ceil(totalFiltered / pageSize))
          } else {
            // Si no podemos obtener el total, usar la longitud de los datos actuales
            setTotalLogs(logsData.length)
            setTotalPages(1)
          }
        }

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data)
        }
      } catch (err: any) {
        console.error('Error cargando historial:', err)
        const errorMsg = processApiErrorMessage(err?.message, 'Error al cargar el historial de cambios')
        setError(errorMsg)
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, currentPage, pageSize, tablaFilter, accionFilter, usuarioFilter, usuariosMap])

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  // Funciones auxiliares para formateo
  const formatTabla = (tabla: string): string => {
    const nombres: Record<string, string> = {
      'solicitud': 'Solicitud',
      'candidato': 'Candidato',
      'postulacion': 'Postulación',
      'hito_solicitud': 'Hito',
      'cliente': 'Cliente',
      'contacto': 'Contacto',
      'usuario': 'Usuario'
    }
    return nombres[tabla] || tabla.charAt(0).toUpperCase() + tabla.slice(1)
  }

  const getAccionBadgeVariant = (accion: string): "default" | "secondary" | "destructive" | "outline" => {
    if (accion === 'INSERT') return 'default'
    if (accion === 'UPDATE') return 'secondary'
    if (accion === 'DELETE') return 'destructive'
    return 'outline'
  }

  const formatRut = (rut: string): string => {
    // Formatear RUT: 209942917 → 20.994.291-7
    const cleaned = rut.replace(/[^\dkK]/g, '')
    if (cleaned.length <= 1) return cleaned
    
    const dv = cleaned.slice(-1)
    const number = cleaned.slice(0, -1)
    const reversed = number.split('').reverse().join('')
    const formatted = reversed.match(/.{1,3}/g)?.join('.').split('').reverse().join('') || reversed
    
    return `${formatted}-${dv}`
  }

  // Filtrar logs por búsqueda de texto (filtrado en cliente ya que el backend no soporta search)
  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      log.detalle_cambio.toLowerCase().includes(searchLower) ||
      log.tabla_afectada.toLowerCase().includes(searchLower) ||
      log.id_registro.toLowerCase().includes(searchLower) ||
      (log.usuarioNombre && log.usuarioNombre.toLowerCase().includes(searchLower)) ||
      log.usuario_responsable.toLowerCase().includes(searchLower)
    )
  })

  // Los logs ya vienen ordenados del backend, pero aplicamos filtro de búsqueda
  const paginatedLogs = filteredLogs

  // Funciones de paginación
  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  // Detectar si hay filtros aplicados
  const hasFiltersApplied = searchTerm !== "" || tablaFilter !== "all" || accionFilter !== "all" || usuarioFilter !== "all"

  // Función para aplicar la búsqueda
  const handleSearch = () => {
    setSearchTerm(localSearchTerm)
    setCurrentPage(1)
  }

  // Función para limpiar todos los filtros
  const handleClearFilters = () => {
    setLocalSearchTerm("")
    setSearchTerm("")
    setTablaFilter("all")
    setAccionFilter("all")
    setUsuarioFilter("all")
    setCurrentPage(1)
  }

  // Manejar Enter en el campo de búsqueda
  const handleSearchKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Resetear a página 1 cuando cambien los filtros (excepto searchTerm que se filtra en cliente)
  useEffect(() => {
    setCurrentPage(1)
  }, [tablaFilter, accionFilter, usuarioFilter])

  // Obtener valores únicos para filtros
  const accionesUnicas: ('INSERT' | 'UPDATE' | 'DELETE')[] = ['INSERT', 'UPDATE', 'DELETE']
  const tablasUnicas = allTablasUnicas
  const usuariosUnicos = allUsuariosUnicos

  // Estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Cargando historial de cambios...</p>
        </div>
      </div>
    )
  }

  // Componente para mostrar el detalle con opción de expandir
  const DetalleCell = ({ detalle }: { detalle: string }) => {
    const MAX_LENGTH = 80
    const cambios = detalle.split(' | ')
    const isLong = detalle.length > MAX_LENGTH

    if (!isLong) {
      return <div className="text-sm">{detalle}</div>
    }

    return (
      <div className="flex items-center gap-2">
        <div className="text-sm truncate max-w-[300px]" title={detalle}>
          {detalle}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalle del cambio</DialogTitle>
              <DialogDescription>
                Información completa de los campos modificados
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {cambios.map((cambio, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-muted rounded-md text-sm font-mono border"
                >
                  {cambio.trim()}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Estado de error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Error al cargar historial</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <History className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Movimientos</h1>
          <p className="text-muted-foreground">Trazabilidad completa de todas las acciones del sistema</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movimientos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_logs || logs.length}</div>
            <p className="text-xs text-muted-foreground">Registros en sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.usuarios_activos || new Set(logs.map(log => log.usuario_responsable)).size}
            </div>
            <p className="text-xs text-muted-foreground">Con actividad registrada</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tablas Afectadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.tablas_afectadas || tablasUnicas.length}
            </div>
            <p className="text-xs text-muted-foreground">Con cambios registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Acción</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accionesUnicas.length}</div>
            <p className="text-xs text-muted-foreground">INSERT, UPDATE, DELETE</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtra y busca en el historial de cambios del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por tabla, usuario, detalle o ID de registro..."
                      value={localSearchTerm}
                      onChange={(e) => setLocalSearchTerm(e.target.value)}
                      onKeyPress={handleSearchKeyPress}
                      className="pl-8"
                    />
                  </div>
                  <Button onClick={handleSearch} type="button">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                  {hasFiltersApplied && (
                    <Button 
                      variant="outline" 
                      onClick={handleClearFilters}
                      type="button"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={tablaFilter} onValueChange={setTablaFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Tabla" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tablas</SelectItem>
                  {tablasUnicas.map((tabla) => (
                    <SelectItem key={tabla} value={tabla}>
                      {formatTabla(tabla)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={accionFilter} onValueChange={setAccionFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  {accionesUnicas.map((accion) => (
                    <SelectItem key={accion} value={accion}>
                      {accion === 'INSERT' ? 'Creación' : accion === 'UPDATE' ? 'Actualización' : 'Eliminación'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={usuarioFilter} onValueChange={setUsuarioFilter}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Usuario">
                    {usuarioFilter === "all" ? (
                      "Todos los usuarios"
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>
                          {usuariosMap.get(usuarioFilter.replace(/[.\-]/g, '').toLowerCase()) || formatRut(usuarioFilter)}
                        </span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Todos los usuarios</span>
                    </div>
                  </SelectItem>
                  {usuariosUnicos.map((rut) => {
                    const normalizarRut = (rutStr: string): string => {
                      return rutStr.replace(/[.\-]/g, '').toLowerCase()
                    }
                    const nombreUsuario = usuariosMap.get(normalizarRut(rut))
                    return (
                      <SelectItem key={rut} value={rut}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <div className="flex flex-col min-w-0">
                            {nombreUsuario ? (
                              <>
                                <span className="font-medium truncate">{nombreUsuario}</span>
                                <span className="text-xs text-muted-foreground font-mono">{formatRut(rut)}</span>
                              </>
                            ) : (
                              <span className="font-mono">{formatRut(rut)}</span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Actividad</CardTitle>
          <CardDescription>
            {totalLogs} de {logs.length} movimientos
            {totalLogs === 0 && " (sin resultados con los filtros actuales)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalLogs === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No se encontraron registros</p>
              <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Fecha y Hora</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Tabla</TableHead>
                      <TableHead className="w-[100px]">Registro ID</TableHead>
                      <TableHead className="w-[120px]">Acción</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow key={log.id_log}>
                        <TableCell className="font-mono text-sm">
                          {formatDateTime(log.fecha_cambio)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {log.usuarioNombre ? (
                              <>
                                <span className="text-sm font-medium">{log.usuarioNombre}</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {formatRut(log.usuario_responsable)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-mono">
                                {formatRut(log.usuario_responsable)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {formatTabla(log.tabla_afectada)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.id_registro}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getAccionBadgeVariant(log.accion)}>
                            {log.accion === 'INSERT' ? 'Crear' : 
                             log.accion === 'UPDATE' ? 'Actualizar' : 
                             'Eliminar'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DetalleCell detalle={log.detalle_cambio} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Controles de Paginación */}
              {totalLogs > 0 && (
                <div className="mt-4 pt-4 border-t">
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
                        Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalLogs)} de {totalLogs} registros
                        {searchTerm && ` (filtrados de ${logs.length} cargados)`}
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
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
