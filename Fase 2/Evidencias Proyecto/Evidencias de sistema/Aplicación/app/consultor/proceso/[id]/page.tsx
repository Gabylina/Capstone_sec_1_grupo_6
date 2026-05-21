"use client"

import { use, useState, useEffect } from "react"
import { useAuth } from "@/hooks/auth"
import { solicitudService, descripcionCargoService, getCandidatesByProcess, copiarPlantillasASolicitud } from "@/lib/api"
import { getHitosBySolicitud } from "@/lib/api-hitos"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, getStatusColor } from "@/lib/utils"
import { Building2, User, Calendar, Target, FileText, Users, CheckCircle, Clock, AlertTriangle, Loader2, Globe, X, ArrowLeft } from "lucide-react"
import { ProcessTimeline } from "@/components/consultor/process-timeline"
import { ProcessModule1 } from "@/components/consultor/process-module-1"
import { ProcessModule2 } from "@/components/consultor/process-module-2"
import { ProcessModule3 } from "@/components/consultor/process-module-3"
import { ProcessModule4 } from "@/components/consultor/process-module-4"
import { ProcessModule5 } from "@/components/consultor/process-module-5"
import { ProcessModuleEntrevistaTecnica } from "@/components/consultor/process-module-entrevista-tecnica"
import { ProcessModuleExamenesMedicos } from "@/components/consultor/process-module-examenes-medicos"
import { notFound, useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Hito } from "@/lib/types"
import { Button } from "@/components/ui/button"

import { serviceTypeLabels, processStatusLabels } from "@/lib/utils"

interface ProcessPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default function ProcessPage({ params }: ProcessPageProps) {
  const { id } = use(
    params instanceof Promise ? params : Promise.resolve(params as { id: string })
  )
  const searchParams = useSearchParams()
  const router = useRouter()
  const viewOnly = searchParams.get("viewOnly") === "1" || searchParams.get("viewOnly") === "true"
  const coordinadorMode = searchParams.get("coordinador") === "1"
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("modulo-1")
  const [process, setProcess] = useState<any>(null)
  const [descripcionCargo, setDescripcionCargo] = useState<any>(null)
  const [hitos, setHitos] = useState<Hito[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasCandidatesWithReportStatus, setHasCandidatesWithReportStatus] = useState(false)
  const [firstCandidateName, setFirstCandidateName] = useState<string | null>(null)

  // Función para determinar el módulo activo basado en la etapa
  const getModuleFromStage = (etapa: string | null | undefined, serviceType: string | null | undefined): string => {
    if (!etapa || etapa === 'Sin etapa') {
      return 'modulo-1'
    }

    // San Cristobal Completo (SC) y San Cristóbal Acotado (CA): etapas propias entre M3 y M4/M5
    if (etapa === 'Módulo Entrevista Técnica' && (serviceType === 'SC' || serviceType === 'CA')) {
      return 'modulo-entrevista-tecnica'
    }
    if (etapa === 'Módulo Exámenes Médicos' && (serviceType === 'SC' || serviceType === 'CA')) {
      return 'modulo-examenes-medicos'
    }

    // Mapeo de etapas a módulos según el tipo de servicio
    if (etapa === 'Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral') {
      // PC, SC y CA tienen módulo 5 (cierre)
      if (serviceType === 'PC' || serviceType === 'SC' || serviceType === 'CA') {
        return 'modulo-5'
      }
      // Si no es PC, no debería estar en módulo 5, pero por seguridad:
      // TS y ES tienen módulo 4, LL y HH tienen módulo 3
      if (serviceType === 'TS' || serviceType === 'ES') {
        return 'modulo-4'
      }
      if (serviceType === 'LL' || serviceType === 'HH') {
        return 'modulo-3'
      }
      return 'modulo-1'
    }

    if (etapa === 'Módulo 4: Evaluación Psicolaboral') {
      // PC, SC, TS y ES tienen módulo 4 (CA no tiene M4)
      if (serviceType === 'PC' || serviceType === 'SC' || serviceType === 'TS' || serviceType === 'ES') {
        return 'modulo-4'
      }
      // LL y HH no tienen módulo 4, mostrar módulo 3 como máximo
      if (serviceType === 'LL' || serviceType === 'HH') {
        return 'modulo-3'
      }
      return 'modulo-1'
    }

    if (etapa === 'Módulo 3: Presentación de Candidatos') {
      // PC, SC, CA, LL y HH tienen módulo 3
      if (serviceType === 'PC' || serviceType === 'SC' || serviceType === 'CA' || serviceType === 'LL' || serviceType === 'HH') {
        return 'modulo-3'
      }
      // TS y ES no tienen módulo 3 (esto sería un error de datos)
      // Mostrar el módulo más alto disponible para ese servicio
      if (serviceType === 'TS' || serviceType === 'ES') {
        return 'modulo-4' // TS y ES tienen módulo 4
      }
      return 'modulo-1'
    }

    if (etapa === 'Módulo 2: Publicación y Registro de Candidatos') {
      // PC, SC, CA, LL, HH y PP tienen módulo 2
      if (serviceType === 'PC' || serviceType === 'SC' || serviceType === 'CA' || serviceType === 'LL' || serviceType === 'HH' || serviceType === 'PP') {
        return 'modulo-2'
      }
      // TS y ES no tienen módulo 2 (esto sería un error de datos)
      // Mostrar el módulo más alto disponible para ese servicio
      if (serviceType === 'TS' || serviceType === 'ES') {
        return 'modulo-4' // TS y ES tienen módulo 4
      }
      return 'modulo-1'
    }

    // Por defecto, módulo 1
    return 'modulo-1'
  }

