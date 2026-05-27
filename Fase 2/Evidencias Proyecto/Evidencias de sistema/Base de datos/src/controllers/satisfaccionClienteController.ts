import { Request, Response } from 'express';
import { SatisfaccionClienteService } from '@/services/satisfaccionClienteService';
import { sendSuccess, sendError } from '@/utils/response';

export class SatisfaccionClienteController {
    static async getDashboard(req: Request, res: Response): Promise<Response> {
        try {
            const service_type = (req.query.service_type as string) || undefined;
            const data = await SatisfaccionClienteService.getDashboard(service_type);
            return sendSuccess(res, data, 'Dashboard de satisfacción obtenido');
        } catch (error: any) {
            return sendError(res, error.message || 'Error al obtener satisfacción del cliente', 500);
        }
    }
}
