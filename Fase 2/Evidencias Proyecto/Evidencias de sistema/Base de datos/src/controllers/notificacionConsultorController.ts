import { Request, Response } from 'express';
import { NotificacionConsultorService } from '@/services/notificacionConsultorService';
import { sendSuccess, sendError } from '@/utils/response';

export class NotificacionConsultorController {
    static async getMisNotificaciones(req: Request, res: Response): Promise<Response> {
        try {
            const rut = req.user?.id;
            if (!rut) {
                return sendError(res, 'Usuario no autenticado', 401);
            }
            const soloNoLeidas = req.query.solo_no_leidas === '1';
            const items = await NotificacionConsultorService.listarPorConsultor(rut, soloNoLeidas);
            const noLeidas = await NotificacionConsultorService.contarNoLeidas(rut);
            return sendSuccess(res, { items, no_leidas: noLeidas }, 'OK');
        } catch (error: any) {
            return sendError(res, error.message || 'Error al obtener notificaciones', 500);
        }
    }

    static async marcarLeida(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.id, 10);
            const rut = req.user?.id;
            if (!rut) return sendError(res, 'Usuario no autenticado', 401);
            await NotificacionConsultorService.marcarLeida(id, rut);
            return sendSuccess(res, null, 'Notificación marcada como leída');
        } catch (error: any) {
            return sendError(res, error.message || 'Error', 404);
        }
    }

    static async marcarTodasLeidas(req: Request, res: Response): Promise<Response> {
        try {
            const rut = req.user?.id;
            if (!rut) return sendError(res, 'Usuario no autenticado', 401);
            await NotificacionConsultorService.marcarTodasLeidas(rut);
            return sendSuccess(res, null, 'Notificaciones marcadas como leídas');
        } catch (error: any) {
            return sendError(res, error.message || 'Error', 500);
        }
    }
}
