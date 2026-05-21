"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Loader2, CheckCircle2, KeyRound, UserCheck, UserX, RefreshCw, Link2Off } from "lucide-react"
import { clientePortalService, type ClientePortalCredencial } from "@/lib/api-cliente-portal"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import type { Client } from "@/lib/types"

export type PortalAccessIntent = "generate" | "manage"

interface Props {
  client: Client | null
  open: boolean
  intent: PortalAccessIntent
  onOpenChange: (open: boolean) => void
  onCredentialChange: (idCliente: number, hasCredential: boolean) => void
}

export function ClientPortalAccessDialog({
  client,
  open,
  intent,
  onOpenChange,
  onCredentialChange,
}: Props) {
  const { showToast } = useToastNotification()
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [credencial, setCredencial] = useState<ClientePortalCredencial | null>(null)
  const [justCreated, setJustCreated] = useState(false)
  const loadStartedRef = useRef<string | null>(null)
  const copyAreaRef = useRef<HTMLTextAreaElement>(null)

  const idCliente = client ? parseInt(client.id, 10) : NaN
  const usuario = credencial?.usuario || credencial?.email || client?.name || ""
  const password = credencial?.password || ""
  const activo = credencial?.activo !== false
  const showPassword = justCreated && !!password

  const resetState = () => {
    setCredencial(null)
    setJustCreated(false)
    setLoading(false)
    setRegenerating(false)
    setToggling(false)
    loadStartedRef.current = null
  }

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }
    if (!client || Number.isNaN(idCliente)) return

    const loadKey = `${idCliente}-${intent}`
    if (loadStartedRef.current === loadKey) return
    loadStartedRef.current = loadKey

    let cancelled = false

    const run = async () => {
      setCredencial(null)
      setJustCreated(false)
      setLoading(true)

      console.log("[portal-ui] Cargar", { cliente: client.name, idCliente, intent })

      try {
        if (intent === "generate") {
          const data = await clientePortalService.generarCredencial(idCliente)
          if (cancelled) return
          setCredencial({
            tiene_credencial: true,
            usuario: data.usuario,
            password: data.password,
            activo: data.activo !== false,
          })
          setJustCreated(true)
          onCredentialChange(idCliente, true)
          showToast({
            type: "success",
            title: data.regenerado ? "Contraseña regenerada" : "Usuario creado",
            description: "Guarde la contraseña; no se volverá a mostrar",
          })
        } else {
          const data = await clientePortalService.getCredencial(idCliente)
          if (cancelled) return
          setCredencial({
            tiene_credencial: true,
            usuario: data?.usuario || data?.email || client.name,
            activo: data?.activo !== false,
          })
          setJustCreated(false)
        }
      } catch (e: unknown) {
        if (cancelled) return
        showToast({
          type: "error",
          title: "Error",
          description: e instanceof Error ? e.message : "No se pudo completar la operación",
        })
        onOpenChange(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.id, intent])

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState()
      onOpenChange(false)
    }
  }

  const handleToggleAcceso = async () => {
    if (Number.isNaN(idCliente)) return
    const nuevoActivo = !activo
    setToggling(true)
    try {
      const data = await clientePortalService.setCredencialActiva(idCliente, nuevoActivo)
      setCredencial({
        tiene_credencial: true,
        usuario: data?.usuario || data?.email || usuario,
        activo: data?.activo !== false,
      })
      showToast({
        type: "success",
        title: nuevoActivo ? "Usuario habilitado" : "Usuario desvinculado",
        description: nuevoActivo
          ? "El cliente puede iniciar sesión en el portal"
          : "El cliente no puede iniciar sesión",
      })
    } catch (e: unknown) {
      showToast({
        type: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo actualizar el acceso",
      })
    } finally {
      setToggling(false)
    }
  }

  const handleRegenerarPassword = async () => {
    if (Number.isNaN(idCliente)) return
    setRegenerating(true)
    try {
      const data = await clientePortalService.generarCredencial(idCliente)
      setCredencial({
        tiene_credencial: true,
        usuario: data.usuario,
        password: data.password,
        activo: data.activo !== false,
      })
      setJustCreated(true)
      onCredentialChange(idCliente, true)
      showToast({
        type: "success",
        title: "Nueva contraseña generada",
        description: "Copie los datos antes de cerrar",
      })
    } catch (e: unknown) {
      showToast({
        type: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo regenerar",
      })
    } finally {
      setRegenerating(false)
    }
  }

  const datosParaCopiar = useMemo(() => {
    if (!showPassword) return `Usuario: ${usuario}`
    return `Usuario: ${usuario}\nContraseña: ${password}`
  }, [usuario, showPassword, password])

  const copyDatos = useCallback(() => {
    const text = datosParaCopiar
    if (!text.trim()) {
      showToast({
        type: "error",
        title: "Sin datos",
        description: "No hay información para copiar",
      })
      return
    }

    const selectCopyArea = () => {
      const el = copyAreaRef.current
      if (!el) return false
      el.focus({ preventScroll: true })
      el.select()
      el.setSelectionRange(0, text.length)
      try {
        return document.execCommand("copy")
      } catch {
        return false
      }
    }

    if (selectCopyArea()) {
      showToast({ type: "success", title: "Copiado", description: "Puede pegar con Ctrl+V" })
      return
    }

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(
        () => {
          showToast({ type: "success", title: "Copiado", description: "Puede pegar con Ctrl+V" })
        },
        () => {
          selectCopyArea()
          showToast({
            type: "info",
            title: "Texto seleccionado",
            description: "Pulse Ctrl+C para copiar",
          })
        }
      )
      return
    }

    selectCopyArea()
    showToast({
      type: "info",
      title: "Texto seleccionado",
      description: "Pulse Ctrl+C para copiar",
    })
  }, [datosParaCopiar, showToast])

  const mostrarDatosCompletos = showPassword

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {intent === "generate" || justCreated
              ? "Usuario creado"
              : "Credenciales del portal"}
          </DialogTitle>
          <DialogDescription>{client?.name}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {intent === "generate" ? "Generando acceso..." : "Cargando credenciales..."}
          </div>
        ) : credencial ? (
          <div className="space-y-4 py-2">
            {justCreated && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Guardado en la base de datos.
              </div>
            )}

            {mostrarDatosCompletos ? (
              <div className="rounded-lg border-2 border-primary/30 bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-semibold">Datos de acceso</p>
                <Textarea
                  ref={copyAreaRef}
                  readOnly
                  value={datosParaCopiar}
                  className="min-h-[120px] resize-none font-mono text-sm leading-relaxed cursor-text select-all"
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(e) => e.currentTarget.select()}
                  aria-label="Datos de acceso al portal"
                />
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-1">
                <Label className="text-muted-foreground">Usuario</Label>
                <p className="font-mono text-sm font-medium break-words">{usuario}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              {activo ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Habilitado
                </Badge>
              ) : (
                <Badge variant="destructive" className="bg-red-600 hover:bg-red-600">
                  <UserX className="h-3 w-3 mr-1" />
                  Desvinculado
                </Badge>
              )}
              <Button
                type="button"
                variant={activo ? "outline" : "default"}
                size="sm"
                disabled={toggling}
                onClick={handleToggleAcceso}
                className={activo ? "text-destructive hover:text-destructive" : ""}
              >
                {toggling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : activo ? (
                  <Link2Off className="h-4 w-4 mr-2" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                {activo ? "Desvincular" : "Habilitar"}
              </Button>
            </div>

            {intent === "manage" && !showPassword && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={regenerating}
                onClick={handleRegenerarPassword}
              >
                {regenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Regenerar contraseña
              </Button>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
            Cerrar
          </Button>
          {credencial && !loading && mostrarDatosCompletos && (
            <Button type="button" onClick={copyDatos}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar datos
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
