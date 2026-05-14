import { Request, Response } from 'express';
import { BolaNieveSolicitudService } from '@/services/bolaNieveSolicitudService';
import { sendSuccess, sendError } from '@/utils/response';

export class BolaNieveSolicitudController {
    static async getBySolicitud(req: Request, res: Response): Promise<Response> {
        try {
            const idSolicitud = parseInt(req.params.id, 10);
            if (Number.isNaN(idSolicitud)) {
                return sendError(res, 'ID de solicitud inválido', 400);
            }
            const result = await BolaNieveSolicitudService.getBySolicitudId(idSolicitud);
            return sendSuccess(res, result, 'OK');
        } catch (error: any) {
            return sendError(res, error.message || 'Error al obtener Bola de Nieve', 500);
        }
    }

    static async upsert(req: Request, res: Response): Promise<Response> {
        try {
            const idSolicitud = parseInt(req.params.id, 10);
            if (Number.isNaN(idSolicitud)) {
                return sendError(res, 'ID de solicitud inválido', 400);
            }
            const body = req.body || {};
            const row = await BolaNieveSolicitudService.upsert(idSolicitud, {
                contacto_personas_rubro: !!body.contacto_personas_rubro,
                detalle_contacto_personas_rubro: body.detalle_contacto_personas_rubro ?? null,
                contacto_empresas_rubro: !!body.contacto_empresas_rubro,
                detalle_contacto_empresas_rubro: body.detalle_contacto_empresas_rubro ?? null,
                busqueda_linkedin: !!body.busqueda_linkedin,
                detalle_busqueda_linkedin: body.detalle_busqueda_linkedin ?? null,
                apoyo_reclutadores: !!body.apoyo_reclutadores,
                detalle_apoyo_reclutadores: body.detalle_apoyo_reclutadores ?? null,
                visitas_terreno: !!body.visitas_terreno,
                detalle_visitas_terreno: body.detalle_visitas_terreno ?? null,
            });
            return sendSuccess(res, row, 'Registro Bola de Nieve guardado');
        } catch (error: any) {
            if (error.message === 'Este tipo de proceso no requiere registro Bola de Nieve') {
                return sendError(res, error.message, 400);
            }
            if (error.message === 'Solicitud no encontrada') {
                return sendError(res, error.message, 404);
            }
            return sendError(res, error.message || 'Error al guardar Bola de Nieve', 500);
        }
    }
}