  useEffect(() => {
    if (user?.id) {
      loadProcessData()
    }
  }, [id, user])

  // Establecer módulo activo basado en la etapa o parámetro tab de la URL cuando se carga el proceso
  useEffect(() => {
    if (process && !isLoading) {
      const urlParams = new URLSearchParams(window.location.search)
      const tabFromUrl = urlParams.get('tab')
      
      // Si hay parámetro tab en la URL, usarlo (tiene prioridad)
      const coordinadorFromUrl = urlParams.get('coordinador') === '1'
      if (coordinadorFromUrl) {
        setActiveTab('modulo-2')
      } else if (tabFromUrl && ['modulo-1', 'modulo-2', 'modulo-3', 'modulo-4', 'modulo-5', 'modulo-entrevista-tecnica', 'modulo-examenes-medicos', 'timeline'].includes(tabFromUrl)) {
        setActiveTab(tabFromUrl)
      } else {
        // Si no hay parámetro tab, determinar el módulo basado en la etapa
        const moduleFromStage = getModuleFromStage(process.etapa, process.tipo_servicio || process.service_type)
        setActiveTab(moduleFromStage)
      }
    }
  }, [process, isLoading])

  // Recargar verificación de candidatos con estado de informe cuando cambie el proceso o el tab activo
  useEffect(() => {
    if (process && !isLoading) {
      const serviceType = process.tipo_servicio || process.service_type
      const currentStage = process.etapa || process.stage
      if (serviceType === "PC" && currentStage === "Módulo 4: Evaluación Psicolaboral") {
        checkCandidatesWithReportStatus(parseInt(id))
      } else {
        setHasCandidatesWithReportStatus(false)
      }
    }
  }, [process, activeTab, isLoading, id])

