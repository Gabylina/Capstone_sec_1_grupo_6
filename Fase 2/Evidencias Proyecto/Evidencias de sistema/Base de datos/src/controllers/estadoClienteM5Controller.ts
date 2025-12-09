import { Request, Response } from 'express';
import EstadoClienteM5Service from '@/services/estadoClienteM5Service';
import { sendSuccess, sendError } from '@/utils/response';
import { Logger } from '@/utils/logger';

export default class EstadoClienteM5Controller {

    /**
     * GET /api/estado-cliente-m5
     * Obtener todos los estados del módulo 5
     */
    static async getAll(req: Request, res: Response): Promise<Response> {
        try {
            const estados = await EstadoClienteM5Service.getAllEstados();
            return sendSuccess(res, estados, 'Estados obtenidos exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener estados del módulo 5:', error);
            return sendError(res, 'Error al obtener estados', 500);
        }
    }

    /**
     * GET /api/estado-cliente-m5/:id
     * Obtener estado por ID
     */
    static async getById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const estado = await EstadoClienteM5Service.getEstadoById(parseInt(id));
            
            if (!estado) {
                return sendError(res, 'Estado no encontrado', 404);
            }
            
            return sendSuccess(res, estado, 'Estado obtenido exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener estado:', error);
            return sendError(res, 'Error al obtener estado', 500);
        }
    }

    /**
     * PUT /api/estado-cliente-m5/postulacion/:id_postulacion
     * Cambiar estado de cliente para una postulación
     */
    static async cambiarEstado(req: Request, res: Response): Promise<Response> {
        try {
            const { id_postulacion } = req.params;
            const { id_estado_cliente_postulacion_m5, fecha_feedback_cliente_m5, comentario_modulo5_cliente } = req.body;

            if (!id_estado_cliente_postulacion_m5) {
                return sendError(res, 'El estado del cliente es requerido', 400);
            }

            // La fecha ya no es requerida, puede ser null
            // Se validará automáticamente en el servicio

            const usuarioRut = (req as any).user?.id;
            console.log(`[CONTROLLER] cambiarEstado M5 - req.user:`, (req as any).user);
            console.log(`[CONTROLLER] cambiarEstado M5 - usuarioRut extraído: "${usuarioRut}"`);
            const result = await EstadoClienteM5Service.cambiarEstado(
                parseInt(id_postulacion),
                {
                    id_estado_cliente_postulacion_m5,
                    fecha_feedback_cliente_m5: fecha_feedback_cliente_m5 || null,
                    comentario_modulo5_cliente
                },
                usuarioRut
            );

            // Agregar headers de cache control
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            Logger.info(`Estado de cliente cambiado para postulación ${id_postulacion} (Módulo 5)`);
            return sendSuccess(res, result, 'Estado de cliente actualizado exitosamente (Módulo 5)');
        } catch (error: any) {
            Logger.error('Error al cambiar estado de cliente (Módulo 5):', error);
            
            if (error.message === 'Postulación no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            if (error.message === 'Estado de cliente no encontrado') {
                return sendError(res, error.message, 404);
            }

            if (error.message.includes('obligatorios')) {
                return sendError(res, error.message, 400);
            }
            
            return sendError(res, 'Error al cambiar estado de cliente (Módulo 5)', 500);
        }
    }

    /**
     * PUT /api/estado-cliente-m5/postulacion/:id_postulacion/avanzar
     * Avanzar candidato al módulo 5 (desde módulo 4)
     */
    static async avanzarAlModulo5(req: Request, res: Response): Promise<Response> {
        try {
            const { id_postulacion } = req.params;
            const { comentario_modulo5_cliente } = req.body;
            const usuarioRut = (req as any).user?.id;

            const result = await EstadoClienteM5Service.avanzarAlModulo5(
                parseInt(id_postulacion),
                comentario_modulo5_cliente,
                usuarioRut
            );

            Logger.info(`Candidato avanzado al módulo 5 - Postulación ${id_postulacion}`);
            return sendSuccess(res, result, 'Candidato avanzado al módulo 5 exitosamente');
        } catch (error: any) {
            Logger.error('Error al avanzar candidato al módulo 5:', error);
            
            if (error.message === 'Postulación no encontrada') {
                return sendError(res, error.message, 404);
            }
            
            return sendError(res, 'Error al avanzar candidato al módulo 5', 500);
        }
    }

    /**
     * GET /api/estado-cliente-m5/postulacion/:id_postulacion/historial
     * Obtener historial de cambios de estado para una postulación
     */
    static async getHistorial(req: Request, res: Response): Promise<Response> {
        try {
            const { id_postulacion } = req.params;
            const historial = await EstadoClienteM5Service.getHistorial(parseInt(id_postulacion));
            
            return sendSuccess(res, historial, 'Historial obtenido exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener historial de estados:', error);
            return sendError(res, 'Error al obtener historial de estados', 500);
        }
    }

    /**
     * GET /api/estado-cliente-m5/postulacion/:id_postulacion/ultimo
     * Obtener el último estado de una postulación
     */
    static async getUltimoEstado(req: Request, res: Response): Promise<Response> {
        try {
            const { id_postulacion } = req.params;
            const ultimoEstado = await EstadoClienteM5Service.getUltimoEstado(parseInt(id_postulacion));
            
            return sendSuccess(res, ultimoEstado, 'Último estado obtenido exitosamente');
        } catch (error: any) {
            Logger.error('Error al obtener último estado:', error);
            return sendError(res, 'Error al obtener último estado', 500);
        }
    }

    /**
     * GET /api/estado-cliente-m5/proceso/:id_proceso/candidatos
     * Obtener candidatos que están en el módulo 5
     */
    static async getCandidatosEnModulo5(req: Request, res: Response): Promise<Response> {
        try {
            const { id_proceso } = req.params;
            // Agregar headers para prevenir caché y asegurar datos frescos
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            const candidatos = await EstadoClienteM5Service.getCandidatosEnModulo5(parseInt(id_proceso));
            return sendSuccess(res, candidatos, 'Candidatos del Módulo 5 obtenidos exitosamente');
        } catch (error) {
            Logger.error('Error al obtener candidatos del Módulo 5:', error);
        return sendError(res, 'Error al obtener candidatos del Módulo 5', 500);
    }
}

