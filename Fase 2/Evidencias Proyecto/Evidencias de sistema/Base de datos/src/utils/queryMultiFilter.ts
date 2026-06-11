/** Parsea query param simple o lista separada por comas */
export function parseMultiQuery(
  value: string | string[] | undefined,
): string[] | undefined {
  if (!value) return undefined
  const raw = Array.isArray(value) ? value.join(",") : String(value)
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0 || parts.includes("all")) return undefined
  return parts
}

/** Construye cláusula SQL IN con placeholders nombrados */
export function buildSqlInClause(
  column: string,
  values: string[],
  prefix: string,
): { clause: string; replacements: Record<string, string> } {
  const replacements: Record<string, string> = {}
  const placeholders = values.map((_, i) => {
    const key = `${prefix}${i}`
    replacements[key] = values[i]
    return `:${key}`
  })
  return {
    clause: `${column} IN (${placeholders.join(", ")})`,
    replacements,
  }
}
