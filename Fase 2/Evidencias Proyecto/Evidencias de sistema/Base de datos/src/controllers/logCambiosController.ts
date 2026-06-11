import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { Logger } from '@/utils/logger';
import { parseMultiQuery } from '@/utils/queryMultiFilter';
import { LogCambiosService } from '@/services/logCambiosService';

/**
 * Controlador para consulta de Log de Cambios
 * Solo incluye operaciones de lectura
 */

export class LogCambiosController {
    /**
     * GET /api/logs
     * Obtener todos los logs (con paginación)
     */
    static async getAll(req: Request, res: Response): Promise<Response> {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
            const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
            
            const logs = await LogCambiosService.getAllLogs(limit, offset);
            return sendSuccess(res, logs, 'Logs obtenidos exitosamente');
        } catch (error) {
            Logger.error('Error al obtener logs:', error);
            return sendError(res, 'Error al obtener logs', 500);
        }
    }

    /**
     * GET /api/logs/tabla/:tabla
     * Obtener logs por tabla
     */
    static async getByTabla(req: Request, res: Response): Promise<Response> {
        try {
            const { tabla } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
            
            const logs = await LogCambiosService.getLogsByTabla(tabla, limit);
            return sendSuccess(res, logs, 'Logs obtenidos exitosamente');
        } catch (error) {
            Logger.error('Error al obtener logs:', error);
            return sendError(res, 'Error al obtener logs', 500);
        }
    }

    /**
     * GET /api/logs/registro/:tabla/:id
     * Obtener logs de un registro específico
     */
    static async getByRegistro(req: Request, res: Response): Promise<Response> {
        try {
            const { tabla, id } = req.params;
            const logs = await LogCambiosService.getLogsByRegistro(tabla, id);
            return sendSuccess(res, logs, 'Logs del registro obtenidos exitosamente');
        } catch (error) {
            Logger.error('Error al obtener logs:', error);
            return sendError(res, 'Error al obtener logs', 500);
        }
    }

    /**
     * GET /api/logs/historial/:tabla/:id
     * Obtener historial completo de un registro
     */
    static async getHistorial(req: Request, res: Response): Promise<Response> {
        try {
            const { tabla, id } = req.params;
            const historial = await LogCambiosService.getHistorialRegistro(tabla, id);
            return sendSuccess(res, historial, 'Historial obtenido exitosamente');
        } catch (error) {
            Logger.error('Error al obtener historial:', error);
            return sendError(res, 'Error al obtener historial', 500);
        }
    }

    /**
     * GET /api/logs/usuario/:usuario
     * Obtener logs por usuario
     */
    static async getByUsuario(req: Request, res: Response): Promise<Response> {
        try {
            const { usuario } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
            
            const logs = await LogCambiosService.getLogsByUsuario(usuario, limit);
            return sendSuccess(res, logs, 'Logs del usuario obtenidos exitosamente');
        } catch (error) {
            Logger.error('Error al obtener logs:', error);
            return sendError(res, 'Error al obtener logs', 500);
        }
    }

    /**
     * GET /api/logs/accion/:accion
     * Obtener logs por tipo de acción
     */
    static async getByAccion(req: Request, res: Response): Promise<Response> {
        try {
            const { accion } = req.params;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
            
            const logs = await LogCambiosService.getLogsByAccion(accion, limit);
            return sendSuccess(res, logs, 'Logs de la acción obtenidos exitosamente');
        } catch (error) {
            Logger.error('Error al obtener logs:', error);
            return sendError(res, 'Error al obtener logs', 500);
        }
    }

    /**
     * GET /api/logs/fechas
     * Obtener logs por rango de fechas
     */
    static async getByFechas(req: Request, res: Response): Promise<Response> {
        try {
            const { fecha_inicio, fecha_fin } = req.query;
            
            if (!fecha_inicio || !fecha_fin) {
                return sendError(res, 'Debe proporcionar fecha_inicio y fecha_fin', 400);
            }
            
            const logs = await LogCambiosService.getLogsByFechas(
                new Date(fecha_inicio as string),
                new Date(fecha_fin as string)
            );
            
            return sendSuccess(res, logs, 'Logs obtenidos exitosamente');
        } catch (error) {
            Logger.error('Error al obtener logs:', error);
            return sendError(res, 'Error al obtener logs', 500);
        }
    }

    /**
     * GET /api/logs/search
     * Buscar logs con filtros combinados
     */
    static async search(req: Request, res: Response): Promise<Response> {
        try {
            const { fecha_inicio, fecha_fin, limit, offset } = req.query;
            
            const filters: any = {};
            
            const tabla = parseMultiQuery(req.query.tabla as string | string[] | undefined);
            const usuario = parseMultiQuery(req.query.usuario as string | string[] | undefined);
            const accion = parseMultiQuery(req.query.accion as string | string[] | undefined);
            if (tabla) filters.tabla = tabla;
            if (usuario) filters.usuario = usuario;
            if (accion) filters.accion = accion;
            if (fecha_inicio) filters.fechaInicio = new Date(fecha_inicio as string);
            if (fecha_fin) filters.fechaFin = new Date(fecha_fin as string);
            if (limit) filters.limit = parseInt(limit as string);
            if (offset) filters.offset = parseInt(offset as string);
            
            const logs = await LogCambiosService.searchLogs(filters);
            return sendSuccess(res, logs, 'Logs obtenidos exitosamente');
        } catch (error) {
            Logger.error('Error al buscar logs:', error);
            return sendError(res, 'Error al buscar logs', 500);
        }
    }

    /**
     * GET /api/logs/estadisticas
     * Obtener estadísticas de cambios
     */
    static async getEstadisticas(req: Request, res: Response): Promise<Response> {
        try {
            const estadisticas = await LogCambiosService.getEstadisticas();
            return sendSuccess(res, estadisticas, 'Estadísticas obtenidas exitosamente');
        } catch (error) {
            Logger.error('Error al obtener estadísticas:', error);
            return sendError(res, 'Error al obtener estadísticas', 500);
        }
    }

    /**
     * GET /api/logs/reciente
     * Obtener actividad reciente
     */
    static async getReciente(req: Request, res: Response): Promise<Response> {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const logs = await LogCambiosService.getActividadReciente(limit);
            return sendSuccess(res, logs, 'Actividad reciente obtenida exitosamente');
        } catch (error) {
            Logger.error('Error al obtener actividad reciente:', error);
            return sendError(res, 'Error al obtener actividad reciente', 500);
        }
    }

    /**
     * GET /api/logs/:id
     * Obtener un log específico
     */
    static async getById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const log = await LogCambiosService.getLogById(parseInt(id));

            if (!log) {
                return sendError(res, 'Log no encontrado', 404);
            }

            return sendSuccess(res, log, 'Log obtenido exitosamente');
        } catch (error) {
            Logger.error('Error al obtener log:', error);
            return sendError(res, 'Error al obtener log', 500);
        }
    }

    /**
     * GET /api/logs/stats
     * Obtener estadísticas simplificadas
     */
    static async getStats(req: Request, res: Response): Promise<Response> {
        try {
            const stats = await LogCambiosService.getStats();
            return sendSuccess(res, stats, 'Estadísticas obtenidas exitosamente');
        } catch (error) {
            Logger.error('Error al obtener estadísticas:', error);
            return sendError(res, 'Error al obtener estadísticas', 500);
        }
    }
}

