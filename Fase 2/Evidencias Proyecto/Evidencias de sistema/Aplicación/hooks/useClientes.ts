"use client"

import { useState, useEffect } from "react"
import type { Client } from "@/lib/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL

interface HookClient extends Client {
  // Campos de compatibilidad para filtros
  nombre?: string
  apellido?: string
  status?: string
  created_at?: string
}

interface NewClientInput {
  name: string
  contacts: Array<{
    id?: string
    name: string
    email: string
    phone: string
    position: string
    city: string
    region: string
    is_primary: boolean
  }>
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export function useClientes() {
  const [clients, setClients] = useState<HookClient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"nombre" | "contactos">("nombre")
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC")
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalClients, setTotalClients] = useState(0)
  
  // Estados de estadísticas
  const [totalContactos, setTotalContactos] = useState(0)
  const [clientesActivos, setClientesActivos] = useState(0)
  
  // Estados para formularios
  const [newClient, setNewClient] = useState<NewClientInput>({
    name: "",
    contacts: [
      {
        id: "",
        name: "",
        email: "",
        phone: "",
        position: "",
        city: "",
        region: "",
        is_primary: true,
      },
    ],
  })
  const [editingClient, setEditingClient] = useState<HookClient | null>(null)

  // Función para obtener estadísticas de clientes
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/clientes/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
      })

      const data = await res.json()
      
      if (res.ok && data?.success) {
        setTotalClients(data.data.total_clientes || 0)
        setTotalContactos(data.data.total_contactos || 0)
        setClientesActivos(data.data.clientes_activos || 0)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  // Función para obtener clientes con paginación y filtros
  const fetchClients = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchTerm,
        sortBy,
        sortOrder,
      })

      const res = await fetch(`${API_URL}/api/clientes?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
      })

      const data = await res.json()
      
      if (res.ok && data?.success) {
        const transformedClients = data.data.clients.map((client: any) => ({
          id: client.id,
          name: client.name,
          contacts: client.contacts || [],
          processCount: client.processCount || 0,
          // Campos de compatibilidad
          nombre: client.name,
          apellido: "",
          status: "activo",
          created_at: new Date().toISOString(),
        }))
        
        setClients(transformedClients)
        setTotalPages(data.data.pagination.totalPages)
        
        // Cargar estadísticas en paralelo
        fetchStats()
      } else {
        console.error("Error fetching clients:", data?.message)
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Efecto para recargar clientes cuando cambien los filtros o paginación
  useEffect(() => {
    // Reset a la página 1 cuando cambie el término de búsqueda
    if (searchTerm !== "" && currentPage !== 1) {
      setCurrentPage(1)
      return
    }
    
    // Debounce para búsqueda
    const timeoutId = setTimeout(() => {
      fetchClients()
    }, searchTerm ? 300 : 0) // 300ms de debounce solo para búsqueda

    return () => clearTimeout(timeoutId)
  }, [currentPage, pageSize, searchTerm, sortBy, sortOrder])

  // Función para crear cliente
  const createClient = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/clientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
        body: JSON.stringify({
          name: newClient.name,
          contacts: newClient.contacts,
        }),
      })

      const data = await res.json()
      
      if (res.ok && data?.success) {
        const created = data.data
        setClients([
          ...clients,
          {
            id: created.id,
            name: created.name,
            contacts: created.contacts || [],
            processCount: created.processCount || 0,
            // Campos de compatibilidad
            nombre: created.name,
            apellido: "",
            status: "activo",
            created_at: new Date().toISOString(),
          },
        ])
        setNewClient({
          name: "",
          contacts: [
            {
              id: "",
              name: "",
              email: "",
              phone: "",
              position: "",
              city: "",
              region: "",
              is_primary: true,
            },
          ],
        })
        return { success: true, message: data?.message }
      } else {
        return { success: false, message: data?.message || "Ha ocurrido un error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente." }
      }
    } catch (err: any) {
      console.error('Error creating client:', err)
      return { success: false, message: "Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde." }
    }
  }

  // Función para actualizar cliente
  const updateClient = async (): Promise<{ success: boolean; message?: string }> => {
    if (!editingClient) return { success: false, message: "No hay cliente seleccionado para editar" }

    try {
      const res = await fetch(`${API_URL}/api/clientes/${editingClient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
        body: JSON.stringify({
          name: newClient.name,
          contacts: newClient.contacts,
        }),
      })

      const data = await res.json()
      
      if (res.ok && data?.success) {
        // Actualizar la lista local con el cliente modificado
        setClients(clients.map((client) => 
          client.id === editingClient.id 
            ? {
                ...client,
                name: newClient.name,
                contacts: newClient.contacts,
                processCount: client.processCount || 0, // Mantener el conteo existente
                // Campos de compatibilidad
                nombre: newClient.name,
              } as HookClient
            : client
        ))
        setEditingClient(null)
        setNewClient({
          name: "",
          contacts: [
            {
              id: "",
              name: "",
              email: "",
              phone: "",
              position: "",
              city: "",
              region: "",
              is_primary: true,
            },
          ],
        })
        return { success: true, message: data?.message }
      } else {
        return { success: false, message: data?.message || "Ha ocurrido un error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente." }
      }
    } catch (err: any) {
      console.error('Error updating client:', err)
      return { success: false, message: "Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde." }
    }
  }

  // Función para eliminar cliente
  const deleteClient = async (clientId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/clientes/${clientId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
      })

      const data = await res.json()
      
      if (res.ok && data?.success) {
        setClients(clients.filter((client) => client.id !== clientId))
        return { success: true, message: data?.message }
      } else {
        return { success: false, message: data?.message || "Ha ocurrido un error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente." }
      }
    } catch (err: any) {
      console.error('Error deleting client:', err)
      return { success: false, message: "Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde." }
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

  return {
    // Estados
    clients,
    isLoading,
    searchTerm,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    totalPages,
    totalClients,
    totalContactos,
    clientesActivos,
    newClient,
    editingClient,
    
    // Setters
    setSearchTerm,
    setSortBy,
    setSortOrder,
    setNewClient,
    setEditingClient,
    
    // Funciones
    fetchClients,
    fetchStats,
    createClient,
    updateClient,
    deleteClient,
    goToPage,
    nextPage,
    prevPage,
    handlePageSizeChange,
  }
}
