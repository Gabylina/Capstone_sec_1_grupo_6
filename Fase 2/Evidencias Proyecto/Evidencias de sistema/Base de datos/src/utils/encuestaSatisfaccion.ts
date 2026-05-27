/** Parsea encuesta_satisfaccion (JSON o nota simple) a dimensiones 1–5 */

export interface EncuestaSatisfaccionParsed {
    respondida: boolean;
    calidad?: number;
    tiempo?: number;
    apoyo?: number;
    notaTotal?: number;
}

function normalizeScore(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    if (Number.isNaN(n) || n < 1 || n > 5) return undefined;
    return Math.round(n * 100) / 100;
}

export function parseEncuestaSatisfaccion(raw?: string | null): EncuestaSatisfaccionParsed {
    if (!raw?.trim()) return { respondida: false };

    const trimmed = raw.trim();
    try {
        const data = JSON.parse(trimmed) as Record<string, unknown>;
        const calidad = normalizeScore(data.calidad ?? data.c ?? data.quality);
        const tiempo = normalizeScore(data.tiempo ?? data.t ?? data.time);
        const apoyo = normalizeScore(
            data.apoyo ?? data.sensacion_apoyo ?? data.expertise ?? data.sensación ?? data.a
        );
        let notaTotal = normalizeScore(data.nota_total ?? data.nota ?? data.total ?? data.promedio);

        const dimensiones = [calidad, tiempo, apoyo].filter((v) => v !== undefined) as number[];
        if (notaTotal === undefined && dimensiones.length > 0) {
            notaTotal = Math.round((dimensiones.reduce((a, b) => a + b, 0) / dimensiones.length) * 100) / 100;
        }

        return { respondida: true, calidad, tiempo, apoyo, notaTotal };
    } catch {
        const simple = normalizeScore(trimmed);
        if (simple !== undefined) {
            return { respondida: true, notaTotal: simple };
        }
        return { respondida: true };
    }
}

export function buildEncuestaSatisfaccionJson(payload: {
    calidad: number;
    tiempo: number;
    apoyo: number;
}): string {
    const calidad = normalizeScore(payload.calidad)!;
    const tiempo = normalizeScore(payload.tiempo)!;
    const apoyo = normalizeScore(payload.apoyo)!;
    const nota_total = Math.round(((calidad + tiempo + apoyo) / 3) * 100) / 100;
    return JSON.stringify({ calidad, tiempo, apoyo, nota_total });
}
