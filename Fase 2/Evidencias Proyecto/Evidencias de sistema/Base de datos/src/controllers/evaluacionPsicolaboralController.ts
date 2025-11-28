import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { Logger } from '@/utils/logger';
import { EvaluacionPsicolaboralService } from '@/services/evaluacionPsicolaboralService';

/**
 * Controlador para gestión de Evaluaciones Psicolaborales
 */

export class EvaluacionPsicolaboralController {
    /**
     * GET /api/evaluaciones-psicolaborales
     * Obtener todas las evaluaciones
     */
    static async getAll(req: Request, res: Response): Promise<Response> {
        try {
            const evaluaciones = await EvaluacionPsicolaboralService.getAllEvaluaciones();
            return sendSuccess(res, evaluaciones, 'Evaluaciones obtenidas exitosamente');
        } catch (error) {
            Logger.error('Error al obtener evaluaciones:', error);
            return sendError(res, 'Error al obtener evaluaciones', 500);
        }
    }

    /**
     * GET /api/evaluaciones-psicolaborales/postulacion/:idPostulacion
     * Obtener evaluaciones por postulación
     */
    static async getByPostulacion(req: Request, res: Response): Promise<Response> {
        try {
            const { idPostulacion } = req.params;
            const evaluaciones = await EvaluacionPsicolaboralService.getEvaluacionesByPostulacion(parseInt(idPostulacion));
            return sendSuccess(res, evaluaciones, 'Evaluaciones obtenidas exitosamente');
        } catch (error) {
            Logger.error('Error al obtener evaluaciones:', error);
            return sendError(res, 'Error al obtener evaluaciones', 500);
        }
    }

    /**
     * GET /api/evaluaciones-psicolaborales/pendientes
     * Obtener evaluaciones pendientes
     */
    static async getPendientes(req: Request, res: Response): Promise<Response> {
        try {
            const evaluaciones = await EvaluacionPsicolaboralService.getEvaluacionesPendientes();
            return sendSuccess(res, evaluaciones, 'Evaluaciones pendientes obtenidas exitosamente');
        } catch (error) {
            Logger.error('Error al obtener evaluaciones pendientes:', error);
            return sendError(res, 'Error al obtener evaluaciones pendientes', 500);
        }
    }

    /**
     * GET /api/evaluaciones-psicolaborales/:id
     * Obtener una evaluación específica
     */
    static async getById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const evaluacion = await EvaluacionPsicolaboralService.getEvaluacionById(parseInt(id));

            if (!evaluacion) {
                return sendError(res, 'Evaluación no encontrada', 404);
            }

