"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { publicacionService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Globe, Calendar, Edit } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useFormValidation, validationSchemas } from "@/hooks/useFormValidation"
import { ValidationErrorDisplay } from "@/components/ui/ValidatedFormComponents"

interface EditPublicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  publication: any | null
  onSuccess?: () => void
}

export function EditPublicationDialog({ open, onOpenChange, publication, onSuccess }: EditPublicationDialogProps) {
  const { toast } = useToast()
  const { errors, validateField, validateAllFields, clearError, clearAllErrors } = useFormValidation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [portales, setPortales] = useState<any[]>([])
  const [loadingPortales, setLoadingPortales] = useState(false)
  const [formData, setFormData] = useState({
    id_portal_postulacion: "",
    url_publicacion: "",
    estado_publicacion: "Activa",
    fecha_publicacion: new Date().toISOString().split('T')[0]
  })

  // Limpiar errores cuando se cierra el diálogo
  useEffect(() => {
    if (!open) {
      clearAllErrors()
      setHasAttemptedSubmit(false)
    }
  }, [open, clearAllErrors])

  // Cargar datos de la publicación cuando se abre el diálogo
  useEffect(() => {
    if (open && publication) {
      // Convertir fecha a formato YYYY-MM-DD
      let fechaFormato = ""
      if (publication.fecha_publicacion) {
        const fecha = new Date(publication.fecha_publicacion)
        if (!isNaN(fecha.getTime())) {
          const year = fecha.getFullYear()
          const month = String(fecha.getMonth() + 1).padStart(2, '0')
          const day = String(fecha.getDate()).padStart(2, '0')
          fechaFormato = `${year}-${month}-${day}`
        }
      }
      
      setFormData({
        id_portal_postulacion: publication.id_portal_postulacion?.toString() || "",
        url_publicacion: publication.url_publicacion || "",
        estado_publicacion: publication.estado_publicacion || "Activa",
        fecha_publicacion: fechaFormato || new Date().toISOString().split('T')[0]
      })
    }
  }, [open, publication])

  // Cargar portales cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      loadPortales()
    }
  }, [open])

  const loadPortales = async () => {
    try {
      setLoadingPortales(true)
      const response = await publicacionService.getPortales()
      
      if (response.success && response.data) {
        setPortales(response.data)
      } else {
        toast({
          title: "Error",
          description: "Error al cargar portales de postulación",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al cargar portales:", error)
      toast({
        title: "Error",
        description: "Error al cargar portales de postulación",
        variant: "destructive",
      })
    } finally {
      setLoadingPortales(false)
    }
  }

  const handleSubmit = async () => {
    if (!publication) return

    setHasAttemptedSubmit(true)
    
    // Validar todos los campos (solo URL y fecha, el portal no se valida porque es solo lectura)
    const fieldsToValidate = {
      url_publicacion: formData.url_publicacion,
      fecha_publicacion: formData.fecha_publicacion
    }
    const isValid = validateAllFields(fieldsToValidate, {
      url_publicacion: validationSchemas.publicationForm.url_publicacion,
      fecha_publicacion: validationSchemas.publicationForm.fecha_publicacion
    })
    
    if (!isValid) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa todos los campos obligatorios y corrige los errores antes de continuar.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Convertir fecha a Date object
      const fechaPublicacion = formData.fecha_publicacion 
        ? new Date(formData.fecha_publicacion)
        : new Date()

      const response = await publicacionService.update(publication.id, {
        url_publicacion: formData.url_publicacion,
        estado_publicacion: formData.estado_publicacion,
        fecha_publicacion: fechaPublicacion
      })

      if (response.success) {
        toast({
          title: "¡Éxito!",
          description: "¡Publicación actualizada exitosamente!",
          variant: "default",
        })

        // Cerrar diálogo
        onOpenChange(false)

        // Ejecutar callback de éxito
        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast({
          title: "Error",
          description: response.message || "Error al actualizar publicación",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error al actualizar publicación:", error)
      toast({
        title: "Error",
        description: error.message || "Error al actualizar publicación",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!publication) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Publicación
          </DialogTitle>
          <DialogDescription>
            Modifica los datos de la publicación en el portal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Portal de Postulación (solo lectura) */}
          <div className="space-y-2">
            <Label htmlFor="portal">
              Portal de Postulación
            </Label>
            <Select
              value={formData.id_portal_postulacion}
              disabled={true}
            >
              <SelectTrigger>
                <SelectValue placeholder="Cargando..." />
              </SelectTrigger>
              <SelectContent>
                {portales.map((portal) => (
                  <SelectItem key={portal.id} value={portal.id.toString()}>
                    {portal.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              El portal no se puede modificar
            </p>
          </div>

          {/* URL de Publicación */}
          <div className="space-y-2">
            <Label htmlFor="url">
              URL de la Publicación <span className="text-red-500">*</span>
            </Label>
            <Input
              id="url"
              type="url"
              value={formData.url_publicacion}
              onChange={(e) => {
                const value = e.target.value
                setFormData({ ...formData, url_publicacion: value })
                if (hasAttemptedSubmit || value.trim()) {
                  validateField('url_publicacion', value, validationSchemas.publicationForm)
                } else {
                  clearError('url_publicacion')
                }
              }}
              onBlur={() => {
                if (formData.url_publicacion) {
                  validateField('url_publicacion', formData.url_publicacion, validationSchemas.publicationForm)
                }
              }}
              placeholder="https://ejemplo.com/oferta/12345"
              className={errors.url_publicacion ? "border-destructive" : ""}
            />
            <ValidationErrorDisplay error={errors.url_publicacion} />
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={formData.estado_publicacion}
              onValueChange={(value) => setFormData({ ...formData, estado_publicacion: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Activa">Activa</SelectItem>
                <SelectItem value="Pausada">Pausada</SelectItem>
                <SelectItem value="Cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de Publicación */}
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha de Publicación</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!formData.fecha_publicacion ? "text-muted-foreground" : ""} ${errors.fecha_publicacion ? "border-destructive" : ""}`}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formData.fecha_publicacion 
                    ? (() => {
                        const [year, month, day] = formData.fecha_publicacion.split('-').map(Number)
                        const dateObj = new Date(year, month - 1, day)
                        return format(dateObj, "PPP", { locale: es })
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
                  selected={formData.fecha_publicacion ? (() => {
                    const [year, month, day] = formData.fecha_publicacion.split('-').map(Number)
                    return new Date(year, month - 1, day)
                  })() : undefined}
                  onSelect={(date) => {
                    if (date) {
                      // Convertir Date a formato YYYY-MM-DD usando métodos locales
                      const year = date.getFullYear()
                      const month = String(date.getMonth() + 1).padStart(2, '0')
                      const day = String(date.getDate()).padStart(2, '0')
                      const selectedDate = `${year}-${month}-${day}`
                      setFormData({ ...formData, fecha_publicacion: selectedDate })
                      clearError('fecha_publicacion')
                      if (hasAttemptedSubmit) {
                        validateField('fecha_publicacion', selectedDate, validationSchemas.publicationForm)
                      }
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
            <ValidationErrorDisplay error={errors.fecha_publicacion} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

