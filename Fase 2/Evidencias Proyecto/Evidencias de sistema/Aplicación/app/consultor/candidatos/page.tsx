"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Users,
  X,
  Eye
} from "lucide-react"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { comunaService, profesionService } from "@/lib/api"

interface Candidato {
  id: string
  name: string
  nombre: string
  primer_apellido: string
  segundo_apellido: string
  email: string
  phone: string
  rut: string
  edad: number | null
  comuna: string
  nacionalidad: string
  profesion: string
  total_postulaciones: number
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface Comuna {
  id_comuna: number
  nombre_comuna: string
}

interface Profesion {
  id_profesion: number
  nombre_profesion: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function HistorialCandidatosPage() {
  const { showToast } = useToastNotification()
  
  // Estado de datos
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [isLoading, setIsLoading] = useState(true)
  
  // Listas para dropdowns
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [profesiones, setProfesiones] = useState<Profesion[]>([])
  const [isLoadingLists, setIsLoadingLists] = useState(true)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [rutFilter, setRutFilter] = useState("")
  const [comunaFilter, setComunaFilter] = useState("")
  const [profesionFilter, setProfesionFilter] = useState("")
  const [pageSize, setPageSize] = useState(20)
  
  // Estado para debounce
  const [debouncedSearch, setDebouncedSearch] = useState("")
  
  // Modal de detalle
  const [selectedCandidate, setSelectedCandidate] = useState<Candidato | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  // Cargar listas de comunas y profesiones
  useEffect(() => {
    const loadLists = async () => {
      setIsLoadingLists(true)
      try {
        const [comunasRes, profesionesRes] = await Promise.all([
          comunaService.getAll(),
          profesionService.getAll()
        ])
        
        if (comunasRes.success && comunasRes.data) {
          // Ordenar comunas alfabéticamente
          const sortedComunas = [...comunasRes.data].sort((a, b) => 
            a.nombre_comuna.localeCompare(b.nombre_comuna)
          )
          setComunas(sortedComunas)
        }
        
        if (profesionesRes.success && profesionesRes.data) {
          // Ordenar profesiones alfabéticamente
          const sortedProfesiones = [...profesionesRes.data].sort((a, b) => 
            a.nombre_profesion.localeCompare(b.nombre_profesion)
          )
          setProfesiones(sortedProfesiones)
        }
      } catch (error) {
        console.error('Error loading lists:', error)
      } finally {
        setIsLoadingLists(false)
      }
    }
    
    loadLists()
  }, [])

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Función para cargar candidatos
  const fetchCandidatos = useCallback(async (page: number = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })
      
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (rutFilter) params.append('rut', rutFilter)
      if (comunaFilter) params.append('comuna', comunaFilter)
      if (profesionFilter) params.append('profesion', profesionFilter)
      
      const response = await fetch(`${API_URL}/api/candidatos/historial?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      })
      
      if (!response.ok) {
        throw new Error('Error al cargar candidatos')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setCandidatos(result.data.data || [])
        setPagination(result.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 20,
          hasNextPage: false,
          hasPrevPage: false
        })
      }
    } catch (error) {
      console.error('Error fetching candidatos:', error)
      showToast({
        type: "error",
        title: "Error",
        description: "No se pudieron cargar los candidatos"
      })
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, rutFilter, comunaFilter, profesionFilter, pageSize, showToast])

  // Cargar candidatos cuando cambian los filtros
  useEffect(() => {
    fetchCandidatos(1)
  }, [debouncedSearch, rutFilter, comunaFilter, profesionFilter, pageSize])

  // Funciones de paginación
  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchCandidatos(page)
    }
  }

  const nextPage = () => {
    if (pagination.hasNextPage) {
      goToPage(pagination.currentPage + 1)
    }
  }

  const prevPage = () => {
    if (pagination.hasPrevPage) {
      goToPage(pagination.currentPage - 1)
    }
  }

  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm("")
    setRutFilter("")
    setComunaFilter("")
    setProfesionFilter("")
  }

  // Ver detalle de candidato
  const viewCandidateDetail = (candidato: Candidato) => {
    setSelectedCandidate(candidato)
    setShowDetailDialog(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Candidatos</h1>
          <p className="text-muted-foreground">
            Consulta todos los candidatos registrados en el sistema
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Users className="mr-2 h-5 w-5" />
          {pagination.totalItems} candidatos
        </Badge>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros de búsqueda</CardTitle>
          <CardDescription>
            Utiliza los filtros para encontrar candidatos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Búsqueda general */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="search">Búsqueda general</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nombre, email o RUT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro por RUT */}
            <div className="space-y-2">
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                placeholder="Buscar por RUT..."
                value={rutFilter}
                onChange={(e) => setRutFilter(e.target.value)}
              />
            </div>

            {/* Filtro por Comuna - Dropdown */}
            <div className="space-y-2">
              <Label>Comuna</Label>
              <Select 
                value={comunaFilter || "all"} 
                onValueChange={(v) => setComunaFilter(v === "all" ? "" : v)}
                disabled={isLoadingLists}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las comunas" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">Todas las comunas</SelectItem>
                  {comunas.map((comuna) => (
                    <SelectItem key={comuna.id_comuna} value={comuna.nombre_comuna}>
                      {comuna.nombre_comuna}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Profesión - Dropdown */}
            <div className="space-y-2">
              <Label>Profesión</Label>
              <Select 
                value={profesionFilter || "all"} 
                onValueChange={(v) => setProfesionFilter(v === "all" ? "" : v)}
                disabled={isLoadingLists}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las profesiones" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">Todas las profesiones</SelectItem>
                  {profesiones.map((profesion) => (
                    <SelectItem key={profesion.id_profesion} value={profesion.nombre_profesion}>
                      {profesion.nombre_profesion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items por página */}
            <div className="space-y-2">
              <Label>Mostrar</Label>
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botón limpiar filtros */}
          {(searchTerm || rutFilter || comunaFilter || profesionFilter) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de candidatos */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Cargando candidatos...</span>
            </div>
          ) : candidatos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No se encontraron candidatos</h3>
              <p className="text-muted-foreground">
                {searchTerm || rutFilter || comunaFilter 
                  ? "Intenta ajustar los filtros de búsqueda" 
                  : "No hay candidatos registrados en el sistema"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Nombre</TableHead>
                      <TableHead className="min-w-[110px]">RUT</TableHead>
                      <TableHead className="min-w-[200px]">Email</TableHead>
                      <TableHead className="min-w-[120px]">Teléfono</TableHead>
                      <TableHead className="min-w-[120px]">Comuna</TableHead>
                      <TableHead className="min-w-[150px]">Profesión</TableHead>
                      <TableHead className="text-center min-w-[80px]">Post.</TableHead>
                      <TableHead className="text-right min-w-[80px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidatos.map((candidato) => (
                      <TableRow key={candidato.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div>
                            <p className="font-semibold truncate max-w-[180px]" title={candidato.name}>
                              {candidato.name}
                            </p>
                            {candidato.edad && (
                              <p className="text-sm text-muted-foreground">{candidato.edad} años</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {candidato.rut || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate block max-w-[200px]" title={candidato.email}>
                            {candidato.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{candidato.phone}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm truncate block max-w-[120px]" title={candidato.comuna || ''}>
                            {candidato.comuna || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {candidato.profesion ? (
                            <Badge variant="outline" className="truncate max-w-[140px]" title={candidato.profesion}>
                              {candidato.profesion}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={candidato.total_postulaciones > 0 ? "default" : "secondary"}>
                            {candidato.total_postulaciones}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewCandidateDetail(candidato)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} a{' '}
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de{' '}
                  {pagination.totalItems} candidatos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={!pagination.hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum: number
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1
                      } else if (pagination.currentPage <= 3) {
                        pageNum = i + 1
                      } else if (pagination.currentPage >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i
                      } else {
                        pageNum = pagination.currentPage - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-9"
                          onClick={() => goToPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={!pagination.hasNextPage}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalle del candidato */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Candidato</DialogTitle>
            <DialogDescription>
              Información completa del candidato seleccionado
            </DialogDescription>
          </DialogHeader>
          
          {selectedCandidate && (
            <div className="space-y-6">
              {/* Información personal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Nombre completo</Label>
                  <p className="font-medium">{selectedCandidate.name}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">RUT</Label>
                  <p className="font-medium">{selectedCandidate.rut || 'No especificado'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedCandidate.email}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Teléfono</Label>
                  <p className="font-medium">{selectedCandidate.phone}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Edad</Label>
                  <p className="font-medium">{selectedCandidate.edad ? `${selectedCandidate.edad} años` : 'No especificada'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Comuna</Label>
                  <p className="font-medium">{selectedCandidate.comuna || 'No especificada'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Nacionalidad</Label>
                  <p className="font-medium">{selectedCandidate.nacionalidad || 'No especificada'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Profesión</Label>
                  <p className="font-medium">{selectedCandidate.profesion || 'No especificada'}</p>
                </div>
              </div>

              {/* Estadísticas */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {selectedCandidate.total_postulaciones} postulaciones
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

