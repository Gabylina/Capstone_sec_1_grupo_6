/**
 * Plantillas de hitos para cada tipo de servicio
 * NOTA: Los días hábiles están sujetos a cambios después de reunión
 */

export type TipoAncla = 
  | 'inicio_proceso'
  | 'publicacion'
  | 'primera_presentacion'
  | 'feedback_cliente'
  | 'evaluacion_psicolaboral'
  | 'entrevista'
  | 'test_psicolaboral'
  | 'contratacion'
  | 'filtro_inteligente'
  | 'publicacion_portales'
  | 'evaluacion_potencial';

export interface PlantillaHito {
    nombre_hito: string;
    tipo_ancla: TipoAncla;
    duracion_dias: number;
    avisar_antes_dias: number;
    descripcion: string;
    codigo_servicio: string;
}

export const PLANTILLAS_HITOS: Record<string, PlantillaHito[]> = {
    // PROCESO COMPLETO (PC) - Aproximadamente 21 días hábiles total
    PC: [
        {
            nombre_hito: "Publicación de cargo",
            tipo_ancla: 'inicio_proceso',
            duracion_dias: 1,
            avisar_antes_dias: 0,
            descripcion: "Publicar el cargo en portales",
            codigo_servicio: "PC"
        },
        {
            nombre_hito: "Presentación de terna inicial",
            tipo_ancla: 'publicacion',
            duracion_dias: 5,
            avisar_antes_dias: 2,
            descripcion: "Presentar primera terna de candidatos al cliente",
            codigo_servicio: "PC"
        },
        {
            nombre_hito: "Entrevistas con candidatos aprobados",
            tipo_ancla: 'primera_presentacion',
            duracion_dias: 5,
            avisar_antes_dias: 2,
            descripcion: "Realizar entrevistas psicolaborales con candidatos aprobados",
            codigo_servicio: "PC"
        },
        {
            nombre_hito: "Presentación de terna final con informe",
            tipo_ancla: 'evaluacion_psicolaboral',
            duracion_dias: 10,
            avisar_antes_dias: 5,
            descripcion: "Entrega de terna final con informes psicolaborales",
            codigo_servicio: "PC"
        }
    ],

    // HUNTING (HH) - Aproximadamente 26 días hábiles total
    HH: [
        {
            nombre_hito: "Publicación de cargo",
            tipo_ancla: 'inicio_proceso',
            duracion_dias: 1,
            avisar_antes_dias: 0,
            descripcion: "Publicar el cargo en portales",
            codigo_servicio: "HH"
        },
        {
            nombre_hito: "Presentación de terna inicial",
            tipo_ancla: 'publicacion',
            duracion_dias: 15,
            avisar_antes_dias: 5,
            descripcion: "Presentar primera terna de candidatos al cliente",
            codigo_servicio: "HH"
        },
        {
            nombre_hito: "Entrevistas con candidatos aprobados",
            tipo_ancla: 'primera_presentacion',
            duracion_dias: 5,
            avisar_antes_dias: 2,
            descripcion: "Realizar entrevistas psicolaborales con candidatos aprobados",
            codigo_servicio: "HH"
        },
        {
            nombre_hito: "Presentación de terna final con informe",
            tipo_ancla: 'evaluacion_psicolaboral',
            duracion_dias: 5,
            avisar_antes_dias: 5,
            descripcion: "Entrega de terna final con informes psicolaborales",
            codigo_servicio: "HH"
        }
    ],

    // LONG LIST (LL) - 10 días hábiles
    LL: [
        {
            nombre_hito: "Publicación de cargo",
            tipo_ancla: 'inicio_proceso',
            duracion_dias: 1,
            avisar_antes_dias: 0,
            descripcion: "Publicar el cargo al día siguiente del ingreso",
            codigo_servicio: "LL"
        },
        {
            nombre_hito: "Presentación de candidatos",
            tipo_ancla: 'publicacion',
            duracion_dias: 10,
            avisar_antes_dias: 5,
            descripcion: "Presentar candidatos al cliente",
            codigo_servicio: "LL"
        }
    ],

    // FILTRO INTELIGENTE (FI) - 10 días hábiles (igual que Long List)
    FI: [
        {
            nombre_hito: "Publicación de cargo",
            tipo_ancla: 'inicio_proceso',
            duracion_dias: 1,
            avisar_antes_dias: 0,
            descripcion: "Publicar el cargo al día siguiente del ingreso",
            codigo_servicio: "FI"
        },
        {
            nombre_hito: "Presentación de candidatos",
            tipo_ancla: 'publicacion',
            duracion_dias: 10,
            avisar_antes_dias: 5,
            descripcion: "Presentar candidatos al cliente",
            codigo_servicio: "FI"
        }
    ],

    // TARGET RECRUITMENT (TR) - 10 días hábiles (proceso abierto)
    TR: [
        {
            nombre_hito: "Publicación de cargo",
            tipo_ancla: 'inicio_proceso',
            duracion_dias: 1,
            avisar_antes_dias: 0,
            descripcion: "Publicar el cargo",
            codigo_servicio: "TR"
        },
        {
            nombre_hito: "Presentación de terna final con informe",
            tipo_ancla: 'publicacion',
            duracion_dias: 10,
            avisar_antes_dias: 5,
            descripcion: "Entrega de terna final con informes",
            codigo_servicio: "TR"
        }
    ],

    // PUBLICACIÓN EN PORTALES (PP) - 5 días hábiles
    PP: [
        {
            nombre_hito: "Publicación de cargo",
            tipo_ancla: 'inicio_proceso',
            duracion_dias: 1,
            avisar_antes_dias: 0,
            descripcion: "Publicar el cargo",
            codigo_servicio: "PP"
        },
        {
            nombre_hito: "Entrega de perfiles y cierre",
            tipo_ancla: 'publicacion',
            duracion_dias: 5,
            avisar_antes_dias: 2,
            descripcion: "Entregar perfiles y finalizar proceso",
            codigo_servicio: "PP"
        }
    ],

    // EVALUACIÓN PSICOLABORAL Y REMOTA (ES) - 2 días hábiles
    ES: [
        {
            nombre_hito: "Agendar entrevista",
            tipo_ancla: 'inicio_proceso',
            duracion_dias: 0,
            avisar_antes_dias: 0,
            descripcion: "Agendar entrevista dentro de 4 horas del mismo día",
            codigo_servicio: "ES"
        },
        {
            nombre_hito: "Envío de informe",
            tipo_ancla: 'entrevista',
            duracion_dias: 2,
            avisar_antes_dias: 1,
            descripcion: "Entregar informe psicolaboral (2 días hábiles desde la entrevista)",
            codigo_servicio: "ES"
        }
    ],

    // EVALUACIÓN POTENCIAL (EP) - 2 días hábiles (igual que ES)
    EP: [
        {
            nombre_hito: "Agendar entrevista",
            tipo_ancla: 'inicio_proceso',
            duracion_dias: 0,
            avisar_antes_dias: 0,
            descripcion: "Agendar entrevista dentro de 4 horas del mismo día",
            codigo_servicio: "EP"
        },
        {
            nombre_hito: "Envío de informe",
            tipo_ancla: 'entrevista',
            duracion_dias: 2,
            avisar_antes_dias: 1,
            descripcion: "Entregar informe de evaluación potencial (2 días hábiles desde la entrevista)",
            codigo_servicio: "EP"
        }
    ],

    // TEST PSICOLABORAL (TS) - 1 día hábil
    TS: [
        {
            nombre_hito: "Agendar test",
            tipo_ancla: 'inicio_proceso',
            duracion_dias: 0,
            avisar_antes_dias: 0,
            descripcion: "Agendar aplicación del test dentro de 4 horas del mismo día",
            codigo_servicio: "TS"
        },
        {
            nombre_hito: "Entrega de resultado",
            tipo_ancla: 'test_psicolaboral',
            duracion_dias: 1,
            avisar_antes_dias: 0,
            descripcion: "Entregar resultado del test (1 día hábil desde la aplicación)",
            codigo_servicio: "TS"
        }
    ]
};

/**
 * Obtiene las plantillas para un código de servicio específico
 * @param codigoServicio - Código del servicio (PC, HH, LL, etc.)
 * @returns Array de plantillas de hitos
 */
export function obtenerPlantillasPorServicio(codigoServicio: string): PlantillaHito[] {
    return PLANTILLAS_HITOS[codigoServicio] || [];
}

/**
 * Obtiene todos los códigos de servicio disponibles
 * @returns Array de códigos de servicio
 */
export function obtenerCodigosServicio(): string[] {
    return Object.keys(PLANTILLAS_HITOS);
}

/**
 * Valida si un código de servicio tiene plantillas definidas
 * @param codigoServicio - Código del servicio a validar
 * @returns true si tiene plantillas, false si no
 */
export function tienePlantillas(codigoServicio: string): boolean {
    return codigoServicio in PLANTILLAS_HITOS && PLANTILLAS_HITOS[codigoServicio].length > 0;
}
