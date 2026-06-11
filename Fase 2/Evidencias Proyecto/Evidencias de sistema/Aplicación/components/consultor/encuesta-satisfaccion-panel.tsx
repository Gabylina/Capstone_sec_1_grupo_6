"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Star } from "lucide-react"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import { useAuth } from "@/hooks/auth"
import {
  satisfaccionClienteService,
  type EncuestaPanelData,
  type EncuestaPanelItem,
} from "@/lib/api-satisfaccion-cliente"
import { debeMostrarEncuestaEnModulo } from "@/lib/encuesta-modulo-config"
import type { Process } from "@/lib/types"

const PREGUNTAS_ESCALA = [
  { key: "comunicacion" as const, label: "La comunicación durante el proceso fue clara y oportuna." },
  {
    key: "calidad_candidatos" as const,
    label: "La calidad de los candidatos presentados cumplió con el perfil solicitado.",
  },
  { key: "tiempo" as const, label: "El tiempo de respuesta del equipo fue adecuado." },
  {
    key: "acompanamiento" as const,
    label: "El acompañamiento del consultor generó confianza y seguridad.",
  },
] as const

type EncuestaFormState = {
  comunicacion: string
  calidad_candidatos: string
  tiempo: string
  acompanamiento: string
  volveria_trabajar: string
  motivo_no: string
}

/** Máximo del motivo; el JSON completo se guarda en BD con tope de 1000 caracteres. */
const MOTIVO_NO_MAX_LENGTH = 850

const FORM_INICIAL: EncuestaFormState = {
  comunicacion: "3",
  calidad_candidatos: "3",
  tiempo: "3",
  acompanamiento: "3",
  volveria_trabajar: "",
  motivo_no: "",
}

interface EncuestaSatisfaccionPanelProps {
  process: Process
  modulo: 2 | 3 | 4 | 5
  readOnly?: boolean
  onEncuestaSaved?: () => void
}

