"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Star, Loader2, Calendar, RotateCcw } from "lucide-react"
import { es } from "date-fns/locale"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { useFormValidation, validationSchemas } from "@/hooks/useFormValidation"
import { ValidationErrorDisplay } from "@/components/ui/ValidatedFormComponents"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import type { Candidate, WorkExperience, Education, PortalResponses } from "@/lib/types"


interface ProfessionForm {
  id: string
  profession: string
  profession_institution: string
  profession_date: string
  professionId?: string // ID de la BD si es una profesión existente
  markedForDeletion?: boolean // Flag para marcar profesiones para eliminación
}

interface EducationForm {
  id: string
  title: string
  institution: string
  completion_date: string
  educationId?: string // ID de la BD si es una educación existente
  markedForDeletion?: boolean // Flag para marcar educación para eliminación
}

interface WorkExperienceForm {
  id: string
  company: string
  position: string
  start_date: string
  end_date: string
  description: string
  workExperienceId?: string // ID de la BD si es una experiencia laboral existente
  markedForDeletion?: boolean // Flag para marcar experiencia laboral para eliminación
}

interface CandidateFormData {
  nombre: string
  primer_apellido: string
  segundo_apellido: string
  email: string
  phone: string
  rut: string
  cv_file: File | null
  motivation: string
  salary_expectation: string
  availability: string
  source_portal: string
  consultant_rating: number
  birth_date: string
  age: number
  region: string
  comuna: string
  nacionalidad: string
  rubro: string
  consultant_comment: string
  has_disability_credential: boolean
  licencia: boolean
  work_experience: WorkExperience[]
  education: Education[]
  portal_responses: PortalResponses
}

interface CandidateFormProps {
  mode: 'create' | 'edit'
  initialData?: Partial<CandidateFormData>
  onSubmit: (data: CandidateFormData, professionForms: ProfessionForm[], educationForms: EducationForm[], workExperienceForms: WorkExperienceForm[]) => Promise<void>
  onCancel: () => void
  regiones: any[]
  todasLasComunas: any[]
  profesiones: any[]
  rubros: any[]
  nacionalidades: any[]
  instituciones: any[]
  portalesDB: any[]
  loadingLists: boolean
  calculateAge: (birthDate: string) => number
}

