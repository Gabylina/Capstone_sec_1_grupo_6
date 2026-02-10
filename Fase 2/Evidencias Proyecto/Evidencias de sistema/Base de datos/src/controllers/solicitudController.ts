import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { Logger } from '@/utils/logger';
import { parseLocalDate } from '@/utils/validators';
import { SolicitudService } from '@/services/solicitudService';

/**
 * Controlador para gestión de Solicitudes (Process en frontend)
 * Delega la lógica de negocio al SolicitudService
 */

export class SolicitudController {
    /**
     * GET /api/solicitudes
     * Obtener solicitudes paginadas con filtros opcionales
     */
    static async getAll(req: Request, res: Response): Promise<Response> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = (req.query.search as string) || "";
            const status = (req.query.status as "creado" | "en_progreso" | "cerrado" | "congelado" | "cancelado" | "cierre_extraordinario") || undefined;
            const service_type = (req.query.service_type as string) || undefined;
            const consultor_id = (req.query.consultor_id as string) || undefined;
            const cliente_id = (req.query.cliente_id as string) || undefined;
            const exclude_status = (req.query.exclude_status as "creado" | "en_progreso" | "cerrado" | "congelado" | "cancelado" | "cierre_extraordinario") || undefined;
            const sortBy = (req.query.sortBy as "fecha" | "cargo" | "cliente") || "fecha";
            const sortOrder = (req.query.sortOrder as "ASC" | "DESC") || "DESC";

