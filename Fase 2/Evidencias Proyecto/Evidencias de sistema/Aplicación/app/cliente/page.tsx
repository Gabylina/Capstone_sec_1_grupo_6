"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Building2, Briefcase, Eye, Loader2, Filter } from "lucide-react"
import { formatDateShort } from "@/lib/utils"
import {
  clientePortalService,
  type ClientePortalResumen,
  type ClientePortalSolicitudItem,
} from "@/lib/api-cliente-portal"
import { useToastNotification } from "@/components/ui/use-toast-notification"

export default function ClientePortalPage() {
  const { showToast } = useToastNotification()
  const [resumen, setResumen] = useState<ClientePortalResumen | null>(null)
  const [items, setItems] = useState<ClientePortalSolicitudItem[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceFilter, setServiceFilter] = useState("all")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const [res, list] = await Promise.all([
        clientePortalService.getResumen(),
        clientePortalService.listSolicitudes({
          service_type: serviceFilter,
          fecha_desde: fechaDesde || undefined,
          fecha_hasta: fechaHasta || undefined,
        }),
      ])
      setResumen(res)
      setItems(list.items)
    } catch (e: unknown) {
      showToast({
        type: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudieron cargar los datos",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const applyFilters = () => {
    loadData()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          Vista Cliente
        </h1>
        <p className="text-muted-foreground">
          Consulta el estado de tus procesos de reclutamiento (solo lectura)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Procesos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen?.total_procesos ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Procesos activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resumen?.procesos_activos ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Procesos por tipo de servicio</CardTitle>
        </CardHeader>
        <CardContent>
          {resumen?.por_tipo?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de proceso</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumen.por_tipo.map((row) => (
                  <TableRow key={row.codigo}>
                    <TableCell>{row.nombre}</TableCell>
                    <TableCell className="text-right font-medium">{row.cantidad}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Sin procesos registrados</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Detalle de procesos
          </CardTitle>
          <CardDescription>Filtre por fecha o tipo de servicio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label>Hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <Label>Tipo de servicio</Label>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {resumen?.por_tipo?.map((t) => (
                    <SelectItem key={t.codigo} value={t.codigo}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={applyFilters} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aplicar filtros
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay procesos con los filtros seleccionados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proceso</TableHead>
                  <TableHead>Fecha solicitud</TableHead>
                  <TableHead>Consultor a cargo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Ver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.proceso}</TableCell>
                    <TableCell>{row.fecha_solicitud ? formatDateShort(row.fecha_solicitud) : "—"}</TableCell>
                    <TableCell>{row.consultor}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.estado_solicitud || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" asChild title="Ver proceso">
                        <Link href={`/consultor/proceso/${row.id}?viewOnly=1`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
