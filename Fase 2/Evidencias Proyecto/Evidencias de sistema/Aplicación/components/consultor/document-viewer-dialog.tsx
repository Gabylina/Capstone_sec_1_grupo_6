"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Eye, AlertCircle, Download } from "lucide-react"

interface DocumentViewerDialogProps {
  file: File | null
  title: string
  isOpen: boolean
  onClose: () => void
}

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]

/** Obtiene el tipo efectivo del archivo (por type o por extensión) para PDF e imágenes */
function getEffectiveType(file: File): string {
  if (ACCEPTED_TYPES.includes(file.type)) return file.type
  const ext = (file.name || "").split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "application/pdf"
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg"
  if (ext === "png") return "image/png"
  if (ext === "webp") return "image/webp"
  if (ext === "gif") return "image/gif"
  // Sin extensión: si es octet-stream suele ser PDF/imagen subido sin nombre con extensión
  if (file.type === "application/octet-stream" || !file.type) return "application/pdf"
  return file.type
}

/** Acepta el archivo para visualización (PDF, imágenes o octet-stream sin extensión) */
function isAcceptedForView(file: File): boolean {
  const effective = getEffectiveType(file)
  if (ACCEPTED_TYPES.includes(effective)) return true
  if (effective === "application/pdf") return true // octet-stream tratado como PDF
  return false
}

export function DocumentViewerDialog({ file, title, isOpen, onClose }: DocumentViewerDialogProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !file) {
      setDataUrl(null)
      setError(null)
      setIsLoading(false)
      return
    }
    if (!isAcceptedForView(file)) {
      setError("Formato no soportado. Use PDF o imagen (JPG, PNG, WebP, GIF).")
      return
    }
    const effectiveType = getEffectiveType(file)
    setIsLoading(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      let url = reader.result as string
      // Si el archivo es octet-stream pero lo tratamos como PDF, forzar data URL como PDF para que el iframe lo muestre
      if (effectiveType === "application/pdf" && file.type !== "application/pdf" && url.startsWith("data:application/octet-stream")) {
        url = url.replace("data:application/octet-stream", "data:application/pdf")
      }
      setDataUrl(url)
      setIsLoading(false)
    }
    reader.onerror = () => {
      setError("No se pudo cargar el documento.")
      setIsLoading(false)
    }
    reader.readAsDataURL(file)
  }, [file, isOpen])

  const handleDownload = useCallback(() => {
    if (!file || !dataUrl) return
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = file.name || "documento"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [file, dataUrl])

  const effectiveType = file ? getEffectiveType(file) : ""
  const isPdf = effectiveType === "application/pdf"
  const isImage = effectiveType.startsWith("image/")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between gap-2 flex-wrap">
            <span>{file ? `Documento: ${file.name}` : "Sin archivo"}</span>
            {file && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {isPdf ? "PDF" : isImage ? "Imagen" : "Archivo"}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!dataUrl || isLoading}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </Button>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden flex-1 min-h-[50vh] flex flex-col" style={{ minHeight: "60vh" }}>
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
          ) : isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Cargando documento...</p>
              </div>
            </div>
          ) : dataUrl ? (
            <>
              {isPdf && (
                <iframe
                  src={dataUrl}
                  className="w-full flex-1 min-h-[400px] border-0"
                  title={title}
                  onError={() => setError("No se pudo mostrar el PDF. Use el botón Descargar.")}
                />
              )}
              {isImage && (
                <img
                  src={dataUrl}
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
        <p className="text-xs text-muted-foreground text-center">
          Si el documento no se muestra correctamente, use el botón Descargar.
        </p>
      </DialogContent>
    </Dialog>
  )
}
