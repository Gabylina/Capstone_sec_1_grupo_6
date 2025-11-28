import { Transaction, Sequelize } from 'sequelize';
import sequelize from '@/config/database';
import { EvaluacionPsicolaboral, EvaluacionTest, TestPsicolaboral, Postulacion, Solicitud, TipoServicio } from '@/models';
import { HitoHelperService } from './hitoHelperService';
import { setDatabaseUser } from '@/utils/databaseUser';

/**
 * Función para convertir fecha a string SQL sin zona horaria
 * Formato esperado de entrada: "YYYY-MM-DDTHH:mm"
 * Formato de salida: "YYYY-MM-DD HH:mm:ss" para SQL
 */
function formatDateForSQL(dateString: string | Date | null | undefined): string | null {
    if (!dateString) return null;
    
    let date: Date;
    if (dateString instanceof Date) {
        // Si ya es Date, usar directamente pero formatear sin zona horaria
        const year = dateString.getFullYear();
        const month = String(dateString.getMonth() + 1).padStart(2, '0');
        const day = String(dateString.getDate()).padStart(2, '0');
        const hour = String(dateString.getHours()).padStart(2, '0');
        const minute = String(dateString.getMinutes()).padStart(2, '0');
        const second = String(dateString.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }
    
    // Formato: "YYYY-MM-DDTHH:mm"
    const [datePart, timePart] = dateString.split('T');
    if (!datePart) return null;
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '00:00').split(':').map(Number);
    
    // Crear string SQL directamente: "YYYY-MM-DD HH:mm:ss"
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const hourStr = String(hour || 0).padStart(2, '0');
    const minuteStr = String(minute || 0).padStart(2, '0');
    
    return `${year}-${monthStr}-${dayStr} ${hourStr}:${minuteStr}:00`;
}

/**
 * Servicio para gestión de Evaluaciones Psicolaborales
 */

export class EvaluacionPsicolaboralService {
    /**
     * Obtener todas las evaluaciones
     */
    static async getAllEvaluaciones() {
        const evaluaciones = await EvaluacionPsicolaboral.findAll({
            include: [
                {
                    model: Postulacion,
                    as: 'postulacion',
                    attributes: ['id_postulacion', 'id_candidato', 'id_solicitud']
                },
                {
                    model: TestPsicolaboral,
                    as: 'tests',
                    through: {
                        attributes: ['resultado_test']
                    }
                }
            ],
            order: [['fecha_evaluacion', 'DESC']]
        });

        return evaluaciones;
    }

    /**
     * Obtener evaluaciones por postulación
     */
    static async getEvaluacionesByPostulacion(idPostulacion: number) {
        const evaluaciones = await EvaluacionPsicolaboral.findAll({
            where: { id_postulacion: idPostulacion },
            include: [
                {
                    model: TestPsicolaboral,
                    as: 'tests',
                    through: {
                        attributes: ['resultado_test']
                    }
                }
            ],
            order: [['fecha_evaluacion', 'DESC']]
        });

        return evaluaciones;
    }

    /**
     * Obtener evaluaciones pendientes (Sin programar o Programadas)
     */
    static async getEvaluacionesPendientes() {
        const evaluaciones = await EvaluacionPsicolaboral.findAll({
            where: {
                estado_evaluacion: ['Sin programar', 'Programada']
            },
            include: [
                {
                    model: Postulacion,
                    as: 'postulacion'
                }
            ],
            order: [['fecha_evaluacion', 'ASC']]
        });

        return evaluaciones;
    }

    /**
     * Obtener una evaluación por ID
     */
    static async getEvaluacionById(id: number) {
        const evaluacion = await EvaluacionPsicolaboral.findByPk(id, {
            include: [
                {
                    model: Postulacion,
                    as: 'postulacion'
                },
                {
                    model: TestPsicolaboral,
                    as: 'tests',
                    through: {
                        attributes: ['resultado_test']
                    }
                }
            ]
        });

        return evaluacion;
    }

