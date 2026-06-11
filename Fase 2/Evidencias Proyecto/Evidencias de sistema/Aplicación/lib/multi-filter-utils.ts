/** Valor de filtro multiselect: array vacío = sin filtro (todos) */
export type MultiFilterValue = string[]

export function isFilterActive(value: MultiFilterValue): boolean {
  return value.length > 0
}

export function matchesMultiFilter(
  fieldValue: string | null | undefined,
  selected: MultiFilterValue,
): boolean {
  if (selected.length === 0) return true
  return selected.includes((fieldValue ?? "").trim())
}

/** Filtro de tipo proceso (HH incluye HS) */
export function matchesProcessTypeFilter(
  code: string,
  selected: MultiFilterValue,
): boolean {
  if (selected.length === 0) return true
  return selected.some((f) => {
    if (f === "HH") return code === "HH" || code === "HS"
    return code === f
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
