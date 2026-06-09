"use client"

import { useAuth } from "@/hooks/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts"
import { solicitudService } from "@/lib/api"
import { Clock, Target, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight, Download, Eye } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo, Fragment } from "react"
import { formatDate } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import * as XLSX from "xlsx"

// Función para formatear nombres de servicios (agregar espacios entre palabras)
const formatServiceName = (nombre: string): string => {
  // Mapeo de nombres específicos para casos conocidos
  const nombresMapeados: Record<string, string> = {
    'ProcesoCompleto': 'Proceso Completo',
    'LongList': 'Long List',
    'HeadHunting': 'Head Hunting',
    'TestPsicolaboral': 'Test Psicolaboral',
    'EvaluacionPsicolaboral': 'Evaluación Psicolaboral',
    'Filtro Inteligente': 'Filtro Inteligente',
    'Evaluación Potencial': 'Evaluación Potencial',
    'Publicación Portales': 'Publicación Portales',
  }

  // Buscar coincidencia exacta (sin importar mayúsculas)
  const nombreLower = nombre.toLowerCase().replace(/\s+/g, '')
  for (const [key, value] of Object.entries(nombresMapeados)) {
    if (key.toLowerCase().replace(/\s+/g, '') === nombreLower) {
      return value
    }
  }

  // Si no hay coincidencia, intentar agregar espacios antes de mayúsculas
  return nombre
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Agregar espacio antes de mayúsculas
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Manejar secuencias de mayúsculas
    .trim()
}

type WeekOption = {
  id: string
  label: string
  start: Date
  end: Date
}

type AverageTimeItem = {
  serviceCode: string
  serviceName: string
  averageDays: number
  sampleSize: number
}

type ProcessOverviewProcess = {
  id: number
  client: string
  position: string
  serviceCode: string
  serviceName: string
  consultant: string
  status: string
  statusRaw: string
  startDate: string | null
  deadline: string | null
  closedAt: string | null
  daysOpen: number | null
  businessDaysOpen: number | null
  daysUntilDeadline: number | null
  urgency: "no_deadline" | "on_track" | "due_soon" | "overdue" | "closed_on_time" | "closed_overdue"
}

type ProcessOverviewData = {
  processes: ProcessOverviewProcess[]
  totals: {
    total: number
    inProgress: number
    completed: number
    paused: number
    cancelled: number
  }
  statusCounts: Record<string, number>
  urgencySummary: {
    dueSoonCount: number
    overdueCount: number
    dueSoonProcesses: number[]
    overdueProcesses: number[]
    dueSoonProcessesDetails?: ProcessOverviewProcess[]
    overdueProcessesDetails?: ProcessOverviewProcess[]
  }
  currentActiveProcesses?: ProcessOverviewProcess[]
  periodSummary?: {
    createdCount: number
    completedCount: number
    averageCloseDays: number
    cancelledCount: number
  }
  periodActiveSnapshot?: Array<{
    id: number
    serviceCode: string
    serviceName: string
    consultant: string
    statusAtEnd: string
    urgencyAtEnd: 'on_track' | 'overdue' | 'no_deadline'
  }>
}

const weekLabelFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
})

const padNumber = (value: number) => value.toString().padStart(2, "0")

const abbreviateServiceName = (name: string): string => {
  const map: Record<string, string> = {
    "Evaluación Psicolaboral": "Ev. Psicolaboral",
    "Evaluación Potencial": "Ev. Potencial",
    "Proceso Completo": "Proc. Completo",
    "Filtro Inteligente": "Filtro Int.",
    "Publicación Portales": "Pub. Portales",
    "Targeted Recruitment": "Targeted Rec.",
    "Test Psicolaboral": "Test Psicolab.",
  }
  return map[name] ?? name
}

