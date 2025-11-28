"use client"

import React, { useState } from "react"
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
import { Loader2 } from "lucide-react"
import { descripcionCargoService } from "@/lib/api"
import * as XLSX from 'xlsx'
import { CustomAlertDialog } from "@/components/CustomAlertDialog"

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

interface UploadExcelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  descripcionCargoId: number
}

export function UploadExcelDialog({ open, onOpenChange, descripcionCargoId }: UploadExcelDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertType, setAlertType] = useState<"success" | "error">("success")
  const [alertTitle, setAlertTitle] = useState("")
  const [alertDescription, setAlertDescription] = useState("")

  // Función para leer una celda específica
  const leerCelda = (sheet: XLSX.WorkSheet, celda: string): string => {
    const cell = sheet[celda]
    return cell ? String(cell.v || '').trim() : ''
  }

  // Función para leer un rango vertical de celdas
  const leerRango = (sheet: XLSX.WorkSheet, columna: string, inicio: number, fin: number): string[] => {
    const valores: string[] = []
    for (let i = inicio; i <= fin; i++) {
      const valor = leerCelda(sheet, `${columna}${i}`)
      if (valor) {
        valores.push(valor)
      }
    }
    return valores
  }

  // Función para leer un rango doble (dos columnas)
  const leerRangoDoble = (sheet: XLSX.WorkSheet, col1: string, col2: string, inicio: number, fin: number): Array<{nombre: string, descripcion: string}> => {
    const valores: Array<{nombre: string, descripcion: string}> = []
    for (let i = inicio; i <= fin; i++) {
      const valor1 = leerCelda(sheet, `${col1}${i}`)
      const valor2 = leerCelda(sheet, `${col2}${i}`)
      if (valor1 || valor2) {
        valores.push({ nombre: valor1, descripcion: valor2 })
      }
    }
    return valores
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validar que sea un archivo Excel
      const validExtensions = ['.xlsx', '.xls']
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()
      
      if (!validExtensions.includes(fileExtension)) {
        setAlertType("error")
        setAlertTitle("Archivo no válido")
        setAlertDescription('Por favor selecciona un archivo Excel válido (.xlsx o .xls)')
        setAlertOpen(true)
        return
      }
      
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setAlertType("error")
      setAlertTitle("Archivo requerido")
      setAlertDescription('Por favor selecciona un archivo')
      setAlertOpen(true)
      return
    }

    try {
      setIsUploading(true)

      // Leer el archivo Excel
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // Obtener la primera hoja
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]

      // Extraer los datos según el formato especificado
      const excelData = {
        nombre_cargo: leerCelda(sheet, "C4"),
        tipo_contrato: leerCelda(sheet, "C6"),
        tipo_jornada: leerCelda(sheet, "C7"),
        jornada_trabajo: leerCelda(sheet, "C8"),
        ubicacion_principal: leerCelda(sheet, "C9"),
        modalidad_trabajo: leerCelda(sheet, "C10"),
        supervisor_directo: leerCelda(sheet, "C11"),
        subordinados: leerCelda(sheet, "C12"),
        equipo_area: leerCelda(sheet, "C13"),
        formacion_academica: leerCelda(sheet, "E6"),
        anos_experiencia: leerCelda(sheet, "E7"),
        tipo_experiencia: leerCelda(sheet, "E8"),
        herramientas_idiomas: leerCelda(sheet, "E9"),
        otro_requisitos: leerCelda(sheet, "E10"),
        renta_liquida: leerCelda(sheet, "E12"),
        beneficios: leerCelda(sheet, "E13"),
        objetivo_principal: leerCelda(sheet, "C16"),
        funciones_principales: leerRango(sheet, "C", 17, 20),
        competencias_psicolaborales: leerRangoDoble(sheet, "C", "D", 23, 27),
        numero_vacantes: leerCelda(sheet, "C30"),
        motivo_solicitud: leerCelda(sheet, "C31"),
        confidencialidad: leerCelda(sheet, "C32"),
        plazo_estimado_ingreso: leerCelda(sheet, "C33"),
        jefatura: leerCelda(sheet, "C34"),
        principales_desafios: leerCelda(sheet, "C35"),
        decisiones_autonomia: leerCelda(sheet, "C36"),
        grado_autonomia: leerCelda(sheet, "C37"),
        expectativas_colaboradores: leerCelda(sheet, "C38"),
        estilo_comunicacion: leerCelda(sheet, "C39"),
        clima_laboral: leerCelda(sheet, "C40"),
        sexo: leerCelda(sheet, "E30"),
        rango_etario: leerCelda(sheet, "E31"),
        nacionalidad: leerCelda(sheet, "E32"),
        comuna_residencia: leerCelda(sheet, "E33"),
        discapacidad: leerCelda(sheet, "E34"),
        tipo_persona_equipo: leerCelda(sheet, "E35"),
        valores_conductas: leerCelda(sheet, "E36"),
        posibilidades_crecimiento: leerCelda(sheet, "E37"),
        aprendizajes_perfil: leerCelda(sheet, "E38")
      }

      // Enviar los datos al backend
      const response = await descripcionCargoService.addExcelData(descripcionCargoId, excelData)

      if (response.success) {
        setAlertType("success")
        setAlertTitle("Datos cargados")
        setAlertDescription('Los datos de Excel se han cargado exitosamente')
        setFile(null)
        onOpenChange(false)
      } else {
        setAlertType("error")
        setAlertTitle("Error al cargar")
        const errorMsg = processApiErrorMessage(response.message, 'Error al cargar los datos')
        setAlertDescription(errorMsg)
      }
      setAlertOpen(true)
    } catch (error: any) {
      console.error('Error uploading Excel:', error)
      setAlertType("error")
      setAlertTitle("Error al procesar")
      const errorMsg = processApiErrorMessage(error.message, 'Error al procesar el archivo Excel')
      setAlertDescription(errorMsg)
      setAlertOpen(true)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar Datos de Excel</DialogTitle>
          <DialogDescription>
            Selecciona el archivo Excel con los datos de la descripción de cargo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel_file">Archivo Excel</Label>
            <Input
              id="excel_file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Formatos aceptados: .xlsx, .xls
            </p>
            {file && (
              <p className="text-sm text-green-600">
                ✓ Archivo seleccionado: {file.name}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Cargar Datos"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Alert para resultados */}
      <CustomAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        type={alertType}
        title={alertTitle}
        description={alertDescription}
      />
    </Dialog>
  )
}

