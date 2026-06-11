import { Transaction } from 'sequelize';
import sequelize from '@/config/database';
import { Contratacion, Postulacion, EstadoContratacion } from '@/models';

/**
 * Servicio para gestión de Contrataciones
 */

export class ContratacionService {
    /**
     * Obtener todas las contrataciones
     */
    static async getAllContrataciones() {
        const contrataciones = await Contratacion.findAll({
            include: [
                {
                    model: Postulacion,
                    as: 'postulacion',
                    attributes: ['id_postulacion', 'id_candidato', 'id_solicitud']
                },
                {
                    model: EstadoContratacion,
                    as: 'estadoContratacion',
                    attributes: ['id_estado_contratacion', 'nombre_estado_contratacion']
                }
            ],
            order: [['id_contratacion', 'DESC']]
        });

        return contrataciones;
    }

    /**
     * Obtener contrataciones por estado
     */
    static async getContratacionesByEstado(idEstado: number) {
        const contrataciones = await Contratacion.findAll({
            where: { id_estado_contratacion: idEstado },
            include: [
                {
                    model: Postulacion,
                    as: 'postulacion'
                },
                {
                    model: EstadoContratacion,
                    as: 'estadoContratacion'
                }
            ],
            order: [['id_contratacion', 'DESC']]
        });

        return contrataciones;
    }

    /**
     * Obtener contratación por postulación
     */
    static async getContratacionByPostulacion(idPostulacion: number) {
        const contratacion = await Contratacion.findOne({
            where: { id_postulacion: idPostulacion },
            include: [
                {
                    model: Postulacion,
                    as: 'postulacion'
                },
                {
                    model: EstadoContratacion,
                    as: 'estadoContratacion'
                }
            ]
        });

        return contratacion;
    }

    /**
     * Obtener una contratación por ID
     */
    static async getContratacionById(id: number) {
        const contratacion = await Contratacion.findByPk(id, {
            include: [
                {
                    model: Postulacion,
                    as: 'postulacion'
                },
                {
                    model: EstadoContratacion,
                    as: 'estadoContratacion'
                }
            ]
        });

        return contratacion;
    }

    /**
     * Crear una nueva contratación
     */
    static async createContratacion(data: {
        fecha_ingreso_contratacion?: Date;
        observaciones_contratacion: string;
        encuesta_satisfaccion?: string;
        fecha_respuesta_cliente?: Date;
        id_postulacion: number;
        id_estado_contratacion: number;
    }) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Verificar que la postulación existe
            const postulacion = await Postulacion.findByPk(data.id_postulacion);
            if (!postulacion) {
                throw new Error('Postulación no encontrada');
            }

            // Verificar que la postulación no tenga ya una contratación
            const contratacionExistente = await Contratacion.findOne({
                where: { id_postulacion: data.id_postulacion }
            });

            if (contratacionExistente) {
                throw new Error('Esta postulación ya tiene una contratación asociada');
            }

            // Verificar que el estado existe
            const estado = await EstadoContratacion.findByPk(data.id_estado_contratacion);
            if (!estado) {
                throw new Error('Estado de contratación no encontrado');
            }

            const contratacion = await Contratacion.create(data, { transaction });

            await transaction.commit();
            return contratacion;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Actualizar una contratación
     */
    static async updateContratacion(id: number, data: Partial<{
        fecha_ingreso_contratacion: Date;
        observaciones_contratacion: string;
        encuesta_satisfaccion: string;
        fecha_respuesta_cliente: Date;
        id_estado_contratacion: number;
    }>) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            const contratacion = await Contratacion.findByPk(id);
            if (!contratacion) {
                throw new Error('Contratación no encontrada');
            }

            // Si se actualiza el estado, verificar que existe
            if (data.id_estado_contratacion) {
                const estado = await EstadoContratacion.findByPk(data.id_estado_contratacion);
                if (!estado) {
                    throw new Error('Estado de contratación no encontrado');
                }
            }

            await contratacion.update(data, { transaction });

            await transaction.commit();
            return contratacion;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Actualizar estado de contratación
     */
    static async updateEstado(id: number, idEstado: number) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            const contratacion = await Contratacion.findByPk(id);
            if (!contratacion) {
                throw new Error('Contratación no encontrada');
            }

            const estado = await EstadoContratacion.findByPk(idEstado);
            if (!estado) {
                throw new Error('Estado de contratación no encontrado');
            }

            await contratacion.update({
                id_estado_contratacion: idEstado
            }, { transaction });

            await transaction.commit();
            return contratacion;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Registrar encuesta de satisfacción
     */
    static async registrarEncuesta(id: number, encuesta: string | Record<string, unknown>) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            const contratacion = await Contratacion.findByPk(id);
            if (!contratacion) {
                throw new Error('Contratación no encontrada');
            }

            let payload: string;
            if (typeof encuesta === 'string') {
                payload = encuesta.trim();
            } else {
                const {
                    buildEncuestaSatisfaccionJson,
                    buildEncuestaSatisfaccionJsonLegacy,
                } = await import('@/utils/encuestaSatisfaccion');

                if (
                    encuesta.comunicacion !== undefined &&
                    encuesta.calidad_candidatos !== undefined &&
                    encuesta.acompanamiento !== undefined
                ) {
                    payload = buildEncuestaSatisfaccionJson({
                        comunicacion: Number(encuesta.comunicacion),
                        calidad_candidatos: Number(encuesta.calidad_candidatos),
                        tiempo: Number(encuesta.tiempo),
                        acompanamiento: Number(encuesta.acompanamiento),
                        volveria_trabajar: encuesta.volveria_trabajar === true
                            || encuesta.volveria_trabajar === 'true'
                            || encuesta.volveria_trabajar === 'si',
                        motivo_no: typeof encuesta.motivo_no === 'string' ? encuesta.motivo_no : undefined,
                    });
                } else {
                    payload = buildEncuestaSatisfaccionJsonLegacy({
                        calidad: Number(encuesta.calidad),
                        tiempo: Number(encuesta.tiempo),
                        apoyo: Number(encuesta.apoyo ?? encuesta.sensacion_apoyo),
                    });
                }
            }

            await contratacion.update({
                encuesta_satisfaccion: payload
            }, { transaction });

            await transaction.commit();
            return contratacion;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Eliminar una contratación
     */
    static async deleteContratacion(id: number) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            const contratacion = await Contratacion.findByPk(id);
            if (!contratacion) {
                throw new Error('Contratación no encontrada');
            }

            await contratacion.destroy({ transaction });

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Obtener estadísticas de contrataciones
     */
    static async getEstadisticas() {
        const { Op } = require('sequelize');
        
        const total = await Contratacion.count();
        const contratados = await Contratacion.count({
            include: [{
                model: EstadoContratacion,
                as: 'estadoContratacion',
                where: { nombre_estado_contratacion: 'Contratado' }
            }]
        });
        const enProceso = await Contratacion.count({
            include: [{
                model: EstadoContratacion,
                as: 'estadoContratacion',
                where: { nombre_estado_contratacion: 'En Proceso' }
            }]
        });

        return {
            total,
            contratados,
            enProceso,
            tasa_contratacion: total > 0 ? (contratados / total) * 100 : 0
        };
    }
}

