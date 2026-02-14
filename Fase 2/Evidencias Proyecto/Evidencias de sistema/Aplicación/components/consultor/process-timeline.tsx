"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, getStatusColor } from "@/lib/utils"
import { CheckCircle, Clock, AlertTriangle, Circle } from "lucide-react"
import type { Process, Hito } from "@/lib/types"

interface ProcessTimelineProps {
  process: Process
  hitos: Hito[]
  readOnly?: boolean
}

export function ProcessTimeline({ process, hitos, readOnly }: ProcessTimelineProps) {
  const isSanCristobal = (process?.tipo_servicio || process?.service_type) === "SC"

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

  const sortedHitos = [...hitos].sort((a, b) => {
    if (a.start_date && b.start_date) {
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    }
    return 0
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Línea de Tiempo del Proceso</h2>
        <p className="text-muted-foreground">Seguimiento de hitos y progreso del proceso de reclutamiento</p>
      </div>

      <div className="space-y-4">
        {sortedHitos.map((hito, index) => (
          <Card key={hito.id} className="relative">
            {index < sortedHitos.length - 1 && <div className="absolute left-8 top-16 w-0.5 h-16 bg-border" />}
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

      {sortedHitos.length === 0 && (
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
