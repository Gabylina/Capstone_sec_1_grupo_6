"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"
import { TokenExpiredDialog } from "./token-expired-dialog"
import { useTokenExpiration } from "@/hooks/useTokenExpiration"
import { TOKEN_EXPIRED_EVENT } from "@/lib/api"

/**
 * Componente que monitorea la expiración del token y muestra un diálogo
 * cuando el token expira o está próximo a expirar
 */
export function TokenExpirationMonitor() {
  const [showDialog, setShowDialog] = useState(false)
  const [userDismissed, setUserDismissed] = useState(false)
  const pathname = usePathname()
  const { isExpired, isExpiringSoon, timeRemaining, formatTimeRemaining } = useTokenExpiration()

  // No mostrar el diálogo si estamos en la página de login
  const isLoginPage = pathname === '/login'

  // Escuchar eventos de expiración de token desde las llamadas API
  useEffect(() => {
    const handleTokenExpired = () => {
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
    if (isExpired && !userDismissed && !isLoginPage) {
      setShowDialog(true)
    } else if (isLoginPage) {
      // Si estamos en login, cerrar el diálogo si está abierto
      setShowDialog(false)
    }
  }, [isExpired, userDismissed, isLoginPage])

  // Manejar el cierre del diálogo
  const handleDialogChange = (open: boolean) => {
    setShowDialog(open)
    // Si el usuario cierra el diálogo manualmente, marcar como descartado
    if (!open) {
      setUserDismissed(true)
      // Resetear el flag después de un tiempo para permitir que se muestre de nuevo si es necesario
      setTimeout(() => {
        setUserDismissed(false)
      }, 5000)
    }
  }

  // Opcional: Mostrar advertencia cuando el token esté próximo a expirar
  // Puedes descomentar esto si quieres mostrar una notificación antes de que expire
  // useEffect(() => {
  //   if (isExpiringSoon && timeRemaining !== null) {
  //     // Aquí podrías mostrar un toast o notificación
  //     console.warn(`Tu sesión expirará en ${formatTimeRemaining(timeRemaining)}`)
  //   }
  // }, [isExpiringSoon, timeRemaining, formatTimeRemaining])

  return (
    <TokenExpiredDialog 
      open={showDialog} 
      onOpenChange={handleDialogChange}
    />
  )
}

