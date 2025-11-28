import { useState, useCallback } from 'react'
import { validateRut } from '@/lib/utils'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any, allData?: any) => string | null
  message?: string
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationErrors {
  [key: string]: string | ValidationErrors | { [key: number]: ValidationErrors }
}

export interface UseFormValidationReturn {
  errors: ValidationErrors
  validateField: (field: string, value: any, schema?: ValidationSchema, allData?: any) => void
  validateAllFields: (data: any, schema: ValidationSchema) => boolean
  clearError: (field: string) => void
  clearAllErrors: () => void
  setFieldError: (field: string, message: string) => void
  hasErrors: () => boolean
}

// Reglas de validación predefinidas
export const validationRules = {
  required: (message = 'Este campo es requerido'): ValidationRule => ({
    required: true,
    message
  }),
  
  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || `Debe tener al menos ${min} caracteres`
  }),
  
  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || `No puede exceder ${max} caracteres`
  }),
  
  email: (message = 'Ingrese un email válido'): ValidationRule => ({
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    message
  }),
  
  phone: (message = 'Ingrese un teléfono válido (8 a 12 caracteres)'): ValidationRule => ({
    custom: (value: string) => {
      if (!value?.trim()) return null
      
      // Validar formato básico (números, espacios, guiones, paréntesis, signo +)
      const phonePattern = /^[\+]?[0-9\s\-\(\)]+$/
      if (!phonePattern.test(value.trim())) {
        return message || 'Formato de teléfono inválido'
      }
      
      // Validar longitud (8 a 12 caracteres)
      const length = value.trim().length
      if (length < 8) {
        return 'El teléfono debe tener al menos 8 caracteres'
      }
      if (length > 12) {
        return 'El teléfono no puede exceder 12 caracteres'
      }
      
      return null
    }
  }),
  
  rut: (message = 'Ingrese un RUT válido (ej: 12345678-9)'): ValidationRule => ({
    custom: (value: string) => {
      if (!value?.trim()) return null
      return validateRut(value) ? null : message
    }
  }),
  
  number: (min?: number, max?: number, message?: string): ValidationRule => ({
    custom: (value: any) => {
      const num = Number(value)
      if (isNaN(num)) return message || 'Debe ser un número válido'
      if (min !== undefined && num < min) return message || `Debe ser mayor o igual a ${min}`
      if (max !== undefined && num > max) return message || `Debe ser menor o igual a ${max}`
      return null
    }
  }),
  
  textLength: (min: number, max: number, fieldName = 'campo'): ValidationRule => ({
    minLength: min,
    maxLength: max,
    message: `${fieldName} debe tener entre ${min} y ${max} caracteres`
  }),
  
  requiredTextLength: (min: number, max: number, fieldName = 'campo'): ValidationRule => ({
    required: true,
    minLength: min,
    maxLength: max,
    message: `${fieldName} es requerido y debe tener entre ${min} y ${max} caracteres`
  })
}

