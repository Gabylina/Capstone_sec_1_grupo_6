import { EntrevistaTecnica } from '@/models';

export interface EntrevistaTecnicaInput {
    id_postulacion: number;
    id_solicitud: number;
    fecha_hora_entrevista?: string | Date | null;
    estado_entrevista?: string;
    resultado?: string | null;
    detalle?: string | null;
}

/**
 * Servicio para gestión de Entrevistas Técnicas (módulo SC)
 */
export class EntrevistaTecnicaService {
    /**
     * Obtener todas las entrevistas de una solicitud
     */
    static async getBySolicitud(idSolicitud: number) {
        return EntrevistaTecnica.findAll({
            where: { id_solicitud: idSolicitud },
            order: [['id_entrevista_tecnica', 'ASC']]
        });
    }

    /**
     * Obtener entrevista por postulación
     */
    static async getByPostulacion(idPostulacion: number) {
        return EntrevistaTecnica.findOne({
            where: { id_postulacion: idPostulacion }
        });
    }

    /**
     * Obtener entrevista por ID
     */
    static async getById(id: number) {
        return EntrevistaTecnica.findByPk(id);
    }

    /**
     * Crear o actualizar entrevista por id_postulacion
     */
    static async upsertByPostulacion(data: EntrevistaTecnicaInput) {
        const fecha = data.fecha_hora_entrevista
            ? (typeof data.fecha_hora_entrevista === 'string' ? new Date(data.fecha_hora_entrevista) : data.fecha_hora_entrevista)
            : null;
        let entrevista = await EntrevistaTecnica.findOne({ where: { id_postulacion: data.id_postulacion } });
        if (entrevista) {
            await entrevista.update({
                fecha_hora_entrevista: fecha,
                estado_entrevista: data.estado_entrevista ?? entrevista.estado_entrevista,
                resultado: data.resultado ?? entrevista.resultado,
                detalle: data.detalle ?? entrevista.detalle
            });
            return entrevista;
        }
        return EntrevistaTecnica.create({
            id_postulacion: data.id_postulacion,
            id_solicitud: data.id_solicitud,
            fecha_hora_entrevista: fecha,
            estado_entrevista: data.estado_entrevista ?? 'programada',
            resultado: data.resultado ?? null,
            detalle: data.detalle ?? null
        });
    }

    /**
     * Actualizar entrevista por ID
     */
    static async update(id: number, data: Partial<EntrevistaTecnicaInput>) {
        const entrevista = await EntrevistaTecnica.findByPk(id);
        if (!entrevista) return null;
        if (data.fecha_hora_entrevista !== undefined) {
            (entrevista as any).fecha_hora_entrevista = data.fecha_hora_entrevista
                ? (typeof data.fecha_hora_entrevista === 'string' ? new Date(data.fecha_hora_entrevista) : data.fecha_hora_entrevista)
                : null;
        }
        if (data.estado_entrevista !== undefined) entrevista.estado_entrevista = data.estado_entrevista;
        if (data.resultado !== undefined) entrevista.resultado = data.resultado;
        if (data.detalle !== undefined) entrevista.detalle = data.detalle;
        await entrevista.save();
        return entrevista;
    }
}
