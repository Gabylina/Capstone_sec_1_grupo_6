"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"
import { TokenExpiredDialog } from "./token-expired-dialog"
import { useTokenExpiration } from "@/hooks/useTokenExpiration"
import { TOKEN_EXPIRED_EVENT } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/auth"

/**
 * Componente que monitorea la expiración del token y muestra un diálogo
 * cuando el token expira o está próximo a expirar
 */
export function TokenExpirationMonitor() {
  const [showDialog, setShowDialog] = useState(false)
  const [userDismissed, setUserDismissed] = useState(false)
  const [warningShown, setWarningShown] = useState(false)
  const pathname = usePathname()
  const { isExpired, isExpiringSoon, timeRemaining, formatTimeRemaining } = useTokenExpiration()
  const { toast } = useToast()
  const { logout } = useAuth()

  // No mostrar el diálogo si estamos en la página de login
  const isLoginPage = pathname === '/login'

  // Escuchar eventos de expiración de token desde las llamadas API
  useEffect(() => {
    const handleTokenExpired = () => {
      // No mostrar el diálogo si fue un logout intencional
      const intentionalLogout = sessionStorage.getItem("intentional_logout")
      if (intentionalLogout) {
        sessionStorage.removeItem("intentional_logout")
        return
      }
      
      if (!userDismissed && !isLoginPage) {
        setShowDialog(true)
      }
    }

    window.addEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired as EventListener)

    return () => {
      window.removeEventListener(TOKEN_EXPIRED_EVENT, handleTokenExpired as EventListener)
    }
  }, [userDismissed, isLoginPage])

  // Mostrar diálogo cuando el token expire (solo si el usuario no lo cerró manualmente y no estamos en login)
  useEffect(() => {
    // No mostrar el diálogo si fue un logout intencional
    const intentionalLogout = sessionStorage.getItem("intentional_logout")
    if (intentionalLogout) {
      sessionStorage.removeItem("intentional_logout")
      setShowDialog(false)
      return
    }
    
    // Forzar mostrar el diálogo cuando el token expire
    if (isExpired && !isLoginPage) {
      // Resetear el flag de dismissed para asegurar que se muestre
      setUserDismissed(false)
      setShowDialog(true)
    } else if (isLoginPage) {
      // Si estamos en login, cerrar el diálogo si está abierto
      setShowDialog(false)
    }
  }, [isExpired, isLoginPage])

  // Manejar el cierre del diálogo
  const handleDialogChange = (open: boolean) => {
    setShowDialog(open)
    // Si el usuario cierra el diálogo manualmente cuando el token está expirado,
    // forzar el logout y redirigir al login
    if (!open && isExpired) {
      // Si el token está expirado y el usuario cierra el diálogo, hacer logout
      logout()
      window.location.href = "/login"
    } else if (!open) {
      // Si no está expirado, solo marcar como descartado temporalmente
      setUserDismissed(true)
      setTimeout(() => {
        setUserDismissed(false)
      }, 5000)
    }
  }

  // Mostrar advertencia cuando el token esté próximo a expirar (30 minutos antes)
  useEffect(() => {
    if (isExpiringSoon && timeRemaining !== null && !warningShown && !isLoginPage) {
      const timeText = formatTimeRemaining(timeRemaining)
      toast({
        title: "⚠️ Tu sesión expirará pronto",
        description: `Tu sesión expirará en ${timeText}. Renueva tu sesión para continuar trabajando.`,
        variant: "default",
        duration: 10000, // 10 segundos
      })
      setWarningShown(true)
    }
    
    // Resetear el warning si el token ya no está próximo a expirar
    if (!isExpiringSoon) {
      setWarningShown(false)
    }
  }, [isExpiringSoon, timeRemaining, formatTimeRemaining, warningShown, isLoginPage, toast])

  return (
    <TokenExpiredDialog 
      open={showDialog} 
      onOpenChange={handleDialogChange}
    />
  )
}

