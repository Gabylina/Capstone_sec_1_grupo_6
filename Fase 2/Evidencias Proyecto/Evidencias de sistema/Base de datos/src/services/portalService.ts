import { Transaction, Op } from 'sequelize';
import sequelize from '@/config/database';
import { PortalPostulacion, Publicacion } from '@/models';
import { setDatabaseUser } from '@/utils/databaseUser';

/**
 * Servicio para gestión de Portales de Postulación
 * Contiene toda la lógica de negocio relacionada con portales
 */

export class PortalService {
    /**
     * Obtener todos los portales
     */
    static async getAllPortales() {
        const portales = await PortalPostulacion.findAll({
            order: [['nombre_portal_postulacion', 'ASC']]
        });

        return portales.map(portal => ({
            id: portal.id_portal_postulacion,
            nombre: portal.nombre_portal_postulacion
        }));
    }

    /**
     * Obtener un portal por ID
     */
    static async getPortalById(id: number) {
        const portal = await PortalPostulacion.findByPk(id);

        if (!portal) {
            return null;
        }

        return {
            id: portal.id_portal_postulacion,
            nombre: portal.nombre_portal_postulacion
        };
    }

    /**
     * Crear un nuevo portal
     */
    static async createPortal(data: {
        nombre_portal_postulacion: string;
    }, usuarioRut?: string) {
        // Validar que el nombre no esté vacío
        if (!data.nombre_portal_postulacion || data.nombre_portal_postulacion.trim().length < 2) {
            throw new Error('El nombre del portal debe tener al menos 2 caracteres');
        }

        if (data.nombre_portal_postulacion.trim().length > 100) {
            throw new Error('El nombre del portal no puede exceder 100 caracteres');
        }

        // Verificar si ya existe un portal con el mismo nombre
        const portalExistente = await PortalPostulacion.findOne({
            where: {
                nombre_portal_postulacion: data.nombre_portal_postulacion.trim()
            }
        });

        if (portalExistente) {
            throw new Error('Ya existe un portal con este nombre');
        }

        // Crear el portal
        const nuevoPortal = await PortalPostulacion.create({
            nombre_portal_postulacion: data.nombre_portal_postulacion.trim()
        });

        return {
            id: nuevoPortal.id_portal_postulacion,
            nombre: nuevoPortal.nombre_portal_postulacion
        };
    }

    /**
     * Actualizar un portal
     */
    static async updatePortal(id: number, data: {
        nombre_portal_postulacion: string;
    }, usuarioRut?: string) {
        const portal = await PortalPostulacion.findByPk(id);

        if (!portal) {
            throw new Error('Portal no encontrado');
        }

        // Validar que el nombre no esté vacío
        if (!data.nombre_portal_postulacion || data.nombre_portal_postulacion.trim().length < 2) {
            throw new Error('El nombre del portal debe tener al menos 2 caracteres');
        }

        if (data.nombre_portal_postulacion.trim().length > 100) {
            throw new Error('El nombre del portal no puede exceder 100 caracteres');
        }

        // Verificar si ya existe otro portal con el mismo nombre
        const portalExistente = await PortalPostulacion.findOne({
            where: {
                nombre_portal_postulacion: data.nombre_portal_postulacion.trim(),
                id_portal_postulacion: { [Op.ne]: id }
            }
        });

        if (portalExistente) {
            throw new Error('Ya existe otro portal con este nombre');
        }

        // Actualizar el portal
        await portal.update({
            nombre_portal_postulacion: data.nombre_portal_postulacion.trim()
        });

        return {
            id: portal.id_portal_postulacion,
            nombre: portal.nombre_portal_postulacion
        };
    }

    /**
     * Eliminar un portal
     */
    static async deletePortal(id: number, usuarioRut?: string) {
        const portal = await PortalPostulacion.findByPk(id);

        if (!portal) {
            throw new Error('Portal no encontrado');
        }

        // Verificar si el portal está siendo usado en publicaciones
        const publicacionesAsociadas = await Publicacion.count({
            where: {
                id_portal_postulacion: id
            }
        });

        if (publicacionesAsociadas > 0) {
            throw new Error(`No se puede eliminar el portal porque tiene ${publicacionesAsociadas} publicación${publicacionesAsociadas > 1 ? 'es' : ''} asociada${publicacionesAsociadas > 1 ? 's' : ''}. Por favor elimine primero las publicaciones asociadas.`);
        }

        await portal.destroy();

        return {
            id: portal.id_portal_postulacion,
            nombre: portal.nombre_portal_postulacion
        };
    }
}