const startOfWeek = (date: Date) => {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

const addDays = (date: Date, amount: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

const getWeekId = (date: Date) => date.toISOString().split("T")[0]

const formatWeekLabel = (weekNumber: number, start: Date, end: Date) =>
  `Semana ${padNumber(weekNumber)} (${weekLabelFormatter.format(start)} - ${weekLabelFormatter.format(end)})`

const getWeekOptionsForYear = (year: number): WeekOption[] => {
  const options: WeekOption[] = []
  let current = startOfWeek(new Date(year, 0, 1))

  if (current.getFullYear() < year) {
    current = addDays(current, 7)
  }

  let weekNumber = 1
  while (current.getFullYear() === year) {
    const start = new Date(current)
    const end = addDays(start, 6)
    options.push({
      id: getWeekId(start),
      label: formatWeekLabel(weekNumber, start, end),
      start,
      end,
    })
    current = addDays(current, 7)
    weekNumber += 1
  }

  return options
}

const getDefaultWeekInfo = () => {
  const today = new Date()
  const thisMonday = startOfWeek(today)
  const previousWeekStart = addDays(thisMonday, -7)

  return {
    id: getWeekId(previousWeekStart),
    year: previousWeekStart.getFullYear(),
  }
}

const COLORS = ["#00BCD4", "#1E3A8A", "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#84cc16"]

export default function ReportesPage() {
  const { user } = useAuth()
  const { showToast } = useToastNotification()

  // Función para formatear fecha como DD-MM-AA
  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${day}-${month}-${year}`
  }
  
  // Función helper para procesar mensajes de error de la API
  const processApiErrorMessage = (errorMessage: string | undefined | null, defaultMessage: string): string => {
    if (!errorMessage) return defaultMessage
    const message = errorMessage.toLowerCase()
    
    // Mensajes específicos de reportes (ya están en español y son amigables, mantenerlos)
    if (message.includes('error al obtener carga operativa')) {
      return 'Error al obtener carga operativa'
    }
    if (message.includes('error al obtener distribución por tipo de servicio')) {
      return 'Error al obtener distribución por tipo de servicio'
    }
    if (message.includes('error al obtener fuentes de candidatos')) {
      return 'Error al obtener fuentes de candidatos'
    }
    if (message.includes('error al obtener estadísticas')) {
      return 'Error al obtener estadísticas'
    }
    if (message.includes('error al obtener tiempo promedio por servicio')) {
      return 'Error al obtener tiempo promedio por servicio'
    }
    if (message.includes('error al obtener overview de procesos') || message.includes('error al obtener resumen de procesos')) {
      return 'Error al obtener resumen de procesos'
    }
    if (message.includes('error al obtener procesos cerrados exitosos')) {
      return 'Error al obtener procesos cerrados exitosos'
    }
    if (message.includes('error al obtener rendimiento por consultor')) {
      return 'Error al obtener rendimiento por consultor'
    }
    if (message.includes('error al obtener estadísticas de cumplimiento')) {
      return 'Error al obtener estadísticas de cumplimiento'
    }
    if (message.includes('error al obtener hitos vencidos')) {
      return 'Error al obtener hitos vencidos'
    }
    
    // Mensajes generales
    if (message.includes('not found') || message.includes('no encontrado')) {
      return 'No se encontraron los datos solicitados'
    }
    if (message.includes('unauthorized') || message.includes('no autorizado')) {
      return 'No tienes permisos para acceder a estos datos'
    }
    if (message.includes('network') || message.includes('red')) {
      return 'Error de conexión. Por favor verifica tu conexión a internet'
    }
    if (message.includes('timeout')) {
      return 'La operación tardó demasiado. Por favor intenta nuevamente'
    }
    if (message.includes('server error') || message.includes('error del servidor')) {
      return 'Error en el servidor. Por favor intenta más tarde'
    }
    
    // Si el mensaje ya está en español y es claro, devolverlo tal cual
    return errorMessage || defaultMessage
  }
  

  const defaultWeek = getDefaultWeekInfo()
  const [timePeriod, setTimePeriod] = useState<"month" | "week" | "year">("month")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedWeek, setSelectedWeek] = useState(defaultWeek.id)
  const [reportTab, setReportTab] = useState("estados")
  const [activeProcesses, setActiveProcesses] = useState<Record<string, number>>({})
  const [loadingActiveProcesses, setLoadingActiveProcesses] = useState(true)
  const [serviceTypeData, setServiceTypeData] = useState<Array<{ service: string; count: number; percentage: number }>>([])
  const [loadingServiceType, setLoadingServiceType] = useState(true)
  const [candidateSourceData, setCandidateSourceData] = useState<Array<{ source: string; candidates: number; hired: number }>>([])
  const [loadingCandidateSource, setLoadingCandidateSource] = useState(true)
  // --- KPIs cards nuevas ---
  type SummaryCardsData = {
    totalProcesses: number
    closedProcesses: number
    closingTimes: { min: number | null; max: number | null; avg: number | null }
    plazoStats: { withinDeadline: number; outsideDeadline: number; totalWithDeadline: number }
    filters: {
      availableYears: number[]
      availableServices: Array<{ code: string; name: string }>
      availableConsultants: string[]
    }
  }
  const [summaryCards, setSummaryCards] = useState<SummaryCardsData | null>(null)
  const [loadingSummaryCards, setLoadingSummaryCards] = useState(true)
  const [cardYear, setCardYear] = useState<string>("all")
  const [cardService, setCardService] = useState<string>("all")
  const [cardConsultant, setCardConsultant] = useState<string>("all")
  const [averageTimeData, setAverageTimeData] = useState<AverageTimeItem[]>([])
  const [loadingAverageTime, setLoadingAverageTime] = useState(true)
  const [processOverview, setProcessOverview] = useState<ProcessOverviewData | null>(null)
  const [loadingProcessOverview, setLoadingProcessOverview] = useState(true)
  const [currentProcessesPage, setCurrentProcessesPage] = useState(1)
  const [processTypeFilter, setProcessTypeFilter] = useState<string>("all")
  const [selectedStateConsultant, setSelectedStateConsultant] = useState<string>("all")
  const [urgencyServiceFilter, setUrgencyServiceFilter] = useState<string>("all")
  const [urgencyConsultantFilter, setUrgencyConsultantFilter] = useState<string>("all")
  const [tableConsultantFilter, setTableConsultantFilter] = useState<string>("all")
  const [performanceData, setPerformanceData] = useState<Array<{
    consultant: string;
    processesCompleted: number;
    avgTimeToHire: number;
    efficiency: number;
  }>>([])
  const [loadingPerformance, setLoadingPerformance] = useState(true)
  const [completionStats, setCompletionStats] = useState<Array<{
    consultant: string;
    completed: number;
    onTime: number;
    delayed: number;
    completionRate: number;
  }>>([])
  const [loadingCompletion, setLoadingCompletion] = useState(true)
  const [overdueHitos, setOverdueHitos] = useState<Record<string, number>>({})
  const [loadingOverdue, setLoadingOverdue] = useState(true)
  const [closedSuccessfulProcesses, setClosedSuccessfulProcesses] = useState<
    Array<{
      id_solicitud: number
      tipo_servicio: string
      nombre_servicio: string
      cliente: string
      contacto: string | null
      ubicacion_cargo: string | null
      cargo: string | null
      fecha_solicitud: string | null
      fecha_cierre: string | null
      numero_vacantes: number | null
      consultor: string | null
      total_candidatos: number
      total_candidatos_seleccionados: number
      resultado_informe_psicolaboral: string | null
      mes_cierre: string | null
      candidatos_exitosos: Array<{ nombre: string; rut: string; estado_informe: string | null }>
    }>
  >([])
  const [loadingClosedProcesses, setLoadingClosedProcesses] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  
  // Filtros específicos para la tabla de procesos cerrados exitosos
  const [closedProcessesTimePeriod, setClosedProcessesTimePeriod] = useState<"month" | "week" | "year">("month")
  const [closedProcessesYear, setClosedProcessesYear] = useState<number>(new Date().getFullYear())
  const [closedProcessesMonth, setClosedProcessesMonth] = useState<number>(new Date().getMonth())
  const [closedProcessesWeek, setClosedProcessesWeek] = useState<string>("")
  const [closedProcessesServiceFilter, setClosedProcessesServiceFilter] = useState<string>("all")
  const [closedProcessesPage, setClosedProcessesPage] = useState<number>(1)
  const closedProcessesPerPage = 10
  
  const closedProcessesWeekOptions = useMemo(() => getWeekOptionsForYear(closedProcessesYear), [closedProcessesYear])
  const selectedClosedProcessesWeekOption = useMemo(
    () => closedProcessesWeekOptions.find((option) => option.id === closedProcessesWeek),
    [closedProcessesWeekOptions, closedProcessesWeek],
  )

  // Filtrar procesos cerrados por tipo de servicio
  const filteredClosedProcesses = useMemo(() => {
    if (closedProcessesServiceFilter === "all") {
      return closedSuccessfulProcesses
    }
    return closedSuccessfulProcesses.filter(process => process.tipo_servicio === closedProcessesServiceFilter)
  }, [closedSuccessfulProcesses, closedProcessesServiceFilter])

  // Obtener tipos de servicio únicos para el filtro con nombres completos formateados
  const availableServiceTypes = useMemo(() => {
    const typesMap = new Map<string, string>();
    closedSuccessfulProcesses.forEach(p => {
      if (p.tipo_servicio && p.nombre_servicio) {
        typesMap.set(p.tipo_servicio, formatServiceName(p.nombre_servicio));
      }
    });
    return Array.from(typesMap.entries())
      .map(([codigo, nombre]) => ({ codigo, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [closedSuccessfulProcesses])

  // Paginación de procesos cerrados
  const paginatedClosedProcesses = useMemo(() => {
    const startIndex = (closedProcessesPage - 1) * closedProcessesPerPage
    const endIndex = startIndex + closedProcessesPerPage
    return filteredClosedProcesses.slice(startIndex, endIndex)
  }, [filteredClosedProcesses, closedProcessesPage])

  const totalClosedProcessesPages = useMemo(() => {
    return Math.ceil(filteredClosedProcesses.length / closedProcessesPerPage)
  }, [filteredClosedProcesses])

  const weekOptions = useMemo(() => getWeekOptionsForYear(selectedYear), [selectedYear])
  const selectedWeekOption = useMemo(
    () => weekOptions.find((option) => option.id === selectedWeek),
    [weekOptions, selectedWeek],
  )

  useEffect(() => {
    if (timePeriod === "week") {
      if (!weekOptions.some((option) => option.id === selectedWeek)) {
        const defaultWeekInfo = getDefaultWeekInfo()
        const fallback =
          weekOptions.find((option) => option.id === defaultWeekInfo.id) ?? weekOptions[weekOptions.length - 1]
        if (fallback) {
          setSelectedWeek(fallback.id)
        }
      }
    }
  }, [timePeriod, weekOptions, selectedWeek])

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  // Cargar procesos activos por consultor (pestaña operacional)
  useEffect(() => {
    if (reportTab !== "operacional") return

    const loadActiveProcesses = async () => {
      try {
        setLoadingActiveProcesses(true)
        const response = await solicitudService.getActiveProcessesByConsultant()
        if (response.success && response.data) {
          setActiveProcesses(response.data as Record<string, number>)
        } else {
          setActiveProcesses({})
        }
      } catch (error: any) {
        console.error("Error al cargar procesos activos:", error)
        setActiveProcesses({})
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "No se pudieron cargar los procesos activos. Por favor recarga la página."),
        })
      } finally {
        setLoadingActiveProcesses(false)
      }
    }

    loadActiveProcesses()
  }, [reportTab])

  // Cargar distribución por tipo de servicio (pestaña operacional)
  useEffect(() => {
    if (reportTab !== "operacional") return

    const loadServiceTypeData = async () => {
      try {
        setLoadingServiceType(true)
        const response = await solicitudService.getProcessesByServiceType()
        if (response.success && response.data) {
          setServiceTypeData(response.data as Array<{ service: string; count: number; percentage: number }>)
    } else {
          setServiceTypeData([])
        }
      } catch (error: any) {
        console.error("Error al cargar distribución por tipo de servicio:", error)
        setServiceTypeData([])
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "No se pudo cargar la distribución por tipo de servicio. Por favor recarga la página."),
        })
      } finally {
        setLoadingServiceType(false)
      }
    }

    loadServiceTypeData()
  }, [reportTab])

  // Cargar fuentes de candidatos (pestaña operacional)
  useEffect(() => {
    if (reportTab !== "operacional") return

    const loadCandidateSourceData = async () => {
      try {
        setLoadingCandidateSource(true)
        const response = await solicitudService.getCandidateSourceData()
        if (response.success && response.data) {
          setCandidateSourceData(response.data as Array<{ source: string; candidates: number; hired: number }>)
        } else {
          setCandidateSourceData([])
        }
      } catch (error: any) {
        console.error("Error al cargar fuentes de candidatos:", error)
        setCandidateSourceData([])
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "No se pudieron cargar las fuentes de candidatos. Por favor recarga la página."),
        })
      } finally {
        setLoadingCandidateSource(false)
      }
    }

    loadCandidateSourceData()
  }, [reportTab])

  // Cargar KPIs de las 4 cards nuevas (sin filtro de período)
  useEffect(() => {
    const loadSummaryCards = async () => {
      try {
        setLoadingSummaryCards(true)
        const yearParam = cardYear === "all" ? undefined : parseInt(cardYear)
        const serviceParam = cardService === "all" ? undefined : cardService
        const consultantParam = cardConsultant === "all" ? undefined : cardConsultant
        const response = await solicitudService.getSummaryCards(yearParam, serviceParam, consultantParam)
        if (response.success && response.data) {
          setSummaryCards(response.data)
        } else {
          setSummaryCards(null)
        }
      } catch (error: any) {
        console.error("Error al cargar KPIs del dashboard:", error)
        setSummaryCards(null)
      } finally {
        setLoadingSummaryCards(false)
      }
    }
    loadSummaryCards()
  }, [cardYear, cardService, cardConsultant])

  useEffect(() => {
    if (reportTab !== "estados") return

    const loadAverageTime = async () => {
      try {
        setLoadingAverageTime(true)
        const week =
          timePeriod === "week" && selectedWeekOption
            ? weekOptions.findIndex((option) => option.id === selectedWeekOption.id) + 1
            : undefined
        const periodType = timePeriod === "week" ? "week" : timePeriod === "year" ? "year" : "month"

        const response = await solicitudService.getAverageProcessTimeByService(
          selectedYear,
          selectedMonth,
          week,
          periodType,
          selectedStateConsultant === "all" ? undefined : selectedStateConsultant
        )

        if (response.success && response.data) {
          setAverageTimeData(response.data as AverageTimeItem[])
        } else {
          setAverageTimeData([])
        }
      } catch (error: any) {
        console.error("Error al cargar tiempo promedio por servicio:", error)
        setAverageTimeData([])
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "No se pudo cargar el tiempo promedio. Por favor recarga la página."),
        })
      } finally {
        setLoadingAverageTime(false)
      }
    }

    loadAverageTime()
  }, [reportTab, selectedYear, selectedMonth, selectedWeek, selectedWeekOption, weekOptions, timePeriod, selectedStateConsultant])

  useEffect(() => {
    if (reportTab !== "estados") return

    const loadProcessOverview = async () => {
      try {
        setLoadingProcessOverview(true)
        const week =
          timePeriod === "week" && selectedWeekOption
            ? weekOptions.findIndex((option) => option.id === selectedWeekOption.id) + 1
            : undefined
        const periodType = timePeriod === "week" ? "week" : timePeriod === "year" ? "year" : "month"

        const response = await solicitudService.getProcessOverview(
          selectedYear,
          selectedMonth,
          week,
          periodType
        )

        if (response.success && response.data) {
          setProcessOverview(response.data as ProcessOverviewData)
        } else {
          setProcessOverview({
            processes: [],
            totals: { total: 0, inProgress: 0, completed: 0, paused: 0, cancelled: 0 },
            statusCounts: {},
            urgencySummary: { dueSoonCount: 0, overdueCount: 0, dueSoonProcesses: [], overdueProcesses: [] },
          })
        }
      } catch (error: any) {
        console.error("Error al cargar overview de procesos:", error)
        setProcessOverview({
          processes: [],
          totals: { total: 0, inProgress: 0, completed: 0, paused: 0, cancelled: 0 },
          statusCounts: {},
          urgencySummary: { dueSoonCount: 0, overdueCount: 0, dueSoonProcesses: [], overdueProcesses: [] },
        })
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "No se pudo cargar el resumen de procesos. Por favor recarga la página."),
        })
        } finally {
          setLoadingProcessOverview(false)
        }
      }

      loadProcessOverview()
    }, [reportTab, selectedYear, selectedMonth, selectedWeek, selectedWeekOption, weekOptions, timePeriod])

  // useEffect separado para cargar procesos cerrados exitosos (pestaña Rendimiento)
  useEffect(() => {
    if (reportTab !== "rendimiento") return

    const loadClosedSuccessfulProcesses = async () => {
      try {
        setLoadingClosedProcesses(true)
        
        // Inicializar semana si es necesario
        if (closedProcessesTimePeriod === "week" && !closedProcessesWeek && closedProcessesWeekOptions.length > 0) {
          const defaultInfo = getDefaultWeekInfo()
          const fallback = closedProcessesWeekOptions.find((option) => option.id === defaultInfo.id) ?? closedProcessesWeekOptions[closedProcessesWeekOptions.length - 1]
          if (fallback) {
            setClosedProcessesWeek(fallback.id)
            return // Se ejecutará de nuevo con el nuevo valor
          }
        }
        
        const week =
          closedProcessesTimePeriod === "week" && selectedClosedProcessesWeekOption
            ? closedProcessesWeekOptions.findIndex((option) => option.id === selectedClosedProcessesWeekOption.id) + 1
            : undefined
        const periodType = closedProcessesTimePeriod === "week" ? "week" : closedProcessesTimePeriod === "year" ? "year" : "month"

        const response = await solicitudService.getClosedSuccessfulProcesses(
          closedProcessesYear,
          closedProcessesMonth,
          week,
          periodType
        )

        if (response.success && response.data) {
          setClosedSuccessfulProcesses(response.data as any)
        } else {
          setClosedSuccessfulProcesses([])
        }
      } catch (error: any) {
        console.error("Error al cargar procesos cerrados exitosos:", error)
        setClosedSuccessfulProcesses([])
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "No se pudieron cargar los procesos cerrados. Por favor recarga la página."),
        })
      } finally {
        setLoadingClosedProcesses(false)
      }
    }

    loadClosedSuccessfulProcesses()
  }, [reportTab, closedProcessesYear, closedProcessesMonth, closedProcessesWeek, selectedClosedProcessesWeekOption, closedProcessesWeekOptions, closedProcessesTimePeriod])

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setClosedProcessesPage(1)
  }, [closedProcessesTimePeriod, closedProcessesYear, closedProcessesMonth, closedProcessesWeek, closedProcessesServiceFilter])

  // Cargar datos de rendimiento por consultor (pestaña rendimiento)
  useEffect(() => {
    if (reportTab !== "rendimiento") return

    const loadPerformanceData = async () => {
      try {
        setLoadingPerformance(true)
        const response = await solicitudService.getConsultantPerformance()
        if (response.success && response.data) {
          setPerformanceData(response.data as Array<{
            consultant: string;
            processesCompleted: number;
            avgTimeToHire: number;
            efficiency: number;
          }>)
        } else {
          setPerformanceData([])
        }
      } catch (error: any) {
        console.error("Error al cargar rendimiento por consultor:", error)
        setPerformanceData([])
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "No se pudo cargar el rendimiento por consultor. Por favor recarga la página."),
        })
      } finally {
        setLoadingPerformance(false)
      }
    }

    loadPerformanceData()
  }, [reportTab])

  // Cargar estadísticas de cumplimiento (pestaña rendimiento)
  useEffect(() => {
    if (reportTab !== "rendimiento") return

    const loadCompletionStats = async () => {
      try {
        setLoadingCompletion(true)
        const response = await solicitudService.getConsultantCompletionStats()
        if (response.success && response.data) {
          setCompletionStats(response.data as Array<{
            consultant: string;
            completed: number;
            onTime: number;
            delayed: number;
            completionRate: number;
          }>)
        } else {
          setCompletionStats([])
        }
      } catch (error: any) {
        console.error("Error al cargar estadísticas de cumplimiento:", error)
        setCompletionStats([])
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "No se pudieron cargar las estadísticas de cumplimiento. Por favor recarga la página."),
        })
      } finally {
        setLoadingCompletion(false)
      }
    }

    loadCompletionStats()
  }, [reportTab])

  // Cargar hitos vencidos por consultor (pestaña rendimiento)
  useEffect(() => {
    if (reportTab !== "rendimiento") return

    const loadOverdueHitos = async () => {
      try {
        setLoadingOverdue(true)
        const response = await solicitudService.getConsultantOverdueHitos()
        if (response.success && response.data) {
          setOverdueHitos(response.data as Record<string, number>)
        } else {
          setOverdueHitos({})
        }
      } catch (error: any) {
        console.error("Error al cargar hitos vencidos:", error)
        setOverdueHitos({})
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "No se pudieron cargar los hitos vencidos. Por favor recarga la página."),
        })
      } finally {
        setLoadingOverdue(false)
      }
    }

    loadOverdueHitos()
  }, [reportTab])

  // Colores para los estados
  const statusColors: Record<string, string> = {
    "Iniciado": "#00BCD4",
    "En Progreso": "#1E3A8A",
    "En Revisión": "#10b981",
    "Completado": "#3b82f6",
    "Cierre Ext.": "#8b5cf6",
    "Pausado": "#f59e0b",
    "Cancelado": "#ef4444",
  }

  const statusDisplayOrder = ["Iniciado", "En Progreso", "En Revisión", "Pausado", "Completado", "Cierre Ext.", "Cancelado"]

  const periodProcesses = processOverview?.processes ?? []
  const periodTotals = processOverview?.totals ?? {
    total: 0,
    inProgress: 0,
    completed: 0,
    paused: 0,
    cancelled: 0,
  }
  const periodSummary = processOverview?.periodSummary ?? {
    createdCount: 0,
    completedCount: 0,
    averageCloseDays: 0,
    cancelledCount: 0,
  }
  const statusCounts = processOverview?.statusCounts ?? {}
  const urgencySummary = processOverview?.urgencySummary ?? {
    dueSoonCount: 0,
    overdueCount: 0,
    dueSoonProcesses: [],
    overdueProcesses: [],
  }

  const processStatusData = statusDisplayOrder
    .map((status) => ({
      status,
      count: statusCounts[status] ?? 0,
      color: statusColors[status] || "#8884d8",
    }))
    .filter((item) => item.count > 0)

  const urgencyChartData = [
    { label: "Por vencer", value: urgencySummary.dueSoonCount },
    { label: "Vencidos", value: urgencySummary.overdueCount },
  ]

  // Procesos del período filtrados por consultor (para cards y gráfico de estados)
  const periodProcessesFiltered = useMemo(() => {
    const procs = processOverview?.processes ?? []
    if (selectedStateConsultant === "all") return procs
    return procs.filter((p) => p.consultant === selectedStateConsultant)
  }, [processOverview?.processes, selectedStateConsultant])

  // Lista única de consultores para el select (extraída del processOverview)
  const stateConsultantOptions = useMemo(() => {
    const all = processOverview?.processes ?? []
    const set = new Set<string>()
    all.forEach((p) => { if (p.consultant && p.consultant !== "Sin asignar") set.add(p.consultant) })
    return Array.from(set).sort()
  }, [processOverview?.processes])

  const CLOSED_STATUSES = ["Completado", "Cierre Ext.", "Cancelado"]

  // Snapshot de procesos activos al FINAL del período, filtrado por consultor
  const periodSnapshotFiltered = useMemo(() => {
    const snap = processOverview?.periodActiveSnapshot ?? []
    if (selectedStateConsultant === "all") return snap
    return snap.filter((p) => p.consultant === selectedStateConsultant)
  }, [processOverview?.periodActiveSnapshot, selectedStateConsultant])

  // Cards del período: activos por tipo de servicio (snapshot al final del período)
  const periodActiveByService = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    periodSnapshotFiltered.forEach((p) => {
      const key = p.serviceCode || "sin_servicio"
      const current = map.get(key) ?? { name: formatServiceName(p.serviceName || key), count: 0 }
      map.set(key, { ...current, count: current.count + 1 })
    })
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [periodSnapshotFiltered])

  // Cards del período: total activos al final del período
  const periodActiveTotal = useMemo(
    () => periodSnapshotFiltered.length,
    [periodSnapshotFiltered]
  )

  // Cards del período: plazo (dentro / fuera) al final del período
  const periodPlazoStats = useMemo(() => {
    let dentro = 0, fuera = 0
    periodSnapshotFiltered.forEach((p) => {
      if (p.urgencyAtEnd === "no_deadline") return
      if (p.urgencyAtEnd === "on_track") dentro++
      else if (p.urgencyAtEnd === "overdue") fuera++
    })
    return { dentro, fuera, total: dentro + fuera }
  }, [periodSnapshotFiltered])

  // Rango del período como strings YYYY-MM-DD (evita problemas de timezone)
  const periodRange = useMemo(() => {
    if (timePeriod === "week" && selectedWeekOption) {
      const weekIdx = weekOptions.findIndex((o) => o.id === selectedWeekOption.id) + 1
      const jan1Day = new Date(Date.UTC(selectedYear, 0, 1)).getUTCDay()
      const daysToFirstMonday = jan1Day === 0 ? 1 : jan1Day === 1 ? 0 : (8 - jan1Day)
      const firstMondayMs = Date.UTC(selectedYear, 0, 1 + daysToFirstMonday)
      const weekStartMs = firstMondayMs + (weekIdx - 1) * 7 * 86400000
      const weekEndMs = weekStartMs + 6 * 86400000
      const fmt = (ms: number) => new Date(ms).toISOString().split('T')[0]
      return { startStr: fmt(weekStartMs), endStr: fmt(weekEndMs) }
    } else if (timePeriod === "year") {
      return {
        startStr: `${selectedYear}-01-01`,
        endStr: `${selectedYear}-12-31`,
      }
    } else {
      const mm = String(selectedMonth + 1).padStart(2, '0')
      const endLocal = new Date(selectedYear, selectedMonth + 1, 0)
      endLocal.setHours(23, 59, 59, 999)
      return {
        startStr: `${selectedYear}-${mm}-01`,
        endStr: endLocal.toISOString().split('T')[0],
      }
    }
  }, [timePeriod, selectedYear, selectedMonth, selectedWeekOption, weekOptions])

  // Gráfico de estados:
  // - Activos (En Progreso, Pausado, etc.): snapshot al FINAL del período (todos, sin importar fecha inicio)
  // - Cerrados (Completado, Cierre Ext., Cancelado): solo los que cerraron DENTRO del período
  const filteredStatusChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    // Activos al final del período (sin importar cuándo empezaron)
    periodSnapshotFiltered.forEach((p) => {
      counts[p.statusAtEnd] = (counts[p.statusAtEnd] || 0) + 1
    })
    // Cerrados dentro del período
    periodProcessesFiltered.forEach((p) => {
      if (p.status !== "Completado" && p.status !== "Cierre Ext." && p.status !== "Cancelado") return
      if (!p.closedAt) return
      const closedDateStr = p.closedAt.split('T')[0]
      if (closedDateStr < periodRange.startStr || closedDateStr > periodRange.endStr) return
      counts[p.status] = (counts[p.status] || 0) + 1
    })
    return statusDisplayOrder
      .map((status) => ({ status, count: counts[status] ?? 0, color: statusColors[status] || "#8884d8" }))
      .filter((item) => item.count > 0)
  }, [periodSnapshotFiltered, periodProcessesFiltered, periodRange, statusDisplayOrder, statusColors])

  // Filtros disponibles para urgencia (extraídos de los procesos con urgencia)
  const urgencyServiceOptions = useMemo(() => {
    const all = [
      ...(urgencySummary.dueSoonProcessesDetails ?? []),
      ...(urgencySummary.overdueProcessesDetails ?? []),
    ]
    const map = new Map<string, string>()
    all.forEach((p) => {
      if (p.serviceCode) map.set(p.serviceCode, formatServiceName(p.serviceName || p.serviceCode))
    })
    return Array.from(map.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [urgencySummary])

  const urgencyConsultantOptions = useMemo(() => {
    const all = [
      ...(urgencySummary.dueSoonProcessesDetails ?? []),
      ...(urgencySummary.overdueProcessesDetails ?? []),
    ]
    const set = new Set<string>()
    all.forEach((p) => { if (p.consultant && p.consultant !== "Sin asignar") set.add(p.consultant) })
    return Array.from(set).sort()
  }, [urgencySummary])

  // Datos de urgencia filtrados
  const filteredDueSoon = useMemo(() => {
    let list = urgencySummary.dueSoonProcessesDetails ?? []
    if (urgencyServiceFilter !== "all") list = list.filter((p) => p.serviceCode === urgencyServiceFilter)
    if (urgencyConsultantFilter !== "all") list = list.filter((p) => p.consultant === urgencyConsultantFilter)
    return list
  }, [urgencySummary, urgencyServiceFilter, urgencyConsultantFilter])

  const filteredOverdue = useMemo(() => {
    let list = urgencySummary.overdueProcessesDetails ?? []
    if (urgencyServiceFilter !== "all") list = list.filter((p) => p.serviceCode === urgencyServiceFilter)
    if (urgencyConsultantFilter !== "all") list = list.filter((p) => p.consultant === urgencyConsultantFilter)
    return list
  }, [urgencySummary, urgencyServiceFilter, urgencyConsultantFilter])

  const urgencyFiltersActive = urgencyServiceFilter !== "all" || urgencyConsultantFilter !== "all"

  const filteredUrgencyChartData = useMemo(() => [
    {
      label: "Por vencer",
      value: urgencyFiltersActive ? filteredDueSoon.length : urgencySummary.dueSoonCount,
    },
    {
      label: "Vencidos",
      value: urgencyFiltersActive ? filteredOverdue.length : urgencySummary.overdueCount,
    },
  ], [filteredDueSoon, filteredOverdue, urgencyFiltersActive, urgencySummary])

  const tableConsultantOptions = useMemo(() => {
    const all = processOverview?.currentActiveProcesses || []
    const set = new Set<string>()
    all.forEach((p) => { if (p.consultant && p.consultant !== "Sin asignar") set.add(p.consultant) })
    return Array.from(set).sort()
  }, [processOverview?.currentActiveProcesses])

  const processesInProgress = useMemo(() => {
    let filtered = processOverview?.currentActiveProcesses || []

    if (processTypeFilter !== "all") {
      filtered = filtered.filter((process) => {
        const code = process.serviceCode || ""
        if (processTypeFilter === "HH") return code === "HH" || code === "HS"
        return code === processTypeFilter
      })
    }

    if (tableConsultantFilter !== "all") {
      filtered = filtered.filter((p) => p.consultant === tableConsultantFilter)
    }

    return filtered
  }, [processOverview?.currentActiveProcesses, processTypeFilter, tableConsultantFilter])

  const ITEMS_PER_PAGE = 10
  const totalProcessesPages = Math.ceil(processesInProgress.length / ITEMS_PER_PAGE)
  const paginatedProcessesInProgress = useMemo(() => {
    const startIndex = (currentProcessesPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return processesInProgress.slice(startIndex, endIndex)
  }, [processesInProgress, currentProcessesPage])

  // Resetear a la página 1 cuando cambian los procesos
  useEffect(() => {
    setCurrentProcessesPage(1)
  }, [processesInProgress.length])

  const averageTimeChartData = useMemo(() => {
    return averageTimeData
      .filter((item) => item.averageDays > 0)
      .map((item) => ({
        service: formatServiceName(item.serviceName),
        days: item.averageDays,
        sampleSize: item.sampleSize,
      }))
      .sort((a, b) => b.days - a.days)
  }, [averageTimeData],
  )

  const activeProcessesData = Object.entries(activeProcesses).map(([name, count]) => ({
    name,
    procesos: count,
  }))

  const totalProcesses = periodTotals.total
  const completedProcesses = processStatusData.find((p) => p.status === "Completado")?.count || 0
  const completionRate = totalProcesses > 0 ? Math.round((completedProcesses / totalProcesses) * 100) : 0

  const getWeeksInMonth = (month: number, year: number) => {
    const weeks: Array<{
      number: number
      label: string
      start: Date
      end: Date
      startDay: number
      endDay: number
      startMonth: number
      endMonth: number
      dateRange: string
    }> = []

    // Primer día del mes
    const firstDayOfMonth = new Date(year, month, 1)
    // Último día del mes
    const lastDayOfMonth = new Date(year, month + 1, 0)

    // Encontrar el primer lunes del mes
    // Si el primer día es lunes (1), empezamos ahí
    // Si es otro día, avanzamos hasta el próximo lunes
    let currentDate = new Date(firstDayOfMonth)
    const dayOfWeek = currentDate.getDay() // 0 = domingo, 1 = lunes, ..., 6 = sábado
    
    // Calcular cuántos días avanzar hasta el próximo lunes
    // Si es domingo (0), avanzar 1 día (lunes)
    // Si es lunes (1), no avanzar (0 días)
    // Si es martes (2), avanzar 6 días (lunes siguiente)
    // Si es miércoles (3), avanzar 5 días
    // Si es jueves (4), avanzar 4 días
    // Si es viernes (5), avanzar 3 días
    // Si es sábado (6), avanzar 2 días
    const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : (8 - dayOfWeek)
    
    // Avanzar al primer lunes del mes
    if (daysToMonday > 0) {
      currentDate.setDate(currentDate.getDate() + daysToMonday)
    }

    // Si el lunes calculado está fuera del mes (mes siguiente), no hay semanas en este mes
    // pero según el ejemplo del usuario, si noviembre empieza sábado, el lunes 3 es semana 1
    // así que el lunes SÍ debe estar en el mes
    if (currentDate.getMonth() !== month) {
      // Si el lunes está en el mes siguiente, significa que el mes no tiene lunes
      // En ese caso, empezamos desde el primer día y avanzamos hasta el próximo lunes del mes siguiente
      // Pero esto no debería pasar normalmente
      return weeks
    }

    let weekNumber = 1

    // Generar semanas hasta que pasemos el último día del mes
    while (currentDate <= lastDayOfMonth && currentDate.getMonth() === month) {
      const weekStart = new Date(currentDate)
      const weekEnd = new Date(currentDate)
      weekEnd.setDate(weekEnd.getDate() + 6) // Domingo

      // Si la semana termina fuera del mes, ajustar al último día del mes
      if (weekEnd > lastDayOfMonth || weekEnd.getMonth() !== month) {
        weekEnd.setTime(lastDayOfMonth.getTime())
      }

      const startDay = weekStart.getDate()
      const endDay = weekEnd.getDate()
      const startMonth = weekStart.getMonth()
      const endMonth = weekEnd.getMonth()

      // Formatear el rango de fechas (formato: "3 - 9 de Noviembre")
      let dateRange = ''
      if (startMonth === endMonth) {
        dateRange = `${startDay} - ${endDay} de ${monthNames[startMonth]}`
      } else {
        // Si la semana cruza meses (raro pero posible)
        dateRange = `${startDay} de ${monthNames[startMonth]} - ${endDay} de ${monthNames[endMonth]}`
      }

      weeks.push({
        number: weekNumber,
        label: `Semana ${weekNumber}`,
        start: weekStart,
        end: weekEnd,
        startDay,
        endDay,
        startMonth,
        endMonth,
        dateRange,
      })

      // Avanzar al próximo lunes (7 días)
      currentDate.setDate(currentDate.getDate() + 7)
      weekNumber++
    }

    return weeks
  }

  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]

  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
      years.push(year)
    }
    return years
  }

  // Función para exportar procesos cerrados exitosos a Excel
  const exportToExcel = () => {
    try {
      // Función auxiliar para formatear fecha como DD-MM-AA
      const formatDateForExcel = (dateString: string) => {
        const date = new Date(dateString)
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = String(date.getFullYear()).slice(-2)
        return `${day}-${month}-${year}`
      }

      // Preparar datos para el Excel
      const excelData: any[] = []
      
      filteredClosedProcesses.forEach((process) => {
        const diasProceso = process.fecha_solicitud && process.fecha_cierre
          ? Math.round((new Date(process.fecha_cierre).getTime() - new Date(process.fecha_solicitud).getTime()) / (1000 * 60 * 60 * 24))
          : null
        
        if (process.candidatos_exitosos.length > 0) {
          // Si hay candidatos exitosos, crear una fila por cada candidato
          process.candidatos_exitosos.forEach((candidato, index) => {
            excelData.push({
              'ID Solicitud': process.id_solicitud,
              'Tipo de Servicio': process.tipo_servicio,
              'Nombre del Servicio': process.nombre_servicio,
              'Cliente': process.cliente,
              'Cargo': process.cargo || 'Sin cargo',
              'Ubicación': process.ubicacion_cargo || 'Sin ubicación',
              'Fecha Solicitud': process.fecha_solicitud ? formatDateForExcel(process.fecha_solicitud) : 'Sin fecha',
              'Fecha Cierre': process.fecha_cierre ? formatDateForExcel(process.fecha_cierre) : 'Sin fecha',
              'N° Vacantes': process.numero_vacantes || 0,
              'Consultor': process.consultor || 'Sin asignar',
              'Candidato Exitoso - Nombre': candidato.nombre,
              'Candidato Exitoso - RUT': candidato.rut,
              'Candidato Exitoso - Estado Informe': candidato.estado_informe || 'N/A',
              'Total Candidatos': process.total_candidatos,
              'Candidatos Seleccionados': process.total_candidatos_seleccionados,
              'Resultado Informe': process.resultado_informe_psicolaboral || 'N/A',
              'Días de Proceso': diasProceso !== null ? diasProceso : '-',
              'Mes de Cierre': process.mes_cierre || 'Sin mes',
            })
          })
        } else {
          // Si no hay candidatos exitosos, crear una sola fila sin datos de candidatos
          excelData.push({
            'ID Solicitud': process.id_solicitud,
            'Tipo de Servicio': process.tipo_servicio,
            'Nombre del Servicio': process.nombre_servicio,
            'Cliente': process.cliente,
            'Cargo': process.cargo || 'Sin cargo',
            'Ubicación': process.ubicacion_cargo || 'Sin ubicación',
            'Fecha Solicitud': process.fecha_solicitud ? formatDateForExcel(process.fecha_solicitud) : 'Sin fecha',
            'Fecha Cierre': process.fecha_cierre ? formatDateForExcel(process.fecha_cierre) : 'Sin fecha',
            'N° Vacantes': process.numero_vacantes || 0,
            'Consultor': process.consultor || 'Sin asignar',
            'Candidato Exitoso - Nombre': '',
            'Candidato Exitoso - RUT': '',
            'Candidato Exitoso - Estado Informe': '',
            'Total Candidatos': process.total_candidatos,
            'Candidatos Seleccionados': process.total_candidatos_seleccionados,
            'Resultado Informe': process.resultado_informe_psicolaboral || 'N/A',
            'Días de Proceso': diasProceso !== null ? diasProceso : '-',
            'Mes de Cierre': process.mes_cierre || 'Sin mes',
          })
        }
      })

      // Crear hoja de trabajo
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      
      // Ajustar ancho de columnas
      const columnWidths = [
        { wch: 12 }, // ID Solicitud
        { wch: 20 }, // Tipo de Servicio
        { wch: 30 }, // Nombre del Servicio
        { wch: 30 }, // Cliente
        { wch: 25 }, // Cargo
        { wch: 20 }, // Ubicación
        { wch: 15 }, // Fecha Solicitud
        { wch: 15 }, // Fecha Cierre
        { wch: 12 }, // N° Vacantes
        { wch: 20 }, // Consultor
        { wch: 35 }, // Candidato Exitoso - Nombre
        { wch: 15 }, // Candidato Exitoso - RUT
        { wch: 30 }, // Candidato Exitoso - Estado Informe
        { wch: 18 }, // Total Candidatos
        { wch: 22 }, // Candidatos Seleccionados
        { wch: 30 }, // Resultado Informe
        { wch: 15 }, // Días de Proceso
        { wch: 15 }, // Mes de Cierre
      ]
      worksheet['!cols'] = columnWidths

      // Aplicar estilos a los encabezados (primera fila)
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        if (!worksheet[cellAddress]) continue
        
        worksheet[cellAddress].s = {
          fill: {
            fgColor: { rgb: "4472C4" }
          },
          font: {
            bold: true,
            color: { rgb: "FFFFFF" }
          },
          alignment: {
            horizontal: "center",
            vertical: "center"
          }
        }
      }

      // Crear libro de trabajo
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Procesos Cerrados Exitosos')

      // Generar nombre de archivo con fecha
      const periodLabel = closedProcessesTimePeriod === "week" 
        ? `Semana_${selectedClosedProcessesWeekOption?.label || 'actual'}`
        : closedProcessesTimePeriod === "year"
        ? `Año_${closedProcessesYear}`
        : `${monthNames[closedProcessesMonth]}_${closedProcessesYear}`
      
      const fileName = `Procesos_Cerrados_Exitosos_${periodLabel}.xlsx`

      // Descargar archivo
      XLSX.writeFile(workbook, fileName)
      
      showToast({
        type: "success",
        title: "Exportación exitosa",
        description: "El reporte se ha descargado correctamente",
      })
    } catch (error) {
      console.error("Error al exportar a Excel:", error)
      showToast({
        type: "error",
        title: "Error",
        description: "No se pudo exportar el reporte a Excel",
      })
    }
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes y KPIs</h1>
        <p className="text-muted-foreground">Análisis integral de rendimiento y métricas operativas</p>
      </div>

      {/* ── Filtros de las cards de resumen ── */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Año */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Año</label>
          <Select value={cardYear} onValueChange={(v) => { setCardYear(v); setCardService("all"); setCardConsultant("all") }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Todos los años" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(summaryCards?.filters.availableYears ?? []).map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Tipo de servicio */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Tipo de servicio</label>
          <Select value={cardService} onValueChange={setCardService}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los servicios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(summaryCards?.filters.availableServices ?? []).map((s) => (
                <SelectItem key={s.code} value={s.code}>{formatServiceName(s.name)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Consultor */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Consultor</label>
          <Select value={cardConsultant} onValueChange={setCardConsultant}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los consultores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(summaryCards?.filters.availableConsultants ?? []).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Badge indicador */}
        {(cardYear !== "all" || cardService !== "all" || cardConsultant !== "all") && (
          <div className="flex items-center gap-2 pb-0.5">
            <Badge variant="secondary" className="text-xs">
              Mostrando según filtro aplicado
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => { setCardYear("all"); setCardService("all"); setCardConsultant("all") }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
        {cardYear === "all" && cardService === "all" && cardConsultant === "all" && (
          <Badge variant="outline" className="text-xs self-end mb-0.5">
            Mostrando acumulado histórico
          </Badge>
        )}
      </div>

      {/* ── 4 cards de resumen ── */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Card 1: Total de procesos */}
        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <CardTitle className="text-base font-semibold">Total de Procesos</CardTitle>
            <Target className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummaryCards ? (
              <div className="flex items-center justify-center h-12">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">{summaryCards?.totalProcesses ?? 0}</div>
                <p className="text-sm text-muted-foreground mt-1">Procesos registrados</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Procesos cerrados */}
        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <CardTitle className="text-base font-semibold">Procesos Cerrados</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loadingSummaryCards ? (
              <div className="flex items-center justify-center h-12">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-blue-600">{summaryCards?.closedProcesses ?? 0}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {summaryCards && summaryCards.totalProcesses > 0
                    ? `${Math.round((summaryCards.closedProcesses / summaryCards.totalProcesses) * 100)}% del total`
                    : "Sin datos"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Tiempo de cierre */}
        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <CardTitle className="text-base font-semibold">Tiempo de Cierre</CardTitle>
            <Clock className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            {loadingSummaryCards ? (
              <div className="flex items-center justify-center h-12">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : summaryCards?.closingTimes.avg !== null && summaryCards?.closingTimes.avg !== undefined ? (
              <>
                <div className="text-3xl font-bold text-green-600">{summaryCards.closingTimes.avg} <span className="text-xl">días</span></div>
                <div className="flex gap-4 mt-2">
                  <span className="text-sm text-muted-foreground">Mín: <span className="font-semibold text-foreground">{summaryCards.closingTimes.min ?? "-"}</span></span>
                  <span className="text-sm text-muted-foreground">Máx: <span className="font-semibold text-foreground">{summaryCards.closingTimes.max ?? "-"}</span></span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Promedio de procesos cerrados</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Sin procesos cerrados</p>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Dentro / Fuera de plazo */}
        <Card className="gap-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
            <CardTitle className="text-base font-semibold">Cumplimiento de Plazo</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loadingSummaryCards ? (
              <div className="flex items-center justify-center h-12">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              </div>
            ) : summaryCards && summaryCards.plazoStats.totalWithDeadline > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                    Dentro de plazo
                  </span>
                  <span className="text-base font-bold text-green-600">
                    {summaryCards.plazoStats.withinDeadline}
                    <span className="text-sm font-normal text-muted-foreground ml-1.5">
                      ({Math.round((summaryCards.plazoStats.withinDeadline / summaryCards.plazoStats.totalWithDeadline) * 100)}%)
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                    Fuera de plazo
                  </span>
                  <span className="text-base font-bold text-red-600">
                    {summaryCards.plazoStats.outsideDeadline}
                    <span className="text-sm font-normal text-muted-foreground ml-1.5">
                      ({Math.round((summaryCards.plazoStats.outsideDeadline / summaryCards.plazoStats.totalWithDeadline) * 100)}%)
                    </span>
                  </span>
                </div>
                <p className="text-sm text-muted-foreground pt-0.5">
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">Sin datos de plazo</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={reportTab} onValueChange={setReportTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="estados">Estados de Procesos</TabsTrigger>
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="estados" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Período</CardTitle>
              <CardDescription>Selecciona el período para analizar los procesos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <ToggleGroup
                    type="single"
                    value={timePeriod}
                    onValueChange={(value) => {
                      if (!value) return
                      const next = value as "month" | "week" | "year"
                      setTimePeriod(next)
                      if (next === "week") {
                        const defaultInfo = getDefaultWeekInfo()
                        setSelectedYear(defaultInfo.year)
                        setSelectedWeek(defaultInfo.id)
                      }
                    }}
                    className="grid grid-cols-3 w-full md:w-fit"
                  >
                    <ToggleGroupItem value="year" aria-label="Vista anual">
                      Anual
                    </ToggleGroupItem>
                    <ToggleGroupItem value="month" aria-label="Vista mensual">
                      Mensual
                    </ToggleGroupItem>
                    <ToggleGroupItem value="week" aria-label="Vista semanal">
                      Semanal
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Año</label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => {
                      const yearNumber = Number.parseInt(value)
                      setSelectedYear(yearNumber)
                      if (timePeriod === "week") {
                        const options = getWeekOptionsForYear(yearNumber)
                        const defaultInfo = getDefaultWeekInfo()
                        const fallback =
                          options.find((option) => option.id === defaultInfo.id) ??
                          options[options.length - 1]
                        if (fallback) {
                          setSelectedWeek(fallback.id)
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableYears().map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {timePeriod === "month" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mes</label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => {
                      setSelectedMonth(Number.parseInt(value))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                )}

                {timePeriod === "week" && (
                  <div className="space-y-2 md:col-span-2 lg:col-span-2">
                  <label className="text-sm font-medium">Semana</label>
                    <Select value={selectedWeek} onValueChange={(value) => setSelectedWeek(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona una semana" />
                    </SelectTrigger>
                    <SelectContent>
                        {weekOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                )}

                {timePeriod === "year" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Período: Año completo</label>
                    <div className="h-10 flex items-center text-sm text-muted-foreground">
                      {selectedYear}
                    </div>
                  </div>
                )}

                {/* Filtro de consultor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Consultor</label>
                  <Select value={selectedStateConsultant} onValueChange={setSelectedStateConsultant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {stateConsultantOptions.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── 3 cards del período ── */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Card 1: Total procesos activos */}
            <Card className="gap-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                <CardTitle className="text-base font-semibold">Procesos Activos</CardTitle>
                <Target className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingProcessOverview ? (
                  <div className="flex items-center justify-center h-12">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold">{periodActiveTotal}</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {timePeriod === "week"
                        ? selectedWeekOption?.label ?? "Semana seleccionada"
                        : timePeriod === "year"
                        ? `Año ${selectedYear}`
                        : `${monthNames[selectedMonth]} ${selectedYear}`}
                      {selectedStateConsultant !== "all" ? ` · ${selectedStateConsultant}` : ""}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Activos por tipo de proceso */}
            <Card className="gap-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                <CardTitle className="text-base font-semibold">Activos por Proceso</CardTitle>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                {loadingProcessOverview ? (
                  <div className="flex items-center justify-center h-12">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  </div>
                ) : periodActiveByService.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin procesos activos</p>
                ) : (
                  <ul className="space-y-1.5">
                    {periodActiveByService.map((s) => (
                      <li key={s.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[70%]">{s.name}</span>
                        <span className="font-bold text-blue-600 ml-1">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Dentro / Fuera de plazo (período) */}
            <Card className="gap-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                <CardTitle className="text-base font-semibold">Cumplimiento de Plazo</CardTitle>
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </CardHeader>
              <CardContent>
                {loadingProcessOverview ? (
                  <div className="flex items-center justify-center h-12">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                  </div>
                ) : periodPlazoStats.total === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos de plazo</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
                        Dentro de plazo
                      </span>
                      <span className="text-base font-bold text-green-600">
                        {periodPlazoStats.dentro}
                        <span className="text-sm font-normal text-muted-foreground ml-1.5">
                          ({Math.round((periodPlazoStats.dentro / periodPlazoStats.total) * 100)}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                        Fuera de plazo
                      </span>
                      <span className="text-base font-bold text-red-600">
                        {periodPlazoStats.fuera}
                        <span className="text-sm font-normal text-muted-foreground ml-1.5">
                          ({Math.round((periodPlazoStats.fuera / periodPlazoStats.total) * 100)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
          <Card className="min-w-0 gap-2 py-4">
            <CardHeader className="pb-2">
                <CardTitle>Tiempo Promedio por Proceso</CardTitle>
                <CardDescription>Días promedio de cierre por tipo de proceso</CardDescription>
            </CardHeader>
            <CardContent className="w-full min-w-0 pl-3 pr-6 pt-0">
                {loadingAverageTime ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Cargando datos...</p>
                    </div>
                  </div>
                ) : averageTimeChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-sm text-muted-foreground">No hay datos en el período seleccionado</p>
                  </div>
                ) : (
                  <div style={{ height: Math.max(300, averageTimeChartData.length * 44) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={averageTimeChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 48, left: 5, bottom: 5 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} unit=" días" domain={[0, 'auto']} />
                      <YAxis type="category" dataKey="service" width={130} tick={{ fontSize: 13 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value: number, _name, payload) => [
                          `${value} días`,
                          `Promedio (${payload.payload.sampleSize} proceso${payload.payload.sampleSize !== 1 ? 's' : ''})`,
                        ]}
                      />
                      <Bar dataKey="days" fill="#1E3A8A" barSize={26} radius={[0, 4, 4, 0]}>
                        <LabelList
                          dataKey="days"
                          position="right"
                          formatter={(v: unknown) => (v as number) > 0 ? `${v}d` : "—"}
                          style={{ fontSize: 12, fill: "#6b7280" }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                )}
            </CardContent>
          </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estados de Procesos</CardTitle>
                <CardDescription>Distribución del período seleccionado</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProcessOverview ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Cargando datos...</p>
                    </div>
                  </div>
                ) : filteredStatusChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-sm text-muted-foreground">No hay datos para el período seleccionado</p>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={filteredStatusChartData} margin={{ top: 24, right: 20, left: 10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" tick={{ fontSize: 12, angle: -35, textAnchor: 'end' } as any} interval={0} />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(value: number) => [`${value} procesos`, "Cantidad"]} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {filteredStatusChartData.map((entry, index) => (
                          <Cell key={`status-${index}`} fill={entry.color} />
                        ))}
                        <LabelList dataKey="count" position="top" style={{ fontSize: 12, fill: "#6b7280" }} />
                      </Bar>
                    </BarChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Procesos con Urgencia</CardTitle>
                    <CardDescription>Basado en el plazo máximo de cierre definido para cada proceso</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Select value={urgencyServiceFilter} onValueChange={setUrgencyServiceFilter}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Todos los procesos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los procesos</SelectItem>
                        {urgencyServiceOptions.map((s) => (
                          <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={urgencyConsultantFilter} onValueChange={setUrgencyConsultantFilter}>
                      <SelectTrigger className="w-[170px] h-8 text-xs">
                        <SelectValue placeholder="Todos los consultores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los consultores</SelectItem>
                        {urgencyConsultantOptions.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
              {loadingProcessOverview ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Cargando datos...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filteredUrgencyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(value: number, name) => [`${value} procesos`, name]} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#dc2626" />
                  </BarChart>
                </ResponsiveContainer>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="border rounded-md p-4">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
                        Procesos por vencer ({urgencyFiltersActive ? filteredDueSoon.length : urgencySummary.dueSoonCount})
                      </h4>
                      {(urgencyFiltersActive ? filteredDueSoon : (urgencySummary.dueSoonProcessesDetails ?? [])).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No hay procesos próximos a vencer.</p>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto pr-2">
                          <ul className="space-y-3 text-xs">
                            {(urgencyFiltersActive ? filteredDueSoon : (urgencySummary.dueSoonProcessesDetails ?? [])).map((process) => (
                              <li key={`due-soon-${process.id}`} className="border-b pb-2 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-foreground">{process.client}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-amber-600 font-medium whitespace-nowrap">
                                        {process.daysUntilDeadline !== null
                                          ? `${process.daysUntilDeadline} días`
                                          : "Sin plazo"}
                                      </span>
                                      <Link 
                                        href={`/consultor/proceso/${process.id}?viewOnly=1`}
                                        className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                                        title="Ver detalles del proceso"
                                      >
                                        <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                      </Link>
                                    </div>
                                  </div>
                                  <div className="text-muted-foreground space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Cargo:</span>
                                      <span>{process.position}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Tipo:</span>
                                      <span>{process.serviceName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Consultor:</span>
                                      <span>{process.consultant}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Vence:</span>
                                      <span>
                                        {process.deadline
                                          ? format(new Date(process.deadline), "dd-MM-yyyy", { locale: es })
                                          : "Sin fecha"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-600"></span>
                        Procesos vencidos ({urgencyFiltersActive ? filteredOverdue.length : urgencySummary.overdueCount})
                      </h4>
                      {(urgencyFiltersActive ? filteredOverdue : (urgencySummary.overdueProcessesDetails ?? [])).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No hay procesos vencidos.</p>
                      ) : (
                        <div className="max-h-[400px] overflow-y-auto pr-2">
                          <ul className="space-y-3 text-xs">
                            {(urgencyFiltersActive ? filteredOverdue : (urgencySummary.overdueProcessesDetails ?? [])).map((process) => (
                              <li key={`overdue-${process.id}`} className="border-b pb-2 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-foreground">{process.client}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-red-600 font-medium whitespace-nowrap">
                                        {process.daysUntilDeadline !== null
                                          ? `Vencido hace ${Math.abs(process.daysUntilDeadline)} días`
                                          : "Sin plazo"}
                                      </span>
                                      <Link 
                                        href={`/consultor/proceso/${process.id}?viewOnly=1`}
                                        className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                                        title="Ver detalles del proceso"
                                      >
                                        <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                      </Link>
                                    </div>
                                  </div>
                                  <div className="text-muted-foreground space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Cargo:</span>
                                      <span>{process.position}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Tipo:</span>
                                      <span>{process.serviceName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Consultor:</span>
                                      <span>{process.consultant}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">Vencía:</span>
                                      <span>
                                        {process.deadline
                                          ? format(new Date(process.deadline), "dd-MM-yyyy", { locale: es })
                                          : "Sin fecha"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle>Procesos en Curso Actuales</CardTitle>
              <CardDescription>Todos los procesos activos en este momento (independiente del período seleccionado arriba)</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros de la tabla */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">Proceso:</label>
                  <Select value={processTypeFilter} onValueChange={setProcessTypeFilter}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los procesos</SelectItem>
                      <SelectItem value="PC">Proceso Completo (PC)</SelectItem>
                      <SelectItem value="SC">San Cristóbal Completo (SC)</SelectItem>
                      <SelectItem value="CA">San Cristóbal Acotado (CA)</SelectItem>
                      <SelectItem value="LL">Long List (LL)</SelectItem>
                      <SelectItem value="TR">Targeted Recruitment (TR)</SelectItem>
                      <SelectItem value="HH">Headhunting (HH)</SelectItem>
                      <SelectItem value="FI">Filtro Inteligente (FI)</SelectItem>
                      <SelectItem value="ES">Evaluación Psicolaboral (ES)</SelectItem>
                      <SelectItem value="TS">Test Psicolaboral (TS)</SelectItem>
                      <SelectItem value="EP">Evaluación de Potencial (EP)</SelectItem>
                      <SelectItem value="PP">Publicación Portales (PP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">Consultor:</label>
                  <Select value={tableConsultantFilter} onValueChange={setTableConsultantFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {tableConsultantOptions.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {processesInProgress.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">No hay procesos en curso</h3>
                  <p className="text-muted-foreground">
                    No hay procesos que cumplan el filtro de tipo (los datos son globales, sin período).
                  </p>
                </div>
              ) : (
                <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Tipo de Proceso</TableHead>
                      <TableHead>Consultor</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-center">Fecha Inicio</TableHead>
                      <TableHead className="text-center">Días Transcurridos</TableHead>
                      <TableHead className="text-center">Días Hábiles</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {paginatedProcessesInProgress.map((process) => {
                        const startDate = process.startDate ? new Date(process.startDate) : null
                        const daysSinceStart =
                          startDate !== null
                            ? Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                            : 0
                        const businessDays = process.businessDaysOpen ?? 0

                      return (
                        <TableRow key={process.id}>
                          <TableCell className="font-medium">{process.client}</TableCell>
                          <TableCell>{process.position}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                                {process.serviceName}
                            </Badge>
                          </TableCell>
                          <TableCell>{process.consultant}</TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={
                                process.status === "En Progreso"
                                  ? "bg-blue-100 text-blue-800 border-blue-300"
                                  : process.status === "Iniciado"
                                    ? "bg-cyan-100 text-cyan-800 border-cyan-300"
                                    : "bg-purple-100 text-purple-800 border-purple-300"
                              }
                            >
                              {process.status}
                            </Badge>
                          </TableCell>
                            <TableCell className="text-center">{startDate ? startDate.toLocaleDateString() : "Sin fecha"}</TableCell>
                          <TableCell className="text-center">
                            <span className={daysSinceStart > 60 ? "text-red-600 font-medium" : ""}>
                              {daysSinceStart} días
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={process.urgency === "overdue" ? "text-red-600 font-medium" : process.urgency === "due_soon" ? "text-amber-600 font-medium" : ""}>
                              {businessDays} días
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Link 
                              href={`/consultor/proceso/${process.id}?viewOnly=1`}
                              className="inline-flex items-center justify-center h-8 w-8 rounded hover:bg-muted transition-colors"
                              title="Ver detalles del proceso"
                            >
                              <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                </div>
                  {totalProcessesPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Mostrando {((currentProcessesPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentProcessesPage * ITEMS_PER_PAGE, processesInProgress.length)} de {processesInProgress.length} procesos
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentProcessesPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentProcessesPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <div className="text-sm font-medium">
                          Página {currentProcessesPage} de {totalProcessesPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentProcessesPage((prev) => Math.min(totalProcessesPages, prev + 1))}
                          disabled={currentProcessesPage === totalProcessesPages}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {timePeriod === "month" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Resumen Semanal - {monthNames[selectedMonth]} {selectedYear}
                </CardTitle>
                <CardDescription>Distribución detallada de procesos por semana del mes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {getWeeksInMonth(selectedMonth, selectedYear).map((week) => {
                    const weekProcesses = periodProcesses.filter((process) => {
                      const processDate = process.startDate ? new Date(process.startDate) : null
                      if (!processDate) return false
                      const weekStart = new Date(week.start)
                      weekStart.setHours(0, 0, 0, 0)
                      const weekEnd = new Date(week.end)
                      weekEnd.setHours(23, 59, 59, 999)
                      return processDate >= weekStart && processDate <= weekEnd
                    })

                    const inProgress = weekProcesses.filter((p) =>
                      ["En Progreso", "Iniciado", "En Revisión"].includes(p.status),
                    ).length
                    const completed = weekProcesses.filter((p) => p.status === "Completado").length
                    const paused = weekProcesses.filter((p) => p.status === "Pausado").length

                    return (
                      <div
                        key={week.number}
                        className="flex items-center justify-between p-6 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <h4 className="font-semibold text-lg">{week.label}</h4>
                          <p className="text-sm text-muted-foreground">
                            {week.dateRange}
                          </p>
                        </div>
                        <div className="flex gap-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{weekProcesses.length}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{inProgress}</div>
                            <div className="text-xs text-muted-foreground">En Curso</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{completed}</div>
                            <div className="text-xs text-muted-foreground">Completados</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{paused}</div>
                            <div className="text-xs text-muted-foreground">Pausados</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="operacional" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="min-w-0 gap-2 py-4">
              <CardHeader className="pb-2">
                <CardTitle>Carga Operativa por Consultor</CardTitle>
                <CardDescription>Procesos activos asignados</CardDescription>
              </CardHeader>
              <CardContent className="w-full min-w-0 pl-3 pr-6 min-h-[360px] pt-0 flex flex-col justify-center">
                {loadingActiveProcesses ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Cargando datos...</p>
                    </div>
                  </div>
                ) : (
                <div className="w-full flex items-center justify-center min-h-[300px]">
                <div className="w-full overflow-y-auto" style={{ maxHeight: 420, height: Math.min(420, Math.max(340, Object.keys(activeProcesses).length * 48)) }}>
                  <div style={{ height: Math.max(340, Object.keys(activeProcesses).length * 48), minWidth: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(activeProcesses).map(([name, count]) => ({ name, procesos: count }))}
                      layout="vertical"
                      margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
                      barCategoryGap="8%"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} domain={[0, 'auto']} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 14 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="procesos" fill="#00BCD4" barSize={28} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  </div>
                </div>
                </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 gap-2 py-4">
              <CardHeader className="pb-2">
                <CardTitle>Tipo de Servicio Total (En Progreso, Cerrados, Congelados, Cancelados)</CardTitle>
                <CardDescription>Distribución de procesos por categoría</CardDescription>
              </CardHeader>
              <CardContent className="min-h-[360px] pt-0">
                {loadingServiceType ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Cargando datos...</p>
                    </div>
                  </div>
                ) : serviceTypeData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
                  </div>
                ) : (
                  <>
                  <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <Pie
                      data={serviceTypeData}
                      cx="50%"
                      cy="50%"
                      startAngle={300}
                      endAngle={-130}
                      labelLine={false}
                      label={({ percent }) => {
                        const p = typeof percent === "number" ? percent : 0;
                        return p >= 0.05 ? `${Math.round(p * 100)}%` : "";
                      }}
                      outerRadius={85}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="service"
                    >
                      {serviceTypeData.map((entry, index) => (
                        <Cell key={`cell-service-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as { service: string; count: number; percentage: number };
                          return (
                            <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                              <p className="font-semibold text-sm">{data.service}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                <span className="font-medium">{data.count}</span> {data.count === 1 ? 'proceso' : 'procesos'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {data.percentage}% del total
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="mt-0 pt-1 flex flex-col gap-0.5 text-sm text-left mx-auto w-fit">
                  {serviceTypeData.map((entry, index) => (
                    <li key={index} className="flex items-center gap-2 justify-start">
                      <span
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-foreground">{entry.service}: {entry.percentage}%</span>
                    </li>
                  ))}
                </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fuentes de Candidatos</CardTitle>
              <CardDescription>Efectividad por canal de reclutamiento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-4">Volumen de Candidatos por Fuente</h4>
                  {loadingCandidateSource ? (
                    <div className="flex items-center justify-center h-[400px]">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Cargando datos...</p>
                      </div>
                    </div>
                  ) : candidateSourceData.length === 0 ? (
                    <div className="flex items-center justify-center h-[400px]">
                      <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={candidateSourceData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="source" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="candidates" fill="#00BCD4" name="Candidatos" />
                      <Bar dataKey="hired" fill="#10b981" name="Contratados" />
                    </BarChart>
                  </ResponsiveContainer>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-4">Distribución de Candidatos</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                      <Pie
                        data={candidateSourceData}
                        cx="50%"
                        cy="50%"
                        startAngle={300}
                        endAngle={-130}
                        labelLine={false}
                        label={({ percent, value, name }) => {
                          const p = typeof percent === "number" ? percent : 0;
                          return p >= 0.05 ? `${name}: ${value}` : "";
                        }}
                        outerRadius={85}
                        fill="#8884d8"
                        dataKey="candidates"
                        nameKey="source"
                      >
                        {candidateSourceData.map((entry, index) => (
                          <Cell key={`cell-candidate-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as { source: string; candidates: number; hired: number };
                            const total = candidateSourceData.reduce((s, e) => s + e.candidates, 0);
                            return (
                              <div className="bg-background border border-border rounded-lg shadow-lg p-3">
                                <p className="font-semibold text-sm">{data.source}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  <span className="font-medium">{data.candidates}</span> {data.candidates === 1 ? "candidato" : "candidatos"}
                                </p>
                                <p className="text-sm text-muted-foreground">{data.candidates} de {total} total</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="mt-0 pt-1 flex flex-col gap-0.5 text-sm text-left mx-auto w-fit">
                    {candidateSourceData.map((entry, index) => (
                      <li key={index} className="flex items-center gap-2 justify-start">
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-foreground">{entry.source}: {entry.candidates}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Tasa de Éxito por Fuente</h4>
                <div className="grid gap-2">
                  {candidateSourceData.map((source) => {
                    const successRate = Math.round((source.hired / source.candidates) * 100)
                    return (
                      <div key={source.source} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm font-medium">{source.source}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${successRate}%` }}></div>
                          </div>
                          <Badge variant="outline">{successRate}%</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rendimiento" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Consultor</CardTitle>
              <CardDescription>Métricas de desempeño individual</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPerformance ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Cargando datos...</p>
                  </div>
                </div>
              ) : performanceData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-sm text-muted-foreground">No hay datos de rendimiento disponibles</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Consultor</TableHead>
                      <TableHead>Procesos Completados</TableHead>
                      <TableHead>Tiempo Promedio</TableHead>
                      <TableHead>Eficiencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceData.map((consultant) => (
                    <TableRow key={consultant.consultant}>
                      <TableCell className="font-medium">{consultant.consultant}</TableCell>
                      <TableCell>{consultant.processesCompleted}</TableCell>
                      <TableCell>{consultant.avgTimeToHire} días</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            consultant.efficiency >= 80 ? "default" : 
                            consultant.efficiency >= 60 ? "secondary" : 
                            "destructive"
                          }
                          className={
                            consultant.efficiency >= 80 ? "bg-green-100 text-green-800" : 
                            consultant.efficiency >= 60 ? "bg-yellow-100 text-yellow-800" : 
                            consultant.efficiency >= 40 ? "bg-orange-100 text-orange-800" : 
                            ""
                          }
                        >
                          {consultant.efficiency}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cumplimiento de Plazos</CardTitle>
                <CardDescription>Análisis detallado por consultor</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCompletion ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Cargando datos...</p>
                    </div>
                  </div>
                ) : completionStats.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-sm text-muted-foreground">No hay datos de cumplimiento disponibles</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={completionStats.map((stat) => ({
                        name: stat.consultant,
                        aTiempo: stat.onTime,
                        retrasados: stat.delayed,
                      }))}
                      margin={{ top: 24, right: 20, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, angle: -35, textAnchor: 'end' } as any} interval={0} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="aTiempo" fill="#10b981" name="A Tiempo" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="aTiempo" position="top" style={{ fontSize: 11, fill: "#6b7280" }} />
                      </Bar>
                      <Bar dataKey="retrasados" fill="#dc2626" name="Retrasados" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="retrasados" position="top" style={{ fontSize: 11, fill: "#6b7280" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retrasos por Consultor</CardTitle>
                <CardDescription>Hitos vencidos que requieren atención</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOverdue ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Cargando datos...</p>
                    </div>
                  </div>
                ) : Object.keys(overdueHitos).length === 0 ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-sm text-muted-foreground">No hay hitos vencidos</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={Object.entries(overdueHitos).map(([name, vencidos]) => ({ name, vencidos }))}
                      margin={{ top: 24, right: 20, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, angle: -35, textAnchor: 'end' } as any} interval={0} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="vencidos" fill="#dc2626" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="vencidos" position="top" style={{ fontSize: 11, fill: "#6b7280" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Procesos Cerrados Exitosos</CardTitle>
                  <CardDescription>
                    Procesos cerrados en el período seleccionado con detalles de candidatos exitosos
                  </CardDescription>
                </div>
                {closedSuccessfulProcesses.length > 0 && (
                  <Button
                    onClick={exportToExcel}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={loadingClosedProcesses}
                  >
                    <Download className="h-4 w-4" />
                    Descargar Excel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                <h3 className="text-sm font-semibold mb-4">Filtros</h3>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Período</label>
                    <ToggleGroup
                      type="single"
                      value={closedProcessesTimePeriod}
                      onValueChange={(value) => {
                        if (!value) return
                        const next = value as "month" | "week" | "year"
                        setClosedProcessesTimePeriod(next)
                        if (next === "week") {
                          const defaultInfo = getDefaultWeekInfo()
                          setClosedProcessesYear(defaultInfo.year)
                          setClosedProcessesWeek(defaultInfo.id)
                        }
                      }}
                      className="grid grid-cols-3 w-full"
                    >
                      <ToggleGroupItem value="year" aria-label="Vista anual">
                        Anual
                      </ToggleGroupItem>
                      <ToggleGroupItem value="month" aria-label="Vista mensual">
                        Mensual
                      </ToggleGroupItem>
                      <ToggleGroupItem value="week" aria-label="Vista semanal">
                        Semanal
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Año</label>
                    <Select
                      value={closedProcessesYear.toString()}
                      onValueChange={(value) => {
                        const yearNumber = Number.parseInt(value)
                        setClosedProcessesYear(yearNumber)
                        if (closedProcessesTimePeriod === "week") {
                          const options = getWeekOptionsForYear(yearNumber)
                          const defaultInfo = getDefaultWeekInfo()
                          const fallback =
                            options.find((option) => option.id === defaultInfo.id) ?? options[options.length - 1]
                          if (fallback) {
                            setClosedProcessesWeek(fallback.id)
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {closedProcessesTimePeriod === "month" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mes</label>
                      <Select
                        value={closedProcessesMonth.toString()}
                        onValueChange={(value) => setClosedProcessesMonth(Number.parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i).map((month) => (
                            <SelectItem key={month} value={month.toString()}>
                              {format(new Date(closedProcessesYear, month, 1), "MMMM", { locale: es })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : closedProcessesTimePeriod === "week" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Semana</label>
                      <Select
                        value={closedProcessesWeek}
                        onValueChange={(value) => setClosedProcessesWeek(value)}
                        disabled={closedProcessesWeekOptions.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una semana" />
                        </SelectTrigger>
                        <SelectContent>
                          {closedProcessesWeekOptions.map((week) => (
                            <SelectItem key={week.id} value={week.id}>
                              {week.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Período: Año completo</label>
                      <div className="h-10 flex items-center text-sm text-muted-foreground">
                        {closedProcessesYear}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Servicio</label>
                    <Select
                      value={closedProcessesServiceFilter}
                      onValueChange={(value) => setClosedProcessesServiceFilter(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los servicios" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los servicios</SelectItem>
                        {availableServiceTypes.map((type) => (
                          <SelectItem key={type.codigo} value={type.codigo}>
                            {type.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {loadingClosedProcesses ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Cargando datos...</p>
                  </div>
                </div>
              ) : filteredClosedProcesses.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-sm text-muted-foreground">No hay procesos cerrados exitosos en el período seleccionado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Tipo de Servicio</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Fecha Solicitud</TableHead>
                        <TableHead>Fecha Cierre</TableHead>
                        <TableHead className="text-center">N° Vacantes</TableHead>
                        <TableHead>Consultor</TableHead>
                        <TableHead className="text-center">Total Candidatos</TableHead>
                        <TableHead className="text-center">Candidatos Seleccionados</TableHead>
                        <TableHead>Resultado Informe</TableHead>
                        <TableHead className="text-center">Días de Proceso</TableHead>
                        <TableHead>Mes de Cierre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedClosedProcesses.map((process) => {
                        const isExpanded = expandedRows.has(process.id_solicitud)
                        return (
                          <Fragment key={process.id_solicitud}>
                            <TableRow>
                              <TableCell>
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedRows)
                                    if (isExpanded) {
                                      newExpanded.delete(process.id_solicitud)
                                    } else {
                                      newExpanded.add(process.id_solicitud)
                                    }
                                    setExpandedRows(newExpanded)
                                  }}
                                  className="p-1 hover:bg-muted rounded"
                                >
                                  {isExpanded ? (
                                    <span className="text-sm">▼</span>
                                  ) : (
                                    <span className="text-sm">▶</span>
                                  )}
                                </button>
                              </TableCell>
                              <TableCell className="font-medium">{process.nombre_servicio}</TableCell>
                              <TableCell>{process.cliente}</TableCell>
                              <TableCell>
                                <span 
                                  className="block max-w-[250px] truncate" 
                                  title={process.cargo || "Sin cargo"}
                                >
                                  {process.cargo && process.cargo.length > 40 
                                    ? `${process.cargo.substring(0, 40)}...` 
                                    : process.cargo || "Sin cargo"}
                                </span>
                              </TableCell>
                              <TableCell>{process.ubicacion_cargo || "Sin ubicación"}</TableCell>
                              <TableCell>{process.fecha_solicitud ? formatDateShort(process.fecha_solicitud) : "Sin fecha"}</TableCell>
                              <TableCell>{process.fecha_cierre ? formatDateShort(process.fecha_cierre) : "Sin fecha"}</TableCell>
                              <TableCell className="text-center">{process.numero_vacantes || 0}</TableCell>
                              <TableCell>{process.consultor || "Sin asignar"}</TableCell>
                              <TableCell className="text-center">{process.total_candidatos}</TableCell>
                              <TableCell className="text-center">
                                {process.total_candidatos_seleccionados > 0 ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    {process.total_candidatos_seleccionados}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {process.resultado_informe_psicolaboral ? (
                                  <Badge
                                    variant={
                                      process.resultado_informe_psicolaboral.includes("Recomendable") && !process.resultado_informe_psicolaboral.includes("No")
                                        ? "default"
                                        : process.resultado_informe_psicolaboral.includes("observaciones")
                                        ? "secondary"
                                        : "destructive"
                                    }
                                    className={
                                      process.resultado_informe_psicolaboral.includes("Recomendable") && !process.resultado_informe_psicolaboral.includes("No")
                                        ? "bg-green-100 text-green-800"
                                        : process.resultado_informe_psicolaboral.includes("observaciones")
                                        ? "bg-yellow-100 text-yellow-800"
                                        : ""
                                    }
                                  >
                                    {process.resultado_informe_psicolaboral}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {process.fecha_solicitud && process.fecha_cierre ? (
                                  Math.round(
                                    (new Date(process.fecha_cierre).getTime() - new Date(process.fecha_solicitud).getTime()) / (1000 * 60 * 60 * 24)
                                  )
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>{process.mes_cierre || "Sin mes"}</TableCell>
                            </TableRow>
                            {isExpanded && process.candidatos_exitosos.length > 0 && (
                              <TableRow>
                                <TableCell colSpan={14} className="bg-muted/50">
                                  <div className="p-4 space-y-2">
                                    <h4 className="font-semibold text-sm mb-3">Candidatos Exitosos:</h4>
                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                      {process.candidatos_exitosos.map((candidato, idx) => (
                                        <div key={idx} className="border rounded-md p-3 text-sm space-y-1.5">
                                          <p className="font-medium">{candidato.nombre}</p>
                                          <p className="text-muted-foreground">RUT: {candidato.rut}</p>
                                          {candidato.estado_informe && (
                                            <div className="flex items-center gap-2 pt-1">
                                              <span className="text-xs text-muted-foreground">Estado Informe Psicolaboral:</span>
                                              <Badge
                                                variant={
                                                  candidato.estado_informe.includes("Recomendable") && !candidato.estado_informe.includes("No")
                                                    ? "default"
                                                    : candidato.estado_informe.includes("observaciones")
                                                    ? "secondary"
                                                    : "destructive"
                                                }
                                                className={
                                                  candidato.estado_informe.includes("Recomendable") && !candidato.estado_informe.includes("No")
                                                    ? "bg-green-100 text-green-800 text-xs"
                                                    : candidato.estado_informe.includes("observaciones")
                                                    ? "bg-yellow-100 text-yellow-800 text-xs"
                                                    : "text-xs"
                                                }
                                              >
                                                {candidato.estado_informe}
                                              </Badge>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {totalClosedProcessesPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Mostrando {((closedProcessesPage - 1) * closedProcessesPerPage) + 1} - {Math.min(closedProcessesPage * closedProcessesPerPage, filteredClosedProcesses.length)} de {filteredClosedProcesses.length} procesos
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setClosedProcessesPage(p => Math.max(1, p - 1))}
                          disabled={closedProcessesPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalClosedProcessesPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={page === closedProcessesPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setClosedProcessesPage(page)}
                              className="w-9"
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setClosedProcessesPage(p => Math.min(totalClosedProcessesPages, p + 1))}
                          disabled={closedProcessesPage === totalClosedProcessesPages}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}