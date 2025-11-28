"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Plus, Search, Edit, Trash2, Loader2, ChevronLeft, ChevronRight, Globe } from "lucide-react"
import { CustomAlertDialog } from "@/components/CustomAlertDialog"
import { useFormValidation } from "@/hooks/useFormValidation"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import { portalService } from "@/lib/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Función helper para procesar mensajes de error de la API y convertirlos en mensajes amigables
const processApiErrorMessage = (errorMessage: string | undefined | null, defaultMessage: string): string => {
  if (!errorMessage) return defaultMessage
  
  const message = errorMessage.toLowerCase()
  
  // Mensajes técnicos que deben ser reemplazados
  if (message.includes('validate') && message.includes('field')) {
    return 'Por favor verifica que todos los campos estén completos correctamente'
  }
  if (message.includes('validation error')) {
    return 'Error de validación. Por favor verifica los datos ingresados'
  }
  if (message.includes('required field')) {
    return 'Faltan campos obligatorios. Por favor completa todos los campos requeridos'
  }
  if (message.includes('invalid') && message.includes('format')) {
    return 'El formato de algunos datos es incorrecto. Por favor verifica la información'
  }
  if (message.includes('duplicate') || message.includes('duplicado')) {
    return 'Ya existe un portal con este nombre. Por favor verifica la información'
  }
  if (message.includes('not found') || message.includes('no encontrado')) {
    return 'No se encontró el recurso solicitado'
  }
  if (message.includes('unauthorized') || message.includes('no autorizado')) {
    return 'No tienes permisos para realizar esta acción'
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
  
  // Si el mensaje parece técnico pero no coincide con ningún patrón, usar el mensaje por defecto
  if (message.includes('error') && (message.includes('code') || message.includes('status'))) {
    return defaultMessage
  }
  
  // Si el mensaje parece amigable, devolverlo tal cual (capitalizado)
  return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
}

interface Portal {
  id: number
  nombre: string
}

export default function PortalesPage() {
  const { showToast } = useToastNotification()
  const { errors, validateField, clearAllErrors, setFieldError } = useFormValidation()

  const [portales, setPortales] = useState<Portal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Estados para el formulario
  const [newPortal, setNewPortal] = useState({
    nombre_portal_postulacion: "",
  })
  const [editingPortal, setEditingPortal] = useState<Portal | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para alertas
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [portalToDelete, setPortalToDelete] = useState<number | null>(null)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Cargar datos iniciales
  useEffect(() => {
    fetchPortales()
  }, [])

  const fetchPortales = async () => {
    setIsLoading(true)
    try {
      const response = await portalService.getAll()
      if (response.success) {
        // Transformar los datos si vienen con diferentes nombres de campos
        const portalesData = (response.data || []).map((portal: any) => ({
          id: portal.id || portal.id_portal_postulacion,
          nombre: portal.nombre || portal.nombre_portal_postulacion,
        }))
        setPortales(portalesData)
      } else {
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(response.message, "Error al cargar portales"),
        })
      }
    } catch (error: any) {
      console.error("Error fetching portales:", error)
      showToast({
        type: "error",
        title: "Error",
        description: "Error al cargar portales",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrar portales
  const filteredPortales = portales.filter((portal) => {
    const matchesSearch =
      searchTerm === "" ||
      portal.nombre.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  // Paginación
  const totalPages = Math.ceil(filteredPortales.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedPortales = filteredPortales.slice(startIndex, endIndex)

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

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setCurrentPage(1)
  }

  // Handlers
  const handleCreatePortal = async () => {
    setIsSubmitting(true)
    clearAllErrors()

    // Validar campos
    if (!newPortal.nombre_portal_postulacion || newPortal.nombre_portal_postulacion.trim().length < 2) {
      setFieldError('nombre_portal_postulacion', 'El nombre del portal debe tener al menos 2 caracteres')
      showToast({
        type: "error",
        title: "Error de validación",
        description: "El nombre del portal debe tener al menos 2 caracteres",
      })
      setIsSubmitting(false)
      return
    }

    if (newPortal.nombre_portal_postulacion.length > 100) {
      setFieldError('nombre_portal_postulacion', 'El nombre del portal no puede exceder 100 caracteres')
      showToast({
        type: "error",
        title: "Error de validación",
        description: "El nombre del portal no puede exceder 100 caracteres",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const response = await portalService.create({
        nombre_portal_postulacion: newPortal.nombre_portal_postulacion.trim(),
      })
      setIsSubmitting(false)

      if (response.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: "Portal creado correctamente",
        })
        setIsCreateDialogOpen(false)
        setNewPortal({
          nombre_portal_postulacion: "",
        })
        fetchPortales()
      } else {
        const errorMsg = processApiErrorMessage(response.message, "Error creando portal")
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      }
    } catch (error: any) {
      setIsSubmitting(false)
      showToast({
        type: "error",
        title: "Error",
        description: processApiErrorMessage(error.message, "Error creando portal"),
      })
    }
  }

  const handleEditPortal = (portal: Portal) => {
    setEditingPortal(portal)
    setNewPortal({
      nombre_portal_postulacion: portal.nombre,
    })
    setIsCreateDialogOpen(true)
    clearAllErrors()
  }

  const handleUpdatePortal = async () => {
    if (!editingPortal) return

    setIsSubmitting(true)
    clearAllErrors()

    // Validar campos
    if (!newPortal.nombre_portal_postulacion || newPortal.nombre_portal_postulacion.trim().length < 2) {
      setFieldError('nombre_portal_postulacion', 'El nombre del portal debe tener al menos 2 caracteres')
      showToast({
        type: "error",
        title: "Error de validación",
        description: "El nombre del portal debe tener al menos 2 caracteres",
      })
      setIsSubmitting(false)
      return
    }

    if (newPortal.nombre_portal_postulacion.length > 100) {
      setFieldError('nombre_portal_postulacion', 'El nombre del portal no puede exceder 100 caracteres')
      showToast({
        type: "error",
        title: "Error de validación",
        description: "El nombre del portal no puede exceder 100 caracteres",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const response = await portalService.update(editingPortal.id, {
        nombre_portal_postulacion: newPortal.nombre_portal_postulacion.trim(),
      })
      setIsSubmitting(false)

      if (response.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: "Portal actualizado correctamente",
        })
        setIsCreateDialogOpen(false)
        setEditingPortal(null)
        setNewPortal({
          nombre_portal_postulacion: "",
        })
        fetchPortales()
      } else {
        const errorMsg = processApiErrorMessage(response.message, "Error actualizando portal")
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      }
    } catch (error: any) {
      setIsSubmitting(false)
      showToast({
        type: "error",
        title: "Error",
        description: processApiErrorMessage(error.message, "Error actualizando portal"),
      })
    }
  }

  const handleDeletePortal = (id: number) => {
    setPortalToDelete(id)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDeletePortal = async () => {
    if (!portalToDelete) return

    try {
      const response = await portalService.delete(portalToDelete)
      if (response.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: "Portal eliminado correctamente",
        })
        fetchPortales()
      } else {
        const errorMsg = processApiErrorMessage(response.message, "Error eliminando portal")
        const isPublicacionError = errorMsg.toLowerCase().includes('publicación') || errorMsg.toLowerCase().includes('asociada')
        showToast({
          type: "error",
          title: isPublicacionError ? "No se puede eliminar" : "Error",
          description: errorMsg,
        })
      }
    } catch (error: any) {
      const errorMsg = processApiErrorMessage(error.message, "Error eliminando portal")
      const isPublicacionError = errorMsg.toLowerCase().includes('publicación') || errorMsg.toLowerCase().includes('asociada')
      showToast({
        type: "error",
        title: isPublicacionError ? "No se puede eliminar" : "Error",
        description: errorMsg,
      })
    } finally {
      setIsDeleteConfirmOpen(false)
      setPortalToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header y botón crear */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Portales</h1>
          <p className="text-muted-foreground">Administra los portales de postulación disponibles</p>
        </div>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) {
              setEditingPortal(null)
              setNewPortal({
                nombre_portal_postulacion: "",
              })
              clearAllErrors()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Portal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPortal ? "Editar Portal" : "Crear Nuevo Portal"}</DialogTitle>
              <DialogDescription>Ingresa el nombre del portal de postulación</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre_portal_postulacion">Nombre del Portal *</Label>
                <Input
                  id="nombre_portal_postulacion"
                  value={newPortal.nombre_portal_postulacion}
                  onChange={(e) => {
                    setNewPortal({ ...newPortal, nombre_portal_postulacion: e.target.value })
                    if (errors.nombre_portal_postulacion) {
                      clearAllErrors()
                    }
                  }}
                  placeholder="Ej: LinkedIn, Indeed, Trabajando.com"
                  maxLength={100}
                  className={errors.nombre_portal_postulacion ? "border-red-500" : ""}
                />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {newPortal.nombre_portal_postulacion.length}/100 caracteres (mínimo 2)
                  </div>
                  {errors.nombre_portal_postulacion && (
                    <p className="text-sm text-red-500">{errors.nombre_portal_postulacion as string}</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  setEditingPortal(null)
                  setNewPortal({
                    nombre_portal_postulacion: "",
                  })
                  clearAllErrors()
                }}
              >
                Cancelar
              </Button>
              <Button onClick={editingPortal ? handleUpdatePortal : handleCreatePortal} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingPortal ? "Actualizando..." : "Creando..."}
                  </>
                ) : editingPortal ? (
                  "Actualizar Portal"
                ) : (
                  "Crear Portal"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Card */}
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portales</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portales.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de portal..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de portales */}
      <Card>
        <CardHeader>
          <CardTitle>Portales</CardTitle>
          <CardDescription>Lista de todos los portales de postulación registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre del Portal</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Cargando portales...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedPortales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No se encontraron portales
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPortales.map((portal) => (
                  <TableRow key={portal.id}>
                    <TableCell>{portal.id}</TableCell>
                    <TableCell className="font-medium">{portal.nombre}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditPortal(portal)} title="Editar portal">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePortal(portal.id)}
                        title="Eliminar portal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Controles de paginación */}
      {filteredPortales.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="pageSize">Filas por página:</Label>
                  <select
                    id="pageSize"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                    className="h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredPortales.length)} de{" "}
                  {filteredPortales.length} portales
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={prevPage} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
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
                    )
                  })}
                </div>

                <Button variant="outline" size="sm" onClick={nextPage} disabled={currentPage === totalPages}>
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmación de eliminación */}
      <CustomAlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        type="confirm"
        title="¿Eliminar portal?"
        description="Esta acción no se puede deshacer. El portal será eliminado permanentemente del sistema."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeletePortal}
        onCancel={() => setPortalToDelete(null)}
      />
    </div>
  )
}

