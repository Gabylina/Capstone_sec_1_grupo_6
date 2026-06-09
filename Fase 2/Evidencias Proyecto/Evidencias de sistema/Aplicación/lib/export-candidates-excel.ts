import * as XLSX from "xlsx-js-style"
import type { Candidate, WorkExperience } from "@/lib/types"

const EXCEL_COLUMNS = [
  "N°",
  "Nombre",
  "Teléfono",
  "Mail",
  "Edad",
  "Profesión",
  "Institución Académica",
  "Cursos y/o Capacitaciones",
  "Exp. Profesional y Motivo de Salida 1",
  "Exp. Profesional y Motivo de Salida 2",
  "Exp. Profesional y Motivo de Salida 3",
  "Requisitos Técnicos",
  "Renta Líquida (CLP)",
  "Ciudad",
  "Motivación",
  "Situación Familiar Actual",
  "Comentarios",
  "Disponibilidad",
  "Valoración (1-5)",
  "Estado",
] as const

const COL_MOTIVO_NO_PRESENTADO = "Motivo No Presentado"
const COL_COMENTARIO_AL_PRESENTAR = "Comentario al Presentar"

const FROZEN_COLUMNS = 2
const MIN_COL_WIDTH = 10
const MAX_COL_WIDTH = 55

const PRESENTATION_STATUS_LABELS: Record<string, string> = {
  agregado: "Agregado",
  presentado: "Presentado",
  rechazado: "Rechazado",
  no_presentado: "No Presentado",
}

const HEADER_STYLE = {
  fill: { fgColor: { rgb: "4472C4" } },
  font: { bold: true, color: { rgb: "FFFFFF" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
}

const DATA_STYLE = {
  alignment: { vertical: "top", wrapText: true },
}

const FROZEN_DATA_STYLE = {
  alignment: { vertical: "top", wrapText: true },
  fill: { fgColor: { rgb: "F2F2F2" } },
}

function formatExperienceDate(value?: string): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function getLastExperiences(experiences: WorkExperience[] | undefined, count = 3): WorkExperience[] {
  if (!experiences?.length) return []

  const sorted = [...experiences].sort((a, b) => {
    const endA = a.is_current || !a.end_date ? new Date() : new Date(a.end_date)
    const endB = b.is_current || !b.end_date ? new Date() : new Date(b.end_date)
    if (endA.getTime() !== endB.getTime()) return endB.getTime() - endA.getTime()
    const startA = a.start_date ? new Date(a.start_date).getTime() : 0
    const startB = b.start_date ? new Date(b.start_date).getTime() : 0
    return startB - startA
  })

  return sorted.slice(0, count)
}

function formatExperienceWithExitReason(exp: WorkExperience): string {
  const endLabel = exp.is_current || !exp.end_date ? "Actual" : formatExperienceDate(exp.end_date)
  const dates = `${formatExperienceDate(exp.start_date)} - ${endLabel}`
  const parts: string[] = [`${exp.company || ""} | ${exp.position || ""} (${dates})`]

  if (exp.description?.trim()) {
    parts.push(exp.description.trim())
  }

  const exitReason = exp.exit_reason?.trim()
  if (exitReason) {
    parts.push(`Motivo de salida: ${exitReason}`)
  }

  return parts.join("\n")
}

function getProfessionLabel(candidate: Candidate): string {
  if (candidate.professions?.length) {
    return candidate.professions
      .map((p) => p.profession)
      .filter(Boolean)
      .join("; ")
  }
  return candidate.profession || ""
}

function getAcademicInstitution(candidate: Candidate): string {
  if (candidate.professions?.length) {
    return candidate.professions
      .map((p) => p.institution)
      .filter(Boolean)
      .join("; ")
  }
  return candidate.profession_institution || ""
}

function getCoursesAndTraining(candidate: Candidate): string {
  if (!candidate.education?.length) return ""
  return candidate.education
    .map((edu) => {
      const parts = [edu.title, edu.institution].filter(Boolean)
      return parts.join(" - ")
    })
    .filter(Boolean)
    .join("; ")
}

function getCandidateStatusLabel(candidate: Candidate): string {
  if (candidate.presentation_status) {
    return PRESENTATION_STATUS_LABELS[candidate.presentation_status] || candidate.presentation_status
  }
  const statusMap: Record<string, string> = {
    postulado: "Postulado",
    presentado: "Presentado",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    contratado: "Contratado",
    agregado: "Agregado",
    no_presentado: "No Presentado",
  }
  return statusMap[candidate.status] || candidate.status || ""
}

/** Entero CLP sin decimales (ej. 2500000, no 2500000.00) */
function formatClpSalary(candidate: Candidate): string {
  const fromPortal = candidate.portal_responses?.salary_expectation?.trim()
  const raw =
    fromPortal ||
    (candidate.salary_expectation != null ? String(candidate.salary_expectation) : "")

  if (!raw) return ""

  const digits = raw.replace(/[^\d]/g, "")
  if (!digits) return raw

  const amount = parseInt(digits, 10)
  if (Number.isNaN(amount)) return raw

  return String(amount)
}

function getCityLabel(candidate: Candidate): string {
  if (candidate.comuna && candidate.region) {
    return `${candidate.comuna}, ${candidate.region}`
  }
  return candidate.comuna || candidate.region || ""
}

function getRatingNumber(candidate: Candidate): number | "" {
  const rating = candidate.consultant_rating ?? candidate.portal_responses?.rating
  if (rating == null || Number.isNaN(Number(rating))) return ""
  const normalized = Math.round(Number(rating))
  if (normalized < 1 || normalized > 5) return ""
  return normalized
}

function sanitizeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80)
}

