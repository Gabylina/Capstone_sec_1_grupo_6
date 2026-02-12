import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { Logger } from '@/utils/logger';
import { EntrevistaTecnicaService } from '@/services/entrevistaTecnicaService';

/**
 * Controlador para Entrevistas Técnicas (módulo SC)
 */
export class EntrevistaTecnicaController {
    /**
     * GET /api/entrevistas-tecnicas/solicitud/:idSolicitud
     */
    static async getBySolicitud(req: Request, res: Response): Promise<Response> {
        try {
            const idSolicitud = parseInt(req.params.idSolicitud);
            if (isNaN(idSolicitud)) return sendError(res, 'ID de solicitud inválido', 400);
            const list = await EntrevistaTecnicaService.getBySolicitud(idSolicitud);
            return sendSuccess(res, list, 'Entrevistas obtenidas');
        } catch (error) {
            Logger.error('Error al obtener entrevistas por solicitud:', error);
            return sendError(res, 'Error al obtener entrevistas', 500);
        }
    }

    /**
     * GET /api/entrevistas-tecnicas/postulacion/:idPostulacion
     */
    static async getByPostulacion(req: Request, res: Response): Promise<Response> {
        try {
            const idPostulacion = parseInt(req.params.idPostulacion);
            if (isNaN(idPostulacion)) return sendError(res, 'ID de postulación inválido', 400);
            const entrevista = await EntrevistaTecnicaService.getByPostulacion(idPostulacion);
            return sendSuccess(res, entrevista, 'Entrevista obtenida');
        } catch (error) {
            Logger.error('Error al obtener entrevista por postulación:', error);
            return sendError(res, 'Error al obtener entrevista', 500);
        }
    }

    /**
     * POST /api/entrevistas-tecnicas
     * Crear o actualizar por id_postulacion (upsert)
     */
    static async upsert(req: Request, res: Response): Promise<Response> {
        try {
            const { id_postulacion, id_solicitud, fecha_hora_entrevista, estado_entrevista, resultado, detalle } = req.body;
            if (!id_postulacion || !id_solicitud) return sendError(res, 'id_postulacion e id_solicitud son requeridos', 400);
            const entrevista = await EntrevistaTecnicaService.upsertByPostulacion({
                id_postulacion: Number(id_postulacion),
                id_solicitud: Number(id_solicitud),
                fecha_hora_entrevista: fecha_hora_entrevista || null,
                estado_entrevista,
                resultado: resultado || null,
                detalle: detalle || null
            });
            return sendSuccess(res, entrevista, 'Entrevista guardada', 201);
        } catch (error) {
            Logger.error('Error al guardar entrevista:', error);
            return sendError(res, (error as Error).message || 'Error al guardar entrevista', 500);
        }
    }

    /**
     * PUT /api/entrevistas-tecnicas/:id
     */
    static async update(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return sendError(res, 'ID inválido', 400);
            const { fecha_hora_entrevista, estado_entrevista, resultado, detalle } = req.body;
            const entrevista = await EntrevistaTecnicaService.update(id, {
                fecha_hora_entrevista,
                estado_entrevista,
                resultado,
                detalle
            });
            if (!entrevista) return sendError(res, 'Entrevista no encontrada', 404);
            return sendSuccess(res, entrevista, 'Entrevista actualizada');
        } catch (error) {
            Logger.error('Error al actualizar entrevista:', error);
            return sendError(res, (error as Error).message || 'Error al actualizar entrevista', 500);
        }
    }
}
