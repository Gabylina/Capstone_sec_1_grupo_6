import { Request, Response } from 'express';
import { sendSuccess, sendError } from '@/utils/response';
import { Logger } from '@/utils/logger';
import { ClienteService } from '@/services/clienteService';

/**
 * Controlador para gestión de Clientes y sus Contactos
 * Delega la lógica de negocio al ClienteService
 */

export class ClienteController {
    /**
     * GET /api/clientes
     * Obtener clientes paginados con filtros opcionales
     */
    static async getAll(req: Request, res: Response): Promise<Response> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = (req.query.search as string) || "";
            const sortBy = (req.query.sortBy as "nombre" | "contactos") || "nombre";
            const sortOrder = (req.query.sortOrder as "ASC" | "DESC") || "ASC";

            const result = await ClienteService.getClients(page, limit, search, sortBy, sortOrder);
            return sendSuccess(res, result, "Clientes obtenidos correctamente");
        } catch (error: any) {
            Logger.error('Error al obtener clientes:', error);
            return sendError(res, error.message || "Error al obtener clientes", 500);
        }
    }

    /**
     * GET /api/clientes/all
     * Obtener todos los clientes con sus contactos (sin paginación)
     */
    static async getAllClientes(req: Request, res: Response): Promise<Response> {
        try {
            const clientes = await ClienteService.getAllClientes();
            return sendSuccess(res, clientes, 'Clientes obtenidos exitosamente');
        } catch (error) {
            Logger.error('Error al obtener clientes:', error);
            return sendError(res, 'Error al obtener clientes', 500);
        }
    }

    /**
     * GET /api/clientes/:id
     * Obtener un cliente específico con sus contactos
     */
    static async getById(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const cliente = await ClienteService.getClienteById(parseInt(id));

            if (!cliente) {
                return sendError(res, 'Cliente no encontrado', 404);
            }

            return sendSuccess(res, cliente, 'Cliente obtenido exitosamente');
        } catch (error) {
            Logger.error('Error al obtener cliente:', error);
            return sendError(res, 'Error al obtener cliente', 500);
        }
    }

    /**
     * POST /api/clientes
     * Crear nuevo cliente con sus contactos
     */
    static async create(req: Request, res: Response): Promise<Response> {
        try {
            const { name, contacts } = req.body;
            const nuevoCliente = await ClienteService.createCliente({ name, contacts }, req.user?.id);
            
            Logger.info(`Cliente creado: ${nuevoCliente.id}`);
            return sendSuccess(res, nuevoCliente, 'Cliente creado exitosamente', 201);
        } catch (error: any) {
            Logger.error('Error al crear cliente:', error);
            
            // Manejar errores de constraint único de PostgreSQL
            if (error.name === 'SequelizeUniqueConstraintError' || error.original?.code === '23505') {
                const constraint = error.original?.constraint || error.fields || {};
                
                // Detectar qué campo está duplicado
                if (constraint === 'cliente_nombre_cliente' || error.fields?.nombre_cliente) {
                    return sendError(res, 'Ya existe un cliente con ese nombre', 400);
                } else if (constraint === 'contacto_email_contacto' || error.fields?.email_contacto) {
                    // Extraer el valor del email del mensaje de error: Key (email_contacto)=(valor@email.com) already exists.
                    const detail = error.original?.detail || '';
                    const emailMatch = detail.match(/\)\s*=\s*\(([^)]+)\)/);
                    const email = emailMatch?.[1] || 'el correo especificado';
                    return sendError(res, `El correo electrónico ${email} ya está registrado en otro contacto`, 400);
                } else if (constraint === 'contacto_telefono_contacto' || error.fields?.telefono_contacto) {
                    // Extraer el valor del teléfono del mensaje de error
                    const detail = error.original?.detail || '';
                    const telefonoMatch = detail.match(/\)\s*=\s*\(([^)]+)\)/);
                    const telefono = telefonoMatch?.[1] || 'el teléfono especificado';
                    return sendError(res, `El teléfono ${telefono} ya está registrado en otro contacto`, 400);
                }
                
                return sendError(res, 'Ya existe un registro con esos datos', 400);
            }
            
            return sendError(res, error.message || 'Error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente.', 400);
        }
    }

    /**
     * PUT /api/clientes/:id
     * Actualizar cliente y sus contactos
     */
    static async update(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            const { name, contacts } = req.body;
            
            const clienteActualizado = await ClienteService.updateCliente(parseInt(id), { name, contacts }, req.user?.id);
            
            Logger.info(`Cliente actualizado: ${id}`);
            return sendSuccess(res, clienteActualizado, 'Cliente actualizado exitosamente');
        } catch (error: any) {
            Logger.error('Error al actualizar cliente:', error);
            
            // Manejar errores de constraint único de PostgreSQL
            if (error.name === 'SequelizeUniqueConstraintError' || error.original?.code === '23505') {
                const constraint = error.original?.constraint || error.fields || {};
                
                // Detectar qué campo está duplicado
                if (constraint === 'cliente_nombre_cliente' || error.fields?.nombre_cliente) {
                    return sendError(res, 'Ya existe un cliente con ese nombre', 400);
                } else if (constraint === 'contacto_email_contacto' || error.fields?.email_contacto) {
                    // Extraer el valor del email del mensaje de error: Key (email_contacto)=(valor@email.com) already exists.
                    const detail = error.original?.detail || '';
                    const emailMatch = detail.match(/\)\s*=\s*\(([^)]+)\)/);
                    const email = emailMatch?.[1] || 'el correo especificado';
                    return sendError(res, `El correo electrónico ${email} ya está registrado en otro contacto`, 400);
                } else if (constraint === 'contacto_telefono_contacto' || error.fields?.telefono_contacto) {
                    // Extraer el valor del teléfono del mensaje de error
                    const detail = error.original?.detail || '';
                    const telefonoMatch = detail.match(/\)\s*=\s*\(([^)]+)\)/);
                    const telefono = telefonoMatch?.[1] || 'el teléfono especificado';
                    return sendError(res, `El teléfono ${telefono} ya está registrado en otro contacto`, 400);
                }
                
                return sendError(res, 'Ya existe un registro con esos datos', 400);
            }
            
            if (error.message === 'Cliente no encontrado') {
                return sendError(res, error.message, 404);
            }
            
            return sendError(res, error.message || 'Error al procesar la solicitud. Por favor, verifique los datos e intente nuevamente.', 400);
        }
    }

    /**
     * DELETE /api/clientes/:id
     * Eliminar cliente (soft delete: se marca como inactivo)
     */
    static async delete(req: Request, res: Response): Promise<Response> {
        try {
            const { id } = req.params;
            await ClienteService.deleteCliente(parseInt(id), req.user?.id);

            Logger.info(`Cliente eliminado: ${id}`);
            return sendSuccess(res, null, 'Cliente eliminado exitosamente');
        } catch (error: any) {
            Logger.error('Error al eliminar cliente:', error);

            if (error.message === 'Cliente no encontrado') {
                return sendError(res, error.message, 404);
            }

            return sendError(res, 'Error al eliminar cliente', 500);
        }
    }

    /**
     * GET /api/clientes/stats
     * Obtener estadísticas de clientes
     */
    static async getStats(req: Request, res: Response): Promise<Response> {
        try {
            const stats = await ClienteService.getStats();
            return sendSuccess(res, stats, 'Estadísticas obtenidas exitosamente');
        } catch (error) {
            Logger.error('Error al obtener estadísticas:', error);
            return sendError(res, 'Error al obtener estadísticas', 500);
        }
    }
}