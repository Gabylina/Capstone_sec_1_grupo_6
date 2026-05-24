import { Request, Response } from 'express';
import { ClientePortalService } from '@/services/clientePortalService';
import { sendSuccess, sendError } from '@/utils/response';

export class ClientePortalController {
    private static async requireClienteId(req: Request): Promise<number | null> {
        if (req.user?.role !== 'cliente') return null;
        const id = (req.user as any).id_cliente as number | null | undefined;
        if (id) return id;
        return ClientePortalService.getIdClienteForUsuario(req.user!.id);
    }

    static async getResumen(req: Request, res: Response): Promise<Response> {
        try {
            const idCliente = await ClientePortalController.requireClienteId(req);
            if (!idCliente) return sendError(res, 'Acceso solo para usuarios cliente', 403);
            const data = await ClientePortalService.getResumen(idCliente);
            return sendSuccess(res, data, 'Resumen obtenido');
        } catch (error: any) {
            return sendError(res, error.message || 'Error al obtener resumen', 500);
        }
    }

    static async listSolicitudes(req: Request, res: Response): Promise<Response> {
        try {
            const idCliente = await ClientePortalController.requireClienteId(req);
            if (!idCliente) return sendError(res, 'Acceso solo para usuarios cliente', 403);
            const {
                service_type,
                estado,
                fecha_desde,
                fecha_hasta,
                page,
                limit,
            } = req.query;
            const data = await ClientePortalService.listSolicitudes(idCliente, {
                service_type: service_type as string | undefined,
                estado: estado as string | undefined,
                fecha_desde: fecha_desde as string | undefined,
                fecha_hasta: fecha_hasta as string | undefined,
                page: page ? parseInt(String(page), 10) : 1,
                limit: limit ? parseInt(String(limit), 10) : 50,
            });
            return sendSuccess(res, data, 'Procesos obtenidos');
        } catch (error: any) {
            return sendError(res, error.message || 'Error al listar procesos', 500);
        }
    }

    private static noCache(res: Response): void {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    static async getCredencial(req: Request, res: Response): Promise<Response> {
        try {
            ClientePortalController.noCache(res);
            const idCliente = parseInt(req.params.idCliente, 10);
            if (Number.isNaN(idCliente)) return sendError(res, 'ID de cliente inválido', 400);
            const data = await ClientePortalService.getCredencialCliente(idCliente);
            console.log('[cliente-portal] getCredencial', { idCliente, data });
            return sendSuccess(res, data, 'OK');
        } catch (error: any) {
            console.error('[cliente-portal] getCredencial:', error);
            return sendError(res, error.message || 'Error al obtener credenciales', 500);
        }
    }

    static async upsertCredencial(req: Request, res: Response): Promise<Response> {
        try {
            ClientePortalController.noCache(res);
            const idCliente = parseInt(req.params.idCliente, 10);
            if (Number.isNaN(idCliente)) return sendError(res, 'ID de cliente inválido', 400);
            const usuario = (req.body?.usuario ?? req.body?.email ?? '').trim();
            const { password, activo } = req.body || {};
            if (!usuario) {
                return sendError(res, 'El usuario es requerido', 400);
            }
            const existing = await ClientePortalService.getCredencialCliente(idCliente);
            const keepPassword =
                password === '__KEEP__' ||
                password === '' ||
                password == null ||
                password === undefined;
            if (!existing.tiene_credencial && keepPassword) {
                return sendError(res, 'La contraseña es requerida al crear el acceso', 400);
            }
            if (!keepPassword && String(password).length < 6) {
                return sendError(res, 'La contraseña debe tener al menos 6 caracteres', 400);
            }
            const data = await ClientePortalService.upsertCredencialCliente(idCliente, {
                usuario,
                password: keepPassword ? undefined : String(password),
                activo,
            });
            return sendSuccess(res, data, 'Credenciales guardadas');
        } catch (error: any) {
            console.error('[cliente-portal] upsertCredencial:', error);
            const status = error.message?.includes('no encontrado') ? 404 : 400;
            return sendError(res, error.message || 'Error al guardar credenciales', status);
        }
    }

    static async getCredencialesStatus(req: Request, res: Response): Promise<Response> {
        try {
            ClientePortalController.noCache(res);
            const raw = req.query.ids;
            const ids = String(raw ?? '')
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !Number.isNaN(n) && n > 0);
            const data = await ClientePortalService.getCredencialesStatus(ids);
            return sendSuccess(res, data, 'OK');
        } catch (error: any) {
            return sendError(res, error.message || 'Error', 500);
        }
    }

    static async generarCredencial(req: Request, res: Response): Promise<Response> {
        try {
            ClientePortalController.noCache(res);
            const idCliente = parseInt(req.params.idCliente, 10);
            if (Number.isNaN(idCliente)) return sendError(res, 'ID de cliente inválido', 400);
            const data = await ClientePortalService.generarCredencialCliente(idCliente);
            console.log('[cliente-portal] generarCredencial CREADO en BD', {
                idCliente,
                usuario: data.usuario,
                passwordGenerada: !!data.password,
            });
            return sendSuccess(res, data, 'Credenciales generadas');
        } catch (error: any) {
            console.error('[cliente-portal] generarCredencial:', error);
            return sendError(res, error.message || 'Error al generar credenciales', 400);
        }
    }

    static async setCredencialActiva(req: Request, res: Response): Promise<Response> {
        try {
            ClientePortalController.noCache(res);
            const idCliente = parseInt(req.params.idCliente, 10);
            if (Number.isNaN(idCliente)) return sendError(res, 'ID de cliente inválido', 400);
            const activo = req.body?.activo !== false;
            const data = await ClientePortalService.setCredencialActiva(idCliente, activo);
            return sendSuccess(res, data, activo ? 'Acceso activado' : 'Acceso desactivado');
        } catch (error: any) {
            return sendError(res, error.message || 'Error al actualizar acceso', 400);
        }
    }
}
