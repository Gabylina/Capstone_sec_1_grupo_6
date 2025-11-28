"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Building, Users, Phone, Mail, MapPin, User, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { CustomAlertDialog } from "@/components/CustomAlertDialog"
import { clientService, comunaService, regionService, apiUtils } from "@/lib/api"
import type { Client, ClientContact, Comuna, Region } from "@/lib/types"
import { useFormValidation, validationSchemas, validateClientContacts } from "@/hooks/useFormValidation"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import { useClientes } from "@/hooks/useClientes"

export default function ClientesPage() {
  const { showToast } = useToastNotification()
  
  // Función helper para procesar mensajes de error de la API y convertirlos en mensajes amigables
  const processApiErrorMessage = (errorMessage: string | undefined | null, defaultMessage: string): string => {
    if (!errorMessage) return defaultMessage
    const message = errorMessage.toLowerCase()
    
    // Mensajes específicos de clientes (basados en las respuestas reales de la API)
    if (message.includes('cliente no encontrado') || message.includes('client not found')) {
      return 'El cliente no fue encontrado'
    }
    if (message.includes('contacto no encontrado') || message.includes('contact not found')) {
      return 'El contacto no fue encontrado'
    }
    if (message.includes('ya existe un cliente con ese nombre') || message.includes('cliente ya existe') || message.includes('client already exists')) {
      return 'Ya existe un cliente con ese nombre'
    }
    if (message.includes('el correo electrónico') && message.includes('ya está registrado')) {
      // Mantener el mensaje completo que incluye el email específico
      return errorMessage
    }
    if (message.includes('el teléfono') && message.includes('ya está registrado')) {
      // Mantener el mensaje completo que incluye el teléfono específico
      return errorMessage
    }
    if (message.includes('ya existe un registro con esos datos')) {
      return 'Ya existe un registro con esos datos'
    }
    if (message.includes('el nombre del cliente es requerido')) {
      return 'El nombre del cliente es requerido'
    }
    if (message.includes('debe proporcionar al menos un contacto')) {
      return 'Debe proporcionar al menos un contacto'
    }
    if (message.includes('no se puede eliminar el cliente porque tiene solicitudes asociadas') || message.includes('no se puede eliminar') || message.includes('cannot delete')) {
      return 'No se puede eliminar el cliente porque tiene solicitudes asociadas'
    }
    if (message.includes('error al procesar la solicitud')) {
      return 'Error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente'
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
    if (message.includes('constraint') || message.includes('restricción') || message.includes('foreign key')) {
      return 'No se puede realizar esta acción debido a restricciones de datos'
    }
    if (message.includes('invalid') || message.includes('inválido') || message.includes('invalido')) {
      return 'Los datos proporcionados no son válidos'
    }
    if (message.includes('ha ocurrido un error inesperado')) {
      return errorMessage // Ya es un mensaje amigable
    }
    
    // Si el mensaje ya está en español y es claro, devolverlo tal cual (ya viene capitalizado de la API)
    return errorMessage
  }
  
  const {
    clients,
    isLoading,
    searchTerm,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    totalPages,
    totalClients,
    newClient,
    editingClient,
    setSearchTerm,
    setSortBy,
    setSortOrder,
    setNewClient,
    setEditingClient,
    createClient,
    updateClient,
    deleteClient,
    goToPage,
    nextPage,
    prevPage,
    handlePageSizeChange,
  } = useClientes()

  // Hook de validación
  const { errors, validateField, validateAllFields, clearError, clearAllErrors } = useFormValidation()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comunas, setComunas] = useState<Comuna[]>([])
  const [regiones, setRegiones] = useState<Region[]>([])
  const [contactErrors, setContactErrors] = useState<{[key: string]: string}>({})
  
  // Estado para confirmación de eliminación
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<string | null>(null)

  // Los clientes ya vienen filtrados del servidor, no necesitamos filtrar en el cliente

  // Cargar comunas y regiones al montar el componente
  useEffect(() => {
    loadAllComunas()
    loadAllRegiones()
  }, [])

  const loadAllComunas = async () => {
    try {
      const response = await comunaService.getAll()
      if (response.success && response.data) {
        setComunas(response.data)
      }
    } catch (error) {
      console.error('Error loading comunas:', error)
    }
  }

  const loadAllRegiones = async () => {
    try {
      const response = await regionService.getAll()
      if (response.success && response.data) {
        setRegiones(response.data)
      }
    } catch (error) {
      console.error('Error loading regiones:', error)
    }
  }

  const getClientProcessCount = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    return client?.processCount || 0
  }

  const addContact = () => {
    setNewClient({
      ...newClient,
      contacts: [
        ...newClient.contacts,
        {
          id: `contact-${Date.now()}`,
          name: "",
          email: "",
          phone: "",
          position: "",
          city: "",
          region: "",
          is_primary: false,
        },
      ],
    })
  }

  const removeContact = (index: number) => {
    if (newClient.contacts.length > 1) {
      const newContacts = newClient.contacts.filter((_, i) => i !== index)
      // If we removed the primary contact, make the first one primary
      if (newClient.contacts[index].is_primary && newContacts.length > 0) {
        newContacts[0].is_primary = true
      }
      setNewClient({ ...newClient, contacts: newContacts })
    }
  }

  const updateContact = (index: number, field: keyof ClientContact | 'region', value: string | boolean) => {
    const newContacts = [...newClient.contacts]
    if (field === "is_primary" && value === true) {
      // Only one contact can be primary
      newContacts.forEach((contact, i) => {
        contact.is_primary = i === index
      })
    } else {
      ;(newContacts[index] as any)[field] = value
    }
    setNewClient({ ...newClient, contacts: newContacts })
    
    // Validar el campo en tiempo real
    if (field !== "is_primary" && field !== 'region') {
      const rule = validationSchemas.clientContactForm[field as keyof typeof validationSchemas.clientContactForm]
      if (rule) {
        const errorKey = `contact-${index}-${field}`
        const errorMessage = validateSingleFieldHelper(value, rule)
        
        setContactErrors(prev => {
          const newErrors = { ...prev }
          if (errorMessage) {
            newErrors[errorKey] = errorMessage
          } else {
            delete newErrors[errorKey]
          }
          return newErrors
        })
      }
    } else if (field === 'region') {
      const rule = validationSchemas.clientContactForm.region
      const errorKey = `contact-${index}-region`
      const errorMessage = validateSingleFieldHelper(value, rule)
      
      setContactErrors(prev => {
        const newErrors = { ...prev }
        if (errorMessage) {
          newErrors[errorKey] = errorMessage
        } else {
          delete newErrors[errorKey]
        }
        return newErrors
      })
    }
  }

  // Helper function para validar un campo individual
  const validateSingleFieldHelper = (value: any, rule: any): string | null => {
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


  const validateForm = () => {
    let isValid = true
    
    // Validar nombre de empresa usando validateField para que el error se muestre
    validateField('name', newClient.name, validationSchemas.clientForm)
    const nameRule = validationSchemas.clientForm.name
    const nameError = validateSingleFieldHelper(newClient.name, nameRule)
    
    if (nameError) {
      isValid = false
    }
    
    // Validar contactos
    const contactsValidation = validateClientContacts(newClient.contacts)
    
    if (contactsValidation.hasErrors) {
      isValid = false
      
      if (contactsValidation.errors.general) {
        showToast({
          type: "error",
          title: "Error de validación",
          description: contactsValidation.errors.general as string,
        })
      } else {
        // Mostrar errores de contactos específicos y marcar campos
        const newContactErrors: {[key: string]: string} = {}
        
        Object.keys(contactsValidation.errors).forEach(contactIndex => {
          const contactErrors = contactsValidation.errors[contactIndex] as any
          const contactNumber = parseInt(contactIndex) + 1
          
          // Mostrar mensaje principal del contacto
          showToast({
            type: "error",
            title: "Error de validación",
            description: `Contacto ${contactNumber}: Complete todos los campos obligatorios`,
          })
          
          // Marcar campos con errores específicos
          Object.keys(contactErrors).forEach(field => {
            const errorKey = `contact-${contactIndex}-${field}`
            newContactErrors[errorKey] = contactErrors[field]
          })
        })
        
        setContactErrors(newContactErrors)
      }
    }

    return isValid
  }

  const handleCreateClient = async () => {
    if (!validateForm()) return

    try {
      setIsSubmitting(true)
      const result = await createClient()
      
      if (result.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: result.message || 'Cliente creado exitosamente',
        })
        setIsCreateDialogOpen(false)
      } else {
        const errorMsg = processApiErrorMessage(result.message, 'Error al crear el cliente')
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      }
    } catch (error: any) {
      console.error('Error creating client:', error)
      const errorMsg = processApiErrorMessage(error.message, 'Error al crear el cliente')
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setNewClient({
      name: "",
      contacts: [
        {
          id: "",
          name: "",
          email: "",
          phone: "",
          position: "",
          city: "",
          region: "",
          is_primary: true,
        },
      ],
    })
    clearAllErrors()
    setContactErrors({})
  }

  const handleEditClient = async () => {
    if (!editingClient || !validateForm()) return

    try {
      setIsSubmitting(true)
      const result = await updateClient()
      
      if (result.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: result.message || 'Cliente actualizado exitosamente',
        })
        setIsEditDialogOpen(false)
      } else {
        const errorMsg = processApiErrorMessage(result.message, 'Error al actualizar el cliente')
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      }
    } catch (error: any) {
      console.error('Error updating client:', error)
      const errorMsg = processApiErrorMessage(error.message, 'Error al actualizar el cliente')
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClient = (clientId: string) => {
    setClientToDelete(clientId)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return

    try {
      const result = await deleteClient(clientToDelete)
      
      if (result.success) {
        showToast({
          type: "success",
          title: "¡Éxito!",
          description: result.message || 'Cliente eliminado exitosamente',
        })
      } else {
        const errorMsg = processApiErrorMessage(result.message, 'Error al eliminar el cliente')
        showToast({
          type: "error",
          title: "Error",
          description: errorMsg,
        })
      }
    } catch (error: any) {
      console.error('Error deleting client:', error)
      const errorMsg = processApiErrorMessage(error.message, 'Error al eliminar el cliente')
      showToast({
        type: "error",
        title: "Error",
        description: errorMsg,
      })
    } finally {
      setClientToDelete(null)
    }
  }

  const openEditDialog = (client: Client) => {
    setEditingClient(client as any)
    
    // Mapear contactos y calcular la región basándose en la ciudad/comuna
    const contactsWithRegion = (client.contacts || []).map(contact => {
      let regionName = contact.region || ""
      
      // Si no tiene región pero tiene ciudad, buscar la región
      if (!regionName && contact.city) {
        // Buscar comuna (comparación case-insensitive por si acaso)
        const comunaEncontrada = comunas.find(c => 
          c.nombre_comuna.toLowerCase() === contact.city.toLowerCase()
        )
        
        if (comunaEncontrada) {
          const regionEncontrada = regiones.find(r => r.id_region === comunaEncontrada.id_region)
          if (regionEncontrada) {
            regionName = regionEncontrada.nombre_region
          }
        }
      }
      
      return {
        ...contact,
        region: regionName,
        is_primary: contact.is_primary ?? false
      }
    })
    
    setNewClient({
      name: client.name,
      contacts: contactsWithRegion,
    })
    
    // Limpiar errores previos
    clearAllErrors()
    setContactErrors({})
    setIsEditDialogOpen(true)
  }

  const getPrimaryContact = (client: Client) => {
    if (!client.contacts || client.contacts.length === 0) {
      return null
    }
    return client.contacts.find((contact) => contact.is_primary) || client.contacts[0]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h1>
          <p className="text-muted-foreground">Administra la información de contacto de tus clientes</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (open) {
            // Limpiar formulario cuando se abre el diálogo de crear
            resetForm()
          } else {
            // Limpiar errores al cerrar
            clearAllErrors()
            setContactErrors({})
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto w-full" style={{ width: '50vw', maxWidth: '1200px' }}>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Cliente</DialogTitle>
              <DialogDescription>Ingresa la información del nuevo cliente y sus contactos</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre de la Empresa *</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => {
                    setNewClient({ ...newClient, name: e.target.value })
                    validateField('name', e.target.value, validationSchemas.clientForm)
                  }}
                  placeholder="Ej: Empresa ABC S.A."
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name as string}</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Contactos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addContact}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Contacto
                  </Button>
                </div>

                {newClient.contacts.map((contact, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Contacto {index + 1}</span>
                        {contact.is_primary && (
                          <Badge variant="secondary" className="text-xs">
                            Principal
                          </Badge>
                        )}
                      </div>
                      {newClient.contacts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeContact(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor={`contact-name-${index}`}>Nombre *</Label>
                        <Input
                          id={`contact-name-${index}`}
                          value={contact.name}
                          onChange={(e) => updateContact(index, "name", e.target.value)}
                          placeholder="Ej: Juan Pérez"
                          className={contactErrors[`contact-${index}-name`] ? 'border-red-500' : ''}
                        />
                        {contactErrors[`contact-${index}-name`] && (
                          <p className="text-sm text-red-500">{contactErrors[`contact-${index}-name`]}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`contact-position-${index}`}>Cargo *</Label>
                        <Input
                          id={`contact-position-${index}`}
                          value={contact.position}
                          onChange={(e) => updateContact(index, "position", e.target.value)}
                          placeholder="Ej: Gerente de RRHH"
                          className={contactErrors[`contact-${index}-position`] ? 'border-red-500' : ''}
                        />
                        {contactErrors[`contact-${index}-position`] && (
                          <p className="text-sm text-red-500">{contactErrors[`contact-${index}-position`]}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`contact-email-${index}`}>Correo Electrónico *</Label>
                        <Input
                          id={`contact-email-${index}`}
                          type="email"
                          value={contact.email}
                          onChange={(e) => updateContact(index, "email", e.target.value)}
                          placeholder="contacto@empresa.com"
                          className={contactErrors[`contact-${index}-email`] ? 'border-red-500' : ''}
                        />
                        {contactErrors[`contact-${index}-email`] && (
                          <p className="text-sm text-red-500">{contactErrors[`contact-${index}-email`]}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`contact-phone-${index}`}>Teléfono * (8-12 caracteres)</Label>
                        <Input
                          id={`contact-phone-${index}`}
                          value={contact.phone}
                          onChange={(e) => updateContact(index, "phone", e.target.value)}
                          placeholder="+56912345678"
                          className={contactErrors[`contact-${index}-phone`] ? 'border-red-500' : ''}
                        />
                        {contactErrors[`contact-${index}-phone`] && (
                          <p className="text-sm text-red-500">{contactErrors[`contact-${index}-phone`]}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`contact-region-${index}`}>Región *</Label>
                        <Select
                          value={contact.region || ""}
                          onValueChange={(value) => {
                            // Actualizar región
                            const newContacts = [...newClient.contacts]
                            newContacts[index].region = value
                            // Limpiar comuna cuando se cambia la región
                            newContacts[index].city = ""
                            setNewClient({ ...newClient, contacts: newContacts })
                            
                            // Validar región en tiempo real
                            const rule = validationSchemas.clientContactForm.region
                            const errorKey = `contact-${index}-region`
                            const errorMessage = validateSingleFieldHelper(value, rule)
                            
                            // Validar ciudad (estará vacía, así que mostrará error)
                            const cityRule = validationSchemas.clientContactForm.city
                            const cityErrorKey = `contact-${index}-city`
                            const cityErrorMessage = validateSingleFieldHelper("", cityRule)
                            
                            setContactErrors(prev => {
                              const newErrors = { ...prev }
                              if (errorMessage) {
                                newErrors[errorKey] = errorMessage
                              } else {
                                delete newErrors[errorKey]
                              }
                              if (cityErrorMessage) {
                                newErrors[cityErrorKey] = cityErrorMessage
                              } else {
                                delete newErrors[cityErrorKey]
                              }
                              return newErrors
                            })
                          }}
                        >
                          <SelectTrigger className={contactErrors[`contact-${index}-region`] ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Selecciona una región" />
                          </SelectTrigger>
                          <SelectContent>
                            {regiones.map((region) => (
                              <SelectItem key={region.id_region} value={region.nombre_region}>
                                {region.nombre_region}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {contactErrors[`contact-${index}-region`] && (
                          <p className="text-sm text-red-500">{contactErrors[`contact-${index}-region`]}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`contact-city-${index}`}>Comuna *</Label>
                        <Select
                          value={contact.city || ""}
                          onValueChange={(value) => updateContact(index, "city", value)}
                          disabled={!contact.region}
                        >
                          <SelectTrigger className={contactErrors[`contact-${index}-city`] ? 'border-red-500' : ''}>
                            <SelectValue placeholder={contact.region ? "Selecciona una comuna" : "Primero selecciona una región"} />
                          </SelectTrigger>
                          <SelectContent>
                            {comunas
                              .filter(comuna => {
                                const region = regiones.find(r => r.nombre_region === contact.region)
                                return region ? comuna.id_region === region.id_region : false
                              })
                              .map((comuna) => (
                                <SelectItem key={comuna.id_comuna} value={comuna.nombre_comuna}>
                                  {comuna.nombre_comuna}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {contactErrors[`contact-${index}-city`] && (
                          <p className="text-sm text-red-500">{contactErrors[`contact-${index}-city`]}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <input
                          type="checkbox"
                          id={`contact-primary-${index}`}
                          checked={contact.is_primary}
                          onChange={(e) => updateContact(index, "is_primary", e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`contact-primary-${index}`} className="text-sm">
                          Contacto principal
                        </Label>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleCreateClient} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Cliente'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.filter((client) => getClientProcessCount(client.id) > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contactos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.reduce((total, client) => total + client.contacts.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empresa, contacto, cargo, comuna o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            {totalClients} cliente{totalClients !== 1 ? "s" : ""} encontrado
            {totalClients !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Cargando clientes...</span>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Contacto Principal</TableHead>
                <TableHead>Total Contactos</TableHead>
                <TableHead>Procesos</TableHead>
                <TableHead className="w-[70px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se encontraron clientes
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => {
                const primaryContact = getPrimaryContact(client)
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                          {primaryContact ? (
                      <div className="space-y-1">
                        <div className="font-medium">{primaryContact.name}</div>
                        <div className="text-sm text-muted-foreground">{primaryContact.position}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {primaryContact.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {primaryContact.phone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {primaryContact.city}
                        </div>
                      </div>
                          ) : (
                            <div className="text-sm text-muted-foreground italic">
                              Sin contactos
                            </div>
                          )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                            {client.contacts?.length || 0} contacto{(client.contacts?.length || 0) !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getClientProcessCount(client.id)} proceso{getClientProcessCount(client.id) !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openEditDialog(client)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                          </Button>
                          </div>
                    </TableCell>
                  </TableRow>
                )
                  })
                )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Controles de Paginación */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="pageSize">Filas por página:</Label>
                <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalClients)} de {totalClients} clientes
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
          // Limpiar errores al cerrar
          clearAllErrors()
          setContactErrors({})
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto w-full" style={{ width: '50vw', maxWidth: '1200px' }}>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Modifica la información del cliente y sus contactos
              {editingClient && ` - Cliente: ${editingClient.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nombre de la Empresa *</Label>
              <Input
                id="edit-name"
                value={newClient.name}
                onChange={(e) => {
                  setNewClient({ ...newClient, name: e.target.value })
                  validateField('name', e.target.value, validationSchemas.clientForm)
                }}
                placeholder="Ej: Empresa ABC S.A."
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name as string}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Contactos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addContact}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Contacto
                </Button>
              </div>

              {newClient.contacts.map((contact, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">Contacto {index + 1}</span>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          Principal
                        </Badge>
                      )}
                    </div>
                    {newClient.contacts.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`edit-contact-name-${index}`}>Nombre *</Label>
                      <Input
                        id={`edit-contact-name-${index}`}
                        value={contact.name}
                        onChange={(e) => updateContact(index, "name", e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className={contactErrors[`contact-${index}-name`] ? 'border-red-500' : ''}
                      />
                      {contactErrors[`contact-${index}-name`] && (
                        <p className="text-sm text-red-500">{contactErrors[`contact-${index}-name`]}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`edit-contact-position-${index}`}>Cargo *</Label>
                      <Input
                        id={`edit-contact-position-${index}`}
                        value={contact.position}
                        onChange={(e) => updateContact(index, "position", e.target.value)}
                        placeholder="Ej: Gerente de RRHH"
                        className={contactErrors[`contact-${index}-position`] ? 'border-red-500' : ''}
                      />
                      {contactErrors[`contact-${index}-position`] && (
                        <p className="text-sm text-red-500">{contactErrors[`contact-${index}-position`]}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`edit-contact-email-${index}`}>Correo Electrónico *</Label>
                      <Input
                        id={`edit-contact-email-${index}`}
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContact(index, "email", e.target.value)}
                        placeholder="contacto@empresa.com"
                        className={contactErrors[`contact-${index}-email`] ? 'border-red-500' : ''}
                      />
                      {contactErrors[`contact-${index}-email`] && (
                        <p className="text-sm text-red-500">{contactErrors[`contact-${index}-email`]}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`edit-contact-phone-${index}`}>Teléfono * (8-12 caracteres)</Label>
                      <Input
                        id={`edit-contact-phone-${index}`}
                        value={contact.phone}
                        onChange={(e) => updateContact(index, "phone", e.target.value)}
                        placeholder="+56912345678"
                        className={contactErrors[`contact-${index}-phone`] ? 'border-red-500' : ''}
                      />
                      {contactErrors[`contact-${index}-phone`] && (
                        <p className="text-sm text-red-500">{contactErrors[`contact-${index}-phone`]}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`edit-contact-region-${index}`}>Región *</Label>
                      <Select
                        value={contact.region || ""}
                        onValueChange={(value) => {
                          // Actualizar región
                          const newContacts = [...newClient.contacts]
                          newContacts[index].region = value
                          // Limpiar comuna cuando se cambia la región
                          newContacts[index].city = ""
                          setNewClient({ ...newClient, contacts: newContacts })
                          
                          // Validar región en tiempo real
                          const rule = validationSchemas.clientContactForm.region
                          const errorKey = `contact-${index}-region`
                          const errorMessage = validateSingleFieldHelper(value, rule)
                          
                          // Validar ciudad (estará vacía, así que mostrará error)
                          const cityRule = validationSchemas.clientContactForm.city
                          const cityErrorKey = `contact-${index}-city`
                          const cityErrorMessage = validateSingleFieldHelper("", cityRule)
                          
                          setContactErrors(prev => {
                            const newErrors = { ...prev }
                            if (errorMessage) {
                              newErrors[errorKey] = errorMessage
                            } else {
                              delete newErrors[errorKey]
                            }
                            if (cityErrorMessage) {
                              newErrors[cityErrorKey] = cityErrorMessage
                            } else {
                              delete newErrors[cityErrorKey]
                            }
                            return newErrors
                          })
                        }}
                      >
                        <SelectTrigger className={contactErrors[`contact-${index}-region`] ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecciona una región" />
                        </SelectTrigger>
                        <SelectContent>
                          {regiones.map((region) => (
                            <SelectItem key={region.id_region} value={region.nombre_region}>
                              {region.nombre_region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {contactErrors[`contact-${index}-region`] && (
                        <p className="text-sm text-red-500">{contactErrors[`contact-${index}-region`]}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`edit-contact-city-${index}`}>Comuna *</Label>
                      <Select
                        value={contact.city || ""}
                        onValueChange={(value) => updateContact(index, "city", value)}
                        disabled={!contact.region}
                      >
                        <SelectTrigger className={contactErrors[`contact-${index}-city`] ? 'border-red-500' : ''}>
                          <SelectValue placeholder={contact.region ? "Selecciona una comuna" : "Primero selecciona una región"} />
                        </SelectTrigger>
                        <SelectContent>
                          {comunas
                            .filter(comuna => {
                              const region = regiones.find(r => r.nombre_region === contact.region)
                              return region ? comuna.id_region === region.id_region : false
                            })
                            .map((comuna) => (
                              <SelectItem key={comuna.id_comuna} value={comuna.nombre_comuna}>
                                {comuna.nombre_comuna}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {contactErrors[`contact-${index}-city`] && (
                        <p className="text-sm text-red-500">{contactErrors[`contact-${index}-city`]}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id={`edit-contact-primary-${index}`}
                        checked={contact.is_primary}
                        onChange={(e) => updateContact(index, "is_primary", e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`edit-contact-primary-${index}`} className="text-sm">
                        Contacto principal
                      </Label>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleEditClient} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alertas */}

      {/* Confirmación de eliminación */}
      <CustomAlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        type="confirm"
        title="¿Eliminar cliente?"
        description="Esta acción no se puede deshacer. Se eliminará el cliente y todos sus contactos asociados permanentemente del sistema."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteClient}
        onCancel={() => setClientToDelete(null)}
      />
    </div>
  )
}