// Esquemas de validación predefinidos
export const validationSchemas = {
  // Validaciones para formulario de proceso
  processForm: {
    client_id: validationRules.required('Seleccione un cliente con al menos 1 contacto'),
    contact_id: validationRules.required('Debe seleccionar un contacto'),
    service_type: validationRules.required('Debe seleccionar un tipo de servicio'),
    position_title: validationRules.required('Debe seleccionar o ingresar un cargo'),
    region: validationRules.required('Debe seleccionar una región'),
    ciudad: validationRules.required('Debe seleccionar una ciudad/comuna'),
    consultant_id: validationRules.required('Debe seleccionar un consultor'),
    vacancies: {
      custom: (value: any) => {
        // Si está vacío o es null
        if (value === '' || value === null || value === undefined) {
          return 'Debe ingresar el número de vacantes'
        }
        
        // Permitir 0 y strings que representan números
        if (value === 0 || value === '0') {
          return 'El número de vacantes debe ser mayor o igual a 1'
        }
        
        // Si está vacío después de trim (para strings)
        if (typeof value === 'string' && value.trim() === '') {
          return 'Debe ingresar el número de vacantes'
        }
        
        // Convertir a número
        const num = Number(value)
        
        // Si no es un número válido
        if (isNaN(num)) {
          return 'El número de vacantes debe ser un número válido'
        }
        
        // Si es menor a 1 (excluyendo 0 que ya validamos)
        if (num < 1) {
          return 'El número de vacantes debe ser mayor o igual a 1'
        }
        
        // Si es mayor a 1000
        if (num > 1000) {
          return 'El número de vacantes no puede exceder 1000'
        }
        
        return null
      }
    },
    description: validationRules.requiredTextLength(10, 500, 'La descripción'),
    requirements: validationRules.requiredTextLength(10, 500, 'Los requisitos')
  },
  
  // Validaciones para candidatos
  candidateForm: {
    nombre_candidato: validationRules.required('Debe ingresar el nombre del candidato'),
    primer_apellido_candidato: validationRules.required('Debe ingresar el primer apellido del candidato'),
    segundo_apellido_candidato: validationRules.required('Debe ingresar el segundo apellido del candidato'),
    telefono_candidato: {
      ...validationRules.required('Debe ingresar el teléfono del candidato'),
      ...validationRules.phone()
    },
    email_candidato: {
      ...validationRules.required('Debe ingresar el email del candidato'),
      ...validationRules.email('Ingrese un email válido (ej: candidato@ejemplo.com)')
    },
    rut_candidato: validationRules.rut()
  },

  // Validaciones para formulario de cliente
  clientForm: {
    name: validationRules.requiredTextLength(2, 100, 'El nombre de la empresa'),
    contacts: validationRules.required('Debe agregar al menos un contacto')
  },

  // Validaciones para contactos de cliente
  clientContactForm: {
    name: validationRules.requiredTextLength(2, 50, 'El nombre del contacto es obligatorio'),
    email: {
      ...validationRules.required('El correo electrónico del contacto es obligatorio'),
      ...validationRules.email('Ingrese un correo electrónico válido (ej: contacto@empresa.com)')
    },
    phone: {
      ...validationRules.required('El teléfono del contacto es obligatorio'),
      ...validationRules.phone('Ingrese un teléfono válido (mínimo 8 dígitos)')
    },
    position: validationRules.requiredTextLength(2, 50, 'El cargo del contacto es obligatorio'),
    city: validationRules.required('Debe seleccionar una comuna para el contacto'),
    region: validationRules.required('Debe seleccionar una región para el contacto')
  },

  // Validaciones para formulario de usuario
  userForm: {
    rut: {
      required: true,
      custom: (value: string) => {
        if (!value?.trim()) {
          return 'El RUT es obligatorio'
        }
        return validateRut(value) ? null : 'Ingrese un RUT válido (ej: 12345678-9)'
      }
    },
    nombre: validationRules.requiredTextLength(2, 50, 'El nombre'),
    apellido: validationRules.requiredTextLength(2, 50, 'El apellido'),
    email: {
      ...validationRules.required('El correo electrónico es obligatorio'),
      ...validationRules.email('Ingrese un correo electrónico válido (ej: usuario@llconsulting.com)')
    },
    password: {
      required: true,
      minLength: 6,
      message: 'La contraseña debe tener al menos 6 caracteres'
    },
    role: validationRules.required('Debe seleccionar un rol'),
    status: validationRules.required('Debe seleccionar un estado')
  },

  // Validaciones para cambio de contraseña
  changePasswordForm: {
    currentPassword: {
      required: true,
      message: 'La contraseña actual es requerida'
    },
    newPassword: {
      required: true,
      minLength: 6,
      message: 'La nueva contraseña debe tener al menos 6 caracteres'
    },
    confirmPassword: {
      required: true,
      message: 'Debe confirmar la contraseña'
    }
  },

  // Validaciones para formulario de candidato en módulo 2 consultor
  module2CandidateForm: {
    nombre: validationRules.requiredTextLength(2, 50, 'El nombre'),
    primer_apellido: validationRules.requiredTextLength(2, 50, 'El primer apellido'),
    segundo_apellido: validationRules.requiredTextLength(2, 50, 'El segundo apellido'),
    email: {
      ...validationRules.required('El email es obligatorio'),
      ...validationRules.email('Ingrese un email válido (ej: candidato@ejemplo.com)')
    },
    phone: {
      ...validationRules.required('El teléfono es obligatorio'),
      ...validationRules.phone()
    },
    rut: {
      required: false,
      custom: (value: string) => {
        // Es opcional, pero si se proporciona, debe tener formato válido
        if (!value || !value.trim()) {
          return null // Campo opcional, no hay error si está vacío
        }
        return validateRut(value) ? null : 'Ingrese un RUT válido (ej: 12345678-9)'
      }
    },
    birth_date: {
      required: false,
      custom: (value: string) => {
        // Es opcional, pero si se proporciona, debe ser mayor de 18 años y menor o igual a 85 años
        if (!value || !value.trim()) {
          return null // Campo opcional, no hay error si está vacío
        }
        
        // Validar que la fecha sea válida
        const birthDate = new Date(value)
        if (isNaN(birthDate.getTime())) {
          return 'La fecha de nacimiento no es válida'
        }
        
        // Calcular edad basándose solo en el año (validación por año, no por día)
        const today = new Date()
        const birthYear = birthDate.getFullYear()
        const currentYear = today.getFullYear()
        let age = currentYear - birthYear
        
        // Ajustar si aún no ha cumplido años este año (comparación por mes y día)
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        
        // Validar que sea mayor de 18 años
        if (age < 18) {
          return 'El candidato debe ser mayor de 18 años'
        }
        
        // Validar que no tenga más de 85 años (validación por año)
        // Si nació en un año que resultaría en más de 85 años, no permitir
        const maxAllowedYear = currentYear - 85
        if (birthYear < maxAllowedYear) {
          return 'El candidato no puede tener más de 85 años'
        }
        
        return null
      }
    },
    region: {
      required: false,
      custom: (value: string) => {
        // La región es opcional, no hay validación
        return null
      }
    },
    comuna: {
      required: false,
      custom: (value: string, allData?: any) => {
        // Si hay una región seleccionada, la comuna es obligatoria
        const region = allData?.region?.trim() || ''
        if (region && (!value || !value.trim())) {
          return 'La comuna es obligatoria cuando se selecciona una región'
        }
        return null
      }
    },
    rubro: {
      required: false,
      custom: (value: string) => {
        // El rubro es opcional, no hay validación
        return null
      }
    },
    nacionalidad: {
      required: false,
      custom: (value: string) => {
        // La nacionalidad es opcional, no hay validación
        return null
      }
    },
    profession: {
      required: false,
      custom: (value: string, allData?: any) => {
        // Si todos los campos de profesión están vacíos, no validar
        const profession = value?.toString().trim() || ''
        const institution = allData?.profession_institution?.trim() || ''
        const date = allData?.profession_date?.trim() || ''
        
        // Si todos están vacíos, no hay error
        if (!profession && !institution && !date) {
          return null
        }
        
        // Si al menos uno tiene valor, todos deben tener valor
        if (!profession) {
          return 'La profesión es obligatoria si completa algún campo de profesión'
        }
        
        return null
      }
    },
    profession_institution: {
      required: false,
      custom: (value: string, allData?: any) => {
        // Si todos los campos de profesión están vacíos, no validar
        const profession = allData?.profession?.toString().trim() || ''
        const institution = value?.trim() || ''
        const date = allData?.profession_date?.trim() || ''
        
        // Si todos están vacíos, no hay error
        if (!profession && !institution && !date) {
          return null
        }
        
        // Si al menos uno tiene valor, todos deben tener valor
        if (!institution) {
          return 'La institución es obligatoria si completa algún campo de profesión'
        }
        
        return null
      }
    },
    profession_date: {
      required: false,
      custom: (value: string, allData?: any) => {
        // Si todos los campos de profesión están vacíos, no validar
        const profession = allData?.profession?.toString().trim() || ''
        const institution = allData?.profession_institution?.trim() || ''
        const date = value?.trim() || ''
        
        // Si todos están vacíos, no hay error
        if (!profession && !institution && !date) {
          return null
        }
        
        // Si al menos uno tiene valor, todos deben tener valor
        if (!date) {
          return 'La fecha de obtención es obligatoria si completa algún campo de profesión'
        }
        
        // Validar que la fecha no sea futura
        if (date) {
          const selectedDate = new Date(date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          if (selectedDate > today) {
            return 'La fecha de obtención no puede ser futura'
          }
        }
        
        return null
      }
    }
  },

  // Validaciones para formulario de actualización de estado de candidato (Módulo 3)
  module3UpdateCandidateForm: {
    presentation_date: {
      required: false,
      custom: (value: string) => {
        // Es opcional, pero si se proporciona, no puede ser después del día actual
        if (!value || !value.trim()) {
          return null // Campo opcional, no hay error si está vacío
        }
        
        const selectedDate = new Date(value)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Resetear horas para comparar solo fechas
        selectedDate.setHours(0, 0, 0, 0)
        
        if (selectedDate > today) {
          return 'La fecha de envío al cliente no puede ser después del día actual'
        }
        
        return null
      }
    },
    client_feedback_date: {
      required: false,
      custom: (value: string) => {
        // Es opcional, pero si se proporciona, no puede ser después del día actual
        if (!value || !value.trim()) {
          return null // Campo opcional, no hay error si está vacío
        }
        
        const selectedDate = new Date(value)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Resetear horas para comparar solo fechas
        selectedDate.setHours(0, 0, 0, 0)
        
        if (selectedDate > today) {
          return 'La fecha de feedback del cliente no puede ser después del día actual'
        }
        
        return null
      }
    },
    client_comments: {
      required: false,
      maxLength: 1000,
      message: 'Los comentarios no pueden exceder 1000 caracteres'
    }
  },

  // Validaciones para formulario de entrevista (Módulo 4)
  module4InterviewForm: {
    interview_date: {
      required: false,
      custom: (value: string, allData?: any) => {
        // Es opcional, pero si se proporciona, validar según el estado
        if (!value || !value.trim()) {
          return null // Campo opcional, no hay error si está vacío
        }
        
        const selectedDateTime = new Date(value)
        const now = new Date()
        const interviewStatus = allData?.interview_status || allData?.interviewForm?.interview_status
        
        // Si el estado es "programada", permitir fechas futuras
        if (interviewStatus === "programada") {
          return null // Permitir cualquier fecha si está programada
        }
        
        // Para otros estados (realizada, cancelada), no permitir fechas futuras
        if (selectedDateTime > now) {
          return 'La fecha de entrevista no puede ser después del día y hora actual'
        }
        
        return null
      }
    }
  },

  // Validaciones para formulario de test (Módulo 4)
  module4TestForm: {
    result: {
      required: true,
      minLength: 5,
      maxLength: 300,
      message: 'El resultado es obligatorio y debe tener entre 5 y 300 caracteres'
    }
  },

  // Validaciones para formulario de referencias laborales (Módulo 4)
  module4ReferenceForm: {
    nombre_referencia: {
      required: false,
      minLength: 2,
      maxLength: 100,
      message: 'El nombre de la referencia debe tener entre 2 y 100 caracteres'
    },
    cargo_referencia: {
      required: false,
      minLength: 2,
      maxLength: 100,
      message: 'El cargo de la referencia debe tener entre 2 y 100 caracteres'
    },
    relacion_postulante_referencia: {
      required: false,
      maxLength: 300,
      message: 'La relación con el postulante no puede exceder 300 caracteres'
    },
    empresa_referencia: {
      required: false,
      minLength: 2,
      maxLength: 100,
      message: 'El nombre de la empresa debe tener entre 2 y 100 caracteres'
    },
    telefono_referencia: {
      required: false,
      custom: (value: string) => {
        if (!value || !value.trim()) {
          return null // Campo opcional
        }
        // Validar formato básico (números, espacios, guiones, paréntesis, signo +)
        const phonePattern = /^[\+]?[0-9\s\-\(\)]+$/
        if (!phonePattern.test(value.trim())) {
          return 'Formato de teléfono inválido'
        }
        // Validar longitud (máximo 12 caracteres según BD)
        const length = value.trim().length
        if (length < 8) {
          return 'El teléfono debe tener al menos 8 caracteres'
        }
        if (length > 12) {
          return 'El teléfono no puede exceder 12 caracteres'
        }
        return null
      }
    },
    email_referencia: {
      required: false,
      custom: (value: string) => {
        if (!value || !value.trim()) {
          return null // Campo opcional
        }
        // Validar formato de email
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!emailPattern.test(value.trim())) {
          return 'Ingrese un email válido'
        }
        // Validar longitud máxima (256 caracteres según BD)
        if (value.trim().length > 256) {
          return 'El email no puede exceder 256 caracteres'
        }
        return null
      }
    },
    comentario_referencia: {
      required: false,
      maxLength: 800,
      message: 'Los comentarios no pueden exceder 800 caracteres'
    }
  },

  // Validaciones para formulario de publicación
  publicationForm: {
    id_portal_postulacion: validationRules.required('El portal de postulación es obligatorio'),
    url_publicacion: {
      required: true,
      custom: (value: string) => {
        if (!value || !value.trim()) {
          return 'La URL de la publicación es obligatoria'
        }
        
        // Validar formato URL
        try {
          new URL(value)
        } catch (error) {
          return 'Ingresa una URL válida (ej: https://ejemplo.com)'
        }
        
        // Validar que la URL tenga protocolo
        if (!value.startsWith('http://') && !value.startsWith('https://')) {
          return 'La URL debe comenzar con http:// o https://'
        }
        
        return null
      }
    },
    fecha_publicacion: {
      required: false,
      custom: (value: string) => {
        // Es opcional, pero si se proporciona, no puede ser futura
        if (!value || !value.trim()) {
          return null // Campo opcional, no hay error si está vacío
        }
        
        const selectedDate = new Date(value)
        const today = new Date()
        today.setHours(23, 59, 59, 999) // Resetear horas para comparar solo fechas
        selectedDate.setHours(0, 0, 0, 0)
        
        if (selectedDate > today) {
          return 'La fecha de publicación no puede ser posterior al día actual'
        }
        
        return null
      }
    }
  }
}

