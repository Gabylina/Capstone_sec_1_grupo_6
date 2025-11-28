"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { serviceTypeLabels, processStatusLabels } from "@/lib/utils"
import { getCandidatesByProcess } from "@/lib/api"
import { formatDate, getStatusColor, isProcessBlocked } from "@/lib/utils"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { registerLocale, setDefaultLocale } from "react-datepicker"
import { es } from "date-fns/locale"

// Configurar español como idioma por defecto
registerLocale("es", es)
setDefaultLocale("es")
import { Building2, User, Calendar, Target, FileText, Download, Settings, FileSpreadsheet, Trash2, Plus, Pencil, Loader2 } from "lucide-react"
import type { Process, ProcessStatus, Candidate, WorkExperience, Education } from "@/lib/types"
import { useState, useEffect } from "react"
import { descripcionCargoService, solicitudService, regionService, comunaService, profesionService, rubroService, nacionalidadService, candidatoService, institucionService } from "@/lib/api"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import CVViewerDialog from "./cv-viewer-dialog"
import { ProcessBlocked } from "./ProcessBlocked"

interface ProcessModule1Props {
  process: Process
  descripcionCargo?: any
}

export function ProcessModule1({ process, descripcionCargo }: ProcessModule1Props) {
  const { showToast } = useToastNotification()

  // Función helper para procesar mensajes de error de la API y convertirlos en mensajes amigables
  const processApiErrorMessage = (errorMessage: string | undefined | null, defaultMessage: string): string => {
    if (!errorMessage) return defaultMessage
    const message = errorMessage.toLowerCase()
    
    // Mensajes específicos del módulo 1
    if (message.includes('candidato no encontrado')) {
      return 'No se encontró el candidato solicitado'
    }
    if (message.includes('profesión no encontrada')) {
      return 'Una de las profesiones seleccionadas no es válida. Por favor verifica las profesiones'
    }
    if (message.includes('etapa módulo 2 no encontrada') || message.includes('etapa módulo 4 no encontrada')) {
      return 'No se pudo encontrar la configuración del módulo. Por favor contacta al administrador'
    }
    if (message.includes('id de solicitud inválido')) {
      return 'El identificador de la solicitud no es válido'
    }
    if (message.includes('ha ocurrido un error inesperado')) {
      return errorMessage // Ya es un mensaje amigable
    }
    if (message.includes('solicitud no encontrada')) {
      return 'No se encontró la solicitud solicitada'
    }
    
    // Mensajes generales
    if (message.includes('validate') && message.includes('field')) {
      return 'Por favor verifica que todos los campos estén completos correctamente'
    }
    if (message.includes('not found') || message.includes('no encontrado')) {
      return 'El recurso solicitado no fue encontrado'
    }
    if (message.includes('unauthorized') || message.includes('no autorizado')) {
      return 'No tienes permisos para realizar esta acción'
    }
    if (message.includes('forbidden') || message.includes('prohibido')) {
      return 'Acceso denegado'
    }
    if (message.includes('network') || message.includes('red')) {
      return 'Error de conexión. Por favor verifica tu conexión a internet'
    }
    if (message.includes('timeout')) {
      return 'La operación tardó demasiado. Por favor intenta nuevamente'
    }
    if (message.includes('duplicate') || message.includes('duplicado')) {
      return 'Ya existe un registro con esta información'
    }
    if (message.includes('constraint') || message.includes('restricción')) {
      return 'No se puede realizar esta acción debido a restricciones de datos'
    }
    if (message.includes('invalid') || message.includes('inválido')) {
      return 'Los datos proporcionados no son válidos'
    }
    if (message.includes('requerido') || message.includes('required')) {
      return errorMessage // Ya es un mensaje amigable en español
    }
    
    // Si el mensaje ya está en español y es claro, devolverlo capitalizado
    if (message.length > 0 && message[0] === message[0].toLowerCase()) {
      return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
    }
    return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
  }
  const [personalData, setPersonalData] = useState({
    name: "",
    rut: "",
    email: "",
    phone: "",
    birth_date: "",
    age: 0,
    region: "",
    comuna: "",
    nacionalidad: "",
    rubro: "",
    has_disability_credential: false,
    english_level: "",
    software_tools: "",
  })
  
  // Estados para profesiones múltiples
  const [professions, setProfessions] = useState<Array<{
    id: string
    profession: string
    institution: string
    date: string
  }>>([])
  const [newProfession, setNewProfession] = useState({
    profession: "",
    institution: "",
    date: "",
  })

  const [processStatus, setProcessStatus] = useState<ProcessStatus>((process.estado_solicitud || process.status) as ProcessStatus)
  const [statusChangeReason, setStatusChangeReason] = useState("")
  const [statusChangeReasonError, setStatusChangeReasonError] = useState("")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Estados para listas desplegables
  const [regiones, setRegiones] = useState<any[]>([])
  const [todasLasComunas, setTodasLasComunas] = useState<any[]>([])
  const [comunasFiltradas, setComunasFiltradas] = useState<any[]>([])
  const [profesiones, setProfesiones] = useState<any[]>([])
  const [rubros, setRubros] = useState<any[]>([])
  const [nacionalidades, setNacionalidades] = useState<any[]>([])
  const [instituciones, setInstituciones] = useState<any[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  const [savingCandidate, setSavingCandidate] = useState(false)
  const [isAdvancingToModule2, setIsAdvancingToModule2] = useState(false)
  const [isAdvancingToModule4, setIsAdvancingToModule4] = useState(false)

  // Estados para experiencia laboral y educación
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([])
  const [education, setEducation] = useState<Education[]>([])
  const [newWorkExperience, setNewWorkExperience] = useState({
    company: "",
    position: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
    comments: "",
    exit_reason: "",
  })
  const [newEducation, setNewEducation] = useState({
    institution: "",
    title: "",
    completion_date: "",
  })
  const [excelData, setExcelData] = useState<any>(null)
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [estadosDisponibles, setEstadosDisponibles] = useState<any[]>([])
  const [loadingEstados, setLoadingEstados] = useState(false)
  const [showStatusChange, setShowStatusChange] = useState(false)
  const [selectedEstado, setSelectedEstado] = useState<string>("")
  const [showCVViewer, setShowCVViewer] = useState(false)
  const [showFullFormForNonCV, setShowFullFormForNonCV] = useState(false)
  const [showAddProfessionForm, setShowAddProfessionForm] = useState(false)
  const [showAddEducationForm, setShowAddEducationForm] = useState(false)
  const [showAddWorkExperienceForm, setShowAddWorkExperienceForm] = useState(false)
  const [editingProfessionId, setEditingProfessionId] = useState<string | null>(null)
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null)
  const [editingWorkExperienceId, setEditingWorkExperienceId] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'profession' | 'education' | 'workExperience' | null; id: string | null }>({
    open: false,
    type: null,
    id: null
  })

  const isEvaluationProcess =
    (process.service_type === "ES" || process.service_type === "TS")

  // Load candidates (para proceso de evaluación)
  useEffect(() => {
    if (isEvaluationProcess) {
      const loadCandidates = async () => {
        try {
          setIsLoading(true)
          const candidatesData = await getCandidatesByProcess(process.id)
          setCandidates(candidatesData)
        } catch (error: any) {
          const errorMsg = processApiErrorMessage(error.message, "Error al cargar candidatos")
          console.error('❌ Error al cargar candidatos:', errorMsg)
          // No mostrar toast aquí para no interrumpir la carga inicial, solo loguear
        } finally {
          setIsLoading(false)
        }
      }
      loadCandidates()
    }
  }, [process.id, isEvaluationProcess])

  // Load estados disponibles
  useEffect(() => {
    const loadEstados = async () => {
      try {
        setLoadingEstados(true)
        const response = await solicitudService.getEstadosSolicitud()
        if (response.success && response.data) {
          setEstadosDisponibles(response.data)
        }
      } catch (error: any) {
        console.error("Error loading estados:", error)
        const errorMsg = processApiErrorMessage(error.message, "Error al cargar estados disponibles")
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      } finally {
        setLoadingEstados(false)
      }
    }
    loadEstados()
  }, [])

  // Load Excel data if available
  useEffect(() => {
    const loadExcelData = async () => {
      // Verificar si existe datos_excel directamente en el proceso
      if (process.datos_excel) {
        setExcelData(process.datos_excel)
        return
      }

      // Si no, intentar cargar desde la API
      const descripcionCargoId = process.id_descripcion_cargo || process.id_descripcioncargo

      if (descripcionCargoId && descripcionCargoId > 0) {
        try {
          setLoadingExcel(true)
          const response = await descripcionCargoService.getExcelData(descripcionCargoId)

          if (response.success && response.data) {
            setExcelData(response.data)
          }
          // Si no hay datos, simplemente no establecer excelData (es un caso válido)
        } catch (error: any) {
          // Solo mostrar error si no es el caso esperado de "no tiene datos de Excel"
          const errorMessage = error?.message || ''
          if (!errorMessage.includes('no tiene datos de Excel asociados') && 
              !errorMessage.includes('404')) {
            console.error('❌ Error al cargar datos del Excel:', error)
          }
          // Si no hay datos de Excel, simplemente no establecer excelData (es un caso válido)
        } finally {
          setLoadingExcel(false)
        }
      }
    }
    loadExcelData()
  }, [process.id_descripcion_cargo, process.id_descripcioncargo, process.datos_excel])

  // For evaluation processes - track current candidate in accordion
  const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null)
  const currentCandidate = candidates.find(c => c.id === currentCandidateId)


  // Pre-llenar datos del candidato cuando se selecciona en el acordeón
  useEffect(() => {
    if (isEvaluationProcess && currentCandidate) {
      console.log('🔄 Cargando datos del candidato:', currentCandidate)
      
      setPersonalData({
        name: currentCandidate.name || "",
        rut: currentCandidate.rut || "",
        email: currentCandidate.email || "",
        phone: currentCandidate.phone || "",
        birth_date: currentCandidate.birth_date || "",
        age: currentCandidate.age || 0,
        region: currentCandidate.region || "",
        comuna: currentCandidate.comuna || "",
        nacionalidad: currentCandidate.nacionalidad || "",
        rubro: currentCandidate.rubro || "",
        has_disability_credential: currentCandidate.has_disability_credential || false,
        english_level: currentCandidate.portal_responses?.english_level || "",
        software_tools: currentCandidate.portal_responses?.software_tools || "",
      })

      // Pre-llenar profesiones si existen
      if (currentCandidate.professions && currentCandidate.professions.length > 0) {
        console.log('📋 Profesiones encontradas:', currentCandidate.professions)
        const professionsData = currentCandidate.professions.map((prof: any, index: number) => ({
          id: `prof-${index}-${Date.now()}`,
          profession: prof.profession || prof.nombre_profesion || "",
          institution: prof.institution || "",
          date: prof.date || prof.fecha_obtencion || "",
        }))
        setProfessions(professionsData)
      } else {
        console.log('❌ No hay profesiones para este candidato')
        setProfessions([])
      }

      // Pre-llenar experiencia laboral y educación
      console.log('💼 Experiencias:', currentCandidate.work_experience?.length || 0)
      console.log('🎓 Educación:', currentCandidate.education?.length || 0)
      console.log('📚 Datos de educación completos:', currentCandidate.education)
      
      // Mapear educación para asegurar que tenga la estructura correcta
      const educationData = currentCandidate.education?.map((edu: any) => ({
        id: edu.id || `edu-${Date.now()}`,
        institution: edu.institution || "",
        title: edu.title || "",
        completion_date: edu.completion_date || "",
      })) || []
      
      console.log('📚 Educación mapeada:', educationData)
      
      setWorkExperience(currentCandidate.work_experience || [])
      setEducation(educationData)
    }
  }, [isEvaluationProcess, currentCandidate])

  const handlePersonalDataSubmit = async () => {
    if (!currentCandidate) {
      showToast({
        type: "error",
        title: "Error",
        description: "No se encontró información del candidato",
      })
      return
    }

    // Validaciones de campos obligatorios
    if (!personalData.name?.trim()) {
      showToast({
        type: "error",
        title: "Campo obligatorio",
        description: "El nombre del candidato es obligatorio",
      })
      return
    }

    if (!personalData.email?.trim()) {
      showToast({
        type: "error",
        title: "Campo obligatorio",
        description: "El email del candidato es obligatorio",
      })
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(personalData.email)) {
      showToast({
        type: "error",
        title: "Campo obligatorio",
        description: "Ingresa un email válido (ej: candidato@ejemplo.com)",
      })
      return
    }

    if (!personalData.phone?.trim()) {
      showToast({
        type: "error",
        title: "Campo obligatorio",
        description: "El teléfono del candidato es obligatorio",
      })
      return
    }

    // Validar formato de teléfono
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/
    if (!phoneRegex.test(personalData.phone)) {
      showToast({
        type: "error",
        title: "Campo obligatorio",
        description: "Ingresa un teléfono válido (mínimo 8 dígitos)",
      })
      return
    }

    // Validar formato de RUT si se proporciona
    if (personalData.rut?.trim()) {
    const rutRegex = /^[0-9]+-[0-9kK]$/
    if (!rutRegex.test(personalData.rut)) {
      showToast({
        type: "error",
        title: "Formato inválido",
        description: "Ingresa un RUT válido (ej: 12345678-9)",
      })
      return
    }
    }
    
    // Los demás campos son opcionales (rut, birth_date, region, comuna, nacionalidad, rubro)

    try {
      setSavingCandidate(true)

      // Preparar datos para actualizar el candidato
      const candidateData = {
        name: personalData.name,
        email: personalData.email,
        phone: personalData.phone,
        rut: personalData.rut || undefined,
        birth_date: personalData.birth_date || undefined,
        age: personalData.age || undefined,
        region: personalData.region || undefined,
        comuna: personalData.comuna || undefined,
        nacionalidad: personalData.nacionalidad || undefined,
        rubro: personalData.rubro || undefined,
        has_disability_credential: personalData.has_disability_credential,
        english_level: personalData.english_level || undefined,
        software_tools: personalData.software_tools || undefined,
        // Profesiones múltiples
        professions: professions.length > 0
          ? professions.map(prof => ({
            profession: prof.profession,
            institution: prof.institution,
            date: prof.date,
          }))
          : undefined,
        work_experience: workExperience.length > 0
          ? workExperience.map(exp => ({
            company: exp.company,
            position: exp.position,
            start_date: exp.start_date,
            end_date: exp.end_date,
            is_current: exp.is_current,
            description: exp.description,
            comments: exp.comments,
            exit_reason: exp.exit_reason,
          }))
          : undefined,
        education: education.length > 0
          ? education.map(edu => ({
            institution: edu.institution,
            title: edu.title,
            completion_date: edu.completion_date,
          }))
          : undefined,
      }

      console.log('📤 Datos a enviar al backend:', candidateData)
      console.log('📋 Profesiones:', professions.length)
      console.log('💼 Experiencias:', workExperience.length)
      console.log('🎓 Educación:', education.length)

      // Actualizar el candidato
      const response = await candidatoService.update(parseInt(currentCandidate.id), candidateData)
      
      console.log('📥 Respuesta del backend:', response)

      if (response.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: "Datos del candidato guardados exitosamente",
        })

        // Recargar candidatos para actualizar la información
        const candidatesData = await getCandidatesByProcess(process.id)
        setCandidates(candidatesData)
      } else {
        const errorMsg = processApiErrorMessage(response.message, "Error al guardar los datos del candidato")
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      }

    } catch (error: any) {
      console.error('Error saving candidate data:', error)
      const errorMsg = processApiErrorMessage(error.message, "Error al guardar los datos del candidato")
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    } finally {
      setSavingCandidate(false)
    }
  }

  // Funciones para manejar profesiones
  const handleAddProfession = () => {
    if (newProfession.profession && newProfession.institution) {
      if (editingProfessionId) {
        // Modo edición
        setProfessions(professions.map(p => 
          p.id === editingProfessionId ? { ...p, ...newProfession } : p
        ))
        setEditingProfessionId(null)
        showToast({
          type: "success",
          title: "Profesión actualizada",
          description: "Recuerda hacer clic en 'Guardar Datos del Candidato' al finalizar",
        })
      } else {
        // Modo agregar
        const profession = {
          id: Date.now().toString(),
          ...newProfession,
        }
        setProfessions([...professions, profession])
        showToast({
          type: "success",
          title: "Profesión agregada",
          description: "Recuerda hacer clic en 'Guardar Datos del Candidato' al finalizar",
        })
      }
      setNewProfession({
        profession: "",
        institution: "",
        date: "",
      })
      setShowAddProfessionForm(false)
    }
  }

  const handleEditProfession = (id: string) => {
    const profession = professions.find(p => p.id === id)
    if (profession) {
      setNewProfession({
        profession: profession.profession,
        institution: profession.institution,
        date: profession.date,
      })
      setEditingProfessionId(id)
      setShowAddProfessionForm(true)
    }
  }

  const handleCancelEditProfession = () => {
    setNewProfession({
      profession: "",
      institution: "",
      date: "",
    })
    setEditingProfessionId(null)
    setShowAddProfessionForm(false)
  }

  const handleRemoveProfession = (id: string) => {
    setDeleteDialog({ open: true, type: 'profession', id })
  }

  const confirmDelete = () => {
    if (deleteDialog.type === 'profession' && deleteDialog.id) {
      setProfessions(professions.filter(p => p.id !== deleteDialog.id))
      showToast({
        type: "success",
        title: "Profesión eliminada",
        description: "Recuerda hacer clic en 'Guardar Datos del Candidato' al finalizar",
      })
    } else if (deleteDialog.type === 'education' && deleteDialog.id) {
      setEducation(education.filter(e => e.id !== deleteDialog.id))
      showToast({
        type: "success",
        title: "Formación eliminada",
        description: "Recuerda hacer clic en 'Guardar Datos del Candidato' al finalizar",
      })
    } else if (deleteDialog.type === 'workExperience' && deleteDialog.id) {
      setWorkExperience(workExperience.filter(e => e.id !== deleteDialog.id))
      showToast({
        type: "success",
        title: "Experiencia eliminada",
        description: "Recuerda hacer clic en 'Guardar Datos del Candidato' al finalizar",
      })
    }
    setDeleteDialog({ open: false, type: null, id: null })
  }

  const handleAddWorkExperience = () => {
    if (newWorkExperience.company && newWorkExperience.position) {
      if (editingWorkExperienceId) {
        // Modo edición
        setWorkExperience(workExperience.map(exp => 
          exp.id === editingWorkExperienceId ? { ...exp, ...newWorkExperience } : exp
        ))
        setEditingWorkExperienceId(null)
        showToast({
          type: "success",
          title: "Experiencia actualizada",
          description: "Recuerda hacer clic en 'Guardar Datos del Candidato' al finalizar",
        })
      } else {
        // Modo agregar
      const experience: WorkExperience = {
        id: Date.now().toString(),
        ...newWorkExperience,
      }
      setWorkExperience([...workExperience, experience])
        showToast({
          type: "success",
          title: "Experiencia agregada",
          description: "Recuerda hacer clic en 'Guardar Datos del Candidato' al finalizar",
        })
      }
      setNewWorkExperience({
        company: "",
        position: "",
        start_date: "",
        end_date: "",
        is_current: false,
        description: "",
        comments: "",
        exit_reason: "",
      })
      setShowAddWorkExperienceForm(false)
    }
  }

  const handleEditWorkExperience = (id: string) => {
    const experience = workExperience.find(exp => exp.id === id)
    if (experience) {
      setNewWorkExperience({
        company: experience.company,
        position: experience.position,
        start_date: experience.start_date,
        end_date: experience.end_date || "",
        is_current: experience.is_current || false,
        description: experience.description || "",
        comments: experience.comments || "",
        exit_reason: experience.exit_reason || "",
      })
      setEditingWorkExperienceId(id)
      setShowAddWorkExperienceForm(true)
    }
  }

  const handleCancelEditWorkExperience = () => {
    setNewWorkExperience({
      company: "",
      position: "",
      start_date: "",
      end_date: "",
      is_current: false,
      description: "",
      comments: "",
      exit_reason: "",
    })
    setEditingWorkExperienceId(null)
    setShowAddWorkExperienceForm(false)
  }

  const handleRemoveWorkExperience = (id: string) => {
    setDeleteDialog({ open: true, type: 'workExperience', id })
  }

  const handleAddEducation = () => {
    if (newEducation.institution && newEducation.title && newEducation.completion_date) {
      if (editingEducationId) {
        // Modo edición
        setEducation(education.map(edu => 
          edu.id === editingEducationId ? { 
            ...edu, 
            institution: newEducation.institution,
            title: newEducation.title,
            completion_date: newEducation.completion_date,
          } : edu
        ))
        setEditingEducationId(null)
        showToast({
          type: "success",
          title: "Formación actualizada",
          description: "Recuerda hacer clic en 'Guardar Datos del Candidato' al finalizar",
        })
      } else {
        // Modo agregar
      const educationItem: Education = {
        id: Date.now().toString(),
        institution: newEducation.institution,
        title: newEducation.title,
        completion_date: newEducation.completion_date,
      }
      setEducation([...education, educationItem])
        showToast({
          type: "success",
          title: "Formación agregada",
          description: "Recuerda hacer clic en 'Guardar Datos del Candidato' al finalizar",
        })
      }
      setNewEducation({
        institution: "",
        title: "",
        completion_date: "",
      })
      setShowAddEducationForm(false)
    }
  }

  const handleEditEducation = (id: string) => {
    const educationItem = education.find(edu => edu.id === id)
    if (educationItem) {
      setNewEducation({
        institution: educationItem.institution,
        title: educationItem.title,
        completion_date: educationItem.completion_date || "",
      })
      setEditingEducationId(id)
      setShowAddEducationForm(true)
    }
  }

  const handleCancelEditEducation = () => {
    setNewEducation({
      institution: "",
      title: "",
      completion_date: "",
    })
    setEditingEducationId(null)
    setShowAddEducationForm(false)
  }

  const handleRemoveEducation = (id: string) => {
    setDeleteDialog({ open: true, type: 'education', id })
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Cargar listas desplegables
  useEffect(() => {
    const loadLists = async () => {
      try {
        setLoadingLists(true)
        const [regionesRes, comunasRes, profesionesRes, rubrosRes, nacionalidadesRes, institucionesRes] = await Promise.all([
          regionService.getAll(),
          comunaService.getAll(),
          profesionService.getAll(),
          rubroService.getAll(),
          nacionalidadService.getAll(),
          institucionService.getAll(),
        ])

        setRegiones(regionesRes.data || [])
        setTodasLasComunas(comunasRes.data || [])
        setProfesiones(profesionesRes.data || [])
        setRubros(rubrosRes.data || [])
        setNacionalidades(nacionalidadesRes.data || [])
        setInstituciones(institucionesRes.data || [])
      } catch (error) {
        console.error('Error loading lists:', error)
      } finally {
        setLoadingLists(false)
      }
    }

    loadLists()
  }, [])

  // Filtrar comunas cuando cambia la región
  useEffect(() => {
    if (personalData.region) {
      const regionSeleccionada = regiones.find(r => r.nombre_region === personalData.region)
      if (regionSeleccionada) {
        const filtradas = todasLasComunas.filter(
          c => c.id_region === regionSeleccionada.id_region
        )
        setComunasFiltradas(filtradas)
      }
    }
  }, [personalData.region, regiones, todasLasComunas])

  const handleStatusChange = async (estadoId: string) => {
    // Validar que el proceso no esté bloqueado
    if (isBlocked) {
      showToast({
        type: "error",
        title: "Acción Bloqueada",
        description: "No se puede cambiar el estado de un proceso finalizado",
      })
      return
    }

    // Validar que el motivo no exceda 500 caracteres
    if (statusChangeReason.length > 500) {
      setStatusChangeReasonError("El motivo del cambio no puede exceder 500 caracteres")
      showToast({
        type: "error",
        title: "Error de validación",
        description: "El motivo del cambio no puede exceder 500 caracteres",
      })
      return
    }

    // Limpiar error si la validación pasa
    setStatusChangeReasonError("")

    try {
      const response = await solicitudService.cambiarEstado(
        parseInt(process.id), 
        parseInt(estadoId)
      )

      if (response.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: "Estado actualizado exitosamente",
        })
        setShowStatusChange(false)
        setSelectedEstado("")
        setStatusChangeReason("")
        setStatusChangeReasonError("")
        // Recargar la página para reflejar el cambio
        window.location.reload()
      } else {
        const errorMsg = processApiErrorMessage(response.message, "Error al actualizar el estado")
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      }
    } catch (error: any) {
      console.error("Error updating status:", error)
      const errorMsg = processApiErrorMessage(error.message, "Error al actualizar el estado")
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    }
  }

  const handleAdvanceToModule2 = async () => {
    // Validar que el proceso no esté bloqueado
    if (isBlocked) {
      showToast({
        type: "error",
        title: "Acción Bloqueada",
        description: "No se puede avanzar un proceso finalizado",
      })
      return
    }

    setIsAdvancingToModule2(true)
    try {
      const response = await solicitudService.avanzarAModulo2(parseInt(process.id))

      if (response.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: "Proceso avanzado al Módulo 2 exitosamente",
        })
        // Navegar al módulo 2 usando URL con parámetro
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.set('tab', 'modulo-2')
        window.location.href = currentUrl.toString()
      } else {
        const errorMsg = processApiErrorMessage(response.message, "Error al avanzar al Módulo 2")
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
        setIsAdvancingToModule2(false)
      }
    } catch (error: any) {
      console.error("Error al avanzar al Módulo 2:", error)
      const errorMsg = processApiErrorMessage(error.message, "Error al avanzar al Módulo 2")
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
      setIsAdvancingToModule2(false)
    }
  }

  const handleAdvanceToModule4 = async () => {
    // Validar que el proceso no esté bloqueado
    if (isBlocked) {
      showToast({
        type: "error",
        title: "Acción Bloqueada",
        description: "No se puede avanzar un proceso finalizado",
      })
      return
    }

    setIsAdvancingToModule4(true)
    try {
      const response = await solicitudService.avanzarAModulo4(parseInt(process.id))

      if (response.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: "Proceso avanzado al Módulo 4 exitosamente",
        })
        // Navegar al módulo 4 usando URL con parámetro
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.set('tab', 'modulo-4')
        window.location.href = currentUrl.toString()
      } else {
        const errorMsg = processApiErrorMessage(response.message, "Error al avanzar al Módulo 4")
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
        setIsAdvancingToModule4(false)
      }
    } catch (error: any) {
      console.error("Error al avanzar al Módulo 4:", error)
      const errorMsg = processApiErrorMessage(error.message, "Error al avanzar al Módulo 4")
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
      setIsAdvancingToModule4(false)
    }
  }

  // Verificar si el proceso está bloqueado (estado final)
  const isBlocked = isProcessBlocked(processStatus)

  // Verificar si ya está en un módulo avanzado (módulo 4 o 5)
  const isInAdvancedModule = process.etapa && (
    process.etapa.includes("Módulo 4") || 
    process.etapa.includes("Módulo 5")
  )

  const canChangeStatus = (currentStatus: ProcessStatus, newStatus: ProcessStatus) => {
    // No se puede cambiar a "completado" desde el módulo 1
    if (newStatus === "completado") return false

    // No se puede cambiar de "cancelado" o "congelado" a estados activos sin razón
    if ((currentStatus === "cancelado" || currentStatus === "congelado") &&
      (newStatus === "iniciado" || newStatus === "en_progreso")) {
      return statusChangeReason.trim().length > 0
    }

    return true
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Módulo 1 - Solicitud y Cargo</h2>
        <p className="text-muted-foreground">Información detallada del cargo y requisitos del proceso</p>
      </div>

      {/* Componente de bloqueo si el proceso está en estado final */}
      <ProcessBlocked 
        processStatus={processStatus} 
        moduleName="Módulo 1" 
      />

      {/* Card para avanzar al siguiente módulo */}
      {(process.service_type === 'ES' || process.service_type === 'TS' || process.service_type === 'AP') ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-800">Listo para continuar</h3>
                <p className="text-sm text-blue-600">
                  Puedes avanzar al Módulo 4 para evaluación psicolaboral.
                </p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleAdvanceToModule4}
                disabled={isProcessBlocked(processStatus) || isAdvancingToModule4 || isInAdvancedModule}
              >
                {isAdvancingToModule4 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Avanzar a Módulo 4
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-800">Listo para continuar</h3>
                <p className="text-sm text-blue-600">
                  Puedes avanzar al Módulo 2 para búsqueda y registro de candidatos.
                </p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleAdvanceToModule2}
                disabled={isProcessBlocked(processStatus) || isAdvancingToModule2 || isInAdvancedModule}
              >
                {isAdvancingToModule2 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Avanzar a Módulo 2
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botón de cambio de estado al inicio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cambiar Estado de la Solicitud
          </CardTitle>
          <CardDescription>
            Actualiza el estado actual del proceso de reclutamiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="estado-select">Estado Actual: </Label>
              <Badge className={getStatusColor(processStatus)}>
                {processStatusLabels[processStatus] || processStatus}
              </Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowStatusChange(!showStatusChange)}
              disabled={loadingEstados}
            >
              {loadingEstados ? "Cargando..." : "Cambiar Estado"}
            </Button>
          </div>

          {showStatusChange && (
            <div className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <Label htmlFor="new-estado">Nuevo Estado</Label>
                <Select
                  value={selectedEstado}
                  onValueChange={setSelectedEstado}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosDisponibles.map((estado) => (
                      <SelectItem key={estado.id} value={estado.id.toString()}>
                        {estado.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Motivo del Cambio (Opcional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Explica el motivo del cambio de estado..."
                  value={statusChangeReason}
                  onChange={(e) => {
                    const newValue = e.target.value
                    // Limitar a 500 caracteres
                    if (newValue.length <= 500) {
                      setStatusChangeReason(newValue)
                      setStatusChangeReasonError("")
                    } else {
                      setStatusChangeReasonError("El motivo del cambio no puede exceder 500 caracteres")
                    }
                  }}
                  className={`mt-1 ${statusChangeReasonError ? "border-destructive" : ""}`}
                  maxLength={500}
                />
                <div className="flex items-center justify-between mt-1">
                  <div className="text-sm text-muted-foreground">
                    {statusChangeReason.length}/500 caracteres
                  </div>
                  {statusChangeReasonError && (
                    <p className="text-sm text-destructive">
                      {statusChangeReasonError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleStatusChange(selectedEstado)}
                  disabled={!selectedEstado}
                >
                  Actualizar Estado
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowStatusChange(false)
                    setSelectedEstado("")
                    setStatusChangeReason("")
                    setStatusChangeReasonError("")
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Información del Proceso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Cliente</p>
                <p className="text-sm text-muted-foreground">{process.client.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Contacto</p>
                <p className="text-sm text-muted-foreground">{process.client.contacts[0]?.name || 'Sin contacto'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Tipo de Servicio</p>
                <Badge variant="outline">{serviceTypeLabels[process.service_type]}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Fecha Creación</p>
                <p className="text-sm text-muted-foreground">{formatDate(process.created_at)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Cargo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">{process.position_title}</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vacantes</p>
                <p className="text-2xl font-bold text-primary">{process.vacancies}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Región</p>
                <p className="text-lg font-semibold">
                  {(() => {
                    const comunaNombre = process.client.contacts[0]?.city
                    if (!comunaNombre) return 'No especificada'
                    
                    // Buscar la comuna en la lista de comunas
                    const comuna = todasLasComunas.find(c => c.nombre_comuna === comunaNombre)
                    if (!comuna) return process.client.contacts[0]?.region || 'No especificada'
                    
                    // Buscar la región correspondiente
                    const region = regiones.find(r => r.id_region === comuna.id_region)
                    return region?.nombre_region || process.client.contacts[0]?.region || 'No especificada'
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Comuna</p>
                <p className="text-lg font-semibold">{process.client.contacts[0]?.city || 'No especificada'}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Descripción del Cargo</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{process.description}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Requisitos y Condiciones</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{process.requirements}</p>
          </div>

          {process.excel_file && (
            <div>
              <h4 className="font-medium mb-2">Archivo Adjunto</h4>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Descargar {process.excel_file}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excel Data - Descripción de Cargo Detallada (solo para procesos no psicolaborales) */}
      {!isEvaluationProcess && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Descripción de Cargo Detallada (Datos del Excel)
            </CardTitle>
            <CardDescription>Información completa extraída del archivo Excel</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingExcel ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Cargando datos del Excel...</span>
              </div>
            ) : excelData && Object.keys(excelData).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Campo</TableHead>
                    <TableHead>Información</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(excelData).map(([key, value]) => {
                    // Omitir campos vacíos o null
                    if (!value || value === '' || value === 'null') return null

                    // Formatear el nombre del campo
                    const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

                    // Formatear el valor
                    let displayValue: any = value
                    if (typeof value === 'object' && value !== null) {
                      if (Array.isArray(value)) {
                        // Si es un array de objetos (como Competencias Psicolaborales)
                        if (value.length > 0 && typeof value[0] === 'object') {
                          displayValue = (
                            <div className="space-y-2">
                              {value.map((item, idx) => (
                                <div key={idx} className="border-l-2 border-primary pl-3 py-1">
                                  {Object.entries(item).map(([k, v]) => (
                                    <div key={k}>
                                      <span className="font-medium">{k}:</span> {String(v)}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )
                        } else {
                          // Array simple
                          displayValue = value.join(', ')
                        }
                      } else {
                        // Objeto simple
                        displayValue = JSON.stringify(value, null, 2)
                      }
                    }

                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium align-top">{fieldName}</TableCell>
                        <TableCell className="whitespace-pre-wrap">
                          {typeof displayValue === 'string' ? displayValue : displayValue}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="font-medium">No hay datos del Excel disponibles</p>
                <p className="text-sm mt-2">Los datos aparecerán aquí cuando se suba un archivo Excel</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Client Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Persona de Contacto</p>
              <p className="text-sm text-muted-foreground">{process.client.contacts[0]?.name || 'Sin contacto'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{process.client.contacts[0]?.email || 'Sin email'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Teléfono</p>
              <p className="text-sm text-muted-foreground">{process.client.contacts[0]?.phone || 'Sin teléfono'}</p>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Formulario de Datos del Candidato - Solo para procesos psicolaborales */}
      {isEvaluationProcess && candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Candidatos a Evaluar ({candidates.length})
            </CardTitle>
            <CardDescription>
              Expanda cada candidato para ver o completar sus datos personales y proceder con la evaluación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full space-y-3">
            <Accordion 
              type="single" 
              collapsible 
              value={currentCandidateId || undefined}
              onValueChange={(value) => setCurrentCandidateId(value || null)}
              className="w-full"
            >
              {candidates.map((candidate) => (
                <div key={candidate.id} className="border border-border rounded-lg bg-card w-full mb-3">
                <AccordionItem value={candidate.id} className="border-0">
                  <AccordionTrigger className="hover:no-underline px-4 py-0 h-[52px] min-h-[52px] max-h-[52px] flex items-center">
                    <div className="flex items-center justify-between w-full h-full">
                      <span className="font-semibold text-[17px] leading-[1.2] text-left truncate mr-4">{candidate.name}</span>
                      {candidate.cv_file ? (
                        <Badge 
                          variant="default" 
                          className="shrink-0 text-sm h-[32px] px-4 flex items-center gap-1.5 cursor-pointer hover:bg-primary/90 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCVViewer(true);
                          }}
                        >
                          <Download className="h-4 w-4" />
                  Ver CV
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0 text-sm h-[32px] px-4 flex items-center">
                          Datos básicos
                        </Badge>
                      )}
              </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">
                    <div className="space-y-4">
            {/* Mostrar formulario completo solo si tiene CV */}
            {candidate.cv_file ? (
              <>
              {/* Acordeón interno para organizar secciones */}
              <Accordion type="multiple" defaultValue={["datos-personales"]} className="space-y-3">

            {/* Formulario de datos personales */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <AccordionItem value="datos-personales" className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <h4 className="font-semibold text-lg text-foreground">
                    Datos Personales
                  </h4>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2">

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={personalData.name}
                    onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                    placeholder="Ingrese nombre completo"
                    className="bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input
                    id="rut"
                    value={personalData.rut}
                    onChange={(e) => setPersonalData({ ...personalData, rut: e.target.value })}
                    placeholder="12.345.678-9"
                    className="bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalData.email}
                    onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono (8-12 caracteres) <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    value={personalData.phone}
                    onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
                    placeholder="+56 9 1234 5678"
                    className="bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                  <DatePicker
                    selected={personalData.birth_date ? new Date(personalData.birth_date) : null}
                    onChange={(date) => {
                      if (date) {
                        const age = calculateAge(date.toISOString().split('T')[0])
                        setPersonalData({
                          ...personalData,
                          birth_date: date.toISOString().split('T')[0],
                          age: age,
                        })
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    placeholderText="Selecciona fecha de nacimiento"
                    className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    maxDate={new Date()}
                    minDate={new Date("1900-01-01")}
                    yearDropdownItemNumber={100}
                    locale="es"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Edad</Label>
                  <Input
                    id="age"
                    type="number"
                    value={personalData.age}
                    readOnly
                    className="bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="has_disability_credential"
                    checked={personalData.has_disability_credential}
                    readOnly
                    disabled
                  />
                  <Label htmlFor="has_disability_credential">Cuenta con credencial de discapacidad (registrado por administrador)</Label>
                </div>
              </div>


              {/* Información adicional del candidato (editable) */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-lg mb-4">Información Adicional</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">Región</Label>
                    <Select
                      value={personalData.region}
                      onValueChange={(value) => {
                        setPersonalData({ ...personalData, region: value, comuna: "" })
                      }}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-950">
                        <SelectValue placeholder="Seleccione región" />
                      </SelectTrigger>
                      <SelectContent>
                        {regiones.map((region) => (
                          <SelectItem key={region.id_region} value={region.nombre_region}>
                            {region.nombre_region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comuna">Comuna</Label>
                    <Select
                      value={personalData.comuna}
                      onValueChange={(value) => setPersonalData({ ...personalData, comuna: value })}
                      disabled={loadingLists || !personalData.region}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-950">
                        <SelectValue placeholder={personalData.region ? "Seleccione comuna" : "Primero seleccione región"} />
                      </SelectTrigger>
                      <SelectContent>
                        {comunasFiltradas.map((comuna) => (
                          <SelectItem key={comuna.id_comuna} value={comuna.nombre_comuna}>
                            {comuna.nombre_comuna}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nacionalidad">Nacionalidad</Label>
                    <Select
                      value={personalData.nacionalidad}
                      onValueChange={(value) => setPersonalData({ ...personalData, nacionalidad: value })}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-950">
                        <SelectValue placeholder="Seleccione nacionalidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {nacionalidades.map((nac) => (
                          <SelectItem key={nac.id_nacionalidad} value={nac.nombre_nacionalidad}>
                            {nac.nombre_nacionalidad}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rubro">Rubro</Label>
                    <Select
                      value={personalData.rubro}
                      onValueChange={(value) => setPersonalData({ ...personalData, rubro: value })}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-950">
                        <SelectValue placeholder="Seleccione rubro" />
                      </SelectTrigger>
                      <SelectContent>
                        {rubros.map((rubro) => (
                          <SelectItem key={rubro.id_rubro} value={rubro.nombre_rubro}>
                            {rubro.nombre_rubro}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              </div>

              {/* Formación Académica con sub-acordeones */}
              <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <AccordionItem value="formacion" className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <h4 className="font-semibold text-lg text-foreground">
                    Formación Académica {(professions.length > 0 || education.length > 0) && <span className="text-muted-foreground">({professions.length + education.length})</span>}
                  </h4>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 pt-2">

                  {/* Sub-acordeón 1: Profesión(es) */}
                  <Accordion type="multiple" className="space-y-2">
                    <div className="border rounded-lg bg-card">
                      <AccordionItem value="profesiones" className="border-0">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <span className="font-medium text-sm">
                            Profesión(es) {professions.length > 0 ? <span className="text-muted-foreground">({professions.length})</span> : <span className="text-amber-600">- Sin registros</span>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3 pt-2">

                            {/* Si tiene profesiones, mostrar lista primero */}
                            {professions.length > 0 && (
                              <div className="space-y-2">
                                {[...professions].reverse().map((prof) => (
                                  <div key={prof.id} className="flex items-start justify-between p-3 border rounded-lg bg-background">
                                    <div>
                                      <p className="font-medium">{prof.profession}</p>
                                      <p className="text-sm text-muted-foreground">{prof.institution}</p>
                                      {prof.date && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {formatDate(prof.date)}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditProfession(prof.id)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveProfession(prof.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Si NO tiene profesiones, mostrar mensaje */}
                            {professions.length === 0 && !showAddProfessionForm && (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No hay profesiones registradas. Completa el formulario:
                              </p>
                            )}

                            {/* Formulario para agregar (visible si no hay items O si se presionó el botón) */}
                            {(professions.length === 0 || showAddProfessionForm) && (
                              <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h6 className="font-medium text-sm">{editingProfessionId ? "Editar Profesión" : "Agregar Profesión"}</h6>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Profesión</Label>
                      <Input
                        value={newProfession.profession}
                        onChange={(e) => setNewProfession({ ...newProfession, profession: e.target.value })}
                        placeholder="Ej: Ingeniero en Sistemas"
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Institución</Label>
                      <Select
                        value={newProfession.institution}
                        onValueChange={(value) => setNewProfession({ ...newProfession, institution: value })}
                        disabled={loadingLists}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-950">
                          <SelectValue placeholder={loadingLists ? "Cargando instituciones..." : "Seleccione institución"} />
                        </SelectTrigger>
                        <SelectContent>
                          {instituciones.length > 0 ? (
                            instituciones.map((inst) => (
                              <SelectItem key={inst.id_institucion} value={inst.nombre_institucion}>
                                {inst.nombre_institucion}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No hay instituciones disponibles
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Obtención</Label>
                    <DatePicker
                      selected={newProfession.date ? new Date(newProfession.date) : null}
                      onChange={(date) => {
                        if (date) {
                          setNewProfession({ ...newProfession, date: date.toISOString().split('T')[0] })
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      placeholderText="Selecciona fecha de obtención"
                      className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      maxDate={new Date()}
                      minDate={new Date("1900-01-01")}
                      yearDropdownItemNumber={100}
                      locale="es"
                    />
                  </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleAddProfession}
                                    disabled={!newProfession.profession || !newProfession.institution}
                                    className="flex-1"
                                  >
                                    {editingProfessionId ? "Guardar Cambios" : "Agregar Profesión"}
                                  </Button>
                                  {(professions.length > 0 || editingProfessionId) && (
                                    <Button
                                      variant="outline"
                                      onClick={handleCancelEditProfession}
                                    >
                                      Cancelar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Botón para agregar otra profesión (solo si ya hay profesiones Y el formulario está oculto) */}
                            {professions.length > 0 && !showAddProfessionForm && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAddProfessionForm(true)}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar otra profesión
                              </Button>
                            )}

                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </div>
                  </Accordion>

                  {/* Sub-acordeón 2: Postgrados y Capacitaciones */}
                  <Accordion type="multiple" className="space-y-2">
                    <div className="border rounded-lg bg-card">
                      <AccordionItem value="postgrados" className="border-0">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <span className="font-medium text-sm">
                            Postgrados y Capacitaciones {education.length > 0 ? <span className="text-muted-foreground">({education.length})</span> : <span className="text-amber-600">- Sin registros</span>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3 pt-2">

                            {/* Si tiene educación, mostrar lista primero */}
                            {education.length > 0 && (
                              <div className="space-y-2">
                                {[...education].reverse().map((edu) => (
                                  <div key={edu.id} className="flex items-start justify-between p-3 border rounded-lg bg-background">
                                    <div>
                                      <p className="font-medium">{edu.title}</p>
                                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                                      {edu.completion_date && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {formatDate(edu.completion_date)}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditEducation(edu.id)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveEducation(edu.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Si NO tiene educación, mostrar mensaje */}
                            {education.length === 0 && !showAddEducationForm && (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No hay formación registrada. Completa el formulario:
                              </p>
                            )}

                            {/* Formulario para agregar (visible si no hay items O si se presionó el botón) */}
                            {(education.length === 0 || showAddEducationForm) && (
                              <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h6 className="font-medium text-sm">{editingEducationId ? "Editar Formación" : "Agregar Formación"}</h6>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={newEducation.title}
                        onChange={(e) => setNewEducation({ ...newEducation, title: e.target.value })}
                        placeholder="Ej: Magister en Administración"
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Institución</Label>
                      <Input
                        value={newEducation.institution}
                        onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
                        placeholder="Nombre de la institución"
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Obtención</Label>
                    <DatePicker
                      selected={newEducation.completion_date ? new Date(newEducation.completion_date) : null}
                      onChange={(date) => {
                        if (date) {
                          setNewEducation({ ...newEducation, completion_date: date.toISOString().split('T')[0] })
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      placeholderText="Selecciona fecha de obtención"
                      className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      maxDate={new Date()}
                      yearDropdownItemNumber={50}
                      locale="es"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddEducation}
                      disabled={!newEducation.institution || !newEducation.title || !newEducation.completion_date}
                      className="flex-1"
                    >
                      {editingEducationId ? "Guardar Cambios" : "Agregar Formación"}
                    </Button>
                    {(education.length > 0 || editingEducationId) && (
                      <Button
                        variant="outline"
                        onClick={handleCancelEditEducation}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                              </div>
                            )}

                            {/* Botón para agregar otra formación (solo si ya hay items Y el formulario está oculto) */}
                            {education.length > 0 && !showAddEducationForm && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAddEducationForm(true)}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar otra formación
                              </Button>
                            )}

                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </div>
                  </Accordion>

                  {/* Sub-acordeón 3: Habilidades Adicionales */}
                  <Accordion type="multiple" className="space-y-2">
                    <div className="border rounded-lg bg-card">
                      <AccordionItem value="habilidades" className="border-0">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <span className="font-medium text-sm">
                            Habilidades Adicionales {(personalData.english_level || personalData.software_tools) ? <span className="text-green-600">✓</span> : <span className="text-amber-600">- Sin completar</span>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="english_level">Nivel de Inglés</Label>
                                <Input
                                  id="english_level"
                                  value={personalData.english_level}
                                  onChange={(e) => setPersonalData({ ...personalData, english_level: e.target.value })}
                                  placeholder="Ej: Intermedio, Avanzado, Nativo"
                                  className="bg-white dark:bg-gray-950"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="software_tools">Software y Herramientas</Label>
                                <Input
                                  id="software_tools"
                                  value={personalData.software_tools}
                                  onChange={(e) => setPersonalData({ ...personalData, software_tools: e.target.value })}
                                  placeholder="Ej: Excel, SAP, AutoCAD"
                                  className="bg-white dark:bg-gray-950"
                                />
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </div>
                  </Accordion>

                  </div>
                </AccordionContent>
              </AccordionItem>
              </div>

              {/* Experiencia Laboral */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-lg border border-slate-200 dark:border-slate-800">
              <AccordionItem value="experiencia" className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <h4 className="font-semibold text-lg text-foreground">
                    Experiencia Laboral {workExperience.length > 0 && <span className="text-muted-foreground">({workExperience.length})</span>}
                  </h4>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2">

                    {/* Si tiene experiencias, mostrar lista primero */}
                    {workExperience.length > 0 && (
                      <div className="space-y-2">
                        {[...workExperience].reverse().map((exp) => (
                          <div key={exp.id} className="flex items-start justify-between p-3 border rounded-lg bg-background">
                            <div>
                              <p className="font-medium">{exp.position}</p>
                              <p className="text-sm text-muted-foreground">{exp.company}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {exp.start_date && formatDate(exp.start_date)} - {exp.is_current ? 'Actual' : (exp.end_date ? formatDate(exp.end_date) : 'No especificada')}
                              </p>
                              {exp.description && (
                                <p className="text-sm mt-1">{exp.description}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditWorkExperience(exp.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveWorkExperience(exp.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Si NO tiene experiencias, mostrar mensaje */}
                    {workExperience.length === 0 && !showAddWorkExperienceForm && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No hay experiencias registradas. Completa el formulario:
                      </p>
                    )}

                    {/* Formulario para agregar (visible si no hay items O si se presionó el botón) */}
                    {(workExperience.length === 0 || showAddWorkExperienceForm) && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                        <h5 className="font-medium text-sm">{editingWorkExperienceId ? "Editar Experiencia" : "Agregar Experiencia"}</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Input
                        value={newWorkExperience.company}
                        onChange={(e) => setNewWorkExperience({ ...newWorkExperience, company: e.target.value })}
                        placeholder="Nombre de la empresa"
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cargo</Label>
                      <Input
                        value={newWorkExperience.position}
                        onChange={(e) => setNewWorkExperience({ ...newWorkExperience, position: e.target.value })}
                        placeholder="Título del cargo"
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha Inicio</Label>
                      <DatePicker
                        selected={newWorkExperience.start_date ? new Date(newWorkExperience.start_date) : null}
                        onChange={(date) => {
                          if (date) {
                            setNewWorkExperience({ ...newWorkExperience, start_date: date.toISOString().split('T')[0] })
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                        placeholderText="Selecciona fecha"
                        className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        maxDate={new Date()}
                        yearDropdownItemNumber={50}
                        locale="es"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Fin</Label>
                      <DatePicker
                        selected={newWorkExperience.end_date ? new Date(newWorkExperience.end_date) : null}
                        onChange={(date) => {
                          if (date) {
                            setNewWorkExperience({ ...newWorkExperience, end_date: date.toISOString().split('T')[0] })
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                        placeholderText="Selecciona fecha"
                        className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        maxDate={new Date()}
                        minDate={newWorkExperience.start_date ? new Date(newWorkExperience.start_date) : undefined}
                        yearDropdownItemNumber={50}
                        disabled={newWorkExperience.is_current}
                        locale="es"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_current"
                      checked={newWorkExperience.is_current}
                      onChange={(e) => setNewWorkExperience({
                        ...newWorkExperience,
                        is_current: e.target.checked,
                        end_date: e.target.checked ? "" : newWorkExperience.end_date,
                      })}
                    />
                    <Label htmlFor="is_current">Trabajo actual</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción de Funciones</Label>
                    <Textarea
                      value={newWorkExperience.description}
                      onChange={(e) => setNewWorkExperience({ ...newWorkExperience, description: e.target.value })}
                      placeholder="Principales responsabilidades y logros"
                      rows={3}
                      className="bg-white dark:bg-gray-950"
                    />
                  </div>
                        <div className="flex gap-2">
                  <Button
                    onClick={handleAddWorkExperience}
                    disabled={!newWorkExperience.company || !newWorkExperience.position}
                            className="flex-1"
                          >
                            {editingWorkExperienceId ? "Guardar Cambios" : "Agregar Experiencia"}
                          </Button>
                          {(workExperience.length > 0 || editingWorkExperienceId) && (
                            <Button
                              variant="outline"
                              onClick={handleCancelEditWorkExperience}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Botón para agregar otra experiencia (solo si ya hay experiencias Y el formulario está oculto) */}
                    {workExperience.length > 0 && !showAddWorkExperienceForm && (
                      <Button
                        variant="outline"
                    size="sm"
                        onClick={() => setShowAddWorkExperienceForm(true)}
                        className="w-full"
                  >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar otra experiencia
                  </Button>
                    )}

                  </div>
                </AccordionContent>
              </AccordionItem>
                </div>

              </Accordion>

              {/* Botón guardar fuera de las secciones */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handlePersonalDataSubmit}
                  disabled={savingCandidate}
                >
                  {savingCandidate ? "Guardando..." : "Guardar Datos del Candidato"}
                </Button>
              </div>
              </>
            ) : (
              /* Vista simplificada sin CV - Solo datos básicos */
              <div className="space-y-4">
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium">
                    Este candidato no tiene CV adjunto
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-foreground">Datos Básicos Registrados</h4>
                  
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Nombre Completo</Label>
                      <p className="font-medium text-foreground">{candidate.name || 'No especificado'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Email</Label>
                      <p className="font-medium text-foreground">{candidate.email || 'No especificado'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Teléfono</Label>
                      <p className="font-medium text-foreground">{candidate.phone || 'No especificado'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">RUT</Label>
                      <p className="font-medium text-foreground">{candidate.rut || 'No especificado'}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setShowFullFormForNonCV(!showFullFormForNonCV)}
                    >
                      {showFullFormForNonCV ? "Ocultar formulario" : "+ Completar información adicional"}
                    </Button>
                  </div>
                  
                  {showFullFormForNonCV && (
                    <div className="pt-4 border-t">
                      {/* Formulario completo - igual que para candidatos con CV */}
                      <>
              {/* Acordeón interno para organizar secciones */}
              <Accordion type="multiple" defaultValue={["datos-personales"]} className="space-y-3">
              
              {/* Formulario de datos personales */}
              <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <AccordionItem value="datos-personales" className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <h4 className="font-semibold text-lg text-foreground">
                    Datos Personales
                  </h4>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2">

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={personalData.name}
                    onChange={(e) => setPersonalData({ ...personalData, name: e.target.value })}
                    placeholder="Ingrese nombre completo"
                    className="bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input
                    id="rut"
                    value={personalData.rut}
                    onChange={(e) => setPersonalData({ ...personalData, rut: e.target.value })}
                    placeholder="12.345.678-9"
                    className="bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalData.email}
                    onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    value={personalData.phone}
                    onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
                    placeholder="+56 9 1234 5678"
                    className="bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                  <DatePicker
                    selected={personalData.birth_date ? new Date(personalData.birth_date) : null}
                    onChange={(date) => {
                      if (date) {
                        const age = calculateAge(date.toISOString().split('T')[0])
                        setPersonalData({
                          ...personalData,
                          birth_date: date.toISOString().split('T')[0],
                          age: age,
                        })
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    placeholderText="Selecciona fecha de nacimiento"
                    className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    maxDate={new Date()}
                    minDate={new Date("1900-01-01")}
                    yearDropdownItemNumber={100}
                    locale="es"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Edad</Label>
                  <Input
                    id="age"
                    type="number"
                    value={personalData.age}
                    readOnly
                    className="bg-white dark:bg-gray-950"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="has_disability_credential"
                    checked={personalData.has_disability_credential}
                    readOnly
                    disabled
                  />
                  <Label htmlFor="has_disability_credential">Cuenta con credencial de discapacidad (registrado por administrador)</Label>
                </div>
              </div>


              {/* Información adicional del candidato (editable) */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-lg mb-4">Información Adicional</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">Región</Label>
                    <Select
                      value={personalData.region}
                      onValueChange={(value) => {
                        setPersonalData({ ...personalData, region: value, comuna: "" })
                      }}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-950">
                        <SelectValue placeholder="Seleccione región" />
                      </SelectTrigger>
                      <SelectContent>
                        {regiones.map((region) => (
                          <SelectItem key={region.id_region} value={region.nombre_region}>
                            {region.nombre_region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comuna">Comuna</Label>
                    <Select
                      value={personalData.comuna}
                      onValueChange={(value) => setPersonalData({ ...personalData, comuna: value })}
                      disabled={loadingLists || !personalData.region}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-950">
                        <SelectValue placeholder={personalData.region ? "Seleccione comuna" : "Primero seleccione región"} />
                      </SelectTrigger>
                      <SelectContent>
                        {comunasFiltradas.map((comuna) => (
                          <SelectItem key={comuna.id_comuna} value={comuna.nombre_comuna}>
                            {comuna.nombre_comuna}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nacionalidad">Nacionalidad</Label>
                    <Select
                      value={personalData.nacionalidad}
                      onValueChange={(value) => setPersonalData({ ...personalData, nacionalidad: value })}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-950">
                        <SelectValue placeholder="Seleccione nacionalidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {nacionalidades.map((nac) => (
                          <SelectItem key={nac.id_nacionalidad} value={nac.nombre_nacionalidad}>
                            {nac.nombre_nacionalidad}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rubro">Rubro</Label>
                    <Select
                      value={personalData.rubro}
                      onValueChange={(value) => setPersonalData({ ...personalData, rubro: value })}
                      disabled={loadingLists}
                    >
                      <SelectTrigger className="bg-white dark:bg-gray-950">
                        <SelectValue placeholder="Seleccione rubro" />
                      </SelectTrigger>
                      <SelectContent>
                        {rubros.map((rubro) => (
                          <SelectItem key={rubro.id_rubro} value={rubro.nombre_rubro}>
                            {rubro.nombre_rubro}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
              </div>

              {/* Formación Académica con sub-acordeones */}
              <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <AccordionItem value="formacion" className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <h4 className="font-semibold text-lg text-foreground">
                    Formación Académica {(professions.length > 0 || education.length > 0) && <span className="text-muted-foreground">({professions.length + education.length})</span>}
                  </h4>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 pt-2">

                  {/* Sub-acordeón 1: Profesión(es) */}
                  <Accordion type="multiple" className="space-y-2">
                    <div className="border rounded-lg bg-card">
                      <AccordionItem value="profesiones" className="border-0">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <span className="font-medium text-sm">
                            Profesión(es) {professions.length > 0 ? <span className="text-muted-foreground">({professions.length})</span> : <span className="text-amber-600">- Sin registros</span>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3 pt-2">

                            {/* Si tiene profesiones, mostrar lista primero */}
                            {professions.length > 0 && (
                              <div className="space-y-2">
                                {[...professions].reverse().map((prof) => (
                                  <div key={prof.id} className="flex items-start justify-between p-3 border rounded-lg bg-background">
                          <div>
                                      <p className="font-medium">{prof.profession}</p>
                                      <p className="text-sm text-muted-foreground">{prof.institution}</p>
                                      {prof.date && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {formatDate(prof.date)}
                                        </p>
                            )}
                          </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditProfession(prof.id)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveProfession(prof.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                            {/* Si NO tiene profesiones, mostrar mensaje */}
                            {professions.length === 0 && !showAddProfessionForm && (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No hay profesiones registradas. Completa el formulario:
                              </p>
                            )}

                            {/* Formulario para agregar (visible si no hay items O si se presionó el botón) */}
                            {(professions.length === 0 || showAddProfessionForm) && (
                              <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h6 className="font-medium text-sm">{editingProfessionId ? "Editar Profesión" : "Agregar Profesión"}</h6>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Profesión</Label>
                      <Input
                        value={newProfession.profession}
                        onChange={(e) => setNewProfession({ ...newProfession, profession: e.target.value })}
                        placeholder="Ej: Ingeniero en Sistemas"
                        className="bg-white dark:bg-gray-950"
                      />
              </div>
                    <div className="space-y-2">
                      <Label>Institución</Label>
                      <Select
                        value={newProfession.institution}
                        onValueChange={(value) => setNewProfession({ ...newProfession, institution: value })}
                        disabled={loadingLists}
                      >
                        <SelectTrigger className="bg-white dark:bg-gray-950">
                          <SelectValue placeholder={loadingLists ? "Cargando instituciones..." : "Seleccione institución"} />
                        </SelectTrigger>
                        <SelectContent>
                          {instituciones.length > 0 ? (
                            instituciones.map((inst) => (
                              <SelectItem key={inst.id_institucion} value={inst.nombre_institucion}>
                                {inst.nombre_institucion}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No hay instituciones disponibles
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Obtención</Label>
                    <DatePicker
                      selected={newProfession.date ? new Date(newProfession.date) : null}
                      onChange={(date) => {
                        if (date) {
                          setNewProfession({ ...newProfession, date: date.toISOString().split('T')[0] })
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      placeholderText="Selecciona fecha de obtención"
                      className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      maxDate={new Date()}
                      minDate={new Date("1900-01-01")}
                      yearDropdownItemNumber={100}
                      locale="es"
                    />
                  </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleAddProfession}
                                    disabled={!newProfession.profession || !newProfession.institution}
                                    className="flex-1"
                                  >
                                    {editingProfessionId ? "Guardar Cambios" : "Agregar Profesión"}
                                  </Button>
                                  {(professions.length > 0 || editingProfessionId) && (
                                    <Button
                                      variant="outline"
                                      onClick={handleCancelEditProfession}
                                    >
                                      Cancelar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Botón para agregar otra profesión (solo si ya hay profesiones Y el formulario está oculto) */}
                            {professions.length > 0 && !showAddProfessionForm && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAddProfessionForm(true)}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar otra profesión
                              </Button>
                            )}

                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </div>
                  </Accordion>

                  {/* Sub-acordeón 2: Postgrados y Capacitaciones */}
                  <Accordion type="multiple" className="space-y-2">
                    <div className="border rounded-lg bg-card">
                      <AccordionItem value="postgrados" className="border-0">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <span className="font-medium text-sm">
                            Postgrados y Capacitaciones {education.length > 0 ? <span className="text-muted-foreground">({education.length})</span> : <span className="text-amber-600">- Sin registros</span>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3 pt-2">

                            {/* Si tiene educación, mostrar lista primero */}
                            {education.length > 0 && (
                              <div className="space-y-2">
                                {[...education].reverse().map((edu) => (
                                  <div key={edu.id} className="flex items-start justify-between p-3 border rounded-lg bg-background">
                                    <div>
                                      <p className="font-medium">{edu.title}</p>
                                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                                      {edu.completion_date && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {formatDate(edu.completion_date)}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditEducation(edu.id)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveEducation(edu.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Si NO tiene educación, mostrar mensaje */}
                            {education.length === 0 && !showAddEducationForm && (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No hay formación registrada. Completa el formulario:
                              </p>
                            )}

                            {/* Formulario para agregar (visible si no hay items O si se presionó el botón) */}
                            {(education.length === 0 || showAddEducationForm) && (
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <h6 className="font-medium text-sm">{editingEducationId ? "Editar Formación" : "Agregar Formación"}</h6>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={newEducation.title}
                        onChange={(e) => setNewEducation({ ...newEducation, title: e.target.value })}
                        placeholder="Ej: Magister en Administración"
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Institución</Label>
                      <Input
                        value={newEducation.institution}
                        onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
                        placeholder="Nombre de la institución"
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                    </div>
                    <div className="space-y-2">
                    <Label>Fecha de Obtención</Label>
                    <DatePicker
                      selected={newEducation.completion_date ? new Date(newEducation.completion_date) : null}
                      onChange={(date) => {
                        if (date) {
                          setNewEducation({ ...newEducation, completion_date: date.toISOString().split('T')[0] })
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      placeholderText="Selecciona fecha de obtención"
                      className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      maxDate={new Date()}
                      yearDropdownItemNumber={50}
                      locale="es"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddEducation}
                      disabled={!newEducation.institution || !newEducation.title || !newEducation.completion_date}
                      className="flex-1"
                    >
                      {editingEducationId ? "Guardar Cambios" : "Agregar Formación"}
                    </Button>
                    {(education.length > 0 || editingEducationId) && (
                      <Button
                        variant="outline"
                        onClick={handleCancelEditEducation}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                              </div>
                            )}

                            {/* Botón para agregar otra formación (solo si ya hay items Y el formulario está oculto) */}
                            {education.length > 0 && !showAddEducationForm && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAddEducationForm(true)}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar otra formación
                              </Button>
                            )}

                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </div>
                  </Accordion>

                  {/* Sub-acordeón 3: Habilidades Adicionales */}
                  <Accordion type="multiple" className="space-y-2">
                    <div className="border rounded-lg bg-card">
                      <AccordionItem value="habilidades" className="border-0">
                        <AccordionTrigger className="px-3 py-2 hover:no-underline">
                          <span className="font-medium text-sm">
                            Habilidades Adicionales {(personalData.english_level || personalData.software_tools) ? <span className="text-green-600">✓</span> : <span className="text-amber-600">- Sin completar</span>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-3 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="english_level">Nivel de Inglés</Label>
                      <Input
                                  id="english_level"
                                  value={personalData.english_level}
                                  onChange={(e) => setPersonalData({ ...personalData, english_level: e.target.value })}
                                  placeholder="Ej: Intermedio, Avanzado, Nativo"
                                  className="bg-white dark:bg-gray-950"
                      />
                    </div>
                              <div className="space-y-2">
                                <Label htmlFor="software_tools">Software y Herramientas</Label>
                                <Input
                                  id="software_tools"
                                  value={personalData.software_tools}
                                  onChange={(e) => setPersonalData({ ...personalData, software_tools: e.target.value })}
                                  placeholder="Ej: Excel, SAP, AutoCAD"
                                  className="bg-white dark:bg-gray-950"
                                />
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </div>
                  </Accordion>

                  </div>
                </AccordionContent>
              </AccordionItem>
              </div>

              {/* Experiencia Laboral */}
              <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-lg border border-slate-200 dark:border-slate-800">
              <AccordionItem value="experiencia" className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <h4 className="font-semibold text-lg text-foreground">
                    Experiencia Laboral {workExperience.length > 0 && <span className="text-muted-foreground">({workExperience.length})</span>}
                  </h4>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 pt-2">

                    {/* Si tiene experiencias, mostrar lista primero */}
                    {workExperience.length > 0 && (
                      <div className="space-y-2">
                        {[...workExperience].reverse().map((exp) => (
                          <div key={exp.id} className="flex items-start justify-between p-3 border rounded-lg bg-background">
                            <div>
                              <p className="font-medium">{exp.position}</p>
                              <p className="text-sm text-muted-foreground">{exp.company}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {exp.start_date && formatDate(exp.start_date)} - {exp.is_current ? 'Actual' : (exp.end_date ? formatDate(exp.end_date) : 'No especificada')}
                              </p>
                              {exp.description && (
                                <p className="text-sm mt-1">{exp.description}</p>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditWorkExperience(exp.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveWorkExperience(exp.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Si NO tiene experiencias, mostrar mensaje */}
                    {workExperience.length === 0 && !showAddWorkExperienceForm && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No hay experiencias registradas. Completa el formulario:
                      </p>
                    )}

                    {/* Formulario para agregar (visible si no hay items O si se presionó el botón) */}
                    {(workExperience.length === 0 || showAddWorkExperienceForm) && (
                      <div className="space-y-4 p-4 bg-muted rounded-lg">
                        <h5 className="font-medium text-sm">{editingWorkExperienceId ? "Editar Experiencia" : "Agregar Experiencia"}</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Empresa</Label>
                      <Input
                        value={newWorkExperience.company}
                        onChange={(e) => setNewWorkExperience({ ...newWorkExperience, company: e.target.value })}
                        placeholder="Nombre de la empresa"
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cargo</Label>
                      <Input
                        value={newWorkExperience.position}
                        onChange={(e) => setNewWorkExperience({ ...newWorkExperience, position: e.target.value })}
                        placeholder="Título del cargo"
                        className="bg-white dark:bg-gray-950"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha Inicio</Label>
                      <DatePicker
                        selected={newWorkExperience.start_date ? new Date(newWorkExperience.start_date) : null}
                        onChange={(date) => {
                          if (date) {
                            setNewWorkExperience({ ...newWorkExperience, start_date: date.toISOString().split('T')[0] })
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                        placeholderText="Selecciona fecha"
                        className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        maxDate={new Date()}
                        yearDropdownItemNumber={50}
                        locale="es"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Fin</Label>
                      <DatePicker
                        selected={newWorkExperience.end_date ? new Date(newWorkExperience.end_date) : null}
                        onChange={(date) => {
                          if (date) {
                            setNewWorkExperience({ ...newWorkExperience, end_date: date.toISOString().split('T')[0] })
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        showYearDropdown
                        showMonthDropdown
                        dropdownMode="select"
                        placeholderText="Selecciona fecha"
                        className="w-full p-2 border border-input bg-background rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        maxDate={new Date()}
                        minDate={newWorkExperience.start_date ? new Date(newWorkExperience.start_date) : undefined}
                        yearDropdownItemNumber={50}
                        disabled={newWorkExperience.is_current}
                        locale="es"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_current"
                      checked={newWorkExperience.is_current}
                      onChange={(e) => setNewWorkExperience({
                        ...newWorkExperience,
                        is_current: e.target.checked,
                        end_date: e.target.checked ? "" : newWorkExperience.end_date,
                      })}
                    />
                    <Label htmlFor="is_current">Trabajo actual</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción de Funciones</Label>
                    <Textarea
                      value={newWorkExperience.description}
                      onChange={(e) => setNewWorkExperience({ ...newWorkExperience, description: e.target.value })}
                      placeholder="Principales responsabilidades y logros"
                      rows={3}
                      className="bg-white dark:bg-gray-950"
                    />
                  </div>
                        <div className="flex gap-2">
                  <Button
                            onClick={handleAddWorkExperience}
                            disabled={!newWorkExperience.company || !newWorkExperience.position}
                            className="flex-1"
                          >
                            {editingWorkExperienceId ? "Guardar Cambios" : "Agregar Experiencia"}
                  </Button>
                          {(workExperience.length > 0 || editingWorkExperienceId) && (
                            <Button
                              variant="outline"
                              onClick={handleCancelEditWorkExperience}
                            >
                              Cancelar
                            </Button>
                            )}
                          </div>
                  </div>
                )}

                    {/* Botón para agregar otra experiencia (solo si ya hay experiencias Y el formulario está oculto) */}
                    {workExperience.length > 0 && !showAddWorkExperienceForm && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddWorkExperienceForm(true)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar otra experiencia
                      </Button>
                    )}

                  </div>
                </AccordionContent>
              </AccordionItem>
              </div>

              </Accordion>

              {/* Botón guardar fuera de las secciones */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handlePersonalDataSubmit}
                  disabled={savingCandidate}
                >
                  {savingCandidate ? "Guardando..." : "Guardar Datos del Candidato"}
                </Button>
              </div>
              </>
                    </div>
                  )}
                </div>
              </div>
            )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                </div>
              ))}
            </Accordion>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CV Viewer Dialog */}
      {showCVViewer && currentCandidate && (
        <CVViewerDialog
          candidate={currentCandidate}
          isOpen={showCVViewer}
          onClose={() => setShowCVViewer(false)}
        />
      )}

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: null, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === 'profession' && 'Esta acción eliminará la profesión. Recuerda guardar los cambios al finalizar.'}
              {deleteDialog.type === 'education' && 'Esta acción eliminará la formación académica. Recuerda guardar los cambios al finalizar.'}
              {deleteDialog.type === 'workExperience' && 'Esta acción eliminará la experiencia laboral. Recuerda guardar los cambios al finalizar.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}