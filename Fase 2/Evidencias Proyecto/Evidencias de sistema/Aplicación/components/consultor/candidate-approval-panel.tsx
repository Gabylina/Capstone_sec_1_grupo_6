"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Eye, ShieldCheck, FileText } from "lucide-react"
import CVViewerDialog from "./cv-viewer-dialog"
import type { Candidate } from "@/lib/types"
import { postulacionService } from "@/lib/api"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import { processApiErrorMessage, formatDateShort, cn } from "@/lib/utils"
import { getApprovalStatusBadgeClass } from "@/lib/approval-utils"
import { CandidateReviewDetail } from "./candidate-review-detail"

const APPROVAL_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  observado: "Con observaciones",
}

const DECISION_OPTIONS: Array<{
  value: "aprobado" | "rechazado" | "observado"
  label: string
  description: string
  selectedClass: string
  labelClass: string
  radioClass: string
}> = [
  {
    value: "aprobado",
    label: "Aprobar",
    description: "El consultor podrá presentar al candidato",
    selectedClass:
      "border-green-600 bg-green-50 ring-2 ring-green-600/30 dark:border-green-500 dark:bg-green-950/50",
    labelClass: "text-green-900 dark:text-green-100",
    radioClass: "border-green-700 text-green-700 data-[state=checked]:border-green-700",
  },
  {
    value: "rechazado",
    label: "Rechazar",
    description: "El candidato no podrá presentarse",
    selectedClass:
      "border-red-600 bg-red-50 ring-2 ring-red-600/30 dark:border-red-500 dark:bg-red-950/50",
    labelClass: "text-red-900 dark:text-red-100",
    radioClass: "border-red-700 text-red-700 data-[state=checked]:border-red-700",
  },
  {
    value: "observado",
    label: "Observar",
    description: "Requiere ajustes antes de presentar",
    selectedClass:
      "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-500/30 dark:border-yellow-500 dark:bg-yellow-950/40",
    labelClass: "text-yellow-950 dark:text-yellow-100",
    radioClass: "border-yellow-600 text-yellow-700 data-[state=checked]:border-yellow-600",
  },
]

interface CandidateApprovalPanelProps {
  candidates: Candidate[]
  cargoLabel: string
  onRefresh: () => void
}

