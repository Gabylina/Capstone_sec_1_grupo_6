"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Mail, Briefcase, Save, Edit, Key, User, Phone, MapPin, Calendar, BarChart3, Users, FileText, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useFormValidation, validationSchemas } from "@/hooks/useFormValidation"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import { ValidatedInput, ValidationErrorDisplay } from "@/components/ui/ValidatedFormComponents"

export default function PerfilPage() {
  const { user } = useAuth()
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
    if (message.includes('contraseña incorrecta') || message.includes('password incorrect')) {
      return 'La contraseña actual es incorrecta'
    }
    if (message.includes('contraseña actual') || message.includes('current password')) {
      return 'La contraseña actual no es correcta'
    }
    // Si el mensaje ya está en español y es claro, devolverlo capitalizado
    if (message.length > 0 && message[0] === message[0].toLowerCase()) {
      return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
    }
    return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
  }
  
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { errors, validateField, validateAllFields, clearAllErrors } = useFormValidation()
  const [consultorStats, setConsultorStats] = useState({
    totalProcesos: 0,
    procesosActivos: 0,
    procesosCompletados: 0,
    totalCandidatos: 0,
    ultimaActividad: null as string | null
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Cargar estadísticas del consultor
  useEffect(() => {
    const loadConsultorStats = async () => {
      if (!user) return
      
      try {
        setIsLoadingStats(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL
        const token = localStorage.getItem("llc_token")
        
        // Cargar procesos del consultor
        const procesosResponse = await fetch(`${API_URL}/api/solicitudes?consultor_id=${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (procesosResponse.ok) {
          const procesosData = await procesosResponse.json()
          const procesos = procesosData.data?.solicitudes || procesosData.data || []
          
          const totalProcesos = procesos.length
          const procesosActivos = procesos.filter((p: any) => 
            p.estado_solicitud === "En Progreso" || p.status === "en_progreso"
          ).length
          const procesosCompletados = procesos.filter((p: any) => 
            p.estado_solicitud === "Cerrado" || p.status === "cerrado"
          ).length
          
          setConsultorStats({
            totalProcesos,
            procesosActivos,
            procesosCompletados,
            totalCandidatos: 0, // Se puede implementar después
            ultimaActividad: procesos.length > 0 ? procesos[0].fecha_ingreso_solicitud : null
          })
        }
      } catch (error) {
        console.error('Error loading consultor stats:', error)
      } finally {
        setIsLoadingStats(false)
      }
    }
    
    loadConsultorStats()
  }, [user])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">Debes iniciar sesión para ver tu perfil.</p>
        </div>
      </div>
    )
  }

  const handleChangePassword = async () => {
    // Validar todos los campos
    const isValid = validateAllFields(passwordData, validationSchemas.changePasswordForm)
    
    // Validar que las contraseñas coincidan
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast({
        type: "error",
        title: "Error de validación",
        description: "Las contraseñas nuevas no coinciden",
      })
      return
    }

    if (!isValid) {
      showToast({
        type: "error",
        title: "Error de validación",
        description: "Por favor, complete todos los campos correctamente",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL
      const res = await fetch(`${API_URL}/api/users/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
        body: JSON.stringify({
          rut_usuario: user?.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      // Intentar parsear la respuesta JSON
      let data
      try {
        const text = await res.text()
        data = text ? JSON.parse(text) : {}
      } catch {
        data = {}
      }

      if (res.ok && data?.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: data?.message || "Contraseña actualizada correctamente",
        })
        setIsPasswordDialogOpen(false)
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
        clearAllErrors()
      } else {
        // Usar el mensaje de la API o un mensaje genérico
        const errorMessage = data?.message || "Ha ocurrido un error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente."
        const processedErrorMessage = processApiErrorMessage(errorMessage, "Error al cambiar la contraseña")
        
        // Si es error 400 (contraseña incorrecta), limpiar solo el campo de contraseña actual
        if (res.status === 400) {
          setPasswordData({ ...passwordData, currentPassword: "" })
        }
        
        showToast({
          type: "error",
          title: "Error",
          description: processedErrorMessage,
        })
      }
    } catch (error: any) {
      console.error('Error changing password:', error)
      const errorMsg = processApiErrorMessage(error.message, "Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.")
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordDataChange = (field: string, value: string) => {
    setPasswordData({ ...passwordData, [field]: value })
    validateField(field, value, validationSchemas.changePasswordForm)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-muted-foreground">Consulta tu información personal y configuración de cuenta</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-24 w-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                {`${user.firstName} ${user.lastName}`.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{`${user.firstName} ${user.lastName}`}</h2>
                <p className="text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>Tu información de contacto y datos personales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={`${user.firstName} ${user.lastName}`}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rut">RUT</Label>
                <Input
                  id="rut"
                  value={user.id}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Input
                  id="role"
                  value={user.role === "admin" ? "Administrador" : "Consultor"}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Input
                  id="status"
                  value={user.isActive ? "Activo" : "Inactivo"}
                  disabled
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas del Consultor */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Procesos</p>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? "..." : consultorStats.totalProcesos}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Procesos Activos</p>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? "..." : consultorStats.procesosActivos}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Procesos Completados</p>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? "..." : consultorStats.procesosCompletados}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Última Actividad</p>
                <p className="text-sm text-muted-foreground">
                  {isLoadingStats ? "..." : 
                    consultorStats.ultimaActividad ? 
                    new Date(consultorStats.ultimaActividad).toLocaleDateString() : 
                    "Sin actividad"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Cuenta</CardTitle>
          <CardDescription>Gestiona la configuración y preferencias de tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Cambiar Contraseña</h4>
              <p className="text-sm text-muted-foreground">Actualiza tu contraseña de acceso</p>
            </div>
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Key className="mr-2 h-4 w-4" />
                  Cambiar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cambiar Contraseña</DialogTitle>
                  <DialogDescription>Ingresa tu contraseña actual y la nueva contraseña</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordDataChange("currentPassword", e.target.value)}
                      placeholder="Ingresa tu contraseña actual"
                      className={errors.currentPassword ? "border-destructive" : ""}
                    />
                    <ValidationErrorDisplay error={errors.currentPassword} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordDataChange("newPassword", e.target.value)}
                      placeholder="Ingresa tu nueva contraseña"
                      className={errors.newPassword ? "border-destructive" : ""}
                    />
                    <ValidationErrorDisplay error={errors.newPassword} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        const value = e.target.value
                        setPasswordData({ ...passwordData, confirmPassword: value })
                        // Validar que coincida con la nueva contraseña
                        if (value && value !== passwordData.newPassword) {
                          // Agregar error personalizado
                          validateField("confirmPassword", "", validationSchemas.changePasswordForm)
                        } else {
                          validateField("confirmPassword", value, validationSchemas.changePasswordForm)
                        }
                      }}
                      placeholder="Confirma tu nueva contraseña"
                      className={(errors.confirmPassword || (passwordData.confirmPassword && passwordData.confirmPassword !== passwordData.newPassword)) ? "border-destructive" : ""}
                    />
                    {passwordData.confirmPassword && passwordData.confirmPassword !== passwordData.newPassword && (
                      <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
                    )}
                    <ValidationErrorDisplay error={errors.confirmPassword} />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsPasswordDialogOpen(false)
                      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
                      clearAllErrors()
                    }}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleChangePassword} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cambiando...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Cambiar Contraseña
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Separator />
        </CardContent>
      </Card>

    </div>
  )
}
