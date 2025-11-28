"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Eye, Trash2, Loader2, Upload, ChevronLeft, ChevronRight, Edit } from "lucide-react"
import { formatDate, getStatusColor } from "@/lib/utils"
import { CreateProcessDialog } from "@/components/admin/create-process-dialog"
import { UploadExcelDialog } from "@/components/admin/upload-excel-dialog"
import { solicitudService } from "@/lib/api"
import { useSolicitudes } from "@/hooks/useSolicitudes"
import { Label } from "@/components/ui/label"
import { CustomAlertDialog } from "@/components/CustomAlertDialog"
import { useToastNotification } from "@/components/ui/use-toast-notification"

interface Solicitud {
  id: number
  cargo: string
  cliente: string
  tipo_servicio: string
  tipo_servicio_nombre: string
  consultor: string
  estado_solicitud: string
  etapa: string
  status: string
  fecha_creacion: string
  id_descripcion_cargo: number
}

export default function SolicitudesPage() {
  const { showToast } = useToastNotification()
  
  // Función helper para procesar mensajes de error de la API y convertirlos en mensajes amigables
  const processApiErrorMessage = (errorMessage: string | undefined | null, defaultMessage: string): string => {
    if (!errorMessage) return defaultMessage
    const message = errorMessage.toLowerCase()
    
    // Mensajes específicos de solicitudes
    if (message.includes('solicitud no encontrada') || message.includes('solicitud not found')) {
      return 'La solicitud no fue encontrada'
    }
    if (message.includes('id de solicitud inválido') || message.includes('id de solicitud invalido')) {
      return 'El identificador de la solicitud no es válido'
    }
    if (message.includes('no se puede eliminar') || message.includes('cannot delete')) {
      return 'No se puede eliminar esta solicitud. Puede tener datos asociados'
    }
    if (message.includes('error al obtener solicitudes') || message.includes('error al obtener solicitud')) {
      return 'No se pudieron cargar las solicitudes. Por favor intenta nuevamente'
    }
    
    // Mensajes generales
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
    if (message.includes('constraint') || message.includes('restricción') || message.includes('foreign key')) {
      return 'No se puede realizar esta acción debido a restricciones de datos. La solicitud puede tener información asociada'
    }
    if (message.includes('invalid') || message.includes('inválido') || message.includes('invalido')) {
      return 'Los datos proporcionados no son válidos'
    }
    if (message.includes('ha ocurrido un error inesperado')) {
      return errorMessage // Ya es un mensaje amigable
    }
    
    // Si el mensaje ya está en español y es claro, devolverlo capitalizado
    if (message.length > 0 && message[0] === message[0].toLowerCase()) {
      return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
    }
    return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
  }
  
  const {
    solicitudes,
    isLoading,
    searchTerm,
    statusFilter,
    serviceFilter,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    totalPages,
    totalSolicitudes,
    stats,
    serviceTypes,
    setSearchTerm,
    setStatusFilter,
    setServiceFilter,
    setSortBy,
    setSortOrder,
    deleteSolicitud,
    goToPage,
    nextPage,
    prevPage,
    handlePageSizeChange,
    refreshData,
  } = useSolicitudes()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showExcelDialog, setShowExcelDialog] = useState(false)
  const [selectedDescripcionCargoId, setSelectedDescripcionCargoId] = useState<number | null>(null)
  const [solicitudToEdit, setSolicitudToEdit] = useState<Solicitud | null>(null)
  
  // Estados para las alertas
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [solicitudToDelete, setSolicitudToDelete] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    setSolicitudToDelete(id)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDeleteSolicitud = async () => {
    if (!solicitudToDelete) return

    try {
      const result = await deleteSolicitud(solicitudToDelete)
      
      setIsDeleteConfirmOpen(false)
      setSolicitudToDelete(null)
      
      if (result.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: result.message || 'La solicitud ha sido eliminada exitosamente',
        })
      } else {
        const errorMsg = processApiErrorMessage(result.message, 'Hubo un error al eliminar la solicitud')
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      }
    } catch (error: any) {
      console.error('Error deleting solicitud:', error)
      setIsDeleteConfirmOpen(false)
      setSolicitudToDelete(null)
      const errorMsg = processApiErrorMessage(error.message, 'Hubo un error al eliminar la solicitud')
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    }
  }

  const handleUploadExcel = (descripcionCargoId: number) => {
    setSelectedDescripcionCargoId(descripcionCargoId)
    setShowExcelDialog(true)
  }

  const handleEdit = (solicitud: Solicitud) => {
    setSolicitudToEdit(solicitud)
    setShowCreateDialog(true)
  }

  const handleCloseDialog = (open: boolean) => {
    setShowCreateDialog(open)
    if (!open) {
      // Limpiar la solicitud a editar cuando se cierra el diálogo
      setSolicitudToEdit(null)
    }
  }

  // Los solicitudes ya vienen filtrados del servidor, no necesitamos filtrar en el cliente

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes</h1>
          <p className="text-muted-foreground">Gestiona todas las solicitudes de reclutamiento</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Solicitudes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.en_progreso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cargo, cliente o consultor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="creado">Creado</SelectItem>
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
                  <SelectItem key={type.codigo} value={type.codigo}>
                    {type.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Solicitudes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Solicitudes</CardTitle>
          <CardDescription>
            {totalSolicitudes} solicitudes encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : solicitudes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {totalSolicitudes === 0 
                ? "No hay solicitudes creadas. Crea una nueva solicitud para comenzar."
                : "No se encontraron solicitudes con los filtros aplicados."}
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                  <TableHead>ID</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo de Servicio</TableHead>
                <TableHead>Consultor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {solicitudes.map((solicitud) => (
                  <TableRow key={solicitud.id}>
                    <TableCell className="font-mono text-sm">{solicitud.id}</TableCell>
                    <TableCell className="font-medium">{solicitud.cargo}</TableCell>
                    <TableCell>{solicitud.cliente}</TableCell>
                  <TableCell>
                      <Badge variant="outline">{solicitud.tipo_servicio_nombre}</Badge>
                  </TableCell>
                    <TableCell>{solicitud.consultor}</TableCell>
                  <TableCell>
                      <div className="space-y-1">
                        <Badge className={getStatusColor(solicitud.status)}>
                          {solicitud.estado_solicitud}
                        </Badge>
                        <div className="text-xs text-muted-foreground">{solicitud.etapa}</div>
                      </div>
                  </TableCell>
                    <TableCell>{formatDate(solicitud.fecha_creacion)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(solicitud)}
                          title="Editar solicitud"
                        >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Controles de Paginación */}
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
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalSolicitudes)} de {totalSolicitudes} solicitudes
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

      {/* Create/Edit Process Dialog */}
      <CreateProcessDialog 
        open={showCreateDialog} 
        onOpenChange={handleCloseDialog}
        solicitudToEdit={solicitudToEdit}
        onSuccess={refreshData}
      />

      {/* Upload Excel Dialog */}
      {selectedDescripcionCargoId && (
        <UploadExcelDialog
          open={showExcelDialog}
          onOpenChange={setShowExcelDialog}
          descripcionCargoId={selectedDescripcionCargoId}
        />
      )}

      {/* Alert de confirmación para eliminar */}
      <CustomAlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        type="confirm"
        title="¿Eliminar solicitud?"
        description="Esta acción no se puede deshacer. La solicitud será eliminada permanentemente del sistema."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteSolicitud}
        onCancel={() => {
          setIsDeleteConfirmOpen(false)
          setSolicitudToDelete(null)
        }}
      />
    </div>
  )
}
