"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { tipoServicioService } from "@/lib/api"
import { appendMultiQueryParam, isFilterActive, type MultiFilterValue } from "@/lib/multi-filter-utils"

const API_URL = process.env.NEXT_PUBLIC_API_URL

interface ConsultorProcess {
  id: string
  cargo: string
  position_title?: string
  cliente: string
  tipo_servicio: string
  tipo_servicio_nombre: string
  consultor: string
  estado_solicitud: string
  status: string
  etapa: string
  fecha_creacion: string
  created_at?: string
  started_at?: string
  completed_at?: string
  vacancies?: number
  vacantes?: number
}

export function useConsultorProcesses(consultorId: string | undefined) {
  const [pendingProcesses, setPendingProcesses] = useState<ConsultorProcess[]>([])
  const [otherProcesses, setOtherProcesses] = useState<ConsultorProcess[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<MultiFilterValue>([])
  const [serviceFilter, setServiceFilter] = useState<MultiFilterValue>([])

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalProcesses, setTotalProcesses] = useState(0)

  const [allServiceTypes, setAllServiceTypes] = useState<string[]>([])

  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    en_progreso: 0,
    completados: 0,
    congelados: 0,
    cancelados: 0,
    cierre_extraordinario: 0
  })

  const prevSearchTerm = useRef(searchTerm)
  const prevStatusFilter = useRef(statusFilter)
  const prevServiceFilter = useRef(serviceFilter)

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
  })

  const fetchStats = useCallback(async () => {
    if (!consultorId) return

    try {
      const res = await fetch(
        `${API_URL}/api/solicitudes/stats?consultor_id=${consultorId}`,
        { headers: authHeaders() }
      )
      const data = await res.json()

      if (res.ok && data?.success && data.data) {
        setStats({
          total: data.data.total ?? 0,
          pendientes: data.data.pendientes ?? 0,
          en_progreso: data.data.en_progreso ?? 0,
          completados: data.data.completadas ?? 0,
          congelados: data.data.congelados ?? 0,
          cancelados: data.data.cancelados ?? 0,
          cierre_extraordinario: data.data.cierre_extraordinario ?? 0,
        })
      }
    } catch (error) {
      console.error("Error fetching consultor stats:", error)
    }
  }, [consultorId])

  const fetchServiceTypes = useCallback(async () => {
    try {
      const response = await tipoServicioService.getAll()
      if (response.success && response.data) {
        setAllServiceTypes(response.data.map((s) => s.nombre || s.codigo).filter(Boolean))
      }
    } catch (error) {
      console.error("Error fetching service types:", error)
    }
  }, [])

  const fetchPendingProcesses = useCallback(async () => {
    if (!consultorId) return

    try {
      const res = await fetch(
        `${API_URL}/api/solicitudes?consultor_id=${consultorId}&status=creado&limit=200&sortBy=fecha&sortOrder=DESC`,
        { headers: authHeaders() }
      )
      const data = await res.json()

      if (res.ok && data?.success) {
        const solicitudes = data.data?.solicitudes || data.data || []
        setPendingProcesses(solicitudes)
      }
    } catch (error) {
      console.error("Error fetching pending processes:", error)
    }
  }, [consultorId])

  const fetchOtherProcesses = useCallback(async () => {
    if (!consultorId) return

    try {
      setIsLoading(true)

      const params = new URLSearchParams({
        consultor_id: consultorId,
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchTerm,
        exclude_status: "creado",
        sortBy: "fecha",
        sortOrder: "DESC",
      })

      appendMultiQueryParam(params, "status", statusFilter)
      appendMultiQueryParam(params, "service_type", serviceFilter)

      const res = await fetch(`${API_URL}/api/solicitudes?${params}`, {
        headers: authHeaders(),
      })

      const data = await res.json()

      if (res.ok && data?.success) {
        const solicitudes = data.data?.solicitudes || data.data || []
        setOtherProcesses(solicitudes)
        setTotalProcesses(data.data?.pagination?.total || solicitudes.length)
        setTotalPages(data.data?.pagination?.totalPages || 1)
      }
    } catch (error) {
      console.error("Error fetching other processes:", error)
    } finally {
      setIsLoading(false)
    }
  }, [consultorId, currentPage, pageSize, searchTerm, statusFilter, serviceFilter])

  useEffect(() => {
    if (!consultorId) return
    void Promise.all([fetchStats(), fetchPendingProcesses(), fetchServiceTypes()])
  }, [consultorId, fetchStats, fetchPendingProcesses, fetchServiceTypes])

  useEffect(() => {
    if (!consultorId) return

    const searchChanged = prevSearchTerm.current !== searchTerm
    const statusChanged = prevStatusFilter.current.join(",") !== statusFilter.join(",")
    const serviceChanged = prevServiceFilter.current.join(",") !== serviceFilter.join(",")

    if ((searchChanged || statusChanged || serviceChanged) && currentPage !== 1) {
      setCurrentPage(1)
      return
    }

    prevSearchTerm.current = searchTerm
    prevStatusFilter.current = statusFilter
    prevServiceFilter.current = serviceFilter

    fetchOtherProcesses()
  }, [consultorId, currentPage, pageSize, searchTerm, statusFilter, serviceFilter, fetchOtherProcesses])

  const goToPage = (page: number) => setCurrentPage(page)
  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }
  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }
  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  const refreshData = async () => {
    await Promise.all([fetchStats(), fetchPendingProcesses(), fetchOtherProcesses()])
  }

  const hasFiltersApplied =
    searchTerm !== "" ||
    isFilterActive(statusFilter) ||
    isFilterActive(serviceFilter)

  return {
    pendingProcesses,
    otherProcesses,
    isLoading,
    stats,
    serviceTypes: allServiceTypes,
    searchTerm,
    statusFilter,
    serviceFilter,
    setSearchTerm,
    setStatusFilter,
    setServiceFilter,
    hasFiltersApplied,
    currentPage,
    pageSize,
    totalPages,
    totalProcesses,
    goToPage,
    nextPage,
    prevPage,
    handlePageSizeChange,
    refreshData,
  }
}
