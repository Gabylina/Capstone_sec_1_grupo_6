import { useState, useEffect, useCallback } from "react"
import { getHitosAlertas, HitoAlert } from "@/lib/api-hitos"

interface Notification {
  id: string
  hito: HitoAlert
  read: boolean
  created_at: string
}

export const useNotifications = (userId: string | undefined, userRole?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Cargar IDs de notificaciones leídas desde localStorage
  const getReadNotificationIds = useCallback((): Set<string> => {
    if (!userId) return new Set()
    try {
      const stored = localStorage.getItem(`llc_notifications_read_${userId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  }, [userId])

  // Guardar IDs de notificaciones leídas en localStorage
  const saveReadNotificationIds = useCallback((ids: Set<string>) => {
    if (!userId) return
    try {
      localStorage.setItem(`llc_notifications_read_${userId}`, JSON.stringify([...ids]))
    } catch (error) {
      console.error('Error al guardar notificaciones leídas:', error)
    }
  }, [userId])

  const loadNotifications = useCallback(async () => {
    if (!userId && userRole !== 'admin') {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const isAdmin = userRole === 'admin'
      // Si es admin, no pasar userId para obtener todas las alertas
      const consultorId = isAdmin ? undefined : userId
      
      const hitos = await getHitosAlertas(consultorId)
      
      const readIds = getReadNotificationIds()
      
      // Aplicar la misma lógica de agrupación que en la página de alertas
      // Agrupar por nombre_hito + id_solicitud y seleccionar el más relevante
      const grupos = new Map<string, typeof hitos>()
      
      hitos.forEach(hito => {
        const key = `${hito.nombre_hito}-${hito.solicitud?.id_solicitud}`
        if (!grupos.has(key)) {
          grupos.set(key, [])
        }
        grupos.get(key)!.push(hito)
      })
      
      // Para cada grupo, seleccionar el hito apropiado según los días restantes REALES
      // Lógica progresiva: mostrar la alerta correspondiente al tiempo actual
      const hitosRelevantes: typeof hitos = []
      grupos.forEach(grupo => {
        if (grupo.length === 1) {
          hitosRelevantes.push(grupo[0])
        } else {
          // Si hay múltiples hitos del mismo tipo, seleccionar el apropiado progresivamente
          // Ordenar por avisar_antes_dias (de mayor a menor)
          const ordenados = grupo.sort((a, b) => b.avisar_antes_dias - a.avisar_antes_dias)
          
          // Obtener los días restantes reales del hito
          const diasRestantes = Math.abs(grupo[0].dias_restantes || 0)
          
          // Seleccionar la alerta apropiada según los días restantes
          // Lógica: mostrar la alerta con avisar_antes_dias más cercano a los días restantes (sin pasarse)
          let alertaSeleccionada = ordenados[ordenados.length - 1] // Por defecto, la más urgente
          
          for (const hito of ordenados) {
            // Si los días restantes son >= avisar_antes_dias, esta es la alerta apropiada
            if (diasRestantes >= hito.avisar_antes_dias) {
              alertaSeleccionada = hito
              break
            }
          }
          
          hitosRelevantes.push(alertaSeleccionada)
        }
      })
      
      // Convertir hitos relevantes a notificaciones
      const newNotifications: Notification[] = hitosRelevantes.map((hito) => {
        const id = `hito-${hito.id_hito_solicitud}`
        // Usar la fecha límite como referencia para ordenar por "actualidad"
        // Los hitos más próximos a vencer son considerados "más actuales"
        const fechaReferencia = hito.fecha_limite || new Date().toISOString()
        return {
          id,
          hito,
          read: readIds.has(id),
          created_at: fechaReferencia,
        }
      })

      // Ordenar por días restantes (más urgentes primero), luego por fecha
      newNotifications.sort((a, b) => {
        const diasA = Math.abs(a.hito.dias_restantes || 0)
        const diasB = Math.abs(b.hito.dias_restantes || 0)
        if (diasA !== diasB) {
          return diasA - diasB // Más urgente primero
        }
        // Si tienen la misma urgencia, ordenar por fecha límite más próxima
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

      const unread = newNotifications.filter(n => !n.read).length
      
      setNotifications(newNotifications)
      setUnreadCount(unread)
    } catch (error) {
      console.error('[NOTIFICATIONS] Error al cargar notificaciones:', error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [userId, userRole, getReadNotificationIds])

  const markAsRead = useCallback(() => {
    if (!userId) return
    
    // Marcar todas las notificaciones actuales como leídas
    const readIds = new Set<string>()
    notifications.forEach(n => {
      readIds.add(n.id)
    })
    
    saveReadNotificationIds(readIds)
    
    // Actualizar estado inmediatamente
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }))
      return updated
    })
    setUnreadCount(0)
  }, [userId, notifications, saveReadNotificationIds])

  const markNotificationAsRead = useCallback((notificationId: string) => {
    if (!userId) return
    
    const readIds = getReadNotificationIds()
    readIds.add(notificationId)
    saveReadNotificationIds(readIds)
    
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [userId, getReadNotificationIds, saveReadNotificationIds])

  useEffect(() => {
    if (userId) {
      loadNotifications()
      
      // Auto-refresh: actualizar notificaciones cada 5 minutos
      // Esto asegura que las alertas se actualicen progresivamente
      const intervalId = setInterval(() => {
        loadNotifications()
      }, 5 * 60 * 1000) // 5 minutos
      
      return () => {
        clearInterval(intervalId)
      }
    } else {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
    }
  }, [userId, loadNotifications])

  // Obtener solo las notificaciones más recientes (no leídas primero, luego por urgencia)
  const getRecentNotifications = useCallback((limit: number = 5) => {
    // Las notificaciones ya están ordenadas por urgencia en loadNotifications
    // Solo necesitamos priorizar no leídas sobre leídas
    const unread = notifications.filter(n => !n.read)
    const read = notifications.filter(n => n.read)
    
    // Devolver primero las no leídas, luego las leídas, limitadas al número solicitado
    return [...unread, ...read].slice(0, limit)
  }, [notifications])

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markNotificationAsRead,
    getRecentNotifications,
  }
}