    /**
     * Crear una nueva evaluación psicolaboral
     */
    static async createEvaluacion(data: {
        fecha_evaluacion?: Date | string | null;
        fecha_envio_informe?: Date | string | null;
        estado_evaluacion: string;
        estado_informe: string;
        conclusion_global: string;
        id_postulacion: number;
        tests?: Array<{
            id_test_psicolaboral: number;
            resultado_test: string;
        }>;
    }, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            // Verificar que la postulación existe y obtener la solicitud con su tipo de servicio
            const postulacion = await Postulacion.findByPk(data.id_postulacion, {
                include: [{
                    model: Solicitud,
                    as: 'solicitud',
                    include: [{
                        model: TipoServicio,
                        as: 'tipoServicio'
                    }]
                }],
                transaction
            });
            if (!postulacion) {
                throw new Error('Postulación no encontrada');
            }

            // Formatear fecha_evaluacion como string SQL sin zona horaria
            const fechaEvaluacionSQL = formatDateForSQL(data.fecha_evaluacion);
            const fechaEnvioInformeSQL = formatDateForSQL(data.fecha_envio_informe ?? null);

            // Crear la evaluación usando Sequelize.literal para evitar conversión UTC
            const createData: any = {
                estado_evaluacion: data.estado_evaluacion,
                estado_informe: data.estado_informe,
                conclusion_global: data.conclusion_global,
                id_postulacion: data.id_postulacion
            };

            if (fechaEvaluacionSQL) {
                createData.fecha_evaluacion = Sequelize.literal(`'${fechaEvaluacionSQL}'::timestamp`);
            } else {
                createData.fecha_evaluacion = null;
            }

            if (fechaEnvioInformeSQL) {
                createData.fecha_envio_informe = Sequelize.literal(`'${fechaEnvioInformeSQL}'::timestamp`);
            } else {
                createData.fecha_envio_informe = null;
            }

            const evaluacion = await EvaluacionPsicolaboral.create(createData, { transaction });

            // Si se proporcionan tests, crear las relaciones
            if (data.tests && data.tests.length > 0) {
                for (const test of data.tests) {
                    // Verificar que el test existe
                    const testExiste = await TestPsicolaboral.findByPk(test.id_test_psicolaboral);
                    if (!testExiste) {
                        throw new Error(`Test ${test.id_test_psicolaboral} no encontrado`);
                    }

                    await EvaluacionTest.create({
                        id_evaluacion_psicolaboral: evaluacion.id_evaluacion_psicolaboral,
                        id_test_psicolaboral: test.id_test_psicolaboral,
                        resultado_test: test.resultado_test
                    }, { transaction });
                }
            }

            // Si se agregó una fecha de entrevista/test, marcar el Hito 1 (Agendar entrevista/test)
            if (fechaEvaluacionSQL) {
                const solicitud = (postulacion as any).get('solicitud') as any;
                if (solicitud) {
                    const tipoServicio = solicitud.get('tipoServicio') as any;
                    if (tipoServicio) {
                        const codigoServicio = tipoServicio.codigo_servicio;
                        // Solo marcar para servicios de evaluación/test (ES, AP, TS)
                        if (['ES', 'AP', 'TS'].includes(codigoServicio)) {
                            await HitoHelperService.marcarHitoAgendarEntrevista(
                                solicitud.id_solicitud,
                                codigoServicio,
                                transaction
                            );
                        }
                    }
                }
            }

            await transaction.commit();
            
            // Retornar la evaluación con sus tests
            return await this.getEvaluacionById(evaluacion.id_evaluacion_psicolaboral);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Actualizar una evaluación psicolaboral
     */
    static async updateEvaluacion(id: number, data: Partial<{
        fecha_evaluacion: Date | string | null;
        fecha_envio_informe: Date | string | null;
        estado_evaluacion: string;
        estado_informe: string;
        conclusion_global: string;
    }>, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const evaluacion = await EvaluacionPsicolaboral.findByPk(id, {
                include: [{
                    model: Postulacion,
                    as: 'postulacion',
                    include: [{
                        model: Solicitud,
                        as: 'solicitud',
                        include: [{
                            model: TipoServicio,
                            as: 'tipoServicio'
                        }]
                    }]
                }],
                transaction
            });
            if (!evaluacion) {
                throw new Error('Evaluación no encontrada');
            }

            // Verificar si estamos agregando una fecha de entrevista por primera vez
            const fechaPreviaExiste = evaluacion.fecha_evaluacion != null;
            let marcarHito = false;

            // Formatear fecha_evaluacion como string SQL sin zona horaria
            const updateData: any = { ...data };
            if (data.fecha_evaluacion !== undefined) {
                const fechaEvaluacionSQL = formatDateForSQL(data.fecha_evaluacion);
                if (fechaEvaluacionSQL) {
                    updateData.fecha_evaluacion = Sequelize.literal(`'${fechaEvaluacionSQL}'::timestamp`);
                    // Si no había fecha previa y ahora sí, marcar hito
                    if (!fechaPreviaExiste) {
                        marcarHito = true;
                    }
                } else {
                    updateData.fecha_evaluacion = null;
                }
            }

            if (data.fecha_envio_informe !== undefined) {
                const fechaEnvioInformeSQL = formatDateForSQL(data.fecha_envio_informe);
                if (fechaEnvioInformeSQL) {
                    updateData.fecha_envio_informe = Sequelize.literal(`'${fechaEnvioInformeSQL}'::timestamp`);
                } else {
                    updateData.fecha_envio_informe = null;
                }
            }

            await evaluacion.update(updateData, { transaction });

            // Marcar el Hito 1 (Agendar entrevista/test) si se agregó la fecha por primera vez
            if (marcarHito) {
                const postulacion = (evaluacion as any).get('postulacion') as any;
                if (postulacion) {
                    const solicitud = postulacion.get('solicitud') as any;
                    if (solicitud) {
                        const tipoServicio = solicitud.get('tipoServicio') as any;
                        if (tipoServicio) {
                            const codigoServicio = tipoServicio.codigo_servicio;
                            // Solo marcar para servicios de evaluación/test (ES, AP, TS)
                            if (['ES', 'AP', 'TS'].includes(codigoServicio)) {
                                await HitoHelperService.marcarHitoAgendarEntrevista(
                                    solicitud.id_solicitud,
                                    codigoServicio,
                                    transaction
                                );
                            }
                        }
                    }
                }
            }

            await transaction.commit();
            return evaluacion;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Agregar resultado de test a una evaluación
     */
    static async addTestResultado(idEvaluacion: number, idTest: number, resultado: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            const evaluacion = await EvaluacionPsicolaboral.findByPk(idEvaluacion);
            if (!evaluacion) {
                throw new Error('Evaluación no encontrada');
            }

            const test = await TestPsicolaboral.findByPk(idTest);
            if (!test) {
                throw new Error('Test no encontrado');
            }

            // Verificar si ya existe el resultado
            const existente = await EvaluacionTest.findOne({
                where: {
                    id_evaluacion_psicolaboral: idEvaluacion,
                    id_test_psicolaboral: idTest
                }
            });

            if (existente) {
                // Actualizar
                await existente.update({ resultado_test: resultado }, { transaction });
            } else {
                // Crear
                await EvaluacionTest.create({
                    id_evaluacion_psicolaboral: idEvaluacion,
                    id_test_psicolaboral: idTest,
                    resultado_test: resultado
                }, { transaction });
            }

            await transaction.commit();
            return await this.getEvaluacionById(idEvaluacion);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Eliminar resultado de test de una evaluación
     */
    static async deleteTestResultado(idEvaluacion: number, idTest: number) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            const evaluacionTest = await EvaluacionTest.findOne({
                where: {
                    id_evaluacion_psicolaboral: idEvaluacion,
                    id_test_psicolaboral: idTest
                }
            });

            if (!evaluacionTest) {
                throw new Error('Resultado de test no encontrado');
            }

            await evaluacionTest.destroy({ transaction });

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Marcar evaluación como realizada
     */
    static async marcarComoRealizada(id: number, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const evaluacion = await EvaluacionPsicolaboral.findByPk(id);
            if (!evaluacion) {
                throw new Error('Evaluación no encontrada');
            }

            await evaluacion.update({
                estado_evaluacion: 'Realizada'
            }, { transaction });

            await transaction.commit();
            return evaluacion;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Actualizar estado de informe
     */
    static async actualizarEstadoInforme(id: number, estadoInforme: 'Pendiente' | 'Recomendable' | 'No recomendable' | 'Recomendable con observaciones', usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const evaluacion = await EvaluacionPsicolaboral.findByPk(id);
            if (!evaluacion) {
                throw new Error('Evaluación no encontrada');
            }

            await evaluacion.update({
                estado_informe: estadoInforme,
                fecha_envio_informe: new Date()
            }, { transaction });

            await transaction.commit();
            return evaluacion;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Actualizar conclusión global del informe
     */
    static async actualizarConclusionGlobal(id: number, conclusionGlobal: string, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const evaluacion = await EvaluacionPsicolaboral.findByPk(id);
            if (!evaluacion) {
                throw new Error('Evaluación no encontrada');
            }

            await evaluacion.update({
                conclusion_global: conclusionGlobal
            }, { transaction });

            await transaction.commit();
            return evaluacion;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Actualizar estado del informe y conclusión global
     */
    static async actualizarInformeCompleto(id: number, estadoInforme: 'Pendiente' | 'Recomendable' | 'No recomendable' | 'Recomendable con observaciones', conclusionGlobal: string, fechaEnvioInforme?: Date | string, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const evaluacion = await EvaluacionPsicolaboral.findByPk(id);
            if (!evaluacion) {
                throw new Error('Evaluación no encontrada');
            }

            let fechaEnvio: Date | null = null;
            if (fechaEnvioInforme !== undefined) {
                const parsed = typeof fechaEnvioInforme === 'string' ? new Date(fechaEnvioInforme) : fechaEnvioInforme;
                if (isNaN(parsed.getTime())) {
                    throw new Error('Fecha de envío del informe inválida');
                }
                fechaEnvio = parsed;
            }

            // Preparar datos de actualización
            const updateData: any = {
                estado_informe: estadoInforme,
                fecha_envio_informe: fechaEnvio ?? new Date()
            };

            // Actualizar conclusión global: si se proporciona y tiene contenido, usar el valor; si no, establecer a null
            if (conclusionGlobal !== undefined && conclusionGlobal !== null && conclusionGlobal.trim().length > 0) {
                updateData.conclusion_global = conclusionGlobal.trim();
            } else {
                // Si se envía undefined, null o cadena vacía, establecer a null para eliminar el valor
                updateData.conclusion_global = null;
            }

            await evaluacion.update(updateData, { transaction });

            await transaction.commit();
            return evaluacion;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Eliminar una evaluación psicolaboral
     */
    static async deleteEvaluacion(id: number) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            const evaluacion = await EvaluacionPsicolaboral.findByPk(id);
            if (!evaluacion) {
                throw new Error('Evaluación no encontrada');
            }

            // Eliminar primero los resultados de tests
            await EvaluacionTest.destroy({
                where: { id_evaluacion_psicolaboral: id },
                transaction
            });

            // Eliminar la evaluación
            await evaluacion.destroy({ transaction });

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