export function CandidateForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  regiones,
  todasLasComunas,
  profesiones,
  rubros,
  nacionalidades,
  instituciones,
  portalesDB,
  loadingLists,
  calculateAge
}: CandidateFormProps) {
  
  const { errors, validateField, validateAllFields, clearAllErrors, setFieldError, clearError } = useFormValidation()
  const { showToast } = useToastNotification()
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado del formulario
  const [formData, setFormData] = useState<CandidateFormData>({
    nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    email: "",
    phone: "",
    rut: "",
    cv_file: null,
    motivation: "",
    salary_expectation: "",
    availability: "",
    source_portal: "",
    consultant_rating: 3,
    birth_date: "",
    age: 0,
    region: "",
    comuna: "",
    nacionalidad: "",
    rubro: "",
    consultant_comment: "",
    has_disability_credential: false,
    licencia: false,
    work_experience: [],
    education: [],
    portal_responses: {
      motivation: "",
      salary_expectation: "",
      availability: "",
      family_situation: "",
      rating: 3,
      english_level: "",
      has_driving_license: false,
      software_tools: "",
    }
  })

  // Estados para formularios múltiples
  const [professionForms, setProfessionForms] = useState<ProfessionForm[]>([
    { id: '1', profession: '', profession_institution: '', profession_date: '' }
  ])
  
  const [educationForms, setEducationForms] = useState<EducationForm[]>([
    { id: '1', title: '', institution: '', completion_date: '' }
  ])
  
  const [workExperienceForms, setWorkExperienceForms] = useState<WorkExperienceForm[]>([
    { id: '1', company: '', position: '', start_date: '', end_date: '', description: '' }
  ])

  const [comunasFiltradas, setComunasFiltradas] = useState<any[]>([])

  // Función helper para normalizar fechas a formato YYYY-MM-DD
  // Esta función siempre extrae la fecha directamente del string si es posible
  // para evitar problemas de zona horaria
  const normalizeDate = (date: any): string => {
    if (!date) return ""
    
    // Si ya es un string en formato YYYY-MM-DD, retornarlo directamente
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date
    }
    
    // Si es un string ISO o cualquier string con formato de fecha, extraer la fecha directamente
    // Esto evita problemas de zona horaria al no crear un objeto Date
    if (typeof date === 'string') {
      const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (dateMatch) {
        // Validar que los valores sean razonables
        const year = parseInt(dateMatch[1])
        const month = parseInt(dateMatch[2])
        const day = parseInt(dateMatch[3])
        if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
        }
      }
    }
    
    // Si es un objeto Date, usar métodos locales para extraer la fecha
    // Pero primero intentar crear el Date usando el constructor local (year, month, day)
    try {
      if (date instanceof Date && !isNaN(date.getTime())) {
        // Usar métodos locales para evitar problemas de zona horaria
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
      
      // Si es un string que no pudimos parsear antes, intentar crear Date
      // pero solo como último recurso
      if (typeof date === 'string') {
        const dateObj = new Date(date)
        if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
          // Usar métodos locales
          const year = dateObj.getFullYear()
          const month = String(dateObj.getMonth() + 1).padStart(2, '0')
          const day = String(dateObj.getDate()).padStart(2, '0')
          return `${year}-${month}-${day}`
        }
      }
    } catch (error) {
      console.error('Error normalizando fecha:', error)
    }
    
    return ""
  }

  // Cargar datos iniciales si estamos en modo edición O si se pasan datos iniciales (desde historial)
  useEffect(() => {
    if (initialData) {
      console.log('🔄 Cargando datos iniciales en CandidateForm:', initialData)
      console.log('🔄 Modo:', mode)
      
      setFormData({
        nombre: initialData.nombre || "",
        primer_apellido: initialData.primer_apellido || "",
        segundo_apellido: initialData.segundo_apellido || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        rut: initialData.rut || "",
        cv_file: null,
        motivation: initialData.motivation || "",
        salary_expectation: initialData.salary_expectation || "",
        availability: initialData.availability || "",
        source_portal: initialData.source_portal || "",
        consultant_rating: initialData.consultant_rating || 3,
        birth_date: normalizeDate(initialData.birth_date),
        age: initialData.age || 0,
        region: initialData.region || "",
        comuna: initialData.comuna || "",
        nacionalidad: initialData.nacionalidad || "",
        rubro: initialData.rubro || "",
        consultant_comment: initialData.consultant_comment || "",
        has_disability_credential: initialData.has_disability_credential || false,
        licencia: initialData.licencia || false,
        work_experience: [],
        education: [],
        portal_responses: {
          motivation: initialData.portal_responses?.motivation || "",
          salary_expectation: initialData.portal_responses?.salary_expectation || "",
          availability: initialData.portal_responses?.availability || "",
          family_situation: initialData.portal_responses?.family_situation || "",
          rating: initialData.portal_responses?.rating || 3,
          english_level: initialData.portal_responses?.english_level || "",
          has_driving_license: initialData.portal_responses?.has_driving_license || false,
          software_tools: initialData.portal_responses?.software_tools || "",
        }
      })
      
      // Cargar profesiones si existen
      if (initialData.professions && Array.isArray(initialData.professions) && initialData.professions.length > 0) {
        console.log('🔄 Cargando profesiones:', initialData.professions)
        const loadedProfessions = initialData.professions.map((prof: any, index: number) => {
          // Crear un ID único para identificar esta profesión existente
          // Usamos una combinación de id_profesion, institution y date para crear un identificador único
          const professionId = `prof_${prof.id_profesion}_${prof.institution}_${prof.date || index}`
          return {
            id: `prof_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            profession: prof.id_profesion?.toString() || '',
            profession_institution: prof.institution || '',
            profession_date: normalizeDate(prof.date),
            professionId: professionId, // ID para identificar profesiones existentes
            markedForDeletion: false
          }
        })
        setProfessionForms(loadedProfessions)
        console.log('✅ Profesiones cargadas:', loadedProfessions)
      }
      
      // Cargar educación si existe
      if (initialData.education && Array.isArray(initialData.education) && initialData.education.length > 0) {
        console.log('🔄 Cargando educación:', initialData.education)
        const loadedEducation = initialData.education.map((edu: any, index: number) => {
          // Crear un ID único para identificar esta educación existente
          const educationId = `edu_${edu.title}_${edu.institution}_${edu.completion_date || index}`
          return {
            id: `edu_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            title: edu.title || '',
            institution: edu.institution || '',
            completion_date: normalizeDate(edu.completion_date),
            educationId: educationId, // ID para identificar educación existente
            markedForDeletion: false
          }
        })
        setEducationForms(loadedEducation)
        console.log('✅ Educación cargada:', loadedEducation)
      }
      
      // Cargar experiencia laboral si existe
      if (initialData.work_experience && Array.isArray(initialData.work_experience) && initialData.work_experience.length > 0) {
        console.log('🔄 Cargando experiencia laboral:', initialData.work_experience)
        const loadedWorkExperience = initialData.work_experience.map((exp: any, index: number) => {
          // Crear un ID único para identificar esta experiencia laboral existente
          const workExperienceId = `exp_${exp.company}_${exp.position}_${exp.start_date || index}`
          return {
            id: `exp_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            company: exp.company || '',
            position: exp.position || '',
            start_date: normalizeDate(exp.start_date),
            end_date: normalizeDate(exp.end_date),
            description: exp.description || '',
            workExperienceId: workExperienceId, // ID para identificar experiencia laboral existente
            markedForDeletion: false
          }
        })
        setWorkExperienceForms(loadedWorkExperience)
        console.log('✅ Experiencia laboral cargada:', loadedWorkExperience)
      }
      
      console.log('✅ Datos cargados - nombre:', initialData.nombre)
      console.log('✅ Datos cargados - primer_apellido:', initialData.primer_apellido)
      console.log('✅ Datos cargados - segundo_apellido:', initialData.segundo_apellido)
    }
  }, [initialData])

  // Filtrar comunas cuando cambia la región
  useEffect(() => {
    if (formData.region) {
      const regionSeleccionada = regiones.find(r => r.nombre_region === formData.region)
      if (regionSeleccionada) {
        const filtradas = todasLasComunas.filter(
          c => c.id_region === regionSeleccionada.id_region
        )
        setComunasFiltradas(filtradas)
      }
    } else {
      setComunasFiltradas([])
    }
  }, [formData.region, regiones, todasLasComunas])

  // Funciones para manejar profesiones
  const addProfessionForm = () => {
    const newId = `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setProfessionForms([...professionForms, {
      id: newId,
      profession: '',
      profession_institution: '',
      profession_date: '',
      markedForDeletion: false
    }])
  }

  const updateProfessionForm = (id: string, field: keyof ProfessionForm, value: string) => {
    setProfessionForms(professionForms.map(form =>
      form.id === id ? { ...form, [field]: value } : form
    ))
    validateProfessionField(id, field, value, professionForms.find(f => f.id === id)!)
  }

  const handleDiscardSingleProfession = (formId: string) => {
    const form = professionForms.find(f => f.id === formId)
    if (!form) return

    // Si es una profesión existente, marcarla para eliminación en lugar de eliminarla directamente
    if (form.professionId) {
      setProfessionForms(professionForms.map(f =>
        f.id === formId
          ? { ...f, markedForDeletion: true }
          : f
      ))
    } else {
      // Si es una nueva profesión, eliminarla directamente
      if (professionForms.length === 1) {
        setProfessionForms([{
          id: `prof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          profession: '',
          profession_institution: '',
          profession_date: '',
          markedForDeletion: false
        }])
      } else {
        setProfessionForms(professionForms.filter(form => form.id !== formId))
      }
      clearError(`profession_${formId}_profession`)
      clearError(`profession_${formId}_institution`)
      clearError(`profession_${formId}_date`)
    }
  }

  const validateProfessionField = (formId: string, field: string, value: string, form: ProfessionForm) => {
    const hasAnyField = !!(form.profession?.trim() || form.profession_institution?.trim() || form.profession_date?.trim())
    
    if (!hasAttemptedSubmit && !value?.trim()) {
      clearError(`profession_${formId}_${field}`)
      return true
    }

    if (hasAnyField) {
      if (field === 'profession' && !value?.trim()) {
        setFieldError(`profession_${formId}_profession`, 'La profesión es obligatoria si completa algún campo de profesión')
        return false
      }
      if (field === 'profession_institution' && !value?.trim()) {
        setFieldError(`profession_${formId}_institution`, 'La institución es obligatoria si completa algún campo de profesión')
        return false
      }
      if (field === 'profession_date' && !value?.trim()) {
        setFieldError(`profession_${formId}_date`, 'La fecha es obligatoria si completa algún campo de profesión')
        return false
      }
      clearError(`profession_${formId}_${field}`)
      return true
    }

    clearError(`profession_${formId}_${field}`)
    return true
  }

  // Funciones para manejar educación
  const addEducationForm = () => {
    const newId = `edu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setEducationForms([...educationForms, {
      id: newId,
      title: '',
      institution: '',
      completion_date: '',
      markedForDeletion: false
    }])
  }

  const updateEducationForm = (id: string, field: keyof EducationForm, value: string) => {
    setEducationForms(educationForms.map(form =>
      form.id === id ? { ...form, [field]: value } : form
    ))
    validateEducationField(id, field, value, educationForms.find(f => f.id === id)!)
  }

  const handleDiscardSingleEducation = (formId: string) => {
    const form = educationForms.find(f => f.id === formId)
    if (!form) return

    // Si es una educación existente, marcarla para eliminación en lugar de eliminarla directamente
    if (form.educationId) {
      setEducationForms(educationForms.map(f =>
        f.id === formId
          ? { ...f, markedForDeletion: true }
          : f
      ))
    } else {
      // Si es una nueva educación, eliminarla directamente
      if (educationForms.length === 1) {
        setEducationForms([{
          id: `edu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: '',
          institution: '',
          completion_date: '',
          markedForDeletion: false
        }])
      } else {
        setEducationForms(educationForms.filter(form => form.id !== formId))
      }
      clearError(`education_${formId}_title`)
      clearError(`education_${formId}_institution`)
      clearError(`education_${formId}_completion_date`)
    }
  }

  const validateEducationField = (formId: string, field: string, value: string, form: EducationForm) => {
    const hasAnyField = !!(form.title?.trim() || form.institution?.trim() || form.completion_date?.trim())
    
    if (!hasAttemptedSubmit && !value?.trim()) {
      clearError(`education_${formId}_${field}`)
      return true
    }

    if (hasAnyField) {
      if (field === 'title') {
        if (!value?.trim()) {
          setFieldError(`education_${formId}_title`, 'El título es obligatorio si completa algún campo de capacitación')
          return false
        }
        if (value.trim().length < 2) {
          setFieldError(`education_${formId}_title`, 'El título debe tener al menos 2 caracteres')
          return false
        }
        if (value.trim().length > 100) {
          setFieldError(`education_${formId}_title`, 'El título no puede exceder 100 caracteres')
          return false
        }
      }
      if (field === 'institution' && !value?.trim()) {
        setFieldError(`education_${formId}_institution`, 'La institución es obligatoria si completa algún campo de capacitación')
        return false
      }
      if (field === 'completion_date' && !value?.trim()) {
        setFieldError(`education_${formId}_completion_date`, 'La fecha de obtención es obligatoria si completa algún campo de capacitación')
        return false
      }
      clearError(`education_${formId}_${field}`)
      return true
    }

    clearError(`education_${formId}_${field}`)
    return true
  }

  // Funciones para manejar experiencia laboral
  const addWorkExperienceForm = () => {
    const newId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setWorkExperienceForms([...workExperienceForms, {
      id: newId,
      company: '',
      position: '',
      start_date: '',
      end_date: '',
      description: '',
      markedForDeletion: false
    }])
  }

  const updateWorkExperienceForm = (id: string, field: keyof WorkExperienceForm, value: string) => {
    setWorkExperienceForms(prevForms => {
      const updatedForms = prevForms.map(form =>
        form.id === id ? { ...form, [field]: value } : form
      )
      const updatedForm = updatedForms.find(f => f.id === id)!
      
      // Validar que la fecha fin no sea anterior a la fecha inicio
      if (field === 'end_date' && value && updatedForm.start_date) {
        try {
          const [endYear, endMonth, endDay] = value.split('-').map(Number)
          const [startYear, startMonth, startDay] = updatedForm.start_date.split('-').map(Number)
          
          if (!isNaN(endYear) && !isNaN(endMonth) && !isNaN(endDay) &&
              !isNaN(startYear) && !isNaN(startMonth) && !isNaN(startDay)) {
            const endDate = new Date(endYear, endMonth - 1, endDay)
            const startDate = new Date(startYear, startMonth - 1, startDay)
            endDate.setHours(0, 0, 0, 0)
            startDate.setHours(0, 0, 0, 0)
            
            if (endDate.getTime() < startDate.getTime()) {
              setFieldError(`work_experience_${id}_end_date`, 'La fecha fin no puede ser anterior a la fecha inicio')
            } else {
              clearError(`work_experience_${id}_end_date`)
            }
          }
        } catch (error) {
          console.error('Error validando fecha fin:', error)
        }
      }
      
      // Si se cambia la fecha inicio, validar nuevamente la fecha fin
      if (field === 'start_date' && updatedForm.end_date) {
        try {
          const [endYear, endMonth, endDay] = updatedForm.end_date.split('-').map(Number)
          const [startYear, startMonth, startDay] = value.split('-').map(Number)
          
          if (!isNaN(endYear) && !isNaN(endMonth) && !isNaN(endDay) &&
              !isNaN(startYear) && !isNaN(startMonth) && !isNaN(startDay)) {
            const endDate = new Date(endYear, endMonth - 1, endDay)
            const startDate = new Date(startYear, startMonth - 1, startDay)
            endDate.setHours(0, 0, 0, 0)
            startDate.setHours(0, 0, 0, 0)
            
            if (endDate.getTime() < startDate.getTime()) {
              setFieldError(`work_experience_${id}_end_date`, 'La fecha fin no puede ser anterior a la fecha inicio')
            } else {
              clearError(`work_experience_${id}_end_date`)
            }
          }
        } catch (error) {
          console.error('Error validando fecha fin:', error)
        }
      }
      
      validateWorkExperienceField(id, field, value, updatedForm)
      return updatedForms
    })
  }

  const handleDiscardSingleWorkExperience = (formId: string) => {
    const form = workExperienceForms.find(f => f.id === formId)
    if (!form) return

    // Si es una experiencia laboral existente, marcarla para eliminación en lugar de eliminarla directamente
    if (form.workExperienceId) {
      setWorkExperienceForms(workExperienceForms.map(f =>
        f.id === formId
          ? { ...f, markedForDeletion: true }
          : f
      ))
    } else {
      // Si es una nueva experiencia laboral, eliminarla directamente
      if (workExperienceForms.length === 1) {
        setWorkExperienceForms([{
          id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          company: '',
          position: '',
          start_date: '',
          end_date: '',
          description: '',
          markedForDeletion: false
        }])
      } else {
        setWorkExperienceForms(workExperienceForms.filter(form => form.id !== formId))
      }
      clearError(`work_experience_${formId}_company`)
      clearError(`work_experience_${formId}_position`)
      clearError(`work_experience_${formId}_start_date`)
      clearError(`work_experience_${formId}_end_date`)
      clearError(`work_experience_${formId}_description`)
    }
  }

  const validateWorkExperienceField = (formId: string, field: string, value: string, form: WorkExperienceForm) => {
    const hasAnyField = !!(form.company?.trim() || form.position?.trim() || form.start_date?.trim() || form.description?.trim())
    
    if (!hasAttemptedSubmit && !value?.trim()) {
      clearError(`work_experience_${formId}_${field}`)
      return true
    }

    if (hasAnyField) {
      if (field === 'company') {
        if (!value?.trim()) {
          setFieldError(`work_experience_${formId}_company`, 'La empresa es obligatoria si completa algún campo de experiencia')
          return false
        }
        if (value.trim().length < 2) {
          setFieldError(`work_experience_${formId}_company`, 'El nombre de la empresa debe tener al menos 2 caracteres')
          return false
        }
        if (value.trim().length > 100) {
          setFieldError(`work_experience_${formId}_company`, 'El nombre de la empresa no puede exceder 100 caracteres')
          return false
        }
      }
      if (field === 'position') {
        if (!value?.trim()) {
          setFieldError(`work_experience_${formId}_position`, 'El cargo es obligatorio si completa algún campo de experiencia')
          return false
        }
        if (value.trim().length < 2) {
          setFieldError(`work_experience_${formId}_position`, 'El cargo debe tener al menos 2 caracteres')
          return false
        }
        if (value.trim().length > 100) {
          setFieldError(`work_experience_${formId}_position`, 'El cargo no puede exceder 100 caracteres')
          return false
        }
      }
      if (field === 'start_date' && !value?.trim()) {
        setFieldError(`work_experience_${formId}_start_date`, 'La fecha de inicio es obligatoria si completa algún campo de experiencia')
        return false
      }
      if (field === 'description') {
        if (!value?.trim()) {
          setFieldError(`work_experience_${formId}_description`, 'La descripción es obligatoria si completa algún campo de experiencia')
          return false
        }
        if (value.trim().length < 10) {
          setFieldError(`work_experience_${formId}_description`, 'La descripción debe tener al menos 10 caracteres')
          return false
        }
        if (value.trim().length > 500) {
          setFieldError(`work_experience_${formId}_description`, 'La descripción no puede exceder 500 caracteres')
          return false
        }
      }
      clearError(`work_experience_${formId}_${field}`)
      return true
    }

    clearError(`work_experience_${formId}_${field}`)
    return true
  }

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true)
    
    // Validar campos obligatorios
    const fieldsToValidate = {
      nombre: formData.nombre,
      primer_apellido: formData.primer_apellido,
      segundo_apellido: formData.segundo_apellido,
      email: formData.email,
      phone: formData.phone,
      rut: formData.rut,
      birth_date: formData.birth_date,
      region: formData.region,
      comuna: formData.comuna,
      nacionalidad: formData.nacionalidad,
      rubro: formData.rubro
    }
    
    const isValid = validateAllFields(fieldsToValidate, validationSchemas.module2CandidateForm)
    
    // Validación condicional: si hay región, comuna es obligatoria
    let regionComunaValidationPassed = true
    if (formData.region && !formData.comuna) {
      setFieldError('comuna', 'La comuna es obligatoria cuando se selecciona una región')
      regionComunaValidationPassed = false
    }
    
    // Validar que el portal de origen esté seleccionado
    if (!formData.source_portal) {
      setFieldError('source_portal', 'El portal de origen es obligatorio')
    }
    
    // Validar profesiones (si hay algún campo lleno, todos deben estar llenos)
    // No validar profesiones marcadas para eliminación
    let professionValidationPassed = true
    for (const form of professionForms) {
      // Saltar validación si está marcada para eliminación
      if (form.markedForDeletion) continue
      
      const hasAnyField = !!(form.profession?.trim() || form.profession_institution?.trim() || form.profession_date?.trim())
      if (hasAnyField) {
        if (!form.profession?.trim()) {
          setFieldError(`profession_${form.id}_profession`, 'La profesión es obligatoria si completa algún campo')
          professionValidationPassed = false
        }
        if (!form.profession_institution?.trim()) {
          setFieldError(`profession_${form.id}_institution`, 'La institución es obligatoria si completa algún campo')
          professionValidationPassed = false
        }
        if (!form.profession_date?.trim()) {
          setFieldError(`profession_${form.id}_date`, 'La fecha es obligatoria si completa algún campo')
          professionValidationPassed = false
        }
      }
    }
    
    // Validar educación
    // No validar educación marcada para eliminación
    let educationValidationPassed = true
    for (const form of educationForms) {
      // Saltar validación si está marcada para eliminación
      if (form.markedForDeletion) continue
      
      const hasAnyField = !!(form.title?.trim() || form.institution?.trim() || form.completion_date?.trim())
      if (hasAnyField) {
        if (!form.title?.trim()) {
          setFieldError(`education_${form.id}_title`, 'El título es obligatorio si completa algún campo')
          educationValidationPassed = false
        } else if (form.title.trim().length < 2) {
          setFieldError(`education_${form.id}_title`, 'El título debe tener al menos 2 caracteres')
          educationValidationPassed = false
        } else if (form.title.trim().length > 100) {
          setFieldError(`education_${form.id}_title`, 'El título no puede exceder 100 caracteres')
          educationValidationPassed = false
        }
        
        if (!form.institution?.trim()) {
          setFieldError(`education_${form.id}_institution`, 'La institución es obligatoria si completa algún campo')
          educationValidationPassed = false
        }
        
        if (!form.completion_date?.trim()) {
          setFieldError(`education_${form.id}_completion_date`, 'La fecha es obligatoria si completa algún campo')
          educationValidationPassed = false
        }
      }
    }
    
    // Validar experiencia laboral
    // No validar experiencia laboral marcada para eliminación
    let workExperienceValidationPassed = true
    for (const form of workExperienceForms) {
      // Saltar validación si está marcada para eliminación
      if (form.markedForDeletion) continue
      
      const hasAnyField = !!(form.company?.trim() || form.position?.trim() || form.start_date?.trim() || form.description?.trim())
      if (hasAnyField) {
        // Validar que la fecha fin no sea anterior a la fecha inicio
        if (form.start_date && form.end_date) {
          try {
            const [endYear, endMonth, endDay] = form.end_date.split('-').map(Number)
            const [startYear, startMonth, startDay] = form.start_date.split('-').map(Number)
            
            if (!isNaN(endYear) && !isNaN(endMonth) && !isNaN(endDay) &&
                !isNaN(startYear) && !isNaN(startMonth) && !isNaN(startDay)) {
              const endDate = new Date(endYear, endMonth - 1, endDay)
              const startDate = new Date(startYear, startMonth - 1, startDay)
              endDate.setHours(0, 0, 0, 0)
              startDate.setHours(0, 0, 0, 0)
              
              if (endDate.getTime() < startDate.getTime()) {
                setFieldError(`work_experience_${form.id}_end_date`, 'La fecha fin no puede ser anterior a la fecha inicio')
                workExperienceValidationPassed = false
              }
            }
          } catch (error) {
            console.error('Error validando fechas de experiencia laboral:', error)
          }
        }
        
        if (!form.company?.trim()) {
          setFieldError(`work_experience_${form.id}_company`, 'La empresa es obligatoria si completa algún campo')
          workExperienceValidationPassed = false
        } else if (form.company.trim().length < 2) {
          setFieldError(`work_experience_${form.id}_company`, 'El nombre de la empresa debe tener al menos 2 caracteres')
          workExperienceValidationPassed = false
        } else if (form.company.trim().length > 100) {
          setFieldError(`work_experience_${form.id}_company`, 'El nombre de la empresa no puede exceder 100 caracteres')
          workExperienceValidationPassed = false
        }
        
        if (!form.position?.trim()) {
          setFieldError(`work_experience_${form.id}_position`, 'El cargo es obligatorio si completa algún campo')
          workExperienceValidationPassed = false
        } else if (form.position.trim().length < 2) {
          setFieldError(`work_experience_${form.id}_position`, 'El cargo debe tener al menos 2 caracteres')
          workExperienceValidationPassed = false
        } else if (form.position.trim().length > 100) {
          setFieldError(`work_experience_${form.id}_position`, 'El cargo no puede exceder 100 caracteres')
          workExperienceValidationPassed = false
        }
        
        if (!form.start_date?.trim()) {
          setFieldError(`work_experience_${form.id}_start_date`, 'La fecha de inicio es obligatoria si completa algún campo')
          workExperienceValidationPassed = false
        }
        
        if (!form.description?.trim()) {
          setFieldError(`work_experience_${form.id}_description`, 'La descripción es obligatoria si completa algún campo')
          workExperienceValidationPassed = false
        } else if (form.description.trim().length < 10) {
          setFieldError(`work_experience_${form.id}_description`, 'La descripción debe tener al menos 10 caracteres')
          workExperienceValidationPassed = false
        } else if (form.description.trim().length > 500) {
          setFieldError(`work_experience_${form.id}_description`, 'La descripción no puede exceder 500 caracteres')
          workExperienceValidationPassed = false
        }
      }
    }
    
    const allValidationsPassed = isValid && 
      regionComunaValidationPassed &&
      formData.source_portal && 
      professionValidationPassed &&
      educationValidationPassed &&
      workExperienceValidationPassed
    
    if (!allValidationsPassed) {
      showToast({
        type: "error",
        title: "Campos incompletos",
        description: "Por favor completa todos los campos obligatorios y corrige los errores antes de continuar.",
      })
      return // No enviar el formulario si hay errores
    }
    
    // Establecer estado de carga antes de enviar
    setIsSubmitting(true)
    try {
      // Filtrar profesiones, educación y experiencia laboral marcadas para eliminación antes de enviar
      const professionFormsToSubmit = professionForms.filter(form => !form.markedForDeletion)
      const educationFormsToSubmit = educationForms.filter(form => !form.markedForDeletion)
      const workExperienceFormsToSubmit = workExperienceForms.filter(form => !form.markedForDeletion)
      await onSubmit(formData, professionFormsToSubmit, educationFormsToSubmit, workExperienceFormsToSubmit)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Información Básica */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Información Básica</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="candidate_nombre">Nombre <span className="text-red-500">*</span></Label>
            <Input
              id="candidate_nombre"
              value={formData.nombre}
              onChange={(e) => {
                setFormData({ ...formData, nombre: e.target.value })
                validateField('nombre', e.target.value, validationSchemas.module2CandidateForm)
              }}
              placeholder="Nombre"
              className={errors.nombre ? "border-destructive" : ""}
            />
            <ValidationErrorDisplay error={errors.nombre} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate_primer_apellido">Primer Apellido <span className="text-red-500">*</span></Label>
            <Input
              id="candidate_primer_apellido"
              value={formData.primer_apellido}
              onChange={(e) => {
                setFormData({ ...formData, primer_apellido: e.target.value })
                validateField('primer_apellido', e.target.value, validationSchemas.module2CandidateForm)
              }}
              placeholder="Primer apellido"
              className={errors.primer_apellido ? "border-destructive" : ""}
            />
            <ValidationErrorDisplay error={errors.primer_apellido} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate_segundo_apellido">Segundo Apellido <span className="text-red-500">*</span></Label>
            <Input
              id="candidate_segundo_apellido"
              value={formData.segundo_apellido}
              onChange={(e) => {
                setFormData({ ...formData, segundo_apellido: e.target.value })
                validateField('segundo_apellido', e.target.value, validationSchemas.module2CandidateForm)
              }}
              placeholder="Segundo apellido"
              className={errors.segundo_apellido ? "border-destructive" : ""}
            />
            <ValidationErrorDisplay error={errors.segundo_apellido} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="candidate_email">Email <span className="text-red-500">*</span></Label>
            <Input
              id="candidate_email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value })
                validateField('email', e.target.value, validationSchemas.module2CandidateForm)
              }}
              placeholder="correo@ejemplo.com"
              className={errors.email ? "border-destructive" : ""}
            />
            <ValidationErrorDisplay error={errors.email} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="candidate_phone">Teléfono (8-12 caracteres) <span className="text-red-500">*</span></Label>
            <Input
              id="candidate_phone"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value })
                validateField('phone', e.target.value, validationSchemas.module2CandidateForm)
              }}
              placeholder="+56912345678"
              className={errors.phone ? "border-destructive" : ""}
            />
            <ValidationErrorDisplay error={errors.phone} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate_rut">RUT (Opcional)</Label>
            <Input
              id="candidate_rut"
              value={formData.rut || ""}
              onChange={(e) => {
                setFormData({ ...formData, rut: e.target.value })
                validateField('rut', e.target.value, validationSchemas.module2CandidateForm)
              }}
              placeholder="12.345.678-9"
              className={errors.rut ? "border-destructive" : ""}
            />
            <ValidationErrorDisplay error={errors.rut} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!formData.birth_date ? "text-muted-foreground" : ""} ${errors.birth_date ? "border-destructive" : ""}`}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formData.birth_date && formData.birth_date.trim() !== ""
                    ? (() => {
                        try {
                          const [year, month, day] = formData.birth_date.split('-').map(Number)
                          const dateObj = new Date(year, month - 1, day)
                          // Validar que la fecha sea válida
                          if (isNaN(dateObj.getTime())) {
                            return "Fecha inválida"
                          }
                          return format(dateObj, "PPP", { locale: es })
                        } catch (error) {
                          return "Fecha inválida"
                        }
                      })()
                    : "Seleccionar fecha de nacimiento"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  captionLayout="dropdown"
                  fromYear={(() => {
                    // Calcular el año mínimo permitido (año actual - 85 años)
                    const currentYear = new Date().getFullYear()
                    return currentYear - 85
                  })()}
                  toYear={new Date().getFullYear()}
                  selected={formData.birth_date && formData.birth_date.trim() !== "" ? (() => {
                    try {
                      const [year, month, day] = formData.birth_date.split('-').map(Number)
                      const dateObj = new Date(year, month - 1, day)
                      // Validar que la fecha sea válida
                      if (isNaN(dateObj.getTime())) {
                        return undefined
                      }
                      return dateObj
                    } catch (error) {
                      return undefined
                    }
                  })() : undefined}
                  defaultMonth={formData.birth_date && formData.birth_date.trim() !== "" ? (() => {
                    try {
                      const [year, month, day] = formData.birth_date.split('-').map(Number)
                      const dateObj = new Date(year, month - 1, day)
                      if (isNaN(dateObj.getTime())) {
                        return new Date()
                      }
                      return dateObj
                    } catch (error) {
                      return new Date()
                    }
                  })() : new Date()}
                  onSelect={(date) => {
                    if (date) {
                      // Convertir Date a formato YYYY-MM-DD usando métodos locales
                      const year = date.getFullYear()
                      const month = String(date.getMonth() + 1).padStart(2, '0')
                      const day = String(date.getDate()).padStart(2, '0')
                      const birthDateStr = `${year}-${month}-${day}`
                      const age = calculateAge(birthDateStr)
                      setFormData({
                        ...formData,
                        birth_date: birthDateStr,
                        age: age,
                      })
                      validateField('birth_date', birthDateStr, validationSchemas.module2CandidateForm)
                    } else {
                      clearError('birth_date')
                      setFormData({ ...formData, birth_date: "", age: 0 })
                    }
                  }}
                  disabled={(date) => {
                    // Deshabilitar fechas futuras y anteriores a 1900
                    const today = new Date()
                    today.setHours(23, 59, 59, 999)
                    const minDate = new Date("1900-01-01")
                    
                    // Deshabilitar fechas que resulten en más de 85 años (validación por año)
                    const currentYear = today.getFullYear()
                    const maxAllowedYear = currentYear - 85
                    const dateYear = date.getFullYear()
                    
                    // Si el año de la fecha es menor al año máximo permitido, deshabilitar
                    if (dateYear < maxAllowedYear) {
                      return true
                    }
                    
                    return date > today || date < minDate
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Edad</Label>
            <Input 
              id="age" 
              type="number" 
              value={formData.age} 
              readOnly 
              className={`bg-muted ${errors.birth_date ? "border-destructive" : ""}`} 
            />
            <ValidationErrorDisplay error={errors.birth_date} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="region">Región</Label>
            <Select
              value={formData.region}
              onValueChange={(value) => {
                const newFormData = { ...formData, region: value, comuna: "" }
                setFormData(newFormData)
                validateField('region', value, validationSchemas.module2CandidateForm, newFormData)
                // Validar comuna cuando cambia la región
                if (value) {
                  validateField('comuna', "", validationSchemas.module2CandidateForm, newFormData)
                } else {
                  clearError('comuna')
                }
              }}
              disabled={loadingLists}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione región (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {regiones.map((region) => (
                  <SelectItem key={region.id_region} value={region.nombre_region}>
                    {region.nombre_region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ValidationErrorDisplay error={errors.region} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comuna">Comuna {formData.region && <span className="text-red-500">*</span>}</Label>
            <Select
              value={formData.comuna}
              onValueChange={(value) => {
                setFormData({ ...formData, comuna: value })
                validateField('comuna', value, validationSchemas.module2CandidateForm, formData)
              }}
              disabled={loadingLists || !formData.region}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.region ? "Seleccione comuna" : "Primero seleccione región"} />
              </SelectTrigger>
              <SelectContent>
                {comunasFiltradas.map((comuna) => (
                  <SelectItem key={comuna.id_comuna} value={comuna.nombre_comuna}>
                    {comuna.nombre_comuna}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ValidationErrorDisplay error={errors.comuna} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nacionalidad">Nacionalidad</Label>
            <Select
              value={formData.nacionalidad}
              onValueChange={(value) => {
                setFormData({ ...formData, nacionalidad: value })
                validateField('nacionalidad', value, validationSchemas.module2CandidateForm)
              }}
              disabled={loadingLists}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione nacionalidad (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {nacionalidades.map((nac) => (
                  <SelectItem key={nac.id_nacionalidad} value={nac.nombre_nacionalidad}>
                    {nac.nombre_nacionalidad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ValidationErrorDisplay error={errors.nacionalidad} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rubro">Rubro</Label>
            <Select
              value={formData.rubro}
              onValueChange={(value) => {
                setFormData({ ...formData, rubro: value })
                validateField('rubro', value, validationSchemas.module2CandidateForm)
              }}
              disabled={loadingLists}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione rubro (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {rubros.map((rubro) => (
                  <SelectItem key={rubro.id_rubro} value={rubro.nombre_rubro}>
                    {rubro.nombre_rubro}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ValidationErrorDisplay error={errors.rubro} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_portal">
              Portal de Origen <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.source_portal}
              onValueChange={(value) => {
                setFormData({ ...formData, source_portal: value })
                clearError('source_portal')
              }}
              disabled={loadingLists}
            >
              <SelectTrigger className={errors.source_portal ? "border-destructive" : ""}>
                <SelectValue placeholder={loadingLists ? "Cargando portales..." : "Seleccionar portal"} />
              </SelectTrigger>
              <SelectContent>
                {portalesDB.map((portal) => (
                  <SelectItem key={portal.id} value={portal.id.toString()}>
                    {portal.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ValidationErrorDisplay error={errors.source_portal} />
            <p className="text-xs text-muted-foreground">
              Portal desde donde proviene el candidato
            </p>
          </div>
        </div>

        {mode === 'create' && (
          <div className="space-y-2">
            <Label htmlFor="cv_file">CV (Archivo) (Opcional)</Label>
            <div 
              className={`border-2 border-dashed rounded-lg p-4 text-center hover:border-green-400 hover:bg-green-50 transition-colors cursor-pointer ${errors.cv_file ? 'border-destructive' : 'border-gray-300'}`}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDragEnter={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const files = e.dataTransfer.files
                if (files.length > 0) {
                  const file = files[0]
                  if (file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
                    setFormData({ ...formData, cv_file: file })
                    clearError('cv_file')
                  }
                }
              }}
              onClick={() => document.getElementById('cv_file')?.click()}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-700">
                    {formData.cv_file ? 'CV seleccionado' : 'Arrastra tu CV aquí'}
                  </p>
                  <p className="text-xs text-gray-500">
                    o haz clic para seleccionar
                  </p>
                </div>
                {formData.cv_file ? (
                  <div className="flex items-center space-x-2 text-green-600">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium">{formData.cv_file.name}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    PDF, DOC, DOCX
                  </p>
                )}
              </div>
            </div>
            <Input
              id="cv_file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                setFormData({ ...formData, cv_file: e.target.files?.[0] || null })
                clearError('cv_file')
              }}
              className="hidden"
            />
            <ValidationErrorDisplay error={errors.cv_file} />
            <p className="text-xs text-muted-foreground">Formatos aceptados: PDF, DOC, DOCX</p>
          </div>
        )}

      </div>

      {/* Profesión */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-lg font-semibold">Profesión (Opcional)</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addProfessionForm}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Otra Profesión
          </Button>
        </div>

        {professionForms.map((form, index) => {
          const hasFormFields = !!(
            (form.profession && String(form.profession).trim()) || 
            (form.profession_institution && String(form.profession_institution).trim()) || 
            (form.profession_date && String(form.profession_date).trim())
          )
          const showDiscardButton = professionForms.length > 1 ? true : hasFormFields
          
          // Verificar si es una profesión existente
          const isExistingProfession = !!form.professionId
          const isMarkedForDeletion = form.markedForDeletion === true
          
          // Calcular el número de profesión (contando solo las del mismo tipo)
          const existingProfessions = professionForms.filter(f => f.professionId)
          const newProfessions = professionForms.filter(f => !f.professionId)
          const professionNumber = isExistingProfession 
            ? existingProfessions.indexOf(form) + 1
            : newProfessions.indexOf(form) + 1
          
          return (
            <Card key={form.id} className={`${isExistingProfession ? "border-l-4 border-l-blue-500" : ""} ${isMarkedForDeletion ? "opacity-50 bg-gray-100" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {isMarkedForDeletion ? (
                      <span className="text-destructive line-through">
                        {isExistingProfession ? `Profesión ${professionNumber} (Existente) - Se eliminará al guardar` : `Profesión ${professionNumber} - Se eliminará al guardar`}
                      </span>
                    ) : (
                      <>
                        {isExistingProfession ? `Profesión ${professionNumber} (Existente)` : `Profesión ${professionNumber}`}
                      </>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isMarkedForDeletion ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Deshacer la eliminación
                          setProfessionForms(forms => 
                            forms.map(f => 
                              f.id === form.id 
                                ? { ...f, markedForDeletion: false }
                                : f
                            )
                          )
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Deshacer
                      </Button>
                    ) : showDiscardButton ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDiscardSingleProfession(form.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isExistingProfession ? "Eliminar" : "Descartar"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`space-y-4 ${isMarkedForDeletion ? "pointer-events-none" : ""}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Profesión</Label>
                    <Select
                      value={form.profession || ''}
                      onValueChange={(value) => updateProfessionForm(form.id, 'profession', value)}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className={`bg-white ${errors[`profession_${form.id}_profession`] ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Seleccione profesión" />
                      </SelectTrigger>
                      <SelectContent>
                        {profesiones.map((prof) => (
                          <SelectItem key={prof.id_profesion} value={prof.id_profesion.toString()}>
                            {prof.nombre_profesion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ValidationErrorDisplay error={errors[`profession_${form.id}_profession`]} />
                  </div>
                  <div className="space-y-2">
                    <Label>Institución</Label>
                    <Select
                      value={form.profession_institution || ''}
                      onValueChange={(value) => updateProfessionForm(form.id, 'profession_institution', value)}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className={`bg-white ${errors[`profession_${form.id}_institution`] ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Seleccione institución" />
                      </SelectTrigger>
                      <SelectContent>
                        {instituciones.map((inst) => (
                          <SelectItem key={inst.id_institucion} value={inst.nombre_institucion}>
                            {inst.nombre_institucion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ValidationErrorDisplay error={errors[`profession_${form.id}_institution`]} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Obtención</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`bg-white w-full justify-start text-left font-normal ${!form.profession_date ? "text-muted-foreground" : ""} ${errors[`profession_${form.id}_date`] ? "border-destructive" : ""}`}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {form.profession_date && form.profession_date.trim() !== ""
                          ? (() => {
                              try {
                                const [year, month, day] = form.profession_date.split('-').map(Number)
                                const dateObj = new Date(year, month - 1, day)
                                // Validar que la fecha sea válida
                                if (isNaN(dateObj.getTime())) {
                                  return "Fecha inválida"
                                }
                                return format(dateObj, "PPP", { locale: es })
                              } catch (error) {
                                return "Fecha inválida"
                              }
                            })()
                          : "Seleccionar fecha de obtención"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        captionLayout="dropdown"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        selected={form.profession_date && form.profession_date.trim() !== "" ? (() => {
                          try {
                            const [year, month, day] = form.profession_date.split('-').map(Number)
                            const dateObj = new Date(year, month - 1, day)
                            // Validar que la fecha sea válida
                            if (isNaN(dateObj.getTime())) {
                              return undefined
                            }
                            return dateObj
                          } catch (error) {
                            return undefined
                          }
                        })() : undefined}
                        defaultMonth={form.profession_date && form.profession_date.trim() !== "" ? (() => {
                          try {
                            const [year, month, day] = form.profession_date.split('-').map(Number)
                            const dateObj = new Date(year, month - 1, day)
                            if (isNaN(dateObj.getTime())) {
                              return new Date()
                            }
                            return dateObj
                          } catch (error) {
                            return new Date()
                          }
                        })() : new Date()}
                        onSelect={(date) => {
                          if (date) {
                            // Convertir Date a formato YYYY-MM-DD usando métodos locales
                            const year = date.getFullYear()
                            const month = String(date.getMonth() + 1).padStart(2, '0')
                            const day = String(date.getDate()).padStart(2, '0')
                            const dateStr = `${year}-${month}-${day}`
                            updateProfessionForm(form.id, 'profession_date', dateStr)
                          } else {
                            updateProfessionForm(form.id, 'profession_date', '')
                          }
                        }}
                        disabled={(date) => {
                          // Deshabilitar fechas futuras y anteriores a 1900
                          const today = new Date()
                          today.setHours(23, 59, 59, 999)
                          const minDate = new Date("1900-01-01")
                          return date > today || date < minDate
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <ValidationErrorDisplay error={errors[`profession_${form.id}_date`]} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Formación Académica (Postgrados/Capacitaciones) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold border-b pb-2">Postgrados o Capacitaciones (Opcional)</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEducationForm}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Otra Capacitación
          </Button>
        </div>

        {educationForms.map((form, index) => {
          const hasFormFields = !!(
            (form.title && String(form.title).trim()) || 
            (form.institution && String(form.institution).trim()) || 
            (form.completion_date && String(form.completion_date).trim())
          )
          const showDiscardButton = educationForms.length > 1 ? true : hasFormFields
          
          // Verificar si es una educación existente
          const isExistingEducation = !!form.educationId
          const isMarkedForDeletion = form.markedForDeletion === true
          
          // Calcular el número de capacitación (contando solo las del mismo tipo)
          const existingEducations = educationForms.filter(f => f.educationId)
          const newEducations = educationForms.filter(f => !f.educationId)
          const educationNumber = isExistingEducation 
            ? existingEducations.indexOf(form) + 1
            : newEducations.indexOf(form) + 1
          
          return (
            <Card key={form.id} className={`${isExistingEducation ? "border-l-4 border-l-blue-500" : ""} ${isMarkedForDeletion ? "opacity-50 bg-gray-100" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {isMarkedForDeletion ? (
                      <span className="text-destructive line-through">
                        {isExistingEducation ? `Capacitación ${educationNumber} (Existente) - Se eliminará al guardar` : `Capacitación ${educationNumber} - Se eliminará al guardar`}
                      </span>
                    ) : (
                      <>
                        {isExistingEducation ? `Capacitación ${educationNumber} (Existente)` : `Capacitación ${educationNumber}`}
                      </>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isMarkedForDeletion ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Deshacer la eliminación
                          setEducationForms(forms => 
                            forms.map(f => 
                              f.id === form.id 
                                ? { ...f, markedForDeletion: false }
                                : f
                            )
                          )
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Deshacer
                      </Button>
                    ) : showDiscardButton ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDiscardSingleEducation(form.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isExistingEducation ? "Eliminar" : "Descartar"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`space-y-4 ${isMarkedForDeletion ? "pointer-events-none" : ""}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del Postgrado/Capacitación (mínimo 2 caracteres)</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => updateEducationForm(form.id, 'title', e.target.value)}
                      placeholder="Ej: Magíster en Administración (mínimo 2 caracteres)"
                      maxLength={100}
                      className={`bg-white ${errors[`education_${form.id}_title`] ? "border-destructive" : ""}`}
                    />
                    <div className="text-sm text-muted-foreground text-right">
                      {(form.title || "").length}/100 caracteres (mínimo 2)
                    </div>
                    <ValidationErrorDisplay error={errors[`education_${form.id}_title`]} />
                  </div>

                  <div className="space-y-2">
                    <Label>Institución</Label>
                    <Select
                      value={form.institution}
                      onValueChange={(value) => updateEducationForm(form.id, 'institution', value)}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className={`bg-white ${errors[`education_${form.id}_institution`] ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Seleccione institución" />
                      </SelectTrigger>
                      <SelectContent>
                        {instituciones.map((inst) => (
                          <SelectItem key={inst.id_institucion} value={inst.nombre_institucion}>
                            {inst.nombre_institucion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ValidationErrorDisplay error={errors[`education_${form.id}_institution`]} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Obtención</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`bg-white w-full justify-start text-left font-normal ${!form.completion_date ? "text-muted-foreground" : ""} ${errors[`education_${form.id}_completion_date`] ? "border-destructive" : ""}`}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {form.completion_date && form.completion_date.trim() !== ""
                          ? (() => {
                              try {
                                const [year, month, day] = form.completion_date.split('-').map(Number)
                                const dateObj = new Date(year, month - 1, day)
                                // Validar que la fecha sea válida
                                if (isNaN(dateObj.getTime())) {
                                  return "Fecha inválida"
                                }
                                return format(dateObj, "PPP", { locale: es })
                              } catch (error) {
                                return "Fecha inválida"
                              }
                            })()
                          : "Seleccionar fecha de obtención"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        captionLayout="dropdown"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                        selected={form.completion_date && form.completion_date.trim() !== "" ? (() => {
                          try {
                            const [year, month, day] = form.completion_date.split('-').map(Number)
                            const dateObj = new Date(year, month - 1, day)
                            // Validar que la fecha sea válida
                            if (isNaN(dateObj.getTime())) {
                              return undefined
                            }
                            return dateObj
                          } catch (error) {
                            return undefined
                          }
                        })() : undefined}
                        defaultMonth={form.completion_date && form.completion_date.trim() !== "" ? (() => {
                          try {
                            const [year, month, day] = form.completion_date.split('-').map(Number)
                            const dateObj = new Date(year, month - 1, day)
                            if (isNaN(dateObj.getTime())) {
                              return new Date()
                            }
                            return dateObj
                          } catch (error) {
                            return new Date()
                          }
                        })() : new Date()}
                        onSelect={(date) => {
                          if (date) {
                            // Convertir Date a formato YYYY-MM-DD usando métodos locales
                            const year = date.getFullYear()
                            const month = String(date.getMonth() + 1).padStart(2, '0')
                            const day = String(date.getDate()).padStart(2, '0')
                            const dateStr = `${year}-${month}-${day}`
                            updateEducationForm(form.id, 'completion_date', dateStr)
                          } else {
                            updateEducationForm(form.id, 'completion_date', '')
                          }
                        }}
                        disabled={(date) => {
                          // Deshabilitar fechas futuras y anteriores a 1900
                          const today = new Date()
                          today.setHours(23, 59, 59, 999)
                          const minDate = new Date("1900-01-01")
                          return date > today || date < minDate
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <ValidationErrorDisplay error={errors[`education_${form.id}_completion_date`]} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Experiencia Laboral */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold border-b pb-2">Experiencia Laboral (Opcional)</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addWorkExperienceForm}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Otra Experiencia
          </Button>
        </div>

        {workExperienceForms.map((form, index) => {
          const hasFormFields = !!(
            (form.company && String(form.company).trim()) || 
            (form.position && String(form.position).trim()) || 
            (form.start_date && String(form.start_date).trim()) || 
            (form.end_date && String(form.end_date).trim()) ||
            (form.description && String(form.description).trim())
          )
          const showDiscardButton = workExperienceForms.length > 1 ? true : hasFormFields
          
          // Verificar si es una experiencia laboral existente
          const isExistingWorkExperience = !!form.workExperienceId
          const isMarkedForDeletion = form.markedForDeletion === true
          
          // Calcular el número de experiencia (contando solo las del mismo tipo)
          const existingWorkExperiences = workExperienceForms.filter(f => f.workExperienceId)
          const newWorkExperiences = workExperienceForms.filter(f => !f.workExperienceId)
          const workExperienceNumber = isExistingWorkExperience 
            ? existingWorkExperiences.indexOf(form) + 1
            : newWorkExperiences.indexOf(form) + 1
          
          return (
            <Card key={form.id} className={`${isExistingWorkExperience ? "border-l-4 border-l-blue-500" : ""} ${isMarkedForDeletion ? "opacity-50 bg-gray-100" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {isMarkedForDeletion ? (
                      <span className="text-destructive line-through">
                        {isExistingWorkExperience ? `Experiencia ${workExperienceNumber} (Existente) - Se eliminará al guardar` : `Experiencia ${workExperienceNumber} - Se eliminará al guardar`}
                      </span>
                    ) : (
                      <>
                        {isExistingWorkExperience ? `Experiencia ${workExperienceNumber} (Existente)` : `Experiencia ${workExperienceNumber}`}
                      </>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isMarkedForDeletion ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Deshacer la eliminación
                          setWorkExperienceForms(forms => 
                            forms.map(f => 
                              f.id === form.id 
                                ? { ...f, markedForDeletion: false }
                                : f
                            )
                          )
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Deshacer
                      </Button>
                    ) : showDiscardButton ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDiscardSingleWorkExperience(form.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isExistingWorkExperience ? "Eliminar" : "Descartar"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`space-y-4 ${isMarkedForDeletion ? "pointer-events-none" : ""}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Empresa (mínimo 2 caracteres)</Label>
                    <Input
                      value={form.company}
                      onChange={(e) => updateWorkExperienceForm(form.id, 'company', e.target.value)}
                      placeholder="Nombre de la empresa (mínimo 2 caracteres)"
                      maxLength={100}
                      className={`bg-white ${errors[`work_experience_${form.id}_company`] ? "border-destructive" : ""}`}
                    />
                    <div className="text-sm text-muted-foreground text-right">
                      {(form.company || "").length}/100 caracteres (mínimo 2)
                    </div>
                    <ValidationErrorDisplay error={errors[`work_experience_${form.id}_company`]} />
                  </div>

                  <div className="space-y-2">
                    <Label>Cargo (mínimo 2 caracteres)</Label>
                    <Input
                      value={form.position}
                      onChange={(e) => updateWorkExperienceForm(form.id, 'position', e.target.value)}
                      placeholder="Título del cargo (mínimo 2 caracteres)"
                      maxLength={100}
                      className={`bg-white ${errors[`work_experience_${form.id}_position`] ? "border-destructive" : ""}`}
                    />
                    <div className="text-sm text-muted-foreground text-right">
                      {(form.position || "").length}/100 caracteres (mínimo 2)
                    </div>
                    <ValidationErrorDisplay error={errors[`work_experience_${form.id}_position`]} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Inicio</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`bg-white w-full justify-start text-left font-normal ${!form.start_date ? "text-muted-foreground" : ""} ${errors[`work_experience_${form.id}_start_date`] ? "border-destructive" : ""}`}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {form.start_date && form.start_date.trim() !== ""
                            ? (() => {
                                try {
                                  const [year, month, day] = form.start_date.split('-').map(Number)
                                  const dateObj = new Date(year, month - 1, day)
                                  // Validar que la fecha sea válida
                                  if (isNaN(dateObj.getTime())) {
                                    return "Fecha inválida"
                                  }
                                  return format(dateObj, "PPP", { locale: es })
                                } catch (error) {
                                  return "Fecha inválida"
                                }
                              })()
                            : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          captionLayout="dropdown"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                          selected={form.start_date && form.start_date.trim() !== "" ? (() => {
                            try {
                              const [year, month, day] = form.start_date.split('-').map(Number)
                              const dateObj = new Date(year, month - 1, day)
                              // Validar que la fecha sea válida
                              if (isNaN(dateObj.getTime())) {
                                return undefined
                              }
                              return dateObj
                            } catch (error) {
                              return undefined
                            }
                          })() : undefined}
                          defaultMonth={form.start_date && form.start_date.trim() !== "" ? (() => {
                            try {
                              const [year, month, day] = form.start_date.split('-').map(Number)
                              const dateObj = new Date(year, month - 1, day)
                              if (isNaN(dateObj.getTime())) {
                                return new Date()
                              }
                              return dateObj
                            } catch (error) {
                              return new Date()
                            }
                          })() : new Date()}
                          onSelect={(date) => {
                            if (date) {
                              // Convertir Date a formato YYYY-MM-DD usando métodos locales
                              const year = date.getFullYear()
                              const month = String(date.getMonth() + 1).padStart(2, '0')
                              const day = String(date.getDate()).padStart(2, '0')
                              const dateStr = `${year}-${month}-${day}`
                              updateWorkExperienceForm(form.id, 'start_date', dateStr)
                            } else {
                              updateWorkExperienceForm(form.id, 'start_date', '')
                            }
                          }}
                          disabled={(date) => {
                            // Deshabilitar fechas futuras
                            const today = new Date()
                            today.setHours(23, 59, 59, 999)
                            return date > today
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <ValidationErrorDisplay error={errors[`work_experience_${form.id}_start_date`]} />
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`bg-white w-full justify-start text-left font-normal ${!form.end_date ? "text-muted-foreground" : ""} ${errors[`work_experience_${form.id}_end_date`] ? "border-destructive" : ""}`}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {form.end_date && form.end_date.trim() !== ""
                            ? (() => {
                                try {
                                  const [year, month, day] = form.end_date.split('-').map(Number)
                                  const dateObj = new Date(year, month - 1, day)
                                  // Validar que la fecha sea válida
                                  if (isNaN(dateObj.getTime())) {
                                    return "Fecha inválida"
                                  }
                                  return format(dateObj, "PPP", { locale: es })
                                } catch (error) {
                                  return "Fecha inválida"
                                }
                              })()
                            : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          key={`end-date-calendar-${form.id}-${form.start_date || 'no-date'}`}
                          mode="single"
                          captionLayout="dropdown"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                          selected={form.end_date && form.end_date.trim() !== "" ? (() => {
                            try {
                              const [year, month, day] = form.end_date.split('-').map(Number)
                              const dateObj = new Date(year, month - 1, day)
                              // Validar que la fecha sea válida
                              if (isNaN(dateObj.getTime())) {
                                return undefined
                              }
                              return dateObj
                            } catch (error) {
                              return undefined
                            }
                          })() : undefined}
                          defaultMonth={form.end_date && form.end_date.trim() !== "" ? (() => {
                            try {
                              const [year, month, day] = form.end_date.split('-').map(Number)
                              const dateObj = new Date(year, month - 1, day)
                              if (isNaN(dateObj.getTime())) {
                                return new Date()
                              }
                              return dateObj
                            } catch (error) {
                              return new Date()
                            }
                          })() : new Date()}
                          onSelect={(date) => {
                            if (date) {
                              // Convertir Date a formato YYYY-MM-DD usando métodos locales
                              const year = date.getFullYear()
                              const month = String(date.getMonth() + 1).padStart(2, '0')
                              const day = String(date.getDate()).padStart(2, '0')
                              const dateStr = `${year}-${month}-${day}`
                              updateWorkExperienceForm(form.id, 'end_date', dateStr)
                            } else {
                              updateWorkExperienceForm(form.id, 'end_date', '')
                            }
                          }}
                          disabled={(date) => {
                            // Deshabilitar fechas futuras
                            const today = new Date()
                            today.setHours(23, 59, 59, 999)
                            if (date > today) {
                              return true
                            }
                            
                            // Deshabilitar fechas anteriores a la fecha de inicio
                            if (form.start_date && form.start_date.trim() !== "") {
                              try {
                                // Parsear la fecha de inicio usando componentes locales para evitar problemas de zona horaria
                                const [startYear, startMonth, startDay] = form.start_date.split('-').map(Number)
                                
                                // Validar que los valores sean válidos
                                if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay)) {
                                  return false
                                }
                                
                                const startDate = new Date(startYear, startMonth - 1, startDay)
                                startDate.setHours(0, 0, 0, 0)
                                
                                // Obtener componentes de la fecha a comparar usando métodos locales
                                const compareYear = date.getFullYear()
                                const compareMonth = date.getMonth()
                                const compareDay = date.getDate()
                                const compareDate = new Date(compareYear, compareMonth, compareDay)
                                compareDate.setHours(0, 0, 0, 0)
                                
                                // Deshabilitar si la fecha es anterior (no igual) a la fecha de inicio
                                // Comparar usando getTime() para asegurar comparación correcta
                                const isBefore = compareDate.getTime() < startDate.getTime()
                                if (isBefore) {
                                  return true
                                }
                              } catch (error) {
                                // Si hay error parseando, no deshabilitar
                                console.error('Error parseando fecha de inicio:', error)
                              }
                            }
                            
                            return false
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <ValidationErrorDisplay error={errors[`work_experience_${form.id}_end_date`]} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción de Funciones (mínimo 10 caracteres)</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => updateWorkExperienceForm(form.id, 'description', e.target.value)}
                    placeholder="Principales responsabilidades y logros (mínimo 10 caracteres)"
                    maxLength={500}
                    rows={3}
                    className={`bg-white ${errors[`work_experience_${form.id}_description`] ? "border-destructive" : ""}`}
                  />
                  <div className="text-sm text-muted-foreground text-right">
                    {(form.description || "").length}/500 caracteres (mínimo 10)
                  </div>
                  <ValidationErrorDisplay error={errors[`work_experience_${form.id}_description`]} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Respuestas del Portal */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b pb-2">Respuestas del Portal (Opcional)</h3>
        <p className="text-sm text-muted-foreground">
          Información adicional proporcionada por el candidato en el portal de empleo
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivación</Label>
            <Textarea
              value={formData.portal_responses.motivation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  portal_responses: { ...formData.portal_responses, motivation: e.target.value },
                })
              }
              placeholder="¿Por qué está interesado en esta posición?"
              rows={3}
              maxLength={300}
            />
            <div className="text-sm text-muted-foreground text-right">
              {(formData.portal_responses.motivation || "").length}/300 caracteres
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expectativa de Renta</Label>
              <Input
                value={formData.portal_responses.salary_expectation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    portal_responses: {
                      ...formData.portal_responses,
                      salary_expectation: e.target.value,
                    },
                  })
                }
                placeholder="Ej: $2.500.000 - $3.000.000"
              />
            </div>

            <div className="space-y-2">
              <Label>Disponibilidad del Postulante</Label>
              <Select
                value={formData.portal_responses.availability}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    portal_responses: { ...formData.portal_responses, availability: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar disponibilidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inmediata">Inmediata</SelectItem>
                  <SelectItem value="1 semana">1 semana</SelectItem>
                  <SelectItem value="2 semanas">2 semanas</SelectItem>
                  <SelectItem value="1 mes">1 mes</SelectItem>
                  <SelectItem value="2 meses">2 meses</SelectItem>
                  <SelectItem value="A convenir">A convenir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Situación Familiar</Label>
            <Textarea
              value={formData.portal_responses.family_situation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  portal_responses: {
                    ...formData.portal_responses,
                    family_situation: e.target.value,
                  },
                })
              }
              placeholder="Información sobre situación familiar que pueda afectar la disponibilidad"
              rows={2}
              maxLength={300}
            />
            <div className="text-sm text-muted-foreground text-right">
              {(formData.portal_responses.family_situation || "").length}/300 caracteres
            </div>
          </div>

          <div className="space-y-2">
            <Label>Manejo de Inglés (Nivel)</Label>
            <Textarea
              value={formData.portal_responses.english_level}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  portal_responses: { ...formData.portal_responses, english_level: e.target.value },
                })
              }
              placeholder="Ej: Básico, Intermedio, Avanzado"
              rows={2}
              maxLength={100}
            />
            <div className="text-sm text-muted-foreground text-right">
              {(formData.portal_responses.english_level || "").length}/100 caracteres
            </div>
          </div>

          <div className="space-y-2">
            <Label>Software o Herramientas</Label>
            <Textarea
              value={formData.portal_responses.software_tools}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  portal_responses: { ...formData.portal_responses, software_tools: e.target.value },
                })
              }
              placeholder="Ej: Excel, Photoshop, AutoCAD"
              rows={2}
              maxLength={100}
            />
            <div className="text-sm text-muted-foreground text-right">
              {(formData.portal_responses.software_tools || "").length}/100 caracteres
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Checkbox
              id="has_disability_credential"
              checked={formData.has_disability_credential}
              onCheckedChange={(checked) => setFormData({ ...formData, has_disability_credential: checked === true })}
              className="border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <Label htmlFor="has_disability_credential" className="text-sm font-medium text-blue-800 cursor-pointer">
              Cuenta con credencial de discapacidad
            </Label>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Checkbox
              id="licencia"
              checked={formData.licencia}
              onCheckedChange={(checked) => setFormData({ ...formData, licencia: checked === true })}
              className="border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <Label htmlFor="licencia" className="text-sm font-medium text-blue-800 cursor-pointer">
              Licencia de Conducir
            </Label>
          </div>
        </div>
      </div>

      {/* Evaluación del Consultor */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Valoración del Consultor</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-6 w-6 cursor-pointer ${
                  star <= formData.consultant_rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
                onClick={() => setFormData({ ...formData, consultant_rating: star })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            mode === 'create' ? "Agregar Candidato" : "Guardar Cambios"
          )}
        </Button>
      </div>
    </div>
  )
}

