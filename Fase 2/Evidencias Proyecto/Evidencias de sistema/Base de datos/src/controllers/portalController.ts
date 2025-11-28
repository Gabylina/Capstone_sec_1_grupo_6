import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { Logger } from '@/utils/logger';
import { PortalService } from '@/services/portalService';

/**
 * Controlador para gestión de Portales de Postulación
 */

export class PortalController {
    /**
     * GET /api/portales
     * Obtener todos los portales
     */
    static async getAll(req: Request, res: Response): Promise<Response> {
        try {
            const portales = await PortalService.getAllPortales();
            return sendSuccess(res, portales, 'Portales obtenidos exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener portales:', error);
            return sendError(res, error.message || 'Error al obtener portales', 500);
        }
    }

    /**
     * GET /api/portales/:id
     * Obtener un portal específico
     */
    static async getById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const portal = await PortalService.getPortalById(parseInt(id));

            if (!portal) {
                return sendError(res, 'Portal no encontrado', 404);
            }

            return sendSuccess(res, portal, 'Portal obtenido exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener portal:', error);
            return sendError(res, error.message || 'Error al obtener portal', 500);
        }
    }

    /**
     * POST /api/portales
     * Crear un nuevo portal
     */
    static async create(req: Request, res: Response): Promise<Response> {
        try {
            const { nombre_portal_postulacion } = req.body;

            if (!nombre_portal_postulacion) {
                return sendError(res, 'El nombre del portal es requerido', 400);
            }

            const usuarioRut = (req as any).user?.rut;
            const result = await PortalService.createPortal({
                nombre_portal_postulacion
            }, usuarioRut);

            Logger.info(`Portal creado: ${result.id}`);
            return sendSuccess(res, result, 'Portal creado exitosamente', 201);
        } catch (error: any) {
            Logger.error('Error al crear portal:', error);

            if (error.message.includes('ya existe') || error.message.includes('duplicado')) {
                return sendError(res, error.message, 409);
            }

            if (error.message.includes('debe tener') || error.message.includes('no puede exceder')) {
                return sendError(res, error.message, 400);
            }

            return sendError(res, error.message || 'Error al crear portal', 500);
        }
    }

    /**
     * PUT /api/portales/:id
     * Actualizar un portal
     */
    static async update(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { nombre_portal_postulacion } = req.body;

            if (!nombre_portal_postulacion) {
                return sendError(res, 'El nombre del portal es requerido', 400);
            }

            const usuarioRut = (req as any).user?.rut;
            const result = await PortalService.updatePortal(parseInt(id), {
                nombre_portal_postulacion
            }, usuarioRut);

            Logger.info(`Portal actualizado: ${id}`);
            return sendSuccess(res, result, 'Portal actualizado exitosamente');
        } catch (error: any) {
            Logger.error('Error al actualizar portal:', error);

            if (error.message === 'Portal no encontrado') {
                return sendError(res, error.message, 404);
            }

            if (error.message.includes('ya existe') || error.message.includes('duplicado')) {
                return sendError(res, error.message, 409);
            }

            if (error.message.includes('debe tener') || error.message.includes('no puede exceder')) {
                return sendError(res, error.message, 400);
            }

            return sendError(res, error.message || 'Error al actualizar portal', 500);
        }
    }

    /**
     * DELETE /api/portales/:id
     * Eliminar un portal
     */
    static async delete(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const usuarioRut = (req as any).user?.rut;
            const result = await PortalService.deletePortal(parseInt(id), usuarioRut);

            Logger.info(`Portal eliminado: ${id}`);
            return sendSuccess(res, result, 'Portal eliminado exitosamente');
        } catch (error: any) {
            Logger.error('Error al eliminar portal:', error);

            if (error.message === 'Portal no encontrado') {
                return sendError(res, error.message, 404);
            }

            // Si el error menciona publicaciones asociadas, retornar código 409 (Conflict)
            if (error.message.includes('publicación') || error.message.includes('asociada')) {
                return sendError(res, error.message, 409);
            }

            return sendError(res, error.message || 'Error al eliminar portal', 500);
        }
    }
}

