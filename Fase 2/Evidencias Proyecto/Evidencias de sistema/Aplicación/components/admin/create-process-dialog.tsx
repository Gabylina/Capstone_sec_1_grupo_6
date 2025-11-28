"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { validateRut } from "@/lib/utils"
import type { ServiceType } from "@/lib/types"
import { descripcionCargoService, solicitudService, regionService, comunaService, candidatoService, postulacionService, getCandidatesByProcess } from "@/lib/api"
import * as XLSX from 'xlsx'
import { useFormValidation, validationSchemas, validateCandidates } from "@/hooks/useFormValidation"
import { ValidatedInput, ValidatedTextarea, ValidatedSelect, ValidatedSelectItem, ValidationErrorDisplay } from "@/components/ui/ValidatedFormComponents"

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

interface CreateProcessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  solicitudToEdit?: any // Solicitud a editar (opcional, si no se pasa es modo creación)
  onSuccess?: () => void // Callback para ejecutar después de crear/actualizar exitosamente
}

interface FormDataApi {
  clientes: Array<{
    id: string;
    nombre: string;
    contactos: Array<{
      id: string;
      nombre: string;
      email: string;
    }>;
  }>;
  tipos_servicio: Array<{
    codigo: string;
    nombre: string;
  }>;
  consultores: Array<{
    rut: string;
    nombre: string;
  }>;
  cargos: string[];
  comunas: string[];
}

