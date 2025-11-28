"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/auth"
import { solicitudService, descripcionCargoService } from "@/lib/api"
import { getHitosBySolicitud } from "@/lib/api-hitos"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, getStatusColor } from "@/lib/utils"
import { Building2, User, Calendar, Target, FileText, Users, CheckCircle, Clock, AlertTriangle, Loader2 } from "lucide-react"
import { ProcessTimeline } from "@/components/consultor/process-timeline"
import { ProcessModule1 } from "@/components/consultor/process-module-1"
import { ProcessModule2 } from "@/components/consultor/process-module-2"
import { ProcessModule3 } from "@/components/consultor/process-module-3"
import { ProcessModule4 } from "@/components/consultor/process-module-4"
import { ProcessModule5 } from "@/components/consultor/process-module-5"
import { notFound } from "next/navigation"
import { toast } from "sonner"
import type { Hito } from "@/lib/types"

import { serviceTypeLabels, processStatusLabels } from "@/lib/utils"

interface ProcessPageProps {
  params: {
    id: string
  }
}

export default function ProcessPage({ params }: ProcessPageProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("modulo-1")
  const [process, setProcess] = useState<any>(null)
  const [descripcionCargo, setDescripcionCargo] = useState<any>(null)
  const [hitos, setHitos] = useState<Hito[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasCandidatesWithReportStatus, setHasCandidatesWithReportStatus] = useState(false)

  // Función para determinar el módulo activo basado en la etapa
  const getModuleFromStage = (etapa: string | null | undefined, serviceType: string | null | undefined): string => {
    if (!etapa || etapa === 'Sin etapa') {
      return 'modulo-1'
    }

    // Mapeo de etapas a módulos según el tipo de servicio
    if (etapa === 'Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral') {
      // Solo PC tiene módulo 5
      if (serviceType === 'PC') {
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
      // Solo PC, TS y ES tienen módulo 4
      if (serviceType === 'PC' || serviceType === 'TS' || serviceType === 'ES') {
        return 'modulo-4'
      }
      // LL y HH no tienen módulo 4, mostrar módulo 3 como máximo
      if (serviceType === 'LL' || serviceType === 'HH') {
        return 'modulo-3'
      }
      return 'modulo-1'
    }

    if (etapa === 'Módulo 3: Presentación de Candidatos') {
      // Solo PC, LL y HH tienen módulo 3
      if (serviceType === 'PC' || serviceType === 'LL' || serviceType === 'HH') {
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
      // Solo PC, LL y HH tienen módulo 2
      if (serviceType === 'PC' || serviceType === 'LL' || serviceType === 'HH') {
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
  }, [params.id, user])

  // Establecer módulo activo basado en la etapa o parámetro tab de la URL cuando se carga el proceso
  useEffect(() => {
    if (process && !isLoading) {
      const urlParams = new URLSearchParams(window.location.search)
      const tabFromUrl = urlParams.get('tab')
      
      // Si hay parámetro tab en la URL, usarlo (tiene prioridad)
      if (tabFromUrl && ['modulo-1', 'modulo-2', 'modulo-3', 'modulo-4', 'modulo-5', 'timeline'].includes(tabFromUrl)) {
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
        checkCandidatesWithReportStatus(parseInt(params.id))
      } else {
        setHasCandidatesWithReportStatus(false)
      }
    }
  }, [process, activeTab, isLoading])

  const loadProcessData = async () => {
    try {
      setIsLoading(true)
      
      // Validar que el ID sea un número válido
      const processId = parseInt(params.id)
      if (isNaN(processId)) {
        console.error('ID de proceso inválido:', params.id)
        toast.error("ID de proceso inválido")
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

        // Cargar hitos del proceso
        const hitosData = await getHitosBySolicitud(processId)
        const hitosMapeados: Hito[] = hitosData.map((hito) => {
          // Determinar estado: primero verificar si está completado (tiene fecha_cumplimiento)
          let status: Hito['status'] = 'pendiente'
          
          if (hito.fecha_cumplimiento) {
            // Si tiene fecha de cumplimiento, está completado
            status = 'completado'
          } else if (hito.estado === 'vencido' || (hito.fecha_limite && new Date(hito.fecha_limite) < new Date())) {
            // Si está vencido o la fecha límite ya pasó
            status = 'vencido'
          } else if (hito.fecha_base && hito.fecha_limite) {
            // Si tiene fecha de inicio y límite, está en progreso
            status = 'en_progreso'
          } else {
            // Por defecto, pendiente
            status = 'pendiente'
          }

          return {
            id: hito.id_hito_solicitud.toString(),
            process_id: processId.toString(),
            name: hito.nombre_hito,
            description: hito.descripcion || '',
            start_trigger: hito.tipo_ancla || '',
            duration_days: hito.duracion_dias || 0,
            anticipation_days: hito.avisar_antes_dias || 0,
            status: status,
            start_date: hito.fecha_base ? new Date(hito.fecha_base).toISOString() : undefined,
            due_date: hito.fecha_limite ? new Date(hito.fecha_limite).toISOString() : undefined,
            completed_date: hito.fecha_cumplimiento ? new Date(hito.fecha_cumplimiento).toISOString() : undefined,
          }
        })
        setHitos(hitosMapeados)

        // Verificar si hay candidatos con estado de informe definido (solo para procesos PC)
        const serviceType = response.data.tipo_servicio || response.data.service_type
        const currentStage = response.data.etapa || response.data.stage
        if (serviceType === "PC" && currentStage === "Módulo 4: Evaluación Psicolaboral") {
          await checkCandidatesWithReportStatus(processId)
        } else {
          setHasCandidatesWithReportStatus(false)
        }
      } else {
        toast.error("No se pudo cargar la solicitud")
        notFound()
      }
    } catch (error) {
      console.error("Error loading process:", error)
      toast.error("Error al cargar los datos")
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

  if (user?.role !== "consultor") {
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
    
    if (serviceType === "PC" || serviceType === "LL" || serviceType === "HH") {
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

    if (serviceType === "PC" || serviceType === "TS" || serviceType === "ES") {
      modules.push({ 
        id: "modulo-4", 
        label: "Evaluación Psicolaboral", 
        icon: CheckCircle, 
        enabled: currentStage === "Módulo 4: Evaluación Psicolaboral" || currentStage === "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral",
        isActive: activeTab === "modulo-4"
      })
    }

    if (serviceType === "PC") {
      // El módulo 5 solo está habilitado si:
      // 1. Ya estás en el módulo 5, O
      // 2. Estás en el módulo 4 Y hay candidatos con estado de informe definido
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
      const response = await solicitudService.avanzarAModulo2(parseInt(params.id))
      
      if (response.success) {
        toast.success("Proceso avanzado al Módulo 2 exitosamente")
        // Recargar datos del proceso
        await loadProcessData()
        // Cambiar al módulo 2
        setActiveTab("modulo-2")
      } else {
        toast.error("Error al avanzar al Módulo 2")
      }
    } catch (error) {
      console.error("Error al avanzar al Módulo 2:", error)
      toast.error("Error al avanzar al Módulo 2")
    }
  }

  return (
    <div className="space-y-6">
      {/* Process Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{process.cargo || process.position_title}</h1>
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
                <ProcessModule1 process={process} descripcionCargo={descripcionCargo} />
              </TabsContent>

              {(process.tipo_servicio === "PC" || process.tipo_servicio === "LL" || process.tipo_servicio === "HH") && (
                <TabsContent value="modulo-2" className="mt-0">
                  <ProcessModule2 process={process} />
                </TabsContent>
              )}

              {(process.tipo_servicio === "PC" || process.tipo_servicio === "LL" || process.tipo_servicio === "HH") && (
                <TabsContent value="modulo-3" className="mt-0">
                  <ProcessModule3 process={process} />
                </TabsContent>
              )}

              {(process.tipo_servicio === "PC" || process.tipo_servicio === "TS" || process.tipo_servicio === "ES") && (
                <TabsContent value="modulo-4" className="mt-0">
                  <ProcessModule4 process={process} />
                </TabsContent>
              )}

              {process.tipo_servicio === "PC" && (
                <TabsContent value="modulo-5" className="mt-0">
                  <ProcessModule5 process={process} />
                </TabsContent>
              )}

              <TabsContent value="timeline" className="mt-0">
                <ProcessTimeline process={process} hitos={hitos} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
