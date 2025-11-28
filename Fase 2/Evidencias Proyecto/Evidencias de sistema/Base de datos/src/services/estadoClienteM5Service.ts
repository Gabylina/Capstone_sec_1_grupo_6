import { Transaction, Op, QueryTypes } from 'sequelize';
import sequelize from '@/config/database';
import EstadoClienteM5 from '@/models/EstadoClienteM5';
import EstadoClientePostulacionM5 from '@/models/EstadoClientePostulacionM5';
import Postulacion from '@/models/Postulacion';
import Contratacion from '@/models/Contratacion';
import EvaluacionPsicolaboral from '@/models/EvaluacionPsicolaboral';
import { Logger } from '@/utils/logger';
import { setDatabaseUser } from '@/utils/databaseUser';

export default class EstadoClienteM5Service {
    
    /**
     * Obtener todos los estados del módulo 5
     */
    static async getAllEstados() {
        return await EstadoClienteM5.findAll({
            order: [['id_estado_cliente_postulacion_m5', 'ASC']]
        });
    }

    /**
     * Obtener estado por ID
     */
    static async getEstadoById(id: number) {
        return await EstadoClienteM5.findByPk(id);
    }

    /**
     * Cambiar estado de cliente para una postulación (Módulo 5)
     */
    static async cambiarEstado(
        id_postulacion: number, 
        data: {
            id_estado_cliente_postulacion_m5: number;
            fecha_feedback_cliente_m5: string | null;
            comentario_modulo5_cliente?: string;
        },
        usuarioRut?: string
    ) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }
            const { id_estado_cliente_postulacion_m5, fecha_feedback_cliente_m5, comentario_modulo5_cliente } = data;

            console.log(`[DEBUG] Cambiando estado módulo 5 - Postulación: ${id_postulacion}, Estado: ${id_estado_cliente_postulacion_m5}`);
            console.log(`[DEBUG] Fecha recibida: ${fecha_feedback_cliente_m5}`);

            // Verificar que la postulación existe
            const postulacion = await Postulacion.findByPk(id_postulacion);
            if (!postulacion) {
                throw new Error('Postulación no encontrada');
            }

            // Verificar que el estado existe
            const estadoCliente = await EstadoClienteM5.findByPk(id_estado_cliente_postulacion_m5);
            if (!estadoCliente) {
                console.log(`[ERROR] Estado de cliente ${id_estado_cliente_postulacion_m5} no encontrado`);
                throw new Error('Estado de cliente no encontrado');
            }

            console.log(`[DEBUG] Estado encontrado: ${estadoCliente.nombre_estado}`);

            // Verificar si requiere comentarios
            if (estadoCliente.requiereComentarios() && (!comentario_modulo5_cliente || comentario_modulo5_cliente.trim() === '')) {
                throw new Error(`Los comentarios son obligatorios para el estado "${estadoCliente.nombre_estado}"`);
            }

            // Buscar registro existente por la clave primaria compuesta
                const registroExistente = await EstadoClientePostulacionM5.findOne({
                    where: {
                    id_estado_cliente_postulacion_m5,
                    id_postulacion
                },
                transaction
            });

            if (registroExistente) {
                // Actualizar registro existente
                console.log(`[DEBUG] Actualizando registro existente`);
                await registroExistente.update({
                    fecha_feedback_cliente_m5: fecha_feedback_cliente_m5 ? new Date(fecha_feedback_cliente_m5 + 'T00:00:00') : registroExistente.fecha_feedback_cliente_m5,
                    comentario_modulo5_cliente: comentario_modulo5_cliente !== undefined ? comentario_modulo5_cliente : registroExistente.comentario_modulo5_cliente,
                    updated_at: new Date() // ✅ Actualizar manualmente
                }, { transaction });
            } else {
                // Crear nuevo registro
                console.log(`[DEBUG] Creando nuevo registro de estado`);
                await EstadoClientePostulacionM5.create({
                    id_postulacion,
                    id_estado_cliente_postulacion_m5,
                    fecha_feedback_cliente_m5: fecha_feedback_cliente_m5 ? new Date(fecha_feedback_cliente_m5 + 'T00:00:00') : undefined,
                    comentario_modulo5_cliente: comentario_modulo5_cliente || undefined
                    // updated_at se establece automáticamente por el default
                }, { transaction });
            }

            await transaction.commit();

            return {
                success: true,
                id_postulacion,
                id_estado_cliente_postulacion_m5,
                fecha_feedback_cliente_m5,
                message: 'Estado de cliente actualizado exitosamente (Módulo 5)'
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Avanzar candidato al módulo 5 (desde módulo 4)
     */
    static async avanzarAlModulo5(id_postulacion: number, comentario?: string, usuarioRut?: string) {
        // Estado "En espera de feedback" tiene ID 1 en la nueva tabla
        const estadoEsperaFeedback = 1;
        
        return await this.cambiarEstado(id_postulacion, {
            id_estado_cliente_postulacion_m5: estadoEsperaFeedback,
            fecha_feedback_cliente_m5: null, // Fecha NULL, se ingresa manualmente después
            comentario_modulo5_cliente: comentario || undefined
        }, usuarioRut);
    }

    /**
     * Obtener historial de cambios de estado para una postulación
     */
    static async getHistorial(id_postulacion: number) {
        const historial = await EstadoClientePostulacionM5.findAll({
            where: { id_postulacion },
            include: [
                {
                    model: EstadoClienteM5,
                    as: 'estadoCliente'
                }
            ],
            order: [['updated_at', 'DESC']]
        });

        return historial.map((item: any) => ({
            id_estado_cliente: item.id_estado_cliente_postulacion_m5,
            nombre_estado: item.estadoCliente?.nombre_estado,
            fecha_feedback_cliente_m5: item.fecha_feedback_cliente_m5,
            comentario_modulo5_cliente: item.comentario_modulo5_cliente
        }));
    }

    /**
     * Obtener el último estado de una postulación
     */
    static async getUltimoEstado(id_postulacion: number) {
        const estados = await EstadoClientePostulacionM5.findAll({
            where: { id_postulacion },
            include: [
                {
                    model: EstadoClienteM5,
                    as: 'estadoCliente'
                }
            ],
            order: [['updated_at', 'DESC']]
        });

        if (estados.length === 0) {
            return null;
        }

        const ultimoEstado = estados[0];

        return {
            id_estado_cliente: ultimoEstado.id_estado_cliente_postulacion_m5,
            nombre_estado: (ultimoEstado as any).estadoCliente?.nombre_estado,
            fecha_feedback_cliente_m5: ultimoEstado.fecha_feedback_cliente_m5,
            comentario_modulo5_cliente: ultimoEstado.comentario_modulo5_cliente
        };
    }

    /**
     * Obtener candidatos que están en el módulo 5 (tienen al menos un estado en estado_cliente_postulacion_m5)
     */
    static async getCandidatosEnModulo5(id_proceso: number) {
        Logger.info(`[DEBUG] Buscando candidatos del módulo 5 para proceso: ${id_proceso}`);
        
        // Primero obtener las postulaciones del proceso
        const postulaciones = await Postulacion.findAll({
            where: { id_solicitud: id_proceso },
            attributes: ['id_postulacion'],
            raw: true
        });

        const idsPostulaciones = postulaciones.map(p => p.id_postulacion);
        
        if (idsPostulaciones.length === 0) {
            Logger.info(`[DEBUG] No se encontraron postulaciones para el proceso ${id_proceso}`);
            return [];
        }

        // Obtener TODOS los estados de cada postulación (necesitamos todos para determinar el más reciente)
        const candidatosConEstadoM5 = await EstadoClientePostulacionM5.findAll({
            where: {
                id_postulacion: idsPostulaciones
            },
            include: [
                {
                    model: Postulacion,
                    as: 'postulacion',
                    include: [
                        {
                            model: require('@/models/Candidato').default,
                            as: 'candidato'
                        }
                    ]
                },
                {
                    model: EstadoClienteM5,
                    as: 'estadoClienteM5'
                }
            ],
            order: [
                ['id_postulacion', 'ASC'],
                ['updated_at', 'DESC']
            ]
        });

        Logger.info(`[DEBUG] Encontrados ${candidatosConEstadoM5.length} registros en estado_cliente_postulacion_m5`);

        // Procesar cada registro (ya debería ser único por postulación)
        const candidatosUnicos = new Map();
        
        // Obtener información de contratación para postulaciones que tienen registro
        const contrataciones = await Contratacion.findAll({
            where: { id_postulacion: idsPostulaciones }
        });
        
        const contratacionMap = new Map(
            contrataciones.map(c => [c.id_postulacion, c])
        );
        
        // Obtener evaluaciones psicolaborales para incluir estado del informe
        const evaluaciones = await EvaluacionPsicolaboral.findAll({
            where: { id_postulacion: idsPostulaciones }
        });
        
        const evaluacionMap = new Map(
            evaluaciones.map(e => [e.id_postulacion, e])
        );
        
        // Obtener historial completo de estados para calcular fecha de feedback
        const historiales = await EstadoClientePostulacionM5.findAll({
            where: { id_postulacion: idsPostulaciones },
            order: [['updated_at', 'ASC']]
        });

        // Agrupar historial por postulación
        const historialPorPostulacion = new Map<number, any[]>();
        historiales.forEach(estado => {
            if (!historialPorPostulacion.has(estado.id_postulacion)) {
                historialPorPostulacion.set(estado.id_postulacion, []);
            }
            historialPorPostulacion.get(estado.id_postulacion)!.push(estado);
        });

        // Agrupar por id_postulacion y tomar solo el más reciente
        // Primero, agrupar todos los estados por postulación
        const estadosPorPostulacion = new Map<number, any[]>();
        candidatosConEstadoM5.forEach((estado: any) => {
            if (!estadosPorPostulacion.has(estado.id_postulacion)) {
                estadosPorPostulacion.set(estado.id_postulacion, []);
            }
            estadosPorPostulacion.get(estado.id_postulacion)!.push(estado);
        });
        
        // Para cada postulación, tomar el primer estado (ya ordenado por updated_at DESC)
        estadosPorPostulacion.forEach((estados: any[], idPostulacion: number) => {
            // Como ya está ordenado por updated_at DESC, el primer elemento es el más reciente
            const estadoMasReciente = estados[0];
            
            Logger.info(`[DEBUG] Postulación ${idPostulacion}: Estado más reciente encontrado: ${(estadoMasReciente as any).estadoClienteM5?.nombre_estado}, Updated_at: ${estadoMasReciente.updated_at}, ID Estado: ${estadoMasReciente.id_estado_cliente_postulacion_m5}`);
            Logger.info(`[DEBUG] Postulación ${idPostulacion}: Todos los estados disponibles:`, estados.map((e: any) => ({
                estado: (e as any).estadoClienteM5?.nombre_estado,
                updated_at: e.updated_at,
                id_estado: e.id_estado_cliente_postulacion_m5
            })));
            candidatosUnicos.set(idPostulacion, estadoMasReciente);
        });

        const resultado = Array.from(candidatosUnicos.values()).map(estado => {
            const estadoData = estado as any; // Type assertion para acceder a las relaciones
            
            // La fecha de feedback viene directamente del estado actual
            const fechaFeedback = estado.fecha_feedback_cliente_m5;
            
            Logger.info(`[DEBUG] Procesando candidato postulación ${estado.id_postulacion}, estado: ${estadoData.estadoClienteM5?.nombre_estado}`);
            Logger.info(`[DEBUG] Fecha feedback M5:`, estado.fecha_feedback_cliente_m5);
            Logger.info(`[DEBUG] Updated at:`, estado.updated_at);
            Logger.info(`[DEBUG] Comentario:`, estado.comentario_modulo5_cliente);
            
            const candidatoData = estadoData.postulacion?.candidato;
            const candidatoInfo = candidatoData ? {
                // Campos originales de la base de datos
                id_candidato: candidatoData.id_candidato,
                rut_candidato: candidatoData.rut_candidato,
                nombre_candidato: candidatoData.nombre_candidato,
                primer_apellido_candidato: candidatoData.primer_apellido_candidato,
                segundo_apellido_candidato: candidatoData.segundo_apellido_candidato,
                telefono_candidato: candidatoData.telefono_candidato,
                email_candidato: candidatoData.email_candidato,
                edad_candidato: candidatoData.edad_candidato,
                
                // Campos mapeados para compatibilidad con el frontend
                id: candidatoData.id_candidato,
                name: `${candidatoData.nombre_candidato} ${candidatoData.primer_apellido_candidato} ${candidatoData.segundo_apellido_candidato || ''}`.trim(),
                email: candidatoData.email_candidato,
                phone: candidatoData.telefono_candidato,
                age: candidatoData.edad_candidato,
                rut: candidatoData.rut_candidato
            } : {};
            
            return {
                ...candidatoInfo,
                id_postulacion: estado.id_postulacion,
                ultimo_estado_m5: estadoData.estadoClienteM5?.nombre_estado,
                fecha_ultimo_cambio_m5: estado.fecha_feedback_cliente_m5,
                // Mapear estado del módulo 5 (SIEMPRE desde estado_cliente_m5, no desde Contratacion)
                hiring_status: this.mapEstadoToFrontend(estadoData.estadoClienteM5?.nombre_estado),
                // Estado final de contratación (si existe registro en Contratacion)
                contratacion_status: (() => {
                    const contratacion = contratacionMap.get(estadoData.id_postulacion);
                    if (contratacion) {
                        // id_estado_contratacion: 1 = Contratado, 2 = No contratado
                        return contratacion.id_estado_contratacion === 1 ? 'contratado' : 'no_contratado';
                    }
                    return null;
                })(),
                // Mapear fecha de respuesta del cliente (fecha de feedback real)
                client_response_date: fechaFeedback ? 
                    (typeof fechaFeedback === 'string' ? fechaFeedback : fechaFeedback.toISOString().split('T')[0]) : null,
                // Fecha de contrato desde la tabla Contratacion (solo si existe)
                contract_date: (() => {
                    const contratacion = contratacionMap.get(estadoData.id_postulacion);
                    return contratacion?.fecha_ingreso_contratacion ? 
                        contratacion.fecha_ingreso_contratacion.toISOString().split('T')[0] : null;
                })(),
                // Observaciones de contratación (separadas)
                observaciones_contratacion: (() => {
                    const contratacion = contratacionMap.get(estadoData.id_postulacion);
                    return contratacion?.observaciones_contratacion || '';
                })(),
                // Observaciones del módulo 5 (separadas)
                comentario_modulo5_cliente: estado.comentario_modulo5_cliente || '',
                // Obtener comentarios: primero de contratación, luego de estado_cliente_postulacion_m5 (para compatibilidad)
                observations: contratacionMap.get(estadoData.id_postulacion)?.observaciones_contratacion || 
                    estado.comentario_modulo5_cliente || '',
                // Estado del informe desde la evaluación psicolaboral
                estado_informe: evaluacionMap.get(estadoData.id_postulacion)?.estado_informe || null
            };
        });
        
        Logger.info(`[DEBUG] Retornando ${resultado.length} candidatos únicos del módulo 5`);
        Logger.info(`[DEBUG] Datos finales:`, JSON.stringify(resultado, null, 2));
        
        return resultado;
    }

    /**
     * Mapear estado de la base de datos al formato del frontend
     */
    private static mapEstadoToFrontend(nombreEstado: string): string {
        const estadosMap: { [key: string]: string } = {
            'En espera de feedback': 'en_espera_feedback',
            'No seleccionado': 'no_seleccionado',
            'Envío de carta oferta': 'envio_carta_oferta',
            'Aceptación carta oferta': 'aceptacion_carta_oferta',
            'Rechazo carta oferta': 'rechazo_carta_oferta',
            'Contratado': 'contratado',
            'No contratado': 'no_contratado'
        };
        
        return estadosMap[nombreEstado] || 'en_espera_feedback';
    }

    /**
     * Actualizar información completa del candidato en módulo 5
     * Incluye estado, fecha de respuesta del cliente y comentarios
     * Si el estado es "contratado" o "no_contratado", crea registro en tabla Contratacion
     */
    static async actualizarCandidatoModulo5(
        id_postulacion: number,
        data: {
            hiring_status: string; // Estado de contratación del frontend
            client_response_date?: string; // Fecha de respuesta del cliente en formato YYYY-MM-DD
            observations?: string; // Comentarios/observaciones del módulo 5
            fecha_ingreso_contratacion?: string; // Fecha de ingreso del candidato (opcional)
            observaciones_contratacion?: string; // Observaciones específicas de contratación (opcional)
        },
        usuarioRut?: string
    ) {
        const transaction: Transaction = await sequelize.transaction();
        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }
            Logger.info(`[DEBUG] actualizarCandidatoModulo5 - Postulación: ${id_postulacion}`);
            Logger.info(`[DEBUG] Datos recibidos:`, JSON.stringify(data, null, 2));
            
            // Los estados "contratado" y "no_contratado" NO están en estado_cliente_m5
            // Solo crean registros en la tabla Contratacion
            if (data.hiring_status === 'contratado' || data.hiring_status === 'no_contratado') {
                Logger.info(`[DEBUG] Estado final de contratación: ${data.hiring_status}`);
                Logger.info(`[DEBUG] Creando/actualizando registro de contratación para postulación ${id_postulacion}`);
                
                // Mapear estado de contratación: 1 = Contratado, 2 = No contratado
                const id_estado_contratacion = data.hiring_status === 'contratado' ? 1 : 2;
                
                // Verificar si ya existe un registro de contratación para esta postulación
                const contratacionExistente = await Contratacion.findOne({
                    where: { id_postulacion },
                    transaction
                });

                if (contratacionExistente) {
                    // Actualizar registro existente
                    Logger.info(`[DEBUG] Actualizando registro de contratación existente`);
                    await contratacionExistente.update({
                        fecha_ingreso_contratacion: data.fecha_ingreso_contratacion ? new Date(data.fecha_ingreso_contratacion) : undefined,
                        observaciones_contratacion: data.observaciones_contratacion || undefined,
                        id_estado_contratacion
                    }, { transaction });
                } else {
                    // Crear nuevo registro
                    Logger.info(`[DEBUG] Creando nuevo registro de contratación`);
                    const nuevoRegistro = await Contratacion.create({
                        id_postulacion,
                        fecha_ingreso_contratacion: data.fecha_ingreso_contratacion ? new Date(data.fecha_ingreso_contratacion) : undefined,
                        observaciones_contratacion: data.observaciones_contratacion || undefined,
                        encuesta_satisfaccion: undefined,
                        id_estado_contratacion
                    }, { transaction });
                    
                    Logger.info(`[DEBUG] Registro de contratación creado con ID: ${nuevoRegistro.id_contratacion}`);
                }
                
                await transaction.commit();
                return {
                    success: true,
                    message: `Candidato registrado como ${data.hiring_status === 'contratado' ? 'Contratado' : 'No Contratado'} exitosamente`
                };
            }
            
            // Para los demás estados (en_espera_feedback, no_seleccionado, etc.)
            // Mapear estados del frontend a IDs de la base de datos (módulo 5)
            const estadosMap: { [key: string]: number } = {
                'en_espera_feedback': 1,
                'no_seleccionado': 2,
                'envio_carta_oferta': 3,
                'aceptacion_carta_oferta': 4,
                'rechazo_carta_oferta': 5
            };

            const id_estado_cliente_postulacion_m5 = estadosMap[data.hiring_status];
            if (!id_estado_cliente_postulacion_m5) {
                throw new Error(`Estado de contratación no válido: ${data.hiring_status}. Estados válidos: ${Object.keys(estadosMap).join(', ')}, contratado, no_contratado`);
            }

            // IMPORTANTE: NO convertir la fecha a Date object para evitar problemas de zona horaria
            // Pasarla directamente como string en formato YYYY-MM-DD
            const fechaFeedback = data.client_response_date || null;
            
            Logger.info(`[DEBUG] Estado mapeado: ${id_estado_cliente_postulacion_m5}, Fecha: ${fechaFeedback}`);
            
            // Actualizar estado en módulo 5
            await this.cambiarEstado(id_postulacion, {
                id_estado_cliente_postulacion_m5,
                fecha_feedback_cliente_m5: fechaFeedback,
                comentario_modulo5_cliente: data.observations
            }, usuarioRut);

            await transaction.commit();
            return {
                success: true,
                message: 'Candidato del módulo 5 actualizado exitosamente'
            };
        } catch (error) {
            await transaction.rollback();
            Logger.error('Error al actualizar candidato del módulo 5:', error);
            throw error;
        }
    }
}
