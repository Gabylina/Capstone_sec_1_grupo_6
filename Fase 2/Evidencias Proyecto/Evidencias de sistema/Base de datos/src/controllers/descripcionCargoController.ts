import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { Logger } from '@/utils/logger';
import { DescripcionCargoService } from '@/services/descripcionCargoService';
import { handleMulterError } from '@/config/multer';

/**
 * Controlador para gestión de Descripciones de Cargo
 * Delega la lógica de negocio al DescripcionCargoService
 */

export class DescripcionCargoController {
    /**
     * GET /api/descripciones-cargo
     * Obtener todas las descripciones de cargo
     */
    static async getAll(req: Request, res: Response): Promise<Response> {
        try {
            const descripciones = await DescripcionCargoService.getAllDescripciones();
            return sendSuccess(res, descripciones, 'Descripciones de cargo obtenidas exitosamente');
        } catch (error) {
            Logger.error('Error al obtener descripciones de cargo:', error);
            return sendError(res, 'Error al obtener descripciones de cargo', 500);
        }
    }

    /**
     * GET /api/descripciones-cargo/:id
     * Obtener una descripción de cargo específica
     */
    static async getById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const descripcion = await DescripcionCargoService.getDescripcionById(parseInt(id));

            if (!descripcion) {
                return sendError(res, 'Descripción de cargo no encontrada', 404);
            }

