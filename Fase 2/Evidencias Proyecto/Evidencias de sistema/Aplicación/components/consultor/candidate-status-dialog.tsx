"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { candidatoService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { UserCheck, AlertCircle, XCircle, Plus } from "lucide-react"
import type { Candidate } from "@/lib/types"

interface CandidateStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidate: Candidate | null
  onSuccess?: () => void
}

export function CandidateStatusDialog({ open, onOpenChange, candidate, onSuccess }: CandidateStatusDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    status: "",
    comment: ""
  })

  // Cargar datos del candidato cuando se abre el diálogo
  useEffect(() => {
    if (open && candidate) {
      // Si el estado es "agregado", usar "presentado" como valor inicial por defecto
      const initialStatus = candidate.presentation_status === "agregado" 
        ? "presentado" 
        : (candidate.presentation_status || "presentado")
      
      setFormData({
        status: initialStatus,
        comment: candidate.rejection_reason || ""
      })
    }
  }, [open, candidate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!candidate) return

    // Validar que no se permita enviar con estado "agregado"
    if (formData.status === "agregado") {
      toast({
        title: "Estado no válido",
        description: "No puede cambiar a estado 'Agregado'. Por favor seleccione 'Presentado' o 'No Presentado'.",
        variant: "destructive",
      })
      return
    }

    // Validar que si es "no_presentado" debe tener comentario
    if (formData.status === "no_presentado" && !formData.comment?.trim()) {
      toast({
        title: "Campo obligatorio",
        description: "Debe agregar un comentario para el estado 'No Presentado'",
        variant: "destructive",
      })
      return
    }
    
    // Validar que el comentario no sea solo espacios
    if (formData.status === "no_presentado" && formData.comment?.trim().length < 10) {
      toast({
        title: "Campo obligatorio",
        description: "El comentario debe tener al menos 10 caracteres",
        variant: "destructive",
      })
      return
    }

    // Validar que el comentario no exceda 500 caracteres
    if (formData.comment && formData.comment.length > 500) {
      toast({
        title: "Límite de caracteres excedido",
        description: "El comentario no puede exceder 500 caracteres",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      
      const response = await candidatoService.updateStatus(
        parseInt(candidate.id),
        formData.status as "presentado" | "no_presentado",
        formData.comment || undefined
      )

      if (response.success) {
        toast({
          title: "¡Éxito!",
          description: "¡Estado del candidato actualizado correctamente!",
          variant: "default",
        })
        onSuccess?.()
        onOpenChange(false)
      } else {
        throw new Error(response.message || 'Error al actualizar estado')
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del candidato",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      status: value,
      // Limpiar comentario si cambia a "presentado"
      comment: value === "presentado" ? "" : prev.comment
    }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "agregado":
        return <Plus className="h-4 w-4 text-blue-600" />
      case "presentado":
        return <UserCheck className="h-4 w-4 text-green-600" />
      case "no_presentado":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <UserCheck className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "agregado":
        return "Agregado"
      case "presentado":
        return "Presentado"
      case "no_presentado":
        return "No Presentado"
      default:
        return "Sin Estado"
    }
  }

  const getCommentPlaceholder = (status: string) => {
    switch (status) {
      case "no_presentado":
        return "Ingrese la razón por la cual el candidato no fue presentado..."
      default:
        return "Comentario adicional (opcional)..."
    }
  }

  if (!candidate) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(formData.status)}
            Cambiar Estado del Candidato
          </DialogTitle>
          <DialogDescription>
            Actualizar el estado de <strong>{candidate.name}</strong> en el proceso de selección.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Estado del Candidato</Label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="presentado">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-green-600" />
                    Presentado
                  </div>
                </SelectItem>
                <SelectItem value="no_presentado">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    No Presentado
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">
              Comentario
              {formData.status === "no_presentado" && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <Textarea
              id="comment"
              placeholder={getCommentPlaceholder(formData.status)}
              value={formData.comment}
              onChange={(e) => {
                const value = e.target.value
                // Limitar a 500 caracteres
                if (value.length <= 500) {
                  setFormData(prev => ({ ...prev, comment: value }))
                }
              }}
              rows={3}
              className="resize-none"
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              {formData.status === "no_presentado" && (
                <p className="text-xs text-muted-foreground">
                  El comentario es obligatorio para este estado (mínimo 10 caracteres).
                </p>
              )}
              <div className="text-xs text-muted-foreground ml-auto">
                {(formData.comment || "").length}/500 caracteres
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
