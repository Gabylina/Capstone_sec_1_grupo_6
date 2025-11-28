import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Valida RUT chileno con algoritmo matemático completo
 */
export function validateRut(rut: string): boolean {
  // Limpiar RUT
  const cleanRut = rut.replace(/[^0-9kK]/g, '');
  
  if (cleanRut.length < 8 || cleanRut.length > 9) {
    return false;
  }

  const rutNumber = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase();

  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;

  for (let i = rutNumber.length - 1; i >= 0; i--) {
    sum += parseInt(rutNumber[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const calculatedDv = remainder === 0 ? '0' : remainder === 1 ? 'K' : (11 - remainder).toString();

  return dv === calculatedDv;
}

export function formatDate(date: string | Date): string {
  // Si es string en formato YYYY-MM-DD, parsearlo manualmente para evitar problemas de zona horaria
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day); // Usar constructor con parámetros locales
    return d.toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }
  
  // Para otros formatos o Date objects, usar el método original
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateOnly(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(amount)
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Process statuses
    creado: "bg-gray-100 text-gray-800",
    iniciado: "bg-blue-100 text-blue-800",
    en_progreso: "bg-cyan-100 text-cyan-800",
    completado: "bg-green-100 text-green-800",
    cancelado: "bg-red-100 text-red-800",
    congelado: "bg-orange-100 text-orange-800",
    cerrado: "bg-green-100 text-green-800",
    "cierre extraordinario": "bg-purple-100 text-purple-800",

    // Candidate statuses
    postulado: "bg-gray-100 text-gray-800",
    filtrado: "bg-blue-100 text-blue-800",
    presentado: "bg-purple-100 text-purple-800",
    aprobado: "bg-green-100 text-green-800",
    rechazado: "bg-red-100 text-red-800",
    contratado: "bg-emerald-100 text-emerald-800",

    // Hito statuses
    pendiente: "bg-gray-100 text-gray-800",
    vencido: "bg-red-100 text-red-800",

    // Client responses
    observado: "bg-cyan-100 text-cyan-800",
  }

  return statusColors[status] || "bg-gray-100 text-gray-800"
}

export function calculateDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  const diffTime = due.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function isOverdue(dueDate: string): boolean {
  return calculateDaysUntilDue(dueDate) < 0
}

export function isNearDue(dueDate: string, anticipationDays = 2): boolean {
  const daysUntil = calculateDaysUntilDue(dueDate)
  return daysUntil <= anticipationDays && daysUntil >= 0
}

/**
 * Determina si un proceso está en estado final y por tanto bloqueado para edición
 */
export function isProcessBlocked(processStatus: string): boolean {
  const finalStates = ['cerrado', 'congelado', 'cancelado', 'cierre extraordinario']
  return finalStates.some(state => 
    processStatus.toLowerCase().includes(state.toLowerCase())
  )
}

/**
 * Obtiene el mensaje descriptivo del estado final
 */
export function getFinalStateMessage(processStatus: string): string {
  const status = processStatus.toLowerCase()
  if (status.includes('cerrado')) return 'Cerrado'
  if (status.includes('congelado')) return 'Congelado'
  if (status.includes('cancelado')) return 'Cancelado'
  if (status.includes('cierre extraordinario')) return 'Cierre Extraordinario'
  return processStatus
}

/**
 * Obtiene la descripción del estado final
 */
export function getFinalStateDescription(processStatus: string): string {
  const status = processStatus.toLowerCase()
  if (status.includes('cerrado')) return 'El proceso ha sido completado exitosamente'
  if (status.includes('congelado')) return 'El proceso ha sido pausado temporalmente'
  if (status.includes('cancelado')) return 'El proceso ha sido cancelado'
  if (status.includes('cierre extraordinario')) return 'El proceso ha sido cerrado de manera extraordinaria'
  return 'El proceso está en estado final'
}

// ===========================================
// LABELS DE INTERFAZ DE USUARIO
// ===========================================

// Service Type Labels
export const serviceTypeLabels: Record<string, string> = {
  // Códigos cortos
  PC: "Proceso Completo",
  LL: "Long List",
  TR: "Targeted Recruitment",
  HS: "Headhunting",
  AO: "Filtro Inteligente",
  ES: "Evaluación Psicolaboral",
  TS: "Test Psicolaboral",
  AP: "Evaluación de Potencial",
  // Nombres completos (para compatibilidad)
  proceso_completo: "Proceso Completo",
  long_list: "Long List",
  targeted_recruitment: "Targeted Recruitment",
  headhunting: "Headhunting",
  filtro_inteligente: "Filtro Inteligente",
  evaluacion_psicolaboral: "Evaluación Psicolaboral",
  test_psicolaboral: "Test Psicolaboral",
  evaluacion_potencial: "Evaluación de Potencial",
}

// Process Status Labels
export const processStatusLabels: Record<string, string> = {
  creado: "Creado",
  iniciado: "Iniciado",
  en_progreso: "En Progreso",
  completado: "Completado",
  cancelado: "Cancelado",
  congelado: "Congelado",
  cerrado: "Cerrado",
  "cierre extraordinario": "Cierre Extraordinario",
}

// Candidate Status Labels
export const candidateStatusLabels: Record<string, string> = {
  postulado: "Postulado",
  filtrado: "Filtrado",
  presentado: "Presentado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  contratado: "Contratado",
}

// Hito Status Labels
export const hitoStatusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completado: "Completado",
  vencido: "Vencido",
}