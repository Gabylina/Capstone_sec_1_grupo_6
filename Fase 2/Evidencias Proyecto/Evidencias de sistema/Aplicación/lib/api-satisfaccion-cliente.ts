const API_BASE = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("llc_token") : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export interface SatisfaccionResumen {
  total_encuestas: number
  respondidas: number
  sin_respuesta: number
  nota_total: number | null
}

export interface SatisfaccionDimension {
  clave: string
  etiqueta: string
  promedio: number | null
  escala_max: number
}

export interface SatisfaccionRankingItem {
  id_cliente: number
  cliente: string
  nota_promedio: number
  encuestas_respondidas: number
}

export type EstadoEncuestaProceso = "respondida" | "pendiente" | "parcial"

export interface SatisfaccionProcesoEncuesta {
  id_solicitud: number
  proceso: string
  cliente: string
  servicio: string
  codigo_servicio: string
  total_encuestas: number
  respondidas: number
  sin_respuesta: number
  estado: EstadoEncuestaProceso
  nota_promedio: number | null
}

export interface SatisfaccionDetalleEncuesta {
  id_contratacion: number
  id_solicitud: number
  id_postulacion: number
  proceso: string
  cliente: string
  candidato: string
  servicio: string
  codigo_servicio: string
  respondida: boolean
  nota_total: number | null
  calidad: number | null
  tiempo: number | null
  apoyo: number | null
}

export interface SatisfaccionDashboard {
  resumen: SatisfaccionResumen
  dimensiones: SatisfaccionDimension[]
  ranking: {
    mas_satisfechos: SatisfaccionRankingItem[]
    menos_satisfechos: SatisfaccionRankingItem[]
  }
  tipos_servicio: Array<{ codigo: string; nombre: string }>
  procesos_encuesta: SatisfaccionProcesoEncuesta[]
  detalle_encuestas: SatisfaccionDetalleEncuesta[]
}

export const satisfaccionClienteService = {
  async getDashboard(serviceType?: string): Promise<{
    success: boolean
    message?: string
    data?: SatisfaccionDashboard
  }> {
    const params = new URLSearchParams()
    if (serviceType && serviceType !== "all") {
      params.set("service_type", serviceType)
    }
    const qs = params.toString()
    const res = await fetch(
      `${API_BASE()}/api/satisfaccion-cliente/dashboard${qs ? `?${qs}` : ""}`,
      { headers: authHeaders(), cache: "no-store" }
    )
    return res.json()
  },

  async registrarEncuesta(
    idContratacion: number,
    payload: { calidad: number; tiempo: number; apoyo: number }
  ): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE()}/api/contrataciones/${idContratacion}/encuesta`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ encuesta: payload }),
    })
    return res.json()
  },
}
