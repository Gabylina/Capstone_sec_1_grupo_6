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
import { Badge } from "@/components/ui/badge"
import { Download, FileText, Eye, AlertCircle } from "lucide-react"
import { Candidate } from "@/lib/types"

interface CVViewerDialogProps {
  candidate: Candidate | null
  isOpen: boolean
  onClose: () => void
}

const CV_API_BASE = () => process.env.NEXT_PUBLIC_API_URL || ''

function buildCVUrl(candidate: Candidate, download: boolean): string {
  // API espera id_candidato; en algunos contextos el objeto tiene id_candidato numérico
  const candidatoId = (candidate as { id_candidato?: number }).id_candidato != null
    ? String((candidate as { id_candidato: number }).id_candidato)
    : candidate.id
  const base = `${CV_API_BASE()}/api/candidatos/${candidatoId}/cv`
  const params = new URLSearchParams()
  if (download) params.set('download', 'true')
  const idPost = (candidate as { id_postulacion?: number }).id_postulacion
  if (idPost != null && idPost !== undefined) params.set('id_postulacion', String(idPost))
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export default function CVViewerDialog({ candidate, isOpen, onClose }: CVViewerDialogProps) {
  const [cvUrl, setCvUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNonPdf, setIsNonPdf] = useState(false)

  useEffect(() => {
    if (!candidate || !isOpen) return
    loadCV()
    return () => {
      setCvUrl(prev => {
        if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [candidate, isOpen])

  const loadCV = async () => {
    if (!candidate) return

    setIsLoading(true)
    setError(null)
    setIsNonPdf(false)
    setCvUrl(null)

    try {
      if (candidate.cv_file && typeof candidate.cv_file === 'object' && 'name' in candidate.cv_file) {
        const file = candidate.cv_file as File
        const isPdf = file.type === 'application/pdf'
        if (isPdf) {
          setCvUrl(URL.createObjectURL(file))
        } else {
          setIsNonPdf(true)
        }
        setIsLoading(false)
        return
      }

      const apiUrl = buildCVUrl(candidate, false)
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('llc_token')}`
        }
      })

      if (!response.ok) {
        setError('No se pudo cargar el CV')
        setIsLoading(false)
        return
      }

      const blob = await response.blob()
      const isWord = blob.type.includes('word') || blob.type.includes('document')
      if (isWord) {
        setIsNonPdf(true)
      } else {
        // PDF o tipo desconocido: mostrar en iframe (blob URL es más rápido que base64)
        setCvUrl(URL.createObjectURL(blob))
      }
      setIsLoading(false)
    } catch (err) {
      console.error('Error al cargar CV:', err)
      setError('Error al cargar el CV')
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!candidate) return

    try {
      const url = buildCVUrl(candidate, true)
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('llc_token')}`
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const ext = blob.type.includes('word') || blob.type.includes('document') ? 'docx' : 'pdf'
        const link = document.createElement('a')
        link.href = url
        link.download = `CV_${candidate.name.replace(/\s+/g, '_')}.${ext}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Limpiar la URL temporal
        URL.revokeObjectURL(url)
      } else {
        setError('Error al descargar el CV')
      }
    } catch (err) {
      console.error('Error al descargar CV:', err)
      setError('Error al descargar el CV')
    }
  }

  const getFileType = (fileName: string | File | null) => {
    if (!fileName) return 'Archivo'
    const name = typeof fileName === 'string' ? fileName : fileName.name
    const extension = name.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf':
        return 'PDF'
      case 'doc':
      case 'docx':
        return 'Word'
      default:
        return 'Archivo'
    }
  }

  const getFileIcon = (fileName: string | File | null) => {
    if (!fileName) return <FileText className="h-5 w-5 text-blue-500" />
    const name = typeof fileName === 'string' ? fileName : fileName.name
    const extension = name.split('.').pop()?.toLowerCase()
    if (extension === 'pdf') {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    return <FileText className="h-5 w-5 text-blue-500" />
  }

  if (!candidate) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            CV de {candidate.name}
          </DialogTitle>
          <DialogDescription>
            Visualiza y descarga el currículum vitae del candidato
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del candidato */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {getFileIcon(candidate.cv_file || null)}
              <div>
                <p className="font-medium">{candidate.name}</p>
                <p className="text-sm text-muted-foreground">{candidate.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {getFileType(candidate.cv_file || null)}
              </Badge>
              <Button
                onClick={handleDownload}
                disabled={isLoading || (!cvUrl && !isNonPdf)}
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar
              </Button>
            </div>
          </div>

          {/* Contenido del CV */}
          <div className="border rounded-lg overflow-hidden" style={{ height: '60vh' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Cargando CV...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    onClick={loadCV}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Volver a cargar
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Si el problema continúa, usa el botón Descargar de arriba.</p>
                </div>
              </div>
            ) : isNonPdf ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-4">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Documento Word</p>
                  <p className="text-sm text-muted-foreground mt-1">Este CV no se puede previsualizar aquí. Puedes descargarlo usando el botón de arriba.</p>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </Button>
                </div>
              </div>
            ) : cvUrl ? (
              <div className="w-full h-full">
                <iframe
                  src={cvUrl}
                  className="w-full h-full border-0"
                  title={`CV de ${candidate.name}`}
                  onError={() => {
                    setError('Se ha producido un error al cargar el documento PDF.')
                  }}
                />
                <div className="text-xs text-muted-foreground text-center mt-2">
                  <p>Si el PDF no se muestra, puedes descargarlo usando el botón de arriba</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay CV disponible</p>
                </div>
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="text-xs text-muted-foreground text-center">
            <p>Si el CV no se muestra correctamente, puedes descargarlo usando el botón de arriba</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}