  const loadProcessData = async () => {
    try {
      setIsLoading(true)
      setFirstCandidateName(null)

      // Validar que el ID sea un número válido
      const processId = parseInt(id)
      if (isNaN(processId)) {
        console.error('ID de proceso inválido:', id)
        toast.error("El proceso solicitado no es válido. Por favor verifica la URL e intenta nuevamente.")
        notFound()
        return
      }
      
      const response = await solicitudService.getById(processId)
      
      if (response.success && response.data) {
        setProcess(response.data)
        
        // Cargar descripción de cargo si existe
        if (response.data.id_descripcion_cargo) {
          const dcResponse = await descripcionCargoService.getById(response.data.id_descripcion_cargo)
          if (dcResponse.success) {
            setDescripcionCargo(dcResponse.data)
          }
        }

        // Cargar hitos del proceso (línea de tiempo)
        let hitosData = await getHitosBySolicitud(processId)
        // Si no hay hitos, intentar generarlos desde plantillas (procesos antiguos o sin hitos)
        if (hitosData.length === 0 && response.data.codigo_servicio) {
          try {
            const copyRes = await copiarPlantillasASolicitud(processId)
            if (copyRes.success) {
              hitosData = await getHitosBySolicitud(processId)
            }
          } catch {
            // Si falla (ej. sin plantillas para el servicio), se mantiene lista vacía
          }
        }
        const serviceTypeForHitos = response.data.tipo_servicio || response.data.service_type
        const mapHitosToFrontend = (data: typeof hitosData): Hito[] =>
          data.map((hito: any) => {
            let status: Hito['status'] = 'pendiente'
            if (hito.fecha_cumplimiento) status = 'completado'
            else if (serviceTypeForHitos === 'SC') {
              // San Cristóbal: no usar vencido (plazos no son fijos), solo en progreso o pendiente
              status = hito.fecha_base ? 'en_progreso' : 'pendiente'
            } else if (hito.estado === 'vencido' || (hito.fecha_limite && new Date(hito.fecha_limite) < new Date())) status = 'vencido'
            else if (hito.fecha_base && hito.fecha_limite) status = 'en_progreso'
            return {
              id: hito.id_hito_solicitud.toString(),
              process_id: processId.toString(),
              name: hito.nombre_hito,
              description: hito.descripcion || '',
              start_trigger: hito.tipo_ancla || '',
              duration_days: hito.duracion_dias || 0,
              anticipation_days: hito.avisar_antes_dias || 0,
              status,
              start_date: hito.fecha_base ? new Date(hito.fecha_base).toISOString() : undefined,
              due_date: hito.fecha_limite ? new Date(hito.fecha_limite).toISOString() : undefined,
              completed_date: hito.fecha_cumplimiento ? new Date(hito.fecha_cumplimiento).toISOString() : undefined,
            }
          })
        setHitos(mapHitosToFrontend(hitosData))

        // Verificar si hay candidatos con estado de informe definido (solo para procesos PC)
        const serviceType = response.data.tipo_servicio || response.data.service_type
        const currentStage = response.data.etapa || response.data.stage
        if (serviceType === "PC" && currentStage === "Módulo 4: Evaluación Psicolaboral") {
          await checkCandidatesWithReportStatus(processId)
        } else {
          setHasCandidatesWithReportStatus(false)
        }

        // Primer candidato (por fecha) para mostrar en el encabezado: Nombre Apellido - Cargo
        const candidates = await getCandidatesByProcess(String(processId))
        if (candidates && candidates.length > 0) {
          const sorted = [...candidates].sort((a: any, b: any) => {
            const dateA = a.fecha_postulacion || a.created_at || a.fecha_creacion || 0
            const dateB = b.fecha_postulacion || b.created_at || b.fecha_creacion || 0
            return new Date(dateA).getTime() - new Date(dateB).getTime()
          })
          const first = sorted[0]
          const nombre = first.nombre || first.nombre_candidato || ""
          const apellido = first.primer_apellido || first.primer_apellido_candidato || ""
          const fullName = [nombre, apellido].filter(Boolean).join(" ").trim()
          setFirstCandidateName(fullName || null)
        } else {
          setFirstCandidateName(null)
        }
      } else {
        toast.error("No se pudo cargar la información del proceso. Por favor recarga la página.")
        notFound()
      }
    } catch (error) {
      console.error("Error loading process:", error)
      toast.error("No se pudieron cargar los datos del proceso. Por favor recarga la página.")
    } finally {
      setIsLoading(false)
    }
  }

  const checkCandidatesWithReportStatus = async (processId: number) => {
    try {
      // Obtener candidatos del proceso
      const { postulacionService, evaluacionPsicolaboralService } = await import('@/lib/api')
      const candidatesResponse = await postulacionService.getBySolicitudOptimized(processId)
      const allCandidates = candidatesResponse.data || []
      
      // Filtrar solo candidatos aprobados por el cliente (para procesos PC)
      const candidatesToCheck = allCandidates.filter((c: any) => c.client_response === "aprobado")
      
      if (candidatesToCheck.length === 0) {
        setHasCandidatesWithReportStatus(false)
        return
      }

      // Verificar si hay al menos un candidato con estado de informe definido
      let hasReportStatus = false
      for (const candidate of candidatesToCheck) {
        try {
          const evaluationResponse = await evaluacionPsicolaboralService.getByPostulacion(Number(candidate.id_postulacion))
          const evaluation = evaluationResponse.data?.[0]
          
          if (evaluation && evaluation.estado_informe) {
            const estadoInforme = evaluation.estado_informe
            // Solo avanzan los que tienen estado: Recomendable, No recomendable, o Recomendable con observaciones
            if (estadoInforme === "Recomendable" || 
                estadoInforme === "No recomendable" || 
                estadoInforme === "Recomendable con observaciones") {
              hasReportStatus = true
              break
            }
          }
        } catch (error) {
          console.error(`Error al verificar evaluación para candidato ${candidate.id}:`, error)
        }
      }
      
      setHasCandidatesWithReportStatus(hasReportStatus)
    } catch (error) {
      console.error("Error al verificar candidatos con estado de informe:", error)
      setHasCandidatesWithReportStatus(false)
    }
  }