            return sendSuccess(res, descripcion, 'Descripción de cargo obtenida exitosamente');
        } catch (error) {
            Logger.error('Error al obtener descripción de cargo:', error);
            return sendError(res, 'Error al obtener descripción de cargo', 500);
        }
    }

    /**
     * POST /api/descripciones-cargo
     * Crear nueva descripción de cargo
     * 
     * NOTA: Este endpoint requiere id_solicitud. Normalmente, la descripción de cargo
     * se crea automáticamente al crear una solicitud desde /api/solicitudes
     */
    static async create(req: Request, res: Response): Promise<Response> {
        try {
            const {
                descripcion,
                requisitos,
                vacantes,
                fecha_ingreso,
                cargo,
                comuna,
                id_solicitud,
                datos_excel
            } = req.body;

            if (!id_solicitud) {
                return sendError(res, 'id_solicitud es requerido. La descripción de cargo debe estar asociada a una solicitud.', 400);
            }

            const nuevaDescripcion = await DescripcionCargoService.createDescripcion({
                descripcion,
                requisitos,
                vacantes: parseInt(vacantes),
                fecha_ingreso,
                cargo,
                comuna,
                id_solicitud: parseInt(id_solicitud),
                datos_excel
            });

            Logger.info(`Descripción de cargo creada: ${nuevaDescripcion.id}`);
            return sendSuccess(res, nuevaDescripcion, 'Descripción de cargo creada exitosamente', 201);
        } catch (error: any) {
            Logger.error('Error al crear descripción de cargo:', error);
            return sendError(res, error.message || 'Error al crear descripción de cargo', 400);
        }
    }

    /**
     * PUT /api/descripciones-cargo/:id
     * Actualizar descripción de cargo
     */
    static async update(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { descripcion, requisitos, vacantes, fecha_ingreso, cargo, comuna, datos_excel } = req.body;

            const descripcionActualizada = await DescripcionCargoService.updateDescripcion(parseInt(id), {
                descripcion,
                requisitos,
                vacantes: vacantes ? parseInt(vacantes) : undefined,
                fecha_ingreso,
                cargo,
                comuna,
                datos_excel
            });

            Logger.info(`Descripción de cargo actualizada: ${id}`);
            return sendSuccess(res, descripcionActualizada, 'Descripción de cargo actualizada exitosamente');
        } catch (error: any) {
            Logger.error('Error al actualizar descripción de cargo:', error);

            if (error.message === 'Descripción de cargo no encontrada') {
                return sendError(res, error.message, 404);
            }

            return sendError(res, error.message || 'Error al actualizar descripción de cargo', 400);
        }
    }

    /**
     * POST /api/descripciones-cargo/:id/excel
     * Agregar datos de Excel procesados a una descripción de cargo
     * 
     * Body esperado:
     * {
     *   "datos_excel": { ... } // JSON con los datos ya procesados del Excel
     * }
     */
    static async agregarDatosExcel(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { datos_excel } = req.body;

            if (!datos_excel) {
                return sendError(res, 'Los datos de Excel son requeridos', 400);
            }

            const resultado = await DescripcionCargoService.agregarDatosExcel(parseInt(id), datos_excel);

            Logger.info(`Datos de Excel agregados a descripción ${id}`);
            return sendSuccess(res, resultado, 'Datos de Excel agregados exitosamente');
        } catch (error: any) {
            Logger.error('Error al agregar datos de Excel:', error);

            if (error.message === 'Descripción de cargo no encontrada') {
                return sendError(res, error.message, 404);
            }

            return sendError(res, error.message || 'Error al agregar datos de Excel', 400);
        }
    }


    /**
     * GET /api/descripciones-cargo/:id/excel
     * Obtener datos de Excel guardados
     */
    static async getDatosExcel(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const datos = await DescripcionCargoService.getDatosExcel(parseInt(id));

            return sendSuccess(res, datos, 'Datos de Excel obtenidos exitosamente');
        } catch (error: any) {
            // Si la descripción no tiene datos de Excel, retornar 200 con success: false
            // en lugar de 404 para evitar errores en consola del navegador
            if (error.message.includes('no tiene datos de Excel')) {
                return sendSuccess(res, { 
                    success: false, 
                    data: null,
                    message: 'No hay datos de Excel asociados'
                }, 'No hay datos de Excel asociados');
            }

            Logger.error('Error al obtener datos de Excel:', error);

            if (error.message === 'Descripción de cargo no encontrada') {
                return sendError(res, error.message, 404);
            }

            return sendError(res, error.message || 'Error al obtener datos de Excel', 500);
        }
    }

    /**
     * POST /api/descripciones-cargo/:id/pdf
     * Subir o actualizar el PDF asociado a una descripción de cargo
     */
    static async uploadPdf(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;

            if (!req.file) {
                return sendError(res, 'No se proporcionó ningún archivo', 400);
            }

            // Solo permitir PDF explícitamente en este endpoint
            if (req.file.mimetype !== 'application/pdf') {
                return sendError(res, 'Solo se permiten archivos PDF', 400);
            }

            const resultado = await DescripcionCargoService.updatePdf(parseInt(id), req.file.buffer);

            Logger.info(`PDF de descripción de cargo actualizado: ${id}`);
            return sendSuccess(res, resultado, 'PDF de descripción de cargo actualizado exitosamente');
        } catch (error: any) {
            Logger.error('Error al subir PDF de descripción de cargo:', error);

            if (error.message === 'Descripción de cargo no encontrada') {
                return sendError(res, error.message, 404);
            }

            // Manejar errores de Multer también aquí
            if (error.message && error.message.includes('Solo se permiten')) {
                return sendError(res, error.message, 400);
            }

            return sendError(res, handleMulterError(error), 500);
        }
    }

    /**
     * GET /api/descripciones-cargo/:id/pdf
     * Obtener el PDF asociado a una descripción de cargo (solo lectura/visualización)
     */
    static async getPdf(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { pdf } = await DescripcionCargoService.getPdf(parseInt(id));

            if (!pdf) {
                return sendError(res, 'La descripción de cargo no tiene PDF asociado', 404);
            }

            res.setHeader('Content-Type', 'application/pdf');
            // inline para que el navegador intente visualizarlo en lugar de forzar descarga
            res.setHeader('Content-Disposition', 'inline; filename="descripcion_cargo.pdf"');
            res.setHeader('Content-Length', pdf.length);

            Logger.info(`PDF de descripción de cargo servido para id ${id}`);
            return res.send(pdf);
        } catch (error: any) {
            Logger.error('Error al obtener PDF de descripción de cargo:', error);

            if (error.message === 'Descripción de cargo no encontrada') {
                return sendError(res, error.message, 404);
            }

            if (error.message === 'Esta descripción no tiene PDF asociado') {
                return sendError(res, error.message, 404);
            }

            return sendError(res, 'Error al obtener PDF de descripción de cargo', 500);
        }
    }


    /**
     * DELETE /api/descripciones-cargo/:id
     * Eliminar descripción de cargo
     */
    static async delete(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            await DescripcionCargoService.deleteDescripcion(parseInt(id));

            Logger.info(`Descripción de cargo eliminada: ${id}`);
            return sendSuccess(res, null, 'Descripción de cargo eliminada exitosamente');
        } catch (error: any) {
            Logger.error('Error al eliminar descripción de cargo:', error);

            if (error.message === 'Descripción de cargo no encontrada') {
                return sendError(res, error.message, 404);
            }

            if (error.message.includes('solicitudes asociadas')) {
                return sendError(res, error.message, 400);
            }

            return sendError(res, 'Error al eliminar descripción de cargo', 500);
        }
    }

    /**
     * GET /api/descripciones-cargo/form-data
     * Obtener todos los datos necesarios para el formulario de descripción de cargo
     * (tipos de servicio, clientes, consultores, cargos, comunas)
     */
    static async getFormData(req: Request, res: Response): Promise<Response> {
        try {
            const datos = await DescripcionCargoService.getDatosFormulario();
            return sendSuccess(res, datos, 'Datos del formulario obtenidos exitosamente');
        } catch (error) {
            Logger.error('Error al obtener datos del formulario:', error);
            return sendError(res, 'Error al obtener datos del formulario', 500);
        }
    }
}