            const result = await SolicitudService.getSolicitudes(page, limit, search, status, service_type, consultor_id, exclude_status, sortBy, sortOrder, cliente_id);
            return sendSuccess(res, result, "Solicitudes obtenidas correctamente");
        } catch (error: any) {
            Logger.error('Error al obtener solicitudes:', error);
            return sendError(res, error.message || "Error al obtener solicitudes", 500);
        }
    }

    /**
     * GET /api/solicitudes/stats
     * Obtener contadores (total, en_progreso, completadas, pendientes) con los mismos filtros que la lista
     */
    static async getStats(req: Request, res: Response): Promise<Response> {
        try {
            const search = (req.query.search as string) || "";
            const status = (req.query.status as "creado" | "en_progreso" | "cerrado" | "congelado" | "cancelado" | "cierre_extraordinario") || undefined;
            const service_type = (req.query.service_type as string) || undefined;
            const consultor_id = (req.query.consultor_id as string) || undefined;
            const cliente_id = (req.query.cliente_id as string) || undefined;

            const stats = await SolicitudService.getFilteredStats(search, status, service_type, consultor_id, cliente_id);
            return sendSuccess(res, stats, "Estadísticas obtenidas correctamente");
        } catch (error: any) {
            Logger.error("Error al obtener estadísticas de solicitudes:", error);
            return sendError(res, error.message || "Error al obtener estadísticas", 500);
        }
    }

    /**
     * GET /api/solicitudes/all
     * Obtener todas las solicitudes con filtros opcionales (sin paginación)
     */
    static async getAllSolicitudes(req: Request, res: Response): Promise<Response> {
        try {
            const { status, service_type, consultor_id } = req.query;
            
            const solicitudes = await SolicitudService.getAllSolicitudes({
                status: status as string,
                service_type: service_type as string,
                consultor_id: consultor_id as string
            });

            return sendSuccess(res, solicitudes, 'Solicitudes obtenidas exitosamente');
        } catch (error) {
            Logger.error('Error al obtener solicitudes:', error);
            return sendError(res, 'Error al obtener solicitudes', 500);
        }
    }

    /**
     * GET /api/solicitudes/:id
     * Obtener una solicitud específica
     */
    static async getById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            
            // Validar que el ID sea un número válido
            const solicitudId = parseInt(id);
            if (isNaN(solicitudId)) {
                return sendError(res, 'ID de solicitud inválido', 400);
            }
            
            const solicitud = await SolicitudService.getSolicitudById(solicitudId);

            if (!solicitud) {
                return sendError(res, 'Solicitud no encontrada', 404);
            }

            return sendSuccess(res, solicitud, 'Solicitud obtenida exitosamente');
        } catch (error) {
            Logger.error('Error al obtener solicitud:', error);
            return sendError(res, 'Error al obtener solicitud', 500);
        }
    }

    /**
     * GET /api/solicitudes/consultor/:rutUsuario
     * Obtener solicitudes por consultor
     */
    static async getByConsultor(req: Request, res: Response): Promise<Response> {
        try {
            const { rutUsuario } = req.params;
            const { status } = req.query;

            const solicitudes = await SolicitudService.getAllSolicitudes({
                consultor_id: rutUsuario,
                status: status as string
            });

            return sendSuccess(res, solicitudes, 'Solicitudes obtenidas exitosamente');
        } catch (error) {
            Logger.error('Error al obtener solicitudes por consultor:', error);
            return sendError(res, 'Error al obtener solicitudes', 500);
        }
    }

    /**
     * POST /api/solicitudes
     * Crear nueva solicitud con descripción de cargo
     */
    static async create(req: Request, res: Response): Promise<Response> {
        try {
            const {
                contact_id,
                service_type,
                position_title,
                id_comuna,
                description,
                requirements,
                vacancies,
                consultant_id,
                deadline_days,
                fecha_ingreso_solicitud
            } = req.body;

            const nuevaSolicitud = await SolicitudService.createSolicitud({
                contact_id: parseInt(contact_id),
                service_type,
                position_title,
                id_comuna: parseInt(id_comuna),
                description,
                requirements,
                vacancies: vacancies ? parseInt(vacancies) : undefined,
                consultant_id,
                deadline_days: deadline_days ? parseInt(deadline_days) : undefined,
                fecha_ingreso_solicitud: fecha_ingreso_solicitud ? parseLocalDate(fecha_ingreso_solicitud) : undefined
            }, req.user?.id);

            Logger.info(`Solicitud creada: ${nuevaSolicitud.id}`);
            return sendSuccess(res, nuevaSolicitud, 'Solicitud creada exitosamente', 201);
        } catch (error: any) {
            Logger.error('Error al crear solicitud:', error);
            return sendError(res, error.message || 'Error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente.', 400);
        }
    }

    /**
     * PUT /api/solicitudes/:id/estado
     * Cambiar estado de la solicitud (Abierto, En Progreso, Cerrado, Congelado)
     */
    static async updateEstado(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { status, reason, id_estado } = req.body;

            // Si se envía id_estado, usar el método de cambio por ID
            if (id_estado) {
                await SolicitudService.cambiarEstado(parseInt(id), parseInt(id_estado), reason, req.user?.id);
                Logger.info(`Estado de solicitud ${id} cambiado a ID: ${id_estado}`);
            } else {
                // Mantener compatibilidad con el método anterior
                await SolicitudService.updateEstado(parseInt(id), { status, reason }, req.user?.id);
                Logger.info(`Estado actualizado para solicitud ${id}: ${status}`);
            }

            return sendSuccess(res, null, 'Estado actualizado exitosamente');
        } catch (error: any) {
            Logger.error('Error al actualizar estado:', error);
            
            if (error.message === 'Solicitud no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            if (error.message === 'Estado no válido') {
                return sendError(res, error.message, 400);
            }
            
            return sendError(res, error.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.', 500);
        }
    }

    /**
     * PUT /api/solicitudes/:id/etapa
     * Cambiar etapa de la solicitud (Módulo 1, 2, 3, 4, 5)
     */
    static async cambiarEtapa(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { id_etapa } = req.body;

            const resultado = await SolicitudService.cambiarEtapa(parseInt(id), parseInt(id_etapa), req.user?.id);

            Logger.info(`Etapa actualizada para solicitud ${id}: ${resultado.etapa}`);
            return sendSuccess(res, resultado, 'Etapa actualizada exitosamente');
        } catch (error: any) {
            Logger.error('Error al cambiar etapa:', error);
            
            if (error.message === 'Solicitud no encontrada' || error.message === 'Etapa no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            return sendError(res, error.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.', 500);
        }
    }

    /**
     * DELETE /api/solicitudes/:id
     * Eliminar solicitud
     */
    static async delete(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            await SolicitudService.deleteSolicitud(parseInt(id), req.user?.id);

            Logger.info(`Solicitud eliminada: ${id}`);
            return sendSuccess(res, null, 'Solicitud eliminada exitosamente');
        } catch (error: any) {
            Logger.error('Error al eliminar solicitud:', error);
            
            if (error.message === 'Solicitud no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            return sendError(res, error.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.', 500);
        }
    }

    /**
     * PUT /api/solicitudes/:id
     * Actualizar información de una solicitud y su descripción de cargo
     */
    static async update(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const {
                contact_id,
                service_type,
                position_title,
                id_comuna,
                description,
                requirements,
                vacancies,
                consultant_id,
                deadline_days,
                fecha_ingreso_solicitud
            } = req.body;

            const solicitudActualizada = await SolicitudService.updateSolicitud(parseInt(id), {
                contact_id: contact_id ? parseInt(contact_id) : undefined,
                service_type,
                position_title,
                id_comuna: id_comuna ? parseInt(id_comuna) : undefined,
                description,
                requirements,
                vacancies: vacancies ? parseInt(vacancies) : undefined,
                consultant_id,
                deadline_days: deadline_days ? parseInt(deadline_days) : undefined,
                fecha_ingreso_solicitud: fecha_ingreso_solicitud ? parseLocalDate(fecha_ingreso_solicitud) : undefined
            }, req.user?.id);

            Logger.info(`Solicitud actualizada: ${id}`);
            return sendSuccess(res, solicitudActualizada, 'Solicitud actualizada exitosamente');
        } catch (error: any) {
            Logger.error('Error al actualizar solicitud:', error);

            if (error.message === 'Solicitud no encontrada') {
                return sendError(res, error.message, 404);
            }

            return sendError(res, error.message || 'Error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente.', 400);
        }
    }
    /**
     * Avanzar al módulo 2
     */
    static async avanzarAModulo2(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const solicitudId = parseInt(id);

            if (isNaN(solicitudId)) {
                return sendError(res, 'ID de solicitud inválido', 400);
            }

            const result = await SolicitudService.avanzarAModulo2(solicitudId, req.user?.id);
            
            Logger.info(`Solicitud ${solicitudId} avanzada al Módulo 2`);
            return sendSuccess(res, result, result.message);
        } catch (error: any) {
            Logger.error('Error al avanzar al módulo 2:', error);
            
            if (error.message === 'Solicitud no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            if (error.message === 'Etapa Módulo 2 no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            return sendError(res, error.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.', 500);
        }
    }

    /**
     * Avanzar al módulo 3
     */
    static async avanzarAModulo3(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const solicitudId = parseInt(id);

            if (isNaN(solicitudId)) {
                return sendError(res, 'ID de solicitud inválido', 400);
            }

            const result = await SolicitudService.avanzarAModulo3(solicitudId, req.user?.id);
            
            Logger.info(`Solicitud ${solicitudId} avanzada al Módulo 3`);
            return sendSuccess(res, result, result.message);
        } catch (error: any) {
            Logger.error('Error al avanzar al módulo 3:', error);
            
            if (error.message === 'Solicitud no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            if (error.message === 'Etapa Módulo 3 no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            return sendError(res, error.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.', 500);
        }
    }

    /**
     * Avanzar al módulo 4
     */
    static async avanzarAModulo4(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const solicitudId = parseInt(id);

            if (isNaN(solicitudId)) {
                return sendError(res, 'ID de solicitud inválido', 400);
            }

            const result = await SolicitudService.avanzarAModulo4(solicitudId, req.user?.id);
            
            Logger.info(`Solicitud ${solicitudId} avanzada al Módulo 4`);
            return sendSuccess(res, result, result.message);
        } catch (error: any) {
            Logger.error('Error al avanzar al módulo 4:', error);
            
            if (error.message === 'Solicitud no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            if (error.message === 'Etapa Módulo 4 no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            return sendError(res, error.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.', 500);
        }
    }

    /**
     * Avanzar al módulo 5
     */
    static async avanzarAModulo5(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const solicitudId = parseInt(id);

            if (isNaN(solicitudId)) {
                return sendError(res, 'ID de solicitud inválido', 400);
            }

            const result = await SolicitudService.avanzarAModulo5(solicitudId, req.user?.id);
            
            Logger.info(`Solicitud ${solicitudId} avanzada al Módulo 5`);
            return sendSuccess(res, result, result.message);
        } catch (error: any) {
            Logger.error('Error al avanzar al módulo 5:', error);
            
            if (error.message === 'Solicitud no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            if (error.message === 'Etapa Módulo 5 no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            return sendError(res, 'Error al avanzar al módulo 5', 500);
        }
    }

    /**
     * Obtener etapas disponibles
     */
    static async getEtapas(req: Request, res: Response): Promise<Response> {
        try {
            const etapas = await SolicitudService.getEtapas();
            
            Logger.info(`Etapas obtenidas: ${etapas.length}`);
            return sendSuccess(res, etapas, 'Etapas obtenidas exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener etapas:', error);
            return sendError(res, error.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.', 500);
        }
    }

    /**
     * Obtener estados de solicitud disponibles
     */
    static async getEstadosSolicitud(req: Request, res: Response): Promise<Response> {
        try {
            const estados = await SolicitudService.getEstadosSolicitud();
            
            return sendSuccess(res, estados, 'Estados obtenidos exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener estados de solicitud:', error);
            return sendError(res, error.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente más tarde.', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/carga-operativa
     * Obtener procesos activos agrupados por consultor (reportes)
     */
    static async getActiveProcessesByConsultant(req: Request, res: Response): Promise<Response> {
        try {
            const resultado = await SolicitudService.getActiveProcessesByConsultant();
            
            Logger.info(`Procesos activos por consultor obtenidos: ${Object.keys(resultado).length} consultores`);
            return sendSuccess(res, resultado, 'Carga operativa obtenida exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener carga operativa:', error);
            return sendError(res, 'Error al obtener carga operativa', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/distribucion-tipo-servicio
     * Obtener distribución de procesos por tipo de servicio
     */
    static async getProcessesByServiceType(req: Request, res: Response): Promise<Response> {
        try {
            const resultado = await SolicitudService.getProcessesByServiceType();
            
            Logger.info(`Distribución por tipo de servicio obtenida: ${resultado.length} tipos`);
            return sendSuccess(res, resultado, 'Distribución por tipo de servicio obtenida exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener distribución por tipo de servicio:', error);
            return sendError(res, 'Error al obtener distribución por tipo de servicio', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/fuentes-candidatos
     * Obtener distribución de candidatos por fuente (portal de postulación)
     */
    static async getCandidateSourceData(req: Request, res: Response): Promise<Response> {
        try {
            const resultado = await SolicitudService.getCandidateSourceData();
            
            Logger.info(`Fuentes de candidatos obtenidas: ${resultado.length} fuentes`);
            return sendSuccess(res, resultado, 'Fuentes de candidatos obtenidas exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener fuentes de candidatos:', error);
            return sendError(res, 'Error al obtener fuentes de candidatos', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/estadisticas
     * Obtener estadísticas generales de procesos
     */
    static async getProcessStats(req: Request, res: Response): Promise<Response> {
        try {
            const resultado = await SolicitudService.getProcessStats();
            
            Logger.info(`Estadísticas obtenidas: ${resultado.activeProcesses} activos, ${resultado.avgTimeToHire} días promedio`);
            return sendSuccess(res, resultado, 'Estadísticas obtenidas exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener estadísticas:', error);
            return sendError(res, 'Error al obtener estadísticas', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/distribucion-estados
     * Obtener distribución de estados de procesos para un período específico
     * Query params: year, month, week (opcional), periodType (week|month|quarter)
     */
    static async getProcessStatusDistribution(req: Request, res: Response): Promise<Response> {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const month = parseInt(req.query.month as string) || new Date().getMonth();
            const week = req.query.week ? parseInt(req.query.week as string) : undefined;
            const periodType = (req.query.periodType as 'week' | 'month' | 'quarter') || 'month';

            const resultado = await SolicitudService.getProcessStatusDistribution(year, month, week, periodType);
            
            Logger.info(`Distribución de estados obtenida para ${periodType}: ${resultado.length} estados`);
            return sendSuccess(res, resultado, 'Distribución de estados obtenida exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener distribución de estados:', error);
            return sendError(res, 'Error al obtener distribución de estados', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/tiempo-promedio-servicio
     * Obtener tiempo promedio de cierre por servicio (PC y HS)
     */
    static async getAverageProcessTimeByService(req: Request, res: Response): Promise<Response> {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const monthQuery = req.query.month as string | undefined;
            const parsedMonth = monthQuery !== undefined ? parseInt(monthQuery) : NaN;
            const month = Number.isFinite(parsedMonth) ? parsedMonth : new Date().getMonth();
            const week = req.query.week ? parseInt(req.query.week as string) : undefined;
            const periodType = (req.query.periodType as 'week' | 'month' | 'quarter' | 'year') || 'month';

            const resultado = await SolicitudService.getAverageProcessTimeByService(year, month, week, periodType);

            Logger.info(`Tiempo promedio por servicio obtenido (${resultado.length} servicios)`);
            return sendSuccess(res, resultado, 'Tiempo promedio por servicio obtenido exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener tiempo promedio por servicio:', error);
            return sendError(res, 'Error al obtener tiempo promedio por servicio', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/overview
     * Obtener resumen de procesos para el período seleccionado
     */
    static async getProcessOverview(req: Request, res: Response): Promise<Response> {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const monthQuery = req.query.month as string | undefined;
            const parsedMonth = monthQuery !== undefined ? parseInt(monthQuery) : NaN;
            const month = Number.isFinite(parsedMonth) ? parsedMonth : new Date().getMonth();
            const week = req.query.week ? parseInt(req.query.week as string) : undefined;
            const periodType = (req.query.periodType as 'week' | 'month' | 'quarter' | 'year') || 'month';

            const resultado = await SolicitudService.getProcessesOverview(year, month, week, periodType);

            Logger.info(`Overview de procesos obtenido: ${resultado.processes.length} procesos`);
            return sendSuccess(res, resultado, 'Overview de procesos obtenido exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener overview de procesos:', error);
            return sendError(res, 'Error al obtener overview de procesos', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/procesos-cerrados-exitosos
     * Obtener procesos cerrados exitosos con detalles de candidatos
     */
    static async getClosedSuccessfulProcesses(req: Request, res: Response): Promise<Response> {
        try {
            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const monthQuery = req.query.month as string | undefined;
            const parsedMonth = monthQuery !== undefined ? parseInt(monthQuery) : NaN;
            const month = Number.isFinite(parsedMonth) ? parsedMonth : new Date().getMonth();
            const week = req.query.week ? parseInt(req.query.week as string) : undefined;
            const periodType = (req.query.periodType as 'week' | 'month' | 'quarter' | 'year') || 'month';

            const resultado = await SolicitudService.getClosedSuccessfulProcesses(year, month, week, periodType);

            Logger.info(`Procesos cerrados exitosos obtenidos: ${resultado.length} procesos`);
            return sendSuccess(res, resultado, 'Procesos cerrados exitosos obtenidos exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener procesos cerrados exitosos:', error);
            return sendError(res, 'Error al obtener procesos cerrados exitosos', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/rendimiento-consultor
     * Obtener rendimiento por consultor (procesos completados, tiempo promedio, eficiencia)
     */
    static async getConsultantPerformance(req: Request, res: Response): Promise<Response> {
        try {
            const resultado = await SolicitudService.getConsultantPerformance();
            Logger.info(`Rendimiento por consultor obtenido: ${resultado.length} consultores`);
            return sendSuccess(res, resultado, 'Rendimiento por consultor obtenido exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener rendimiento por consultor:', error);
            return sendError(res, 'Error al obtener rendimiento por consultor', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/cumplimiento-consultor
     * Obtener estadísticas de cumplimiento de plazos por consultor
     */
    static async getConsultantCompletionStats(req: Request, res: Response): Promise<Response> {
        try {
            const resultado = await SolicitudService.getConsultantCompletionStats();
            Logger.info(`Estadísticas de cumplimiento obtenidas: ${resultado.length} consultores`);
            return sendSuccess(res, resultado, 'Estadísticas de cumplimiento obtenidas exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener estadísticas de cumplimiento:', error);
            return sendError(res, 'Error al obtener estadísticas de cumplimiento', 500);
        }
    }

    /**
     * GET /api/solicitudes/reportes/retrasos-consultor
     * Obtener hitos vencidos por consultor
     */
    static async getConsultantOverdueHitos(req: Request, res: Response): Promise<Response> {
        try {
            const resultado = await SolicitudService.getConsultantOverdueHitos();
            Logger.info(`Hitos vencidos por consultor obtenidos: ${Object.keys(resultado).length} consultores`);
            return sendSuccess(res, resultado, 'Hitos vencidos por consultor obtenidos exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener hitos vencidos por consultor:', error);
            return sendError(res, 'Error al obtener hitos vencidos por consultor', 500);
        }
    }

}

   

    
