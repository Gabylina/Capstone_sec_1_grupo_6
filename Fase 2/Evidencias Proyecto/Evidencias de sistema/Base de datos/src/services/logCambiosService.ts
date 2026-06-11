import { Op } from 'sequelize';
import sequelize from '@/config/database';
import { LogCambios } from '@/models';

/**
 * Servicio para consulta de Log de Cambios
 * Solo incluye operaciones de lectura, ya que los registros se crean mediante triggers
 */

export class LogCambiosService {
    /**
     * Obtener todos los logs
     */
    static async getAllLogs(limit: number = 100, offset: number = 0) {
        const logs = await LogCambios.findAll({
            limit,
            offset,
            order: [['fecha_cambio', 'DESC']]
        });

        return logs;
    }

    /**
     * Obtener logs por tabla
     */
    static async getLogsByTabla(tabla: string, limit: number = 100) {
        const logs = await LogCambios.findAll({
            where: { tabla_afectada: tabla },
            limit,
            order: [['fecha_cambio', 'DESC']]
        });

        return logs;
    }

    /**
     * Obtener logs por registro específico
     */
    static async getLogsByRegistro(tabla: string, idRegistro: string) {
        const logs = await LogCambios.findAll({
            where: {
                tabla_afectada: tabla,
                id_registro: idRegistro
            },
            order: [['fecha_cambio', 'DESC']]
        });

        return logs;
    }

    /**
     * Obtener logs por usuario
     */
    static async getLogsByUsuario(usuario: string, limit: number = 100) {
        const logs = await LogCambios.findAll({
            where: { usuario_responsable: usuario },
            limit,
            order: [['fecha_cambio', 'DESC']]
        });

        return logs;
    }

    /**
     * Obtener logs por tipo de acción
     */
    static async getLogsByAccion(accion: string, limit: number = 100) {
        const logs = await LogCambios.findAll({
            where: { accion },
            limit,
            order: [['fecha_cambio', 'DESC']]
        });

        return logs;
    }

    /**
     * Obtener logs por rango de fechas
     */
    static async getLogsByFechas(fechaInicio: Date, fechaFin: Date) {
        const { Op } = require('sequelize');
        
        const logs = await LogCambios.findAll({
            where: {
                fecha_cambio: {
                    [Op.between]: [fechaInicio, fechaFin]
                }
            },
            order: [['fecha_cambio', 'DESC']]
        });

        return logs;
    }

    /**
     * Obtener un log específico por ID
     */
    static async getLogById(id: number) {
        const log = await LogCambios.findByPk(id);
        return log;
    }

    /**
     * Buscar logs con filtros combinados
     */
    static async searchLogs(filters: {
        tabla?: string[];
        usuario?: string[];
        accion?: string[];
        fechaInicio?: Date;
        fechaFin?: Date;
        limit?: number;
        offset?: number;
    }) {
        const { Op } = require('sequelize');
        const whereClause: any = {};

        if (filters.tabla?.length) {
            whereClause.tabla_afectada = filters.tabla.length === 1
                ? filters.tabla[0]
                : { [Op.in]: filters.tabla };
        }
        if (filters.usuario?.length) {
            whereClause.usuario_responsable = filters.usuario.length === 1
                ? filters.usuario[0]
                : { [Op.in]: filters.usuario };
        }
        if (filters.accion?.length) {
            whereClause.accion = filters.accion.length === 1
                ? filters.accion[0]
                : { [Op.in]: filters.accion };
        }
        if (filters.fechaInicio && filters.fechaFin) {
            whereClause.fecha_cambio = {
                [Op.between]: [filters.fechaInicio, filters.fechaFin]
            };
        } else if (filters.fechaInicio) {
            whereClause.fecha_cambio = {
                [Op.gte]: filters.fechaInicio
            };
        } else if (filters.fechaFin) {
            whereClause.fecha_cambio = {
                [Op.lte]: filters.fechaFin
            };
        }

        const logs = await LogCambios.findAll({
            where: whereClause,
            limit: filters.limit || 100,
            offset: filters.offset || 0,
            order: [['fecha_cambio', 'DESC']]
        });

        return logs;
    }

    /**
     * Obtener estadísticas de cambios
     */
    static async getEstadisticas() {
        const { Op } = require('sequelize');
        
        const totalCambios = await LogCambios.count();
        
        const cambiosPorAccion = await LogCambios.findAll({
            attributes: [
                'accion',
                [sequelize.fn('COUNT', sequelize.col('id_log')), 'total']
            ],
            group: ['accion']
        });

        const cambiosPorTabla = await LogCambios.findAll({
            attributes: [
                'tabla_afectada',
                [sequelize.fn('COUNT', sequelize.col('id_log')), 'total']
            ],
            group: ['tabla_afectada'],
            order: [[sequelize.fn('COUNT', sequelize.col('id_log')), 'DESC']],
            limit: 10
        });

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const cambiosHoy = await LogCambios.count({
            where: {
                fecha_cambio: {
                    [Op.gte]: hoy
                }
            }
        });

        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        
        const cambiosUltimaSemana = await LogCambios.count({
            where: {
                fecha_cambio: {
                    [Op.gte]: hace7Dias
                }
            }
        });

        return {
            total: totalCambios,
            cambiosHoy,
            cambiosUltimaSemana,
            porAccion: cambiosPorAccion,
            porTabla: cambiosPorTabla
        };
    }

    /**
     * Obtener actividad reciente
     */
    static async getActividadReciente(limit: number = 20) {
        const logs = await LogCambios.findAll({
            limit,
            order: [['fecha_cambio', 'DESC']]
        });

        return logs;
    }

    /**
     * Obtener historial de un registro específico
     */
    static async getHistorialRegistro(tabla: string, idRegistro: string) {
        const logs = await LogCambios.findAll({
            where: {
                tabla_afectada: tabla,
                id_registro: idRegistro
            },
            order: [['fecha_cambio', 'ASC']]
        });

        return {
            tabla,
            id_registro: idRegistro,
            total_cambios: logs.length,
            historial: logs
        };
    }

    /**
     * Obtener estadísticas simplificadas para administrador
     */
    static async getStats() {
        // Total de registros en el log
        const totalLogs = await LogCambios.count();

        // Usuarios únicos que han realizado cambios
        const usuariosUnicos = await LogCambios.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('usuario_responsable')), 'usuario']],
            raw: true
        });

        return {
            total_logs: totalLogs,
            usuarios_activos: usuariosUnicos.length
        };
    }
}