/**
 * PUT /api/estado-cliente-m5/postulacion/:id_postulacion/actualizar
 * Actualizar información completa del candidato en módulo 5
 */
static async actualizarCandidatoModulo5(req: Request, res: Response): Promise<Response> {
    try {
        const { id_postulacion } = req.params;
        const { 
            hiring_status, 
            client_response_date, 
            observations,
            fecha_ingreso_contratacion,
            observaciones_contratacion
        } = req.body;

        if (!hiring_status) {
            return sendError(res, 'El estado de contratación es requerido', 400);
        }

        const usuarioRut = (req as any).user?.id;
        console.log(`[CONTROLLER] actualizarCandidatoModulo5 - req.user:`, (req as any).user);
        console.log(`[CONTROLLER] actualizarCandidatoModulo5 - usuarioRut extraído: "${usuarioRut}"`);
        const result = await EstadoClienteM5Service.actualizarCandidatoModulo5(
            parseInt(id_postulacion),
            {
                hiring_status,
                client_response_date,
                observations,
                fecha_ingreso_contratacion,
                observaciones_contratacion
            },
            usuarioRut
        );

        // Agregar headers de cache control
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        Logger.info(`Candidato del módulo 5 actualizado - Postulación: ${id_postulacion}, Estado: ${hiring_status}`);
        return sendSuccess(res, result, 'Candidato del módulo 5 actualizado exitosamente');
    } catch (error: any) {
        Logger.error('Error al actualizar candidato del módulo 5:', error);
        
        if (error.message.includes('no válido')) {
            return sendError(res, error.message, 400);
        }
        
        return sendError(res, 'Error al actualizar candidato del módulo 5', 500);
    }
}
}