export function useFormValidation(): UseFormValidationReturn {
  const [errors, setErrors] = useState<ValidationErrors>({})

  const validateField = useCallback((field: string, value: any, schema?: ValidationSchema, allData?: any) => {
    if (!schema) return

    const rule = schema[field]
    if (!rule) return

    setErrors(prev => {
      const newErrors = { ...prev }
      const errorMessage = validateSingleField(value, rule, allData)

      if (errorMessage) {
        newErrors[field] = errorMessage
      } else {
        delete newErrors[field]
      }

      return newErrors
    })
  }, [])

  const validateAllFields = useCallback((data: any, schema: ValidationSchema): boolean => {
    const newErrors: ValidationErrors = {}
    let hasErrors = false

    Object.keys(schema).forEach(field => {
      const rule = schema[field]
      const value = data[field]
      const errorMessage = validateSingleField(value, rule, data)

      if (errorMessage) {
        newErrors[field] = errorMessage
        hasErrors = true
      }
    })

    setErrors(newErrors)
    return !hasErrors
  }, [])

  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: message
    }))
  }, [])

  const hasErrors = useCallback(() => {
    return Object.keys(errors).length > 0
  }, [errors])

  return {
    errors,
    validateField,
    validateAllFields,
    clearError,
    clearAllErrors,
    setFieldError,
    hasErrors
  }
}

