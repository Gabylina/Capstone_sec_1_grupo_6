function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}

export interface ConsultorNotificacionItem {
  id_notificacion: number
  rut_usuario: string
  id_solicitud: number
  id_postulacion: number | null
  tipo: string
  titulo: string
  mensaje: string
  metadata?: {
    estado_aprobacion?: string
    candidato_nombre?: string
    cargo?: string
  } | null
  leida: boolean
  fecha_creacion: string
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('llc_token') : null
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Error en la solicitud')
  }
  return data
}

export const notificacionConsultorService = {
  async getMis(): Promise<{ items: ConsultorNotificacionItem[]; no_leidas: number }> {
    try {
      const data = await authFetch('/api/notificaciones/mis')
      return data.data ?? { items: [], no_leidas: 0 }
    } catch {
      return { items: [], no_leidas: 0 }
    }
  },

  async marcarLeida(id: number) {
    return authFetch(`/api/notificaciones/${id}/leida`, { method: 'PUT' })
  },

  async marcarTodasLeidas() {
    return authFetch('/api/notificaciones/marcar-todas-leidas', { method: 'PUT' })
  },
}
