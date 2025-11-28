"use client"

import { useState, useEffect, useRef } from "react"
import type { Process } from "@/lib/types"
import { descripcionCargoService, tipoServicioService } from "@/lib/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL

interface HookSolicitud extends Process {
  // Campos de compatibilidad para filtros
  cargo?: string
  cliente?: string
  consultor?: string
  estado_solicitud?: string
  tipo_servicio_nombre?: string
  fecha_creacion?: string
  id_descripcion_cargo?: number
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function useSolicitudes() {
  const [solicitudes, setSolicitudes] = useState<HookSolicitud[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"fecha" | "cargo" | "cliente">("fecha")
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC")
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalSolicitudes, setTotalSolicitudes] = useState(0)
  
  // Estado para almacenar todos los tipos de servicio disponibles (con código y nombre)
  const [allServiceTypes, setAllServiceTypes] = useState<Array<{codigo: string, nombre: string}>>([])
  
  // Estado para almacenar las estadísticas
  const [stats, setStats] = useState({
    total: 0,
    en_progreso: 0,
    completadas: 0,
    pendientes: 0,
  })

  // Referencias para rastrear valores anteriores de filtros
  const prevSearchTerm = useRef(searchTerm)
  const prevStatusFilter = useRef(statusFilter)
  const prevServiceFilter = useRef(serviceFilter)

  // Función para obtener solicitudes con paginación y filtros
  const fetchSolicitudes = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchTerm,
        sortBy,
        sortOrder,
      })

      // Agregar filtros solo si no son "all"
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (serviceFilter !== "all") {
        params.append("service_type", serviceFilter)
      }

      const res = await fetch(`${API_URL}/api/solicitudes?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
      })

      const data = await res.json()
      
      if (res.ok && data?.success) {
        // Manejar diferentes estructuras de respuesta después del merge
        const solicitudesArray = data.data?.solicitudes || data.data || []
        const paginationInfo = data.data?.pagination || { total: solicitudesArray.length, totalPages: 1 }
        
        const transformedSolicitudes = solicitudesArray.map((solicitud: any) => ({
          id: solicitud.id.toString(),
          client_id: solicitud.client_id || solicitud.id.toString(),
          client: solicitud.client || {
            id: solicitud.client_id || solicitud.id.toString(),
            name: solicitud.cliente || 'Sin cliente',
            contacts: []
          },
          contact_id: solicitud.contact_id || '',
          service_type: solicitud.service_type || solicitud.tipo_servicio || '',
          position_title: solicitud.position_title || solicitud.cargo || 'Sin cargo',
          description: solicitud.description || '',
          requirements: solicitud.requirements || '',
          vacancies: solicitud.vacancies || 1,
          consultant_id: solicitud.consultant_id || '',
          consultant: solicitud.consultant || {
            id: solicitud.consultant_id || '',
            name: solicitud.consultor || 'Sin asignar',
            email: '',
            role: 'consultor' as const
          },
          status: solicitud.status || 'creado',
          created_at: solicitud.created_at || solicitud.fecha_creacion || new Date().toISOString(),
          started_at: solicitud.started_at || null,
          completed_at: solicitud.completed_at || null,
          excel_file: solicitud.excel_file || undefined,
          // Campos de compatibilidad
          cargo: solicitud.cargo || solicitud.position_title || 'Sin cargo',
          cliente: solicitud.cliente || 'Sin cliente',
          consultor: solicitud.consultor || 'Sin asignar',
          estado_solicitud: solicitud.estado_solicitud || 'Creado',
          tipo_servicio_nombre: solicitud.tipo_servicio_nombre || solicitud.service_type || '',
          fecha_creacion: solicitud.fecha_creacion || solicitud.created_at || new Date().toISOString(),
          id_descripcion_cargo: solicitud.id_descripcion_cargo || 0,
        }))
        
        setSolicitudes(transformedSolicitudes)
        setTotalSolicitudes(paginationInfo.total || transformedSolicitudes.length)
        setTotalPages(paginationInfo.totalPages || 1)
      } else {
        console.error("Error fetching solicitudes:", data?.message || "Error desconocido")
        setSolicitudes([])
        setTotalSolicitudes(0)
        setTotalPages(0)
      }
    } catch (error) {
      console.error("Error fetching solicitudes:", error)
      setSolicitudes([])
      setTotalSolicitudes(0)
      setTotalPages(0)
    } finally {
      setIsLoading(false)
    }
  }

  // Función para cargar estadísticas y tipos de servicio
  const fetchStatsAndServiceTypes = async () => {
    try {
      // Hacer una llamada sin paginación para obtener todas las solicitudes para estadísticas
      const res = await fetch(`${API_URL}/api/solicitudes/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
      })

      const data = await res.json()
      
      if (res.ok && data?.success) {
        const allSolicitudes = data.data || []
        
        // Calcular estadísticas
        const total = allSolicitudes.length
        const en_progreso = allSolicitudes.filter((s: any) => 
          s.status === 'en_progreso' || s.estado_solicitud === 'En Progreso'
        ).length
        const completadas = allSolicitudes.filter((s: any) => 
          s.status === 'cerrado' || s.estado_solicitud === 'Cerrado'
        ).length
        const pendientes = allSolicitudes.filter((s: any) => 
          s.status === 'creado' || s.estado_solicitud === 'Creado'
        ).length
        
        setStats({
          total,
          en_progreso,
          completadas,
          pendientes,
        })
      }
      
      // Obtener tipos de servicio completos desde la API
      const serviceTypesResponse = await tipoServicioService.getAll()
      if (serviceTypesResponse.success && serviceTypesResponse.data) {
        setAllServiceTypes(serviceTypesResponse.data)
      } else {
        // Fallback: extraer tipos de servicio de las solicitudes si falla la API
        const serviceTypes = Array.from(
          new Set(
            (data?.data || [])
              .map((s: any) => s.service_type || s.tipo_servicio)
              .filter(Boolean)
          )
        ).sort().map((codigo: string) => ({ codigo, nombre: codigo }))
        
        setAllServiceTypes(serviceTypes)
      }
    } catch (error) {
      console.error("Error fetching stats and service types:", error)
    }
  }

  // Efecto inicial para cargar estadísticas y tipos de servicio
  useEffect(() => {
    fetchStatsAndServiceTypes()
  }, []) // Solo ejecutar al montar el componente

  // Efecto para recargar solicitudes cuando cambien los filtros o paginación
  useEffect(() => {
    // Detectar si cambiaron los filtros (no la paginación)
    const searchChanged = prevSearchTerm.current !== searchTerm
    const statusChanged = prevStatusFilter.current !== statusFilter
    const serviceChanged = prevServiceFilter.current !== serviceFilter
    
    // Si cambiaron los filtros, resetear a página 1
    if ((searchChanged || statusChanged || serviceChanged) && currentPage !== 1) {
      setCurrentPage(1)
      return
    }
    
    // Actualizar las referencias después de verificar cambios
    prevSearchTerm.current = searchTerm
    prevStatusFilter.current = statusFilter
    prevServiceFilter.current = serviceFilter
    
    // Debounce para búsqueda
    const timeoutId = setTimeout(() => {
      fetchSolicitudes()
    }, searchTerm ? 300 : 0) // 300ms de debounce solo para búsqueda

    return () => clearTimeout(timeoutId)
  }, [currentPage, pageSize, searchTerm, statusFilter, serviceFilter, sortBy, sortOrder])

  // Función para eliminar solicitud
  const deleteSolicitud = async (solicitudId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/solicitudes/${solicitudId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
      })

      const data = await res.json()
      
      if (res.ok && data?.success) {
        setSolicitudes(solicitudes.filter((solicitud) => solicitud.id !== solicitudId))
        return { success: true, message: data?.message }
      } else {
        return { success: false, message: data?.message || "Error eliminando solicitud" }
      }
    } catch (err) {
      console.error(err)
      return { success: false, message: "Error eliminando solicitud" }
    }
  }

  // Funciones de paginación
  const goToPage = (page: number) => {
    setCurrentPage(page)
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  // Función para refrescar todos los datos (solicitudes y estadísticas)
  const refreshData = async () => {
    await fetchSolicitudes()
    // Recargar estadísticas y tipos de servicio
    await fetchStatsAndServiceTypes()
  }

  return {
    // Estados
    solicitudes,
    isLoading,
    searchTerm,
    statusFilter,
    serviceFilter,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    totalPages,
    totalSolicitudes,
    stats,
    serviceTypes: allServiceTypes, // Usar la lista completa de tipos de servicio
    
    // Setters
    setSearchTerm,
    setStatusFilter,
    setServiceFilter,
    setSortBy,
    setSortOrder,
    
    // Funciones
    fetchSolicitudes,
    refreshData,
    deleteSolicitud,
    goToPage,
    nextPage,
    prevPage,
    handlePageSizeChange,
  }
}