export function CreateProcessDialog({ open, onOpenChange, solicitudToEdit, onSuccess }: CreateProcessDialogProps) {
  const { showToast } = useToastNotification()
  const isEditMode = !!solicitudToEdit
  const [formData, setFormData] = useState({
    client_id: "",
    contact_id: "",
    service_type: "" as ServiceType,
    position_title: "",
    region: "",
    ciudad: "",
    description: "",
    requirements: "",
    vacancies: 1,
    consultant_id: "",
    candidate_name: "",
    candidate_rut: "",
    cv_file: null as File | null,
    excel_file: null as File | null,
  })

  // Estados específicos para evaluación/test psicolaboral
  const [candidatos, setCandidatos] = useState<Array<{
    rut_candidato: string,
    nombre_candidato: string,
    primer_apellido_candidato: string,
    segundo_apellido_candidato: string,
    telefono_candidato: string,
    email_candidato: string,
    discapacidad: boolean,
    cv_file: File | null
  }>>([{
    rut_candidato: "",
    nombre_candidato: "",
    primer_apellido_candidato: "",
    segundo_apellido_candidato: "",
    telefono_candidato: "",
    email_candidato: "",
    discapacidad: false,
    cv_file: null
  }])

  const [showCustomPosition, setShowCustomPosition] = useState(false)
  const [customPosition, setCustomPosition] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiData, setApiData] = useState<FormDataApi | null>(null)
  
  // Estados para regiones y comunas
  const [regiones, setRegiones] = useState<any[]>([])
  const [todasLasComunas, setTodasLasComunas] = useState<any[]>([])
  const [comunasFiltradas, setComunasFiltradas] = useState<any[]>([])
  const [loadingRegionComuna, setLoadingRegionComuna] = useState(true)
  const [loadingSolicitudData, setLoadingSolicitudData] = useState(false)
  

  // Hook de validación
  const { errors: validationErrors, validateField, validateAllFields, clearAllErrors } = useFormValidation()

  // Cargar datos del formulario cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      // Si estamos en modo edición, establecer el estado de carga inmediatamente
      if (isEditMode && solicitudToEdit) {
        setLoadingSolicitudData(true)
      }
      
      const loadData = async () => {
        // Primero cargar los datos básicos (clientes, consultores, etc.)
        await loadFormData()
        // Luego cargar regiones y comunas
        await loadRegionesYComunas()
      }
      loadData()
    } else {
      // Reset al cerrar
      setFormData({
        client_id: "",
        contact_id: "",
        service_type: "" as ServiceType,
        position_title: "",
        region: "",
        ciudad: "",
        description: "",
        requirements: "",
        vacancies: 1,
        consultant_id: "",
        candidate_name: "",
        candidate_rut: "",
        cv_file: null,
        excel_file: null,
      })
      setShowCustomPosition(false)
      setCustomPosition("")
      setComunasFiltradas([])
      setLoadingSolicitudData(false)
      clearAllErrors()
      setCandidateErrors({})
      setCandidateGeneralError(undefined)
      
      // Reset candidatos para evaluación/test psicolaboral
      setCandidatos([{
        rut_candidato: "",
        nombre_candidato: "",
        primer_apellido_candidato: "",
        segundo_apellido_candidato: "",
        telefono_candidato: "",
        email_candidato: "",
        discapacidad: false,
        cv_file: null
      }])
    }
  }, [open, isEditMode, solicitudToEdit])

  // Cargar datos de la solicitud DESPUÉS de que regiones y comunas estén disponibles
  useEffect(() => {
    if (open && isEditMode && solicitudToEdit && regiones.length > 0 && todasLasComunas.length > 0 && !isLoading) {
      loadSolicitudData()
    }
  }, [open, isEditMode, solicitudToEdit, regiones, todasLasComunas, isLoading])

  // Cargar regiones y comunas
  const loadRegionesYComunas = async () => {
    try {
      setLoadingRegionComuna(true)
      const [regionesRes, comunasRes] = await Promise.all([
        regionService.getAll(),
        comunaService.getAll(),
      ])
      setRegiones(regionesRes.data || [])
      setTodasLasComunas(comunasRes.data || [])
    } catch (error) {
      console.error('Error al cargar regiones y comunas:', error)
      showToast({
        type: "error",
        title: "Error",
        description: "Error al cargar regiones y comunas",
      })
    } finally {
      setLoadingRegionComuna(false)
    }
  }

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
      // Limpiar la comuna si se deselecciona la región
      if (formData.ciudad) {
        setFormData({ ...formData, ciudad: "" })
      }
    }
  }, [formData.region, regiones, todasLasComunas])

  const loadFormData = async () => {
    try {
      setIsLoading(true)
      const response = await descripcionCargoService.getFormData()
      
      if (response.success && response.data) {
        setApiData(response.data)
      } else {
        showToast({
          type: "error",
          title: "Error",
          description: "Error al cargar los datos del formulario",
        })
      }
    } catch (error) {
      console.error('Error loading form data:', error)
      showToast({
        type: "error",
        title: "Error",
        description: "Error al cargar los datos del formulario",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar datos de la solicitud para editar
  const loadSolicitudData = async () => {
    try {
      if (!solicitudToEdit?.id) {
        return
      }
      
      setLoadingSolicitudData(true)
      const response = await solicitudService.getById(parseInt(solicitudToEdit.id))
      
      if (response.success && response.data) {
        const solicitud = response.data
        
        // La API ya transforma los datos, usamos los campos directamente
        const ciudadNombre = solicitud.ciudad || ""
        let regionNombre = ""
        
        // Si tenemos el nombre de la ciudad, buscar su región
        if (ciudadNombre) {
          const comunaEncontrada = todasLasComunas.find(c => c.nombre_comuna === ciudadNombre)
          if (comunaEncontrada) {
            const regionEncontrada = regiones.find(r => r.id_region === comunaEncontrada.id_region)
            if (regionEncontrada) {
              regionNombre = regionEncontrada.nombre_region
            }
          }
        }
        
        // Usar los datos transformados del backend
        setFormData({
          client_id: solicitud.client_id || "",
          contact_id: solicitud.contact_id || "",
          service_type: solicitud.service_type || "",
          position_title: solicitud.position_title || "",
          region: regionNombre,
          ciudad: ciudadNombre,
          description: solicitud.description || "",
          requirements: solicitud.requirements || "",
          vacancies: solicitud.vacancies || 1,
          consultant_id: solicitud.consultant_id || "",
          candidate_name: "",
          candidate_rut: "",
          cv_file: null,
          excel_file: null,
        })

        // Si es evaluación/test psicolaboral, cargar candidatos existentes
        const isEvaluationProcess = solicitud.service_type === 'ES' || solicitud.service_type === 'TS' || solicitud.service_type === 'AP'
        if (isEvaluationProcess) {
          try {
            const candidatosExistentes = await getCandidatesByProcess(solicitudToEdit.id)
            
            if (candidatosExistentes && candidatosExistentes.length > 0) {
              // Transformar candidatos al formato del formulario
              const candidatosFormateados = candidatosExistentes.map((candidato: any) => {
                // Usar los campos separados del backend si están disponibles, sino dividir el nombre completo
                const nombre = candidato.nombre || ''
                const primerApellido = candidato.primer_apellido || ''
                const segundoApellido = candidato.segundo_apellido || ''

                return {
                  rut_candidato: candidato.rut || "",
                  nombre_candidato: nombre,
                  primer_apellido_candidato: primerApellido,
                  segundo_apellido_candidato: segundoApellido,
                  telefono_candidato: candidato.phone || "",
                  email_candidato: candidato.email || "",
                  discapacidad: candidato.has_disability_credential || false,
                  cv_file: null // Los CVs no se pueden pre-cargar en el formulario
                }
              })

              setCandidatos(candidatosFormateados)
            } else {
              // Si no hay candidatos, mantener el array con un candidato vacío
              setCandidatos([{
                rut_candidato: "",
                nombre_candidato: "",
                primer_apellido_candidato: "",
                segundo_apellido_candidato: "",
                telefono_candidato: "",
                email_candidato: "",
                discapacidad: false,
                cv_file: null
              }])
            }
          } catch (error) {
            console.error('Error al cargar candidatos:', error)
            // No mostrar error al usuario, solo dejar el array vacío
            setCandidatos([{
              rut_candidato: "",
              nombre_candidato: "",
              primer_apellido_candidato: "",
              segundo_apellido_candidato: "",
              telefono_candidato: "",
              email_candidato: "",
              discapacidad: false,
              cv_file: null
            }])
          }
        }
      }
    } catch (error) {
      console.error('Error loading solicitud data:', error)
      showToast({
        type: "error",
        title: "Error",
        description: "Error al cargar los datos de la solicitud",
      })
    } finally {
      setLoadingSolicitudData(false)
    }
  }

  // Función para procesar el archivo Excel
  const processExcelFile = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[1]
          const sheet = workbook.Sheets[sheetName]

          // Funciones auxiliares
          const leerCelda = (celda: string): string => {
            const cell = sheet[celda]
            return cell ? String(cell.v || '').trim() : ''
          }

          const leerRango = (columna: string, inicio: number, fin: number): string[] => {
            const valores: string[] = []
            for (let i = inicio; i <= fin; i++) {
              const valor = leerCelda(`${columna}${i}`)
              if (valor) valores.push(valor)
            }
            return valores
          }

          const leerRangoDoble = (col1: string, col2: string, inicio: number, fin: number): Array<{nombre: string, descripcion: string}> => {
            const valores: Array<{nombre: string, descripcion: string}> = []
            for (let i = inicio; i <= fin; i++) {
              const valor1 = leerCelda(`${col1}${i}`)
              const valor2 = leerCelda(`${col2}${i}`)
              if (valor1 || valor2) valores.push({ nombre: valor1, descripcion: valor2 })
            }
            return valores
          }

          // Extraer datos del Excel
          const excelData = {
            nombre_cargo: leerCelda("C4"),
            tipo_contrato: leerCelda("C6"),
            tipo_jornada: leerCelda("C7"),
            jornada_trabajo: leerCelda("C8"),
            ubicacion_principal: leerCelda("C9"),
            modalidad_trabajo: leerCelda("C10"),
            supervisor_directo: leerCelda("C11"),
            subordinados: leerCelda("C12"),
            equipo_area: leerCelda("C13"),
            formacion_academica: leerCelda("E6"),
            anos_experiencia: leerCelda("E7"),
            tipo_experiencia: leerCelda("E8"),
            herramientas_idiomas: leerCelda("E9"),
            otro_requisitos: leerCelda("E10"),
            renta_liquida: leerCelda("E12"),
            beneficios: leerCelda("E13"),
            objetivo_principal: leerCelda("C16"),
            funciones_principales: leerRango("C", 17, 20),
            competencias_psicolaborales: leerRangoDoble("C", "D", 23, 27),
            numero_vacantes: leerCelda("C30"),
            motivo_solicitud: leerCelda("C31"),
            confidencialidad: leerCelda("C32"),
            plazo_estimado_ingreso: leerCelda("C33"),
            jefatura: leerCelda("C34"),
            principales_desafios: leerCelda("C35"),
            decisiones_autonomia: leerCelda("C36"),
            grado_autonomia: leerCelda("C37"),
            expectativas_colaboradores: leerCelda("C38"),
            estilo_comunicacion: leerCelda("C39"),
            clima_laboral: leerCelda("C40"),
            sexo: leerCelda("E30"),
            rango_etario: leerCelda("E31"),
            nacionalidad: leerCelda("E32"),
            comuna_residencia: leerCelda("E33"),
            discapacidad: leerCelda("E34"),
            tipo_persona_equipo: leerCelda("E35"),
            valores_conductas: leerCelda("E36"),
            posibilidades_crecimiento: leerCelda("E37"),
            aprendizajes_perfil: leerCelda("E38")
          }

          resolve(excelData)
        } catch (error) {
          reject(error)
        }
      }

      reader.onerror = () => reject(new Error('Error al leer el archivo'))
      reader.readAsArrayBuffer(file)
    })
  }

  // Función para subir CVs después de crear/actualizar la solicitud
  const uploadCVsForCandidates = async (
    candidatosPostulaciones: Array<{ email: string; postulacion_id: number }>,
    candidatosForm: Array<{ email_candidato: string; cv_file: File | null }>
  ) => {
    const uploadPromises: Promise<void>[] = []

    for (const candidatoForm of candidatosForm) {
      if (!candidatoForm.cv_file) continue

      // Buscar la postulación correspondiente por email
      const postulacionInfo = candidatosPostulaciones.find(
        cp => cp.email.toLowerCase() === candidatoForm.email_candidato.toLowerCase()
      )

      if (postulacionInfo) {
        uploadPromises.push(
          postulacionService.uploadCV(postulacionInfo.postulacion_id, candidatoForm.cv_file)
            .then(() => {
              console.log(`CV subido exitosamente para postulación ${postulacionInfo.postulacion_id}`)
            })
            .catch((error) => {
              console.error(`Error al subir CV para postulación ${postulacionInfo.postulacion_id}:`, error)
              const errorMsg = processApiErrorMessage(error.message, 'Error desconocido')
              throw new Error(`Error al subir CV para ${candidatoForm.email_candidato}: ${errorMsg}`)
            })
        )
      } else {
        console.warn(`No se encontró postulación para candidato con email ${candidatoForm.email_candidato}`)
      }
    }

    await Promise.all(uploadPromises)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)

      // Validar todos los campos usando el nuevo sistema
      let hasErrors = false

      // Validar campos básicos del formulario
      const basicValidation = validateAllFields(formData, validationSchemas.processForm)
      if (!basicValidation) {
        hasErrors = true
      }

      // Validación adicional para cliente con contactos
      if (formData.client_id) {
        const selectedClientData = apiData?.clientes.find((c) => c.id === formData.client_id)
        if (!selectedClientData || !selectedClientData.contactos || selectedClientData.contactos.length === 0) {
          validateField('client_id', '', { 
            client_id: { 
              required: true, 
              message: 'Este cliente no tiene contactos registrados' 
            } 
          })
          hasErrors = true
        }
      }

      // Validaciones específicas para evaluación/test psicolaboral
      if (isEvaluationProcess) {
        // Validar que haya al menos un candidato
        if (candidatos.length === 0) {
          setCandidateGeneralError('Debe agregar al menos un candidato para evaluar')
          hasErrors = true
        } else {
          // Validar cada candidato individualmente
          const newCandidateErrors: { [key: number]: { [field: string]: string } } = {}
          let candidateHasErrors = false

          candidatos.forEach((candidato, index) => {
            const candidatoErrors: { [field: string]: string } = {}

            // Validar cada campo del candidato
            Object.keys(validationSchemas.candidateForm).forEach(field => {
              const rule = validationSchemas.candidateForm[field as keyof typeof validationSchemas.candidateForm]
              const value = candidato[field as keyof typeof candidato]
              const errorMessage = validateSingleField(value, rule)

              if (errorMessage) {
                candidatoErrors[field] = errorMessage
                candidateHasErrors = true
              }
            })

            if (Object.keys(candidatoErrors).length > 0) {
              newCandidateErrors[index] = candidatoErrors
            }
          })

          if (candidateHasErrors) {
            setCandidateErrors(newCandidateErrors)
            hasErrors = true
          } else {
            setCandidateErrors({})
            setCandidateGeneralError(undefined)
          }
        }
      }

      // Si hay errores, no continuar
      if (hasErrors) {
        setIsSubmitting(false)
        showToast({
          type: "error",
          title: "Error de validación",
          description: "Por favor completa todos los campos obligatorios y corrige los errores antes de continuar.",
        })
        return
      }

      let response

      if (isEditMode && solicitudToEdit) {
        // Modo edición: decidir si usar endpoint normal o con transacción atómica
        if (isEvaluationProcess && candidatos.length > 0) {
          // Si es evaluación/test y hay candidatos nuevos, usar transacción atómica
          showToast({
            type: "info",
            title: "Procesando",
            description: "Actualizando solicitud con candidatos nuevos...",
          })
          
          response = await solicitudService.actualizarConCandidatos(parseInt(solicitudToEdit.id), {
            contact_id: parseInt(formData.contact_id),
            service_type: formData.service_type,
            position_title: formData.position_title,
            ciudad: formData.ciudad,
            description: formData.position_title === "Sin cargo" ? "Sin cargo especificado" : (formData.description || undefined),
            requirements: formData.requirements || undefined,
            consultant_id: formData.consultant_id,
            deadline_days: 30,
            candidatos: candidatos.map(c => ({
              nombre: c.nombre_candidato,
              primer_apellido: c.primer_apellido_candidato,
              segundo_apellido: c.segundo_apellido_candidato,
              email: c.email_candidato,
              phone: c.telefono_candidato,
              rut: c.rut_candidato || undefined,
              has_disability_credential: c.discapacidad
            }))
          })
        } else {
          // Actualizar solicitud normal (sin candidatos nuevos o no es evaluación)
          response = await solicitudService.update(parseInt(solicitudToEdit.id), {
            contact_id: formData.contact_id,
            service_type: formData.service_type,
            position_title: formData.position_title,
            ciudad: formData.ciudad,
            description: isEvaluationProcess && formData.position_title === "Sin cargo" ? "Sin cargo especificado" : (formData.description || undefined),
            requirements: formData.requirements || undefined,
            vacancies: formData.vacancies,
            consultant_id: formData.consultant_id,
            deadline_days: 30
          })
        }
      } else {
        // Modo creación: decidir si usar endpoint normal o con transacción atómica
        if (isEvaluationProcess) {
          // Usar endpoint con transacción atómica para evaluación/test psicolaboral
          showToast({
            type: "info",
            title: "Procesando",
            description: "Creando solicitud con candidatos...",
          })
          
          response = await solicitudService.crearConCandidatos({
            contact_id: parseInt(formData.contact_id),
            service_type: formData.service_type,
            position_title: formData.position_title,
            ciudad: formData.ciudad,
            description: formData.position_title === "Sin cargo" ? "Sin cargo especificado" : (formData.description || undefined),
            requirements: formData.requirements || undefined,
            consultant_id: formData.consultant_id,
            deadline_days: 30,
            candidatos: candidatos.map(c => ({
              nombre: c.nombre_candidato,
              primer_apellido: c.primer_apellido_candidato,
              segundo_apellido: c.segundo_apellido_candidato,
              email: c.email_candidato,
              phone: c.telefono_candidato,
              rut: c.rut_candidato || undefined,
              has_disability_credential: c.discapacidad
            }))
          })
        } else {
          // Crear solicitud normal (PC, LL, HH)
          response = await solicitudService.create({
            contact_id: formData.contact_id,
            service_type: formData.service_type,
            position_title: formData.position_title,
            ciudad: formData.ciudad,
            description: formData.description || undefined,
            requirements: formData.requirements || undefined,
            vacancies: formData.vacancies,
            consultant_id: formData.consultant_id,
            deadline_days: 30
          })
        }
      }

      if (response.success) {
        // Para evaluación, ya se creó/actualizó todo en la transacción atómica
        if (isEvaluationProcess && !isEditMode) {
          // Creación con candidatos - subir CVs si hay
          if (response.data.candidatos_postulaciones && candidatos.some(c => c.cv_file)) {
            try {
              showToast({
                type: "info",
                title: "Procesando",
                description: "Subiendo CVs...",
              })
              await uploadCVsForCandidates(response.data.candidatos_postulaciones, candidatos)
              showToast({
                type: "success",
                title: "¡Éxito!",
                description: `Solicitud creada exitosamente con ${response.data.candidatos_creados} candidato(s) y CVs subidos`,
              })
            } catch (cvError: any) {
              console.error('Error al subir CVs:', cvError)
              const errorMsg = processApiErrorMessage(cvError.message, 'Error desconocido al subir CVs')
              showToast({
                type: "warning",
                title: "Advertencia",
                description: `Solicitud creada exitosamente, pero hubo errores al subir algunos CVs: ${errorMsg}`,
              })
            }
          } else {
            showToast({
              type: "success",
              title: "¡Éxito!",
              description: `Solicitud creada exitosamente con ${response.data.candidatos_creados} candidato(s)`,
            })
          }
          onOpenChange(false)
          onSuccess?.() // Recargar datos
        } else if (isEvaluationProcess && isEditMode && candidatos.length > 0) {
          // Actualización con candidatos nuevos - subir CVs si hay
          const candidatosNuevos = response.data.candidatos_creados || 0
          if (response.data.candidatos_postulaciones && candidatos.some(c => c.cv_file)) {
            try {
              showToast({
                type: "info",
                title: "Procesando",
                description: "Subiendo CVs...",
              })
              await uploadCVsForCandidates(response.data.candidatos_postulaciones, candidatos)
              if (candidatosNuevos > 0) {
                showToast({
                  type: "success",
                  title: "¡Éxito!",
                  description: `Solicitud actualizada exitosamente con ${candidatosNuevos} candidato(s) nuevo(s) y CVs subidos`,
                })
              } else {
                showToast({
                  type: "success",
                  title: "¡Éxito!",
                  description: "Solicitud actualizada exitosamente con CVs subidos",
                })
              }
            } catch (cvError: any) {
              console.error('Error al subir CVs:', cvError)
              if (candidatosNuevos > 0) {
                showToast({
                  type: "warning",
                  title: "Advertencia",
                  description: `Solicitud actualizada exitosamente con ${candidatosNuevos} candidato(s) nuevo(s), pero hubo errores al subir algunos CVs`,
                })
              } else {
                showToast({
                  type: "warning",
                  title: "Advertencia",
                  description: "Solicitud actualizada exitosamente, pero hubo errores al subir algunos CVs",
                })
              }
            }
          } else {
            if (candidatosNuevos > 0) {
              showToast({
                type: "success",
                title: "¡Éxito!",
                description: `Solicitud actualizada exitosamente con ${candidatosNuevos} candidato(s) nuevo(s)`,
              })
            } else {
              showToast({
                type: "success",
                title: "¡Éxito!",
                description: "Solicitud actualizada exitosamente",
              })
            }
          }
          onOpenChange(false)
          onSuccess?.() // Recargar datos
        } else {
          // Si hay archivo Excel, procesarlo y enviarlo
          if (formData.excel_file) {
            try {
              showToast({
                type: "info",
                title: "Procesando",
                description: "Procesando archivo Excel...",
              })
              const excelData = await processExcelFile(formData.excel_file)
              
              // Obtener el ID de la descripción de cargo creada
              const descripcionCargoId = response.data.id_descripcion_cargo
              
              if (descripcionCargoId) {
                const excelResponse = await descripcionCargoService.addExcelData(descripcionCargoId, excelData)
                
                if (excelResponse.success) {
                  showToast({
                    type: "success",
                    title: "¡Éxito!",
                    description: isEditMode ? 'Solicitud y datos de Excel actualizados exitosamente' : 'Solicitud y datos de Excel guardados exitosamente',
                  })
                  onOpenChange(false)
                  onSuccess?.() // Recargar datos
                } else {
                  const errorMsg = processApiErrorMessage(excelResponse.message, isEditMode ? 'Error al guardar los datos del Excel' : 'Error al guardar los datos del Excel')
                  showToast({
                    type: "error",
                    title: "Error",
                    description: isEditMode ? `Solicitud actualizada, pero ${errorMsg}` : `Solicitud creada, pero ${errorMsg}`,
                  })
                }
              }
            } catch (excelError: any) {
              console.error('Error processing Excel:', excelError)
              const errorMsg = processApiErrorMessage(excelError.message, 'Error al procesar el archivo Excel')
              showToast({
                type: "error",
                title: "Error",
                description: (isEditMode ? 'Solicitud actualizada' : 'Solicitud creada') + ', pero hubo un error al procesar el Excel: ' + errorMsg,
              })
            }
          } else {
            showToast({
              type: "success",
              title: "¡Éxito!",
              description: isEditMode ? 'Solicitud actualizada exitosamente' : 'Solicitud creada exitosamente',
            })
            onOpenChange(false)
            onSuccess?.() // Recargar datos
          }
        }
        
    // Reset form
    setFormData({
      client_id: "",
          contact_id: "",
      service_type: "" as ServiceType,
      position_title: "",
          region: "",
          ciudad: "",
      description: "",
      requirements: "",
      vacancies: 1,
      consultant_id: "",
      candidate_name: "",
      candidate_rut: "",
      cv_file: null,
          excel_file: null,
    })
    setShowCustomPosition(false)
    setCustomPosition("")
        setComunasFiltradas([])
        clearAllErrors()
        setCandidateErrors({})
        setCandidateGeneralError(undefined)
        
        // Reset candidatos para evaluación/test psicolaboral
        setCandidatos([{
          rut_candidato: "",
          nombre_candidato: "",
          primer_apellido_candidato: "",
          segundo_apellido_candidato: "",
          telefono_candidato: "",
          email_candidato: "",
          discapacidad: false,
          cv_file: null
        }])
        
        // No cerrar automáticamente si hay errores
      } else {
        const errorMsg = processApiErrorMessage(response.message, 'Error al crear la solicitud')
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      }
    } catch (error: any) {
      console.error('Error creating request:', error)
      const errorMsg = processApiErrorMessage(error.message, 'Error al crear la solicitud')
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función helper para validar campos específicos
  const validateSpecificField = (field: string, value: any) => {
    validateField(field, value, validationSchemas.processForm)
  }

  const handleClientChange = (value: string) => {
    const client = apiData?.clientes.find((c) => c.id === value)
    
    // Validar que el cliente tenga al menos un contacto
    if (client && (!client.contactos || client.contactos.length === 0)) {
      showToast({
        type: "error",
        title: "Error",
        description: `El cliente "${client.nombre}" no tiene contactos registrados. Por favor, agregue al menos un contacto antes de crear una solicitud.`,
      })
      setFormData({ ...formData, client_id: "", contact_id: "" })
      // Validar con mensaje personalizado
      validateField('client_id', '', { 
        client_id: { 
          required: true, 
          message: 'Este cliente no tiene contactos registrados' 
        } 
      })
      return
    }
    
    setFormData({ ...formData, client_id: value, contact_id: "" })
    validateSpecificField('client_id', value)
  }

  const handlePositionChange = (value: string) => {
    if (value === "custom") {
      setShowCustomPosition(true)
      setFormData({ ...formData, position_title: "" })
      validateSpecificField('position_title', "")
    } else {
      setShowCustomPosition(false)
      setFormData({ ...formData, position_title: value })
      validateSpecificField('position_title', value)
    }
  }

  const handleCustomPositionChange = (value: string) => {
    setCustomPosition(value)
    setFormData({ ...formData, position_title: value })
    validateSpecificField('position_title', value)
  }

  const selectedClient = apiData?.clientes.find((client) => client.id === formData.client_id)
  const clientContacts = selectedClient?.contactos || []

  const isEvaluationProcess =
    formData.service_type === "ES" || formData.service_type === "TS"


  // Funciones para manejar candidatos
  const addCandidato = () => {
    setCandidatos([...candidatos, {
      rut_candidato: "",
      nombre_candidato: "",
      primer_apellido_candidato: "",
      segundo_apellido_candidato: "",
      telefono_candidato: "",
      email_candidato: "",
      discapacidad: false,
      cv_file: null
    }])
  }

  const removeCandidato = (index: number) => {
    if (candidatos.length > 1) {
      setCandidatos(candidatos.filter((_, i) => i !== index))
    }
  }

  const updateCandidato = (index: number, field: string, value: any) => {
    const updatedCandidatos = [...candidatos]
    updatedCandidatos[index] = { ...updatedCandidatos[index], [field]: value }
    setCandidatos(updatedCandidatos)
    
    // Validar el campo específico en tiempo real
    validateCandidateField(index, field, value)
  }

  const validateCandidatoField = (index: number, field: string, value: any) => {
    // Crear un esquema temporal para este campo específico
    const tempSchema = { [field]: validationSchemas.candidateForm[field as keyof typeof validationSchemas.candidateForm] }
    validateField(field, value, tempSchema)
  }

  // Estado local para errores de candidatos (ya que el sistema principal no maneja bien arrays)
  const [candidateErrors, setCandidateErrors] = useState<{ [key: number]: { [field: string]: string } }>({})
  const [candidateGeneralError, setCandidateGeneralError] = useState<string | undefined>(undefined)

  // Helper para obtener errores de candidatos de forma segura
  const getCandidateError = (index: number, field: string): string | undefined => {
    return candidateErrors[index]?.[field]
  }

  // Helper para obtener error general de candidatos
  const getCandidateGeneralError = (): string | undefined => {
    return candidateGeneralError
  }

  // Función mejorada para validar candidatos
  const validateCandidateField = (index: number, field: string, value: any) => {
    const rule = validationSchemas.candidateForm[field as keyof typeof validationSchemas.candidateForm]
    if (!rule) return

    const errorMessage = validateSingleField(value, rule)
    
    setCandidateErrors(prev => {
      const newErrors = { ...prev }
      if (!newErrors[index]) {
        newErrors[index] = {}
      }
      
      if (errorMessage) {
        newErrors[index][field] = errorMessage
      } else {
        delete newErrors[index][field]
        // Si no hay errores en este candidato, eliminar el objeto completo
        if (Object.keys(newErrors[index]).length === 0) {
          delete newErrors[index]
        }
      }
      
      return newErrors
    })
  }

  // Función helper para validar un solo campo
  const validateSingleField = (value: any, rule: any): string | null => {
    // Validación requerida
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return rule.message || 'Este campo es requerido'
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

    // Validación personalizada
    if (rule.custom) {
      return rule.custom(value)
    }

    return null
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[80vw] !max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar Solicitud de Proceso' : 'Crear Nueva Solicitud de Proceso'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifique los campos necesarios para actualizar la solicitud.' : 'Complete la información para iniciar un nuevo proceso de selección.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {isLoading || (isEditMode && loadingSolicitudData) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-3 text-sm text-muted-foreground">
                {isEditMode ? 'Cargando datos de la solicitud...' : 'Cargando...'}
              </p>
            </div>
          ) : (
            <>
          <div className="grid grid-cols-2 gap-4">
            <ValidatedSelect
              id="client"
              label="Cliente"
              value={formData.client_id}
              onValueChange={handleClientChange}
              placeholder="Seleccionar cliente con contacto"
              required
              error={typeof validationErrors.client_id === 'string' ? validationErrors.client_id : undefined}
            >
              {apiData?.clientes.map((client) => (
                <ValidatedSelectItem key={client.id} value={client.id}>
                  {client.nombre}
                </ValidatedSelectItem>
              ))}
            </ValidatedSelect>

                {formData.client_id && clientContacts.length > 0 && (
              <ValidatedSelect
                id="contact"
                label="Contacto"
                value={formData.contact_id}
                onValueChange={(value) => {
                  setFormData({ ...formData, contact_id: value })
                  validateSpecificField('contact_id', value)
                }}
                placeholder="Seleccionar contacto"
                required
                error={typeof validationErrors.contact_id === 'string' ? validationErrors.contact_id : undefined}
              >
                {clientContacts.map((contact) => (
                  <ValidatedSelectItem key={contact.id} value={contact.id}>
                    {contact.nombre} - {contact.email}
                  </ValidatedSelectItem>
                ))}
              </ValidatedSelect>
            )}

            {formData.client_id && clientContacts.length === 0 && (
              <div className="col-span-2">
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ El cliente seleccionado no tiene contactos registrados
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Por favor, vaya a la sección de Clientes y agregue al menos un contacto antes de crear una solicitud.
                  </p>
                </div>
              </div>
            )}

            <ValidatedSelect
              id="service_type"
              label="Tipo de Servicio"
              value={formData.service_type}
              onValueChange={(value) => {
                setFormData({ ...formData, service_type: value as ServiceType })
                validateSpecificField('service_type', value)
              }}
              placeholder="Seleccionar servicio"
              required
              error={typeof validationErrors.service_type === 'string' ? validationErrors.service_type : undefined}
              className={formData.client_id && clientContacts.length > 0 ? "col-span-2" : ""}
            >
              {apiData?.tipos_servicio.map((tipo) => (
                <ValidatedSelectItem key={tipo.codigo} value={tipo.codigo}>
                  {tipo.nombre}
                </ValidatedSelectItem>
              ))}
            </ValidatedSelect>
          </div>

          {formData.contact_id && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-sm font-medium mb-2">Información del Contacto Seleccionado:</h4>
              {(() => {
                const selectedContact = clientContacts.find((c) => c.id === formData.contact_id)
                return selectedContact ? (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                          <strong>Nombre:</strong> {selectedContact.nombre}
                    </p>
                    <p>
                      <strong>Email:</strong> {selectedContact.email}
                    </p>
                  </div>
                ) : null
              })()}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="position_title">Cargo <span className="text-red-500">*</span></Label>
            {isEvaluationProcess ? (
              <Select 
                value={formData.position_title} 
                onValueChange={(value) => {
                  setFormData({ ...formData, position_title: value })
                  validateSpecificField('position_title', value)
                }} 
                required
              >
                <SelectTrigger className={validationErrors.position_title ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccionar cargo">
                    {formData.position_title === "Sin cargo" ? "Sin cargo" : formData.position_title}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sin cargo">Sin cargo</SelectItem>
                  {apiData?.cargos.filter(cargo => cargo !== "Sin cargo").map((cargo) => (
                    <SelectItem key={cargo} value={cargo}>
                      {cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
            {!showCustomPosition ? (
                  <Select value={formData.position_title} onValueChange={handlePositionChange} required>
                <SelectTrigger className={validationErrors.position_title ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccionar cargo" />
                </SelectTrigger>
                <SelectContent>
                      {apiData?.cargos.map((cargo) => (
                        <SelectItem key={cargo} value={cargo}>
                          {cargo}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">+ Agregar nuevo cargo</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={customPosition}
                  onChange={(e) => handleCustomPositionChange(e.target.value)}
                  placeholder="Ingrese el nombre del cargo"
                  required
                  className={validationErrors.position_title ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCustomPosition(false)
                    setFormData({ ...formData, position_title: "" })
                    setCustomPosition("")
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
              </>
            )}
            {typeof validationErrors.position_title === 'string' && (
              <p className="text-sm text-red-500">{validationErrors.position_title}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
              <Label htmlFor="region">Región <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.region} 
                onValueChange={(value) => {
                  setFormData({ ...formData, region: value, ciudad: "" })
                  validateSpecificField('region', value)
                }} 
                required
                disabled={loadingRegionComuna}
              >
                  <SelectTrigger className={validationErrors.region ? "border-red-500" : ""}>
                  <SelectValue placeholder={loadingRegionComuna ? "Cargando regiones..." : "Seleccionar región"} />
                  </SelectTrigger>
                  <SelectContent>
                  {regiones.map((region) => (
                    <SelectItem key={region.id_region} value={region.nombre_region}>
                      {region.nombre_region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {typeof validationErrors.region === 'string' && (
                  <p className="text-sm text-red-500">{validationErrors.region}</p>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad/Comuna <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.ciudad} 
                onValueChange={(value) => {
                  setFormData({ ...formData, ciudad: value })
                  validateSpecificField('ciudad', value)
                }} 
                required
                disabled={loadingRegionComuna || !formData.region}
              >
                <SelectTrigger className={validationErrors.ciudad ? "border-red-500" : ""}>
                  <SelectValue placeholder={formData.region ? "Seleccionar comuna" : "Primero seleccione región"} />
                </SelectTrigger>
                <SelectContent>
                  {comunasFiltradas.map((comuna) => (
                    <SelectItem key={comuna.id_comuna} value={comuna.nombre_comuna}>
                      {comuna.nombre_comuna}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {typeof validationErrors.ciudad === 'string' && (
                <p className="text-sm text-red-500">{validationErrors.ciudad}</p>
              )}
            </div>
          </div>

          {isEvaluationProcess && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Candidatos a Evaluar</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCandidato}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Candidato
                  </Button>
                </div>

                {getCandidateGeneralError() && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">
                      {getCandidateGeneralError()}
                    </p>
                  </div>
                )}

                {candidatos.map((candidato, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Candidato {index + 1}</h4>
                      {candidatos.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCandidato(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                        <Label htmlFor={`rut_${index}`}>RUT (Opcional)</Label>
                        <Input
                          id={`rut_${index}`}
                          value={candidato.rut_candidato}
                          onChange={(e) => updateCandidato(index, 'rut_candidato', e.target.value)}
                          placeholder="12.345.678-9"
                          className={getCandidateError(index, 'rut_candidato') ? "border-red-500" : ""}
                        />
                        {getCandidateError(index, 'rut_candidato') && (
                          <p className="text-sm text-red-500">{getCandidateError(index, 'rut_candidato')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`nombre_${index}`}>Nombre *</Label>
                        <Input
                          id={`nombre_${index}`}
                          value={candidato.nombre_candidato}
                          onChange={(e) => updateCandidato(index, 'nombre_candidato', e.target.value)}
                          placeholder="Nombre"
                          className={getCandidateError(index, 'nombre_candidato') ? "border-red-500" : ""}
                        />
                        {getCandidateError(index, 'nombre_candidato') && (
                          <p className="text-sm text-red-500">{getCandidateError(index, 'nombre_candidato')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`primer_apellido_${index}`}>Primer Apellido *</Label>
                        <Input
                          id={`primer_apellido_${index}`}
                          value={candidato.primer_apellido_candidato}
                          onChange={(e) => updateCandidato(index, 'primer_apellido_candidato', e.target.value)}
                          placeholder="Primer apellido"
                          className={getCandidateError(index, 'primer_apellido_candidato') ? "border-red-500" : ""}
                        />
                        {getCandidateError(index, 'primer_apellido_candidato') && (
                          <p className="text-sm text-red-500">{getCandidateError(index, 'primer_apellido_candidato')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`segundo_apellido_${index}`}>Segundo Apellido *</Label>
                        <Input
                          id={`segundo_apellido_${index}`}
                          value={candidato.segundo_apellido_candidato}
                          onChange={(e) => updateCandidato(index, 'segundo_apellido_candidato', e.target.value)}
                          placeholder="Segundo apellido"
                          className={getCandidateError(index, 'segundo_apellido_candidato') ? "border-red-500" : ""}
                        />
                        {getCandidateError(index, 'segundo_apellido_candidato') && (
                          <p className="text-sm text-red-500">{getCandidateError(index, 'segundo_apellido_candidato')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`telefono_${index}`}>Teléfono * (8-12 caracteres)</Label>
                  <Input
                          id={`telefono_${index}`}
                          value={candidato.telefono_candidato}
                          onChange={(e) => updateCandidato(index, 'telefono_candidato', e.target.value)}
                          placeholder="+56912345678"
                    className={getCandidateError(index, 'telefono_candidato') ? "border-red-500" : ""}
                  />
                  {getCandidateError(index, 'telefono_candidato') && (
                    <p className="text-sm text-red-500">{getCandidateError(index, 'telefono_candidato')}</p>
                  )}
                </div>

                <div className="space-y-2">
                        <Label htmlFor={`email_${index}`}>Email *</Label>
                  <Input
                          id={`email_${index}`}
                          type="text"
                          value={candidato.email_candidato}
                          onChange={(e) => updateCandidato(index, 'email_candidato', e.target.value)}
                          placeholder="candidato@email.com"
                    className={getCandidateError(index, 'email_candidato') ? "border-red-500" : ""}
                  />
                  {getCandidateError(index, 'email_candidato') && (
                    <p className="text-sm text-red-500">{getCandidateError(index, 'email_candidato')}</p>
                  )}
                </div>
              </div>

                    <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Checkbox
                        id={`discapacidad_${index}`}
                        checked={candidato.discapacidad}
                        onCheckedChange={(checked) => updateCandidato(index, 'discapacidad', checked)}
                        className="border-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label htmlFor={`discapacidad_${index}`} className="text-sm font-medium text-blue-800 cursor-pointer">
                        ¿Tiene discapacidad?
                      </Label>
                    </div>

              <div className="space-y-2">
                      <Label htmlFor={`cv_${index}`}>CV (Opcional)</Label>
                
                {/* Área de drag & drop para CV */}
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-400 hover:bg-green-50 transition-colors cursor-pointer"
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
                        updateCandidato(index, 'cv_file', file)
                      }
                    }
                  }}
                  onClick={() => document.getElementById(`cv_${index}`)?.click()}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">
                        {candidato.cv_file ? 'CV seleccionado' : 'Arrastra tu CV aquí'}
                      </p>
                      <p className="text-xs text-gray-500">
                        o haz clic para seleccionar
                      </p>
                    </div>
                    
                    {candidato.cv_file ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium">{candidato.cv_file.name}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        PDF, DOC, DOCX
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Input oculto */}
                <Input
                        id={`cv_${index}`}
                  type="file"
                  accept=".pdf,.doc,.docx"
                        onChange={(e) => updateCandidato(index, 'cv_file', e.target.files?.[0] || null)}
                  className="hidden"
                />
                
                      <p className="text-xs text-muted-foreground">Formatos aceptados: PDF, DOC, DOCX</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

            {!(isEvaluationProcess && formData.position_title === "Sin cargo") && (
            <ValidatedTextarea
              id="description"
              label="Descripción"
              value={formData.description}
              onChange={(value) => {
                setFormData({ ...formData, description: value })
                validateSpecificField('description', value)
              }}
              placeholder="Descripción del cargo o proceso"
              required
              error={typeof validationErrors.description === 'string' ? validationErrors.description : undefined}
              maxLength={500}
              showCharCount
            />
          )}

          <ValidatedTextarea
            id="requirements"
            label="Requisitos"
            value={formData.requirements}
            onChange={(value) => {
              setFormData({ ...formData, requirements: value })
              validateSpecificField('requirements', value)
            }}
            placeholder="Requisitos y condiciones"
            required
            error={typeof validationErrors.requirements === 'string' ? validationErrors.requirements : undefined}
            maxLength={500}
            showCharCount
          />

          <div className="grid grid-cols-2 gap-4">
            {!isEvaluationProcess && (
            <ValidatedInput
              id="vacancies"
              label="Número de Vacantes"
              type="number"
              value={isNaN(formData.vacancies) ? '' : formData.vacancies.toString()}
              onChange={(value) => {
                if (value === '') {
                  setFormData({ ...formData, vacancies: 0 })
                  validateSpecificField('vacancies', '')
                  return
                }
                
                const numValue = parseInt(value, 10)
                if (!isNaN(numValue)) {
                  setFormData({ ...formData, vacancies: numValue })
                  validateSpecificField('vacancies', numValue)
                }
              }}
              required
              error={typeof validationErrors.vacancies === 'string' ? validationErrors.vacancies : undefined}
              min={1}
            />
            )}
            
            {isEvaluationProcess && (
              <div className="space-y-2">
                <Label>Número de personas a evaluar</Label>
                <div className="flex items-center h-10 px-3 py-2 text-sm border rounded-md bg-muted">
                  <span className="font-medium">{candidatos.length}</span>
                  <span className="ml-2 text-muted-foreground">
                    {candidatos.length === 1 ? 'candidato agregado' : 'candidatos agregados'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se calcula automáticamente según los candidatos agregados
                </p>
              </div>
            )}

            <ValidatedSelect
              id="consultant"
              label="Consultor Asignado"
              value={formData.consultant_id}
              onValueChange={(value) => {
                setFormData({ ...formData, consultant_id: value })
                validateSpecificField('consultant_id', value)
              }}
              placeholder="Seleccionar consultor"
              required
              error={typeof validationErrors.consultant_id === 'string' ? validationErrors.consultant_id : undefined}
            >
              {apiData?.consultores.map((consultor) => (
                <ValidatedSelectItem key={consultor.rut} value={consultor.rut}>
                  {consultor.nombre}
                </ValidatedSelectItem>
              ))}
            </ValidatedSelect>
          </div>

            <div className="space-y-2">
                <Label htmlFor="excel_file">Archivo Excel de Descripción de Cargo (Opcional)</Label>
              
              {/* Área de drag & drop */}
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
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
                    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                      setFormData({ ...formData, excel_file: file })
                    }
                  }
                }}
                onClick={() => document.getElementById('excel_file')?.click()}
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">
                      {formData.excel_file ? 'Archivo seleccionado' : 'Arrastra tu archivo Excel aquí'}
                    </p>
                    <p className="text-xs text-gray-500">
                      o haz clic para seleccionar
                    </p>
                  </div>
                  
                  {formData.excel_file ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{formData.excel_file.name}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Formatos aceptados: .xlsx, .xls
                    </p>
                  )}
                </div>
              </div>
              
              {/* Input oculto */}
              <Input
                id="excel_file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFormData({ ...formData, excel_file: e.target.files?.[0] || null })}
                className="hidden"
              />
              
              <p className="text-xs text-muted-foreground">
                Si tienes un archivo Excel con los detalles del cargo, puedes subirlo aquí. 
                Los datos serán procesados automáticamente.
              </p>
            </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Actualizando...' : 'Creando...'}
                </>
              ) : (
                isEditMode ? "Actualizar Solicitud" : "Crear Solicitud"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