function estimateWrappedLines(text: string, colWidth: number): number {
  if (!text) return 1
  const explicitLines = text.split("\n")
  return explicitLines.reduce((total, line) => {
    const effectiveWidth = Math.max(colWidth - 1, 1)
    return total + Math.max(1, Math.ceil(line.length / effectiveWidth))
  }, 0)
}

function getStatusChangeComment(candidate: Candidate): string {
  return candidate.consultant_comment?.trim() || ""
}

export function resolveCandidateExportColumns(candidates: Candidate[]): string[] {
  const columns: string[] = [...EXCEL_COLUMNS]

  const includeNoPresentadoCol = candidates.some(
    (candidate) => candidate.presentation_status === "no_presentado"
  )
  const includePresentadoCommentCol = candidates.some(
    (candidate) =>
      candidate.presentation_status === "presentado" && !!getStatusChangeComment(candidate)
  )

  if (includeNoPresentadoCol) {
    columns.push(COL_MOTIVO_NO_PRESENTADO)
  }
  if (includePresentadoCommentCol) {
    columns.push(COL_COMENTARIO_AL_PRESENTAR)
  }

  return columns
}

function computeColumnWidths(
  rows: Record<string, string | number>[],
  columns: string[]
): { wch: number }[] {
  return columns.map((header) => {
    let maxLen = header.length

    for (const row of rows) {
      const value = String(row[header] ?? "")
      for (const line of value.split("\n")) {
        maxLen = Math.max(maxLen, line.length)
      }
    }

    if (header === "N°") return { wch: 5 }
    if (header === "Nombre") return { wch: Math.min(Math.max(maxLen + 2, 22), 32) }

    return { wch: Math.min(Math.max(maxLen + 2, MIN_COL_WIDTH), MAX_COL_WIDTH) }
  })
}

function applyWorksheetFormatting(
  worksheet: XLSX.WorkSheet,
  rows: Record<string, string | number>[],
  columns: string[]
): void {
  const colWidths = computeColumnWidths(rows, columns)
  worksheet["!cols"] = colWidths

  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1")
  const salaryColIndex = columns.indexOf("Renta Líquida (CLP)")

  worksheet["!rows"] = [{ hpt: 28 }]

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
    let maxLines = 1

    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
      const cell = worksheet[cellAddress]
      if (!cell) continue

      if (rowIndex === 0) {
        cell.s = HEADER_STYLE
        continue
      }

      const isFrozenColumn = colIndex < FROZEN_COLUMNS
      cell.s = isFrozenColumn ? FROZEN_DATA_STYLE : DATA_STYLE

      if (colIndex === salaryColIndex && cell.v !== "" && cell.v != null) {
        cell.v = String(cell.v).replace(/[^\d]/g, "") || cell.v
        cell.t = "s"
      }

      const colWidth = colWidths[colIndex]?.wch ?? MIN_COL_WIDTH
      maxLines = Math.max(maxLines, estimateWrappedLines(String(cell.v ?? ""), colWidth))
    }

    if (rowIndex > 0) {
      if (!worksheet["!rows"]) worksheet["!rows"] = []
      worksheet["!rows"][rowIndex] = { hpt: Math.min(Math.max(18, maxLines * 15), 150) }
    }
  }

  worksheet["!views"] = [
    {
      state: "frozen",
      xSplit: FROZEN_COLUMNS,
      ySplit: 1,
      topLeftCell: "C2",
      activePane: "bottomRight",
    },
  ]
}

