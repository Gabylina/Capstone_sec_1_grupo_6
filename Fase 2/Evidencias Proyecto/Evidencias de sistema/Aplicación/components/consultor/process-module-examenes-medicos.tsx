"use client"

import React, { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { getCandidatesByProcess, solicitudService, examenMedicoService, entrevistaTecnicaService } from "@/lib/api"
import { DocumentViewerDialog } from "./document-viewer-dialog"
import { FileText, Loader2, User, Upload, Plus, Trash2, Eye, ChevronDown, ChevronRight, Save, Settings } from "lucide-react"
import type { Process, Candidate } from "@/lib/types"
import { toast } from "sonner"

export interface ExamenItem {
  id: string
  id_examen_medico?: number
  nombre: string
  detalle?: string
  file: File | null
  estado: "pendiente" | "aprobado" | "rechazado"
}

interface ProcessModuleExamenesMedicosProps {
  process: Process
  readOnly?: boolean
  onAdvance?: () => void
}

const ACCEPTED_EXAM_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp,.gif"
const ACCEPTED_EXAM_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_FILE_SIZE_MB = 10

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ProcessModuleExamenesMedicos({ process, readOnly = false, onAdvance }: ProcessModuleExamenesMedicosProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [examenesPorCandidato, setExamenesPorCandidato] = useState<Record<string, ExamenItem[]>>({})
  const [expandedCandidatoId, setExpandedCandidatoId] = useState<string | null>(null)
  const [viewingDocument, setViewingDocument] = useState<{ file: File; title: string } | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addDialogCandidatoId, setAddDialogCandidatoId] = useState<string | null>(null)
  const [addFormNombre, setAddFormNombre] = useState("")
  const [addFormDetalle, setAddFormDetalle] = useState("")
  const [addFormFile, setAddFormFile] = useState<File | null>(null)
  const [addFormEstado, setAddFormEstado] = useState<ExamenItem["estado"]>("pendiente")
  const [isSavingAdd, setIsSavingAdd] = useState(false)
  const addFormFileInputRef = useRef<HTMLInputElement | null>(null)
  const [showAjustesDialog, setShowAjustesDialog] = useState(false)
  const [ajustesExamen, setAjustesExamen] = useState<ExamenItem | null>(null)
  const [ajustesCandidatoId, setAjustesCandidatoId] = useState<string | null>(null)
  const [ajustesNombre, setAjustesNombre] = useState("")
  const [ajustesDetalle, setAjustesDetalle] = useState("")
  const [ajustesFile, setAjustesFile] = useState<File | null>(null)
  const [ajustesEstado, setAjustesEstado] = useState<ExamenItem["estado"]>("pendiente")
  const [isSavingAjustes, setIsSavingAjustes] = useState(false)
  const [refreshExamenesKey, setRefreshExamenesKey] = useState(0)
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const ajustesFileInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const loadData = async (skipLoadingSpinner = false) => {
    try {
      if (!skipLoadingSpinner) setIsLoading(true)
      const list = await getCandidatesByProcess(process.id)
      const aprobadosCliente = list.filter((c: Candidate) => (c as any).client_response === "aprobado" || (c as any).estado_candidato === "aprobado")
      const idSolicitud = Number(process.id)
      const entrevistasRes = await entrevistaTecnicaService.getBySolicitud(idSolicitud)
      const idPostulacionesAvanza = new Set<number>()
      if (entrevistasRes.success && entrevistasRes.data && Array.isArray(entrevistasRes.data)) {
        (entrevistasRes.data as any[]).forEach((ent: any) => {
          if (ent.resultado === "avanza") idPostulacionesAvanza.add(ent.id_postulacion)
        })
      }
      const queAvanzan = aprobadosCliente.filter((c: Candidate) => {
        const idPost = (c as any).id_postulacion
        return idPost != null && idPostulacionesAvanza.has(idPost)
      })
      setCandidates(queAvanzan)
      const next: Record<string, ExamenItem[]> = {}
      queAvanzan.forEach((c: Candidate) => {
        const id = String((c as any).id_candidato ?? (c as any).id ?? c)
        next[id] = []
      })
      const res = await examenMedicoService.getBySolicitud(idSolicitud)
      if (res.success && res.data && Array.isArray(res.data)) {
        res.data.forEach((ex: any) => {
          const idPostulacion = ex.id_postulacion
          const cand = queAvanzan.find((c: Candidate) => (c as any).id_postulacion === idPostulacion)
          if (cand) {
            const id = String((cand as any).id_candidato ?? (cand as any).id ?? cand)
            if (!next[id]) next[id] = []
            next[id].push({
              id: `db-${ex.id_examen_medico}`,
              id_examen_medico: ex.id_examen_medico,
              nombre: ex.nombre_documento || "",
              detalle: ex.detalle ?? "",
              file: null,
              estado: (ex.estado_aprobacion || "pendiente") as ExamenItem["estado"],
            })
          }
        })
      }
      setExamenesPorCandidato(next)
      setRefreshExamenesKey((k) => k + 1)
    } catch (e) {
      console.error(e)
      toast.error("Error al cargar candidatos")
    } finally {
      if (!skipLoadingSpinner) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [process.id])

  const getNombreCandidato = (c: Candidate) => {
    return (c.name || [((c as any).firstName), (c as any).lastName, (c as any).nombre, (c as any).apellido].filter(Boolean).join(" ")).trim() || "Candidato"
  }

  const addExamen = (candidatoId: string) => {
    setExamenesPorCandidato((prev) => ({
      ...prev,
      [candidatoId]: [...(prev[candidatoId] || []), { id: generateId(), nombre: "", detalle: "", file: null, estado: "pendiente" }],
    }))
  }

  const removeExamen = (candidatoId: string, examenId: string) => {
    setExamenesPorCandidato((prev) => ({
      ...prev,
      [candidatoId]: (prev[candidatoId] || []).filter((e) => e.id !== examenId),
    }))
  }

  const updateExamen = (candidatoId: string, examenId: string, field: keyof ExamenItem, value: string | File | null) => {
    setExamenesPorCandidato((prev) => {
      const list = prev[candidatoId] || []
      return {
        ...prev,
        [candidatoId]: list.map((e) => (e.id === examenId ? { ...e, [field]: value } : e)),
      }
    })
  }

  const handleFileSelect = (candidatoId: string, examenId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_EXAM_TYPES.includes(file.type)) {
      toast.error("Formato no válido. Use PDF o imagen (JPG, PNG, WebP, GIF).")
      return
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`El archivo no puede superar ${MAX_FILE_SIZE_MB} MB.`)
      return
    }
    updateExamen(candidatoId, examenId, "file", file)
    updateExamen(candidatoId, examenId, "nombre", file.name)
    e.target.value = ""
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(",")[1] || "")
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleGuardarExamen = async (candidatoId: string, ex: ExamenItem) => {
    const cand = candidates.find((c) => String((c as any).id_candidato ?? (c as any).id ?? c) === candidatoId)
    const idPostulacion = cand != null ? (cand as any).id_postulacion : null
    const idSolicitud = Number(process.id)
    if (idPostulacion == null) {
      toast.error("No se pudo identificar la postulación")
      return false
    }
    try {
      if (ex.id_examen_medico != null) {
        const payload: { nombre_documento?: string; documento_archivo_base64?: string; estado_aprobacion?: string; detalle?: string | null } = {
          nombre_documento: ex.nombre || undefined,
          estado_aprobacion: ex.estado,
          detalle: ex.detalle ?? null,
        }
        if (ex.file) payload.documento_archivo_base64 = await fileToBase64(ex.file)
        const res = await examenMedicoService.update(ex.id_examen_medico, payload)
        if (!res.success) {
          toast.error(res.message || "Error al actualizar")
          return false
        }
        // Actualizar solo el examen en memoria (estado, nombre, detalle, archivo) para refrescar el colapsable
        setExamenesPorCandidato((prev) => ({
          ...prev,
          [candidatoId]: (prev[candidatoId] || []).map((e) =>
            e.id === ex.id
              ? {
                  ...e,
                  nombre: ex.nombre,
                  detalle: ex.detalle,
                  estado: ex.estado,
                  file: ex.file || e.file,
                }
              : e
          ),
        }))
        toast.success("Examen actualizado")
        return true
      } else {
        let base64: string | null = null
        if (ex.file) base64 = await fileToBase64(ex.file)
        const res = await examenMedicoService.create({
          id_postulacion: idPostulacion,
          id_solicitud: idSolicitud,
          nombre_documento: ex.nombre || null,
          documento_archivo_base64: base64,
          estado_aprobacion: ex.estado,
          detalle: ex.detalle ?? null,
        })
        if (!res.success) {
          toast.error(res.message || "Error al guardar")
          return false
        }
        const created = res.data as any
        setExamenesPorCandidato((prev) => ({
          ...prev,
          [candidatoId]: (prev[candidatoId] || []).map((e) =>
            e.id === ex.id ? { ...e, id: `db-${created.id_examen_medico}`, id_examen_medico: created.id_examen_medico, detalle: ex.detalle, file: null } : e
          ),
        }))
        toast.success("Examen guardado")
        return true
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al guardar en la base de datos")
      return false
    }
  }

  const handleRemoveExamen = async (candidatoId: string, ex: ExamenItem) => {
    if (ex.id_examen_medico != null) {
      try {
        const res = await examenMedicoService.delete(ex.id_examen_medico)
        if (!res.success) {
          toast.error(res.message || "Error al eliminar")
          return
        }
      } catch (e) {
        console.error(e)
        toast.error("Error al eliminar")
        return
      }
    }
    removeExamen(candidatoId, ex.id)
    toast.success("Examen eliminado")
  }

  const handleVerDocumento = async (ex: ExamenItem, candidatoId: string) => {
    if (ex.file) {
      setViewingDocument({ file: ex.file, title: ex.nombre || ex.file.name })
      return
    }
    if (ex.id_examen_medico == null) return
    try {
      const res = await examenMedicoService.getById(ex.id_examen_medico)
      if (!res.success || !res.data) {
        toast.error("No se pudo cargar el documento")
        return
      }
      const data = res.data as any
      let b64 = data.documento_archivo_base64
      if (!b64) {
        toast.error("No hay documento guardado")
        return
      }
      if (typeof b64 === "string" && b64.includes("base64,")) b64 = b64.replace(/^data:[^;]+;base64,/, "")
      const binary = atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: "application/octet-stream" })
      const ext = (ex.nombre || "").split(".").pop()?.toLowerCase() || "pdf"
      const mime = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "application/octet-stream"
      const file = new File([blob], ex.nombre || "documento", { type: mime })
      setViewingDocument({ file, title: ex.nombre || "Documento" })
    } catch (e) {
      console.error(e)
      toast.error("Error al cargar el documento")
    }
  }

  const openAddDialog = (candidatoId: string) => {
    setAddDialogCandidatoId(candidatoId)
    setAddFormNombre("")
    setAddFormDetalle("")
    setAddFormFile(null)
    setAddFormEstado("pendiente")
    if (addFormFileInputRef.current) addFormFileInputRef.current.value = ""
    setShowAddDialog(true)
  }

  const closeAddDialog = () => {
    setShowAddDialog(false)
    setAddDialogCandidatoId(null)
    setAddFormNombre("")
    setAddFormDetalle("")
    setAddFormFile(null)
    setAddFormEstado("pendiente")
    if (addFormFileInputRef.current) addFormFileInputRef.current.value = ""
  }

  const handleGuardarDesdeDialog = async () => {
    if (!addDialogCandidatoId) return
    const cand = candidates.find((c) => String((c as any).id_candidato ?? (c as any).id ?? c) === addDialogCandidatoId)
    const idPostulacion = cand != null ? (cand as any).id_postulacion : null
    const idSolicitud = Number(process.id)
    if (idPostulacion == null) {
      toast.error("No se pudo identificar la postulación")
      return
    }
    const nombre = addFormNombre.trim() || (addFormFile?.name ?? "Examen médico")
    if (addFormFile && addFormFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`El archivo no puede superar ${MAX_FILE_SIZE_MB} MB.`)
      return
    }
    setIsSavingAdd(true)
    try {
      const base64 = addFormFile ? await fileToBase64(addFormFile) : undefined
      const res = await examenMedicoService.create({
        id_postulacion: idPostulacion,
        id_solicitud: idSolicitud,
        nombre_documento: nombre,
        documento_archivo_base64: base64 ?? null,
        estado_aprobacion: addFormEstado,
        detalle: addFormDetalle.trim() || null,
      })
      if (!res.success) {
        toast.error(res.message || "Error al guardar")
        return
      }
      const created = res.data as any
      const newItem: ExamenItem = {
        id: `db-${created.id_examen_medico}`,
        id_examen_medico: created.id_examen_medico,
        nombre,
        detalle: addFormDetalle.trim() || undefined,
        estado: addFormEstado,
        file: null,
      }
      // Agregar el nuevo examen solo en el colapsable del candidato correspondiente
      setExamenesPorCandidato((prev) => ({
        ...prev,
        [addDialogCandidatoId]: [...(prev[addDialogCandidatoId] || []), newItem],
      }))
      toast.success("Examen agregado")
      closeAddDialog()
    } catch (e) {
      console.error(e)
      toast.error("Error al guardar en la base de datos")
    } finally {
      closeAddDialog()
      setIsSavingAdd(false)
    }
  }

  const openAjustes = (candidatoId: string, ex: ExamenItem) => {
    setAjustesCandidatoId(candidatoId)
    setAjustesExamen(ex)
    setAjustesNombre(ex.nombre || "")
    setAjustesDetalle(ex.detalle ?? "")
    setAjustesFile(ex.file || null)
    setAjustesEstado(ex.estado)
    if (ajustesFileInputRef.current) ajustesFileInputRef.current.value = ""
    setShowAjustesDialog(true)
  }

  const closeAjustesDialog = () => {
    setShowAjustesDialog(false)
    setAjustesExamen(null)
    setAjustesCandidatoId(null)
    setAjustesNombre("")
    setAjustesDetalle("")
    setAjustesFile(null)
    setAjustesEstado("pendiente")
    if (ajustesFileInputRef.current) ajustesFileInputRef.current.value = ""
  }

  const handleGuardarAjustes = async () => {
    if (!ajustesCandidatoId || !ajustesExamen) return
    setIsSavingAjustes(true)
    try {
      const ex: ExamenItem = {
        ...ajustesExamen,
        nombre: ajustesNombre.trim() || ajustesExamen.nombre,
        detalle: ajustesDetalle.trim() || undefined,
        estado: ajustesEstado,
        file: ajustesFile || ajustesExamen.file,
      }
      const ok = await handleGuardarExamen(ajustesCandidatoId, ex)
    } finally {
      closeAjustesDialog()
      setIsSavingAjustes(false)
    }
  }

  const handleEliminarAjustes = async () => {
    if (!ajustesCandidatoId || !ajustesExamen) return
    await handleRemoveExamen(ajustesCandidatoId, ajustesExamen)
    closeAjustesDialog()
  }

  const isSCAcotado = (process as any).service_type === "CA" || (process as any).tipo_servicio === "CA"

  const handleAdvanceToModulo4 = async () => {
    try {
      setIsAdvancing(true)
      const etapasRes = await solicitudService.getEtapas()
      if (!etapasRes.success || !etapasRes.data) {
        toast.error("No se pudieron cargar las etapas")
        return
      }
      const etapa = (etapasRes.data as { id: number; nombre: string }[]).find(
        (e) => e.nombre === "Módulo 4: Evaluación Psicolaboral"
      )
      if (!etapa) {
        toast.error("Etapa 'Módulo 4: Evaluación Psicolaboral' no encontrada")
        return
      }
      const res = await solicitudService.cambiarEtapa(Number(process.id), etapa.id)
      if (res.success) {
        toast.success("Proceso avanzado a Evaluación Psicolaboral")
        onAdvance?.()
        const url = new URL(window.location.href)
        url.searchParams.set("tab", "modulo-4")
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

  const handleAdvanceToModulo5 = async () => {
    try {
      setIsAdvancing(true)
      const etapasRes = await solicitudService.getEtapas()
      if (!etapasRes.success || !etapasRes.data) {
        toast.error("No se pudieron cargar las etapas")
        return
      }
      const etapa = (etapasRes.data as { id: number; nombre: string }[]).find(
        (e) => e.nombre === "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"
      )
      if (!etapa) {
        toast.error("Etapa 'Módulo 5' no encontrada")
        return
      }
      const res = await solicitudService.cambiarEtapa(Number(process.id), etapa.id)
      if (res.success) {
        toast.success("Proceso avanzado a Cierre (Módulo 5)")
        onAdvance?.()
        const url = new URL(window.location.href)
        url.searchParams.set("tab", "modulo-5")
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

  const isInModulo4OrLater = (process as any).etapa && ["Módulo 4: Evaluación Psicolaboral", "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"].includes((process as any).etapa)
  const isInModulo5OrLater = (process as any).etapa === "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"

  // Si algún candidato tiene al menos un examen con estado "rechazado", no se puede avanzar a Módulo 4
  const hasAlgunExamenRechazado = candidates.some((c) => {
    const id = String((c as any).id_candidato ?? (c as any).id ?? c)
    const examenes = examenesPorCandidato[id] || []
    return examenes.some((ex) => ex.estado === "rechazado")
  })

  // CA: al menos un examen debe estar aprobado (y guardado) para poder avanzar a Módulo 5
  const hasAlMenosUnExamenAprobado = isSCAcotado && Object.values(examenesPorCandidato).some((list) =>
    list.some((ex) => ex.estado === "aprobado")
  )

  const estadoColor = (estado: string) => {
    if (estado === "aprobado") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    if (estado === "rechazado") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Módulo Exámenes Médicos</h2>
          <p className="text-muted-foreground">Carga de documentos y control de aprobación</p>
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
        <h2 className="text-2xl font-bold mb-2">Módulo Exámenes Médicos</h2>
        <p className="text-muted-foreground">
          Carga de documentos (PDF o fotografías de exámenes), registro de aprobación/rechazo y control de avance al siguiente módulo.
        </p>
      </div>

      {/* Cuadro azul "Avanzar al siguiente módulo" siempre visible (igual que Módulo 2) */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">Avanzar al siguiente módulo</h3>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                {hasAlgunExamenRechazado
                  ? "No se puede avanzar: hay candidatos con al menos un examen en estado rechazado. Todos los exámenes deben estar aprobados o pendientes."
                  : isSCAcotado && !hasAlMenosUnExamenAprobado
                    ? "Para avanzar a Módulo 5, aprueba al menos un examen por candidato y guarda los cambios (botón Guardar en cada examen)."
                    : isSCAcotado
                      ? "Pasa el proceso a Cierre (Módulo 5)."
                      : "Pasa el proceso a Evaluación Psicolaboral (Módulo 4)."}
              </p>
            </div>
            <Button
              onClick={isSCAcotado ? handleAdvanceToModulo5 : handleAdvanceToModulo4}
              disabled={readOnly || isAdvancing || (isSCAcotado ? isInModulo5OrLater : isInModulo4OrLater) || hasAlgunExamenRechazado || (isSCAcotado && !hasAlMenosUnExamenAprobado)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isAdvancing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSCAcotado ? "Avanzar a Módulo 5" : "Avanzar a Módulo 4"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exámenes por candidato
          </CardTitle>
          <CardDescription>
            Haz clic en el candidato para expandir. Agrega exámenes hacia abajo con nombre y archivo (PDF o imagen). Misma lógica que el CV del candidato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-muted-foreground py-4">No hay candidatos en esta etapa. Avanza desde Entrevista Técnica.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Candidato</TableHead>
                  <TableHead>Exámenes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody key={refreshExamenesKey}>
                {candidates.map((c) => {
                  const id = String((c as any).id_candidato ?? (c as any).id ?? c)
                  const nombre = getNombreCandidato(c)
                  const examenes = examenesPorCandidato[id] || []
                  const isExpanded = expandedCandidatoId === id
                  return (
                    <React.Fragment key={id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedCandidatoId(isExpanded ? null : id)}
                      >
                        <TableCell className="w-10">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {nombre}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {examenes.length === 0 ? "Sin exámenes" : `${examenes.length} examen(es)`}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${id}-detail`} className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={3} className="p-4">
                            <div className="space-y-4">
                              <div className="rounded-lg border bg-background p-4 space-y-3">
                                <h4 className="font-medium text-sm">Exámenes de {nombre}</h4>
                                {examenes.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Aún no hay exámenes. Agrega uno abajo.</p>
                                ) : (
                                  <div className="space-y-3">
                                    {examenes.map((ex) => (
                                      <div
                                        key={ex.id}
                                        className="border rounded-lg p-4 bg-background space-y-3"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 space-y-2">
                                            <div>
                                              <p className="text-xs text-muted-foreground mb-1">Nombre del Examen</p>
                                              <p className="font-medium text-sm">
                                                {ex.nombre || "Sin nombre"}
                                              </p>
                                            </div>
                                            {ex.detalle && (
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">Detalle</p>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                                                  {ex.detalle}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <div>
                                              <p className="text-xs text-muted-foreground mb-1 text-right">Estado</p>
                                              <Badge className={estadoColor(ex.estado)}>
                                                {ex.estado === "aprobado" ? "Aprobado" : ex.estado === "rechazado" ? "Rechazado" : "Pendiente"}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 pt-2 border-t">
                                          {(ex.file || ex.id_examen_medico) && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleVerDocumento(ex, id)
                                              }}
                                              className="gap-1"
                                            >
                                              <Eye className="h-3 w-3" />
                                              Ver documento
                                            </Button>
                                          )}
                                          {!readOnly && (
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                openAjustes(id, ex)
                                              }}
                                              className="gap-1"
                                            >
                                              <Settings className="h-3 w-3" />
                                              Editar
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {!readOnly && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openAddDialog(id)
                                    }}
                                    className="gap-1 mt-2"
                                  >
                                    <Plus className="h-4 w-4" />
                                    Agregar examen
                                  </Button>
                                )}
                              </div>
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

      {viewingDocument && (
        <DocumentViewerDialog
          file={viewingDocument.file}
          title={viewingDocument.title}
          isOpen={!!viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}

      <Dialog open={showAddDialog} onOpenChange={(open) => !open && closeAddDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar examen médico</DialogTitle>
            <DialogDescription>
              Ingrese los datos del examen y adjunte el documento (PDF o imagen).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-nombre">Nombre del examen</Label>
              <Input
                id="add-nombre"
                value={addFormNombre}
                onChange={(e) => setAddFormNombre(e.target.value)}
                placeholder="Ej: Hemograma, Radiografía"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-detalle">Detalle</Label>
              <Textarea
                id="add-detalle"
                value={addFormDetalle}
                onChange={(e) => setAddFormDetalle(e.target.value)}
                placeholder="Descripción o detalle del documento (opcional)"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-archivo">Archivo (PDF o imagen, opcional)</Label>
              <Input
                id="add-archivo"
                type="file"
                ref={addFormFileInputRef}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setAddFormFile(f || null)
                  if (f && !addFormNombre.trim()) setAddFormNombre(f.name)
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-estado">Estado</Label>
              <Select value={addFormEstado} onValueChange={(v: ExamenItem["estado"]) => setAddFormEstado(v)}>
                <SelectTrigger id="add-estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeAddDialog} disabled={isSavingAdd}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGuardarDesdeDialog} disabled={isSavingAdd}>
              {isSavingAdd && <Loader2 className="mr-2 h-4 w-3 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAjustesDialog} onOpenChange={(open) => !open && closeAjustesDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustes de examen médico</DialogTitle>
            <DialogDescription>
              Modifica nombre, documento o estado del examen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ajustes-nombre">Nombre del examen</Label>
              <Input
                id="ajustes-nombre"
                value={ajustesNombre}
                onChange={(e) => setAjustesNombre(e.target.value)}
                placeholder="Ej: Hemograma, Radiografía"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ajustes-detalle">Detalle</Label>
              <Textarea
                id="ajustes-detalle"
                value={ajustesDetalle}
                onChange={(e) => setAjustesDetalle(e.target.value)}
                placeholder="Descripción o detalle del documento (opcional)"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ajustes-archivo">Documento (PDF o imagen)</Label>
              <Input
                id="ajustes-archivo"
                type="file"
                ref={ajustesFileInputRef}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setAjustesFile(f || null)
                  if (f && !ajustesNombre.trim()) setAjustesNombre(f.name)
                }}
              />
              <p className="text-xs text-muted-foreground">Dejar vacío para mantener el documento actual.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ajustes-estado">Estado</Label>
              <Select value={ajustesEstado} onValueChange={(v: ExamenItem["estado"]) => setAjustesEstado(v)}>
                <SelectTrigger id="ajustes-estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleEliminarAjustes}
              disabled={isSavingAjustes}
            >
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={closeAjustesDialog} disabled={isSavingAjustes}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => handleGuardarAjustes()} disabled={isSavingAjustes}>
                {isSavingAjustes && <Loader2 className="mr-2 h-4 w-3 animate-spin" />}
                Guardar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
