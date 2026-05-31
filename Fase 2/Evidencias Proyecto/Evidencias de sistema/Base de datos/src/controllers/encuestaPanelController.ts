import { Request, Response } from 'express';
import { EncuestaPanelService } from '@/services/encuestaPanelService';
import { sendSuccess, sendError } from '@/utils/response';

export class EncuestaPanelController {
    static async getPanel(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.id, 10);
            if (Number.isNaN(id)) {
                return sendError(res, 'ID de solicitud inválido', 400);
            }
            const data = await EncuestaPanelService.getPanel(id);
            return sendSuccess(res, data, 'Panel de encuesta obtenido');
        } catch (error: any) {
            return sendError(res, error.message || 'Error al obtener panel de encuesta', 500);
        }
    }
}
