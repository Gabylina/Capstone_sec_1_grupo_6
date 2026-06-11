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
  id_cliente: number
  consultor: string
  rut_consultor: string
  candidato: string
  servicio: string
  codigo_servicio: string
  respondida: boolean
  nota_total: number | null
  comunicacion: number | null
  calidad_candidatos: number | null
  tiempo: number | null
  acompanamiento: number | null
  volveria_trabajar: boolean | null
  motivo_no: string | null
  /** @deprecated encuestas antiguas */
  calidad?: number | null
  /** @deprecated encuestas antiguas */
  apoyo?: number | null
}

export interface EncuestaPanelItem {
  id_postulacion: number | null
  id_contratacion: number
  nombre: string
  encuesta_respondida: boolean
  pendiente: boolean
}

export interface EncuestaPanelData {
  aplica: boolean
  codigo_servicio: string
  modulo_final: number | null
  items: EncuestaPanelItem[]
  mensaje?: string
}

export interface SatisfaccionDashboard {
  resumen: SatisfaccionResumen
  dimensiones: SatisfaccionDimension[]
  recontratacion?: {
    volveria_si: number
    volveria_no: number
  }
  ranking: {
    mas_satisfechos: SatisfaccionRankingItem[]
    menos_satisfechos: SatisfaccionRankingItem[]
  }
  tipos_servicio: Array<{ codigo: string; nombre: string }>
  clientes_disponibles: Array<{ id_cliente: number; nombre: string }>
  consultores_disponibles: Array<{ rut_usuario: string; nombre: string }>
  procesos_encuesta: SatisfaccionProcesoEncuesta[]
  detalle_encuestas: SatisfaccionDetalleEncuesta[]
}

export interface EncuestaSatisfaccionPayload {
  comunicacion: number
  calidad_candidatos: number
  tiempo: number
  acompanamiento: number
  volveria_trabajar: boolean
  motivo_no?: string
}

export const satisfaccionClienteService = {
  async getDashboard(params?: {
    service_type?: string
    cliente_id?: string
    consultor_id?: string
  }): Promise<{
    success: boolean
    message?: string
    data?: SatisfaccionDashboard
  }> {
    const searchParams = new URLSearchParams()
    if (params?.service_type && params.service_type !== "all") {
      searchParams.set("service_type", params.service_type)
    }
    if (params?.cliente_id && params.cliente_id !== "all") {
      searchParams.set("cliente_id", params.cliente_id)
    }
    if (params?.consultor_id && params.consultor_id !== "all") {
      searchParams.set("consultor_id", params.consultor_id)
    }
    const qs = searchParams.toString()
    const res = await fetch(
      `${API_BASE()}/api/satisfaccion-cliente/dashboard${qs ? `?${qs}` : ""}`,
      { headers: authHeaders(), cache: "no-store" }
    )
    return res.json()
  },

  async getEncuestaPanel(idSolicitud: number): Promise<{
    success: boolean
    message?: string
    data?: EncuestaPanelData
  }> {
    const res = await fetch(`${API_BASE()}/api/solicitudes/${idSolicitud}/encuesta-panel`, {
      headers: authHeaders(),
      cache: "no-store",
    })
    return res.json()
  },

  async registrarEncuesta(
    idContratacion: number,
    payload: EncuestaSatisfaccionPayload
  ): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE()}/api/contrataciones/${idContratacion}/encuesta`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ encuesta: payload }),
    })
    return res.json()
  },
}
