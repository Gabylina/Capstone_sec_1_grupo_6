export type ServiceType =
  | "PC" // proceso_completo
  | "LL" // long_list
  | "FI" // filtro_inteligente (igual que long_list)
  | "TR" // targeted_recruitment
  | "HS" // headhunting
  | "ES" // evaluacion_psicolaboral
  | "EP" // evaluacion_potencial (igual que ES)
  | "TS" // test_psicolaboral
  | "PP" // publicacion_portales

export type ProcessStatus = "creado" | "iniciado" | "en_progreso" | "completado" | "cancelado" | "congelado" | "Creado" | "En Progreso" | "Cerrado" | "Congelado" | "Cancelado"

export type CandidateStatus = "postulado" | "presentado" | "aprobado" | "rechazado" | "contratado"

export type HitoStatus = "pendiente" | "en_progreso" | "completado" | "vencido"

export type UserRole = "admin" | "consultor";

export interface User {
  id: string;               // mapea rut_usuario
  firstName: string;        // mapea nombre_usuario
  lastName: string;         // mapea apellido_usuario
  email: string;            // mapea email_usuario
  password?: string;        // opcional, mapea contrasena_usuario
  isActive: boolean;        // mapea activo_usuario
  role: UserRole;           // mapea rol_usuario: 1 => admin, 2 => consultor
}

export interface ConsultantDocument {
  id: string
  name: string
  file_path: string
  file_size: number
  uploaded_at: string
  description?: string
}

export interface ClientContact {
  id: string
  name: string
  email: string
  phone: string
  position: string // Cargo del contacto
  city: string // comuna/Comuna del contacto
  region: string // región del contacto
  is_primary?: boolean
}

export interface Client {
  id: string
  name: string
  contacts: ClientContact[] // Array de contactos en lugar de un solo contacto
  processCount?: number // Cantidad de procesos/solicitudes del cliente
}

export interface Process {
  id: string
  client_id: string
  client: Client
  contact_id?: string // Added contact_id to specify which contact is for this process
  service_type: ServiceType
  position_title: string
  description: string
  requirements: string
  vacancies: number
  consultant_id: string
  consultant: User
  status: ProcessStatus
  estado_solicitud?: string // Estado actual de la solicitud desde el historial
  created_at: string
  started_at?: string
  completed_at?: string
  excel_file?: string
  datos_excel?: any // Datos del Excel procesado
  id_descripcion_cargo?: number // ID de la descripción de cargo
  id_descripcioncargo?: number // ID alternativo de la descripción de cargo
}

export interface Candidate {
  id: string
  id_postulacion: number
  process_id: string
  name: string
  email: string
  phone: string
  rut?: string
  cv_file?: string
  motivation?: string
  salary_expectation?: number
  availability?: string
  source_portal?: string
  consultant_rating: number
  status: CandidateStatus
  created_at: string
  presentation_date?: string
  client_response?: "pendiente" | "aprobado" | "observado" | "rechazado"
  client_comments?: string
  client_feedback_date?: string
  birth_date?: string
  age?: number
  region?: string
  comuna?: string
  nacionalidad?: string
  rubro?: string
  profession?: string
  profession_institution?: string
  profession_date?: string
  professions?: Array<{
    profession: string
    institution: string
    date: string
  }>
  address?: string
  work_experience?: WorkExperience[]
  education?: Education[]
  // New fields for portal responses
  portal_responses?: PortalResponses
  // Consultant comment about the candidate
  consultant_comment?: string
  // Presentation status and reason
  presentation_status?: "agregado" | "presentado" | "no_presentado" | "rechazado"
  rejection_reason?: string
  // Disability credential
  has_disability_credential?: boolean
  // Driving license
  licencia?: boolean
  // Module 5 fields
  hiring_status?: string
  client_response_date?: string | null
  contract_date?: string
  observations?: string
}

export interface PortalResponses {
  motivation?: string
  salary_expectation?: string
  availability?: string
  family_situation?: string
  rating?: number
  english_level?: string
  has_driving_license?: boolean
  software_tools?: string
  rejection_reason?: string
  module5_comment?: string
}

export interface WorkExperience {
  id: string
  company: string
  position: string
  start_date: string
  end_date?: string
  is_current?: boolean
  description?: string
  comments?: string
  exit_reason?: string
}

export interface Education {
  id: string
  type?: "titulo" | "postgrado" | "capacitacion" | "curso"
  institution: string
  title: string
  start_date?: string
  completion_date?: string
  observations?: string
}

export interface Publication {
  id: string
  process_id: string
  portal: string
  publication_date: string
  status: "activa" | "cerrada"
  url?: string
}

export interface Hito {
  id: string
  process_id: string
  name: string
  description: string
  start_trigger: string
  duration_days: number
  anticipation_days: number
  status: HitoStatus
  start_date?: string
  due_date?: string
  completed_date?: string
}

export interface PsychologicalEvaluation {
  id: string
  candidate_id: string
  interview_date: string
  interview_status: "programada" | "realizada" | "cancelada"
  report_due_date: string
  tests: PsychologicalTest[]
}

export interface PsychologicalTest {
  id: string
  evaluation_id: string
  test_name: string
  result?: string
}

export interface Notification {
  id: string
  user_id: string
  process_id: string
  hito_id: string
  type: "proxima_vencer" | "vencida"
  title: string
  message: string
  created_at: string
  read: boolean
}

export interface Region {
  id_region: number
  nombre_region: string
}

export interface Comuna {
  id_comuna: number
  nombre_comuna: string
  id_region: number
}