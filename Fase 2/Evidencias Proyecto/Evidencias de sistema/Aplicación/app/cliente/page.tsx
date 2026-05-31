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
import { Building2, Eye, Loader2, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDateShort, getSolicitudEstadoBadgeClass, serviceTypeLabels } from "@/lib/utils"
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
  const [estadoFilter, setEstadoFilter] = useState("all")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalProcesses, setTotalProcesses] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const loadResumen = async () => {
    try {
      const res = await clientePortalService.getResumen()
      setResumen(res)
    } catch (e: unknown) {
      showToast({
        type: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudo cargar el resumen",
      })
    }
  }

  const loadProcesses = async (page: number, size: number = pageSize) => {
    setLoading(true)
    try {
      const list = await clientePortalService.listSolicitudes({
        service_type: serviceFilter,
        estado: estadoFilter,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        page,
        limit: size,
      })
      setItems(list.items)
      setTotalProcesses(list.pagination.total)
      setTotalPages(Math.max(1, list.pagination.totalPages))
      setCurrentPage(list.pagination.page)
    } catch (e: unknown) {
      showToast({
        type: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "No se pudieron cargar los procesos",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadResumen()
    void loadProcesses(1, pageSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyFilters = () => {
    setCurrentPage(1)
    void loadProcesses(1, pageSize)
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    void loadProcesses(page, pageSize)
  }

  const nextPage = () => goToPage(currentPage + 1)
  const prevPage = () => goToPage(currentPage - 1)

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
    void loadProcesses(1, size)
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
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Procesos totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{resumen?.total_procesos ?? "—"}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">Procesos activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{resumen?.procesos_activos ?? "—"}</div>
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
                    <TableCell>
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-900 border-indigo-300">
                        {row.nombre}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-indigo-600 hover:bg-indigo-600">{row.cantidad}</Badge>
                    </TableCell>
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
          <CardDescription>Filtre por fecha, tipo de servicio o estado</CardDescription>
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
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(resumen?.estados_disponibles ?? []).map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
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
                  <TableHead>Tipo de servicio</TableHead>
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
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {row.tipo_servicio
                          ? serviceTypeLabels[row.tipo_servicio] || row.tipo_servicio_nombre || row.tipo_servicio
                          : row.tipo_servicio_nombre || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.fecha_solicitud ? formatDateShort(row.fecha_solicitud) : "—"}</TableCell>
                    <TableCell>{row.consultor}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getSolicitudEstadoBadgeClass(row.estado_solicitud)}>
                        {row.estado_solicitud || "—"}
                      </Badge>
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

      {totalProcesses > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="cliente-pageSize">Filas por página:</Label>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(parseInt(value, 10))}
                  >
                    <SelectTrigger id="cliente-pageSize" className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
                  {Math.min(currentPage * pageSize, totalProcesses)} de {totalProcesses} procesos
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={loading || currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={pageNum}
                        type="button"
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        disabled={loading}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={loading || currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