export function buildCandidateExcelRows(
  candidates: Candidate[],
  columns: string[] = resolveCandidateExportColumns(candidates)
): Record<string, string | number>[] {
  const includeNoPresentadoCol = columns.includes(COL_MOTIVO_NO_PRESENTADO)
  const includePresentadoCommentCol = columns.includes(COL_COMENTARIO_AL_PRESENTAR)

  return candidates.map((candidate, index) => {
    const experiences = getLastExperiences(candidate.work_experience, 3)
    const statusComment = getStatusChangeComment(candidate)

    const row: Record<string, string | number> = {
      "N°": index + 1,
      Nombre: candidate.name || "",
      Teléfono: candidate.phone || "",
      Mail: candidate.email || "",
      Edad: candidate.age ?? "",
      Profesión: getProfessionLabel(candidate),
      "Institución Académica": getAcademicInstitution(candidate),
      "Cursos y/o Capacitaciones": getCoursesAndTraining(candidate),
      "Exp. Profesional y Motivo de Salida 1": experiences[0]
        ? formatExperienceWithExitReason(experiences[0])
        : "",
      "Exp. Profesional y Motivo de Salida 2": experiences[1]
        ? formatExperienceWithExitReason(experiences[1])
        : "",
      "Exp. Profesional y Motivo de Salida 3": experiences[2]
        ? formatExperienceWithExitReason(experiences[2])
        : "",
      "Requisitos Técnicos": candidate.portal_responses?.software_tools || "",
      "Renta Líquida (CLP)": formatClpSalary(candidate),
      Ciudad: getCityLabel(candidate),
      Motivación: candidate.motivation || candidate.portal_responses?.motivation || "",
      "Situación Familiar Actual": candidate.portal_responses?.family_situation || "",
      Comentarios: candidate.candidate_comments || "",
      Disponibilidad: candidate.availability || candidate.portal_responses?.availability || "",
      "Valoración (1-5)": getRatingNumber(candidate),
      Estado: getCandidateStatusLabel(candidate),
    }

    if (includeNoPresentadoCol) {
      row[COL_MOTIVO_NO_PRESENTADO] =
        candidate.presentation_status === "no_presentado" ? statusComment : ""
    }

    if (includePresentadoCommentCol) {
      row[COL_COMENTARIO_AL_PRESENTAR] =
        candidate.presentation_status === "presentado" ? statusComment : ""
    }

    return row
  })
}

export function getCandidateExportSheetName(serviceType: string): string {
  const type = serviceType.toUpperCase()
  if (type === "LL" || type === "FI") return "Long List"
  if (type === "PC" || type === "HH" || type === "HS") return "Presentación Candidatos"
  return "Candidatos"
}

export function getCandidateExportFilePrefix(serviceType: string): string {
  const type = serviceType.toUpperCase()
  if (type === "LL" || type === "FI") return "Long_List"
  if (type === "PC" || type === "HH" || type === "HS") return "Presentacion_Candidatos"
  return "Candidatos"
}

export function exportCandidatesToExcel(
  candidates: Candidate[],
  options: {
    serviceType: string
    processLabel?: string
    processId?: string | number
  }
): void {
  if (!candidates.length) {
    throw new Error("No hay candidatos para exportar con los filtros activos")
  }

  const columns = resolveCandidateExportColumns(candidates)
  const excelData = buildCandidateExcelRows(candidates, columns)
  const worksheet = XLSX.utils.json_to_sheet(excelData, { header: columns })
  applyWorksheetFormatting(worksheet, excelData, columns)

  const workbook = XLSX.utils.book_new()
  const sheetName = getCandidateExportSheetName(options.serviceType)
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))

  const dateStamp = new Date().toISOString().slice(0, 10)
  const prefix = getCandidateExportFilePrefix(options.serviceType)
  const label = sanitizeFileName(options.processLabel || "Proceso")
  const idPart = options.processId != null ? `_ID${options.processId}` : ""
  const fileName = `${prefix}${idPart}_${label}_${dateStamp}.xlsx`

  XLSX.writeFile(workbook, fileName)
}

export function supportsCandidateExcelExport(serviceType?: string): boolean {
  const type = (serviceType || "").toUpperCase()
  return type === "LL" || type === "FI" || type === "PC" || type === "HH" || type === "HS"
}
