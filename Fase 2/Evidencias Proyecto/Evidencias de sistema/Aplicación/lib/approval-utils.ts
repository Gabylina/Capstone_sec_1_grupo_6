/** Código de servicio desde solicitud (hook admin usa service_type; API usa tipo_servicio) */
export function resolveSolicitudServiceCode(solicitud: {
  tipo_servicio?: string | null
  service_type?: string | null
  tipo_servicio_nombre?: string | null
}): string {
  const code = solicitud.tipo_servicio || solicitud.service_type
  if (code) return String(code).trim()
  return String(solicitud.tipo_servicio_nombre || "").trim()
}

/** Proceso Completo y Headhunting comparten el flujo M1–M5 (evaluación psicolaboral y cierre). */
export function isProcesoCompletoOrHeadhunting(codigoServicio?: string | null): boolean {
  if (!codigoServicio) return false
  const t = String(codigoServicio).toUpperCase().trim()
  return t === "PC" || t === "HH" || t === "HS"
}

/** Procesos que requieren aprobación de coordinadora antes de presentar candidatos */
export function requiresCoordinatorApproval(codigoServicio?: string | null): boolean {
  if (!codigoServicio) return false
  const t = String(codigoServicio).toUpperCase().trim()
  if (t === "PC" || t === "LL" || t === "HH" || t === "HS") return true
  if (t.includes("LONG") && t.includes("LIST")) return true
  if (t.includes("PROCESO") && t.includes("COMPLETO")) return true
  if (t.includes("HEAD") && t.includes("HUNT")) return true
  return false
}

export function solicitudRequiresCoordinatorApproval(solicitud: {
  tipo_servicio?: string | null
  service_type?: string | null
  tipo_servicio_nombre?: string | null
}): boolean {
  return requiresCoordinatorApproval(resolveSolicitudServiceCode(solicitud))
}

function normalizeApprovalStatus(candidate: Record<string, unknown>): string {
  const raw =
    candidate.approval_status ??
    candidate.estado_aprobacion ??
    (candidate.aprobacion as { estado?: string } | undefined)?.estado
  return String(raw ?? "")
    .toLowerCase()
    .trim()
}

export function countCandidatesEnRevision(
  candidates: Array<Record<string, unknown>>
): number {
  return candidates.filter((c) => normalizeApprovalStatus(c) === "en_revision").length
}

/** Clases para badges de estado de aprobación (consultor / admin) */
export const APPROVAL_STATUS_BADGE: Record<string, string> = {
  pendiente:
    "border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200",
  en_revision:
    "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100",
  aprobado:
    "border-green-500 bg-green-100 text-green-900 font-medium dark:border-green-600 dark:bg-green-950/60 dark:text-green-200",
  rechazado:
    "border-red-500 bg-red-100 text-red-900 font-medium dark:border-red-600 dark:bg-red-950/60 dark:text-red-200",
  observado:
    "border-yellow-500 bg-yellow-100 text-yellow-950 font-medium dark:border-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-100",
}

export function getApprovalStatusBadgeClass(status?: string | null): string {
  const key = String(status || "pendiente").toLowerCase().trim()
  return APPROVAL_STATUS_BADGE[key] ?? APPROVAL_STATUS_BADGE.pendiente
}
