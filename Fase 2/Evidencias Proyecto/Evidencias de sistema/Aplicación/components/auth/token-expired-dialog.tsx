"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/auth"

interface TokenExpiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TokenExpiredDialog({ open, onOpenChange }: TokenExpiredDialogProps) {
  const router = useRouter()
  const { logout } = useAuth()
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

  const handleRefresh = () => {
    // Renovar sesión: cerrar diálogo, limpiar sesión y redirigir al login
    setIsRefreshing(true)
    
    // Cerrar el diálogo primero
    onOpenChange(false)
    
    // Limpiar la sesión
    logout()
    
    // Redirigir inmediatamente sin delay para evitar que el diálogo se vuelva a abrir
    router.push("/login")
    
    // Resetear el estado después de un momento
    setTimeout(() => {
      setIsRefreshing(false)
    }, 100)
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
            Tu sesión ha expirado por seguridad. Por favor, inicia sesión nuevamente para continuar.
          </DialogDescription>
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> El token de sesión tiene una duración de <strong>3 horas</strong> por seguridad.
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

