/** Valor de filtro multiselect: array vacío = sin filtro (todos) */
export type MultiFilterValue = string[]

export function isFilterActive(value: MultiFilterValue): boolean {
  return value.length > 0
}

function normalizeFilterToken(value: string): string {
  return value.trim().toLocaleLowerCase("es-CL")
}

export function matchesMultiFilter(
  fieldValue: string | null | undefined,
  selected: MultiFilterValue,
): boolean {
  if (selected.length === 0) return true
  const normalizedField = normalizeFilterToken(fieldValue ?? "")
  if (!normalizedField) return false
  return selected.some((item) => normalizeFilterToken(item) === normalizedField)
}

/** Filtro de tipo proceso (HH incluye HS; comparación sin distinguir mayúsculas) */
export function matchesProcessTypeFilter(
  code: string,
  selected: MultiFilterValue,
): boolean {
  if (selected.length === 0) return true
  const normalizedCode = code.trim().toUpperCase()
  return selected.some((f) => {
    const filterCode = f.trim().toUpperCase()
    if (filterCode === "HH") return normalizedCode === "HH" || normalizedCode === "HS"
    return normalizedCode === filterCode
  })
}

export function appendMultiQueryParam(
  params: URLSearchParams,
  key: string,
  values: MultiFilterValue,
): void {
  if (values.length > 0) {
    params.append(key, values.join(","))
  }
}

export function getMultiFilterLabel(
  values: MultiFilterValue,
  options: Array<{ value: string; label: string }>,
  emptyLabel = "Todos",
): string {
  if (values.length === 0) return emptyLabel
  if (values.length === 1) {
    return options.find((o) => o.value === values[0])?.label ?? values[0]
  }
  return `${values.length} seleccionados`
}
