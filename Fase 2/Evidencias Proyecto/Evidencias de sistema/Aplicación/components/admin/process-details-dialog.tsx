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
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { CustomAlertDialog } from "@/components/CustomAlertDialog"
import type { ServiceType } from "@/lib/types"
import { descripcionCargoService, solicitudService, regionService, comunaService, candidatoService, postulacionService } from "@/lib/api"
import * as XLSX from 'xlsx'

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

export function CreateProcessDialog({ open, onOpenChange, solicitudToEdit }: CreateProcessDialogProps) {
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
  
  // Estados para alertas
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertType, setAlertType] = useState<"success" | "error" | "confirm">("success")
  const [alertTitle, setAlertTitle] = useState("")
  const [alertDescription, setAlertDescription] = useState("")

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
      toast.error('Error al cargar regiones y comunas')
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
        toast.error('Error al cargar los datos del formulario')
      }
    } catch (error) {
      console.error('Error loading form data:', error)
      toast.error('Error al cargar los datos del formulario')
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
      }
    } catch (error) {
      console.error('Error loading solicitud data:', error)
      toast.error('Error al cargar los datos de la solicitud')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsSubmitting(true)

      // Validar campos requeridos
      if (!formData.client_id || !formData.contact_id || !formData.service_type || 
          !formData.position_title || !formData.region || !formData.ciudad || !formData.consultant_id) {
        toast.error('Por favor completa todos los campos requeridos')
        return
      }

      // Validar que el cliente tenga contactos
      const selectedClientData = apiData?.clientes.find((c) => c.id === formData.client_id)
      if (!selectedClientData || !selectedClientData.contactos || selectedClientData.contactos.length === 0) {
        toast.error('El cliente seleccionado no tiene contactos registrados. Por favor, agregue un contacto primero.')
        return
      }

      // Validaciones específicas para evaluación/test psicolaboral
      if (isEvaluationProcess) {
        // Validar que haya al menos un candidato
        if (candidatos.length === 0) {
          toast.error('Debe agregar al menos un candidato para evaluar')
          return
        }

        // Validar que todos los candidatos tengan los campos requeridos
        const candidatosInvalidos = candidatos.filter(c => 
          !c.nombre_candidato || !c.primer_apellido_candidato || !c.telefono_candidato || !c.email_candidato
        )
        
        if (candidatosInvalidos.length > 0) {
          toast.error('Todos los candidatos deben tener nombre, primer apellido, teléfono y email')
          return
        }
      }

      let response

      if (isEditMode && solicitudToEdit) {
        // Modo edición: actualizar la solicitud existente
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
      } else {
        // Modo creación: crear nueva solicitud
        // Para evaluación/test psicolaboral, el número de vacantes es igual al número de candidatos
        const vacanciesCount = isEvaluationProcess ? candidatos.length : formData.vacancies;
        
        response = await solicitudService.create({
        contact_id: formData.contact_id,
        service_type: formData.service_type,
        position_title: formData.position_title,
        ciudad: formData.ciudad,
        description: isEvaluationProcess && formData.position_title === "Sin cargo" ? "Sin cargo especificado" : (formData.description || undefined),
        requirements: formData.requirements || undefined,
        vacancies: vacanciesCount,
        consultant_id: formData.consultant_id,
        deadline_days: 30 // Por defecto 30 días
      })
      }

      if (response.success) {
        // Si es evaluación/test psicolaboral, crear candidatos y postulaciones con rollback
        if (isEvaluationProcess && !isEditMode) {
          const solicitudId = response.data?.id
          
          if (!solicitudId) {
            console.error('Response data:', response.data)
            throw new Error('No se pudo obtener el ID de la solicitud creada')
          }
          
          const candidatosCreados: number[] = []
          const postulacionesCreadas: number[] = []
          
          try {
            toast.info('Creando candidatos y postulaciones...')
            console.log('Solicitud ID:', solicitudId)
            
            // Crear cada candidato y su postulación
            for (const candidato of candidatos) {
              console.log('Creando candidato:', candidato)
              
              const candidatoPayload = {
                name: `${candidato.nombre_candidato} ${candidato.primer_apellido_candidato} ${candidato.segundo_apellido_candidato}`.trim(),
                email: candidato.email_candidato,
                phone: candidato.telefono_candidato,
                rut: candidato.rut_candidato || undefined,
                has_disability_credential: candidato.discapacidad
              }
              console.log('Datos a enviar:', candidatoPayload)
              
              // Crear candidato usando el servicio
              const candidatoResponse = await candidatoService.create(candidatoPayload)
              
              if (!candidatoResponse.success || !candidatoResponse.data) {
                console.error('Error response:', candidatoResponse)
                const errorMsg = processApiErrorMessage(candidatoResponse.message, 'Error desconocido')
                throw new Error(`Error al crear candidato ${candidato.nombre_candidato}: ${errorMsg}`)
              }
              
              const candidatoId = parseInt(candidatoResponse.data.id)
              candidatosCreados.push(candidatoId)
              console.log('Candidato creado exitosamente con ID:', candidatoId)
              
              // Crear postulación usando el servicio
              // Para evaluación/test psicolaboral, no se envía id_portal_postulacion
              const postulacionPayload: any = {
                id_candidato: candidatoId,
                id_solicitud: Number(solicitudId),
                id_estado_candidato: 1, // 1 = "Presentado" (estado inicial)
              }
              
              // Adjuntar CV si existe
              if (candidato.cv_file) {
                postulacionPayload.cv_file = candidato.cv_file
              }
              
              console.log('Creando postulación con datos:', {
                ...postulacionPayload,
                cv_file: candidato.cv_file ? 'Archivo adjunto' : 'Sin archivo'
              })
              
              const postulacionResponse = await postulacionService.create(postulacionPayload)
              
              if (!postulacionResponse.success || !postulacionResponse.data) {
                console.error('Error response postulación:', postulacionResponse)
                const errorMsg = processApiErrorMessage(postulacionResponse.message, 'Error desconocido')
                throw new Error(`Error al crear postulación para candidato ${candidato.nombre_candidato}: ${errorMsg}`)
              }
              
              const postulacionId = postulacionResponse.data.id_postulacion
              postulacionesCreadas.push(parseInt(postulacionId))
              console.log('Postulación creada exitosamente con ID:', postulacionId)
            }
            
            // Si todo salió bien, mostrar éxito
            setAlertType("success")
            setAlertTitle("¡Proceso completado exitosamente!")
            setAlertDescription(`Se creó la solicitud con ${candidatos.length} candidato(s) y sus respectivas postulaciones.`)
            setAlertOpen(true)
            
          } catch (error: any) {
            console.error('Error creating candidatos/postulaciones:', error)
            
            // Rollback: eliminar candidatos y postulaciones creadas
            try {
              // Eliminar postulaciones creadas
              for (const postulacionId of postulacionesCreadas) {
                await fetch(`/api/postulaciones/${postulacionId}`, { method: 'DELETE' })
              }
              
              // Eliminar candidatos creados
              for (const candidatoId of candidatosCreados) {
                await fetch(`/api/candidatos/${candidatoId}`, { method: 'DELETE' })
              }
              
              // Eliminar la solicitud creada
              await fetch(`/api/solicitudes/${solicitudId}`, { method: 'DELETE' })
              
              setAlertType("error")
              setAlertTitle("Error en el proceso")
              const errorMsg = processApiErrorMessage(error.message, 'Error desconocido')
              setAlertDescription(`Hubo un error al crear los candidatos/postulaciones. Se realizó rollback completo: ${errorMsg}`)
              setAlertOpen(true)
              
            } catch (rollbackError: any) {
              console.error('Error during rollback:', rollbackError)
              setAlertType("error")
              setAlertTitle("Error crítico")
              const errorMsg = processApiErrorMessage(error.message, 'Error desconocido')
              setAlertDescription(`Error al crear candidatos/postulaciones y falló el rollback. Contacte al administrador. Error: ${errorMsg}`)
              setAlertOpen(true)
            }
          }
        } else {
          // Si hay archivo Excel, procesarlo y enviarlo
          if (formData.excel_file) {
            try {
              toast.info('Procesando archivo Excel...')
              const excelData = await processExcelFile(formData.excel_file)
              
              // Obtener el ID de la descripción de cargo creada
              const descripcionCargoId = response.data.id_descripcion_cargo
              
              if (descripcionCargoId) {
                const excelResponse = await descripcionCargoService.addExcelData(descripcionCargoId, excelData)
                
                if (excelResponse.success) {
                  setAlertType("success")
                  setAlertTitle("¡Proceso completado exitosamente!")
                  setAlertDescription(isEditMode ? 'Solicitud y datos de Excel actualizados exitosamente' : 'Solicitud y datos de Excel guardados exitosamente')
                  setAlertOpen(true)
                } else {
                  setAlertType("error")
                  setAlertTitle("Error parcial")
                  setAlertDescription(isEditMode ? 'Solicitud actualizada, pero hubo un error al guardar los datos del Excel' : 'Solicitud creada, pero hubo un error al guardar los datos del Excel')
                  setAlertOpen(true)
                }
              }
            } catch (excelError: any) {
              console.error('Error processing Excel:', excelError)
              setAlertType("error")
              setAlertTitle("Error al procesar Excel")
              const errorMsg = processApiErrorMessage(excelError.message, 'Error al procesar el archivo Excel')
              setAlertDescription((isEditMode ? 'Solicitud actualizada' : 'Solicitud creada') + ', pero hubo un error al procesar el Excel: ' + errorMsg)
              setAlertOpen(true)
            }
          } else {
            setAlertType("success")
            setAlertTitle("¡Proceso completado exitosamente!")
            setAlertDescription(isEditMode ? 'Solicitud actualizada exitosamente' : 'Solicitud creada exitosamente')
            setAlertOpen(true)
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
        
        // No cerrar automáticamente, las alertas manejarán el cierre
      } else {
        setAlertType("error")
        setAlertTitle("Error en la operación")
        const errorMsg = processApiErrorMessage(response.message, 'Error al crear la solicitud')
        setAlertDescription(errorMsg)
        setAlertOpen(true)
      }
    } catch (error: any) {
      console.error('Error creating request:', error)
      setAlertType("error")
      setAlertTitle("Error en la operación")
      const errorMsg = processApiErrorMessage(error.message, 'Error al crear la solicitud')
      setAlertDescription(errorMsg)
      setAlertOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClientChange = (value: string) => {
    const client = apiData?.clientes.find((c) => c.id === value)
    
    // Validar que el cliente tenga al menos un contacto
    if (client && (!client.contactos || client.contactos.length === 0)) {
      toast.error(`El cliente "${client.nombre}" no tiene contactos registrados. Por favor, agregue al menos un contacto antes de crear una solicitud.`)
      setFormData({ ...formData, client_id: "", contact_id: "" })
      return
    }
    
    setFormData({ ...formData, client_id: value, contact_id: "" })
  }

  const handlePositionChange = (value: string) => {
    if (value === "custom") {
      setShowCustomPosition(true)
      setFormData({ ...formData, position_title: "" })
    } else {
      setShowCustomPosition(false)
      setFormData({ ...formData, position_title: value })
    }
  }

  const handleCustomPositionChange = (value: string) => {
    setCustomPosition(value)
    setFormData({ ...formData, position_title: value })
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
  }

  // Función para manejar el cierre de alertas
  const handleAlertClose = () => {
    setAlertOpen(false)
    // Si fue exitoso, cerrar el diálogo y recargar
    if (alertType === "success") {
      onOpenChange(false)
      window.location.reload()
    }
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
                  <Select value={formData.client_id} onValueChange={handleClientChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                      {apiData?.clientes.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                          {client.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

                {formData.client_id && clientContacts.length > 0 && (
              <div className="space-y-2">
                    <Label htmlFor="contact">Contacto</Label>
                <Select
                  value={formData.contact_id}
                  onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
                      required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar contacto" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                            {contact.nombre} - {contact.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

                <div className={`space-y-2 ${formData.client_id && clientContacts.length > 0 ? "col-span-2" : ""}`}>
              <Label htmlFor="service_type">Tipo de Servicio</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) => setFormData({ ...formData, service_type: value as ServiceType })}
                    required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                      {apiData?.tipos_servicio.map((tipo) => (
                        <SelectItem key={tipo.codigo} value={tipo.codigo}>
                          {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <Label htmlFor="position_title">Cargo</Label>
            {isEvaluationProcess ? (
              <Select value={formData.position_title} onValueChange={(value) => setFormData({ ...formData, position_title: value })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sin cargo">Sin cargo</SelectItem>
                  {apiData?.cargos.map((cargo) => (
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
                <SelectTrigger>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
              <Label htmlFor="region">Región</Label>
              <Select 
                value={formData.region} 
                onValueChange={(value) => setFormData({ ...formData, region: value, ciudad: "" })} 
                required
                disabled={loadingRegionComuna}
              >
                  <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="ciudad">Ciudad/Comuna</Label>
              <Select 
                value={formData.ciudad} 
                onValueChange={(value) => setFormData({ ...formData, ciudad: value })} 
                required
                disabled={loadingRegionComuna || !formData.region}
              >
                <SelectTrigger>
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
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`nombre_${index}`}>Nombre *</Label>
                        <Input
                          id={`nombre_${index}`}
                          value={candidato.nombre_candidato}
                          onChange={(e) => updateCandidato(index, 'nombre_candidato', e.target.value)}
                          placeholder="Nombre"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`primer_apellido_${index}`}>Primer Apellido *</Label>
                        <Input
                          id={`primer_apellido_${index}`}
                          value={candidato.primer_apellido_candidato}
                          onChange={(e) => updateCandidato(index, 'primer_apellido_candidato', e.target.value)}
                          placeholder="Primer apellido"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`segundo_apellido_${index}`}>Segundo Apellido</Label>
                        <Input
                          id={`segundo_apellido_${index}`}
                          value={candidato.segundo_apellido_candidato}
                          onChange={(e) => updateCandidato(index, 'segundo_apellido_candidato', e.target.value)}
                          placeholder="Segundo apellido"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`telefono_${index}`}>Teléfono *</Label>
                  <Input
                          id={`telefono_${index}`}
                          value={candidato.telefono_candidato}
                          onChange={(e) => updateCandidato(index, 'telefono_candidato', e.target.value)}
                          placeholder="+56 9 1234 5678"
                    required
                  />
                </div>

                <div className="space-y-2">
                        <Label htmlFor={`email_${index}`}>Email *</Label>
                  <Input
                          id={`email_${index}`}
                          type="email"
                          value={candidato.email_candidato}
                          onChange={(e) => updateCandidato(index, 'email_candidato', e.target.value)}
                          placeholder="candidato@email.com"
                    required
                  />
                </div>
              </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`discapacidad_${index}`}
                        checked={candidato.discapacidad}
                        onCheckedChange={(checked) => updateCandidato(index, 'discapacidad', checked)}
                      />
                      <Label htmlFor={`discapacidad_${index}`} className="text-sm">
                        ¿Tiene discapacidad?
                      </Label>
                    </div>

              <div className="space-y-2">
                      <Label htmlFor={`cv_${index}`}>CV (Opcional)</Label>
                <Input
                        id={`cv_${index}`}
                  type="file"
                  accept=".pdf,.doc,.docx"
                        onChange={(e) => updateCandidato(index, 'cv_file', e.target.files?.[0] || null)}
                />
                      <p className="text-xs text-muted-foreground">Formatos aceptados: PDF, DOC, DOCX</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

            {!(isEvaluationProcess && formData.position_title === "Sin cargo") && (
            <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del cargo o proceso"
                rows={3}
              />
            </div>
          )}

          <div className="space-y-2">
                <Label htmlFor="requirements">Requisitos</Label>
            <Textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="Requisitos y condiciones"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!isEvaluationProcess && (
            <div className="space-y-2">
              <Label htmlFor="vacancies">Número de Vacantes</Label>
              <Input
                id="vacancies"
                type="number"
                min="1"
                value={formData.vacancies}
                  onChange={(e) => setFormData({ ...formData, vacancies: parseInt(e.target.value) })}
                required
              />
            </div>
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

            <div className="space-y-2">
              <Label htmlFor="consultant">Consultor Asignado</Label>
              <Select
                value={formData.consultant_id}
                onValueChange={(value) => setFormData({ ...formData, consultant_id: value })}
                    required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar consultor" />
                </SelectTrigger>
                <SelectContent>
                      {apiData?.consultores.map((consultor) => (
                        <SelectItem key={consultor.rut} value={consultor.rut}>
                          {consultor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

            <div className="space-y-2">
                <Label htmlFor="excel_file">Archivo Excel de Descripción de Cargo (Opcional)</Label>
              <Input
                id="excel_file"
                type="file"
                accept=".xlsx,.xls"
                  onChange={(e) => setFormData({ ...formData, excel_file: e.target.files?.[0] || null })}
                />
                <p className="text-xs text-muted-foreground">
                  Si tienes un archivo Excel con los detalles del cargo, puedes subirlo aquí. 
                  Los datos serán procesados automáticamente. Formatos aceptados: .xlsx, .xls
                </p>
                {formData.excel_file && (
                  <p className="text-sm text-green-600">
                    ✓ Archivo seleccionado: {formData.excel_file.name}
                  </p>
                )}
            </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={
                isLoading || 
                isSubmitting || 
                (!!formData.client_id && clientContacts.length === 0) ||
                (isEvaluationProcess && candidatos.some(c => !c.nombre_candidato || !c.primer_apellido_candidato || !c.telefono_candidato || !c.email_candidato))
              }
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
      
      {/* CustomAlertDialog para mostrar resultados */}
      <CustomAlertDialog
        open={alertOpen}
        onOpenChange={handleAlertClose}
        type={alertType}
        title={alertTitle}
        description={alertDescription}
        confirmText="Aceptar"
        onConfirm={handleAlertClose}
      />
    </Dialog>
  )
}