function validateSingleField(value: any, rule: ValidationRule, allData?: any): string | null {
  // Validación requerida
  if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return rule.message || 'Este campo es requerido'
  }

  // Validación personalizada (siempre se ejecuta si existe, maneja el caso vacío internamente)
  if (rule.custom) {
    return rule.custom(value, allData)
  }

  // Si el campo no es requerido y está vacío, no validar más
  if (!rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return null
  }

  // Validación de longitud mínima
  if (rule.minLength && typeof value === 'string' && value.trim().length < rule.minLength) {
    return rule.message || `Debe tener al menos ${rule.minLength} caracteres`
  }

  // Validación de longitud máxima
  if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
    return rule.message || `No puede exceder ${rule.maxLength} caracteres`
  }

  // Validación de patrón
  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value.trim())) {
    return rule.message || 'Formato inválido'
  }

  return null
}

// Función helper para validar candidatos específicamente
export function validateCandidates(candidates: any[]): { hasErrors: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {}
  let hasErrors = false

  if (candidates.length === 0) {
    errors.general = 'Debe agregar al menos un candidato para evaluar'
    hasErrors = true
  } else {
    candidates.forEach((candidate, index) => {
      const candidateErrors: ValidationErrors = {}
      let candidateHasErrors = false

      // Validar cada campo del candidato
      Object.keys(validationSchemas.candidateForm).forEach(field => {
        const rule = validationSchemas.candidateForm[field as keyof typeof validationSchemas.candidateForm]
        const value = candidate[field as keyof typeof candidate]
        const errorMessage = validateSingleField(value, rule)

        if (errorMessage) {
          candidateErrors[field] = errorMessage
          candidateHasErrors = true
        }
      })

      if (candidateHasErrors) {
        errors[index] = candidateErrors
        hasErrors = true
      }
    })
  }

  return { hasErrors, errors }
}

// Función helper para validar contactos de cliente específicamente
export function validateClientContacts(contacts: any[]): { hasErrors: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {}
  let hasErrors = false

  if (contacts.length === 0) {
    errors.general = 'Un cliente debe tener al menos un contacto para poder ser creado'
    hasErrors = true
  } else {
    contacts.forEach((contact, index) => {
      const contactErrors: ValidationErrors = {}
      let contactHasErrors = false

      // Validar cada campo del contacto
      Object.keys(validationSchemas.clientContactForm).forEach(field => {
        const rule = validationSchemas.clientContactForm[field as keyof typeof validationSchemas.clientContactForm]
        const value = contact[field as keyof typeof contact]
        const errorMessage = validateSingleField(value, rule)

        if (errorMessage) {
          contactErrors[field] = errorMessage
          contactHasErrors = true
        }
      })

      if (contactHasErrors) {
        errors[index] = contactErrors
        hasErrors = true
      }
    })
  }

  return { hasErrors, errors }
}