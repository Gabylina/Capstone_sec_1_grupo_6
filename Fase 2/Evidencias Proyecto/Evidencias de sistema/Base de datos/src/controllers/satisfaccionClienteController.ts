import { Request, Response } from 'express';
import { SatisfaccionClienteService } from '@/services/satisfaccionClienteService';
import { sendSuccess, sendError } from '@/utils/response';

export class SatisfaccionClienteController {
    static async getDashboard(req: Request, res: Response): Promise<Response> {
        try {
            const service_type = (req.query.service_type as string) || undefined;
            const cliente_id = (req.query.cliente_id as string) || undefined;
            const consultor_id = (req.query.consultor_id as string) || undefined;
            const data = await SatisfaccionClienteService.getDashboard({
                serviceType: service_type,
                clienteId: cliente_id,
                consultorRut: consultor_id,
            });
            return sendSuccess(res, data, 'Dashboard de satisfacción obtenido');
        } catch (error: any) {
            return sendError(res, error.message || 'Error al obtener satisfacción del cliente', 500);
        }
    }
}
