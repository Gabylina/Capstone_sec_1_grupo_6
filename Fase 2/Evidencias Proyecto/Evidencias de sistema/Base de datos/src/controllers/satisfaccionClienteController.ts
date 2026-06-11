import { Request, Response } from 'express';
import { SatisfaccionClienteService } from '@/services/satisfaccionClienteService';
import { sendSuccess, sendError } from '@/utils/response';
import { parseMultiQuery } from '@/utils/queryMultiFilter';

export class SatisfaccionClienteController {
    static async getDashboard(req: Request, res: Response): Promise<Response> {
        try {
            const service_type = parseMultiQuery(req.query.service_type as string | string[] | undefined);
            const cliente_id = parseMultiQuery(req.query.cliente_id as string | string[] | undefined);
            const consultor_id = parseMultiQuery(req.query.consultor_id as string | string[] | undefined);
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
