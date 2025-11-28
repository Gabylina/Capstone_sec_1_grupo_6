"use client"

import { useAuth } from "@/hooks/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { solicitudService } from "@/lib/api"
import { Users, Clock, Target, TrendingUp, AlertTriangle, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useMemo, Fragment } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import * as XLSX from "xlsx"

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
  }
}

const weekLabelFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
})

const padNumber = (value: number) => value.toString().padStart(2, "0")

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
  const [timePeriod, setTimePeriod] = useState<"month" | "week">("month")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedWeek, setSelectedWeek] = useState(defaultWeek.id)
  const [activeProcesses, setActiveProcesses] = useState<Record<string, number>>({})
  const [loadingActiveProcesses, setLoadingActiveProcesses] = useState(true)
  const [serviceTypeData, setServiceTypeData] = useState<Array<{ service: string; count: number; percentage: number }>>([])
  const [loadingServiceType, setLoadingServiceType] = useState(true)
  const [candidateSourceData, setCandidateSourceData] = useState<Array<{ source: string; candidates: number; hired: number }>>([])
  const [loadingCandidateSource, setLoadingCandidateSource] = useState(true)
  const [processStats, setProcessStats] = useState<{ activeProcesses: number; avgTimeToHire: number; totalCandidates: number }>({
    activeProcesses: 0,
    avgTimeToHire: 0,
    totalCandidates: 0
  })
  const [loadingProcessStats, setLoadingProcessStats] = useState(true)
  const [averageTimeData, setAverageTimeData] = useState<AverageTimeItem[]>([])
  const [loadingAverageTime, setLoadingAverageTime] = useState(true)
  const [processOverview, setProcessOverview] = useState<ProcessOverviewData | null>(null)
  const [loadingProcessOverview, setLoadingProcessOverview] = useState(true)
  const [currentProcessesPage, setCurrentProcessesPage] = useState(1)
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
      comuna: string | null
      cargo: string | null
      total_candidatos: number
      candidatos_exitosos: Array<{ nombre: string; rut: string }>
    }>
  >([])
  const [loadingClosedProcesses, setLoadingClosedProcesses] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  
  // Filtros específicos para la tabla de procesos cerrados exitosos
  const [closedProcessesTimePeriod, setClosedProcessesTimePeriod] = useState<"month" | "week">("month")
  const [closedProcessesYear, setClosedProcessesYear] = useState<number>(new Date().getFullYear())
  const [closedProcessesMonth, setClosedProcessesMonth] = useState<number>(new Date().getMonth())
  const [closedProcessesWeek, setClosedProcessesWeek] = useState<string>("")
  
  const closedProcessesWeekOptions = useMemo(() => getWeekOptionsForYear(closedProcessesYear), [closedProcessesYear])
  const selectedClosedProcessesWeekOption = useMemo(
    () => closedProcessesWeekOptions.find((option) => option.id === closedProcessesWeek),
    [closedProcessesWeekOptions, closedProcessesWeek],
  )

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

  // Cargar procesos activos por consultor desde la API (optimizado)
  useEffect(() => {
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
          description: processApiErrorMessage(error?.message, "Error al cargar procesos activos por consultor"),
        })
      } finally {
        setLoadingActiveProcesses(false)
      }
    }

    loadActiveProcesses()
  }, [])

  // Cargar distribución por tipo de servicio desde la API (optimizado)
  useEffect(() => {
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
          description: processApiErrorMessage(error?.message, "Error al cargar distribución por tipo de servicio"),
        })
      } finally {
        setLoadingServiceType(false)
      }
    }

    loadServiceTypeData()
  }, [])

  // Cargar fuentes de candidatos desde la API (optimizado)
  useEffect(() => {
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
          description: processApiErrorMessage(error?.message, "Error al cargar fuentes de candidatos"),
        })
      } finally {
        setLoadingCandidateSource(false)
      }
    }

    loadCandidateSourceData()
  }, [])

  // Cargar estadísticas generales desde la API (optimizado)
  useEffect(() => {
    const loadProcessStats = async () => {
      try {
        setLoadingProcessStats(true)
        const response = await solicitudService.getProcessStats()
        if (response.success && response.data) {
          const stats = response.data as { activeProcesses: number; avgTimeToHire: number; totalCandidates: number }
          setProcessStats(stats)
        } else {
          // Fallback: usar valores por defecto
          setProcessStats({ activeProcesses: 0, avgTimeToHire: 0, totalCandidates: 0 })
        }
      } catch (error: any) {
        console.error("[FRONTEND] Error al cargar estadísticas de procesos:", error)
        // Fallback: usar valores por defecto
        setProcessStats({ activeProcesses: 0, avgTimeToHire: 0, totalCandidates: 0 })
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "Error al cargar estadísticas de procesos"),
        })
      } finally {
        setLoadingProcessStats(false)
      }
    }

    loadProcessStats()
  }, [])

  useEffect(() => {
    const loadAverageTime = async () => {
      try {
        setLoadingAverageTime(true)
        const week =
          timePeriod === "week" && selectedWeekOption
            ? weekOptions.findIndex((option) => option.id === selectedWeekOption.id) + 1
            : undefined
        const periodType = timePeriod === "week" ? "week" : "month"

        const response = await solicitudService.getAverageProcessTimeByService(
          selectedYear,
          selectedMonth,
          week,
          periodType
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
          description: processApiErrorMessage(error?.message, "Error al cargar tiempo promedio por servicio"),
        })
      } finally {
        setLoadingAverageTime(false)
      }
    }

    loadAverageTime()
  }, [selectedYear, selectedMonth, selectedWeek, selectedWeekOption, weekOptions, timePeriod])

  useEffect(() => {
    const loadProcessOverview = async () => {
      try {
        setLoadingProcessOverview(true)
        const week =
          timePeriod === "week" && selectedWeekOption
            ? weekOptions.findIndex((option) => option.id === selectedWeekOption.id) + 1
            : undefined
        const periodType = timePeriod === "week" ? "week" : "month"

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
          description: processApiErrorMessage(error?.message, "Error al cargar resumen de procesos"),
        })
        } finally {
          setLoadingProcessOverview(false)
        }
      }

      loadProcessOverview()
    }, [selectedYear, selectedMonth, selectedWeek, selectedWeekOption, weekOptions, timePeriod])

  // useEffect separado para cargar procesos cerrados exitosos con sus propios filtros
  useEffect(() => {
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
        const periodType = closedProcessesTimePeriod === "week" ? "week" : "month"

        console.log('[DEBUG] Cargando procesos cerrados exitosos:', {
          year: closedProcessesYear,
          month: closedProcessesMonth,
          week,
          periodType
        })

        const response = await solicitudService.getClosedSuccessfulProcesses(
          closedProcessesYear,
          closedProcessesMonth,
          week,
          periodType
        )

        console.log('[DEBUG] Respuesta de procesos cerrados exitosos:', {
          success: response.success,
          dataLength: response.data?.length || 0,
          data: response.data
        })

        if (response.success && response.data) {
          setClosedSuccessfulProcesses(response.data)
        } else {
          setClosedSuccessfulProcesses([])
        }
      } catch (error: any) {
        console.error("Error al cargar procesos cerrados exitosos:", error)
        setClosedSuccessfulProcesses([])
        showToast({
          type: "error",
          title: "Error",
          description: processApiErrorMessage(error?.message, "Error al cargar procesos cerrados exitosos"),
        })
      } finally {
        setLoadingClosedProcesses(false)
      }
    }

    loadClosedSuccessfulProcesses()
  }, [closedProcessesYear, closedProcessesMonth, closedProcessesWeek, selectedClosedProcessesWeekOption, closedProcessesWeekOptions, closedProcessesTimePeriod])

  // Cargar datos de rendimiento por consultor
  useEffect(() => {
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
          description: processApiErrorMessage(error?.message, "Error al cargar rendimiento por consultor"),
        })
      } finally {
        setLoadingPerformance(false)
      }
    }

    loadPerformanceData()
  }, [])

  // Cargar estadísticas de cumplimiento
  useEffect(() => {
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
          description: processApiErrorMessage(error?.message, "Error al cargar estadísticas de cumplimiento"),
        })
      } finally {
        setLoadingCompletion(false)
      }
    }

    loadCompletionStats()
  }, [])

  // Cargar hitos vencidos por consultor
  useEffect(() => {
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
          description: processApiErrorMessage(error?.message, "Error al cargar hitos vencidos"),
        })
      } finally {
        setLoadingOverdue(false)
      }
    }

    loadOverdueHitos()
  }, [])

  // Colores para los estados
  const statusColors: Record<string, string> = {
    "Iniciado": "#00BCD4",
    "En Progreso": "#1E3A8A",
    "En Revisión": "#10b981",
    "Completado": "#3b82f6",
    "Pausado": "#f59e0b",
    "Cancelado": "#ef4444",
  }

  const statusDisplayOrder = ["Iniciado", "En Progreso", "En Revisión", "Pausado", "Completado", "Cancelado"]

  const periodProcesses = processOverview?.processes ?? []
  const periodTotals = processOverview?.totals ?? {
    total: 0,
    inProgress: 0,
    completed: 0,
    paused: 0,
    cancelled: 0,
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

  const processesInProgress = useMemo(
    () =>
      periodProcesses.filter((process) =>
        ["Iniciado", "En Progreso", "En Revisión"].includes(process.status),
      ),
    [periodProcesses],
  )

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

  const averageTimeChartData = useMemo(
    () =>
      averageTimeData
        .filter((item) => item.sampleSize > 0 && item.averageDays > 0)
        .map((item) => ({
          service: item.serviceName,
          days: item.averageDays,
          sampleSize: item.sampleSize,
        })),
    [averageTimeData],
  )

  const activeProcessesData = Object.entries(activeProcesses).map(([name, count]) => ({
    name,
    procesos: count,
  }))

  // Usar datos reales de la API para las estadísticas
  const avgTimeToHire = processStats.avgTimeToHire || 0
  const totalCandidates = processStats.totalCandidates || 0
  const totalActiveProcesses = processStats.activeProcesses || 0
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
      // Preparar datos para el Excel
      const excelData: any[] = []
      
      closedSuccessfulProcesses.forEach((process) => {
        if (process.candidatos_exitosos.length > 0) {
          // Si hay candidatos exitosos, crear una fila por cada candidato
          process.candidatos_exitosos.forEach((candidato, index) => {
            excelData.push({
              'ID Solicitud': process.id_solicitud,
              'Tipo de Servicio': process.tipo_servicio,
              'Nombre del Servicio': process.nombre_servicio,
              'Cliente': process.cliente,
              'Cargo': process.cargo || 'Sin cargo',
              'Contacto': process.contacto || 'Sin contacto',
              'Comuna': process.comuna || 'Sin comuna',
              'Total Candidatos': process.total_candidatos,
              'Candidatos Exitosos (Total)': process.candidatos_exitosos.length,
              'Candidato Exitoso - Nombre': candidato.nombre,
              'Candidato Exitoso - RUT': candidato.rut,
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
            'Contacto': process.contacto || 'Sin contacto',
            'Comuna': process.comuna || 'Sin comuna',
            'Total Candidatos': process.total_candidatos,
            'Candidatos Exitosos (Total)': 0,
            'Candidato Exitoso - Nombre': '',
            'Candidato Exitoso - RUT': '',
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
        { wch: 25 }, // Contacto
        { wch: 20 }, // Comuna
        { wch: 18 }, // Total Candidatos
        { wch: 22 }, // Candidatos Exitosos (Total)
        { wch: 35 }, // Candidato Exitoso - Nombre
        { wch: 15 }, // Candidato Exitoso - RUT
      ]
      worksheet['!cols'] = columnWidths

      // Crear libro de trabajo
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Procesos Cerrados Exitosos')

      // Generar nombre de archivo con fecha
      const periodLabel = closedProcessesTimePeriod === "week" 
        ? `Semana_${selectedClosedProcessesWeekOption?.label || 'actual'}`
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes y KPIs</h1>
        <p className="text-muted-foreground">Análisis integral de rendimiento y métricas operativas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procesos Activos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProcessStats ? (
              <div className="flex items-center justify-center h-12">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
            <div className="text-2xl font-bold">{totalActiveProcesses}</div>
            <p className="text-xs text-muted-foreground">En curso actualmente</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProcessStats ? (
              <div className="flex items-center justify-center h-12">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
            <div className="text-2xl font-bold">{avgTimeToHire} días</div>
            <p className="text-xs text-muted-foreground">Time-to-hire promedio</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidatos Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProcessStats ? (
              <div className="flex items-center justify-center h-12">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
            <div className="text-2xl font-bold">{totalCandidates}</div>
            <p className="text-xs text-muted-foreground">En todos los procesos</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="estados" className="space-y-4">
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
                      const next = value as "month" | "week"
                      setTimePeriod(next)
                      if (next === "week") {
                        const defaultInfo = getDefaultWeekInfo()
                        setSelectedYear(defaultInfo.year)
                        setSelectedWeek(defaultInfo.id)
                      }
                    }}
                    className="grid grid-cols-2 w-full md:w-fit"
                  >
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
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total del Período</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{periodTotals.total}</div>
                <p className="text-xs text-muted-foreground">
                  {timePeriod === "week"
                    ? selectedWeekOption?.label ?? "Semana seleccionada"
                    : `${monthNames[selectedMonth]} ${selectedYear}`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Curso</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{periodTotals.inProgress}</div>
                <p className="text-xs text-muted-foreground">Procesos activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completados</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {periodTotals.completed}
                </div>
                <p className="text-xs text-muted-foreground">Finalizados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pausados</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {periodTotals.paused}
                </div>
                <p className="text-xs text-muted-foreground">Requieren atención</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
                <CardTitle>Tiempo Promedio por Servicio</CardTitle>
                <CardDescription>Comparación entre procesos Hunting y Proceso Completo</CardDescription>
            </CardHeader>
            <CardContent>
                {loadingAverageTime ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Cargando datos...</p>
                    </div>
                  </div>
                ) : averageTimeChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-sm text-muted-foreground">No hay procesos cerrados en el período seleccionado</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={averageTimeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="service" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number, _name, payload) => [
                          `${value} días`,
                          `Promedio (${payload.payload.sampleSize} procesos)`,
                        ]}
                      />
                      <Bar dataKey="days" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
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
                ) : processStatusData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-sm text-muted-foreground">No hay datos para el período seleccionado</p>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={processStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [`${value} procesos`, "Cantidad"]} />
                      <Bar dataKey="count">
                        {processStatusData.map((entry, index) => (
                          <Cell key={`status-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

            <Card>
              <CardHeader>
              <CardTitle>Procesos con Urgencia</CardTitle>
              <CardDescription>Basado en el plazo máximo de cierre definido para cada proceso</CardDescription>
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
                    <BarChart data={urgencyChartData}>
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
                        Procesos por vencer ({urgencySummary.dueSoonCount})
                      </h4>
                      {urgencySummary.dueSoonProcesses.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No hay procesos próximos a vencer.</p>
                      ) : (
                        <ul className="space-y-3 text-xs">
                          {periodProcesses
                            .filter((process) => urgencySummary.dueSoonProcesses.includes(process.id))
                            .slice(0, 5)
                            .map((process) => (
                              <li key={`due-soon-${process.id}`} className="border-b pb-2 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-foreground">{process.client}</span>
                                    <span className="text-amber-600 font-medium whitespace-nowrap">
                                      {process.daysUntilDeadline !== null
                                        ? `${process.daysUntilDeadline} días`
                                        : "Sin plazo"}
                                    </span>
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
                      )}
                    </div>

                    <div className="border rounded-md p-4">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <span className="inline-block h-2 w-2 rounded-full bg-red-600"></span>
                        Procesos vencidos ({urgencySummary.overdueCount})
                      </h4>
                      {urgencySummary.overdueProcesses.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No hay procesos vencidos en el período.</p>
                      ) : (
                        <ul className="space-y-3 text-xs">
                          {periodProcesses
                            .filter((process) => urgencySummary.overdueProcesses.includes(process.id))
                            .slice(0, 5)
                            .map((process) => (
                              <li key={`overdue-${process.id}`} className="border-b pb-2 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-foreground">{process.client}</span>
                                    <span className="text-red-600 font-medium whitespace-nowrap">
                                      {process.daysUntilDeadline !== null
                                        ? `Vencido hace ${Math.abs(process.daysUntilDeadline)} días`
                                        : "Sin plazo"}
                                    </span>
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
                      )}
                    </div>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Procesos en Curso -{" "}
                {timePeriod === "week"
                  ? selectedWeekOption?.label ?? "Semana seleccionada"
                  : `${monthNames[selectedMonth]} ${selectedYear}`}
              </CardTitle>
              <CardDescription>Lista detallada de procesos activos en el período seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              {processesInProgress.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">No hay procesos en curso</h3>
                  <p className="text-muted-foreground">
                    No se encontraron procesos activos para el período seleccionado
                  </p>
                </div>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Posición</TableHead>
                      <TableHead>Tipo de Proceso</TableHead>
                      <TableHead>Consultor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Días Transcurridos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {paginatedProcessesInProgress.map((process) => {
                        const startDate = process.startDate ? new Date(process.startDate) : null
                        const daysSinceStart =
                          startDate !== null
                            ? Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                            : 0

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
                          <TableCell>
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
                            <TableCell>{startDate ? startDate.toLocaleDateString() : "Sin fecha"}</TableCell>
                          <TableCell>
                            <span className={daysSinceStart > 60 ? "text-red-600 font-medium" : ""}>
                              {daysSinceStart} días
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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
            <Card>
              <CardHeader>
                <CardTitle>Carga Operativa por Consultor</CardTitle>
                <CardDescription>Procesos activos asignados</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingActiveProcesses ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Cargando datos...</p>
                    </div>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(activeProcesses).map(([name, count]) => ({
                      name,
                      procesos: count,
                    }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="procesos" fill="#00BCD4" />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tipo de Servicio Total (En Progreso, Cerrados, Congelados, Cancelados)</CardTitle>
                <CardDescription>Distribución de procesos por categoría</CardDescription>
              </CardHeader>
              <CardContent>
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
                  <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={serviceTypeData}
                      cx="50%"
                      cy="50%"
                        startAngle={300}
                        endAngle={-130}
                        labelLine={true}
                      label={({ service, percentage }) => `${service}: ${percentage}%`}
                        outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
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
                    <div className="flex items-center justify-center h-[250px]">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Cargando datos...</p>
                      </div>
                    </div>
                  ) : candidateSourceData.length === 0 ? (
                    <div className="flex items-center justify-center h-[250px]">
                      <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={candidateSourceData}>
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
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={candidateSourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ source, candidates }) => `${source}: ${candidates}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="candidates"
                      >
                        {candidateSourceData.map((entry, index) => (
                          <Cell key={`cell-candidate-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
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
                          variant={consultant.efficiency >= 85 ? "default" : "destructive"}
                          className={consultant.efficiency >= 85 ? "bg-green-100 text-green-800" : ""}
                        >
                          {consultant.efficiency}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={completionStats.map((stat) => ({
                      name: stat.consultant,
                      aTiempo: stat.onTime,
                      retrasados: stat.delayed,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="aTiempo" fill="#10b981" name="A Tiempo" />
                      <Bar dataKey="retrasados" fill="#dc2626" name="Retrasados" />
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
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.entries(overdueHitos).map(([name, vencidos]) => ({
                      name,
                      vencidos,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="vencidos" fill="#dc2626" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filtros de Período</CardTitle>
              <CardDescription>Selecciona el período para la tabla de procesos cerrados exitosos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <ToggleGroup
                    type="single"
                    value={closedProcessesTimePeriod}
                    onValueChange={(value) => {
                      if (!value) return
                      const next = value as "month" | "week"
                      setClosedProcessesTimePeriod(next)
                      if (next === "week") {
                        const defaultInfo = getDefaultWeekInfo()
                        setClosedProcessesYear(defaultInfo.year)
                        setClosedProcessesWeek(defaultInfo.id)
                      }
                    }}
                    className="grid grid-cols-2 w-full md:w-fit"
                  >
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
                ) : (
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
                )}
              </div>
            </CardContent>
          </Card>

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
              {loadingClosedProcesses ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Cargando datos...</p>
                  </div>
                </div>
              ) : closedSuccessfulProcesses.length === 0 ? (
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
                        <TableHead>Contacto</TableHead>
                        <TableHead>Comuna</TableHead>
                        <TableHead className="text-center">Total Candidatos</TableHead>
                        <TableHead className="text-center">Candidatos Exitosos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedSuccessfulProcesses.map((process) => {
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
                              <TableCell>{process.cargo || "Sin cargo"}</TableCell>
                              <TableCell>{process.contacto || "Sin contacto"}</TableCell>
                              <TableCell>{process.comuna || "Sin comuna"}</TableCell>
                              <TableCell className="text-center">{process.total_candidatos}</TableCell>
                              <TableCell className="text-center">
                                {process.candidatos_exitosos.length > 0 ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800">
                                    {process.candidatos_exitosos.length}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && process.candidatos_exitosos.length > 0 && (
                              <TableRow>
                                <TableCell colSpan={8} className="bg-muted/50">
                                  <div className="p-4 space-y-2">
                                    <h4 className="font-semibold text-sm mb-3">Candidatos Exitosos:</h4>
                                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                      {process.candidatos_exitosos.map((candidato, idx) => (
                                        <div key={idx} className="border rounded-md p-2 text-sm">
                                          <p className="font-medium">{candidato.nombre}</p>
                                          <p className="text-muted-foreground">RUT: {candidato.rut}</p>
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
