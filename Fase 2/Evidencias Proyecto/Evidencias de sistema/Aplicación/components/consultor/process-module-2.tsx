 "use client"



import { useState, useEffect, useMemo } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Button } from "@/components/ui/button"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import { Input } from "@/components/ui/input"

import { Label } from "@/components/ui/label"

import { Checkbox } from "@/components/ui/checkbox"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { Badge } from "@/components/ui/badge"

import { Alert, AlertDescription } from "@/components/ui/alert"

import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogFooter,

  DialogHeader,

  DialogTitle,

  DialogTrigger,

} from "@/components/ui/dialog"

import { getCandidatesByProcess } from "@/lib/api"

import { formatDate, isProcessBlocked } from "@/lib/utils"

import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { registerLocale, setDefaultLocale } from "react-datepicker"
import { es } from "date-fns/locale"

// Configurar español como idioma por defecto
registerLocale("es", es)
setDefaultLocale("es")
import { Plus, Edit, Trash2, Star, Globe, Settings, FileText, X, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

import type { Process, Publication, Candidate, WorkExperience, Education, PortalResponses } from "@/lib/types"

import { regionService, comunaService, profesionService, rubroService, nacionalidadService, candidatoService, publicacionService, postulacionService, institucionService, solicitudService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import { useFormValidation, validationSchemas } from "@/hooks/useFormValidation"
import { ValidationErrorDisplay } from "@/components/ui/ValidatedFormComponents"

import { AddPublicationDialog } from "./add-publication-dialog"
import { EditPublicationDialog } from "./edit-publication-dialog"
import CVViewerDialog from "./cv-viewer-dialog"
import { ProcessBlocked } from "./ProcessBlocked"
import { CandidateStatusDialog } from "./candidate-status-dialog"
import { CandidateForm } from "./candidate-form"

// Función helper para procesar mensajes de error de la API y convertirlos en mensajes amigables
const processApiErrorMessage = (errorMessage: string | undefined | null, defaultMessage: string): string => {
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
  
  // Si el mensaje parece amigable, devolverlo tal cual (capitalizado)
  return errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)
}

interface ProcessModule2Props {

  process: Process

}



export function ProcessModule2({ process }: ProcessModule2Props) {

  console.log('=== ProcessModule2 RENDERIZADO ===')
  const { showToast } = useToastNotification()
  const { errors, validateField, validateAllFields, clearAllErrors, setFieldError, clearError } = useFormValidation()

  

  // Estados ahora inicializan vacíos y se llenan con useEffect

  const [publications, setPublications] = useState<Publication[]>([])

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

  const [postgrados, setPostgrados] = useState<any[]>([])

  const [loadingLists, setLoadingLists] = useState(true)
  const [isAdvancingToModule3, setIsAdvancingToModule3] = useState(false)

  // Estados para diálogos
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])

  const [showAddPublication, setShowAddPublication] = useState(false)
  const [editingPublication, setEditingPublication] = useState<any | null>(null)
  const [showEditPublication, setShowEditPublication] = useState(false)

  const [showAddCandidate, setShowAddCandidate] = useState(false)

  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)

  const [showEditCandidate, setShowEditCandidate] = useState(false)

  // Estados para formularios múltiples de editar candidato
  const [editWorkExperienceForms, setEditWorkExperienceForms] = useState<any[]>([])
  const [editEducationForms, setEditEducationForms] = useState<any[]>([])

  const [viewingCV, setViewingCV] = useState<Candidate | null>(null)

  const [showViewCV, setShowViewCV] = useState(false)

  const [showCandidateDetails, setShowCandidateDetails] = useState(false)

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

  const [currentStep, setCurrentStep] = useState<"basic" | "education" | "experience" | "portal_responses">("basic")
  
  // Estado para rastrear si se ha intentado enviar el formulario
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  
  // Estados para rastrear qué campos de profesión han sido "touched" por formulario
  const [touchedProfessionFields, setTouchedProfessionFields] = useState<Record<string, {
    profession: boolean,
    profession_institution: boolean,
    profession_date: boolean
  }>>({})

  // Estado del proceso para verificar bloqueo
  const [processStatus, setProcessStatus] = useState<string>((process.estado_solicitud || process.status) as string)
  
  // Verificar si el proceso está bloqueado (estado final)
  const isBlocked = isProcessBlocked(processStatus)

  // Verificar si ya está en un módulo avanzado (módulo 4 o 5)
  const isInAdvancedModule = process.etapa && (
    process.etapa.includes("Módulo 4") || 
    process.etapa.includes("Módulo 5")
  )

  // Verificar si hay al menos un candidato presentado
  const hasPresentedCandidates = useMemo(() => {
    return candidates.some(candidate => candidate.presentation_status === 'presentado')
  }, [candidates])

  // Cargar datos reales desde el backend

  // Cargar listas desplegables

  useEffect(() => {

    const loadLists = async () => {

      try {

        setLoadingLists(true)

        const [regionesRes, comunasRes, profesionesRes, rubrosRes, nacionalidadesRes, portalesRes, institucionesRes] = await Promise.all([
          regionService.getAll(),

          comunaService.getAll(),

          profesionService.getAll(),

          rubroService.getAll(),

          nacionalidadService.getAll(),

          publicacionService.getPortales(), // Cargar portales de BD
          institucionService.getAll(), // Cargar instituciones

        ])

        setRegiones(regionesRes.data || [])

        setTodasLasComunas(comunasRes.data || [])

        setProfesiones(profesionesRes.data || [])

        setRubros(rubrosRes.data || [])

        setNacionalidades(nacionalidadesRes.data || [])

        setInstituciones(institucionesRes.data || [])

        setPortalesDB(portalesRes.data || [])
      } catch (error) {

        console.error('Error al cargar listas:', error)

      } finally {

        setLoadingLists(false)

      }

    }

    loadLists()

  }, [])



  useEffect(() => {

    if (process?.id && !isNaN(parseInt(process.id))) {
      loadData()
    }
  }, [process.id])

  // Efecto para configurar comunas filtradas cuando se abre el formulario de editar
  useEffect(() => {
    console.log('🔍 useEffect edit candidate:', { showEditCandidate, editingCandidateRegion: editingCandidate?.region, regionesLength: regiones.length, todasLasComunasLength: todasLasComunas.length })
    if (showEditCandidate && editingCandidate?.region) {
      const regionId = regiones.find(r => r.nombre_region === editingCandidate.region)?.id_region
      console.log('🔍 ID de región en useEffect:', regionId)
      if (regionId) {
        const comunasDeRegion = todasLasComunas.filter(comuna => comuna.id_region === regionId)
        console.log('🔍 Comunas filtradas en useEffect:', comunasDeRegion)
        setComunasFiltradas(comunasDeRegion)
      }
    }
  }, [showEditCandidate, editingCandidate?.region, regiones, todasLasComunas])

    const loadData = async () => {

      try {

        setIsLoading(true)

      
      // Validar que process.id sea válido
      const processId = parseInt(process.id)
      if (isNaN(processId)) {
        console.error('ID de proceso inválido en ProcessModule2:', process.id)
        return
      }
      
      // Cargar publicaciones desde el backend
      const publicationsResponse = await publicacionService.getAll({ solicitud_id: processId })
      const publicationsData = publicationsResponse.success && publicationsResponse.data ? publicationsResponse.data : []
      
      // Cargar candidatos desde el backend (postulaciones)
      const candidatesResponse = await postulacionService.getBySolicitud(processId)
      const candidatesData = candidatesResponse.success && candidatesResponse.data ? candidatesResponse.data : []
      
        setPublications(publicationsData)

        setCandidates(candidatesData)

      } catch (error) {

        console.error('Error al cargar datos:', error)

      showToast({
        type: "error",
        title: "Error",
        description: "Error al cargar datos del módulo",
      })
      } finally {

        setIsLoading(false)

      }

    }



  const [showPortalManager, setShowPortalManager] = useState(false)

  const [customPortals, setCustomPortals] = useState<string[]>([

    "LinkedIn",

    "GetOnBoard",

    "Indeed",

    "Trabajando.com",

    "Laborum",

    "Behance",

  ])

  const [portalesDB, setPortalesDB] = useState<any[]>([]) // Portales de la BD
  const [newPortalName, setNewPortalName] = useState("")

  // Filtrar portales para mostrar solo los que tienen publicaciones activas
  // Si estamos editando un candidato, también incluimos su portal actual aunque no esté activo
  const portalesConPublicacionesActivas = useMemo(() => {
    // Si portalesDB aún no está cargado, retornar array vacío
    if (!portalesDB || portalesDB.length === 0) {
      return []
    }

    // Obtener IDs de portales que tienen publicaciones activas
    const portalesActivosIds = new Set(
      publications
        .filter((pub: any) => pub.estado_publicacion === "Activa")
        .map((pub: any) => pub.id_portal_postulacion)
    )
    
    // Si estamos editando un candidato, obtener su portal actual
    let portalActualId: number | null = null
    if (editingCandidate && editingCandidate.source_portal) {
      // Buscar el portal en portalesDB por nombre o ID
      const portalActual = portalesDB.find((p: any) => 
        p.nombre === editingCandidate.source_portal || 
        p.id.toString() === editingCandidate.source_portal?.toString()
      )
      if (portalActual) {
        portalActualId = portalActual.id
      }
    }
    
    // Filtrar portalesDB para incluir solo los que tienen publicaciones activas
    // o el portal actual del candidato que se está editando
    return portalesDB.filter((portal: any) => 
      portalesActivosIds.has(portal.id) || 
      (portalActualId !== null && portal.id === portalActualId)
    )
  }, [publications, portalesDB, editingCandidate])



  const [newPublication, setNewPublication] = useState({

    portal: "",

    publication_date: "",

    status: "activa" as "activa" | "cerrada",

    url: "",

  })



  const [newCandidate, setNewCandidate] = useState({

    nombre: "",

    primer_apellido: "",

    segundo_apellido: "",

    email: "",

    phone: "",

    rut: "",

    cv_file: null as File | null,

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

    work_experience: [] as WorkExperience[],

    education: [] as Education[],

    portal_responses: {

      motivation: "",

      salary_expectation: "",

      availability: "",

      family_situation: "",

      rating: 3,

      english_level: "",

      licencia: false,

      software_tools: "",

    } as PortalResponses,

  })

  // Filtrar comunas cuando cambia la región en newCandidate

  useEffect(() => {

    if (newCandidate.region) {

      const regionSeleccionada = regiones.find(r => r.nombre_region === newCandidate.region)

      if (regionSeleccionada) {

        const filtradas = todasLasComunas.filter(

          c => c.id_region === regionSeleccionada.id_region

        )

        setComunasFiltradas(filtradas)

      }

    } else {

      setComunasFiltradas([])

    }

  }, [newCandidate.region, regiones, todasLasComunas])



  const [candidateDetails, setCandidateDetails] = useState({

    birth_date: "",

    age: 0,

    comuna: "",

    profession: "",

    consultant_comment: "",

    has_disability_credential: false,

    licencia: false,

    work_experience: [] as WorkExperience[],

    education: [] as Education[],

    portal_responses: {

      motivation: "",

      salary_expectation: "",

      availability: "",

      family_situation: "",

      rating: 3,

      english_level: "",

      licencia: false,

      software_tools: "",

    } as PortalResponses,

  })



  // Formularios antiguos eliminados - ahora se usan workExperienceForms y educationForms

  // Estados para múltiples formularios de experiencia y educación
  const [workExperienceForms, setWorkExperienceForms] = useState<any[]>([
    {
      id: '1',
      company: '',
      position: '',
      start_date: '',
      end_date: '',
      description: ''
    }
  ])
  const [educationForms, setEducationForms] = useState<any[]>([
    {
      id: '1',
      institution: '',
      title: '',
      start_date: '',
      completion_date: ''
    }
  ])
  const [professionForms, setProfessionForms] = useState<any[]>([
    {
      id: '1',
      profession: '',
      profession_institution: '',
      profession_date: ''
    }
  ])

  // Calcular si al menos un campo de profesión tiene valor (habilita validaciones)
  const hasAnyProfessionField = useMemo(() => {
    return professionForms.some(form => 
      !!(form.profession?.trim() || form.profession_institution?.trim() || form.profession_date?.trim())
    )
  }, [professionForms])

  // Listener para sincronización con Módulo 3

  useEffect(() => {

    const checkForSyncData = () => {

      const syncKeys = Object.keys(localStorage).filter(key => key.startsWith('candidate_sync_'))

      

      syncKeys.forEach(key => {

        try {

          const syncData = JSON.parse(localStorage.getItem(key) || '{}')

          if (syncData.candidateId && syncData.status === "rechazado") {

            setCandidates((prevCandidates: Candidate[]) => {

              const existingCandidate = prevCandidates.find((c: Candidate) => c.id === syncData.candidateId)



              if (existingCandidate) {

                return prevCandidates.map((candidate: Candidate) =>

                  candidate.id === syncData.candidateId

                    ? {

                        ...candidate,

                        status: "rechazado" as const,

                        presentation_status: "rechazado" as const,

                        rejection_reason: syncData.rejection_reason

                      } as Candidate

                    : candidate

                )

              } else {

                // NOTA: getCandidatesByProcess ahora es async, no se puede usar aquí

                // Con la API real, se recargarán los datos automáticamente

                return prevCandidates

              }

            })

            localStorage.removeItem(key)

          }

        } catch (error) {

          console.error('Error processing sync data:', error)

        }

      })

    }



    // Check for sync data every 500ms

    const interval = setInterval(checkForSyncData, 500)



    return () => {

      clearInterval(interval)

    }

  }, [process.id])



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

  // Función para validar edad mínima
  const validateAge = (birthDate: string) => {
    if (!birthDate) return null
    const age = calculateAge(birthDate)
    if (age < 18) {
      return 'El candidato debe ser mayor de 18 años'
    }
    return null
  }

  const handleAddPublication = () => {

    const publication: Publication = {

      id: Date.now().toString(),

      process_id: process.id,

      portal: newPublication.portal,

      publication_date: newPublication.publication_date,

      status: newPublication.status,

      url: newPublication.url,

    }

    setPublications([...publications, publication])

    setNewPublication({ portal: "", publication_date: "", status: "activa", url: "" })

    setShowAddPublication(false)

  }

  // Función para descartar todas las profesiones
  const handleDiscardProfession = () => {
    // Limpiar todos los formularios de profesión
    setProfessionForms([{
      id: '1',
      profession: '',
      profession_institution: '',
      profession_date: ''
    }])
    
    // Limpiar todos los errores de profesión
    professionForms.forEach((form) => {
      clearError(`profession_${form.id}_profession`)
      clearError(`profession_${form.id}_institution`)
      clearError(`profession_${form.id}_date`)
    })
    
    // Resetear el estado de touched
    setTouchedProfessionFields({})
  }

  // Función para descartar una profesión individual
  const handleDiscardSingleProfession = (formId: string) => {
    // Si hay más de una profesión, eliminar el formulario completo
    if (professionForms.length > 1) {
      removeProfessionForm(formId)
      return
    }
    
    // Si hay solo una profesión, limpiar los campos del formulario
    setProfessionForms(prevForms => 
      prevForms.map(form => 
        form.id === formId 
          ? {
              ...form,
              profession: '',
              profession_institution: '',
              profession_date: ''
            }
          : form
      )
    )
    
    // Limpiar los errores de esa profesión específica
    clearError(`profession_${formId}_profession`)
    clearError(`profession_${formId}_institution`)
    clearError(`profession_${formId}_date`)
    
    // Limpiar el estado touched para esa profesión específica
    setTouchedProfessionFields(prev => {
      const updated = { ...prev }
      delete updated[`${formId}_profession`]
      delete updated[`${formId}_institution`]
      delete updated[`${formId}_date`]
      return updated
    })
  }

  // Función para descartar una educación individual
  const handleDiscardSingleEducation = (formId: string) => {
    // Si hay más de una educación, eliminar el formulario completo
    if (educationForms.length > 1) {
      removeEducationForm(formId)
      return
    }
    
    // Si hay solo una educación, limpiar los campos del formulario
    setEducationForms(prevForms => 
      prevForms.map(form => 
        form.id === formId 
          ? {
              ...form,
              title: '',
              institution: '',
              start_date: '',
              completion_date: ''
            }
          : form
      )
    )
    
    // Limpiar los errores de esa educación específica
    clearError(`education_${formId}_title`)
    clearError(`education_${formId}_institution`)
    clearError(`education_${formId}_start_date`)
    clearError(`education_${formId}_completion_date`)
  }

  // Función para descartar una experiencia laboral individual
  const handleDiscardSingleWorkExperience = (formId: string) => {
    // Si hay más de una experiencia, eliminar el formulario completo
    if (workExperienceForms.length > 1) {
      removeWorkExperienceForm(formId)
      return
    }
    
    // Si hay solo una experiencia, limpiar los campos del formulario
    setWorkExperienceForms(prevForms => 
      prevForms.map(form => 
        form.id === formId 
          ? {
              ...form,
              company: '',
              position: '',
              start_date: '',
              end_date: '',
              description: ''
            }
          : form
      )
    )
    
    // Limpiar los errores de esa experiencia específica
    clearError(`work_experience_${formId}_company`)
    clearError(`work_experience_${formId}_position`)
    clearError(`work_experience_${formId}_start_date`)
    clearError(`work_experience_${formId}_end_date`)
    clearError(`work_experience_${formId}_description`)
  }

  const handleAddCandidateSubmit = async (
    formData: any,
    professionFormsData: any[],
    educationFormsData: any[],
    workExperienceFormsData: any[]
  ) => {
    console.log('=== INICIANDO handleAddCandidateSubmit ===')
    console.log('Datos del formulario:', formData)

    console.log('Validando campos obligatorios...')
    
    // Validar que process.id sea válido
    const processId = parseInt(process.id)
    if (isNaN(processId)) {
      console.error('ID de proceso inválido en handleAddCandidateSubmit:', process.id)
      showToast({
        type: "error",
        title: "Error",
        description: "ID de proceso inválido",
      })
      return
    }

    // Validar que se haya seleccionado un portal
    if (!formData.source_portal || formData.source_portal.trim() === "") {
      showToast({
        type: "error",
        title: "Campo obligatorio",
        description: "El portal de origen es obligatorio",
      })
      return
    }
    
    // Validar que el portal seleccionado ya haya sido publicado
    const selectedPortalId = parseInt(formData.source_portal)
    const portalExistsInPublications = publications.some((publication: any) => 
      publication.id_portal_postulacion === selectedPortalId
    )
    
    if (!portalExistsInPublications) {
      showToast({
        type: "error",
        title: "Portal no publicado",
        description: "Debes publicar en este portal antes de agregar candidatos desde él. Ve a la sección 'Publicaciones en Portales' y agrega una publicación para este portal.",
      })
      return
    }
    
    try {
      // Validar archivo CV si existe
      if (formData.cv_file) {
        // Validar formato de archivo CV
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessorml.document']
        if (!allowedTypes.includes(formData.cv_file.type)) {
          showToast({
            type: "error",
            title: "Campo obligatorio",
            description: "El CV debe ser un archivo PDF o Word (.pdf, .doc, .docx)",
          })
          return
        }
        
        // Validar tamaño del archivo (máximo 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (formData.cv_file.size > maxSize) {
          showToast({
            type: "error",
            title: "Campo obligatorio",
            description: "El archivo CV no puede superar los 5MB",
          })
          return
        }
      }

      // console.log('Validación OK - preparando datos...')

      // Preparar datos para enviar al backend
      console.log('📊 Datos de experiencia (workExperienceFormsData):', workExperienceFormsData);
      console.log('📊 Datos de educación (educationFormsData):', educationFormsData);
      console.log('📊 Longitud de workExperienceFormsData:', workExperienceFormsData.length);
      console.log('📊 Longitud de educationFormsData:', educationFormsData.length);

      // ✅ CAMBIO: Enviar nombre, primer_apellido y segundo_apellido por separado
      // Si segundo_apellido está vacío o es muy corto, usar "N/A"
      const segundoApellidoCreate = formData.segundo_apellido && formData.segundo_apellido.trim().length >= 2 
        ? formData.segundo_apellido.trim() 
        : 'N/A';
      
      const candidateData = {
        nombre: formData.nombre,
        primer_apellido: formData.primer_apellido,
        segundo_apellido: segundoApellidoCreate,
        email: formData.email,
        phone: formData.phone,
        rut: formData.rut || undefined,
        birth_date: formData.birth_date || undefined,
        comuna: formData.comuna || undefined,
        nacionalidad: formData.nacionalidad || undefined,
        rubro: formData.rubro || undefined,

        // Enviar múltiples profesiones como array
        professions: professionFormsData.length > 0
          ? professionFormsData
            .filter(prof => prof.profession && prof.profession_institution) // Solo enviar formularios con datos válidos
            .map(prof => ({
              profession: prof.profession,
              institution: prof.profession_institution,
              date: prof.profession_date
            }))
          : undefined,

        english_level: formData.portal_responses?.english_level || undefined,
        software_tools: formData.portal_responses?.software_tools || undefined,
        has_disability_credential: formData.has_disability_credential,
        licencia: formData.licencia,

        work_experience: workExperienceFormsData.length > 0 
          ? workExperienceFormsData
            .filter(exp => exp.company && exp.position) // Solo enviar formularios con datos válidos
            .map(exp => ({
              company: exp.company,
              position: exp.position,
              start_date: exp.start_date,
              end_date: exp.end_date,
              description: exp.description,
            }))
          : undefined,

        // ✅ CORREGIDO: Enviar título e institución como nombres, no IDs
        education: educationFormsData.length > 0
          ? educationFormsData
            .filter(edu => edu.title && edu.institution) // Solo enviar formularios con datos válidos
            .map(edu => ({
              title: edu.title, // ✅ Título del postgrado/capacitación
              institution: edu.institution, // ✅ Nombre de la institución
              completion_date: edu.completion_date,
            }))
          : undefined,
      }



      console.log('Datos preparados para enviar:', candidateData)

      console.log('Llamando al API...')



      // Llamar al API
      console.log('📊 Datos finales del candidato:', JSON.stringify(candidateData, null, 2));

      const response = await candidatoService.create(candidateData)

      

      console.log('Respuesta del API:', response)



      if (response.success && response.data) {
        console.log('¡Candidato creado exitosamente!', response.data)
        
        // Crear la postulación asociada
        try {
          console.log('Creando postulación...')
          // Asegurar que processId esté disponible
          const processIdForPostulation = parseInt(process.id)
          const postulacionData = {
            id_candidato: parseInt(response.data.id),
            id_solicitud: processIdForPostulation,
            id_portal_postulacion: formData.source_portal ? parseInt(formData.source_portal) : 1, // Por defecto: 1 = LinkedIn
            id_estado_candidato: 6, // 6 = "Agregado" (estado inicial al crear candidato en módulo 2)
            motivacion: formData.portal_responses?.motivation || formData.motivation,
            expectativa_renta: formData.portal_responses?.salary_expectation 
              ? parseFloat(formData.portal_responses.salary_expectation) 
              : (formData.salary_expectation ? parseFloat(formData.salary_expectation.toString()) : undefined),
            disponibilidad_postulacion: formData.portal_responses?.availability || formData.availability,
            valoracion: formData.consultant_rating,
            comentario_no_presentado: formData.consultant_comment,
            // Campos adicionales de postulación
            situacion_familiar: formData.portal_responses?.family_situation || undefined,
            cv_file: formData.cv_file || undefined // El archivo CV se maneja por separado
          }
          
          const postulacionResponse = await postulacionService.create(postulacionData)
          
          if (postulacionResponse.success) {
            // console.log('¡Postulación creada exitosamente!')
            showToast({
              type: "success",
              title: "¡Éxito!",
              description: "¡Candidato y postulación creados correctamente!",
            })
          } else {
            console.error('Error al crear postulación:', postulacionResponse)
            showToast({
              type: "error",
              title: "Campo obligatorio",
              description: "Candidato creado, pero hubo un error al crear la postulación",
            })
          }
        } catch (postError) {
          console.error('Error al crear postulación:', postError)
          showToast({
            type: "error",
            title: "Campo obligatorio",
            description: "Candidato creado, pero hubo un error al crear la postulación",
          })
        }

        // Recargar la lista de candidatos desde el backend
        // console.log('Recargando lista de candidatos...')
        await loadData()

        // Cerrar el diálogo
        setShowAddCandidate(false)

        // console.log('Proceso completado')
      } else {

        console.error('La respuesta no fue exitosa:', response)

        const errorMsg = processApiErrorMessage(response.message, "Error al guardar candidato")
        showToast({

          type: "error",

          title: "Error",

          description: errorMsg,

        })

      }

    } catch (error: any) {

      console.error('=== ERROR EN handleAddCandidate ===')

      console.error('Tipo de error:', error)

      console.error('Mensaje:', error.message)

      console.error('Stack:', error.stack)

      

      const errorMsg = processApiErrorMessage(error.message, "No se pudo agregar el candidato. Intenta nuevamente.")
      showToast({

        type: "error",

        title: "Error",

        description: errorMsg,

      })

    }

  }



  // Función para preparar datos iniciales para el formulario de edición
  const prepareInitialDataForEdit = (candidate: Candidate) => {
    console.log('🔍 prepareInitialDataForEdit - candidato:', candidate)
    console.log('🔍 prepareInitialDataForEdit - candidate.name:', candidate.name)
    
    // Dividir nombre completo en partes
    const nameParts = candidate.name.split(' ')
    const nombre = nameParts[0] || ''
    const primer_apellido = nameParts[1] || ''
    const segundo_apellido = nameParts.slice(2).join(' ') || ''

    console.log('🔍 Nombre dividido - nombre:', nombre)
    console.log('🔍 Nombre dividido - primer_apellido:', primer_apellido)
    console.log('🔍 Nombre dividido - segundo_apellido:', segundo_apellido)

    // Convertir el nombre del portal a su ID correspondiente
    let portalId = ""
    if (candidate.source_portal) {
      console.log('🔍 candidate.source_portal:', candidate.source_portal)
      console.log('🔍 portalesDB:', portalesDB)
      
      // Verificar si ya es un ID (número o string numérico)
      if (!isNaN(Number(candidate.source_portal))) {
        portalId = candidate.source_portal.toString()
        console.log('🔍 Portal ya es ID:', portalId)
      } else {
        // Buscar por nombre
        const portal = portalesDB.find(p => p.nombre === candidate.source_portal)
        if (portal) {
          portalId = portal.id.toString()
          console.log('🔍 Portal encontrado por nombre - ID:', portalId, 'Nombre:', portal.nombre)
        } else {
          console.log('⚠️ Portal no encontrado en portalesDB')
        }
      }
    }

    const initialData = {
      nombre,
      primer_apellido,
      segundo_apellido,
      email: candidate.email || '',
      phone: candidate.phone || '',
      rut: candidate.rut || '',
      birth_date: candidate.birth_date || '',
      age: candidate.age || 0,
      region: candidate.region || '',
      comuna: candidate.comuna || '',
      nacionalidad: candidate.nacionalidad || '',
      rubro: candidate.rubro || '',
      consultant_rating: candidate.consultant_rating || 3,
      has_disability_credential: candidate.has_disability_credential || false,
      licencia: candidate.licencia || false,
      source_portal: portalId,
      consultant_comment: candidate.consultant_comment || '',
      // Agregar profesiones, educación y experiencia laboral
      professions: candidate.professions || [],
      education: candidate.education || [],
      work_experience: candidate.work_experience || [],
      portal_responses: {
        motivation: candidate.portal_responses?.motivation || '',
        salary_expectation: candidate.portal_responses?.salary_expectation || '',
        availability: candidate.portal_responses?.availability || '',
        family_situation: candidate.portal_responses?.family_situation || '',
        rating: candidate.portal_responses?.rating || 3,
        english_level: candidate.portal_responses?.english_level || '',
        has_driving_license: candidate.portal_responses?.has_driving_license || false,
        software_tools: candidate.portal_responses?.software_tools || '',
      }
    }
    
    console.log('🔍 initialData preparado:', initialData)
    console.log('🔍 initialData.nombre:', initialData.nombre)
    console.log('🔍 initialData.primer_apellido:', initialData.primer_apellido)
    console.log('🔍 initialData.segundo_apellido:', initialData.segundo_apellido)
    console.log('🔍 initialData.professions:', initialData.professions)
    console.log('🔍 initialData.education:', initialData.education)
    console.log('🔍 initialData.work_experience:', initialData.work_experience)
    
    return initialData
  }

  const handleEditCandidate = (candidate: Candidate) => {

    console.log('🔍 Candidato para editar:', candidate)
    console.log('🔍 Región del candidato:', candidate.region)
    console.log('🔍 Comuna del candidato:', candidate.comuna)
    console.log('🔍 Portal del candidato:', candidate.source_portal)
    
    // Convertir el nombre del portal a su ID correspondiente
    let portalId = ""
    if (candidate.source_portal) {
      const portal = portalesDB.find(p => p.nombre === candidate.source_portal)
      if (portal) {
        portalId = portal.id.toString()
        console.log('🔍 Portal encontrado - ID:', portalId, 'Nombre:', portal.nombre)
      } else {
        console.log('⚠️ Portal no encontrado en portalesDB:', candidate.source_portal)
      }
    }
    
    setEditingCandidate({

      ...candidate,

      // Convertir el nombre del portal al ID para el dropdown
      source_portal: portalId,

      // Asegurar que todos los campos opcionales estén definidos

      address: candidate.address || "",

      has_disability_credential: candidate.has_disability_credential || false,

      education: candidate.education || [],

      work_experience: candidate.work_experience || [],

      licencia: candidate.licencia || false,

      portal_responses: {

        motivation: candidate.portal_responses?.motivation || "",

        salary_expectation: candidate.portal_responses?.salary_expectation || "",

        availability: candidate.portal_responses?.availability || "",

        family_situation: candidate.portal_responses?.family_situation || "",

        rating: candidate.portal_responses?.rating || 3,

        english_level: candidate.portal_responses?.english_level || "",

        software_tools: candidate.portal_responses?.software_tools || "",

      },

      // Agregar campos de profesión que faltaban
      profession_institution: candidate.profession_institution || "",
      profession_date: candidate.profession_date || ""

    })


    // Filtrar comunas basándose en la región del candidato
    if (candidate.region) {
      const regionId = regiones.find(r => r.nombre_region === candidate.region)?.id_region
      console.log('🔍 ID de región encontrado:', regionId)
      if (regionId) {
        const comunasDeRegion = todasLasComunas.filter(comuna => comuna.id_region === regionId)
        console.log('🔍 Comunas filtradas:', comunasDeRegion)
        setComunasFiltradas(comunasDeRegion)
      }
    }

    // Inicializar formularios múltiples con datos del candidato
    const workExperienceForms = candidate.work_experience && candidate.work_experience.length > 0
      ? candidate.work_experience.map((exp, index) => ({
        id: exp.id || `exp-${index}`,
        company: exp.company || '',
        position: exp.position || '',
        start_date: exp.start_date || '',
        end_date: exp.end_date || '',
        description: exp.description || ''
      }))
      : [{
        id: '1',
        company: '',
        position: '',
        start_date: '',
        end_date: '',
        description: ''
      }]

    // Debug: Ver qué datos de educación están llegando
    console.log('🔍 Datos de educación del candidato:', candidate.education)
    
    const educationForms = candidate.education && candidate.education.length > 0
      ? candidate.education.map((edu, index) => {
          console.log(`🔍 Educación ${index}:`, edu)
          return {
            id: edu.id || `edu-${index}`,
            institution: edu.institution || '',
            title: edu.title || '',
            start_date: edu.start_date || '',
            completion_date: edu.completion_date || ''
          }
        })
      : [{
        id: '1',
        institution: '',
        title: '',
        start_date: '',
        completion_date: ''
      }]

    setEditWorkExperienceForms(workExperienceForms)
    setEditEducationForms(educationForms)

    setShowEditCandidate(true)

  }



  const handleEditCandidateSubmit = async (
    formData: any,
    professionFormsData: any[],
    educationFormsData: any[],
    workExperienceFormsData: any[]
  ) => {
    if (!editingCandidate) return

    console.log('=== INICIANDO handleEditCandidateSubmit ===')
    console.log('Datos del formulario:', formData)
    console.log('📝 formData.nombre:', formData.nombre)
    console.log('📝 formData.primer_apellido:', formData.primer_apellido)
    console.log('📝 formData.segundo_apellido:', formData.segundo_apellido)

    try {
      console.log('Guardando cambios del candidato y postulación:', formData)
      console.log('📝 formData.nombre:', formData.nombre)
      console.log('📝 formData.primer_apellido:', formData.primer_apellido)
      console.log('📝 formData.segundo_apellido:', formData.segundo_apellido)
      
      // Validar que el nombre no esté vacío
      if (!formData.nombre || formData.nombre.trim().length < 2) {
        console.error('❌ Error: El nombre está vacío o es muy corto')
        console.error('❌ formData completo:', JSON.stringify(formData, null, 2))
        showToast({
          type: "error",
          title: "Error de validación",
          description: "El nombre del candidato no puede estar vacío. Por favor verifica los campos de nombre.",
        })
        return
      }

      if (!formData.primer_apellido || formData.primer_apellido.trim().length < 2) {
        console.error('❌ Error: El primer apellido está vacío o es muy corto')
        showToast({
          type: "error",
          title: "Error de validación",
          description: "El primer apellido del candidato no puede estar vacío. Por favor verifica los campos de apellido.",
        })
        return
      }

      // ✅ CAMBIO: Enviar nombre, primer_apellido y segundo_apellido por separado
      // Si segundo_apellido está vacío o es muy corto, usar "N/A"
      const segundoApellido = formData.segundo_apellido && formData.segundo_apellido.trim().length >= 2 
        ? formData.segundo_apellido.trim() 
        : 'N/A';
      
      const candidateData = {
        nombre: formData.nombre,
        primer_apellido: formData.primer_apellido,
        segundo_apellido: segundoApellido,
        email: formData.email,
        phone: formData.phone,
        rut: formData.rut || undefined,
        birth_date: formData.birth_date || undefined,
        comuna: formData.comuna || undefined,
        nacionalidad: formData.nacionalidad || undefined,
        rubro: formData.rubro || undefined,
        
        // Enviar múltiples profesiones como array (vacío si no hay)
        professions: professionFormsData
          .filter(prof => prof.profession && prof.profession_institution)
          .map(prof => ({
            profession: prof.profession,
            institution: prof.profession_institution,
            date: prof.profession_date
          })),
          
        english_level: formData.portal_responses?.english_level || undefined,
        software_tools: formData.portal_responses?.software_tools || undefined,
        has_disability_credential: formData.has_disability_credential,
        licencia: formData.licencia,
        
        // Enviar experiencia laboral como array (vacío si no hay)
        work_experience: workExperienceFormsData
          .filter(exp => exp.company && exp.position)
          .map(exp => ({
            company: exp.company,
            position: exp.position,
            start_date: exp.start_date,
            end_date: exp.end_date,
            description: exp.description,
          })),
          
        // Enviar educación como array (vacío si no hay)
        education: educationFormsData
          .filter(edu => edu.title && edu.institution)
          .map(edu => ({
            title: edu.title,
            institution: edu.institution,
            completion_date: edu.completion_date,
          })),
      }

      console.log('📤 candidateData COMPLETO a enviar:', JSON.stringify(candidateData, null, 2))
      console.log('📤 candidateData.nombre:', candidateData.nombre)
      console.log('📤 candidateData.primer_apellido:', candidateData.primer_apellido)
      console.log('📤 candidateData.segundo_apellido:', candidateData.segundo_apellido)
      console.log('📤 ID del candidato a actualizar:', editingCandidate.id)

      const candidateResponse = await candidatoService.update(parseInt(editingCandidate.id), candidateData)

      if (!candidateResponse.success) {
        const errorMsg = processApiErrorMessage(candidateResponse.message, 'Error al actualizar candidato')
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
        return
      }

      // 2. Actualizar datos de la POSTULACIÓN (motivacion, expectativa_renta, etc.)
      // Necesitamos buscar el id de la postulación
      const processId = parseInt(process.id)
      if (isNaN(processId)) {
        console.error('ID de proceso inválido en handleSaveEditedCandidate:', process.id)
        return
      }
      const postulaciones = await postulacionService.getBySolicitud(processId)
      
      console.log('🔍 Buscando postulación para candidato:', editingCandidate.id)
      console.log('🔍 formData.portal_responses:', formData.portal_responses)
      console.log('🔍 family_situation:', formData.portal_responses?.family_situation)
      
      // Buscar postulación por id_candidato (el "id" del objeto es el id_candidato)
      const postulacion = postulaciones.data?.find((p: any) => 
        p.id_candidato?.toString() === editingCandidate.id?.toString() || 
        p.id?.toString() === editingCandidate.id?.toString()
      )

      console.log('🔍 Postulación encontrada:', postulacion ? 'SI' : 'NO')
      if (postulacion) {
        console.log('🔍 ID de postulación encontrado:', postulacion.id_postulacion)
      }

      if (postulacion && postulacion.id_postulacion) {
        const postulacionData = {
          motivacion: formData.portal_responses?.motivation || formData.motivation,
          expectativa_renta: formData.portal_responses?.salary_expectation 
            ? parseFloat(formData.portal_responses.salary_expectation) 
            : (formData.salary_expectation ? parseFloat(formData.salary_expectation.toString()) : undefined),
          disponibilidad_postulacion: formData.portal_responses?.availability || formData.availability,
          situacion_familiar: formData.portal_responses?.family_situation || undefined,
          valoracion: formData.consultant_rating,
          comentario_no_presentado: formData.consultant_comment
        }

        console.log('📤 Datos de postulación a enviar:', postulacionData)
        console.log('📤 ID de postulación:', postulacion.id_postulacion)
        console.log('📤 Valoración enviada:', postulacionData.valoracion)

        const postulacionResponse = await postulacionService.updateValoracion(postulacion.id_postulacion, postulacionData)
        
        console.log('📤 Respuesta del backend:', postulacionResponse)
        
        if (!postulacionResponse.success) {
          console.warn('❌ Error al actualizar postulación:', postulacionResponse.message)
        } else {
          console.log('✅ Postulación actualizada correctamente')
        }
      }

      showToast({
        type: "success",
        title: "¡Éxito!",
        description: "Candidato y postulación actualizados exitosamente",
      })
      
      // Recargar los candidatos desde el backend
      await loadData()

    setEditingCandidate(null)

    setShowEditCandidate(false)

    } catch (error: any) {
      console.error('Error al actualizar:', error)
      const errorMsg = processApiErrorMessage(error.message, 'Error al actualizar')
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    }
  }



  const handleViewCV = (candidate: Candidate) => {

    console.log('🔍 handleViewCV - Candidato seleccionado:', candidate)
    console.log('🔍 handleViewCV - candidate.id:', candidate.id)
    console.log('🔍 handleViewCV - candidate.cv_file:', candidate.cv_file)
    setViewingCV(candidate)

    setShowViewCV(true)

  }

  const handleAdvanceToModule3 = async () => {
    // Validar que haya al menos un candidato presentado
    if (!hasPresentedCandidates) {
      showToast({
        type: "error",
        title: "No se puede avanzar",
        description: "Debe tener al menos un candidato con estado 'Presentado' para avanzar al Módulo 3",
      })
      return
    }

    setIsAdvancingToModule3(true)
    try {
      const response = await solicitudService.avanzarAModulo3(parseInt(process.id))

      if (response.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: "Proceso avanzado al Módulo 3 exitosamente",
        })
        // Navegar al módulo 3 usando URL con parámetro
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.set('tab', 'modulo-3')
        window.location.href = currentUrl.toString()
      } else {
        showToast({
          type: "error",
          title: "Error",
          description: "Error al avanzar al Módulo 3",
        })
        setIsAdvancingToModule3(false)
      }
    } catch (error) {
      console.error("Error al avanzar al Módulo 3:", error)
      showToast({
        type: "error",
        title: "Error",
        description: "Error al avanzar al Módulo 3",
      })
      setIsAdvancingToModule3(false)
    }
  }



  const handleDeleteCandidate = (candidateId: string) => {

    const updatedCandidates = candidates.filter((candidate) => candidate.id !== candidateId)

    setCandidates(updatedCandidates)

    setSelectedCandidates(selectedCandidates.filter((id) => id !== candidateId))

  }



  const handleCandidateSelection = (candidateId: string, checked: boolean) => {

    if (checked) {

      setSelectedCandidates([...selectedCandidates, candidateId])

    } else {

      setSelectedCandidates(selectedCandidates.filter((id) => id !== candidateId))

    }

  }



  const handleFilterCandidates = () => {

    const updatedCandidates = candidates.map((candidate) =>

      selectedCandidates.includes(candidate.id) ? { ...candidate, status: "presentado" as const } : candidate,

    )

    setCandidates(updatedCandidates)

    setSelectedCandidates([])

  }



  const handleRatingChange = (candidateId: string, rating: number) => {

    const updatedCandidates = candidates.map((candidate) =>

      candidate.id === candidateId ? { ...candidate, consultant_rating: rating } : candidate,

    )

    setCandidates(updatedCandidates)

  }



  const renderStars = (rating: number, candidateId: string, editable = true) => {

    return (

      <div className="flex gap-1">

        {[1, 2, 3, 4, 5].map((star) => (

          <Star

            key={star}

            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"

            } ${editable ? "cursor-pointer" : ""}`}

            onClick={editable ? () => handleRatingChange(candidateId, star) : undefined}

          />

        ))}

      </div>

    )

  }



  const handleAddPortal = () => {

    // Validaciones
    if (!newPortalName || newPortalName.trim() === "") {
      showToast({
        type: "error",
        title: "Campo obligatorio",
        description: "El nombre del portal es obligatorio",
      })
      return
    }
    
    const portalName = newPortalName.trim()
    
    // Validar longitud mínima
    if (portalName.length < 3) {
      showToast({
        type: "error",
        title: "Nombre muy corto",
        description: "El nombre del portal debe tener al menos 3 caracteres",
      })
      return
    }
    
    // Validar que no exista
    if (customPortals.includes(portalName)) {
      showToast({
        type: "error",
        title: "Portal duplicado",
        description: "Este portal ya existe en la lista",
      })
      return
    }
    
    // Validar que no sea un portal por defecto
    const defaultPortals = ["LinkedIn", "GetOnBoard", "Indeed", "Trabajando.com", "Laborum", "Behance"]
    if (defaultPortals.includes(portalName)) {
      showToast({
        type: "error",
        title: "Portal por defecto",
        description: "Este portal ya está disponible por defecto",
      })
      return
    }
    
    // Agregar portal
    setCustomPortals([...customPortals, portalName])
    setNewPortalName("")
    
    showToast({
      type: "success",
      title: "¡Éxito!",
      description: `Portal "${portalName}" agregado correctamente`,
    })
  }



  const handleDeletePortal = (portalName: string) => {

    // Don't allow deletion of default portals

    const defaultPortals = ["LinkedIn", "GetOnBoard", "Indeed", "Trabajando.com", "Laborum", "Behance"]

    if (!defaultPortals.includes(portalName)) {

      setCustomPortals(customPortals.filter((portal) => portal !== portalName))

    }

  }



  const handleEnterCandidateData = (candidate: Candidate) => {

    setSelectedCandidate(candidate)

    setCandidateDetails({

      birth_date: candidate.birth_date || "",

      age: candidate.age || 0,

      comuna: candidate.comuna || "",

      profession: candidate.profession || "",

      consultant_comment: candidate.consultant_comment || "",

      has_disability_credential: candidate.has_disability_credential || false,

      work_experience: candidate.work_experience || [],

      education: candidate.education || [],

      licencia: candidate.licencia || false,

      portal_responses: candidate.portal_responses || {

        motivation: "",

        salary_expectation: "",

        availability: "",

        family_situation: "",

        rating: 3,

        english_level: "",

        software_tools: "",

      },

    })

    setCurrentStep("basic")

    setShowCandidateDetails(true)

  }



  const handleSaveCandidateDetails = () => {

    if (!selectedCandidate) return



    const updatedCandidate = {

      ...selectedCandidate,

      birth_date: candidateDetails.birth_date,

      age: candidateDetails.age,

      comuna: candidateDetails.comuna,

      profession: candidateDetails.profession,

      consultant_comment: candidateDetails.consultant_comment,

      has_disability_credential: candidateDetails.has_disability_credential,

      work_experience: candidateDetails.work_experience,

      education: candidateDetails.education,

      portal_responses: candidateDetails.portal_responses,

    }



    const updatedCandidates = candidates.map((candidate) =>

      candidate.id === selectedCandidate.id ? updatedCandidate : candidate,

    )

    setCandidates(updatedCandidates)

    setShowCandidateDetails(false)

    setSelectedCandidate(null)

  }



  // Funciones antiguas eliminadas - ahora se usan workExperienceForms y educationForms

  // Funciones para manejar múltiples formularios de experiencia
  const addWorkExperienceForm = () => {
    const newForm = {
      id: Date.now().toString(),
      company: "",
      position: "",
      start_date: "",
      end_date: "",
      description: ""
    }
    setWorkExperienceForms([...workExperienceForms, newForm])
  }

  const updateWorkExperienceForm = (id: string, field: string, value: string) => {
    // Actualizar el formulario
    setWorkExperienceForms(forms => {
      const updatedForms = forms.map(form => 
        form.id === id ? { ...form, [field]: value } : form
      )
      
      // Obtener el formulario actualizado para validación
      const updatedForm = updatedForms.find(f => f.id === id)
      
      if (updatedForm) {
        // Validar el campo
        validateWorkExperienceField(id, field, value, updatedForm)
      }
      
      return updatedForms
    })
  }

  const removeWorkExperienceForm = (id: string) => {
    // Limpiar errores del formulario que se elimina
    clearError(`work_experience_${id}_company`)
    clearError(`work_experience_${id}_position`)
    clearError(`work_experience_${id}_start_date`)
    clearError(`work_experience_${id}_end_date`)
    clearError(`work_experience_${id}_description`)
    
    // Remover el formulario
    setWorkExperienceForms(forms => forms.filter(form => form.id !== id))
  }
  
  // Función para validar un campo de experiencia laboral
  const validateWorkExperienceField = (formId: string, field: string, value: string, formData: any) => {
    const fieldKey = `work_experience_${formId}_${field}`
    
    // Verificar si hay al menos un campo con valor en este formulario
    const hasAnyField = !!(formData.company?.trim() || formData.position?.trim() || formData.start_date?.trim() || formData.end_date?.trim() || formData.description?.trim())
    
    if (!hasAnyField) {
      // Si todos los campos están vacíos, limpiar errores de este formulario
      clearError(`work_experience_${formId}_company`)
      clearError(`work_experience_${formId}_position`)
      clearError(`work_experience_${formId}_start_date`)
      clearError(`work_experience_${formId}_end_date`)
      clearError(`work_experience_${formId}_description`)
      return
    }
    
    // Validar campos con longitud máxima siempre (incluso antes de enviar)
    if (field === 'company') {
      const companyValue = value?.trim() || ''
      if (companyValue.length > 100) {
        setFieldError(fieldKey, 'El nombre de la empresa no puede tener más de 100 caracteres')
      } else if (hasAttemptedSubmit && !companyValue) {
        setFieldError(fieldKey, 'El nombre de la empresa es obligatorio')
      } else {
        clearError(fieldKey)
      }
    }
    
    if (field === 'position') {
      const positionValue = value?.trim() || ''
      if (positionValue.length > 100) {
        setFieldError(fieldKey, 'El cargo no puede tener más de 100 caracteres')
      } else if (hasAttemptedSubmit && !positionValue) {
        setFieldError(fieldKey, 'El cargo es obligatorio')
      } else {
        clearError(fieldKey)
      }
    }
    
    if (field === 'description') {
      const descriptionValue = value?.trim() || ''
      if (descriptionValue.length > 500) {
        setFieldError(fieldKey, 'La descripción no puede tener más de 500 caracteres')
      } else if (hasAttemptedSubmit && !descriptionValue) {
        setFieldError(fieldKey, 'La descripción es obligatoria')
      } else {
        clearError(fieldKey)
      }
    }
    
    // Solo mostrar errores obligatorios si se ha intentado enviar el formulario
    // Pero siempre validar todos los campos cuando se intenta enviar
    if (hasAttemptedSubmit) {
      // Validar empresa (obligatorio si hay algún campo completado, máximo 100 caracteres)
      const companyValue = formData.company?.trim() || ''
      if (!companyValue) {
        setFieldError(`work_experience_${formId}_company`, 'El nombre de la empresa es obligatorio')
      } else if (companyValue.length > 100) {
        setFieldError(`work_experience_${formId}_company`, 'El nombre de la empresa no puede tener más de 100 caracteres')
      } else {
        clearError(`work_experience_${formId}_company`)
      }
      
      // Validar cargo (obligatorio si hay algún campo completado, máximo 100 caracteres)
      const positionValue = formData.position?.trim() || ''
      if (!positionValue) {
        setFieldError(`work_experience_${formId}_position`, 'El cargo es obligatorio')
      } else if (positionValue.length > 100) {
        setFieldError(`work_experience_${formId}_position`, 'El cargo no puede tener más de 100 caracteres')
      } else {
        clearError(`work_experience_${formId}_position`)
      }
      
      // Validar fecha de inicio (obligatoria si hay algún campo completado)
      if (!formData.start_date?.trim()) {
        setFieldError(`work_experience_${formId}_start_date`, 'La fecha de inicio es obligatoria')
      } else {
        clearError(`work_experience_${formId}_start_date`)
      }
      
      // Validar descripción (obligatoria si hay algún campo completado, máximo 500 caracteres)
      const descriptionValue = formData.description?.trim() || ''
      if (!descriptionValue) {
        setFieldError(`work_experience_${formId}_description`, 'La descripción es obligatoria')
      } else if (descriptionValue.length > 500) {
        setFieldError(`work_experience_${formId}_description`, 'La descripción no puede tener más de 500 caracteres')
      } else {
        clearError(`work_experience_${formId}_description`)
      }
    } else {
      // Si no se ha intentado enviar, validar longitud máxima siempre
      // Y limpiar errores cuando se completan campos
      if (field === 'company') {
        const companyValue = value?.trim() || ''
        if (companyValue.length > 100) {
          setFieldError(fieldKey, 'El nombre de la empresa no puede tener más de 100 caracteres')
        } else {
          clearError(fieldKey)
        }
      } else if (field === 'position') {
        const positionValue = value?.trim() || ''
        if (positionValue.length > 100) {
          setFieldError(fieldKey, 'El cargo no puede tener más de 100 caracteres')
        } else {
          clearError(fieldKey)
        }
      } else if (field === 'description') {
        const descriptionValue = value?.trim() || ''
        if (descriptionValue.length > 500) {
          setFieldError(fieldKey, 'La descripción no puede tener más de 500 caracteres')
        } else {
          clearError(fieldKey)
        }
      } else if (field === 'start_date' && value?.trim()) {
        clearError(fieldKey)
      } else if (field === 'end_date' && value?.trim()) {
        clearError(fieldKey)
      }
      
      // También limpiar errores de otros campos si están completados y son válidos
      if (formData.company?.trim() && formData.company.trim().length <= 100) {
        clearError(`work_experience_${formId}_company`)
      }
      
      if (formData.position?.trim() && formData.position.trim().length <= 100) {
        clearError(`work_experience_${formId}_position`)
      }
      
      if (formData.start_date?.trim()) {
        clearError(`work_experience_${formId}_start_date`)
      }
      
      if (formData.description?.trim() && formData.description.trim().length <= 500) {
        clearError(`work_experience_${formId}_description`)
      }
    }
  }

  // Funciones para manejar múltiples formularios de educación
  const addEducationForm = () => {
    const newForm = {
      id: Date.now().toString(),
      institution: "",
      title: "",
      completion_date: ""
    }
    setEducationForms([...educationForms, newForm])
  }

  const updateEducationForm = (id: string, field: string, value: string) => {
    // Actualizar el formulario
    setEducationForms(forms => {
      const updatedForms = forms.map(form => 
        form.id === id ? { ...form, [field]: value } : form
      )
      
      // Obtener el formulario actualizado para validación
      const updatedForm = updatedForms.find(f => f.id === id)
      
      if (updatedForm) {
        // Validar el campo
        validateEducationField(id, field, value, updatedForm)
      }
      
      return updatedForms
    })
  }

  const removeEducationForm = (id: string) => {
    // Limpiar errores del formulario que se elimina
    clearError(`education_${id}_title`)
    clearError(`education_${id}_institution`)
    clearError(`education_${id}_start_date`)
    clearError(`education_${id}_completion_date`)
    
    // Remover el formulario
    setEducationForms(forms => forms.filter(form => form.id !== id))
  }
  
  // Función para validar un campo de educación
  const validateEducationField = (formId: string, field: string, value: string, formData: any) => {
    const fieldKey = `education_${formId}_${field}`
    
    // Verificar si hay al menos un campo con valor en este formulario
    const hasAnyField = !!(formData.title?.trim() || formData.institution?.trim() || formData.start_date?.trim() || formData.completion_date?.trim())
    
    if (!hasAnyField) {
      // Si todos los campos están vacíos, limpiar errores de este formulario
      clearError(`education_${formId}_title`)
      clearError(`education_${formId}_institution`)
      clearError(`education_${formId}_start_date`)
      clearError(`education_${formId}_completion_date`)
      return
    }
    
    // Validar título: longitud máxima siempre se valida (incluso antes de enviar)
    if (field === 'title') {
      const titleValue = value?.trim() || ''
      if (titleValue.length > 100) {
        setFieldError(fieldKey, 'El nombre del postgrado/capacitación no puede tener más de 100 caracteres')
      } else if (hasAttemptedSubmit && !titleValue) {
        setFieldError(fieldKey, 'El nombre del postgrado/capacitación es obligatorio')
      } else {
        clearError(fieldKey)
      }
    }
    
    // Solo mostrar errores obligatorios si se ha intentado enviar el formulario
    // Pero siempre validar todos los campos cuando se intenta enviar
    if (hasAttemptedSubmit) {
      // Validar título (obligatorio si hay algún campo completado, máximo 100 caracteres)
      const titleValue = formData.title?.trim() || ''
      if (!titleValue) {
        setFieldError(`education_${formId}_title`, 'El nombre del postgrado/capacitación es obligatorio')
      } else if (titleValue.length > 100) {
        setFieldError(`education_${formId}_title`, 'El nombre del postgrado/capacitación no puede tener más de 100 caracteres')
      } else {
        clearError(`education_${formId}_title`)
      }
      
      // Validar institución (obligatoria si hay algún campo completado)
      if (!formData.institution?.trim()) {
        setFieldError(`education_${formId}_institution`, 'La institución es obligatoria')
      } else {
        clearError(`education_${formId}_institution`)
      }
      
      // Validar fecha de inicio (obligatoria si hay algún campo completado)
      if (!formData.start_date?.trim()) {
        setFieldError(`education_${formId}_start_date`, 'La fecha de inicio es obligatoria')
      } else {
        clearError(`education_${formId}_start_date`)
      }
    } else {
      // Si no se ha intentado enviar, solo validar longitud máxima del título
      // Y limpiar errores cuando se completan campos
      if (field === 'title') {
        const titleValue = value?.trim() || ''
        if (titleValue.length > 100) {
          setFieldError(fieldKey, 'El nombre del postgrado/capacitación no puede tener más de 100 caracteres')
        } else {
          clearError(fieldKey)
        }
      } else if (field === 'institution' && value?.trim()) {
        clearError(fieldKey)
      } else if (field === 'start_date' && value?.trim()) {
        clearError(fieldKey)
      } else if (field === 'completion_date' && value?.trim()) {
        clearError(fieldKey)
      }
      
      // También limpiar errores de otros campos si están completados y son válidos
      if (formData.title?.trim() && formData.title.trim().length <= 100) {
        clearError(`education_${formId}_title`)
      }
      
      if (formData.institution?.trim()) {
        clearError(`education_${formId}_institution`)
      }
      
      if (formData.start_date?.trim()) {
        clearError(`education_${formId}_start_date`)
      }
    }
  }

  // Funciones para manejar múltiples formularios de profesión
  const addProfessionForm = () => {
    const newForm = {
      id: Date.now().toString(),
      profession: "",
      profession_institution: "",
      profession_date: ""
    }
    setProfessionForms([...professionForms, newForm])
  }

  const updateProfessionForm = (id: string, field: string, value: string) => {
    // Actualizar el formulario
    setProfessionForms(forms => {
      const updatedForms = forms.map(form => 
        form.id === id ? { ...form, [field]: value } : form
      )
      
      // Obtener el formulario actualizado para validación
      const updatedForm = updatedForms.find(f => f.id === id)
      
      if (updatedForm) {
        // Marcar el campo como touched
        setTouchedProfessionFields(prev => ({
          ...prev,
          [id]: {
            ...(prev[id] || { profession: false, profession_institution: false, profession_date: false }),
            [field]: true
          }
        }))
        
        // Validar el campo
        validateProfessionField(id, field, value, updatedForm)
      }
      
      return updatedForms
    })
  }

  const removeProfessionForm = (id: string) => {
    // Limpiar errores del formulario que se elimina
    clearError(`profession_${id}_profession`)
    clearError(`profession_${id}_institution`)
    clearError(`profession_${id}_date`)
    
    // Remover el estado touched del formulario
    setTouchedProfessionFields(prev => {
      const newTouched = { ...prev }
      delete newTouched[id]
      return newTouched
    })
    
    // Remover el formulario
    setProfessionForms(forms => forms.filter(form => form.id !== id))
  }

  // Función para validar un campo de profesión
  const validateProfessionField = (formId: string, field: string, value: string, formData: any) => {
    const fieldKey = `profession_${formId}_${field}`
    
    // Verificar si hay al menos un campo con valor en este formulario
    const hasAnyField = !!(formData.profession?.trim() || formData.profession_institution?.trim() || formData.profession_date?.trim())
    
    if (!hasAnyField) {
      // Si todos los campos están vacíos, limpiar errores de este formulario
      clearError(`profession_${formId}_profession`)
      clearError(`profession_${formId}_institution`)
      clearError(`profession_${formId}_date`)
      return
    }
    
    // Solo mostrar errores si se ha intentado enviar el formulario
    // Pero siempre limpiar errores cuando se completan los campos
    if (hasAttemptedSubmit) {
      // Validar todos los campos cuando se ha intentado enviar y hay algún campo completado
      if (!formData.profession?.trim()) {
        setFieldError(`profession_${formId}_profession`, 'La profesión es obligatoria si completa algún campo de profesión')
      } else {
        clearError(`profession_${formId}_profession`)
      }
      
      if (!formData.profession_institution?.trim()) {
        setFieldError(`profession_${formId}_institution`, 'La institución es obligatoria si completa algún campo de profesión')
      } else {
        clearError(`profession_${formId}_institution`)
      }
      
      if (!formData.profession_date?.trim()) {
        setFieldError(`profession_${formId}_date`, 'La fecha de obtención es obligatoria si completa algún campo de profesión')
      } else {
        clearError(`profession_${formId}_date`)
      }
    } else {
      // Si no se ha intentado enviar, solo limpiar errores cuando se completan campos
      // No mostrar nuevos errores
      if (field === 'profession' && value?.trim()) {
        clearError(fieldKey)
      }
      
      if (field === 'profession_institution' && value?.trim()) {
        clearError(fieldKey)
      }
      
      if (field === 'profession_date' && value?.trim()) {
        clearError(fieldKey)
      }
      
      // También limpiar errores de otros campos si están completados
      if (formData.profession?.trim()) {
        clearError(`profession_${formId}_profession`)
      }
      
      if (formData.profession_institution?.trim()) {
        clearError(`profession_${formId}_institution`)
      }
      
      if (formData.profession_date?.trim()) {
        clearError(`profession_${formId}_date`)
      }
    }
  }

  // Funciones para manejar formularios múltiples de editar candidato
  const addEditWorkExperienceForm = () => {
    const newForm = {
      id: Date.now().toString(),
      company: '',
      position: '',
      start_date: '',
      end_date: '',
      description: ''
    }
    setEditWorkExperienceForms([...editWorkExperienceForms, newForm])
  }

  const updateEditWorkExperienceForm = (id: string, field: string, value: string) => {
    setEditWorkExperienceForms(forms =>
      forms.map(form =>
        form.id === id ? { ...form, [field]: value } : form
      )
    )
  }

  const removeEditWorkExperienceForm = (id: string) => {
    setEditWorkExperienceForms(forms => forms.filter(form => form.id !== id))
  }

  const addEditEducationForm = () => {
    const newForm = {
      id: Date.now().toString(),
      institution: '',
      title: '',
      start_date: '',
      completion_date: ''
    }
    setEditEducationForms([...editEducationForms, newForm])
  }

  const updateEditEducationForm = (id: string, field: string, value: string) => {
    setEditEducationForms(forms =>
      forms.map(form =>
        form.id === id ? { ...form, [field]: value } : form
      )
    )
  }

  const removeEditEducationForm = (id: string) => {
    setEditEducationForms(forms => forms.filter(form => form.id !== id))
  }

  const handleOpenStatusDialog = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setStatusDialogOpen(true)
  }

  const handleStatusChangeSuccess = () => {
    // Recargar los candidatos para obtener los datos actualizados
    loadData()
  }


  const handleTogglePresentationStatus = (candidateId: string, currentStatus?: string) => {

    const newStatus = currentStatus === "presentado" ? "no_presentado" : "presentado"

    const updatedCandidates = candidates.map((candidate) => {

      if (candidate.id === candidateId) {

        const updatedCandidate: Candidate = {

          ...candidate,

          presentation_status: newStatus as "presentado" | "no_presentado" | "rechazado",

          rejection_reason: newStatus === "presentado" ? undefined : candidate.rejection_reason,

        }



        if (newStatus === "no_presentado") {

          // Keep them in current status but mark as not presented - they don't advance to Module 3

          updatedCandidate.status = candidate.status

        } else if (newStatus === "presentado") {

          // Only presented candidates can advance to Module 3

          updatedCandidate.status = "presentado"

        }



        return updatedCandidate

      }

      return candidate

    })

    setCandidates(updatedCandidates)

  }



  const handleRejectionReason = async (candidateId: string, reason: string) => {
    try {
      // Actualizar el estado local primero
    const updatedCandidates = candidates.map((candidate) =>

      candidate.id === candidateId ? { ...candidate, rejection_reason: reason } : candidate,

    )

    setCandidates(updatedCandidates)


      // Actualizar también en la API
      const candidate = candidates.find(c => c.id === candidateId);
      if (candidate && candidate.presentation_status && (candidate.presentation_status === "no_presentado" || candidate.presentation_status === "rechazado")) {
        const response = await candidatoService.updateStatus(
          parseInt(candidateId), 
          candidate.presentation_status
        );

        if (!response.success) {
          const errorMsg = processApiErrorMessage(response.message, 'Error al actualizar comentario')
          throw new Error(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Error al actualizar comentario:', error);
      const errorMsg = processApiErrorMessage(error.message, "No se pudo actualizar el comentario")
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    }
  }



  // Mostrar indicador de carga

  if (isLoading) {

    return (

      <div className="space-y-6">

        <div>

          <h2 className="text-2xl font-bold mb-2">Módulo 2 - Búsqueda y Registro de Candidatos</h2>

          <p className="text-muted-foreground">Gestiona la búsqueda de candidatos y publicaciones en portales</p>

        </div>

        <Card>

          <CardContent className="flex items-center justify-center py-12">

            <div className="text-center">

              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>

              <p className="text-muted-foreground">Cargando datos...</p>

            </div>

          </CardContent>

        </Card>

      </div>

    )

  }

  return (

    <div className="space-y-6">

      <div>
        <h2 className="text-2xl font-bold mb-2">Módulo 2 - Búsqueda y Registro de Candidatos</h2>
        <p className="text-muted-foreground">Gestiona la búsqueda de candidatos y publicaciones en portales</p>
      </div>

      {/* Componente de bloqueo si el proceso está en estado final */}
      <ProcessBlocked 
        processStatus={processStatus} 
        moduleName="Módulo 2" 
      />

      {/* Card para avanzar al siguiente módulo */}
      {hasPresentedCandidates && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-800">Candidatos presentados</h3>
                <p className="text-sm text-blue-600">
                  Tienes candidatos con estado "Presentado". Puedes avanzar al Módulo 3 para presentación al cliente.
                </p>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleAdvanceToModule3}
                disabled={isBlocked || isAdvancingToModule3 || isInAdvancedModule}
              >
                {isAdvancingToModule3 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Avanzar a Módulo 3
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasPresentedCandidates && !isBlocked && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-orange-800">Acción requerida</h3>
                <p className="text-sm text-orange-600">
                  Debe tener al menos un candidato con estado "Presentado" para avanzar al Módulo 3.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>

        <CardHeader>

          <div>

            <CardTitle className="flex items-center gap-2">

              <Settings className="h-5 w-5" />

              Portales

            </CardTitle>

            <CardDescription>Portales de publicación disponibles</CardDescription>

          </div>

        </CardHeader>

        <CardContent>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

            <div className="text-center p-4 border rounded-lg">

              <Globe className="h-8 w-8 text-primary mx-auto mb-2" />

              <p className="text-2xl font-bold">{customPortals.length}</p>

              <p className="text-sm text-muted-foreground">Portales Disponibles</p>

            </div>

            <div className="text-center p-4 border rounded-lg">

              <Badge className="h-8 w-8 text-green-500 mx-auto mb-2 flex items-center justify-center">

                {publications.filter((p: any) => p.estado_publicacion === "Activa").length}
              </Badge>

              <p className="text-2xl font-bold">{publications.filter((p: any) => p.estado_publicacion === "Activa").length}</p>
              <p className="text-sm text-muted-foreground">Publicaciones Activas</p>

            </div>

            <div className="text-center p-4 border rounded-lg">

              <Badge variant="secondary" className="h-8 w-8 mx-auto mb-2 flex items-center justify-center">

                {publications.filter((p: any) => p.estado_publicacion === "Cerrada").length}
              </Badge>

              <p className="text-2xl font-bold">{publications.filter((p: any) => p.estado_publicacion === "Cerrada").length}</p>
              <p className="text-sm text-muted-foreground">Publicaciones Cerradas</p>

            </div>

          </div>

        </CardContent>

      </Card>



      {/* Publications Section */}

      <Card>

        <CardHeader>

          <div className="flex items-center justify-between">

            <div>

              <CardTitle className="flex items-center gap-2">

                <Globe className="h-5 w-5" />

                Publicaciones en Portales

              </CardTitle>

              <CardDescription>Registra dónde se ha publicado la oferta de trabajo</CardDescription>

            </div>

            <Button onClick={() => setShowAddPublication(true)} disabled={isBlocked}>
                  <Plus className="mr-2 h-4 w-4" />

                  Agregar Publicación

                </Button>


            {/* Diálogo de Nueva Publicación */}
            <AddPublicationDialog
              open={showAddPublication}
              onOpenChange={setShowAddPublication}
              solicitudId={parseInt(process.id) || 0}
              onSuccess={loadData}
            />

            {/* Diálogo de Editar Publicación */}
            <EditPublicationDialog
              open={showEditPublication}
              onOpenChange={(open) => {
                setShowEditPublication(open)
                if (!open) {
                  setEditingPublication(null)
                }
              }}
              publication={editingPublication}
              onSuccess={() => {
                loadData()
                setEditingPublication(null)
              }}
            />
          </div>

        </CardHeader>

        <CardContent>

          {publications.length > 0 ? (

            <Table>

              <TableHeader>

                <TableRow>

                  <TableHead>Portal</TableHead>

                  <TableHead>URL</TableHead>

                  <TableHead>Fecha Publicación</TableHead>

                  <TableHead>Estado</TableHead>

                  <TableHead>Acciones</TableHead>

                </TableRow>

              </TableHeader>

              <TableBody>

                {publications.map((publication: any) => (
                  <TableRow key={publication.id}>

                    <TableCell className="font-medium">{publication.portal?.nombre || 'Portal no especificado'}</TableCell>
                    <TableCell>

                      {publication.url_publicacion ? (
                        <a

                          href={publication.url_publicacion}
                          target="_blank"

                          rel="noopener noreferrer"

                          className="text-blue-600 hover:underline"

                        >

                          Ver publicación

                        </a>

                      ) : (

                        <span className="text-muted-foreground">No especificada</span>

                      )}

                    </TableCell>

                    <TableCell>{formatDate(publication.fecha_publicacion)}</TableCell>
                    <TableCell>

                      <Badge variant={publication.estado_publicacion === "Activa" ? "default" : "secondary"}>
                        {publication.estado_publicacion || 'Sin estado'}
                      </Badge>

                    </TableCell>

                    <TableCell>

                      <div className="flex items-center gap-2">

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setEditingPublication(publication)
                            setShowEditPublication(true)
                          }}
                          disabled={isBlocked}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                      </div>

                    </TableCell>

                  </TableRow>

                ))}

              </TableBody>

            </Table>

          ) : (

            <div className="text-center py-8">

              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />

              <p className="text-muted-foreground">No hay publicaciones registradas</p>

            </div>

          )}

        </CardContent>

      </Card>



      {/* Candidates Section */}

      <Card>

        <CardHeader>

          <div className="flex items-center justify-between">

            <div>

              <CardTitle>Candidatos</CardTitle>

              <CardDescription>Gestiona los candidatos postulados al proceso</CardDescription>

            </div>

            <div className="flex gap-2">

              <Dialog open={showAddCandidate} onOpenChange={(open) => {
                setShowAddCandidate(open)
                if (!open) {
                  // Resetear estados cuando se cierra el diálogo
                  setHasAttemptedSubmit(false)
                  setTouchedProfessionFields({})
                  setProfessionForms([{
                    id: '1',
                    profession: '',
                    profession_institution: '',
                    profession_date: ''
                  }])
                  clearAllErrors()
                }
              }}>

                <DialogTrigger asChild>

                  <Button disabled={isBlocked}>

                    <Plus className="mr-2 h-4 w-4" />

                    Agregar Candidato

                  </Button>

                </DialogTrigger>

                <DialogContent className="max-w-6xl min-w-[800px] w-[90vw] max-h-[90vh] overflow-y-auto">

                  <DialogHeader>

                    <DialogTitle>Nuevo Candidato</DialogTitle>

                    <DialogDescription>

                      Registra un nuevo candidato para el proceso con toda su información

                    </DialogDescription>

                  </DialogHeader>

                  <CandidateForm
                    mode="create"
                    onSubmit={handleAddCandidateSubmit}
                    onCancel={() => setShowAddCandidate(false)}
                    regiones={regiones}
                    todasLasComunas={todasLasComunas}
                    profesiones={profesiones}
                    rubros={rubros}
                    nacionalidades={nacionalidades}
                    instituciones={instituciones}
                    portalesDB={portalesConPublicacionesActivas}
                    loadingLists={loadingLists}
                    calculateAge={calculateAge}
                  />

                </DialogContent>

              </Dialog>

            </div>

          </div>

        </CardHeader>

        <CardContent>

          {/* Alerta cuando no hay candidatos presentados */}
          {candidates.length > 0 && !hasPresentedCandidates && (
            <Alert className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800">
                ⚠️ Para avanzar al Módulo 3, debe tener al menos un candidato con estado &quot;Presentado&quot;. 
                Cambie el estado de los candidatos agregados usando el botón &quot;Cambiar Estado&quot;.
              </AlertDescription>
            </Alert>
          )}

          {candidates.length > 0 ? (

            <Table>

              <TableHeader>

                <TableRow>

                  <TableHead>Nombre</TableHead>

                  <TableHead>Portal Origen</TableHead>

                  <TableHead>Valoración</TableHead>

                  <TableHead>Estado Módulo 2</TableHead>

                  <TableHead>Acciones</TableHead>

                </TableRow>

              </TableHeader>

              <TableBody>

                {candidates.map((candidate) => (

                  <TableRow 

                    key={candidate.id}

                    className={candidate.status === "rechazado" ? "bg-red-50/50 border-l-4 border-l-red-400" : ""}

                  >

                    <TableCell>

                      <div>

                        <p className="font-medium">{candidate.name}</p>

                        <p className="text-sm text-muted-foreground">{candidate.email}</p>

                      </div>

                    </TableCell>

                    <TableCell>{candidate.source_portal || "No especificado"}</TableCell>

                    <TableCell>{renderStars(candidate.consultant_rating, candidate.id, false)}</TableCell>

                    <TableCell>

                      <div className="flex flex-col gap-2">
                        {/* Mostrar estado actual */}
                          <div className="flex items-center gap-2">

                          {candidate.presentation_status === "agregado" && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                              Agregado
                            </Badge>
                          )}
                          {candidate.presentation_status === "presentado" && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                              Presentado
                            </Badge>
                          )}
                          {candidate.presentation_status === "rechazado" && (
                            <Badge variant="destructive" className="text-xs">

                              <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>

                              Rechazado

                            </Badge>

                          )}
                          {candidate.presentation_status === "no_presentado" && (

                            <Badge variant="secondary" className="text-xs">
                              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
                              No Presentado
                            </Badge>
                          )}
                          {!candidate.presentation_status && (
                            <Badge variant="outline" className="text-xs">
                              <span className="w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                              Sin Estado
                            </Badge>
                          )}
                        </div>

                        {/* Botón para cambiar estado */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStatusDialog(candidate)}
                          className="text-xs h-7"
                          disabled={isBlocked}
                        >
                          Cambiar Estado
                        </Button>

                      </div>
                    </TableCell>

                    <TableCell>

                      <div className="flex items-center gap-2">

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCV(candidate)}
                          title="Ver CV"
                          disabled={!candidate.cv_file}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button

                          variant="ghost"

                          size="sm"

                          onClick={() => handleEditCandidate(candidate)}

                          title="Editar candidato"
                          disabled={isBlocked}
                        >

                          <Edit className="h-4 w-4" />

                        </Button>

                      </div>

                    </TableCell>

                  </TableRow>

                ))}

              </TableBody>

            </Table>

          ) : (

            <div className="text-center py-8">

              <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />

              <p className="text-muted-foreground">No hay candidatos registrados</p>

            </div>

          )}

        </CardContent>

      </Card>

      {/* Edit Candidate Dialog */}

      <Dialog open={showEditCandidate} onOpenChange={setShowEditCandidate}>

        <DialogContent className="max-w-6xl min-w-[800px] w-[90vw] max-h-[90vh] overflow-y-auto">

          <DialogHeader>

            <DialogTitle>Editar Candidato</DialogTitle>

            <DialogDescription>Modifica la información del candidato</DialogDescription>

          </DialogHeader>

          {editingCandidate && (

            <CandidateForm
              mode="edit"
              initialData={prepareInitialDataForEdit(editingCandidate)}
              onSubmit={handleEditCandidateSubmit}
              onCancel={() => {
                setShowEditCandidate(false)
                setEditingCandidate(null)
              }}
              regiones={regiones}
              todasLasComunas={todasLasComunas}
              profesiones={profesiones}
              rubros={rubros}
              nacionalidades={nacionalidades}
              instituciones={instituciones}
              portalesDB={portalesConPublicacionesActivas}
              loadingLists={loadingLists}
              calculateAge={calculateAge}
            />

          )}

        </DialogContent>

      </Dialog>


  
      {/* Dialog para ver CV */}
      <CVViewerDialog
        candidate={viewingCV}
        isOpen={showViewCV}
        onClose={() => setShowViewCV(false)}
      />

      {/* Diálogo para cambiar estado del candidato */}
      <CandidateStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        candidate={selectedCandidate}
        onSuccess={handleStatusChangeSuccess}
      />
    </div>

  )

}

