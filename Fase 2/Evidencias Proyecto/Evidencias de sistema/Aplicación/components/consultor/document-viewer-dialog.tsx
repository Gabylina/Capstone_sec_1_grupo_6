"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, Eye, AlertCircle } from "lucide-react"

interface DocumentViewerDialogProps {
  file: File | null
  title: string
  isOpen: boolean
  onClose: () => void
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]

export function DocumentViewerDialog({ file, title, isOpen, onClose }: DocumentViewerDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !file) {
      setObjectUrl(null)
      setError(null)
      return
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Formato no soportado. Use PDF o imagen (JPG, PNG, WebP, GIF).")
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    setError(null)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file, isOpen])

  const isPdf = file?.type === "application/pdf"
  const isImage = file?.type?.startsWith("image/")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {file ? `Documento: ${file.name}` : "Sin archivo"}
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden flex-1 min-h-[50vh] flex flex-col">
          {!file ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm text-muted-foreground">No hay documento para mostrar</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          ) : objectUrl ? (
            <>
              {isPdf && (
                <iframe
                  src={objectUrl}
                  className="w-full flex-1 min-h-[400px] border-0"
                  title={title}
                  onError={() => setError("No se pudo mostrar el PDF.")}
                />
              )}
              {isImage && (
                <img
                  src={objectUrl}
                  alt={title}
                  className="w-full max-h-[70vh] object-contain mx-auto"
                />
              )}
              {!isPdf && !isImage && (
                <div className="flex items-center justify-center flex-1 p-4">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <p className="ml-2 text-sm text-muted-foreground">Vista previa no disponible para este tipo de archivo</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm text-muted-foreground">Cargando...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
