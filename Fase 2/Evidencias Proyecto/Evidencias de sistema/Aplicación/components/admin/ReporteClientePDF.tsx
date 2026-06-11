import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer"

// ── Tipos ──────────────────────────────────────────────────────────────────
export type HitoPDF = {
  nombre: string
  tipoAncla: string
  fechaLimite: string | null
  fechaCumplimiento: string | null
  completado: boolean
}

export type CandidatoPresentadoPDF = {
  nombre: string
  fechaEnvio: string | null
  respuestaCliente: string | null
  fechaRespuesta: string | null
  comentarioCliente: string | null
}

export type SeguimientoCandidatoPDF = {
  nombre: string
  estadoContratacion: string | null
  estadoInforme: string | null
  fechaEnvioInforme: string | null
  fechaRespuesta: string | null
  comentarioCliente: string | null
}

export type SeguimientoCandidatosPDF = {
  titulo: string
  candidatos: SeguimientoCandidatoPDF[]
}

export type ProcesoPDF = {
  id: number
  cargo: string
  codigoServicio: string
  nombreServicio: string
  consultor: string
  fechaSolicitud: string | null
  estadoActual: string
  fechaCierre: string | null
  cerradoEstaSemana: boolean
  hitos: HitoPDF[]
  proximosPasosLL: string[]
  proximosPasosCliente: string[]
  candidatosPresentados: CandidatoPresentadoPDF[]
  seguimientoCandidatos: SeguimientoCandidatosPDF | null
}

export type ReporteClienteData = {
  cliente: { id: number; nombre: string }
  semana: { inicio: string; fin: string }
  resumen: Array<{ servicio: string; cantidad: number; cargos?: string[] }>
  procesos: ProcesoPDF[]
}

// ── Colores ────────────────────────────────────────────────────────────────
const C = {
  cyan: "#00bcd4",
  cyanLight: "#e0f7fa",
  navy: "#1e3a8a",
  navyLight: "#dbeafe",
  white: "#ffffff",
  bg: "#f8fafc",
  border: "#e2e8f0",
  muted: "#64748b",
  green: "#16a34a",
  greenLight: "#dcfce7",
  amber: "#d97706",
  amberLight: "#fef3c7",
  red: "#dc2626",
  redLight: "#fee2e2",
}

/** Reserva superior para el encabezado fijo + separación con el contenido */
const PAGE_TOP_PADDING = 82
/** Reserva inferior para el pie fijo */
const PAGE_BOTTOM_PADDING = 62

function buildResumenProcesos(
  procesos: ProcesoPDF[],
): Array<{ servicio: string; cantidad: number; cargos: string[] }> {
  const map = new Map<string, string[]>()
  procesos.forEach((p) => {
    const cargos = map.get(p.nombreServicio) ?? []
    cargos.push(p.cargo)
    map.set(p.nombreServicio, cargos)
  })
  return Array.from(map.entries())
    .map(([servicio, cargos]) => ({ servicio, cantidad: cargos.length, cargos }))
    .sort((a, b) => b.cantidad - a.cantidad)
}

