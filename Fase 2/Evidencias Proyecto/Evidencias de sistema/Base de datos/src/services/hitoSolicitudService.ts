import { Transaction, Op } from 'sequelize';
import sequelize from '@/config/database';
import { setDatabaseUser } from '@/utils/databaseUser';
import { HitoSolicitud, Solicitud, DescripcionCargo, Contacto, Usuario, Cliente, EstadoSolicitudHist, EstadoSolicitud } from '@/models';
import { FechasLaborales } from '@/utils/fechasLaborales';
import { obtenerPlantillasPorServicio } from '@/data/plantillasHitos';
import { Logger } from '@/utils/logger';

function normalizarRut(rut: string | null | undefined): string {
    if (!rut) return '';
    return rut.toString().trim().replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Servicio para gestión de Hitos de Solicitud
 * Maneja plantillas y hitos activos por solicitud
 */

export class HitoSolicitudService {
    // ===========================================
    // GESTIÓN DE PLANTILLAS
    // ===========================================

    /**
     * Obtener todas las plantillas (hitos maestros)
     */
    static async getPlantillas(codigoServicio?: string) {
        const where: any = { id_solicitud: { [Op.is]: null } };
        if (codigoServicio) {
            where.codigo_servicio = codigoServicio;
        }

        const plantillas = await HitoSolicitud.findAll({
            where,
            order: [['codigo_servicio', 'ASC'], ['nombre_hito', 'ASC'], ['avisar_antes_dias', 'DESC']]
        });

        return plantillas;
    }

    /**
     * Crear plantilla de hito (para admin)
     */
    static async createPlantilla(data: {
        nombre_hito: string;
        tipo_ancla: string;
        duracion_dias: number;
        avisar_antes_dias: number;
        descripcion: string;
        codigo_servicio: string;
    }, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la sesión para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }
            
            const plantilla = await HitoSolicitud.create({
                ...data,
                id_solicitud: undefined,
                fecha_base: undefined,
                fecha_limite: undefined,
                fecha_cumplimiento: undefined
            }, { transaction });

            await transaction.commit();
            return plantilla;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // ===========================================
    // GESTIÓN DE HITOS POR SOLICITUD
    // ===========================================

    /**
     * Copiar plantillas a una solicitud específica
     */
    static async copiarPlantillasASolicitud(idSolicitud: number, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            // Obtener la solicitud para saber el tipo de servicio
            const solicitud = await Solicitud.findByPk(idSolicitud);
            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            // Obtener plantillas del servicio
            const plantillas = obtenerPlantillasPorServicio(solicitud.codigo_servicio);

            if (plantillas.length === 0) {
                console.log(`No hay plantillas para el servicio ${solicitud.codigo_servicio}`);
                await transaction.commit();
                return [];
            }

            // Crear hitos basados en las plantillas
            const hitosCreados = [];
            for (const plantilla of plantillas) {
                const hito = await HitoSolicitud.create({
                    ...plantilla,
                    id_solicitud: idSolicitud,
                    fecha_base: undefined,
                    fecha_limite: undefined,
                    fecha_cumplimiento: undefined
                }, { transaction });
                hitosCreados.push(hito);
            }

            await transaction.commit();
            return hitosCreados;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Crear hitos (línea de tiempo) para una solicitud recién creada.
     * Copia plantillas según el tipo de servicio y activa el hito "inicio_proceso".
     * Usar en todos los flujos que crean una nueva solicitud (createSolicitud, crearSolicitudConCandidatos, etc.).
     * No lanza: si falla, se registra y la creación de la solicitud no se ve afectada.
     */
    static async crearHitosParaSolicitudNueva(idSolicitud: number, usuarioRut?: string): Promise<void> {
        try {
            await this.copiarPlantillasASolicitud(idSolicitud, usuarioRut);
            await this.activarHitosPorEvento(idSolicitud, 'inicio_proceso', new Date(), usuarioRut);
            console.log(`✅ Hitos creados y activados para solicitud ${idSolicitud}`);
        } catch (error) {
            console.warn(`⚠️ No se pudieron crear hitos para la solicitud ${idSolicitud}:`, error);
        }
    }

    /**
     * Activar hitos por evento ancla
     */
    static async activarHitosPorEvento(idSolicitud: number, tipoAncla: string, fechaEvento: Date, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            // Buscar hitos pendientes con el tipo de ancla específico
            const hitosPendientes = await HitoSolicitud.findAll({
                where: {
                    id_solicitud: idSolicitud,
                    tipo_ancla: tipoAncla,
                    fecha_base: { [Op.is]: null } as any
                },
                transaction
            });

            // Activar cada hito
            for (const hito of hitosPendientes) {
                const fechaLimite = await FechasLaborales.sumarDiasHabiles(fechaEvento, hito.duracion_dias);

                await hito.update({
                    fecha_base: fechaEvento,
                    fecha_limite: fechaLimite
                }, { transaction });
            }

            await transaction.commit();
            return hitosPendientes;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Obtener hitos de una solicitud específica.
     * No se filtran por estado de la solicitud: la línea de tiempo se mantiene visible
     * aunque la solicitud esté Cerrada o finalizada.
     */
    static async getHitosBySolicitud(idSolicitud: number) {
        const hitos = await HitoSolicitud.findAll({
            where: { id_solicitud: idSolicitud },
            order: [['fecha_limite', 'ASC']]
        });

        return hitos.map(h => ({
            ...h.toJSON(),
            dias_restantes: h.diasHabilesRestantes(),
            debe_avisar: h.debeAvisar()
        }));
    }

    // ===========================================
    // CONSULTAS DASHBOARD
    // ===========================================

    /**
     * Obtener hitos VENCIDOS (atrasados)
     */
    static async getHitosVencidos(consultor_id?: string) {
        const where: any = {
                id_solicitud: { [Op.not]: null } as any,
                fecha_limite: { [Op.lt]: new Date() },
                fecha_cumplimiento: { [Op.is]: null } as any
        };

        const hitos = await HitoSolicitud.findAll({
            where,
            include: [
                {
                model: Solicitud,
                as: 'solicitud',
                    required: true,
                    include: [
                        { model: DescripcionCargo, as: 'descripcionCargo' },
                        { 
                            model: Contacto, 
                            as: 'contacto',
                            include: [
                                { model: Cliente, as: 'cliente' }
                            ]
                        },
                        { model: Usuario, as: 'usuario', required: true },
                        {
                            model: EstadoSolicitudHist,
                            as: 'historialEstados',
                            include: [{
                                model: EstadoSolicitud,
                                as: 'estado'
                            }],
                            limit: 1,
                            order: [['fecha_cambio_estado_solicitud', 'DESC']]
                        }
                    ]
                }
            ],
            order: [['fecha_limite', 'ASC']]
        });

        // Filtrar hitos de solicitudes congeladas o canceladas
        let hitosFiltrados = hitos.filter(h => {
            const hitoData = h.toJSON() as any;
            const historialEstados = hitoData.solicitud?.historialEstados || [];
            if (historialEstados.length === 0) {
                // Si no hay historial, incluir el hito (estado por defecto: Creado)
                return true;
            }
            const estadoActual = historialEstados[0]?.estado?.nombre_estado_solicitud?.toLowerCase() || '';
            // Excluir solicitudes congeladas o canceladas
            return estadoActual !== 'congelado' && estadoActual !== 'cancelado';
        });

        // Filtrar por consultor si se especifica
        if (consultor_id) {
            const consultorIdNormalizado = normalizarRut(consultor_id);
            const totalAntes = hitosFiltrados.length;
            hitosFiltrados = hitosFiltrados.filter(h => {
                const hitoData = h.toJSON() as any;
                const rutUsuario = hitoData.solicitud?.rut_usuario;
                const rutUsuarioNormalizado = normalizarRut(rutUsuario);
                return rutUsuarioNormalizado === consultorIdNormalizado;
            });
            Logger.debug(`[HITOS] Hitos vencidos para consultor ${consultor_id}: ${hitosFiltrados.length} de ${totalAntes} (total antes de filtrar congelados/cancelados: ${hitos.length})`);
        } else {
            Logger.debug(`[HITOS] Hitos vencidos (todos los consultores): ${hitosFiltrados.length} (total antes de filtrar congelados/cancelados: ${hitos.length})`);
        }

        return hitosFiltrados.map(h => {
            const hitoData = h.toJSON() as any;
            return {
                ...hitoData,
            estado: 'vencido',
                dias_atrasados: Math.abs(h.diasHabilesRestantes() || 0),
                descripcion: h.getMensajeAlerta(), // Usar mensaje dinámico
                solicitud: hitoData.solicitud ? {
                    ...hitoData.solicitud,
                    descripcionCargo: hitoData.solicitud.descripcionCargo,
                    contacto: hitoData.solicitud.contacto,
                    usuario: hitoData.solicitud.usuario
                } : null
            };
        });
    }

    /**
     * Obtener hitos POR VENCER (en período de aviso)
     */
    static async getHitosPorVencer(consultor_id?: string) {
        const ahora = new Date();
        
        const hitos = await HitoSolicitud.findAll({
            where: {
                id_solicitud: { [Op.not]: null } as any,
                fecha_limite: { [Op.gte]: ahora },
                fecha_cumplimiento: { [Op.is]: null } as any
            },
            include: [
                {
                model: Solicitud,
                as: 'solicitud',
                    required: true,
                    include: [
                        { model: DescripcionCargo, as: 'descripcionCargo' },
                        { 
                            model: Contacto, 
                            as: 'contacto',
                            include: [
                                { model: Cliente, as: 'cliente' }
                            ]
                        },
                        { model: Usuario, as: 'usuario', required: true },
                        {
                            model: EstadoSolicitudHist,
                            as: 'historialEstados',
                            include: [{
                                model: EstadoSolicitud,
                                as: 'estado'
                            }],
                            limit: 1,
                            order: [['fecha_cambio_estado_solicitud', 'DESC']]
                        }
                    ]
                }
            ],
            order: [['fecha_limite', 'ASC']]
        });

        // Filtrar hitos de solicitudes congeladas o canceladas
        let hitosFiltrados = hitos.filter(h => {
            const hitoData = h.toJSON() as any;
            const historialEstados = hitoData.solicitud?.historialEstados || [];
            if (historialEstados.length === 0) {
                // Si no hay historial, incluir el hito (estado por defecto: Creado)
                return true;
            }
            const estadoActual = historialEstados[0]?.estado?.nombre_estado_solicitud?.toLowerCase() || '';
            // Excluir solicitudes congeladas o canceladas
            return estadoActual !== 'congelado' && estadoActual !== 'cancelado';
        });

        // Filtrar por consultor si se especifica
        if (consultor_id) {
            const consultorIdNormalizado = normalizarRut(consultor_id);
            const totalAntes = hitosFiltrados.length;
            hitosFiltrados = hitosFiltrados.filter(h => {
                const hitoData = h.toJSON() as any;
                const rutUsuario = hitoData.solicitud?.rut_usuario;
                const rutUsuarioNormalizado = normalizarRut(rutUsuario);
                return rutUsuarioNormalizado === consultorIdNormalizado;
            });
            Logger.debug(`[HITOS] Hitos por vencer para consultor ${consultor_id}: ${hitosFiltrados.length} de ${totalAntes} (total antes de filtrar congelados/cancelados: ${hitos.length})`);
        } else {
            Logger.debug(`[HITOS] Hitos por vencer (todos los consultores): ${hitosFiltrados.length} (total antes de filtrar congelados/cancelados: ${hitos.length})`);
        }

        return hitosFiltrados.map(h => {
            const hitoData = h.toJSON() as any;
            const diasRestantes = h.diasHabilesRestantes();
            const debeAvisar = h.debeAvisar();
            
            return {
                ...hitoData,
                estado: diasRestantes && diasRestantes < 0 ? 'vencido' : 'por_vencer',
                dias_restantes: diasRestantes,
                debe_avisar: debeAvisar,
                descripcion: h.getMensajeAlerta(), // Usar mensaje dinámico
                solicitud: hitoData.solicitud ? {
                    ...hitoData.solicitud,
                    descripcionCargo: hitoData.solicitud.descripcionCargo,
                    contacto: hitoData.solicitud.contacto,
                    usuario: hitoData.solicitud.usuario
                } : null
            };
        });
    }

    /**
     * Obtener hitos PENDIENTES (no activados aún)
     */
    static async getHitosPendientes(consultor_id?: string) {
        const where: any = {
            id_solicitud: { [Op.not]: null } as any,
            fecha_base: { [Op.is]: null } as any
        };

        const hitos = await HitoSolicitud.findAll({
            where,
            include: [
                {
                model: Solicitud,
                as: 'solicitud',
                    include: [
                        { model: DescripcionCargo, as: 'descripcionCargo' },
                        { 
                            model: Contacto, 
                            as: 'contacto',
                            include: [
                                { model: Cliente, as: 'cliente' }
                            ]
                        },
                        { model: Usuario, as: 'usuario', required: true },
                        {
                            model: EstadoSolicitudHist,
                            as: 'historialEstados',
                            include: [{
                                model: EstadoSolicitud,
                                as: 'estado'
                            }],
                            limit: 1,
                            order: [['fecha_cambio_estado_solicitud', 'DESC']]
                        }
                    ]
                }
            ],
            order: [['nombre_hito', 'ASC']]
        });

        // Filtrar hitos de solicitudes congeladas o canceladas
        let hitosFiltrados = hitos.filter(h => {
            const hitoData = h.toJSON() as any;
            const historialEstados = hitoData.solicitud?.historialEstados || [];
            if (historialEstados.length === 0) {
                // Si no hay historial, incluir el hito (estado por defecto: Creado)
                return true;
            }
            const estadoActual = historialEstados[0]?.estado?.nombre_estado_solicitud?.toLowerCase() || '';
            // Excluir solicitudes congeladas o canceladas
            return estadoActual !== 'congelado' && estadoActual !== 'cancelado';
        });

        // Filtrar por consultor si se especifica
        if (consultor_id) {
            const consultorIdNormalizado = normalizarRut(consultor_id);
            const totalAntes = hitosFiltrados.length;
            hitosFiltrados = hitosFiltrados.filter(h => {
                const hitoData = h.toJSON() as any;
                const rutUsuario = hitoData.solicitud?.rut_usuario;
                const rutUsuarioNormalizado = normalizarRut(rutUsuario);
                return rutUsuarioNormalizado === consultorIdNormalizado;
            });
            Logger.debug(`[HITOS] Hitos pendientes para consultor ${consultor_id}: ${hitosFiltrados.length} de ${totalAntes} (total antes de filtrar congelados/cancelados: ${hitos.length})`);
        } else {
            Logger.debug(`[HITOS] Hitos pendientes (todos los consultores): ${hitosFiltrados.length} (total antes de filtrar congelados/cancelados: ${hitos.length})`);
        }

        return hitosFiltrados.map(h => {
            const hitoData = h.toJSON() as any;
            return {
                ...hitoData,
                estado: 'pendiente',
                dias_restantes: null,
                debe_avisar: false,
                solicitud: hitoData.solicitud
            };
        });
    }

    /**
     * Obtener hitos COMPLETADOS
     */
    static async getHitosCompletados(consultor_id?: string) {
        const where: any = {
            id_solicitud: { [Op.not]: null } as any,
            fecha_cumplimiento: { [Op.not]: null } as any
        };

        const hitos = await HitoSolicitud.findAll({
            where,
            include: [
                {
                model: Solicitud,
                as: 'solicitud',
                    include: [
                        { model: DescripcionCargo, as: 'descripcionCargo' },
                        { 
                            model: Contacto, 
                            as: 'contacto',
                            include: [
                                { model: Cliente, as: 'cliente' }
                            ]
                        },
                        { model: Usuario, as: 'usuario', required: true },
                        {
                            model: EstadoSolicitudHist,
                            as: 'historialEstados',
                            include: [{
                                model: EstadoSolicitud,
                                as: 'estado'
                            }],
                            limit: 1,
                            order: [['fecha_cambio_estado_solicitud', 'DESC']]
                        }
                    ]
                }
            ],
            order: [['fecha_cumplimiento', 'DESC']]
        });

        // Filtrar hitos de solicitudes congeladas o canceladas
        let hitosFiltrados = hitos.filter(h => {
            const hitoData = h.toJSON() as any;
            const historialEstados = hitoData.solicitud?.historialEstados || [];
            if (historialEstados.length === 0) {
                // Si no hay historial, incluir el hito (estado por defecto: Creado)
                return true;
            }
            const estadoActual = historialEstados[0]?.estado?.nombre_estado_solicitud?.toLowerCase() || '';
            // Excluir solicitudes congeladas o canceladas
            return estadoActual !== 'congelado' && estadoActual !== 'cancelado';
        });

        // Filtrar por consultor si se especifica
        if (consultor_id) {
            const consultorIdNormalizado = normalizarRut(consultor_id);
            const totalAntes = hitosFiltrados.length;
            hitosFiltrados = hitosFiltrados.filter(h => {
                const hitoData = h.toJSON() as any;
                const rutUsuario = hitoData.solicitud?.rut_usuario;
                const rutUsuarioNormalizado = normalizarRut(rutUsuario);
                return rutUsuarioNormalizado === consultorIdNormalizado;
            });
            Logger.debug(`[HITOS] Hitos completados para consultor ${consultor_id}: ${hitosFiltrados.length} de ${totalAntes} (total antes de filtrar congelados/cancelados: ${hitos.length})`);
        } else {
            Logger.debug(`[HITOS] Hitos completados (todos los consultores): ${hitosFiltrados.length} (total antes de filtrar congelados/cancelados: ${hitos.length})`);
        }

        return hitosFiltrados.map(h => {
            const hitoData = h.toJSON() as any;
            return {
                ...hitoData,
                estado: 'completado',
                dias_restantes: 0,
                debe_avisar: false,
                solicitud: hitoData.solicitud
            };
        });
    }

    /**
     * Estadísticas de hitos para dashboard
     */
    static async getEstadisticas() {
        const totalHitos = await HitoSolicitud.count({ 
            where: { id_solicitud: { [Op.not]: null } } as any
        });

        const hitosCompletados = await HitoSolicitud.count({
            where: {
                id_solicitud: { [Op.not]: null } as any,
                fecha_cumplimiento: { [Op.not]: null } as any
            }
        });

        const hitosVencidos = await HitoSolicitud.count({
            where: {
                id_solicitud: { [Op.not]: null } as any,
                fecha_limite: { [Op.lt]: new Date() },
                fecha_cumplimiento: { [Op.is]: null } as any
            }
        });

        const hitosPorVencer = await HitoSolicitud.count({
            where: {
                id_solicitud: { [Op.not]: null } as any,
                fecha_limite: { [Op.gte]: new Date() },
                fecha_cumplimiento: { [Op.is]: null } as any
            }
        });

        const totalHitosNum = totalHitos as number;
        const hitosCompletadosNum = hitosCompletados as number;
        const hitosVencidosNum = hitosVencidos as number;
        const hitosPorVencerNum = hitosPorVencer as number;

        return {
            total: totalHitosNum,
            completados: hitosCompletadosNum,
            vencidos: hitosVencidosNum,
            por_vencer: hitosPorVencerNum,
            pendientes: totalHitosNum - hitosCompletadosNum - hitosVencidosNum - hitosPorVencerNum,
            porcentaje_completados: totalHitosNum > 0 ? Math.round((hitosCompletadosNum / totalHitosNum) * 100) : 0
        };
    }

    // ===========================================
    // MARCAR HITO COMO COMPLETADO
    // ===========================================

    /**
     * Marcar hito como completado
     */
    static async completarHito(id: number, fechaCumplimiento?: Date) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            const hito = await HitoSolicitud.findByPk(id);
            if (!hito) {
                throw new Error('Hito no encontrado');
            }

            if (hito.esPlantilla()) {
                throw new Error('No se puede completar una plantilla');
            }

            await hito.update({
                fecha_cumplimiento: fechaCumplimiento || new Date()
            }, { transaction });

            await transaction.commit();
            return hito;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // ===========================================
    // CRUD BÁSICO
    // ===========================================

    /**
     * Obtener un hito específico
     */
    static async getHitoById(id: number) {
        const hito = await HitoSolicitud.findByPk(id);
        if (!hito) {
            throw new Error('Hito no encontrado');
        }

        return {
            ...hito.toJSON(),
            dias_restantes: hito.diasHabilesRestantes(),
            debe_avisar: hito.debeAvisar()
        };
    }

    /**
     * Actualizar hito
     */
    static async updateHito(id: number, data: Partial<{
        nombre_hito: string;
        tipo_ancla: string;
        duracion_dias: number;
        avisar_antes_dias: number;
        descripcion: string;
        codigo_servicio: string;
        fecha_base: Date;
        fecha_limite: Date;
        fecha_cumplimiento: Date;
    }>, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la sesión para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }
            
            const hito = await HitoSolicitud.findByPk(id);
            if (!hito) {
                throw new Error('Hito no encontrado');
            }

            await hito.update(data, { transaction });
            await transaction.commit();
            return hito;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Eliminar hito (solo plantillas)
     */
    static async deleteHito(id: number, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la sesión para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }
            
            const hito = await HitoSolicitud.findByPk(id);
            if (!hito) {
                throw new Error('Hito no encontrado');
            }

            if (!hito.esPlantilla()) {
                throw new Error('Solo se pueden eliminar plantillas');
            }

            await hito.destroy({ transaction });
            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}