export function EncuestaSatisfaccionPanel({
  process,
  modulo,
  readOnly = false,
  onEncuestaSaved,
}: EncuestaSatisfaccionPanelProps) {
  const { showToast } = useToastNotification()
  const { user } = useAuth()
  const canEditEncuesta = user?.role === "admin" || (user?.role === "consultor" && !readOnly)

  const [panel, setPanel] = useState<EncuestaPanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<EncuestaPanelItem | null>(null)
  const [encuestaForm, setEncuestaForm] = useState<EncuestaFormState>(FORM_INICIAL)
  const [isSaving, setIsSaving] = useState(false)

  const loadPanel = useCallback(async () => {
    setLoading(true)
    try {
      const res = await satisfaccionClienteService.getEncuestaPanel(Number(process.id))
      if (res.success && res.data) {
        setPanel(res.data)
      } else {
        setPanel(null)
      }
    } catch {
      setPanel(null)
    } finally {
      setLoading(false)
    }
  }, [process.id])

  useEffect(() => {
    if (debeMostrarEncuestaEnModulo(process, modulo)) {
      loadPanel()
    }
  }, [process, modulo, loadPanel])

  if (!debeMostrarEncuestaEnModulo(process, modulo)) {
    return null
  }

  const openDialog = (item: EncuestaPanelItem) => {
    setSelectedItem(item)
    setEncuestaForm(FORM_INICIAL)
    setShowDialog(true)
  }

  const handleSubmit = async () => {
    if (!selectedItem?.id_contratacion) {
      showToast({
        type: "error",
        title: "Error",
        description: "No se encontró el registro de contratación para esta encuesta.",
      })
      return
    }

    const comunicacion = Number(encuestaForm.comunicacion)
    const calidad_candidatos = Number(encuestaForm.calidad_candidatos)
    const tiempo = Number(encuestaForm.tiempo)
    const acompanamiento = Number(encuestaForm.acompanamiento)

    if ([comunicacion, calidad_candidatos, tiempo, acompanamiento].some((n) => Number.isNaN(n) || n < 1 || n > 5)) {
      showToast({
        type: "error",
        title: "Datos inválidos",
        description: "Seleccione una calificación entre 1 y 5 en cada pregunta.",
      })
      return
    }

    if (encuestaForm.volveria_trabajar !== "si" && encuestaForm.volveria_trabajar !== "no") {
      showToast({
        type: "error",
        title: "Datos incompletos",
        description: "Indique si volvería a trabajar con LL Consulting.",
      })
      return
    }

    const volveria_trabajar = encuestaForm.volveria_trabajar === "si"
    const motivo_no = encuestaForm.motivo_no.trim()

    if (!volveria_trabajar && !motivo_no) {
      showToast({
        type: "error",
        title: "Datos incompletos",
        description: "Si la respuesta es No, indique el motivo.",
      })
      return
    }

    setIsSaving(true)
    try {
      const res = await satisfaccionClienteService.registrarEncuesta(selectedItem.id_contratacion, {
        comunicacion,
        calidad_candidatos,
        tiempo,
        acompanamiento,
        volveria_trabajar,
        ...(!volveria_trabajar ? { motivo_no } : {}),
      })
      if (res.success) {
        showToast({
          type: "success",
          title: "Encuesta registrada",
          description: "La encuesta de satisfacción se guardó correctamente.",
        })
        setShowDialog(false)
        setSelectedItem(null)
        await loadPanel()
        onEncuestaSaved?.()
      } else {
        showToast({
          type: "error",
          title: "Error",
          description: res.message || "No se pudo registrar la encuesta.",
        })
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        description: "Error de conexión al registrar la encuesta.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const items = panel?.items ?? []
  const pendientes = items.filter((i) => i.pendiente)

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Encuesta de satisfacción
          </CardTitle>
          <CardDescription>
            Percepción del cliente sobre comunicación, candidatos, tiempos y acompañamiento (escala 1 a 5).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando encuestas...
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              {panel?.mensaje || "Aún no hay encuestas disponibles para este proceso."}
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id_contratacion}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3 bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{item.nombre}</p>
                    {item.encuesta_respondida ? (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Encuesta respondida
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1 text-xs text-orange-700 border-orange-300">
                        Pendiente
                      </Badge>
                    )}
                  </div>
                  {!item.encuesta_respondida && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canEditEncuesta}
                      onClick={() => openDialog(item)}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Registrar encuesta
                    </Button>
                  )}
                </div>
              ))}
              {pendientes.length > 0 && canEditEncuesta && (
                <p className="text-xs text-muted-foreground">
                  {pendientes.length} encuesta{pendientes.length !== 1 ? "s" : ""} pendiente
                  {pendientes.length !== 1 ? "s" : ""}.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Encuesta de satisfacción</DialogTitle>
            <DialogDescription>
              {selectedItem?.nombre
                ? `Respuestas del cliente para ${selectedItem.nombre}. Escala 1 (muy bajo) a 5 (excelente).`
                : "Complete las preguntas según la percepción del cliente."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {PREGUNTAS_ESCALA.map(({ key, label }) => (
              <div key={key} className="grid gap-2">
                <Label htmlFor={`encuesta-panel-${key}`}>{label}</Label>
                <Select
                  value={encuestaForm[key]}
                  onValueChange={(v) => setEncuestaForm((prev) => ({ ...prev, [key]: v }))}
                >
                  <SelectTrigger id={`encuesta-panel-${key}`}>
                    <SelectValue placeholder="Seleccione 1 a 5" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} — {n === 1 ? "Muy bajo" : n === 5 ? "Excelente" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <div className="grid gap-2 border-t pt-4">
              <Label htmlFor="encuesta-panel-volveria">
                Volvería a trabajar con LL Consulting en futuros procesos.
              </Label>
              <Select
                value={encuestaForm.volveria_trabajar}
                onValueChange={(v) =>
                  setEncuestaForm((prev) => ({
                    ...prev,
                    volveria_trabajar: v,
                    motivo_no: v === "si" ? "" : prev.motivo_no,
                  }))
                }
              >
                <SelectTrigger id="encuesta-panel-volveria">
                  <SelectValue placeholder="Seleccione Sí o No" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {encuestaForm.volveria_trabajar === "no" && (
              <div className="grid gap-2">
                <Label htmlFor="encuesta-panel-motivo">Si su respuesta es No, indique el ¿Por qué?</Label>
                <Textarea
                  id="encuesta-panel-motivo"
                  rows={4}
                  placeholder="Describa el motivo..."
                  value={encuestaForm.motivo_no}
                  maxLength={MOTIVO_NO_MAX_LENGTH}
                  onChange={(e) => setEncuestaForm((prev) => ({ ...prev, motivo_no: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {encuestaForm.motivo_no.length}/{MOTIVO_NO_MAX_LENGTH} caracteres
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!canEditEncuesta || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar encuesta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
