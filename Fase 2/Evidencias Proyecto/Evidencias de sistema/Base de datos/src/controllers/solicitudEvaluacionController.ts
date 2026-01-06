import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { Logger } from '@/utils/logger';
import { SolicitudEvaluacionService } from '@/services/solicitudEvaluacionService';

/**
 * Controlador para solicitudes de evaluación/test psicolaboral
 * Maneja la creación atómica de solicitud + candidatos + postulaciones
 */
export class SolicitudEvaluacionController {
    /**
     * POST /api/solicitudes-evaluacion
     * Crear solicitud de evaluación con candidatos en una sola transacción
     */
    static async crearConCandidatos(req: Request, res: Response): Promise<Response> {
        try {
            const {
                contact_id,
                service_type,
                position_title,
                id_comuna,
                description,
                requirements,
                consultant_id,
                deadline_days,
                candidatos
            } = req.body;

            // Validaciones básicas
            if (!contact_id || !service_type || !position_title || !consultant_id) {
                return sendError(res, 'Faltan campos requeridos en la solicitud', 400);
            }

            if (!candidatos || !Array.isArray(candidatos) || candidatos.length === 0) {
                return sendError(res, 'Debe proporcionar al menos un candidato', 400);
            }

            // Validar que cada candidato tenga los campos requeridos
            for (let i = 0; i < candidatos.length; i++) {
                const candidato = candidatos[i];
                if (!candidato.nombre || !candidato.primer_apellido || !candidato.email || !candidato.phone) {
                    return sendError(res, `Candidato ${i + 1}: Faltan campos requeridos (nombre, primer_apellido, email, phone)`, 400);
                }
            }

            const resultado = await SolicitudEvaluacionService.crearSolicitudConCandidatos({
                contact_id: parseInt(contact_id),
                service_type,
                position_title,
                id_comuna: parseInt(id_comuna),
                description,
                requirements,
                consultant_id,
                deadline_days: deadline_days ? parseInt(deadline_days) : undefined,
                candidatos
            }, req.user?.id);

            Logger.info(`Solicitud de evaluación creada: ${resultado.data.solicitud_id} con ${resultado.data.candidatos_creados} candidatos`);
            
            return sendSuccess(res, resultado.data, resultado.message, 201);

        } catch (error: any) {
            Logger.error('Error al crear solicitud de evaluación:', error);
            
            // Mensajes de error específicos
            if (error.message === 'Contacto no encontrado') {
                return sendError(res, error.message, 404);
            }
            if (error.message === 'Usuario no encontrado') {
                return sendError(res, error.message, 404);
            }
            if (error.message?.includes('Ya existe un candidato con')) {
                return sendError(res, error.message, 409); // Conflict
            }
            if (error.message === 'Faltan campos requeridos') {
                return sendError(res, error.message, 400);
            }

            return sendError(res, error.message || 'Error al crear la solicitud de evaluación', 500);
        }
    }

    /**
     * PUT /api/solicitudes-evaluacion/:id
     * Actualizar solicitud de evaluación con candidatos nuevos en una sola transacción
     */
    static async actualizarConCandidatos(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const {
                contact_id,
                service_type,
                position_title,
                id_comuna,
                description,
                requirements,
                consultant_id,
                deadline_days,
                candidatos
            } = req.body;

            // Validar ID
            const solicitudId = parseInt(id);
            if (isNaN(solicitudId)) {
                return sendError(res, 'ID de solicitud inválido', 400);
            }

            // Validar candidatos si se proporcionan
            if (candidatos && Array.isArray(candidatos) && candidatos.length > 0) {
                for (let i = 0; i < candidatos.length; i++) {
                    const candidato = candidatos[i];
                    if (!candidato.nombre || !candidato.primer_apellido || !candidato.email || !candidato.phone) {
                        return sendError(res, `Candidato ${i + 1}: Faltan campos requeridos (nombre, primer_apellido, email, phone)`, 400);
                    }
                }
            }

            const resultado = await SolicitudEvaluacionService.actualizarSolicitudConCandidatos(
                solicitudId,
                {
                    contact_id: contact_id ? parseInt(contact_id) : undefined,
                    service_type,
                    position_title,
                    id_comuna: id_comuna ? parseInt(id_comuna) : undefined,
                    description,
                    requirements,
                    consultant_id,
                    deadline_days: deadline_days ? parseInt(deadline_days) : undefined,
                    candidatos: candidatos && Array.isArray(candidatos) && candidatos.length > 0 ? candidatos : undefined
                },
                req.user?.id
            );

            Logger.info(`Solicitud de evaluación actualizada: ${solicitudId}${resultado.data.candidatos_creados > 0 ? ` con ${resultado.data.candidatos_creados} candidato(s) nuevo(s)` : ''}`);
            
            return sendSuccess(res, resultado.data, resultado.message, 200);

        } catch (error: any) {
            Logger.error('Error al actualizar solicitud de evaluación:', error);
            
            // Mensajes de error específicos
            if (error.message === 'Solicitud no encontrada') {
                return sendError(res, error.message, 404);
            }
            if (error.message === 'Contacto no encontrado') {
                return sendError(res, error.message, 404);
            }
            if (error.message === 'Usuario no encontrado') {
                return sendError(res, error.message, 404);
            }
            if (error.message?.includes('Ya existe un candidato con')) {
                return sendError(res, error.message, 409); // Conflict
            }
            if (error.message === 'Faltan campos requeridos') {
                return sendError(res, error.message, 400);
            }

            return sendError(res, error.message || 'Error al actualizar la solicitud de evaluación', 500);
        }
    }
}

