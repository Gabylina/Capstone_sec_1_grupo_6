import { Request, Response } from 'express';
import { AprobacionCandidatoService } from '@/services/aprobacionCandidatoService';
import { sendSuccess, sendError } from '@/utils/response';

export class AprobacionCandidatoController {
    static async listBySolicitud(req: Request, res: Response): Promise<Response> {
        try {
            const idSolicitud = parseInt(req.params.idSolicitud, 10);
            if (Number.isNaN(idSolicitud)) {
                return sendError(res, 'ID de solicitud inválido', 400);
            }
            const result = await AprobacionCandidatoService.listBySolicitud(idSolicitud);
            return sendSuccess(res, result, 'OK');
        } catch (error: any) {
            return sendError(res, error.message || 'Error al listar aprobaciones', 500);
        }
    }

    static async enviarARevision(req: Request, res: Response): Promise<Response> {
        try {
            const idPostulacion = parseInt(req.params.idPostulacion, 10);
            if (Number.isNaN(idPostulacion)) {
                return sendError(res, 'ID de postulación inválido', 400);
            }
            if (req.user?.role === 'admin') {
                return sendError(res, 'Solo el consultor puede enviar candidatos a revisión', 403);
            }
            const rut = req.user?.id;
            if (!rut) {
                return sendError(res, 'Usuario no autenticado', 401);
            }
            const row = await AprobacionCandidatoService.enviarARevision(idPostulacion, rut);
            return sendSuccess(res, row, 'Candidato enviado a revisión');
        } catch (error: any) {
            if (error.message?.includes('no requiere')) return sendError(res, error.message, 400);
            if (error.message?.includes('ya está') || error.message?.includes('ya fue')) {
                return sendError(res, error.message, 409);
            }
            return sendError(res, error.message || 'Error al enviar a revisión', 500);
        }
    }

    static async resolver(req: Request, res: Response): Promise<Response> {
        try {
            const idPostulacion = parseInt(req.params.idPostulacion, 10);
            if (Number.isNaN(idPostulacion)) {
                return sendError(res, 'ID de postulación inválido', 400);
            }
            const { estado, motivo } = req.body || {};
            const valid = ['aprobado', 'rechazado', 'observado'];
            if (!valid.includes(estado)) {
                return sendError(res, 'Estado inválido. Use: aprobado, rechazado u observado', 400);
            }
            if (req.user?.role !== 'admin') {
                return sendError(res, 'Solo la coordinadora (administrador) puede resolver la aprobación', 403);
            }
            const rut = req.user?.id;
            if (!rut) {
                return sendError(res, 'Usuario no autenticado', 401);
            }
            const row = await AprobacionCandidatoService.resolver(
                idPostulacion,
                estado,
                motivo,
                rut
            );
            return sendSuccess(res, row, 'Decisión registrada');
        } catch (error: any) {
            if (error.message?.includes('motivo') || error.message?.includes('revisión')) {
                return sendError(res, error.message, 400);
            }
            return sendError(res, error.message || 'Error al registrar decisión', 500);
        }
    }
}
