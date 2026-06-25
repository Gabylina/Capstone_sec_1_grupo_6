import { appendMultiQueryParam, type MultiFilterValue } from "@/lib/multi-filter-utils"

const API_BASE = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"



function authHeaders(): HeadersInit {

  const token = typeof window !== "undefined" ? localStorage.getItem("llc_token") : null

  return {

    "Content-Type": "application/json",

    ...(token ? { Authorization: `Bearer ${token}` } : {}),

  }

}



async function parseJsonResponse(res: Response) {

  if (res.status === 304) {
    console.warn("[cliente-portal] Respuesta 304 sin cuerpo")
    throw new Error("Respuesta cacheada inválida. Intente de nuevo.")
  }

  const text = await res.text()

  return text ? JSON.parse(text) : {}

}



export interface ClientePortalResumen {

  total_procesos: number

  procesos_activos: number

  por_tipo: Array<{ codigo: string; nombre: string; cantidad: number }>

  estados_disponibles?: string[]

}



export interface ClientePortalSolicitudItem {

  id: number

  proceso: string

  fecha_solicitud: string

  consultor: string

  tipo_servicio?: string

  tipo_servicio_nombre?: string

  estado_solicitud?: string

  etapa?: string

  candidato?: string | null

}



export interface ClientePortalCredencial {

  tiene_credencial: boolean

  usuario?: string

  email?: string

  password?: string

  activo?: boolean

  recien_creado?: boolean

  regenerado?: boolean

}



export const clientePortalService = {

  async getResumen(): Promise<ClientePortalResumen> {

    const res = await fetch(`${API_BASE()}/api/cliente-portal/resumen`, {

      headers: authHeaders(),

    })

    const data = await res.json()

    if (!res.ok) throw new Error(data.message || "Error al cargar resumen")

    return data.data

  },



  async listSolicitudes(params: {
    service_type?: MultiFilterValue
    estado?: MultiFilterValue
    fecha_desde?: string
    fecha_hasta?: string
    page?: number
    limit?: number
  }): Promise<{ items: ClientePortalSolicitudItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const q = new URLSearchParams()
    if (params.service_type) appendMultiQueryParam(q, "service_type", params.service_type)
    if (params.estado) appendMultiQueryParam(q, "estado", params.estado)

    if (params.fecha_desde) q.set("fecha_desde", params.fecha_desde)

    if (params.fecha_hasta) q.set("fecha_hasta", params.fecha_hasta)

    if (params.page) q.set("page", String(params.page))

    if (params.limit) q.set("limit", String(params.limit))

    const res = await fetch(`${API_BASE()}/api/cliente-portal/solicitudes?${q}`, {

      headers: authHeaders(),

    })

    const data = await res.json()

    if (!res.ok) throw new Error(data.message || "Error al listar procesos")

    return data.data

  },



  async getCredencialesStatus(ids: number[]): Promise<Record<number, boolean>> {

    if (!ids.length) return {}

    const q = new URLSearchParams({ ids: ids.join(",") })

    const res = await fetch(`${API_BASE()}/api/cliente-portal/clientes/credenciales-status?${q}`, {

      headers: authHeaders(),

      cache: "no-store",

    })

    const data = await parseJsonResponse(res)

    if (!res.ok) throw new Error(data.message || "Error al consultar credenciales")

    return data.data ?? {}

  },



  async getCredencial(idCliente: number): Promise<ClientePortalCredencial> {
    const res = await fetch(
      `${API_BASE()}/api/cliente-portal/clientes/${idCliente}/credencial?_=${Date.now()}`,
      { headers: authHeaders(), cache: "no-store" }
    )
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.message || "Error al cargar credenciales")
    const payload = data.data as ClientePortalCredencial | undefined
    console.log("[cliente-portal] GET credencial", { idCliente, status: res.status, payload })
    return payload ?? { tiene_credencial: false }
  },



  async generarCredencial(idCliente: number): Promise<ClientePortalCredencial> {

    const res = await fetch(

      `${API_BASE()}/api/cliente-portal/clientes/${idCliente}/generar-credencial`,

      { method: "POST", headers: authHeaders(), cache: "no-store" }

    )

    const data = await res.json()

    if (!res.ok) throw new Error(data.message || "Error al generar credenciales")

    console.log("[cliente-portal] POST generar-credencial OK", {
      idCliente,
      usuario: data.data?.usuario,
      tienePassword: !!data.data?.password,
    })

    return data.data

  },



  async setCredencialActiva(idCliente: number, activo: boolean): Promise<ClientePortalCredencial> {

    const res = await fetch(

      `${API_BASE()}/api/cliente-portal/clientes/${idCliente}/credencial/activo`,

      {

        method: "PATCH",

        headers: authHeaders(),

        cache: "no-store",

        body: JSON.stringify({ activo }),

      }

    )

    const data = await res.json()

    if (!res.ok) throw new Error(data.message || "Error al actualizar acceso")

    return data.data

  },

}

