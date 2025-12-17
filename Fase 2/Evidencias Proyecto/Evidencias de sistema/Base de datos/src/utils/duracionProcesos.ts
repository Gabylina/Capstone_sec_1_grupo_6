/**
 * Utilidades para obtener la duración en días hábiles de cada tipo de proceso
 */

/**
 * Mapeo de códigos de servicio a días hábiles de duración del proceso completo
 */
const DURACION_PROCESOS: Record<string, number> = {
    'PC': 21,  // Proceso Completo: 21 días hábiles
    'HH': 26,  // Hunting: 26 días hábiles
    'ES': 2,   // Evaluación Psicolaboral / Remota: 2 días hábiles
    'EP': 2,   // Evaluación Potencial: 2 días hábiles (igual que ES)
    'TS': 1,   // Test Psicolaboral: 1 día hábil
    'LL': 11,  // Long List: 11 días hábiles
    'FI': 11,  // Filtro Inteligente: 11 días hábiles (igual que Long List)
    'TR': 11,  // Target Recruitment: 11 días hábiles
    'PP': 6    // Publicación en Portales: 6 días hábiles
};

/**
 * Obtiene la duración en días hábiles para un código de servicio
 * @param codigoServicio - Código del servicio (PC, HH, ES, etc.)
 * @returns Número de días hábiles de duración del proceso, o 30 por defecto si no se encuentra
 */
export function obtenerDuracionProceso(codigoServicio: string): number {
    return DURACION_PROCESOS[codigoServicio] || 30;
}

