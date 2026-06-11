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
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, ExternalLink, FilterX, Loader2, Star, XCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useToastNotification } from "@/components/ui/use-toast-notification"
import { getTabEncuesta } from "@/lib/encuesta-modulo-config"

const DIMENSION_COLORS = ["#2563eb", "#16a34a", "#d97706", "#9333ea"]
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

export default function SatisfaccionClientePage() {
  const { showToast } = useToastNotification()
  const showToastRef = useRef(showToast)
  showToastRef.current = showToast

  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [clienteFilter, setClienteFilter] = useState<string>("all")
  const [consultorFilter, setConsultorFilter] = useState<string>("all")
  const [data, setData] = useState<SatisfaccionDashboard | null>(null)
  const [serviceTypes, setServiceTypes] = useState<Array<{ codigo: string; nombre: string }>>([])
  const [clientes, setClientes] = useState<Array<{ id_cliente: number; nombre: string }>>([])
  const [consultores, setConsultores] = useState<Array<{ rut_usuario: string; nombre: string }>>([])
  const [loading, setLoading] = useState(true)
  const [procesosTab, setProcesosTab] = useState("todos")
  const [procesosPage, setProcesosPage] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      try {
        const res = await satisfaccionClienteService.getDashboard({
          service_type: serviceFilter,
          cliente_id: clienteFilter,
          consultor_id: consultorFilter,
        })
        if (cancelled) return

        if (res.success && res.data) {
          setData(res.data)
          setServiceTypes(res.data.tipos_servicio)
          setClientes(res.data.clientes_disponibles ?? [])
          setConsultores(res.data.consultores_disponibles ?? [])
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
  }, [serviceFilter, clienteFilter, consultorFilter])

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

  const encuestas = data?.detalle_encuestas ?? []
  const encuestasRespondidas = encuestas.filter((d) => d.respondida)
  const encuestasPendientes = encuestas.filter((d) => !d.respondida)

  const encuestasLista = useMemo(() => {
    if (procesosTab === "respondidas") return encuestasRespondidas
    if (procesosTab === "pendientes") return encuestasPendientes
    return encuestas
  }, [procesosTab, encuestas, encuestasRespondidas, encuestasPendientes])

  const encuestasPaginated = useMemo(
    () => paginate(encuestasLista, procesosPage),
    [encuestasLista, procesosPage]
  )

  const hasActiveFilters =
    serviceFilter !== "all" || clienteFilter !== "all" || consultorFilter !== "all"

  const clearFilters = () => {
    setServiceFilter("all")
    setClienteFilter("all")
    setConsultorFilter("all")
    setProcesosPage(1)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Satisfacción Cliente</h1>
        <p className="text-muted-foreground mt-1">
          Medición y monitoreo de la satisfacción con el servicio recibido (escala 1 a 5).
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div className="space-y-2">
                <Label htmlFor="filtro-servicio">Servicio</Label>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger id="filtro-servicio" className="w-full">
                    <SelectValue placeholder="Todos los servicios" />
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
              <div className="space-y-2">
                <Label htmlFor="filtro-cliente">Cliente</Label>
                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger id="filtro-cliente" className="w-full">
                    <SelectValue placeholder="Todos los clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clientes</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id_cliente} value={String(c.id_cliente)}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-consultor">Consultor</Label>
                <Select value={consultorFilter} onValueChange={setConsultorFilter}>
                  <SelectTrigger id="filtro-consultor" className="w-full">
                    <SelectValue placeholder="Todos los consultores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los consultores</SelectItem>
                    {consultores.map((c) => (
                      <SelectItem key={c.rut_usuario} value={c.rut_usuario}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={!hasActiveFilters || loading}
              className="w-full xl:w-auto shrink-0"
            >
              <FilterX className="mr-2 h-4 w-4" />
              Borrar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

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
                Encuestas de satisfacción por contratación finalizada en cada proceso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {encuestas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No hay encuestas de contrataciones finalizadas para mostrar.
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
                    <TabsTrigger value="todos">Todas ({encuestas.length})</TabsTrigger>
                    <TabsTrigger value="respondidas">
                      Respondidas ({encuestasRespondidas.length})
                    </TabsTrigger>
                    <TabsTrigger value="pendientes">
                      Sin respuesta ({encuestasPendientes.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={procesosTab}>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Proceso</TableHead>
                            <TableHead>Candidato</TableHead>
                            <TableHead>Consultor</TableHead>
                            <TableHead>Servicio</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Nota</TableHead>
                            <TableHead className="w-[100px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {encuestasLista.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                No hay encuestas en esta categoría.
                              </TableCell>
                            </TableRow>
                          ) : (
                            encuestasPaginated.items.map((d) => (
                              <TableRow key={d.id_contratacion}>
                                <TableCell className="font-medium">
                                  <div>{d.proceso}</div>
                                  <div className="text-sm text-muted-foreground">{d.cliente}</div>
                                  <span className="text-xs text-muted-foreground">ID #{d.id_solicitud}</span>
                                </TableCell>
                                <TableCell>{d.candidato}</TableCell>
                                <TableCell>{d.consultor || "Sin asignar"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{d.codigo_servicio}</Badge>
                                </TableCell>
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
                                <TableCell>
                                  <Button variant="ghost" size="sm" asChild>
                                    <Link
                                      href={`/consultor/proceso/${d.id_solicitud}?viewOnly=1&tab=${getTabEncuesta(d.codigo_servicio) || "modulo-5"}`}
                                      title={`Registrar encuesta (${getTabEncuesta(d.codigo_servicio) || "modulo-5"})`}
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
                      totalItems={encuestasLista.length}
                      onPageChange={setProcesosPage}
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
                Comunicación, calidad de candidatos, tiempos y acompañamiento (promedio de encuestas respondidas).
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