// ── Estilos ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: C.white,
    paddingTop: PAGE_TOP_PADDING,
    paddingBottom: PAGE_BOTTOM_PADDING,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: C.cyan,
  },
  headerRight: { alignItems: "flex-end" },
  headerTitle: {
    color: C.navy,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  headerSemana: { color: C.muted, fontSize: 8, marginTop: 3 },
  logo: { height: 40, width: 160 },

  body: {
    paddingHorizontal: 32,
    paddingBottom: 8,
  },

  procesoBlock: {
    marginBottom: 16,
    marginTop: 6,
  },

  procesoShell: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
  },
  procesoShellCerrado: {
    borderColor: C.green,
  },

  sectionDividerFirst: {
    marginTop: 12,
  },

  clientCard: {
    backgroundColor: C.bg,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: C.cyan,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clientNombre: { color: C.navy, fontSize: 14, fontFamily: "Helvetica-Bold" },
  clientSub: { color: C.muted, fontSize: 8, marginTop: 2 },
  totalBadge: {
    backgroundColor: C.cyan,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  totalBadgeText: { color: C.white, fontSize: 10, fontFamily: "Helvetica-Bold" },

  resumenCard: {
    backgroundColor: C.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 3,
    borderLeftColor: C.navy,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    marginBottom: 14,
  },
  resumenTitle: {
    color: C.navy,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  resumenItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  resumenItemLast: {
    borderBottomWidth: 0,
  },
  resumenBadge: {
    backgroundColor: C.navy,
    borderRadius: 3,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  resumenBadgeText: {
    color: C.white,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  resumenItemBody: { flex: 1 },
  resumenItemType: {
    color: C.cyan,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.3,
    marginBottom: 2,
  },
  resumenItemCargos: {
    color: C.muted,
    fontSize: 7.5,
    lineHeight: 1.4,
  },

  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 6,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: C.border },
  sectionLabel: {
    color: C.muted,
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginHorizontal: 8,
  },

  procesoHeader: {
    backgroundColor: C.bg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  procesoHeaderCerrado: { backgroundColor: C.greenLight },
  procesoCargo: { color: C.navy, fontSize: 12, fontFamily: "Helvetica-Bold", lineHeight: 1.5 },
  procesoServicio: { color: C.cyan, fontSize: 9, lineHeight: 1.5 },
  procesoMeta: { color: C.muted, fontSize: 8, lineHeight: 1.5 },
  estadoBadge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },

  procesoBody: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    flexDirection: "column",
  },
  procesoBodyCerrado: { backgroundColor: C.greenLight },

  sectionTitleWrap: {
    marginBottom: 10,
    paddingBottom: 2,
  },
  hitosTitle: {
    color: C.muted,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  hitoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingBottom: 2,
  },
  hitoIndicator: { width: 18, paddingTop: 2, alignItems: "center" },
  hitoDot: { width: 8, height: 8, borderRadius: 4 },
  hitoContent: { flex: 1, paddingLeft: 4 },
  hitoLine: { fontSize: 9, lineHeight: 1.5 },
  hitoFechaInline: { fontSize: 9, color: C.muted },

  pasosContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
  },
  pasosBox: {
    flex: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "column",
  },
  pasosBoxLL: {
    backgroundColor: C.navyLight,
    marginRight: 5,
  },
  pasosBoxCliente: {
    backgroundColor: C.cyanLight,
    marginLeft: 5,
  },
  pasosBoxLast: {},
  pasosBoxTitleWrap: {
    marginBottom: 8,
    paddingBottom: 2,
  },
  pasosBoxTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.5,
  },
  pasosBoxTitleLL: { color: C.navy },
  pasosBoxTitleCliente: { color: "#0e7490" },
  pasosItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    paddingBottom: 2,
  },
  pasosBullet: {
    fontSize: 8,
    color: C.cyan,
    lineHeight: 1.6,
    marginRight: 6,
    width: 10,
  },
  pasosText: { fontSize: 8, color: "#1e293b", flex: 1, lineHeight: 1.6 },
  pasosEmpty: { fontSize: 8, color: C.muted, fontStyle: "italic", lineHeight: 1.6 },

  candidatosSection: { marginTop: 16, flexDirection: "column" },
  candidatoRow: {
    flexDirection: "column",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  candidatoNombreWrap: { marginBottom: 5, paddingBottom: 1 },
  candidatoNombre: {
    color: C.navy,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.6,
  },
  candidatoDetalleWrap: { marginBottom: 3, paddingBottom: 1 },
  candidatoDetalle: { color: C.muted, fontSize: 8, lineHeight: 1.55 },
  candidatoComentarioWrap: { marginTop: 2, paddingTop: 1 },
  candidatoComentario: { color: "#1e293b", fontSize: 8, lineHeight: 1.55 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerText: { color: C.muted, fontSize: 7 },
  pageNumber: { color: C.muted, fontSize: 7 },
})

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return "–"
  const d = new Date(iso)
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`
}

function formatServiceName(nombre: string): string {
  const nombresMapeados: Record<string, string> = {
    ProcesoCompleto: "Proceso Completo",
    LongList: "Long List",
    HeadHunting: "Head Hunting",
    TestPsicolaboral: "Test Psicolaboral",
    EvaluacionPsicolaboral: "Evaluación Psicolaboral",
    SanCristobalAcotado: "San Cristóbal Acotado",
    SanCristobalCompleto: "San Cristóbal Completo",
    "Filtro Inteligente": "Filtro Inteligente",
    "Evaluación Potencial": "Evaluación Potencial",
    "Publicación Portales": "Publicación Portales",
  }

  const nombreLower = nombre.toLowerCase().replace(/\s+/g, "")
  for (const [key, value] of Object.entries(nombresMapeados)) {
    if (key.toLowerCase().replace(/\s+/g, "") === nombreLower) return value
  }

  return nombre
    .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, "$1 $2")
    .replace(/([A-ZÁÉÍÓÚÑ])([A-ZÁÉÍÓÚÑ][a-záéíóúñ])/g, "$1 $2")
    .trim()
}

function estadoColor(estado: string): { bg: string; text: string } {
  switch (estado) {
    case "Completado": return { bg: C.greenLight, text: C.green }
    case "Pausado": return { bg: C.amberLight, text: C.amber }
    case "Cancelado": return { bg: C.redLight, text: C.red }
    default: return { bg: C.cyanLight, text: "#0e7490" }
  }
}

function SectionTitle({ label }: { label: string }) {
  return (
    <View style={s.sectionDivider}>
      <View style={s.sectionLine} />
      <Text style={s.sectionLabel}>{label}</Text>
      <View style={s.sectionLine} />
    </View>
  )
}

function SectionHeading({ label }: { label: string }) {
  return (
    <View style={s.sectionTitleWrap}>
      <Text style={s.hitosTitle}>{label.toUpperCase()}</Text>
    </View>
  )
}

async function loadLogoSrc(): Promise<string> {
  const res = await fetch("/images/llconsulting-logo.png")
  if (!res.ok) throw new Error("No se pudo cargar el logo")
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ── Componentes reutilizables ──────────────────────────────────────────────
function PageHeader({
  logoSrc,
  semana,
  hoyStr,
}: {
  logoSrc: string
  semana: { inicio: string; fin: string }
  hoyStr: string
}) {
  return (
    <View style={s.header} fixed>
      <Image src={logoSrc} style={s.logo} />
      <View style={s.headerRight}>
        <Text style={s.headerTitle}>Reporte Semanal de Procesos</Text>
        <Text style={s.headerSemana}>
          Semana {semana.inicio} — {semana.fin}  ·  Emitido {hoyStr}
        </Text>
      </View>
    </View>
  )
}

function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>LLConsulting  ·  Reporte Semanal</Text>
      <Text
        style={s.pageNumber}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  )
}

function hitoFechaTexto(h: HitoPDF): string {
  if (h.completado && h.fechaCumplimiento) return `Completado ${fmtDate(h.fechaCumplimiento)}`
  if (!h.completado && h.fechaLimite) return `Vence ${fmtDate(h.fechaLimite)}`
  if (!h.completado) return "Pendiente"
  return ""
}

function HitoTimeline({ hitos }: { hitos: HitoPDF[] }) {
  if (hitos.length === 0) return null

  return (
    <View style={{ flexDirection: "column" }}>
      <SectionHeading label="Avance del proceso" />
      {hitos.map((h, i) => (
        <HitoRow key={i} hito={h} />
      ))}
    </View>
  )
}

function HitoRow({ hito }: { hito: HitoPDF }) {
  const dotColor = hito.completado ? C.green : C.border
  const textColor = hito.completado ? C.green : C.navy
  const fechaTxt = hitoFechaTexto(hito)

  return (
    <View style={s.hitoRow}>
      <View style={s.hitoIndicator}>
        <View style={[s.hitoDot, { backgroundColor: dotColor }]} />
      </View>
      <View style={s.hitoContent}>
        <Text style={[s.hitoLine, { color: textColor }]}>
          {hito.nombre}
          {fechaTxt ? <Text style={s.hitoFechaInline}> · {fechaTxt}</Text> : null}
        </Text>
      </View>
    </View>
  )
}

function CandidatoRowPresentado({ c }: { c: CandidatoPresentadoPDF }) {
  const detalle = [
    `Enviado: ${fmtDate(c.fechaEnvio)}`,
    `Respuesta de cliente: ${c.respuestaCliente?.trim() || "Sin respuesta"}`,
    c.fechaRespuesta ? `Fecha: ${fmtDate(c.fechaRespuesta)}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <View wrap={false} style={s.candidatoRow}>
      <View style={s.candidatoNombreWrap}>
        <Text style={s.candidatoNombre}>{c.nombre}</Text>
      </View>
      <View style={s.candidatoDetalleWrap}>
        <Text style={s.candidatoDetalle}>{detalle}</Text>
      </View>
      {c.comentarioCliente?.trim() ? (
        <View style={s.candidatoComentarioWrap}>
          <Text style={s.candidatoComentario}>
            Comentario: {c.comentarioCliente.trim()}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function CandidatoRowSeguimiento({ c }: { c: SeguimientoCandidatoPDF }) {
  const detalle = buildDetalleSeguimiento(c)

  return (
    <View wrap={false} style={s.candidatoRow}>
      <View style={s.candidatoNombreWrap}>
        <Text style={s.candidatoNombre}>{c.nombre}</Text>
      </View>
      {detalle ? (
        <View style={s.candidatoDetalleWrap}>
          <Text style={s.candidatoDetalle}>{detalle}</Text>
        </View>
      ) : null}
      {c.comentarioCliente?.trim() ? (
        <View style={s.candidatoComentarioWrap}>
          <Text style={s.candidatoComentario}>
            Comentario: {c.comentarioCliente.trim()}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function CandidatosPresentadosSection({ items }: { items: CandidatoPresentadoPDF[] }) {
  if (items.length === 0) return null

  return (
    <View style={s.candidatosSection}>
      <SectionHeading label="Presentación inicial de candidatos" />
      {items.map((c, i) => (
        <CandidatoRowPresentado key={i} c={c} />
      ))}
    </View>
  )
}

function buildDetalleSeguimiento(c: SeguimientoCandidatoPDF): string {
  const partes: string[] = []

  if (c.estadoContratacion) {
    partes.push(`Estado contratación: ${c.estadoContratacion}`)
  }
  if (c.estadoInforme) {
    partes.push(`Estado informe: ${c.estadoInforme}`)
  }
  if (c.fechaEnvioInforme) {
    partes.push(`Informe enviado: ${fmtDate(c.fechaEnvioInforme)}`)
  }
  if (c.fechaRespuesta) {
    partes.push(`Fecha: ${fmtDate(c.fechaRespuesta)}`)
  }

  return partes.join(" · ")
}

function SeguimientoCandidatosSection({ seccion }: { seccion: SeguimientoCandidatosPDF | null }) {
  if (!seccion || seccion.candidatos.length === 0) return null

  return (
    <View style={s.candidatosSection}>
      <SectionHeading label={seccion.titulo} />
      {seccion.candidatos.map((c, i) => (
        <CandidatoRowSeguimiento key={i} c={c} />
      ))}
    </View>
  )
}

function ProximosPasosSection({ proceso }: { proceso: ProcesoPDF }) {
  if (proceso.cerradoEstaSemana) return null

  return (
    <View wrap={false} style={s.pasosContainer}>
      <View style={[s.pasosBox, s.pasosBoxLL]}>
        <View style={s.pasosBoxTitleWrap}>
          <Text style={[s.pasosBoxTitle, s.pasosBoxTitleLL]}>
            Próximos pasos LLConsulting
          </Text>
        </View>
        {proceso.proximosPasosLL.length === 0 ? (
          <Text style={s.pasosEmpty}>Sin acciones pendientes</Text>
        ) : (
          proceso.proximosPasosLL.map((paso, i) => (
            <View key={i} style={s.pasosItem}>
              <Text style={s.pasosBullet}>›</Text>
              <Text style={s.pasosText}>{paso}</Text>
            </View>
          ))
        )}
      </View>

      <View style={[s.pasosBox, s.pasosBoxCliente, s.pasosBoxLast]}>
        <View style={s.pasosBoxTitleWrap}>
          <Text style={[s.pasosBoxTitle, s.pasosBoxTitleCliente]}>
            Próximos pasos cliente
          </Text>
        </View>
        {proceso.proximosPasosCliente.length === 0 ? (
          <Text style={s.pasosEmpty}>Sin acciones requeridas</Text>
        ) : (
          proceso.proximosPasosCliente.map((paso, i) => (
            <View key={i} style={s.pasosItem}>
              <Text style={[s.pasosBullet, { color: C.cyan }]}>›</Text>
              <Text style={s.pasosText}>{paso}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  )
}

function ProcesoCardBlock({
  proceso,
  breakBefore = false,
}: {
  proceso: ProcesoPDF
  breakBefore?: boolean
}) {
  const ec = estadoColor(proceso.estadoActual)
  const cerrado = proceso.cerradoEstaSemana
  const nombreServicio = formatServiceName(proceso.nombreServicio)

  return (
    <View style={s.procesoBlock} break={breakBefore}>
      <View style={[s.procesoShell, cerrado ? s.procesoShellCerrado : {}]}>
        <View wrap={false} style={[s.procesoHeader, cerrado ? s.procesoHeaderCerrado : {}]}>
          <View style={{ flex: 1, paddingRight: 8, flexDirection: "column" }}>
            <View style={{ marginBottom: 4 }}>
              <Text style={s.procesoCargo}>{proceso.cargo}</Text>
            </View>
            <View style={{ marginBottom: 4 }}>
              <Text style={s.procesoServicio}>{nombreServicio}</Text>
            </View>
            <View>
              <Text style={s.procesoMeta}>
                Solicitud: {fmtDate(proceso.fechaSolicitud)}
                {cerrado ? `  ·  Cerrado: ${fmtDate(proceso.fechaCierre)}` : ""}
              </Text>
            </View>
          </View>
          <View>
            <Text style={[s.estadoBadge, { backgroundColor: ec.bg, color: ec.text }]}>
              {cerrado ? "Completado" : proceso.estadoActual}
            </Text>
          </View>
        </View>

        <View style={[s.procesoBody, cerrado ? s.procesoBodyCerrado : {}]}>
          <HitoTimeline hitos={proceso.hitos} />
          <CandidatosPresentadosSection items={proceso.candidatosPresentados ?? []} />
          <SeguimientoCandidatosSection seccion={proceso.seguimientoCandidatos ?? null} />
          <ProximosPasosSection proceso={proceso} />
        </View>
      </View>
    </View>
  )
}

function ResumenCliente({
  data,
  activos,
  cerrados,
  resumen,
}: {
  data: ReporteClienteData
  activos: ProcesoPDF[]
  cerrados: ProcesoPDF[]
  resumen: Array<{ servicio: string; cantidad: number; cargos: string[] }>
}) {
  return (
    <>
      <View style={s.clientCard}>
        <View>
          <Text style={s.clientNombre}>{data.cliente.nombre}</Text>
          <Text style={s.clientSub}>
            {activos.length} proceso{activos.length !== 1 ? "s" : ""} activo{activos.length !== 1 ? "s" : ""}
            {cerrados.length > 0
              ? `  ·  ${cerrados.length} cerrado${cerrados.length !== 1 ? "s" : ""} recientemente`
              : ""}
          </Text>
        </View>
        <View style={s.totalBadge}>
          <Text style={s.totalBadgeText}>{data.procesos.length} en total</Text>
        </View>
      </View>

      {resumen.length > 0 && (
        <View style={s.resumenCard}>
          <Text style={s.resumenTitle}>Resumen por tipo de proceso</Text>
          {resumen.map((r, i) => (
            <View
              key={i}
              style={[s.resumenItem, i === resumen.length - 1 ? s.resumenItemLast : {}]}
            >
              <View style={s.resumenBadge}>
                <Text style={s.resumenBadgeText}>{r.cantidad}</Text>
              </View>
              <View style={s.resumenItemBody}>
                <Text style={s.resumenItemType}>{formatServiceName(r.servicio)}</Text>
                <Text style={s.resumenItemCargos}>{r.cargos.join(" · ")}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  )
}

// ── Documento PDF ──────────────────────────────────────────────────────────
function ReportePDFDocument({
  data,
  logoSrc,
}: {
  data: ReporteClienteData
  logoSrc: string
}) {
  const activos = data.procesos.filter((p) => !p.cerradoEstaSemana)
  const cerrados = data.procesos.filter((p) => p.cerradoEstaSemana)
  const resumen = buildResumenProcesos(data.procesos)
  const hoy = new Date()
  const hoyStr = `${hoy.getDate().toString().padStart(2, "0")}/${(hoy.getMonth() + 1).toString().padStart(2, "0")}/${hoy.getFullYear()}`

  const sinProcesos = data.procesos.length === 0

  return (
    <Document
      title={`Reporte Semanal - ${data.cliente.nombre}`}
      author="LLConsulting"
      subject="Reporte semanal de procesos activos"
    >
      <Page size="A4" style={s.page} wrap>
        <PageHeader logoSrc={logoSrc} semana={data.semana} hoyStr={hoyStr} />
        <View style={s.body}>
          <ResumenCliente data={data} activos={activos} cerrados={cerrados} resumen={resumen} />

          {sinProcesos && (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                No hay procesos para mostrar en este reporte.
              </Text>
            </View>
          )}

          {activos.length > 0 && (
            <>
              <View style={s.sectionDividerFirst}>
                <SectionTitle label="Procesos activos" />
              </View>
              {activos.map((p, i) => (
                <ProcesoCardBlock key={p.id} proceso={p} breakBefore={i > 0} />
              ))}
            </>
          )}

          {cerrados.map((p, i) => (
            <ProcesoCardBlock
              key={p.id}
              proceso={p}
              breakBefore={activos.length > 0 || i > 0}
            />
          ))}
        </View>
        <PageFooter />
      </Page>
    </Document>
  )
}

export async function descargarReportePDF(data: ReporteClienteData): Promise<void> {
  // Ceder el hilo antes del layout PDF (evita congelar la UI)
  await new Promise<void>((resolve) => setTimeout(resolve, 0))

  const logoSrc = await loadLogoSrc()

  await new Promise<void>((resolve) => setTimeout(resolve, 0))

  const instance = pdf(<ReportePDFDocument data={data} logoSrc={logoSrc} />)
  const blob = await instance.toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const nombreArchivo = `Reporte_${data.cliente.nombre.replace(/\s+/g, "_")}_Semana_${data.semana.inicio.replace(/\//g, "-")}.pdf`
  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default ReportePDFDocument
