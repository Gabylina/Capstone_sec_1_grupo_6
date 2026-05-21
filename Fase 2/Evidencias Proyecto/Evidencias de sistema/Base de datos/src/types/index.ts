// ===========================================
// TIPOS BÁSICOS DEL SISTEMA
// ===========================================

export type UserRole = 'admin' | 'consultor' | 'cliente';

export type ServiceType = 
  | 'proceso_completo'
  | 'long_list'
  | 'targeted_recruitment'
  | 'evaluacion_psicolaboral'
  | 'test_psicolaboral';

export type ProcessStatus = 
  | 'creado' 
  | 'iniciado' 
  | 'en_progreso' 
  | 'completado' 
  | 'cancelado' 
  | 'congelado';

export type CandidateStatus = 
  | 'postulado' 
  | 'presentado' 
  | 'aprobado' 
  | 'rechazado' 
  | 'contratado';

export type HitoStatus = 
  | 'pendiente' 
  | 'en_progreso' 
  | 'completado' 
  | 'vencido';

  export type TipoAncla = 
  | 'inicio_proceso'
  | 'publicacion'
  | 'primera_presentacion'
  | 'feedback_cliente'
  | 'evaluacion_psicolaboral'
  | 'entrevista'
  | 'test_psicolaboral'
  | 'contratacion'
  | 'filtro_inteligente'
  | 'publicacion_portales'
  | 'evaluacion_potencial'
  | 'entrevista_tecnica'
  | 'examenes_medicos';

// ===========================================
// INTERFACES DE RESPUESTA API
// ===========================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===========================================
// INTERFACES DE AUTENTICACIÓN
// ===========================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: string;
  };
  token: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

// ===========================================
// INTERFACES DE VALIDACIÓN
// ===========================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ===========================================
// INTERFACES DE ARCHIVOS
// ===========================================

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// ===========================================
// INTERFACES DE QUERY PARAMETERS
// ===========================================

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filter?: Record<string, any>;
}

// ===========================================
// INTERFACES DE LOGS
// ===========================================

export interface LogEntry {
  id: number;
  tabla_afectada: string;
  id_registro: string;
  accion: 'CREATE' | 'UPDATE' | 'DELETE';
  detalle_cambio: string;
  fecha_cambio: Date;
  usuario_responsable: string;
}
