import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { Logger } from '@/utils/logger';
import { ExamenMedicoService } from '@/services/examenMedicoService';

/**
 * Controlador para Exámenes Médicos (módulo SC)
 */
export class ExamenMedicoController {
    /**
     * GET /api/examenes-medicos/solicitud/:idSolicitud
     */
    static async getBySolicitud(req: Request, res: Response): Promise<Response> {
        try {
            const idSolicitud = parseInt(req.params.idSolicitud);
            if (isNaN(idSolicitud)) return sendError(res, 'ID de solicitud inválido', 400);
            const list = await ExamenMedicoService.getBySolicitud(idSolicitud, false);
            return sendSuccess(res, list, 'Exámenes obtenidos');
        } catch (error) {
            Logger.error('Error al obtener exámenes por solicitud:', error);
            return sendError(res, 'Error al obtener exámenes', 500);
        }
    }

    /**
     * GET /api/examenes-medicos/postulacion/:idPostulacion
     */
    static async getByPostulacion(req: Request, res: Response): Promise<Response> {
        try {
            const idPostulacion = parseInt(req.params.idPostulacion);
            if (isNaN(idPostulacion)) return sendError(res, 'ID de postulación inválido', 400);
            const list = await ExamenMedicoService.getByPostulacion(idPostulacion, false);
            return sendSuccess(res, list, 'Exámenes obtenidos');
        } catch (error) {
            Logger.error('Error al obtener exámenes por postulación:', error);
            return sendError(res, 'Error al obtener exámenes', 500);
        }
    }

    /**
     * GET /api/examenes-medicos/:id
     * Incluye documento para ver/descargar (documento_archivo como base64)
     */
    static async getById(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return sendError(res, 'ID inválido', 400);
            const examen = await ExamenMedicoService.getById(id);
            if (!examen) return sendError(res, 'Examen no encontrado', 404);
            const plain = examen.get({ plain: true }) as any;
            if (plain.documento_archivo && Buffer.isBuffer(plain.documento_archivo)) {
                plain.documento_archivo_base64 = plain.documento_archivo.toString('base64');
            }
            delete plain.documento_archivo;
            return sendSuccess(res, plain, 'Examen obtenido');
        } catch (error) {
            Logger.error('Error al obtener examen:', error);
            return sendError(res, 'Error al obtener examen', 500);
        }
    }

    /**
     * POST /api/examenes-medicos
     * Body: id_postulacion, id_solicitud, nombre_documento?, documento_archivo_base64?, estado_aprobacion?
     */
    static async create(req: Request, res: Response): Promise<Response> {
        try {
            const { id_postulacion, id_solicitud, nombre_documento, documento_archivo_base64, estado_aprobacion } = req.body;
            if (!id_postulacion || !id_solicitud) return sendError(res, 'id_postulacion e id_solicitud son requeridos', 400);
            const examen = await ExamenMedicoService.create({
                id_postulacion: Number(id_postulacion),
                id_solicitud: Number(id_solicitud),
                nombre_documento: nombre_documento || null,
                documento_archivo_base64: documento_archivo_base64 || null,
                estado_aprobacion: estado_aprobacion || 'pendiente'
            });
            return sendSuccess(res, examen, 'Examen creado', 201);
        } catch (error) {
            Logger.error('Error al crear examen:', error);
            return sendError(res, (error as Error).message || 'Error al crear examen', 500);
        }
    }

    /**
     * PUT /api/examenes-medicos/:id
     */
    static async update(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return sendError(res, 'ID inválido', 400);
            const { nombre_documento, documento_archivo_base64, estado_aprobacion } = req.body;
            const examen = await ExamenMedicoService.update(id, {
                nombre_documento,
                documento_archivo_base64,
                estado_aprobacion
            });
            if (!examen) return sendError(res, 'Examen no encontrado', 404);
            return sendSuccess(res, examen, 'Examen actualizado');
        } catch (error) {
            Logger.error('Error al actualizar examen:', error);
            return sendError(res, (error as Error).message || 'Error al actualizar examen', 500);
        }
    }

    /**
     * DELETE /api/examenes-medicos/:id
     */
    static async delete(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return sendError(res, 'ID inválido', 400);
            await ExamenMedicoService.delete(id);
            return sendSuccess(res, null, 'Examen eliminado');
        } catch (error) {
            Logger.error('Error al eliminar examen:', error);
            return sendError(res, (error as Error).message || 'Error al eliminar examen', 500);
        }
    }
}
