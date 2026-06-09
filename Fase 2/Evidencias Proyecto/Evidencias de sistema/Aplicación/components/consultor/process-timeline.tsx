"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, getStatusColor } from "@/lib/utils"
import { CheckCircle, Clock, AlertTriangle, Circle, Pause } from "lucide-react"
import type { Process, Hito } from "@/lib/types"

interface ProcessTimelineProps {
  process: Process
  hitos: Hito[]
  readOnly?: boolean
}

export function ProcessTimeline({ process, hitos, readOnly }: ProcessTimelineProps) {
  const isSanCristobal = (process?.tipo_servicio || process?.service_type) === "SC" || (process?.tipo_servicio || process?.service_type) === "CA"
  const processStatus = (process?.estado_solicitud || process?.status || "").toLowerCase()
  const isCongelado = processStatus.includes("congelado")

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completado":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "en_progreso":
        return <Clock className="h-5 w-5 text-yellow-600" />
      case "vencido":
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const displayHitos = hitos

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Línea de Tiempo del Proceso</h2>
        <p className="text-muted-foreground">
          {isCongelado
            ? "Proceso en estado Congelado. Los hitos están en reposo y no corre el plazo de la solicitud."
            : "Seguimiento de hitos y progreso del proceso de reclutamiento"}
        </p>
      </div>

      {isCongelado && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Pause className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Proceso congelado</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Los hitos se muestran a continuación en estado de reposo. El plazo de la solicitud no avanza hasta que reactives el proceso.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={isCongelado ? "space-y-4 opacity-90" : "space-y-4"}>
        {displayHitos.map((hito, index) => (
          <Card key={hito.id} className="relative">
            {index < displayHitos.length - 1 && <div className="absolute left-8 top-16 w-0.5 h-16 bg-border" />}
            <CardContent className="flex gap-4 p-6">
              <div className="flex-shrink-0 mt-1">{getStatusIcon(hito.status)}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{hito.name}</h3>
                    <p className="text-sm text-muted-foreground">{hito.description}</p>
                  </div>
                  <Badge className={getStatusColor(hito.status)}>
                    {hito.status === "completado" && "Completado"}
                    {hito.status === "en_progreso" && "En Progreso"}
                    {hito.status === "vencido" && "Vencido"}
                    {hito.status === "pendiente" && "Pendiente"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {hito.start_date && (
                    <div>
                      <span className="text-muted-foreground">Fecha Inicio:</span>
                      <p className="font-medium">{formatDate(hito.start_date)}</p>
                    </div>
                  )}
                  {!isSanCristobal && hito.due_date && (
                    <div>
                      <span className="text-muted-foreground">Fecha Límite:</span>
                      <p className="font-medium">{formatDate(hito.due_date)}</p>
                    </div>
                  )}
                  {hito.completed_date && (
                    <div>
                      <span className="text-muted-foreground">Completado:</span>
                      <p className="font-medium">{formatDate(hito.completed_date)}</p>
                    </div>
                  )}
                  {!isSanCristobal && (
                    <div>
                      <span className="text-muted-foreground">Duración:</span>
                      <p className="font-medium">{hito.duration_days} días</p>
                    </div>
                  )}
                </div>

                {!isSanCristobal && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Disparador:</span> {hito.start_trigger}
                    {hito.anticipation_days > 0 && (
                      <span className="ml-4">
                        <span className="font-medium">Anticipación:</span> {hito.anticipation_days} días
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {displayHitos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay hitos configurados</h3>
            <p className="text-muted-foreground text-center">
              Los hitos se generarán automáticamente cuando inicies el proceso.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
