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

/** Formato corto numérico para tablas (DD/MM/YYYY), evita solapamientos */
export function formatDateShort(date: string | Date): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
  HH: "Headhunting",
  AO: "Filtro Inteligente",
  FI: "Filtro Inteligente",
  ES: "Evaluación Psicolaboral",
  TS: "Test Psicolaboral",
  AP: "Evaluación de Potencial",
  EP: "Evaluación de Potencial",
  PP: "Publicación Portales",
  SC: "San Cristobal Completo",
  // Nombres completos (para compatibilidad)
  proceso_completo: "Proceso Completo",
  long_list: "Long List",
  targeted_recruitment: "Targeted Recruitment",
  headhunting: "Headhunting",
  filtro_inteligente: "Filtro Inteligente",
  evaluacion_psicolaboral: "Evaluación Psicolaboral",
  test_psicolaboral: "Test Psicolaboral",
  evaluacion_potencial: "Evaluación de Potencial",
  publicacion_portales: "Publicación Portales",
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

/**
 * Convierte nombres de campos técnicos (con guiones bajos) a nombres amigables para el usuario
 * Ejemplo: "nombre_completo" -> "Nombre Completo"
 */
export function formatFieldName(fieldName: string): string {
  // Diccionario de mapeo para campos comunes
  const fieldNameMap: Record<string, string> = {
    // Usuarios
    rut: 'RUT',
    nombre: 'Nombre',
    apellido: 'Apellido',
    email: 'Correo electrónico',
    password: 'Contraseña',
    nombre_usuario: 'Nombre',
    apellido_usuario: 'Apellido',
    email_usuario: 'Correo electrónico',
    contrasena_usuario: 'Contraseña',
    rut_usuario: 'RUT',
    
    // Clientes
    nombre_cliente: 'Nombre del cliente',
    rut_cliente: 'RUT del cliente',
    nombre_contacto: 'Nombre del contacto',
    email_contacto: 'Correo del contacto',
    telefono_contacto: 'Teléfono del contacto',
    cargo_contacto: 'Cargo del contacto',
    
    // Candidatos (formulario de evaluación/test psicolaboral)
    nombre_candidato: 'Nombre',
    primer_apellido_candidato: 'Primer apellido',
    segundo_apellido_candidato: 'Segundo apellido',
    rut_candidato: 'RUT',
    email_candidato: 'Correo electrónico',
    telefono_candidato: 'Teléfono',
    fecha_nacimiento_candidato: 'Fecha de nacimiento',
    edad_candidato: 'Edad',
    direccion_candidato: 'Dirección',
    id_comuna: 'Comuna',
    id_nacionalidad: 'Nacionalidad',
    id_rubro: 'Rubro',
    nivel_ingles: 'Nivel de inglés',
    software_herramientas: 'Software y herramientas',
    
    // Solicitudes
    client_id: 'Cliente',
    contact_id: 'Contacto',
    service_type: 'Tipo de Servicio',
    position_title: 'Cargo',
    region: 'Región',
    ciudad: 'Ciudad',
    consultant_id: 'Consultor',
    vacancies: 'Número de Vacantes',
    description: 'Descripción',
    requirements: 'Requisitos',
    tipo_servicio: 'Tipo de Servicio',
    id_descripcion_cargo: 'Descripción de cargo',
    
    // Contraseñas
    currentPassword: 'Contraseña actual',
    newPassword: 'Contraseña nueva',
    confirmPassword: 'Confirmar contraseña',
    
    // Profesiones y educación
    profession: 'Profesión',
    profession_institution: 'Institución',
    profession_date: 'Fecha',
    education_title: 'Título',
    education_institution: 'Institución',
    education_completion_date: 'Fecha de término',
  }
  
  // Si existe en el mapa, devolver el nombre amigable
  if (fieldNameMap[fieldName]) {
    return fieldNameMap[fieldName]
  }
  
  // Si no está en el mapa, convertir guiones bajos a espacios y capitalizar
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Procesa mensajes de error de la API y los convierte en mensajes amigables para el usuario.
 * También convierte automáticamente nombres de campos técnicos (con guiones bajos) a nombres amigables.
 * Ejemplo: "Falta nombre_completo" -> "Falta Nombre Completo"
 */
export function processApiErrorMessage(errorMessage: string | undefined | null, defaultMessage: string): string {
  if (!errorMessage) return defaultMessage
  
  const message = errorMessage.toLowerCase()
  
  // Mensajes técnicos que deben ser reemplazados
  if (message.includes('validate') && message.includes('field')) {
    return 'Por favor verifica que todos los campos estén completos correctamente'
  }
  if (message.includes('validation error')) {
    return 'Error de validación. Por favor verifica los datos ingresados'
  }
  if (message.includes('required field')) {
    return 'Faltan campos obligatorios. Por favor completa todos los campos requeridos'
  }
  if (message.includes('invalid') && message.includes('format')) {
    return 'El formato de algunos datos es incorrecto. Por favor verifica la información'
  }
  if (message.includes('duplicate') || message.includes('duplicado')) {
    return 'Ya existe un registro con estos datos. Por favor verifica la información'
  }
  if (message.includes('not found') || message.includes('no encontrado')) {
    return 'No se encontró el recurso solicitado'
  }
  if (message.includes('unauthorized') || message.includes('no autorizado')) {
    return 'No tienes permisos para realizar esta acción'
  }
  if (message.includes('network') || message.includes('red')) {
    return 'Error de conexión. Por favor verifica tu conexión a internet'
  }
  if (message.includes('timeout')) {
    return 'La operación tardó demasiado. Por favor intenta nuevamente'
  }
  if (message.includes('server error') || message.includes('error del servidor')) {
    return 'Error en el servidor. Por favor intenta más tarde'
  }
  
  // Si el mensaje parece técnico pero no coincide con ningún patrón, usar el mensaje por defecto
  if (message.includes('error') && (message.includes('code') || message.includes('status'))) {
    return defaultMessage
  }
  
  // Convertir nombres de campos técnicos en el mensaje
  // Buscar patrones como "nombre_completo", "falta nombre_completo", "el campo nombre_completo", etc.
  let processedMessage = errorMessage
  
  // Buscar nombres de campos con guiones bajos (patrón: palabra_guion_palabra)
  const fieldNamePattern = /\b([a-z][a-z0-9_]*[a-z0-9])\b/gi
  processedMessage = processedMessage.replace(fieldNamePattern, (match) => {
    // Si el match contiene guiones bajos y parece un nombre de campo técnico, convertirlo
    if (match.includes('_') && match.length > 2) {
      return formatFieldName(match)
    }
    return match
  })
  
  // Si el mensaje parece amigable, devolverlo tal cual (capitalizado si es necesario)
  if (processedMessage.length > 0 && processedMessage[0] === processedMessage[0].toLowerCase()) {
    return processedMessage.charAt(0).toUpperCase() + processedMessage.slice(1)
  }
  
  return processedMessage
}