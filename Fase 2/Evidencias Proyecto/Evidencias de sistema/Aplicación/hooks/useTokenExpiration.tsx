"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./auth"

// Duración del token en segundos (2 horas = 7200 segundos)
const TOKEN_DURATION_SECONDS = 7200
// Tiempo antes de la expiración para mostrar advertencia (30 minutos = 1800 segundos)
const WARNING_TIME_SECONDS = 1800

interface TokenPayload {
  exp: number
  iat: number
  id: string
  email: string
  role: string
  status: string
}

/**
 * Hook para manejar la expiración del token
 * Verifica periódicamente si el token está próximo a expirar o ha expirado
 */
export function useTokenExpiration() {
  const [isExpired, setIsExpired] = useState(false)
  const [isExpiringSoon, setIsExpiringSoon] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const { logout } = useAuth()

  /**
   * Decodifica el token JWT sin verificar la firma
   * Solo para obtener la fecha de expiración
   */
  const decodeToken = useCallback((token: string): TokenPayload | null => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Error decodificando token:', error)
      return null
    }
  }, [])

  /**
   * Verifica el estado del token
   */
  const checkToken = useCallback(() => {
    const token = localStorage.getItem('llc_token')
    
    if (!token) {
      setIsExpired(true)
      setTimeRemaining(null)
      return
    }

    const decoded = decodeToken(token)
    if (!decoded || !decoded.exp) {
      setIsExpired(true)
      setTimeRemaining(null)
      return
    }

    const now = Math.floor(Date.now() / 1000)
    const expirationTime = decoded.exp
    const remaining = expirationTime - now

    setTimeRemaining(remaining)

    if (remaining <= 0) {
      // Token expirado - NO hacer logout automáticamente, dejar que el diálogo se muestre
      setIsExpired(true)
      setIsExpiringSoon(false)
      // NO llamar logout() aquí - el diálogo se encargará de eso
    } else if (remaining <= WARNING_TIME_SECONDS) {
      // Token próximo a expirar
      setIsExpiringSoon(true)
      setIsExpired(false)
    } else {
      // Token válido
      setIsExpired(false)
      setIsExpiringSoon(false)
    }
  }, [decodeToken, logout])

  /**
   * Verifica el token periódicamente
   */
  useEffect(() => {
    // Verificar inmediatamente
    checkToken()

    // Verificar cada 30 segundos
    const interval = setInterval(checkToken, 30000)

    return () => clearInterval(interval)
  }, [checkToken])

  /**
   * Formatea el tiempo restante en formato legible
   */
  const formatTimeRemaining = useCallback((seconds: number): string => {
    if (seconds <= 0) return "Expirado"
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }, [])

  return {
    isExpired,
    isExpiringSoon,
    timeRemaining,
    formatTimeRemaining,
    checkToken,
  }
}

