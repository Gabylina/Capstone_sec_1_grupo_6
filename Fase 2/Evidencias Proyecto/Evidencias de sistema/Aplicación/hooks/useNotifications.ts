import { useState, useEffect, useCallback } from "react"
import { getHitosAlertas, HitoAlert } from "@/lib/api-hitos"
import { notificacionConsultorService } from "@/lib/api-notificaciones"

export type HitoNotification = {
  kind: "hito"
  id: string
  read: boolean
  created_at: string
  hito: HitoAlert
}

export type AprobacionNotification = {
  kind: "aprobacion"
  id: string
  read: boolean
  created_at: string
  id_notificacion: number
  id_solicitud: number
  titulo: string
  mensaje: string
  estado_aprobacion?: string
  candidato_nombre?: string
  cargo?: string
}

export type AppNotification = HitoNotification | AprobacionNotification

export const useNotifications = (userId: string | undefined, userRole?: string) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const getReadNotificationIds = useCallback((): Set<string> => {
    if (!userId) return new Set()
    try {
      const stored = localStorage.getItem(`llc_notifications_read_${userId}`)
      return stored ? new Set(JSON.parse(stored)) : new Set()
    } catch {
      return new Set()
    }
  }, [userId])

  const saveReadNotificationIds = useCallback(
    (ids: Set<string>) => {
      if (!userId) return
      try {
        localStorage.setItem(`llc_notifications_read_${userId}`, JSON.stringify([...ids]))
      } catch (error) {
        console.error("Error al guardar notificaciones leídas:", error)
      }
    },
    [userId]
  )

  const loadNotifications = useCallback(async () => {
    if (!userId && userRole !== "admin") {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const isAdmin = userRole === "admin"
      const consultorId = isAdmin ? undefined : userId

      const hitos = await getHitosAlertas(consultorId)
      const readIds = getReadNotificationIds()

      const grupos = new Map<string, HitoAlert[]>()
      hitos.forEach((hito) => {
        const key = `${hito.nombre_hito}-${hito.solicitud?.id_solicitud}`
        if (!grupos.has(key)) grupos.set(key, [])
        grupos.get(key)!.push(hito)
      })

      const hitosRelevantes: HitoAlert[] = []
      grupos.forEach((grupo) => {
        if (grupo.length === 1) {
          hitosRelevantes.push(grupo[0])
        } else {
          const ordenados = grupo.sort((a, b) => b.avisar_antes_dias - a.avisar_antes_dias)
          const diasRestantes = Math.abs(grupo[0].dias_restantes || 0)
          let alertaSeleccionada = ordenados[ordenados.length - 1]
          for (const hito of ordenados) {
            if (diasRestantes >= hito.avisar_antes_dias) {
              alertaSeleccionada = hito
              break
            }
          }
          hitosRelevantes.push(alertaSeleccionada)
        }
      })

      const hitoNotifications: HitoNotification[] = hitosRelevantes.map((hito) => {
        const id = `hito-${hito.id_hito_solicitud}`
        const fechaReferencia = hito.fecha_limite || new Date().toISOString()
        return {
          kind: "hito" as const,
          id,
          hito,
          read: readIds.has(id),
          created_at: fechaReferencia,
        }
      })

      let aprobacionNotifications: AprobacionNotification[] = []
      if (!isAdmin && userId) {
        const { items } = await notificacionConsultorService.getMis()
        aprobacionNotifications = items.map((n) => ({
          kind: "aprobacion" as const,
          id: `aprob-${n.id_notificacion}`,
          id_notificacion: n.id_notificacion,
          id_solicitud: n.id_solicitud,
          titulo: n.titulo,
          mensaje: n.mensaje,
          estado_aprobacion: n.metadata?.estado_aprobacion,
          candidato_nombre: n.metadata?.candidato_nombre,
          cargo: n.metadata?.cargo,
          read: n.leida,
          created_at:
            n.fecha_creacion instanceof Date
              ? n.fecha_creacion.toISOString()
              : String(n.fecha_creacion),
        }))
      }

      const merged: AppNotification[] = [...hitoNotifications, ...aprobacionNotifications]
      merged.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setNotifications(merged)
      setUnreadCount(merged.filter((n) => !n.read).length)
    } catch (error) {
      console.error("[NOTIFICATIONS] Error al cargar notificaciones:", error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [userId, userRole, getReadNotificationIds])

  const markAsRead = useCallback(async () => {
    if (!userId) return

    const readIds = new Set<string>()
    notifications.forEach((n) => {
      readIds.add(n.id)
    })
    saveReadNotificationIds(readIds)

    if (userRole !== "admin") {
      try {
        await notificacionConsultorService.marcarTodasLeidas()
      } catch (e) {
        console.error("Error al marcar notificaciones de aprobación:", e)
      }
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [userId, userRole, notifications, saveReadNotificationIds])

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      if (!userId) return

      const target = notifications.find((n) => n.id === notificationId)
      if (target?.kind === "aprobacion" && !target.read) {
        try {
          await notificacionConsultorService.marcarLeida(target.id_notificacion)
        } catch (e) {
          console.error("Error al marcar notificación:", e)
        }
      }

      const readIds = getReadNotificationIds()
      readIds.add(notificationId)
      saveReadNotificationIds(readIds)

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
    [userId, notifications, getReadNotificationIds, saveReadNotificationIds]
  )

  useEffect(() => {
    if (userId) {
      loadNotifications()
      const intervalId = setInterval(() => {
        loadNotifications()
      }, 5 * 60 * 1000)
      return () => clearInterval(intervalId)
    }
    setNotifications([])
    setUnreadCount(0)
    setLoading(false)
  }, [userId, loadNotifications])

  const getRecentNotifications = useCallback(
    (limit: number = 5) => {
      const unread = notifications.filter((n) => !n.read)
      const read = notifications.filter((n) => n.read)
      return [...unread, ...read].slice(0, limit)
    },
    [notifications]
  )

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
