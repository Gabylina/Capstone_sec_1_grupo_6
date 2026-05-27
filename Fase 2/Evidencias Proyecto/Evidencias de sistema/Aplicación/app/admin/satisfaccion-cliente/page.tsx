"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  satisfaccionClienteService,
  type SatisfaccionDashboard,
} from "@/lib/api-satisfaccion-cliente"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, ExternalLink, Loader2, Star, XCircle } from "lucide-react"
import type { EstadoEncuestaProceso } from "@/lib/api-satisfaccion-cliente"
import { useToastNotification } from "@/components/ui/use-toast-notification"

const DIMENSION_COLORS = ["#2563eb", "#16a34a", "#d97706"]
const PAGE_SIZE = 5

function paginate<T>(items: T[], page: number) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  return {
    items: items.slice(start, start + PAGE_SIZE),
    totalPages,
    safePage,
    total,
  }
}

function TablePagination({
  currentPage,
  totalItems,
  onPageChange,
}: {
  currentPage: number
  totalItems: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  if (totalItems === 0) return null

  const from = (safePage - 1) * PAGE_SIZE + 1
  const to = Math.min(safePage * PAGE_SIZE, totalItems)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Mostrando {from} a {to} de {totalItems} registros (máx. {PAGE_SIZE} por página)
      </p>
      {totalItems > PAGE_SIZE && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (safePage <= 3) {
                pageNum = i + 1
              } else if (safePage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = safePage - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  type="button"
                  variant={safePage === pageNum ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => onPageChange(pageNum)}
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
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function formatNota(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return `${value.toFixed(2)} / 5`
}

function estadoProcesoBadge(estado: EstadoEncuestaProceso) {
  switch (estado) {
    case "respondida":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
          Encuesta respondida
        </Badge>
      )
    case "parcial":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
          Respuesta parcial
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-orange-700 border-orange-300">
          Sin respuesta
        </Badge>
      )
  }
}

export default function SatisfaccionClientePage() {
  const { showToast } = useToastNotification()
  const showToastRef = useRef(showToast)
  showToastRef.current = showToast

  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [data, setData] = useState<SatisfaccionDashboard | null>(null)
  const [serviceTypes, setServiceTypes] = useState<Array<{ codigo: string; nombre: string }>>([])
  const [loading, setLoading] = useState(true)
  const [procesosTab, setProcesosTab] = useState("todos")
  const [procesosPage, setProcesosPage] = useState(1)
  const [detalleTab, setDetalleTab] = useState("detalle-todos")
  const [detallePage, setDetallePage] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      try {
        const res = await satisfaccionClienteService.getDashboard(serviceFilter)
        if (cancelled) return

        if (res.success && res.data) {
          setData(res.data)
          setServiceTypes(res.data.tipos_servicio)
        } else {
          showToastRef.current({
            type: "error",
            title: "Error",
            description: res.message || "No se pudo cargar el dashboard",
          })
          setData(null)
        }
      } catch {
        if (cancelled) return
        showToastRef.current({
          type: "error",
          title: "Error",
          description: "Error de conexión al cargar satisfacción del cliente",
        })
        setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDashboard()
    return () => {
      cancelled = true
    }
  }, [serviceFilter])

  const dimensionChartData = useMemo(
    () =>
      (data?.dimensiones ?? []).map((d, i) => ({
        name: d.etiqueta.length > 28 ? `${d.etiqueta.slice(0, 26)}…` : d.etiqueta,
        fullName: d.etiqueta,
        promedio: d.promedio ?? 0,
        fill: DIMENSION_COLORS[i % DIMENSION_COLORS.length],
      })),
    [data?.dimensiones]
  )

  const topChartData = useMemo(
    () =>
      (data?.ranking.mas_satisfechos ?? []).map((c) => ({
        cliente: c.cliente.length > 22 ? `${c.cliente.slice(0, 20)}…` : c.cliente,
        nota: c.nota_promedio,
      })),
    [data?.ranking.mas_satisfechos]
  )

  const bottomChartData = useMemo(
    () =>
      (data?.ranking.menos_satisfechos ?? []).map((c) => ({
        cliente: c.cliente.length > 22 ? `${c.cliente.slice(0, 20)}…` : c.cliente,
        nota: c.nota_promedio,
      })),
    [data?.ranking.menos_satisfechos]
  )

  const resumen = data?.resumen
  const tasaRespuesta =
    resumen && resumen.total_encuestas > 0
      ? Math.round((resumen.respondidas / resumen.total_encuestas) * 100)
      : 0

  const procesos = data?.procesos_encuesta ?? []
  const detalle = data?.detalle_encuestas ?? []
  const procesosRespondidos = procesos.filter((p) => p.estado === "respondida")
  const procesosPendientes = procesos.filter((p) => p.estado === "pendiente" || p.estado === "parcial")
  const detalleRespondidas = detalle.filter((d) => d.respondida)
  const detallePendientes = detalle.filter((d) => !d.respondida)

  const procesosLista = useMemo(() => {
    if (procesosTab === "respondidas") return procesosRespondidos
    if (procesosTab === "pendientes") return procesosPendientes
    return procesos
  }, [procesosTab, procesos, procesosRespondidos, procesosPendientes])

  const detalleLista = useMemo(() => {
    if (detalleTab === "detalle-ok") return detalleRespondidas
    if (detalleTab === "detalle-pend") return detallePendientes
    return detalle
  }, [detalleTab, detalle, detalleRespondidas, detallePendientes])

  const procesosPaginated = useMemo(
    () => paginate(procesosLista, procesosPage),
    [procesosLista, procesosPage]
  )

  const detallePaginated = useMemo(
    () => paginate(detalleLista, detallePage),
    [detalleLista, detallePage]
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Satisfacción Cliente</h1>
          <p className="text-muted-foreground mt-1">
            Medición y monitoreo de la satisfacción con el servicio recibido (escala 1 a 5).
          </p>
        </div>
        <div className="flex items-center gap-2 min-w-[220px]">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Filtro por servicio</span>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los servicios</SelectItem>
              {serviceTypes.map((t) => (
                <SelectItem key={t.codigo} value={t.codigo}>
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Actualizando datos…
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Total encuestas
                </CardDescription>
                <CardTitle className="text-3xl">{resumen?.total_encuestas ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Contrataciones finalizadas (encuesta enviada al cliente).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Respuestas</CardDescription>
                <CardTitle className="text-2xl flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    {resumen?.respondidas ?? 0} respondidas
                  </span>
                  <span className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-lg font-semibold">
                    <XCircle className="h-5 w-5" />
                    {resumen?.sin_respuesta ?? 0} sin respuesta
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{tasaRespuesta}% tasa de respuesta</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Nota total
                </CardDescription>
                <CardTitle className="text-3xl">{formatNota(resumen?.nota_total)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Promedio global sobre 5 puntos máx.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Encuestas por proceso</CardTitle>
              <CardDescription>
                Procesos con encuesta respondida, pendiente o parcial (varias contrataciones en el mismo proceso).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {procesos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No hay procesos con contrataciones finalizadas para mostrar.
                </p>
              ) : (
                <Tabs
                  value={procesosTab}
                  onValueChange={(v) => {
                    setProcesosTab(v)
                    setProcesosPage(1)
                  }}
                  className="w-full"
                >
                  <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="todos">Todos ({procesos.length})</TabsTrigger>
                    <TabsTrigger value="respondidas">
                      Respondidas ({procesosRespondidos.length})
                    </TabsTrigger>
                    <TabsTrigger value="pendientes">
                      Sin respuesta / parcial ({procesosPendientes.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={procesosTab}>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Proceso</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Servicio</TableHead>
                            <TableHead className="text-center">Encuestas</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Nota prom.</TableHead>
                            <TableHead className="w-[100px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {procesosLista.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No hay procesos en esta categoría.
                              </TableCell>
                            </TableRow>
                          ) : (
                            procesosPaginated.items.map((p) => (
                              <TableRow key={p.id_solicitud}>
                                <TableCell className="font-medium">
                                  <div>{p.proceso}</div>
                                  <span className="text-xs text-muted-foreground">ID #{p.id_solicitud}</span>
                                </TableCell>
                                <TableCell>{p.cliente}</TableCell>
                                <TableCell>{p.servicio}</TableCell>
                                <TableCell className="text-center text-sm">
                                  <span className="text-green-700">{p.respondidas}</span>
                                  <span className="text-muted-foreground"> / </span>
                                  <span>{p.total_encuestas}</span>
                                  {p.sin_respuesta > 0 && (
                                    <div className="text-xs text-orange-600">
                                      {p.sin_respuesta} pendiente{p.sin_respuesta !== 1 ? "s" : ""}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>{estadoProcesoBadge(p.estado)}</TableCell>
                                <TableCell className="text-right">{formatNota(p.nota_promedio)}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link
                                      href={`/consultor/proceso/${p.id_solicitud}?viewOnly=1&tab=modulo-5`}
                                      title="Registrar encuesta (Módulo 5)"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <TablePagination
                      currentPage={procesosPage}
                      totalItems={procesosLista.length}
                      onPageChange={setProcesosPage}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle por contratación</CardTitle>
              <CardDescription>
                Cada fila es una encuesta asociada a un candidato contratado dentro del proceso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detalle.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sin registros de encuesta.</p>
              ) : (
                <Tabs
                  value={detalleTab}
                  onValueChange={(v) => {
                    setDetalleTab(v)
                    setDetallePage(1)
                  }}
                  className="w-full"
                >
                  <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="detalle-todos">Todas ({detalle.length})</TabsTrigger>
                    <TabsTrigger value="detalle-ok">Respondidas ({detalleRespondidas.length})</TabsTrigger>
                    <TabsTrigger value="detalle-pend">Pendientes ({detallePendientes.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value={detalleTab}>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Proceso</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Candidato</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Nota</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detalleLista.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                Sin registros.
                              </TableCell>
                            </TableRow>
                          ) : (
                            detallePaginated.items.map((d) => (
                              <TableRow key={d.id_contratacion}>
                                <TableCell>
                                  <div className="font-medium">{d.proceso}</div>
                                  <span className="text-xs text-muted-foreground">#{d.id_solicitud}</span>
                                </TableCell>
                                <TableCell>{d.cliente}</TableCell>
                                <TableCell>{d.candidato}</TableCell>
                                <TableCell>
                                  {d.respondida ? (
                                    <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
                                      Respondida
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-orange-700 border-orange-300">
                                      Sin respuesta
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{formatNota(d.nota_total)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <TablePagination
                      currentPage={detallePage}
                      totalItems={detalleLista.length}
                      onPageChange={setDetallePage}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Desglose por área</CardTitle>
              <CardDescription>
                Calidad, tiempo y sensación de apoyo / expertise (promedio de encuestas respondidas).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dimensionChartData.length === 0 || dimensionChartData.every((d) => d.promedio === 0) ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Sin datos de dimensiones. Registre encuestas desde el Módulo 5 de contrataciones.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dimensionChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [`${Number(value).toFixed(2)} / 5`, "Promedio"]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.fullName ?? ""
                      }
                    />
                    <Bar dataKey="promedio" radius={[0, 4, 4, 0]} barSize={28}>
                      {dimensionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700 dark:text-green-400">Clientes más satisfechos</CardTitle>
                <CardDescription>Mayor nota promedio (top 8)</CardDescription>
              </CardHeader>
              <CardContent>
                {topChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sin encuestas respondidas.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={topChartData} margin={{ bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cliente" angle={-35} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(2)} / 5`, "Nota promedio"]} />
                      <Bar dataKey="nota" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-orange-700 dark:text-orange-400">Clientes menos satisfechos</CardTitle>
                <CardDescription>Menor nota promedio (bottom 8)</CardDescription>
              </CardHeader>
              <CardContent>
                {bottomChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Sin encuestas respondidas.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={bottomChartData} margin={{ bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cliente" angle={-35} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(2)} / 5`, "Nota promedio"]} />
                      <Bar dataKey="nota" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