export function CandidateApprovalPanel({
  candidates,
  cargoLabel,
  onRefresh,
}: CandidateApprovalPanelProps) {
  const { showToast } = useToastNotification()
  const [reviewCandidate, setReviewCandidate] = useState<Candidate | null>(null)
  const [decision, setDecision] = useState<"aprobado" | "rechazado" | "observado">("aprobado")
  const [motivo, setMotivo] = useState("")
  const [saving, setSaving] = useState(false)
  const [viewingCV, setViewingCV] = useState<Candidate | null>(null)
  const [showViewCV, setShowViewCV] = useState(false)

  const renderStars = (rating: number) => (
    <span className="text-amber-500 text-sm">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>
  )

  const openReview = (candidate: Candidate) => {
    setReviewCandidate(candidate)
    setDecision("aprobado")
    setMotivo("")
  }

  const closeReview = () => {
    setReviewCandidate(null)
    setMotivo("")
    setSaving(false)
    setShowViewCV(false)
    setViewingCV(null)
  }

  const handleViewCV = (candidate: Candidate) => {
    if (!candidate.cv_file && !candidate.id_postulacion) {
      showToast({
        type: "info",
        title: "Sin CV",
        description: "Este candidato no tiene curriculum cargado en la postulación.",
      })
      return
    }
    setViewingCV(candidate)
    setShowViewCV(true)
  }

  const motivoObligatorio = decision === "rechazado" || decision === "observado"

  const handleResolve = async () => {
    if (!reviewCandidate?.id_postulacion) return
    const motivoTrim = motivo.trim()
    if (motivoObligatorio && motivoTrim.length < 5) {
      showToast({
        type: "error",
        title: "Motivo requerido",
        description: "Indique el motivo al rechazar u observar (mínimo 5 caracteres).",
      })
      return
    }
    if (reviewCandidate.approval_status !== "en_revision") {
      showToast({
        type: "error",
        title: "No disponible",
        description: "Solo puede resolver candidatos en estado «En revisión».",
      })
      return
    }

    try {
      setSaving(true)
      const res = await postulacionService.resolverAprobacion(
        reviewCandidate.id_postulacion,
        decision,
        motivoObligatorio ? motivoTrim : motivoTrim || ""
      )
      if (!res.success) {
        throw new Error(res.message || "Error al registrar decisión")
      }
      showToast({
        type: "success",
        title: "Decisión registrada",
        description: `Candidato ${APPROVAL_LABELS[decision]?.toLowerCase() || decision}.`,
      })
      closeReview()
      onRefresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al registrar decisión"
      showToast({
        type: "error",
        title: "Error",
        description: processApiErrorMessage(msg, "No se pudo registrar la decisión."),
      })
      setSaving(false)
    }
  }

  const canResolve = reviewCandidate?.approval_status === "en_revision"
  const candidatesEnRevision = candidates.filter((c) => c.approval_status === "en_revision")

  return (
    <>
      <Card className="mb-6 border-violet-200 bg-violet-50/40 dark:border-violet-900 dark:bg-violet-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-violet-700 dark:text-violet-300" />
            Aprobación de Candidatos
          </CardTitle>
          <CardDescription>
            Revise los candidatos enviados por el consultor antes de que puedan presentarse al cliente.
            Cargo del proceso: <span className="font-medium text-foreground">{cargoLabel}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidatesEnRevision.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay candidatos pendientes de revisión. Solo aparecen aquí los enviados por el consultor.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Valoración</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidatesEnRevision.map((c) => {
                  const st = c.approval_status || "pendiente"
                  return (
                    <TableRow key={c.id_postulacion || c.id}>
                      <TableCell>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">{cargoLabel}</TableCell>
                      <TableCell>{renderStars(c.consultant_rating || 0)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getApprovalStatusBadgeClass(st)}>
                          {APPROVAL_LABELS[st] || st}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openReview(c)}>
                          <Eye className="h-3.5 w-3.5" />
                          Ver revisión
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewCandidate} onOpenChange={(open) => !open && closeReview()}>
        <DialogContent className="max-w-3xl w-[min(48rem,95vw)] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pr-8">
              <div className="min-w-0">
                <DialogTitle>Revisión de candidato</DialogTitle>
                <DialogDescription>
                  {reviewCandidate?.name} — {cargoLabel}
                </DialogDescription>
              </div>
              {reviewCandidate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => handleViewCV(reviewCandidate)}
                  disabled={!reviewCandidate.cv_file}
                  title={
                    reviewCandidate.cv_file
                      ? "Ver curriculum del candidato"
                      : "No hay CV cargado"
                  }
                >
                  <FileText className="h-4 w-4" />
                  Ver CV
                </Button>
              )}
            </div>
          </DialogHeader>

          {reviewCandidate && (
            <div className="space-y-4 text-sm min-w-0 max-w-full">
              <CandidateReviewDetail candidate={reviewCandidate} cargoLabel={cargoLabel} />

              {reviewCandidate.approval_fecha_envio && (
                <p className="text-sm text-muted-foreground">
                  Enviado a revisión: {formatDateShort(reviewCandidate.approval_fecha_envio)}
                </p>
              )}

              {canResolve && (
                <>
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-base font-semibold">Decisión de la coordinadora</Label>
                    <RadioGroup
                      value={decision}
                      onValueChange={(v) => {
                        const next = v as typeof decision
                        setDecision(next)
                        if (next === "aprobado") setMotivo("")
                      }}
                      className="flex flex-col gap-2"
                    >
                      {DECISION_OPTIONS.map((opt) => {
                        const selected = decision === opt.value
                        return (
                          <label
                            key={opt.value}
                            htmlFor={`dec-${opt.value}`}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 transition-colors",
                              selected
                                ? opt.selectedClass
                                : "border-border bg-muted/40 hover:bg-muted/70 dark:bg-muted/20"
                            )}
                          >
                            <RadioGroupItem
                              value={opt.value}
                              id={`dec-${opt.value}`}
                              className={cn(
                                "mt-0.5 size-5 shrink-0 border-2 border-foreground/70 bg-background shadow-sm",
                                selected && opt.radioClass
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "block text-sm font-semibold",
                                  selected ? opt.labelClass : "text-foreground"
                                )}
                              >
                                {opt.label}
                              </span>
                              <span className="block text-xs text-muted-foreground mt-0.5">
                                {opt.description}
                              </span>
                            </div>
                          </label>
                        )
                      })}
                    </RadioGroup>
                  </div>
                  {motivoObligatorio && (
                    <div className="space-y-2 min-w-0 max-w-full">
                      <Label htmlFor="motivo-aprob">
                        Motivo / observaciones <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="motivo-aprob"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Indique el motivo al rechazar u observar al candidato..."
                        rows={4}
                        className="w-full min-w-0 max-w-full resize-y break-words"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeReview} disabled={saving}>
              Cerrar
            </Button>
            {canResolve && (
              <Button type="button" onClick={handleResolve} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar decisión
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CVViewerDialog
        candidate={viewingCV}
        isOpen={showViewCV}
        onClose={() => {
          setShowViewCV(false)
          setViewingCV(null)
        }}
      />
    </>
  )
}
