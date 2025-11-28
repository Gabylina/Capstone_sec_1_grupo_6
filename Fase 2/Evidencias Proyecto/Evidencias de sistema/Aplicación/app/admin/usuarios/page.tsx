"use client"

import { useState, useEffect } from "react"
import type { User, UserRole } from "@/lib/types"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { CustomAlertDialog } from "@/components/CustomAlertDialog"
import { useUsuarios } from "@/hooks/useUsuarios"
import { useFormValidation, validationSchemas, type ValidationRule } from "@/hooks/useFormValidation"
import { useToastNotification } from "@/components/ui/use-toast-notification"

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
    return 'Ya existe un registro con estos datos. Por favor verifica la información'
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

// Helper function para validar un campo individual (copiado de useFormValidation)
const validateSingleFieldHelper = (value: any, rule: ValidationRule): string | null => {
  // Validación requerida
  if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return rule.message || 'Este campo es requerido'
  }

  // Si el campo no es requerido y está vacío, no validar más
  if (!rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return null
  }

  // Validación de longitud mínima
  if (rule.minLength && typeof value === 'string' && value.trim().length < rule.minLength) {
    return rule.message || `Debe tener al menos ${rule.minLength} caracteres`
  }

  // Validación de longitud máxima
  if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
    return rule.message || `No puede exceder ${rule.maxLength} caracteres`
  }

  // Validación de patrón
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value.trim())) {
    return rule.message || 'Formato inválido'
  }

  // Validación personalizada
  if (rule.custom) {
    return rule.custom(value)
  }

  return null
}