  const isClienteViewOnly = user?.role === "cliente" && viewOnly

  // Permitir consultor, admin (viewOnly/coordinador) o cliente (viewOnly)
  if (user?.role !== "consultor" && !viewOnly && !coordinadorMode && !isClienteViewOnly) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando proceso...</p>
        </div>
      </div>
    )
  }

  if (!process) {
    notFound()
  }

  // Determine which modules are available based on service type and current stage
  const getAvailableModules = () => {
    const modules = []
    const serviceType = process.tipo_servicio || process.service_type
    const currentStage = process.etapa || process.stage

    // Módulo 1 - Siempre disponible
    modules.push({ 
      id: "modulo-1", 
      label: "Solicitud y Cargo", 
      icon: FileText, 
      enabled: true,
      isActive: activeTab === "modulo-1"
    })


    // Módulo 2 - Disponible si se ha avanzado al Módulo 2 o posterior
    const module2Enabled = currentStage === "Módulo 2: Publicación y Registro de Candidatos" || 
                           currentStage === "Módulo 3: Presentación de Candidatos" ||
                           currentStage === "Módulo 4: Evaluación Psicolaboral" ||
                           currentStage === "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"
    
    // PP solo tiene módulo 1 y 2 (publicaciones, sin candidatos)
    if (serviceType === "PP") {
      modules.push({ 
        id: "modulo-2", 
        label: "Publicación en Portales", 
        icon: Globe, 
        enabled: module2Enabled,
        isActive: activeTab === "modulo-2"
      })
    } else if (serviceType === "SC") {
      // San Cristobal Completo: M2, M3, Entrevista Técnica, Exámenes Médicos, M4, M5
      const scStagesAfterM2 = ["Módulo 3: Presentación de Candidatos", "Módulo Entrevista Técnica", "Módulo Exámenes Médicos", "Módulo 4: Evaluación Psicolaboral", "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"]
      const scStagesAfterM3 = ["Módulo Entrevista Técnica", "Módulo Exámenes Médicos", "Módulo 4: Evaluación Psicolaboral", "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"]
      const scStagesAfterEntrevista = ["Módulo Exámenes Médicos", "Módulo 4: Evaluación Psicolaboral", "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"]
      const scStagesAfterExamenes = ["Módulo 4: Evaluación Psicolaboral", "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"]
      modules.push({ id: "modulo-2", label: "Gestión de Candidatos", icon: Users, enabled: module2Enabled || scStagesAfterM2.includes(currentStage), isActive: activeTab === "modulo-2" })
      modules.push({ id: "modulo-3", label: "Presentación de Candidatos", icon: Target, enabled: scStagesAfterM3.includes(currentStage), isActive: activeTab === "modulo-3" })
      modules.push({ id: "modulo-entrevista-tecnica", label: "Entrevista Técnica", icon: Calendar, enabled: currentStage === "Módulo Entrevista Técnica" || scStagesAfterEntrevista.includes(currentStage), isActive: activeTab === "modulo-entrevista-tecnica" })
      modules.push({ id: "modulo-examenes-medicos", label: "Exámenes Médicos", icon: FileText, enabled: currentStage === "Módulo Exámenes Médicos" || scStagesAfterExamenes.includes(currentStage), isActive: activeTab === "modulo-examenes-medicos" })
    } else if (serviceType === "CA") {
      // San Cristóbal Acotado (CA): M2, M3, Entrevista Técnica, Exámenes Médicos, M5 (sin M4)
      const caStagesAfterM2 = ["Módulo 3: Presentación de Candidatos", "Módulo Entrevista Técnica", "Módulo Exámenes Médicos", "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"]
      const caStagesAfterM3 = ["Módulo Entrevista Técnica", "Módulo Exámenes Médicos", "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"]
      const caStagesAfterEntrevista = ["Módulo Exámenes Médicos", "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"]
      const caStagesAfterExamenes = ["Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"]
      modules.push({ id: "modulo-2", label: "Gestión de Candidatos", icon: Users, enabled: module2Enabled || caStagesAfterM2.includes(currentStage), isActive: activeTab === "modulo-2" })
      modules.push({ id: "modulo-3", label: "Presentación de Candidatos", icon: Target, enabled: caStagesAfterM3.includes(currentStage), isActive: activeTab === "modulo-3" })
      modules.push({ id: "modulo-entrevista-tecnica", label: "Entrevista Técnica", icon: Calendar, enabled: currentStage === "Módulo Entrevista Técnica" || caStagesAfterEntrevista.includes(currentStage), isActive: activeTab === "modulo-entrevista-tecnica" })
      modules.push({ id: "modulo-examenes-medicos", label: "Exámenes Médicos", icon: FileText, enabled: currentStage === "Módulo Exámenes Médicos" || caStagesAfterExamenes.includes(currentStage), isActive: activeTab === "modulo-examenes-medicos" })
    } else if (serviceType === "PC" || serviceType === "LL" || serviceType === "FI" || serviceType === "HH") {
      modules.push({ 
        id: "modulo-2", 
        label: "Publicación y Registro de Candidatos", 
        icon: Users, 
        enabled: module2Enabled,
        isActive: activeTab === "modulo-2"
      })
      modules.push({ 
        id: "modulo-3", 
        label: "Presentación de Candidatos", 
        icon: Target, 
        enabled: currentStage === "Módulo 3: Presentación de Candidatos" || 
                  currentStage === "Módulo 4: Evaluación Psicolaboral" ||
                  currentStage === "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral",
        isActive: activeTab === "modulo-3"
      })
    }

    if (serviceType === "PC" || serviceType === "SC" || serviceType === "TS" || serviceType === "ES" || serviceType === "EP") {
      modules.push({ 
        id: "modulo-4", 
        label: "Evaluación Psicolaboral", 
        icon: CheckCircle, 
        enabled: currentStage === "Módulo 4: Evaluación Psicolaboral" || currentStage === "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral",
        isActive: activeTab === "modulo-4"
      })
    }

    if (serviceType === "PC" || serviceType === "SC" || serviceType === "CA") {
      // El módulo 5 (cierre) está habilitado si:
      // 1. Ya estás en el módulo 5, O
      // 2. (SC/PC) Estás en el módulo 4 Y hay candidatos con estado de informe definido.
      // (CA) M5 solo se habilita cuando la etapa ya es M5; para llegar hay que pulsar "Avanzar al Módulo 5" en Exámenes Médicos.
      const module5Enabled = currentStage === "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral" || 
                             (currentStage === "Módulo 4: Evaluación Psicolaboral" && hasCandidatesWithReportStatus)
      
      modules.push({ 
        id: "modulo-5", 
        label: "Seguimiento Posterior a la Evaluación Psicolaboral", 
        icon: Clock, 
        enabled: module5Enabled,
        isActive: activeTab === "modulo-5"
      })
    }

    modules.push({ 
      id: "timeline", 
      label: "Línea de Tiempo", 
      icon: Calendar, 
      enabled: true,
      isActive: activeTab === "timeline"
    })

    return modules
  }

  const availableModules = getAvailableModules()

  const handleAdvanceToModule2 = async () => {
    try {
      const response = await solicitudService.avanzarAModulo2(parseInt(id))
      
      if (response.success) {
        toast.success("Proceso avanzado al Módulo 2 exitosamente")
        // Recargar datos del proceso
        await loadProcessData()
        // Cambiar al módulo 2
        setActiveTab("modulo-2")
      } else {
        toast.error("No se pudo avanzar al Módulo 2. Por favor intenta nuevamente.")
      }
    } catch (error) {
      console.error("Error al avanzar al Módulo 2:", error)
      toast.error("No se pudo avanzar al Módulo 2. Por favor intenta nuevamente.")
    }
  }

  return (
    <div className="space-y-6">
      {(viewOnly || coordinadorMode) && (
        <div className={`rounded-lg border px-4 py-2 text-sm flex items-center justify-between gap-2 ${
          coordinadorMode
            ? "border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 text-violet-900 dark:text-violet-200"
            : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200"
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {coordinadorMode
                ? "Validación de candidatos (Coordinadora)"
                : user?.role === "cliente"
                  ? "Vista solo lectura (Cliente)"
                  : "Vista solo lectura (Administrador)"}
            </span>
            <span className={coordinadorMode ? "text-violet-700 dark:text-violet-300" : "text-amber-600 dark:text-amber-400"}>
              {coordinadorMode
                ? "— Apruebe, rechace u observe los candidatos enviados a revisión."
                : user?.role === "cliente"
                  ? "— Consulta el avance de tu proceso sin posibilidad de edición."
                  : "— Puedes ver detalles, botones y estados pero no modificar."}
            </span>
          </div>
          <Button
            onClick={() =>
              user?.role === "cliente" ? router.push("/cliente") : router.back()
            }
            variant="ghost"
            size="sm"
            className={`h-8 gap-2 ${
              coordinadorMode
                ? "text-violet-800 hover:bg-violet-100 dark:text-violet-200"
                : "text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50"
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
      )}
      {/* Process Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {firstCandidateName
              ? `${firstCandidateName} - ${process.cargo || process.position_title}`
              : (process.cargo || process.position_title)}
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>{process.cliente}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{process.contact?.name || 'Sin contacto'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Creado {formatDate(process.fecha_creacion || process.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{serviceTypeLabels[process.tipo_servicio] || process.tipo_servicio_nombre}</Badge>
          <Badge className={getStatusColor(process.status)}>{process.estado_solicitud || processStatusLabels[process.status]}</Badge>
        </div>
      </div>

      {/* Process Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacantes</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{process.vacancies || process.vacantes || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Etapa Actual</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium text-primary">
              {process.etapa || 'Sin etapa'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {process.estado_solicitud || 'Abierto'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipo de Servicio</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {serviceTypeLabels[process.tipo_servicio] || process.tipo_servicio_nombre}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Process Modules */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b">
              <div className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 h-auto p-0 bg-transparent">
                {availableModules.map((module) => {
                  return (
                    <button
                      key={module.id}
                      onClick={() => module.enabled && setActiveTab(module.id)}
                      disabled={!module.enabled}
                      className={`flex flex-col items-center gap-1 p-2 sm:p-4 rounded-none border-b-2 transition-colors ${
                        module.isActive 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : module.enabled 
                            ? 'hover:bg-primary/10 text-primary border-transparent' 
                            : 'opacity-50 cursor-not-allowed text-muted-foreground border-transparent'
                      }`}
                    >
                      <module.icon className="h-4 w-4" />
                      <span className="text-xs sm:text-sm text-center leading-tight">{module.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-6">
              <TabsContent value="modulo-1" className="mt-0">
                <ProcessModule1 process={process} descripcionCargo={descripcionCargo} readOnly={viewOnly} />
              </TabsContent>

              {(process.tipo_servicio === "PC" || process.tipo_servicio === "SC" || process.tipo_servicio === "CA" || process.tipo_servicio === "LL" || process.tipo_servicio === "FI" || process.tipo_servicio === "HH" || process.tipo_servicio === "PP") && (
                <TabsContent value="modulo-2" className="mt-0">
                  <ProcessModule2
                    process={process}
                    readOnly={viewOnly && !coordinadorMode}
                    coordinadorMode={coordinadorMode}
                  />
                </TabsContent>
              )}

              {(process.tipo_servicio === "PC" || process.tipo_servicio === "SC" || process.tipo_servicio === "CA" || process.tipo_servicio === "LL" || process.tipo_servicio === "FI" || process.tipo_servicio === "HH") && (
                <TabsContent value="modulo-3" className="mt-0">
                  <ProcessModule3 process={process} readOnly={viewOnly} />
                </TabsContent>
              )}

              {(process.tipo_servicio === "SC" || process.tipo_servicio === "CA") && (
                <>
                  <TabsContent value="modulo-entrevista-tecnica" className="mt-0">
                    <ProcessModuleEntrevistaTecnica process={process} readOnly={viewOnly} onAdvance={loadProcessData} />
                  </TabsContent>
                  <TabsContent value="modulo-examenes-medicos" className="mt-0">
                    <ProcessModuleExamenesMedicos process={process} readOnly={viewOnly} onAdvance={loadProcessData} />
                  </TabsContent>
                </>
              )}

              {(process.tipo_servicio === "PC" || process.tipo_servicio === "SC" || process.tipo_servicio === "TS" || process.tipo_servicio === "ES" || process.tipo_servicio === "EP") && (
                <TabsContent value="modulo-4" className="mt-0">
                  <ProcessModule4 process={process} readOnly={viewOnly} />
                </TabsContent>
              )}

              {(process.tipo_servicio === "PC" || process.tipo_servicio === "SC" || process.tipo_servicio === "CA") && (
                <TabsContent value="modulo-5" className="mt-0">
                  <ProcessModule5 process={process} readOnly={viewOnly} />
                </TabsContent>
              )}

              <TabsContent value="timeline" className="mt-0">
                <ProcessTimeline process={process} hitos={hitos} readOnly={viewOnly} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
