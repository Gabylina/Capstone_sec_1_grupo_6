/** Parsea encuesta_satisfaccion (JSON o nota simple) a dimensiones 1–5 */

/** Tamaño máximo del JSON guardado en contratacion.encuesta_satisfaccion */
export const ENCUESTA_SATISFACCION_MAX_LENGTH = 1000;

/** Máximo para motivo_no (deja margen para el resto del JSON) */
export const ENCUESTA_MOTIVO_NO_MAX_LENGTH = 850;

export const ENCUESTA_ESCALA_LABELS = {
    comunicacion: 'La comunicación durante el proceso fue clara y oportuna.',
    calidad_candidatos: 'La calidad de los candidatos presentados cumplió con el perfil solicitado.',
    tiempo: 'El tiempo de respuesta del equipo fue adecuado.',
    acompanamiento: 'El acompañamiento del consultor generó confianza y seguridad.',
} as const;

export type EncuestaEscalaClave = keyof typeof ENCUESTA_ESCALA_LABELS;

export interface EncuestaSatisfaccionParsed {
    respondida: boolean;
    comunicacion?: number;
    calidad_candidatos?: number;
    tiempo?: number;
    acompanamiento?: number;
    /** @deprecated compatibilidad encuestas antiguas */
    calidad?: number;
    /** @deprecated compatibilidad encuestas antiguas */
    apoyo?: number;
    volveria_trabajar?: boolean;
    motivo_no?: string;
    notaTotal?: number;
}

export interface EncuestaSatisfaccionPayload {
    comunicacion: number;
    calidad_candidatos: number;
    tiempo: number;
    acompanamiento: number;
    volveria_trabajar: boolean;
    motivo_no?: string;
}

function normalizeScore(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
    if (Number.isNaN(n) || n < 1 || n > 5) return undefined;
    return Math.round(n * 100) / 100;
}

function normalizeBool(value: unknown): boolean | undefined {
    if (value === true || value === 'true' || value === 'si' || value === 'sí' || value === 'yes' || value === 1 || value === '1') {
        return true;
    }
    if (value === false || value === 'false' || value === 'no' || value === 0 || value === '0') {
        return false;
    }
    return undefined;
}

function calcularNotaTotal(dimensiones: number[]): number | undefined {
    if (dimensiones.length === 0) return undefined;
    return Math.round((dimensiones.reduce((a, b) => a + b, 0) / dimensiones.length) * 100) / 100;
}

export function parseEncuestaSatisfaccion(raw?: string | null): EncuestaSatisfaccionParsed {
    if (!raw?.trim()) return { respondida: false };

    const trimmed = raw.trim();
    try {
        const data = JSON.parse(trimmed) as Record<string, unknown>;

        const comunicacion = normalizeScore(data.comunicacion ?? data.com);
        const calidad_candidatos = normalizeScore(
            data.calidad_candidatos ?? data.calidadCandidatos ?? data.candidatos
        );
        const tiempo = normalizeScore(data.tiempo ?? data.t ?? data.time);
        const acompanamiento = normalizeScore(
            data.acompanamiento ?? data.apoyo ?? data.sensacion_apoyo ?? data.expertise ?? data.sensación ?? data.a
        );

        // Encuestas antiguas (3 dimensiones)
        const calidadLegacy = normalizeScore(data.calidad ?? data.c ?? data.quality);
        const apoyoLegacy = normalizeScore(
            data.apoyo ?? data.sensacion_apoyo ?? data.expertise
        );

        const volveria_trabajar = normalizeBool(
            data.volveria_trabajar ?? data.volveria ?? data.recontrataria
        );
        const motivo_no =
            typeof data.motivo_no === 'string'
                ? data.motivo_no.trim() || undefined
                : typeof data.motivo === 'string'
                  ? data.motivo.trim() || undefined
                  : undefined;

        const dimensionesNuevas = [comunicacion, calidad_candidatos, tiempo, acompanamiento].filter(
            (v) => v !== undefined
        ) as number[];

        const dimensionesLegacy = [calidadLegacy, tiempo, apoyoLegacy ?? acompanamiento].filter(
            (v) => v !== undefined
        ) as number[];

        let notaTotal = normalizeScore(data.nota_total ?? data.nota ?? data.total ?? data.promedio);
        if (notaTotal === undefined) {
            if (dimensionesNuevas.length >= 4) {
                notaTotal = calcularNotaTotal(dimensionesNuevas);
            } else if (dimensionesLegacy.length > 0) {
                notaTotal = calcularNotaTotal(dimensionesLegacy);
            } else if (dimensionesNuevas.length > 0) {
                notaTotal = calcularNotaTotal(dimensionesNuevas);
            }
        }

        return {
            respondida: true,
            comunicacion,
            calidad_candidatos,
            tiempo,
            acompanamiento,
            calidad: calidadLegacy ?? calidad_candidatos,
            apoyo: apoyoLegacy ?? acompanamiento,
            volveria_trabajar,
            motivo_no,
            notaTotal,
        };
    } catch {
        const simple = normalizeScore(trimmed);
        if (simple !== undefined) {
            return { respondida: true, notaTotal: simple };
        }
        return { respondida: true };
    }
}

export function buildEncuestaSatisfaccionJson(payload: EncuestaSatisfaccionPayload): string {
    const comunicacion = normalizeScore(payload.comunicacion)!;
    const calidad_candidatos = normalizeScore(payload.calidad_candidatos)!;
    const tiempo = normalizeScore(payload.tiempo)!;
    const acompanamiento = normalizeScore(payload.acompanamiento)!;
    const volveria_trabajar = payload.volveria_trabajar;
    const motivo_no = volveria_trabajar
        ? undefined
        : payload.motivo_no?.trim() || undefined;

    if (motivo_no && motivo_no.length > ENCUESTA_MOTIVO_NO_MAX_LENGTH) {
        throw new Error(
            `El motivo no puede exceder ${ENCUESTA_MOTIVO_NO_MAX_LENGTH} caracteres`
        );
    }

    const nota_total = calcularNotaTotal([comunicacion, calidad_candidatos, tiempo, acompanamiento])!;

    const json = JSON.stringify({
        comunicacion,
        calidad_candidatos,
        tiempo,
        acompanamiento,
        volveria_trabajar,
        ...(motivo_no ? { motivo_no } : {}),
        nota_total,
    });

    if (json.length > ENCUESTA_SATISFACCION_MAX_LENGTH) {
        throw new Error(
            `La encuesta excede el tamaño máximo permitido (${ENCUESTA_SATISFACCION_MAX_LENGTH} caracteres)`
        );
    }

    return json;
}

/** Compatibilidad con payloads antiguos del frontend */
export function buildEncuestaSatisfaccionJsonLegacy(payload: {
    calidad: number;
    tiempo: number;
    apoyo: number;
}): string {
    const calidad = normalizeScore(payload.calidad)!;
    const tiempo = normalizeScore(payload.tiempo)!;
    const apoyo = normalizeScore(payload.apoyo)!;
    const nota_total = calcularNotaTotal([calidad, tiempo, apoyo])!;
    return JSON.stringify({ calidad, tiempo, apoyo, nota_total });
}
