import { ExamenMedico } from '@/models';

export interface ExamenMedicoInput {
    id_postulacion: number;
    id_solicitud: number;
    nombre_documento?: string | null;
    /** Base64 string del archivo (PDF/imagen) para guardar en BD */
    documento_archivo_base64?: string | null;
    estado_aprobacion?: string;
    detalle?: string | null;
}

/**
 * Servicio para gestión de Exámenes Médicos (módulo SC)
 */
export class ExamenMedicoService {
    /**
     * Obtener todos los exámenes de una solicitud (sin incluir el binario por defecto para listados)
     */
    static async getBySolicitud(idSolicitud: number, includeFile = false) {
        return ExamenMedico.findAll({
            where: { id_solicitud: idSolicitud },
            attributes: includeFile ? undefined : ['id_examen_medico', 'id_postulacion', 'id_solicitud', 'nombre_documento', 'estado_aprobacion', 'detalle'],
            order: [['id_examen_medico', 'ASC']]
        });
    }

    /**
     * Obtener exámenes por postulación
     */
    static async getByPostulacion(idPostulacion: number, includeFile = false) {
        return ExamenMedico.findAll({
            where: { id_postulacion: idPostulacion },
            attributes: includeFile ? undefined : ['id_examen_medico', 'id_postulacion', 'id_solicitud', 'nombre_documento', 'estado_aprobacion', 'detalle'],
            order: [['id_examen_medico', 'ASC']]
        });
    }

    /**
     * Obtener un examen por ID (incluye documento para ver/descargar)
     */
    static async getById(id: number) {
        return ExamenMedico.findByPk(id);
    }

    /**
     * Crear examen médico.
     * documento_archivo_base64: string en base64 (data URL o solo base64).
     */
    static async create(data: ExamenMedicoInput) {
        let buffer: Buffer | null = null;
        if (data.documento_archivo_base64) {
            const base64 = data.documento_archivo_base64.replace(/^data:[^;]+;base64,/, '');
            buffer = Buffer.from(base64, 'base64');
        }
        return ExamenMedico.create({
            id_postulacion: data.id_postulacion,
            id_solicitud: data.id_solicitud,
            nombre_documento: data.nombre_documento ?? null,
            documento_archivo: buffer,
            estado_aprobacion: data.estado_aprobacion ?? 'pendiente',
            detalle: data.detalle ?? null
        });
    }

    /**
     * Actualizar examen (nombre, estado; opcionalmente reemplazar archivo)
     */
    static async update(id: number, data: Partial<ExamenMedicoInput>) {
        const examen = await ExamenMedico.findByPk(id);
        if (!examen) return null;
        if (data.nombre_documento !== undefined) examen.nombre_documento = data.nombre_documento;
        if (data.estado_aprobacion !== undefined) examen.estado_aprobacion = data.estado_aprobacion;
        if (data.detalle !== undefined) examen.detalle = data.detalle;
        if (data.documento_archivo_base64 !== undefined) {
            if (data.documento_archivo_base64) {
                const base64 = data.documento_archivo_base64.replace(/^data:[^;]+;base64,/, '');
                examen.documento_archivo = Buffer.from(base64, 'base64');
            } else {
                examen.documento_archivo = null;
            }
        }
        await examen.save();
        return examen;
    }

    /**
     * Eliminar examen
     */
    static async delete(id: number) {
        const examen = await ExamenMedico.findByPk(id);
        if (examen) await examen.destroy();
        return true;
    }
}
