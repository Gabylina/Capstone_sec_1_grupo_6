"use client"

import { useState, useEffect } from "react"
import type { User } from "../lib/types"
import { appendMultiQueryParam, isFilterActive, type MultiFilterValue } from "@/lib/multi-filter-utils"
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface NewUserInput {
  rut: string
  nombre: string
  apellido: string
  email: string
  password: string
  role: "admin" | "consultor"
  status: "habilitado" | "inhabilitado"
}

type HookUser = User & {
  nombre?: string
  apellido?: string
  status?: "habilitado" | "inhabilitado"
  created_at?: string
}

export function useUsuarios() {
  const [users, setUsers] = useState<HookUser[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<MultiFilterValue>([])
  const [roleFilter, setRoleFilter] = useState<MultiFilterValue>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  
  // Stats state
  const [totalConsultores, setTotalConsultores] = useState(0)
  const [totalAdministradores, setTotalAdministradores] = useState(0)
  
  const [newUser, setNewUser] = useState<NewUserInput>({
    rut: "",
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    role: "consultor",
    status: "habilitado",
  })

  // -------------------
  // Filtros - ahora manejados por la API
  // -------------------
  const filteredUsers = users // Los filtros se aplican en la API

  // Refetch cuando cambien los filtros o paginación
  useEffect(() => {
    fetchUsers()
  }, [searchTerm, statusFilter, roleFilter, currentPage, pageSize])

  // -------------------
  // CRUD
  // -------------------
  
  // Función para obtener estadísticas de usuarios
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("llc_token")}` },
      })
      const data = await res.json()
      
      if (data.success) {
        setTotalUsers(data.data.total_usuarios || 0)
        setTotalConsultores(data.data.total_consultores || 0)
        setTotalAdministradores(data.data.total_administradores || 0)
      }
    } catch (err) {
      console.error("Error cargando estadísticas:", err)
    }
  }
  
  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      // Construir query params para filtros y paginación
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      appendMultiQueryParam(params, 'role', roleFilter)
      appendMultiQueryParam(params, 'status', statusFilter)
      params.append('page', currentPage.toString())
      params.append('limit', pageSize.toString())
      
      const res = await fetch(`${API_URL}/api/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("llc_token")}` },
      })
      const data = await res.json()
      if (data.success) {
        // Mapear la respuesta de la API al formato esperado
        const mappedUsers: HookUser[] = data.data.users.map((u: any) => ({
          id: u.rut_usuario,
          firstName: u.nombre_usuario,
          lastName: u.apellido_usuario,
          email: u.email_usuario,
          role: u.rol_usuario === 1 ? "admin" : "consultor",
          isActive: u.activo_usuario,
          // Campos de compatibilidad para filtros
          nombre: u.nombre_usuario,
          apellido: u.apellido_usuario,
          status: u.activo_usuario ? "habilitado" : "inhabilitado",
        }))
        setUsers(mappedUsers)
        
        // Actualizar información de paginación
        if (data.data.pagination) {
          setTotalPages(data.data.pagination.totalPages)
        }
        
        // Cargar estadísticas en paralelo
        fetchStats()
      }
    } catch (err) {
      console.error("Error cargando usuarios:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const createUser = async (): Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }> => {
    try {
      const res = await fetch(`${API_URL}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
        body: JSON.stringify({
          rut_usuario: newUser.rut,
          nombre_usuario: newUser.nombre,
          apellido_usuario: newUser.apellido,
          email_usuario: newUser.email,
          rol_usuario: newUser.role === "admin" ? 1 : 2,
          activo_usuario: newUser.status === "habilitado",
          contrasena_usuario: newUser.password,
        }),
      })
      
      // Intentar parsear la respuesta JSON sin importar el código de estado
      let data
      try {
        const text = await res.text()
        data = text ? JSON.parse(text) : {}
      } catch (err) {
        data = {}
      }
      
      if (res.ok && data?.success) {
        const created = data.data
        setUsers([
          ...users,
          {
            id: created?.rut_usuario || newUser.rut,
            firstName: newUser.nombre,
            lastName: newUser.apellido,
            email: newUser.email,
            role: newUser.role,
            isActive: newUser.status === "habilitado",
            // Compatibility fields for filters that might use Spanish keys
            nombre: newUser.nombre,
            apellido: newUser.apellido,
            status: newUser.status,
            created_at: new Date().toISOString(),
          },
        ])
        setIsCreateDialogOpen(false)
        setNewUser({ rut: "", nombre: "", apellido: "", email: "", password: "", role: "consultor", status: "habilitado" })
        return { success: true, message: data?.message }
      } else {
        // Manejar errores de validación del servidor
        const serverMessage = data?.message || "Ha ocurrido un error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente."
        const fieldErrors: Record<string, string> = {}
        
        // Mapear mensajes del servidor al campo correspondiente
        // Mensajes esperados del backend:
        // - "El RUT ya está registrado en el sistema"
        // - "El correo electrónico ya está registrado en el sistema"
        // - "Este email ya está registrado"
        if (serverMessage.includes("RUT") || serverMessage.includes("rut_usuario")) {
          fieldErrors.rut = serverMessage
        } else if (serverMessage.includes("email") || serverMessage.includes("Email") || serverMessage.includes("correo electrónico")) {
          fieldErrors.email = serverMessage
        } else if (serverMessage.includes("contraseña") || serverMessage.includes("password")) {
          fieldErrors.password = serverMessage
        } else if (serverMessage.includes("nombre")) {
          fieldErrors.nombre = serverMessage
        } else if (serverMessage.includes("apellido")) {
          fieldErrors.apellido = serverMessage
        }
        
        return { success: false, message: serverMessage, fieldErrors }
      }
    } catch (err: any) {
      console.error('Error creating user:', err)
      // Mensaje amigable para errores no contemplados
      return { 
        success: false, 
        message: "Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde." 
      }
    }
  }

  const editUser = (user: HookUser) => {
    setEditingUser(user)
    setNewUser({
      rut: user.id,
      nombre: user.nombre || user.firstName,
      apellido: user.apellido || user.lastName,
      email: user.email,
      password: "", // No mostrar contraseña al editar por seguridad
      role: user.role,
      status: user.status ?? (user.isActive ? "habilitado" : "inhabilitado"),
    })
  }

  const updateUser = async (): Promise<{ success: boolean; message?: string; fieldErrors?: Record<string, string> }> => {
    if (!editingUser) return { success: false, message: "No hay usuario seleccionado para editar" }
    
    try {
      // Preparar datos de actualización
      const updateData: any = {
        rut_usuario: newUser.rut,
        nombre_usuario: newUser.nombre,
        apellido_usuario: newUser.apellido,
        email_usuario: newUser.email,
        rol_usuario: newUser.role === "admin" ? 1 : 2,
        activo_usuario: newUser.status === "habilitado",
      }
      
      // Solo incluir contraseña si se proporcionó una nueva
      if (newUser.password && newUser.password.trim() !== "") {
        updateData.contrasena_usuario = newUser.password
      }
      
      const res = await fetch(`${API_URL}/api/users/users`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("llc_token")}`,
        },
        body: JSON.stringify(updateData),
      })
      
      // Intentar parsear la respuesta JSON sin importar el código de estado
      let data
      try {
        const text = await res.text()
        data = text ? JSON.parse(text) : {}
      } catch (err) {
        data = {}
      }
      
      if (res.ok && data?.success) {
        // Actualizar la lista local con el usuario modificado
        setUsers(users.map((user) => 
          user.id === (editingUser as HookUser).id 
            ? {
                ...user,
                firstName: newUser.nombre,
                lastName: newUser.apellido,
                email: newUser.email,
                role: newUser.role,
                isActive: newUser.status === "habilitado",
                // Campos de compatibilidad
                nombre: newUser.nombre,
                apellido: newUser.apellido,
                status: newUser.status,
              } as HookUser
            : user
        ))
        setEditingUser(null)
        setNewUser({ rut: "", nombre: "", apellido: "", email: "", password: "", role: "consultor", status: "habilitado" })
        return { success: true, message: data?.message }
      } else {
        // Manejar errores de validación del servidor
        const serverMessage = data?.message || "Ha ocurrido un error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente."
        const fieldErrors: Record<string, string> = {}
        
        // Mapear mensajes del servidor al campo correspondiente
        // Mensajes esperados del backend:
        // - "El correo electrónico ya está registrado en el sistema"
        // - "Este email ya está registrado"
        if (serverMessage.includes("email") || serverMessage.includes("Email") || serverMessage.includes("correo electrónico")) {
          fieldErrors.email = serverMessage
        } else if (serverMessage.includes("contraseña") || serverMessage.includes("password")) {
          fieldErrors.password = serverMessage
        } else if (serverMessage.includes("nombre")) {
          fieldErrors.nombre = serverMessage
        } else if (serverMessage.includes("apellido")) {
          fieldErrors.apellido = serverMessage
        }
        
        return { success: false, message: serverMessage, fieldErrors }
      }
    } catch (err: any) {
      console.error('Error updating user:', err)
      // Mensaje amigable para errores no contemplados
      return { 
        success: false, 
        message: "Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde." 
      }
    }
  }

  const toggleStatus = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId
          ? { ...user, status: user.status === "habilitado" ? "inhabilitado" : "habilitado" }
          : user
      )
    )
  }

  const deleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId))
  }

  // Pagination functions
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
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

  const clearEditingUser = () => {
    setEditingUser(null)
    setNewUser({ rut: "", nombre: "", apellido: "", email: "", password: "", role: "consultor", status: "habilitado" })
  }

  const hasFiltersApplied =
    searchTerm !== "" ||
    isFilterActive(statusFilter) ||
    isFilterActive(roleFilter)

  return {
    users,
    filteredUsers,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    roleFilter,
    setRoleFilter,
    hasFiltersApplied,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    newUser,
    setNewUser,
    editingUser,
    editUser,
    createUser,
    updateUser,
    toggleStatus,
    deleteUser,
    fetchUsers,
    isLoading,
    // Pagination
    currentPage,
    pageSize,
    totalPages,
    totalUsers,
    totalConsultores,
    totalAdministradores,
    goToPage,
    nextPage,
    prevPage,
    handlePageSizeChange,
    clearEditingUser,
  }
}
