"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Lock, Eye, AlertCircle } from "lucide-react"
import { getStatusColor } from "@/lib/utils"

interface ProcessBlockedProps {
  processStatus: string
  moduleName: string
}

export function ProcessBlocked({ processStatus, moduleName }: ProcessBlockedProps) {
  // Estados finales que bloquean la edición (Congelado no bloquea: se puede reactivar)
  const finalStates = ['cerrado', 'cancelado', 'cierre extraordinario']
  const isBlocked = finalStates.some(state => 
    processStatus.toLowerCase().includes(state.toLowerCase())
  )

  if (!isBlocked) {
    return null
  }

  const getStatusMessage = () => {
    const status = processStatus.toLowerCase()
    if (status.includes('cerrado')) return 'Cerrado'
    if (status.includes('congelado')) return 'Congelado'
    if (status.includes('cancelado')) return 'Cancelado'
    if (status.includes('cierre extraordinario')) return 'Cierre Extraordinario'
    return processStatus
  }

  const getStatusDescription = () => {
    return 'El proceso ha sido finalizado'
  }

  return (
    <Card className="border-orange-200 bg-orange-50 mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <Lock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-orange-800">
                Proceso en Estado Final
              </h3>
              <Badge className={getStatusColor(processStatus)}>
                {getStatusMessage()}
              </Badge>
            </div>
            <p className="text-sm text-orange-700 mb-3">
              {getStatusDescription()}
            </p>
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <Eye className="h-4 w-4" />
              <span>
                <strong>{moduleName}</strong> está en modo de solo lectura. 
                No se pueden realizar modificaciones.
              </span>
            </div>
            <div className="mt-3 p-3 bg-orange-100 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-orange-700">
                  <p className="font-medium mb-1">¿Por qué no puedo editar?</p>
                  <p>
                    Los procesos en estado final están bloqueados para mantener la integridad 
                    de los datos y evitar modificaciones accidentales en procesos ya completados.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
