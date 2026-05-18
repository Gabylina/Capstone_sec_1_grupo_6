"use client"

import { useAuth } from "@/hooks/auth"
import { useNotifications, type AppNotification } from "@/hooks/useNotifications"
import { Bell, AlertTriangle, Clock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { formatDateOnly } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export function AppHeader() {
  const { user } = useAuth()
  const router = useRouter()
  const {
    unreadCount,
    getRecentNotifications,
    markAsRead,
    markNotificationAsRead,
    loadNotifications,
    loading,
  } = useNotifications(user?.id, user?.role)

  const hasShownLoginToast = useRef(false)

  useEffect(() => {
    hasShownLoginToast.current = false
  }, [user?.id])

  useEffect(() => {
    if (!loading && user && unreadCount > 0 && !hasShownLoginToast.current) {
      const timer = setTimeout(() => {
        const recent = getRecentNotifications(10)
        const unread = recent.filter((n) => !n.read)
        const aprobacion = unread.filter((n) => n.kind === "aprobacion").length
        const vencidas = unread.filter((n) => n.kind === "hito" && n.hito.estado === "vencido").length
        const porVencer = unread.filter((n) => n.kind === "hito" && n.hito.estado === "por_vencer").length

        if (aprobacion > 0) {
          toast.info(
            `Tienes ${aprobacion} revisión${aprobacion !== 1 ? "es" : ""} de candidato${aprobacion !== 1 ? "s" : ""}`,
            {
              description: "La coordinadora resolvió candidatos. Abre Alertas o entra al proceso desde la campana.",
              duration: 7000,
            }
          )
        } else if (vencidas > 0 && porVencer > 0) {
          toast.warning(`Tienes ${unreadCount} notificación${unreadCount !== 1 ? "es" : ""} nueva${unreadCount !== 1 ? "s" : ""}`, {
            description: `${vencidas} vencida${vencidas !== 1 ? "s" : ""} y ${porVencer} por vencer.`,
            duration: 6000,
          })
        } else if (vencidas > 0) {
          toast.error(`Tienes ${vencidas} hito${vencidas !== 1 ? "s" : ""} vencido${vencidas !== 1 ? "s" : ""}.`, { duration: 6000 })
        } else if (porVencer > 0) {
          toast.success(`Tienes ${porVencer} hito${porVencer !== 1 ? "s" : ""} próximo${porVencer !== 1 ? "s" : ""} a vencer.`, {
            duration: 6000,
          })
        }

        hasShownLoginToast.current = true
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [loading, user, unreadCount, getRecentNotifications])

  if (!user) return null

  const recentNotifications = getRecentNotifications(5)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const handleButtonClick = () => {
    const newState = !popoverOpen
    setPopoverOpen(newState)
    if (newState && unreadCount > 0) {
      markAsRead()
      setTimeout(() => loadNotifications(), 500)
    }
  }

  const handleNotificationClick = async (notification: AppNotification) => {
    setPopoverOpen(false)
    await markNotificationAsRead(notification.id)
    if (notification.kind === "aprobacion") {
      router.push(`/consultor/proceso/${notification.id_solicitud}?tab=modulo-2`)
    } else {
      router.push("/alertas")
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (popoverOpen && !target.closest("[data-notifications-container]")) {
        setPopoverOpen(false)
      }
    }
    if (popoverOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [popoverOpen])

  const renderNotificationItem = (notification: AppNotification) => {
    if (notification.kind === "aprobacion") {
      return (
        <div
          key={notification.id}
          className="p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors border-l-4 border-l-violet-500"
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                  {notification.titulo}
                </p>
                {!notification.read && <div className="w-2 h-2 bg-violet-600 rounded-full" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{notification.mensaje}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Solicitud {notification.id_solicitud}
                {notification.cargo ? ` · ${notification.cargo}` : ""}
              </p>
            </div>
          </div>
        </div>
      )
    }

    const hito = notification.hito
    const isVencido = hito.estado === "vencido"
    return (
      <div
        key={notification.id}
        className="p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors"
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start gap-2">
          {isVencido ? (
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
          ) : (
            <Clock className="h-4 w-4 text-orange-600 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                {hito.nombre_hito}
              </p>
              {!notification.read && <div className="w-2 h-2 bg-primary rounded-full" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{hito.descripcion}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              {hito.solicitud?.descripcionCargo?.titulo_cargo && (
                <span className="truncate max-w-[120px]">{hito.solicitud.descripcionCargo.titulo_cargo}</span>
              )}
              {hito.solicitud?.id_solicitud && <span>· Solicitud {hito.solicitud.id_solicitud}</span>}
              {hito.fecha_limite && <span>· {formatDateOnly(hito.fecha_limite)}</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <SidebarTrigger className="mr-4" />

        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">
              {user.role === "admin" ? "Panel de Administración" : "Panel de Consultor"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" data-notifications-container>
              <Button
                variant="outline"
                size="sm"
                className="relative"
                title="Ver notificaciones"
                onClick={handleButtonClick}
              >
                <Bell className="h-4 w-4 mr-2" />
                {unreadCount > 0 && (
                  <>
                    <span className="text-xs">Alertas</span>
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  </>
                )}
                {unreadCount === 0 && <span className="text-xs">Alertas</span>}
              </Button>

              {popoverOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-[500px] overflow-y-auto bg-popover border rounded-md shadow-lg z-[9999] p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">Notificaciones</h4>
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {unreadCount} nueva{unreadCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="border-t pt-2">
                      {loading ? (
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          <span className="ml-2 text-sm text-muted-foreground">Cargando...</span>
                        </div>
                      ) : recentNotifications.length > 0 ? (
                        <div className="space-y-2">
                          {recentNotifications.map((n) => renderNotificationItem(n))}
                          <div className="pt-2 border-t">
                            <Link
                              href="/alertas"
                              className="block text-center text-sm font-medium text-primary hover:underline"
                              onClick={() => setPopoverOpen(false)}
                            >
                              Ver todas las alertas
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-4">
                          <span className="text-sm text-muted-foreground">No hay notificaciones</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