export default function UsuariosPage() {
  const { showToast } = useToastNotification()
  
  const {
    users,
    filteredUsers,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    roleFilter,
    setRoleFilter,
    newUser,
    setNewUser,
    editingUser,
    editUser,
    createUser,
    updateUser,
    toggleStatus,
    deleteUser,
    fetchUsers,
    isLoading,
    // Pagination
    currentPage,
    pageSize,
    totalPages,
    totalUsers,
    goToPage,
    nextPage,
    prevPage,
    handlePageSizeChange,
    clearEditingUser,
  } = useUsuarios()

  // Hook de validación
  const { errors, validateField, validateAllFields, clearError, clearAllErrors, setFieldError } = useFormValidation()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estados para alertas  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  
  const [isToggleStatusOpen, setIsToggleStatusOpen] = useState(false)
  const [userToToggle, setUserToToggle] = useState<{ id: string; currentStatus: boolean } | null>(null)

  // Cargar usuarios iniciales
  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Limpiar confirmPassword y errores cuando se cierra el diálogo
  useEffect(() => {
    if (!isCreateDialogOpen) {
      setConfirmPassword("")
      setPasswordError(null)
      clearAllErrors()
      setIsSubmitting(false)
    }
  }, [isCreateDialogOpen, clearAllErrors])

  // filteredUsers ya viene del hook

  // -------------------
  // Badges
  // -------------------
  const getStatusBadge = (isActive: boolean) =>
    isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
        <UserCheck className="h-3 w-3 mr-1" /> Habilitado
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
        <UserX className="h-3 w-3 mr-1" /> Inhabilitado
      </Badge>
    )

  const getRoleBadge = (role: UserRole) =>
    role === "admin" ? (
      <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
        Administrador
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Consultor
      </Badge>
    )

  const handleCreateUser = async () => {
    setIsSubmitting(true)
    
    // Validar todos los campos con el esquema de validación
    const isValid = validateAllFields({
      rut: newUser.rut,
      nombre: newUser.nombre,
      apellido: newUser.apellido,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      status: newUser.status
    }, validationSchemas.userForm)

    // Validar coincidencia de contraseñas
    let passwordMatch = true
    if (newUser.password !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden")
      passwordMatch = false
    } else {
      setPasswordError(null)
    }

    if (!isValid || !passwordMatch) {
      // Mostrar toast cuando hay errores de validación
      if (!isValid) {
        showToast({
          type: "error",
          title: "Error de validación",
          description: "Faltan campos por completar o existen datos incorrectos",
        })
      }
      if (!passwordMatch) {
        showToast({
          type: "error",
          title: "Error de validación",
          description: "Las contraseñas no coinciden",
        })
      }
      setIsSubmitting(false)
      return
    }

    const res = await createUser()
    setIsSubmitting(false)
    
    if (res.success) {
      showToast({
        type: "success",
        title: "¡Éxito!",
        description: res.message || "Usuario creado correctamente",
      })
      setIsCreateDialogOpen(false)
      setNewUser({ rut: "", nombre: "", apellido: "", email: "", password: "", role: "consultor", status: "habilitado" })
      setConfirmPassword("")
      clearAllErrors()
    } else {
      // Mostrar toast con el mensaje de error de la API
      const errorMsg = processApiErrorMessage(res.message, "Error creando usuario")
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
      
      // Si hay errores de campos específicos del servidor, aplicarlos al estado de errores
      if (res.fieldErrors) {
        Object.keys(res.fieldErrors).forEach(field => {
          const fieldErrorMsg = processApiErrorMessage(res.fieldErrors![field], res.fieldErrors![field])
          setFieldError(field, fieldErrorMsg)
        })
      }
    }
  }

  const handleEditUser = (user: any) => {
    editUser(user)
    setConfirmPassword("") // Limpiar confirmación al editar
    clearAllErrors() // Limpiar errores previos
    setPasswordError(null) // Limpiar error de contraseña
    setIsCreateDialogOpen(true)
  }

  const handleUpdateUser = async () => {
    setIsSubmitting(true)
    
    // Validar todos los campos excepto password y rut si está vacío (edición)
    const dataToValidate: any = {
      nombre: newUser.nombre,
      apellido: newUser.apellido,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status
    }

    // Solo validar password si se ingresó una nueva contraseña
    if (newUser.password && newUser.password.trim() !== "") {
      dataToValidate.password = newUser.password
    }

    // Crear un esquema sin password y sin rut para el caso de edición
    const schemaForEdit = { ...validationSchemas.userForm }
    if (!newUser.password || newUser.password.trim() === "") {
      delete (schemaForEdit as any).password
    }
    // No validar RUT en modo edición porque no se puede cambiar
    delete (schemaForEdit as any).rut

    const isValid = validateAllFields(dataToValidate, schemaForEdit)

    // Validar coincidencia de contraseñas si se ingresó una nueva
    let passwordMatch = true
    if (newUser.password && newUser.password.trim() !== "") {
      if (newUser.password !== confirmPassword) {
        setPasswordError("Las contraseñas no coinciden")
        passwordMatch = false
      } else {
        setPasswordError(null)
      }
    }

    if (!isValid || !passwordMatch) {
      // Mostrar toast cuando hay errores de validación
      if (!isValid) {
        showToast({
          type: "error",
          title: "Error de validación",
          description: "Faltan campos por completar o existen datos incorrectos",
        })
      }
      if (!passwordMatch) {
        showToast({
          type: "error",
          title: "Error de validación",
          description: "Las contraseñas no coinciden",
        })
      }
      setIsSubmitting(false)
      return
    }

    const res = await updateUser()
    setIsSubmitting(false)
    
    if (res.success) {
      showToast({
        type: "success",
        title: "¡Éxito!",
        description: res.message || "Usuario actualizado correctamente",
      })
      setIsCreateDialogOpen(false)
      setConfirmPassword("")
      clearAllErrors()
    } else {
      // Mostrar toast con el mensaje de error de la API
      const errorMsg = processApiErrorMessage(res.message, "Error actualizando usuario")
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
      
      // Si hay errores de campos específicos del servidor, aplicarlos al estado de errores
      if (res.fieldErrors) {
        Object.keys(res.fieldErrors).forEach(field => {
          const fieldErrorMsg = processApiErrorMessage(res.fieldErrors![field], res.fieldErrors![field])
          setFieldError(field, fieldErrorMsg)
        })
      }
    }
  }

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    setUserToToggle({ id: userId, currentStatus })
    setIsToggleStatusOpen(true)
  }

  const confirmToggleStatus = () => {
    if (userToToggle) {
      toggleStatus(userToToggle.id)
      setUserToToggle(null)
    }
  }

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUser(userToDelete)
      setUserToDelete(null)
    }
  }

  // -------------------
  // JSX
  // -------------------
  return (
    <div className="space-y-6">
      {/* Header y botón crear */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Administra los consultores y usuarios del sistema</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) {
            clearEditingUser()
            setConfirmPassword("")
            clearAllErrors()
            setPasswordError(null)
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</DialogTitle>
              <DialogDescription>Ingresa los datos del usuario</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rut">RUT *</Label>
                <Input
                  id="rut"
                  value={newUser.rut}
                  onChange={(e) => {
                    setNewUser({ ...newUser, rut: e.target.value })
                    validateField('rut', e.target.value, validationSchemas.userForm)
                  }}
                  placeholder="20994291-7"
                  disabled={!!editingUser} // no se edita rut al modificar
                  className={errors.rut ? 'border-red-500' : ''}
                />
                {errors.rut && (
                  <p className="text-sm text-red-500">{errors.rut as string}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={newUser.nombre}
                  onChange={(e) => {
                    setNewUser({ ...newUser, nombre: e.target.value })
                    validateField('nombre', e.target.value, validationSchemas.userForm)
                  }}
                  placeholder="Juan"
                  className={errors.nombre ? 'border-red-500' : ''}
                />
                {errors.nombre && (
                  <p className="text-sm text-red-500">{errors.nombre as string}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apellido">Apellido *</Label>
                <Input
                  id="apellido"
                  value={newUser.apellido}
                  onChange={(e) => {
                    setNewUser({ ...newUser, apellido: e.target.value })
                    validateField('apellido', e.target.value, validationSchemas.userForm)
                  }}
                  placeholder="Pérez"
                  className={errors.apellido ? 'border-red-500' : ''}
                />
                {errors.apellido && (
                  <p className="text-sm text-red-500">{errors.apellido as string}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo Electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => {
                    setNewUser({ ...newUser, email: e.target.value })
                    validateField('email', e.target.value, validationSchemas.userForm)
                  }}
                  placeholder="juan.perez@llconsulting.com"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email as string}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña {editingUser ? '' : '*'}</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => {
                    setNewUser({ ...newUser, password: e.target.value })
                    // Validar solo si no está editando o si hay texto
                    if (!editingUser || e.target.value.trim() !== '') {
                      validateField('password', e.target.value, validationSchemas.userForm)
                    }
                  }}
                  placeholder={editingUser ? "Dejar vacío para mantener la contraseña actual" : "Ingresa una contraseña segura"}
                  className={(errors.password || passwordError) ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password as string}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña {editingUser ? '' : '*'}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    // Validar coincidencia de contraseñas
                    if (newUser.password && e.target.value) {
                      if (newUser.password !== e.target.value) {
                        setPasswordError("Las contraseñas no coinciden")
                      } else {
                        setPasswordError(null)
                      }
                    }
                  }}
                  placeholder={editingUser ? "Confirma la nueva contraseña" : "Repite la contraseña"}
                  className={passwordError ? 'border-red-500' : ''}
                />
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rol *</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: "admin" | "consultor") => {
                    setNewUser({ ...newUser, role: value })
                    validateField('role', value, validationSchemas.userForm)
                  }}
                >
                  <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultor">Consultor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role as string}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Estado *</Label>
                <Select
                  value={newUser.status}
                  onValueChange={(value: "habilitado" | "inhabilitado") => {
                    setNewUser({ ...newUser, status: value })
                    validateField('status', value, validationSchemas.userForm)
                  }}
                >
                  <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="habilitado">Habilitado</SelectItem>
                    <SelectItem value="inhabilitado">Inhabilitado</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-red-500">{errors.status as string}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false)
                  setConfirmPassword("")
                  clearEditingUser()
                  clearAllErrors()
                  setPasswordError(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingUser ? "Actualizando..." : "Creando..."}
                  </>
                ) : editingUser ? "Actualizar Usuario" : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultores</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === "consultor").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}</div>
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
                placeholder="Buscar por nombre, apellido o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="habilitado">Habilitado</SelectItem>
                <SelectItem value="inhabilitado">Inhabilitado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="consultor">Consultor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>Lista de todos los usuarios registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Cargando usuarios...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>{(user.firstName || user.nombre) + " " + (user.lastName || user.apellido)}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.isActive ?? (user.status === "habilitado"))}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditUser(user)}
                        title="Editar usuario"
                      >
                        <Edit className="h-4 w-4" />
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
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalUsers)} de {totalUsers} usuarios
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

      {/* Alertas */}

      {/* Confirmación de eliminación */}
      <CustomAlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        type="confirm"
        title="¿Eliminar usuario?"
        description="Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />

      {/* Confirmación de cambio de estado */}
      <CustomAlertDialog
        open={isToggleStatusOpen}
        onOpenChange={setIsToggleStatusOpen}
        type="confirm"
        title={userToToggle?.currentStatus ? "¿Inhabilitar usuario?" : "¿Habilitar usuario?"}
        description={
          userToToggle?.currentStatus
            ? "El usuario no podrá acceder al sistema hasta que sea habilitado nuevamente."
            : "El usuario podrá acceder al sistema con sus credenciales."
        }
        confirmText={userToToggle?.currentStatus ? "Inhabilitar" : "Habilitar"}
        cancelText="Cancelar"
        onConfirm={confirmToggleStatus}
        onCancel={() => setUserToToggle(null)}
      />
    </div>
  )
}