            return sendSuccess(res, evaluacion, 'Evaluación obtenida exitosamente');
        } catch (error) {
            Logger.error('Error al obtener evaluación:', error);
            return sendError(res, 'Error al obtener evaluación', 500);
        }
    }

    /**
     * POST /api/evaluaciones-psicolaborales
     * Crear nueva evaluación
     */
    static async create(req: Request, res: Response): Promise<Response> {
        try {
            const evaluacion = await EvaluacionPsicolaboralService.createEvaluacion(req.body, req.user?.id);
            return sendSuccess(res, evaluacion, 'Evaluación creada exitosamente', 201);
        } catch (error) {
            Logger.error('Error al crear evaluación:', error);
            return sendError(res, (error as Error).message || 'Error al crear evaluación', 500);
        }
    }

    /**
     * PUT /api/evaluaciones-psicolaborales/:id
     * Actualizar evaluación
     */
    static async update(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const evaluacion = await EvaluacionPsicolaboralService.updateEvaluacion(parseInt(id), req.body, req.user?.id);
            return sendSuccess(res, evaluacion, 'Evaluación actualizada exitosamente');
        } catch (error) {
            Logger.error('Error al actualizar evaluación:', error);
            return sendError(res, (error as Error).message || 'Error al actualizar evaluación', 500);
        }
    }

    /**
     * POST /api/evaluaciones-psicolaborales/:id/tests
     * Agregar resultado de test a evaluación
     */
    static async addTest(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { id_test, resultado } = req.body;
            
            const evaluacion = await EvaluacionPsicolaboralService.addTestResultado(
                parseInt(id),
                parseInt(id_test),
                resultado
            );
            
            return sendSuccess(res, evaluacion, 'Resultado de test agregado exitosamente');
        } catch (error) {
            Logger.error('Error al agregar test:', error);
            return sendError(res, (error as Error).message || 'Error al agregar test', 500);
        }
    }

    /**
     * DELETE /api/evaluaciones-psicolaborales/:id/tests/:idTest
     * Eliminar resultado de test
     */
    static async deleteTest(req: Request, res: Response): Promise<Response> {
        try {
            const { id, idTest } = req.params;
            
            await EvaluacionPsicolaboralService.deleteTestResultado(
                parseInt(id),
                parseInt(idTest)
            );
            
            return sendSuccess(res, null, 'Resultado de test eliminado exitosamente');
        } catch (error) {
            Logger.error('Error al eliminar test:', error);
            return sendError(res, (error as Error).message || 'Error al eliminar test', 500);
        }
    }

    /**
     * PUT /api/evaluaciones-psicolaborales/:id/marcar-realizada
     * Marcar evaluación como realizada
     */
    static async marcarRealizada(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const evaluacion = await EvaluacionPsicolaboralService.marcarComoRealizada(parseInt(id), req.user?.id);
            return sendSuccess(res, evaluacion, 'Evaluación marcada como realizada');
        } catch (error) {
            Logger.error('Error al marcar evaluación:', error);
            return sendError(res, (error as Error).message || 'Error al marcar evaluación', 500);
        }
    }

    /**
     * PUT /api/evaluaciones-psicolaborales/:id/estado-informe
     * Actualizar estado del informe
     */
    static async actualizarEstadoInforme(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { estado_informe } = req.body;
            
            if (!['Pendiente', 'Recomendable', 'No recomendable', 'Recomendable con observaciones'].includes(estado_informe)) {
                return sendError(res, 'Estado de informe inválido', 400);
            }
            
            const evaluacion = await EvaluacionPsicolaboralService.actualizarEstadoInforme(parseInt(id), estado_informe, req.user?.id);
            return sendSuccess(res, evaluacion, 'Estado de informe actualizado');
        } catch (error) {
            Logger.error('Error al actualizar estado de informe:', error);
            return sendError(res, (error as Error).message || 'Error al actualizar estado de informe', 500);
        }
    }

    /**
     * PUT /api/evaluaciones-psicolaborales/:id/conclusion-global
     * Actualizar conclusión global del informe
     */
    static async actualizarConclusionGlobal(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { conclusion_global } = req.body;
            
            if (!conclusion_global || conclusion_global.trim().length < 10) {
                return sendError(res, 'La conclusión global debe tener al menos 10 caracteres', 400);
            }
            
            const evaluacion = await EvaluacionPsicolaboralService.actualizarConclusionGlobal(parseInt(id), conclusion_global, req.user?.id);
            return sendSuccess(res, evaluacion, 'Conclusión global actualizada');
        } catch (error) {
            Logger.error('Error al actualizar conclusión global:', error);
            return sendError(res, (error as Error).message || 'Error al actualizar conclusión global', 500);
        }
    }

    /**
     * PUT /api/evaluaciones-psicolaborales/:id/informe-completo
     * Actualizar estado del informe y conclusión global
     */
    static async actualizarInformeCompleto(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { estado_informe, conclusion_global, fecha_envio_informe } = req.body;
            
            if (!['Pendiente', 'Recomendable', 'No recomendable', 'Recomendable con observaciones'].includes(estado_informe)) {
                return sendError(res, 'Estado de informe inválido', 400);
            }
            
            // Validar conclusión global solo si se proporciona (es opcional)
            if (conclusion_global !== undefined && conclusion_global !== null && conclusion_global !== '') {
                const trimmedConclusion = conclusion_global.trim();
                if (trimmedConclusion.length > 0) {
                    if (trimmedConclusion.length < 10) {
                        return sendError(res, 'La conclusión global debe tener al menos 10 caracteres', 400);
                    }
                    if (trimmedConclusion.length > 300) {
                        return sendError(res, 'La conclusión global no puede exceder 300 caracteres', 400);
                    }
                }
            }
            
            const fechaEnvio = fecha_envio_informe ? new Date(fecha_envio_informe) : undefined;
            // Pasar conclusión global como undefined si está vacía o null
            const conclusionToSave = (conclusion_global && conclusion_global.trim().length > 0) ? conclusion_global.trim() : undefined;
            const evaluacion = await EvaluacionPsicolaboralService.actualizarInformeCompleto(parseInt(id), estado_informe, conclusionToSave, fechaEnvio);
            return sendSuccess(res, evaluacion, 'Informe actualizado completamente');
        } catch (error) {
            Logger.error('Error al actualizar informe completo:', error);
            return sendError(res, (error as Error).message || 'Error al actualizar informe completo', 500);
        }
    }

    /**
     * DELETE /api/evaluaciones-psicolaborales/:id
     * Eliminar evaluación
     */
    static async delete(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            await EvaluacionPsicolaboralService.deleteEvaluacion(parseInt(id));
            return sendSuccess(res, null, 'Evaluación eliminada exitosamente');
        } catch (error) {
            Logger.error('Error al eliminar evaluación:', error);
            return sendError(res, (error as Error).message || 'Error al eliminar evaluación', 500);
        }
    }
}

