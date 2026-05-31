/** Servicios sin encuesta de satisfacción: ES, EP (evaluación potencial), FI (filtro inteligente) */
export const ENCUESTA_EXCLUDED_SERVICES = ["ES", "EP", "FI"] as const

/** Módulo final donde debe registrarse la encuesta (2–5) */
const MODULO_FINAL_ENCUESTA: Record<string, number> = {
  PP: 2,
  LL: 3,
  HH: 3,
  HS: 3,
  TR: 3,
  TS: 4,
  PC: 5,
  SC: 5,
  CA: 5,
}

export function getServiceCode(process: { tipo_servicio?: string; service_type?: string }): string {
  return String(process.tipo_servicio || process.service_type || "").toUpperCase().trim()
}

export function servicioTieneEncuesta(codigo: string | null | undefined): boolean {
  if (!codigo) return false
  const c = String(codigo).toUpperCase().trim()
  if (ENCUESTA_EXCLUDED_SERVICES.includes(c as (typeof ENCUESTA_EXCLUDED_SERVICES)[number])) {
    return false
  }
  return c in MODULO_FINAL_ENCUESTA
}

export function getModuloFinalEncuesta(codigo: string | null | undefined): number | null {
  if (!servicioTieneEncuesta(codigo)) return null
  return MODULO_FINAL_ENCUESTA[String(codigo).toUpperCase().trim()] ?? null
}

export function getTabEncuesta(codigo: string | null | undefined): string | null {
  const modulo = getModuloFinalEncuesta(codigo)
  if (!modulo) return null
  return `modulo-${modulo}`
}

export function debeMostrarEncuestaEnModulo(
  process: { tipo_servicio?: string; service_type?: string },
  modulo: number
): boolean {
  const codigo = getServiceCode(process)
  return getModuloFinalEncuesta(codigo) === modulo
}
