"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/auth"
import { authService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface TokenExpiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TokenExpiredDialog({ open, onOpenChange }: TokenExpiredDialogProps) {
  const router = useRouter()
  const { logout } = useAuth()
  const { toast } = useToast()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleLogin = () => {
    setIsRedirecting(true)
    
    // Cerrar el diálogo primero
    onOpenChange(false)
    
    // Limpiar la sesión
    logout()
    
    // Redirigir inmediatamente sin delay para evitar que el diálogo se vuelva a abrir
    router.push("/login")
    
    // Resetear el estado después de un momento
    setTimeout(() => {
      setIsRedirecting(false)
    }, 100)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      // Obtener el token actual (puede estar expirado)
      const currentToken = localStorage.getItem('llc_token')
      
      if (!currentToken) {
        throw new Error('No hay token para renovar')
      }

      // Llamar al endpoint de renovación
      const response = await authService.refreshToken(currentToken)
      
      if (response.success && response.data) {
        // Actualizar el token en localStorage
        localStorage.setItem('llc_token', response.data.token)
        
        // Actualizar información del usuario si es necesario
        const userData = {
          id: response.data.usuario.rut_usuario,
          firstName: response.data.usuario.nombre,
          lastName: response.data.usuario.apellido,
          email: localStorage.getItem('llc_user') ? JSON.parse(localStorage.getItem('llc_user')!).email : '',
          isActive: response.data.usuario.activo,
          role: response.data.usuario.rol === 'admin' ? 'admin' : 'consultor'
        }
        localStorage.setItem('llc_user', JSON.stringify(userData))
        
        // Mostrar mensaje de éxito
        toast({
          title: "Sesión renovada",
          description: "Tu sesión ha sido renovada exitosamente. Tienes 2 horas más.",
          variant: "default",
        })
        
        // Cerrar el diálogo
        onOpenChange(false)
        
        // Recargar la página para aplicar el nuevo token
        setTimeout(() => {
          window.location.reload()
        }, 500)
      }
    } catch (error: any) {
      console.error('Error al renovar token:', error)
      
      // Mostrar mensaje de error
      toast({
        title: "Error al renovar sesión",
        description: error.message || "No se pudo renovar la sesión. Por favor, inicia sesión nuevamente.",
        variant: "destructive",
      })
      
      // Cerrar el diálogo y redirigir al login después de un momento
      setTimeout(() => {
        onOpenChange(false)
        logout()
        router.push("/login")
      }, 2000)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Sesión Expirada</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Tu sesión ha expirado por seguridad. Puedes renovarla automáticamente o volver a iniciar sesión.
          </DialogDescription>
          <div className="mt-4 p-3 bg-muted rounded-md space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> El token de sesión tiene una duración de <strong>2 horas</strong> por seguridad.
            </p>
            <p className="text-sm text-muted-foreground">
              • <strong>Renovar Sesión:</strong> Obtén 2 horas más automáticamente 
            </p>
            <p className="text-sm text-muted-foreground">
              • <strong>Ir a Iniciar Sesión:</strong> Ingresa con tu email y contraseña nuevamente
            </p>
          </div>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-4 sm:gap-4">
          <Button
            variant="outline"
            onClick={handleLogin}
            disabled={isRedirecting || isRefreshing}
            className="w-full sm:w-auto"
          >
            {isRedirecting ? "Redirigiendo..." : "Ir a Iniciar Sesión"}
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || isRedirecting}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? "Renovando..." : "Renovar Sesión"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

