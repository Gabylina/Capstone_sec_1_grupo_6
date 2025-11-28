"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/auth"
import { useNotifications } from "@/hooks/useNotifications"
import { getHitosAlertas, getHitosDashboard, HitoAlert, HitosDashboard } from "@/lib/api-hitos"
import { descripcionCargoService } from "@/lib/api"
import { serviceTypeLabels } from "@/lib/utils"

const serviceCodeLabels: Record<string, string> = {
  'PC': 'Proceso Completo',
  'HH': 'Headhunting',
  'ES': 'Evaluación Psicolaboral',
  'TS': 'Test Psicolaboral',
}
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateOnly } from "@/lib/utils"
import { Bell, AlertTriangle, Clock, Search, Filter, CheckCircle, Calendar, User, Briefcase } from "lucide-react"
import { useToastNotification } from "@/components/ui/use-toast-notification"

export default function AlertasPage() {
  const { user } = useAuth()
  const { showToast } = useToastNotification()
  const { markAsRead, loadNotifications, unreadCount: notificationsUnreadCount } = useNotifications(user?.id, user?.role)
  const [searchTerm, setSearchTerm] = useState("")
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [consultorFilter, setConsultorFilter] = useState<string>("all")
  const [consultores, setConsultores] = useState<Array<{ rut: string; nombre: string; apellido: string }>>([])
  const [hitosAlertas, setHitosAlertas] = useState<HitoAlert[]>([])
  const [dashboard, setDashboard] = useState<HitosDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const hasShownToast = useRef(false)
  const hasMarkedAsRead = useRef(false)

  // Marcar como leídas al entrar a la página (solo una vez)
  useEffect(() => {
    if (user && !hasMarkedAsRead.current && hitosAlertas.length > 0) {
      console.log('[ALERTAS] Marcando notificaciones como leídas al entrar a la página')
      markAsRead()
      hasMarkedAsRead.current = true
      // Recargar notificaciones después de marcarlas para actualizar el contador en el header
      setTimeout(() => {
        console.log('[ALERTAS] Recargando notificaciones después de marcar como leídas')
        loadNotifications()
      }, 500)
    }
  }, [user, markAsRead, loadNotifications, hitosAlertas.length])

  useEffect(() => {
    if (user) {
      // Si es admin, cargar lista de consultores
      if (user.role === 'admin') {
        loadConsultores()
      }
      loadHitosData()
      
      // Auto-refresh: actualizar alertas cada 5 minutos para mantener progresión
      const intervalId = setInterval(() => {
        console.log('[ALERTAS] Auto-refresh: recargando alertas...')
        loadHitosData()
      }, 5 * 60 * 1000) // 5 minutos
      
      return () => {
        clearInterval(intervalId)
      }
    }
  }, [user])

  const loadConsultores = async () => {
    try {
      const response = await descripcionCargoService.getFormData()
      if (response.success && response.data?.consultores) {
        // Mapear consultores a formato con nombre y apellido separados
        const consultoresData = response.data.consultores.map((c: any) => {
          // El nombre puede venir como "Nombre Apellido" o separado
          const nombreCompleto = c.nombre || ''
          const partes = nombreCompleto.split(' ')
          return {
            rut: c.rut,
            nombre: partes[0] || '',
            apellido: partes.slice(1).join(' ') || ''
          }
        }).filter((c: any) => c.nombre && c.rut) // Solo incluir consultores con nombre y RUT
        setConsultores(consultoresData)
        console.log('Consultores cargados:', consultoresData)
      }
    } catch (error) {
      console.error('Error al cargar consultores:', error)
    }
  }

  // Mostrar toast cuando se carguen las alertas por primera vez
  useEffect(() => {
    if (!loading && hitosAlertas.length > 0 && !hasShownToast.current) {
      const vencidas = hitosAlertas.filter(h => h.estado === 'vencido').length
      const porVencer = hitosAlertas.filter(h => h.estado === 'por_vencer').length
      
      if (vencidas > 0 && porVencer > 0) {
        showToast({
          type: "warning",
          title: `Tienes ${hitosAlertas.length} notificaciones nuevas`,
          description: `${vencidas} vencida${vencidas !== 1 ? 's' : ''} y ${porVencer} por vencer. Revisa tus alertas.`,
        })
      } else if (vencidas > 0) {
        showToast({
          type: "error",
          title: `Tienes ${vencidas} notificación${vencidas !== 1 ? 'es' : ''} nueva${vencidas !== 1 ? 's' : ''}`,
          description: `${vencidas} hito${vencidas !== 1 ? 's' : ''} vencido${vencidas !== 1 ? 's' : ''}. Revisa tus alertas urgentes.`,
        })
      } else if (porVencer > 0) {
        showToast({
          type: "success",
          title: `Tienes ${porVencer} notificación${porVencer !== 1 ? 'es' : ''} nueva${porVencer !== 1 ? 's' : ''}`,
          description: `${porVencer} hito${porVencer !== 1 ? 's' : ''} próximo${porVencer !== 1 ? 's' : ''} a vencer. Revisa tus alertas.`,
        })
      }
      
      hasShownToast.current = true
    }
  }, [loading, hitosAlertas, showToast])

  const loadHitosData = async () => {
      if (!user) {
      console.log('ERROR: No hay usuario autenticado')
      return
    }
    
    setLoading(true)
    try {
      console.log('Cargando hitos para usuario:', user.id)
      console.log('Usuario completo:', user)
      
      // Si es admin, no pasar consultorId para ver todas las alertas
      // Si es consultor, pasar su RUT para ver solo sus alertas
      const isAdmin = user.role === 'admin'
      const consultorId = isAdmin ? undefined : (user.id || '209942917')
      
      console.log(`Usando consultor_id: ${consultorId || 'TODOS (admin)'}`)
      
      // Obtener alertas de hitos
      // Si es admin, no se pasa consultorId y el backend devuelve todas las alertas
      const alertas = await getHitosAlertas(consultorId)
      console.log('Hitos cargados:', alertas.length, alertas)
      setHitosAlertas(alertas)
      
      // Obtener dashboard completo
      // Si es admin, pasar undefined (se convertirá a 'all' en la función)
      const dashboardData = await getHitosDashboard(consultorId)
      console.log('Dashboard cargado:', dashboardData)
      setDashboard(dashboardData)
    } catch (error) {
      console.error('ERROR: Error al cargar datos de hitos:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">Debes iniciar sesión para ver las alertas.</p>
        </div>
      </div>
    )
  }

  // Obtener el último hito activo de cada proceso
  // Un hito activo es uno que no está completado (sin fecha_cumplimiento)
  const getUltimoHitoActivoPorProceso = (hitos: HitoAlert[]): HitoAlert[] => {
    const hitosPorProceso = new Map<number, HitoAlert[]>();
    
    // Agrupar hitos por id_solicitud
    hitos.forEach(hito => {
      const idSolicitud = hito.solicitud?.id_solicitud;
      if (idSolicitud) {
        if (!hitosPorProceso.has(idSolicitud)) {
          hitosPorProceso.set(idSolicitud, []);
        }
        hitosPorProceso.get(idSolicitud)!.push(hito);
      }
    });
    
    // Para cada proceso, obtener el último hito activo
    const ultimosHitosActivos: HitoAlert[] = [];
    hitosPorProceso.forEach((hitosProceso) => {
      // Filtrar solo hitos activos (sin fecha_cumplimiento)
      const hitosActivos = hitosProceso.filter(h => !h.fecha_cumplimiento);
      
      if (hitosActivos.length > 0) {
        // Ordenar por fecha_limite (más reciente primero) o fecha_base
        hitosActivos.sort((a, b) => {
          const fechaA = a.fecha_limite ? new Date(a.fecha_limite).getTime() : 
                        (a.fecha_base ? new Date(a.fecha_base).getTime() : 0);
          const fechaB = b.fecha_limite ? new Date(b.fecha_limite).getTime() : 
                        (b.fecha_base ? new Date(b.fecha_base).getTime() : 0);
          return fechaB - fechaA; // Más reciente primero
        });
        
        // Tomar el primero (más reciente)
        ultimosHitosActivos.push(hitosActivos[0]);
      }
    });
    
    return ultimosHitosActivos;
  };

  // Obtener solo los últimos hitos activos de cada proceso
  const ultimosHitosActivos = getUltimoHitoActivoPorProceso(hitosAlertas)
  
  const filteredHitosAlertas = ultimosHitosActivos.filter(hito => {
    const matchesSearch =
        hito.nombre_hito.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hito.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hito.solicitud?.descripcionCargo?.titulo_cargo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (hito.solicitud?.contacto?.cliente?.nombre_cliente || '').toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesService = serviceFilter === "all" || hito.codigo_servicio === serviceFilter
    
    const matchesConsultor = consultorFilter === "all" || 
                            hito.solicitud?.rut_usuario === consultorFilter

    return matchesSearch && matchesService && matchesConsultor
  }).sort((a, b) => {
    // Ordenar por días restantes (menor a mayor)
    const diasA = a.dias_restantes || 0
    const diasB = b.dias_restantes || 0
    return diasA - diasB
  })

  const proximasVencer = filteredHitosAlertas.filter((h) => h.estado === 'por_vencer')
  const vencidas = filteredHitosAlertas.filter((h) => h.estado === 'vencido')
  const unreadCount = filteredHitosAlertas.length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "vencida":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "proxima_vencer":
        return <Clock className="h-5 w-5 text-yellow-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "vencida":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            Vencida
          </Badge>
        )
      case "proxima_vencer":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Próxima a Vencer
          </Badge>
        )
      default:
        return <Badge variant="outline">Información</Badge>
    }
  }

  const NotificationCard = ({ hito }: { hito: HitoAlert }) => {
    return (
      <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {hito.estado === 'vencido' ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {hito.nombre_hito}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{hito.descripcion}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  {getNotificationBadge(hito.estado === 'vencido' ? 'vencida' : 'proxima_vencer')}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  <span>{hito.solicitud?.descripcionCargo?.titulo_cargo || 'Sin cargo'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{hito.solicitud?.contacto?.cliente?.nombre_cliente || 'Sin cliente'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{hito.fecha_limite ? formatDateOnly(hito.fecha_limite) : 'Sin fecha'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alertas y Notificaciones</h1>
            <p className="text-muted-foreground">Gestiona hitos próximos a vencer y vencidos</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alertas</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredHitosAlertas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas a Vencer</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{proximasVencer.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{vencidas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Leer</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por hito, descripción, cargo o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los servicios</SelectItem>
                {Object.entries(serviceCodeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {user?.role === 'admin' && (
              <Select value={consultorFilter} onValueChange={setConsultorFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Consultor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los consultores</SelectItem>
                  {consultores.map((consultor) => (
                    <SelectItem key={consultor.rut} value={consultor.rut}>
                      {consultor.nombre} {consultor.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="todas" className="w-full">
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-3 h-auto p-0 bg-transparent">
                <TabsTrigger
                  value="todas"
                  className="flex items-center gap-2 p-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Bell className="h-4 w-4" />
                  Todas ({filteredHitosAlertas.length})
                </TabsTrigger>
                <TabsTrigger
                  value="proximas"
                  className="flex items-center gap-2 p-4 data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
                >
                  <Clock className="h-4 w-4" />
                  Próximas a Vencer ({proximasVencer.length})
                </TabsTrigger>
                <TabsTrigger
                  value="vencidas"
                  className="flex items-center gap-2 p-4 data-[state=active]:bg-red-500 data-[state=active]:text-white"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Vencidas ({vencidas.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="todas" className="mt-0">
                <div className="space-y-4">
                  {filteredHitosAlertas.length > 0 ? (
                    filteredHitosAlertas
                      .sort((a, b) => {
                        const dateA = a.fecha_limite ? new Date(a.fecha_limite).getTime() : 0
                        const dateB = b.fecha_limite ? new Date(b.fecha_limite).getTime() : 0
                        return dateB - dateA
                      })
                      .map((hito) => (
                        <Card key={hito.id_hito_solicitud} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 mt-1">
                                {hito.estado === 'vencido' ? (
                                  <AlertTriangle className="h-5 w-5 text-red-500" />
                                ) : (
                                  <Clock className="h-5 w-5 text-yellow-500" />
                                )}
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold">{hito.nombre_hito}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{hito.descripcion}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {hito.estado === 'vencido' ? (
                                      <Badge variant="destructive" className="bg-red-100 text-red-800">Vencida</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Próxima a Vencer</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-blue-600">Solicitud {hito.solicitud?.id_solicitud || 'N/A'}</span>
                                  </div>
                                  {user?.role === 'admin' && hito.solicitud?.usuario && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span className="font-medium">
                                        {hito.solicitud.usuario.nombre_usuario} {hito.solicitud.usuario.apellido_usuario}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {serviceCodeLabels[hito.codigo_servicio] || hito.codigo_servicio}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    <span>{hito.solicitud?.descripcionCargo?.titulo_cargo || 'Sin cargo'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{hito.fecha_limite ? formatDateOnly(hito.fecha_limite) : 'Sin fecha'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{hito.duracion_dias} días de duración</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  ) : (
                    <div className="text-center py-12">
                      <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No hay alertas</h3>
                      <p className="text-muted-foreground">No se encontraron alertas con los filtros aplicados.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="proximas" className="mt-0">
                <div className="space-y-4">
                  {proximasVencer.length > 0 ? (
                    proximasVencer
                      .sort((a, b) => {
                        const dateA = a.fecha_limite ? new Date(a.fecha_limite).getTime() : 0
                        const dateB = b.fecha_limite ? new Date(b.fecha_limite).getTime() : 0
                        return dateB - dateA
                      })
                      .map((hito) => (
                        <Card key={hito.id_hito_solicitud} className="border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 mt-1">
                                <Clock className="h-5 w-5 text-yellow-500" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold">{hito.nombre_hito}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{hito.descripcion}</p>
                                  </div>
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Próxima a Vencer</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-blue-600">Solicitud {hito.solicitud?.id_solicitud || 'N/A'}</span>
                                  </div>
                                  {user?.role === 'admin' && hito.solicitud?.usuario && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span className="font-medium">
                                        {hito.solicitud.usuario.nombre_usuario} {hito.solicitud.usuario.apellido_usuario}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {serviceCodeLabels[hito.codigo_servicio] || hito.codigo_servicio}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    <span>{hito.solicitud?.descripcionCargo?.titulo_cargo || 'Sin cargo'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{hito.fecha_limite ? formatDateOnly(hito.fecha_limite) : 'Sin fecha'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{hito.duracion_dias} días de duración</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No hay hitos próximos a vencer</h3>
                      <p className="text-muted-foreground">Todos los hitos están al día.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="vencidas" className="mt-0">
                <div className="space-y-4">
                  {vencidas.length > 0 ? (
                    vencidas
                      .sort((a, b) => {
                        const dateA = a.fecha_limite ? new Date(a.fecha_limite).getTime() : 0
                        const dateB = b.fecha_limite ? new Date(b.fecha_limite).getTime() : 0
                        return dateB - dateA
                      })
                      .map((hito) => (
                        <Card key={hito.id_hito_solicitud} className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 mt-1">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold">{hito.nombre_hito}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{hito.descripcion}</p>
                                  </div>
                                  <Badge variant="destructive" className="bg-red-100 text-red-800">Vencida</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-blue-600">Solicitud {hito.solicitud?.id_solicitud || 'N/A'}</span>
                                  </div>
                                  {user?.role === 'admin' && hito.solicitud?.usuario && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      <span className="font-medium">
                                        {hito.solicitud.usuario.nombre_usuario} {hito.solicitud.usuario.apellido_usuario}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {serviceCodeLabels[hito.codigo_servicio] || hito.codigo_servicio}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    <span>{hito.solicitud?.descripcionCargo?.titulo_cargo || 'Sin cargo'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{hito.fecha_limite ? formatDateOnly(hito.fecha_limite) : 'Sin fecha'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{hito.duracion_dias} días de duración</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">¡Excelente trabajo!</h3>
                      <p className="text-muted-foreground">No tienes hitos vencidos.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  )
}
