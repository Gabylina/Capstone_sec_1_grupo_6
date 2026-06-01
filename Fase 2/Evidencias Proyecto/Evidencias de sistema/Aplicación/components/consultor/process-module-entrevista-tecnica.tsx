"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCandidatesByProcess, solicitudService, entrevistaTecnicaService } from "@/lib/api"
import { Calendar, Clock, Loader2, User, Settings, ChevronDown, ChevronRight } from "lucide-react"
import type { Process, Candidate } from "@/lib/types"
import { toast } from "sonner"
import { useProcessView, isProcessViewOnly } from "@/lib/process-view-context"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

interface EntrevistaRow {
  candidatoId: string
  nombre: string
  fechaHoraEntrevista: string
  estado: "programada" | "realizada" | "cancelada" | ""
  resultado: "avanza" | "no_avanza" | ""
  detalle: string
}

interface ProcessModuleEntrevistaTecnicaProps {
  process: Process
  readOnly?: boolean
  onAdvance?: () => void
}

export function ProcessModuleEntrevistaTecnica({ process, readOnly = false, onAdvance }: ProcessModuleEntrevistaTecnicaProps) {
  const viewOnlyMode = isProcessViewOnly(readOnly, false)
  const processView = useProcessView()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [rows, setRows] = useState<Record<string, EntrevistaRow>>({})
  const [showGestionarDialog, setShowGestionarDialog] = useState(false)
  const [gestionarCandidateId, setGestionarCandidateId] = useState<string | null>(null)
  const [gestionarForm, setGestionarForm] = useState<EntrevistaRow>({
    candidatoId: "",
    nombre: "",
    fechaHoraEntrevista: "",
    estado: "",
    resultado: "",
    detalle: "",
  })
  const [expandedCandidatoId, setExpandedCandidatoId] = useState<string | null>(null)

  // Mismo manejo de fecha/hora que en Módulo 4 (calendario + hora)
  const parseLocalDateTime = (dateTimeString: string): Date => {
    if (!dateTimeString) return new Date()
    const d = new Date(dateTimeString)
    if (!isNaN(d.getTime())) return d
    const [datePart, timePart] = dateTimeString.split("T")
    if (datePart) {
      const [y, m, day] = datePart.split("-").map(Number)
      const [h, min] = (timePart || "08:00").split(":").map(Number)
      return new Date(y, (m || 1) - 1, day || 1, h || 8, min || 0)
    }
    return new Date()
  }
  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return ""
    const dateObj = typeof date === "string" ? new Date(date) : date
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, "0")
    const day = String(dateObj.getDate()).padStart(2, "0")
    const hour = String(dateObj.getHours()).padStart(2, "0")
    const minute = String(dateObj.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day}T${hour}:${minute}`
  }

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        let list: Candidate[]
        if (viewOnlyMode && processView?.sharedCandidates) {
          list = processView.sharedCandidates as Candidate[]
        } else if (viewOnlyMode && processView) {
          list = (await processView.ensureCandidates(process.id)) as Candidate[]
        } else {
          list = await getCandidatesByProcess(process.id)
        }
        // Solo candidatos aprobados por el cliente (rechazados no deben verse en Entrevista Técnica)
        const aprobadosCliente = list.filter((c: Candidate) => (c as any).client_response === "aprobado" || (c as any).estado_candidato === "aprobado")
        setCandidates(aprobadosCliente)
        const initial: Record<string, EntrevistaRow> = {}
        const idSolicitud = Number(process.id)
        aprobadosCliente.forEach((c: Candidate) => {
          const id = String((c as any).id_candidato ?? (c as any).id ?? c)
          initial[id] = {
            candidatoId: id,
            nombre: (c.name || [((c as any).firstName), (c as any).lastName, (c as any).nombre, (c as any).apellido].filter(Boolean).join(" ")).trim() || "Candidato",
            fechaHoraEntrevista: "",
            estado: "",
            resultado: "",
            detalle: "",
          }
        })
        const res = await entrevistaTecnicaService.getBySolicitud(idSolicitud)
        if (res.success && res.data && Array.isArray(res.data)) {
          res.data.forEach((ent: any) => {
            const idPostulacion = ent.id_postulacion
            const cand = aprobadosCliente.find((c: Candidate) => (c as any).id_postulacion === idPostulacion)
            if (cand) {
              const id = String((cand as any).id_candidato ?? (cand as any).id ?? cand)
              const row = initial[id]
              if (row) {
                initial[id] = {
                  ...row,
                  fechaHoraEntrevista: ent.fecha_hora_entrevista ? new Date(ent.fecha_hora_entrevista).toISOString() : "",
                  estado: (ent.estado_entrevista || "") as EntrevistaRow["estado"],
                  resultado: (ent.resultado || "") as EntrevistaRow["resultado"],
                  detalle: ent.detalle || "",
                }
              }
            }
          })
        }
        setRows(initial)
      } catch (e) {
        console.error(e)
        toast.error("Error al cargar candidatos")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [process.id, viewOnlyMode, processView?.sharedCandidates])

  const openGestionar = (c: Candidate) => {
    const id = String((c as any).id_candidato ?? (c as any).id ?? c)
    const row = rows[id] || {
      candidatoId: id,
      nombre: (c.name || [((c as any).nombre), (c as any).apellido].filter(Boolean).join(" ")).trim() || "Candidato",
      fechaHoraEntrevista: "",
      estado: "",
      resultado: "",
      detalle: "",
    }
    setGestionarCandidateId(id)
    setGestionarForm({ ...row })
    setShowGestionarDialog(true)
  }

  const saveGestionar = async () => {
    if (!gestionarCandidateId) return
    const cand = candidates.find((c) => String((c as any).id_candidato ?? (c as any).id ?? c) === gestionarCandidateId)
    const idPostulacion = cand != null ? (cand as any).id_postulacion : null
    const idSolicitud = Number(process.id)
    if (idPostulacion != null) {
      try {
        const res = await entrevistaTecnicaService.upsert({
          id_postulacion: idPostulacion,
          id_solicitud: idSolicitud,
          fecha_hora_entrevista: gestionarForm.fechaHoraEntrevista || null,
          estado_entrevista: gestionarForm.estado || "programada",
          resultado: gestionarForm.resultado || null,
          detalle: gestionarForm.detalle || null,
        })
        if (!res.success) {
          toast.error(res.message || "Error al guardar")
          return
        }
      } catch (e) {
        console.error(e)
        toast.error("Error al guardar en la base de datos")
        return
      }
    }
    setRows((prev) => ({
      ...prev,
      [gestionarCandidateId]: { ...prev[gestionarCandidateId], ...gestionarForm },
    }))
    setShowGestionarDialog(false)
    setGestionarCandidateId(null)
    toast.success(idPostulacion != null ? "Datos de entrevista guardados" : "Datos guardados (local)")
  }

  const handleAdvanceToExamenes = async () => {
    try {
      setIsAdvancing(true)
      const etapasRes = await solicitudService.getEtapas()
      if (!etapasRes.success || !etapasRes.data) {
        toast.error("No se pudieron cargar las etapas")
        return
      }
      const etapa = (etapasRes.data as { id: number; nombre: string }[]).find(
        (e) => e.nombre === "Módulo Exámenes Médicos"
      )
      if (!etapa) {
        toast.error("Etapa 'Módulo Exámenes Médicos' no encontrada")
        return
      }
      const res = await solicitudService.cambiarEtapa(Number(process.id), etapa.id)
      if (res.success) {
        toast.success("Proceso avanzado a Exámenes Médicos")
        onAdvance?.()
        const url = new URL(window.location.href)
        url.searchParams.set("tab", "modulo-examenes-medicos")
        window.location.href = url.toString()
      } else {
        toast.error(res.message || "No se pudo avanzar")
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || "Error al avanzar")
    } finally {
      setIsAdvancing(false)
    }
  }

  const isInExamenesOrLater = (process as any).etapa && ["Módulo Exámenes Médicos", "Módulo 4: Evaluación Psicolaboral", "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"].includes((process as any).etapa)

  // Habilitar "Avanzar a Exámenes Médicos" solo si al menos un candidato tiene resultado "avanza"
  const hasAtLeastOneAvanza = Object.values(rows).some((r) => r.resultado === "avanza")

  const formatDateTime = (s: string) => {
    if (!s) return "—"
    try {
      const d = new Date(s)
      return format(d, "dd/MM/yyyy HH:mm", { locale: es })
    } catch {
      return s
    }
  }

  const estadoBadge = (estado: string) => {
    if (estado === "realizada") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Realizada</Badge>
    if (estado === "programada") return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Programada</Badge>
    if (estado === "cancelada") return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Cancelada</Badge>
    return <span className="text-muted-foreground">—</span>
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Módulo Entrevista Técnica</h2>
          <p className="text-muted-foreground">Agendamiento, resultados y decisión de avance</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Módulo Entrevista Técnica</h2>
        <p className="text-muted-foreground">
          Gestiona fecha y hora de entrevista técnica por candidato, marca si está realizada, detalle y decisión de avance.
        </p>
      </div>

      {/* Cuadro azul "Avanzar al siguiente módulo" (siempre visible, igual que Módulo 2) */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">Avanzar al siguiente módulo</h3>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                {candidates.length === 0
                  ? "No hay candidatos en esta etapa. Avanza desde el Módulo 3 para presentar candidatos."
                  : hasAtLeastOneAvanza
                    ? "Hay al menos un candidato que avanza. Pasa el proceso a Exámenes Médicos."
                    : "Debe haber al menos un candidato con resultado \"Avanza\" para poder avanzar a Exámenes Médicos. Usa \"Gestionar\" en cada candidato y asigna el resultado."}
              </p>
            </div>
            <Button
              onClick={handleAdvanceToExamenes}
              disabled={readOnly || isAdvancing || !hasAtLeastOneAvanza || isInExamenesOrLater || candidates.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAdvancing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Avanzar a Exámenes Médicos
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Entrevistas técnicas por candidato
          </CardTitle>
          <CardDescription>
            Usa &quot;Gestionar&quot; para definir fecha/hora, estado (programada/realizada/cancelada), detalle y si el candidato avanza.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-muted-foreground py-4">No hay candidatos presentados para este proceso. Avanza desde el Módulo 3.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="w-[100px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => {
                  const id = String((c as any).id_candidato ?? (c as any).id ?? c)
                  const row = rows[id] || { candidatoId: id, nombre: "", fechaHoraEntrevista: "", estado: "", resultado: "", detalle: "" }
                  const nombre = row.nombre || (c.name || [((c as any).nombre), (c as any).apellido].filter(Boolean).join(" ")).trim() || "—"
                  const isExpanded = expandedCandidatoId === id
                  return (
                    <React.Fragment key={id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedCandidatoId(isExpanded ? null : id)}
                      >
                        <TableCell className="font-medium w-10">
                          <span className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <User className="h-4 w-4 text-muted-foreground" />
                            {nombre}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(row.fechaHoraEntrevista)}
                        </TableCell>
                        <TableCell>{estadoBadge(row.estado)}</TableCell>
                        <TableCell>
                          {row.resultado === "avanza" ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Avanza</Badge>
                          ) : row.resultado === "no_avanza" ? (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">No avanza</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {!readOnly && (
                            <Button variant="outline" size="sm" onClick={() => openGestionar(c)} className="gap-1">
                              <Settings className="h-4 w-4" />
                              Gestionar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={5} className="p-4">
                            <div className="rounded-lg border bg-background p-4 space-y-3 text-sm">
                              <h4 className="font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Resultado de entrevista técnica — {nombre}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <span className="text-muted-foreground">Fecha y hora: </span>
                                  {formatDateTime(row.fechaHoraEntrevista) || "—"}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Estado: </span>
                                  {estadoBadge(row.estado)}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Resultado: </span>
                                  {row.resultado === "avanza" ? (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Avanza</Badge>
                                  ) : row.resultado === "no_avanza" ? (
                                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">No avanza</Badge>
                                  ) : (
                                    "—"
                                  )}
                                </div>
                              </div>
                              {row.detalle ? (
                                <div>
                                  <span className="text-muted-foreground">Detalle / Notas: </span>
                                  <p className="mt-1 whitespace-pre-wrap">{row.detalle}</p>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Gestionar fecha/hora y detalle (estilo Módulo 4) */}
      <Dialog open={showGestionarDialog} onOpenChange={setShowGestionarDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Gestionar entrevista técnica</DialogTitle>
            <DialogDescription>
              {gestionarForm.nombre ? `Candidato: ${gestionarForm.nombre}` : "Define fecha, estado, detalle y resultado."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Fecha y hora de entrevista</Label>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${!gestionarForm.fechaHoraEntrevista ? "text-muted-foreground" : ""}`}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {gestionarForm.fechaHoraEntrevista
                        ? format(parseLocalDateTime(gestionarForm.fechaHoraEntrevista), "dd/MM/yyyy", { locale: es })
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      captionLayout="dropdown"
                      fromYear={1900}
                      toYear={new Date().getFullYear() + 2}
                      selected={gestionarForm.fechaHoraEntrevista ? parseLocalDateTime(gestionarForm.fechaHoraEntrevista) : undefined}
                      defaultMonth={gestionarForm.fechaHoraEntrevista ? parseLocalDateTime(gestionarForm.fechaHoraEntrevista) : new Date()}
                      onSelect={(date) => {
                        if (date) {
                          const current = gestionarForm.fechaHoraEntrevista
                            ? parseLocalDateTime(gestionarForm.fechaHoraEntrevista)
                            : new Date()
                          const newDate = new Date(date)
                          newDate.setHours(current.getHours(), current.getMinutes())
                          setGestionarForm((f) => ({ ...f, fechaHoraEntrevista: newDate.toISOString() }))
                        }
                      }}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${!gestionarForm.fechaHoraEntrevista ? "text-muted-foreground" : ""}`}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {gestionarForm.fechaHoraEntrevista
                        ? format(parseLocalDateTime(gestionarForm.fechaHoraEntrevista), "HH:mm", { locale: es })
                        : "Seleccionar hora"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="flex items-center gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Hora</Label>
                        <Select
                          value={
                            gestionarForm.fechaHoraEntrevista
                              ? (() => {
                                  const hour = parseLocalDateTime(gestionarForm.fechaHoraEntrevista).getHours()
                                  if (hour < 8 || hour > 20) return "08"
                                  return String(hour).padStart(2, "0")
                                })()
                              : "08"
                          }
                          onValueChange={(value) => {
                            const current = gestionarForm.fechaHoraEntrevista
                              ? parseLocalDateTime(gestionarForm.fechaHoraEntrevista)
                              : new Date()
                            const newDate = new Date(current)
                            const h = parseInt(value, 10)
                            if (h >= 8 && h <= 20) {
                              newDate.setHours(h)
                              setGestionarForm((f) => ({ ...f, fechaHoraEntrevista: newDate.toISOString() }))
                            }
                          }}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {Array.from({ length: 13 }, (_, i) => {
                              const hour = i + 8
                              return (
                                <SelectItem key={hour} value={String(hour).padStart(2, "0")}>
                                  {String(hour).padStart(2, "0")}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-lg font-semibold mt-6">:</span>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Minutos</Label>
                        <Select
                          value={
                            gestionarForm.fechaHoraEntrevista
                              ? String(parseLocalDateTime(gestionarForm.fechaHoraEntrevista).getMinutes()).padStart(2, "0")
                              : "00"
                          }
                          onValueChange={(value) => {
                            const current = gestionarForm.fechaHoraEntrevista
                              ? parseLocalDateTime(gestionarForm.fechaHoraEntrevista)
                              : new Date()
                            const newDate = new Date(current)
                            newDate.setMinutes(parseInt(value, 10))
                            setGestionarForm((f) => ({ ...f, fechaHoraEntrevista: newDate.toISOString() }))
                          }}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {Array.from({ length: 60 }, (_, i) => (
                              <SelectItem key={i} value={String(i).padStart(2, "0")}>
                                {String(i).padStart(2, "0")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select
                value={gestionarForm.estado || "programada"}
                onValueChange={(v) => setGestionarForm((f) => ({ ...f, estado: v as EntrevistaRow["estado"] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="programada">Programada</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Detalle / Notas</Label>
              <Textarea
                placeholder="Detalle de la entrevista, observaciones..."
                value={gestionarForm.detalle}
                onChange={(e) => setGestionarForm((f) => ({ ...f, detalle: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Resultado</Label>
              <Select
                value={gestionarForm.resultado || ""}
                onValueChange={(v) => setGestionarForm((f) => ({ ...f, resultado: v as EntrevistaRow["resultado"] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="¿Avanza al siguiente paso?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avanza">Avanza</SelectItem>
                  <SelectItem value="no_avanza">No avanza</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGestionarDialog(false)}>Cancelar</Button>
            <Button onClick={saveGestionar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
