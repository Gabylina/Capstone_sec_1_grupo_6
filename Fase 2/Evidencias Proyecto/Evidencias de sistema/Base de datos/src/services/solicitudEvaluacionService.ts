import { Transaction } from 'sequelize';
import sequelize from '@/config/database';
import { SolicitudService } from './solicitudService';
import { CandidatoService } from './candidatoService';
import { setDatabaseUser } from '@/utils/databaseUser';
import { Logger } from '@/utils/logger';
import { obtenerDuracionProceso } from '@/utils/duracionProcesos';
import { FechasLaborales } from '@/utils/fechasLaborales';

/**
 * Servicio especializado para crear solicitudes de evaluación/test psicolaboral
 * con sus candidatos y postulaciones en una sola transacción atómica
 */
export class SolicitudEvaluacionService {
    /**
     * Crear solicitud de evaluación/test con candidatos en una sola transacción
     * Si algo falla, TODO se revierte automáticamente
     */
    static async crearSolicitudConCandidatos(data: {
        // Datos de la solicitud
        contact_id: number;
        service_type: string;
        position_title: string;
        id_comuna: number;
        description?: string;
        requirements?: string;
        consultant_id: string;
        deadline_days?: number;
        fecha_ingreso_solicitud?: Date;
        // Datos de los candidatos
        candidatos: Array<{
            nombre: string;
            primer_apellido: string;
            segundo_apellido?: string;
            email: string;
            phone: string;
            rut?: string;
            has_disability_credential?: boolean;
            cv_file?: any;
        }>;
    }, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            Logger.info('Iniciando creación de solicitud con candidatos en transacción única');

            // 1. Crear la solicitud
            const solicitudData = {
                contact_id: data.contact_id,
                service_type: data.service_type,
                position_title: data.position_title,
                id_comuna: data.id_comuna,
                description: data.description,
                requirements: data.requirements,
                vacancies: data.candidatos.length, // Vacantes = número de candidatos
                consultant_id: data.consultant_id,
                deadline_days: data.deadline_days,
                fecha_ingreso_solicitud: data.fecha_ingreso_solicitud
            };

            // Usar el método existente pero pasando la transacción actual
            const nuevaSolicitud = await this.crearSolicitudEnTransaccion(solicitudData, transaction, usuarioRut);
            const solicitudId = nuevaSolicitud.id;

            Logger.info(`Solicitud creada con ID: ${solicitudId}`);

            // 2. Crear cada candidato y su postulación
            const candidatosCreados: number[] = [];
            const postulacionesCreadas: number[] = [];
            const candidatosPostulaciones: Array<{ email: string; postulacion_id: number }> = [];

            for (const candidato of data.candidatos) {
                Logger.info(`Creando candidato: ${candidato.nombre} ${candidato.primer_apellido}`);

                // Crear candidato
                const nuevoCandidato = await CandidatoService.createCandidato({
                    nombre: candidato.nombre,
                    primer_apellido: candidato.primer_apellido,
                    segundo_apellido: candidato.segundo_apellido,
                    email: candidato.email,
                    phone: candidato.phone,
                    rut: candidato.rut,
                    has_disability_credential: candidato.has_disability_credential || false
                }, transaction, usuarioRut);

                const candidatoId = parseInt(nuevoCandidato.id);
                candidatosCreados.push(candidatoId);

                Logger.info(`Candidato creado con ID: ${candidatoId}`);

                // Crear postulación directamente en la transacción actual
                const Postulacion = (await import('@/models/Postulacion')).default;
                
                const nuevaPostulacion = await Postulacion.create({
                    id_candidato: candidatoId,
                    id_solicitud: solicitudId,
                    id_estado_candidato: 6, // 6 = "Agregado" (estado inicial para evaluación/test)
                    // id_portal_postulacion es undefined para evaluación/test psicolaboral
                    valoracion: 3 // Valoración por defecto
                }, { transaction });

                const postulacionId = nuevaPostulacion.id_postulacion;
                postulacionesCreadas.push(postulacionId);
                candidatosPostulaciones.push({ email: candidato.email, postulacion_id: postulacionId });

                Logger.info(`Postulación creada con ID: ${postulacionId}`);
            }

            // 3. Commit de la transacción - TODO exitoso
            await transaction.commit();

            Logger.info(`✅ Transacción completada: Solicitud ${solicitudId} con ${candidatosCreados.length} candidatos`);

            return {
                success: true,
                data: {
                    solicitud_id: solicitudId,
                    id_descripcion_cargo: nuevaSolicitud.id_descripcion_cargo,
                    candidatos_creados: candidatosCreados.length,
                    postulaciones_creadas: postulacionesCreadas.length,
                    candidatos_ids: candidatosCreados,
                    postulaciones_ids: postulacionesCreadas,
                    candidatos_postulaciones: candidatosPostulaciones // Mapeo email -> postulacion_id
                },
                message: `Solicitud creada exitosamente con ${candidatosCreados.length} candidato(s)`
            };

        } catch (error: any) {
            // Rollback automático de TODO
            await transaction.rollback();
            Logger.error('❌ Error en transacción, rollback automático ejecutado:', error);
            throw error;
        }
    }

    /**
     * Método auxiliar para crear solicitud dentro de una transacción existente
     */
    private static async crearSolicitudEnTransaccion(data: {
        contact_id: number;
        service_type: string;
        position_title: string;
        id_comuna: number;
        description?: string;
        requirements?: string;
        vacancies?: number;
        consultant_id: string;
        deadline_days?: number;
        fecha_ingreso_solicitud?: Date;
    }, transaction: Transaction, usuarioRut?: string) {
        const Solicitud = (await import('@/models/Solicitud')).default;
        const DescripcionCargo = (await import('@/models/DescripcionCargo')).default;
        const Cargo = (await import('@/models/Cargo')).default;
        const Comuna = (await import('@/models/Comuna')).default;
        const Usuario = (await import('@/models/Usuario')).default;
        const Contacto = (await import('@/models/Contacto')).default;
        const EstadoSolicitudHist = (await import('@/models/EstadoSolicitudHist')).default;

        const {
            contact_id,
            service_type,
            position_title,
            id_comuna,
            description,
            requirements,
            vacancies,
            consultant_id
        } = data;

        // Validaciones
        if (!contact_id || !service_type || !position_title || !consultant_id) {
            throw new Error('Faltan campos requeridos');
        }

        // Verificar que existe el contacto
        const contacto = await Contacto.findByPk(contact_id, { transaction });
        if (!contacto) {
            throw new Error('Contacto no encontrado');
        }

        // Verificar que existe el usuario
        const usuario = await Usuario.findByPk(consultant_id, { transaction });
        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }

        // Buscar o crear el cargo
        let cargo = await Cargo.findOne({
            where: { nombre_cargo: position_title.trim() },
            transaction
        });

        if (!cargo) {
            cargo = await Cargo.create({
                nombre_cargo: position_title.trim()
            }, { transaction });
        }

        // Usar el id_comuna proporcionado
        const idComuna = id_comuna;

        const idEtapaInicial = 1;

        // Calcular plazo máximo basado en la duración del proceso según codigo_servicio
        // Usar la fecha proporcionada o la fecha actual si no se proporciona
        const fechaIngreso = data.fecha_ingreso_solicitud || new Date();
        const diasHabiles = obtenerDuracionProceso(service_type);
        const plazoMaximo = await FechasLaborales.sumarDiasHabiles(fechaIngreso, diasHabiles);

        // Crear la solicitud
        const nuevaSolicitud = await Solicitud.create({
            plazo_maximo_solicitud: plazoMaximo,
            fecha_ingreso_solicitud: fechaIngreso,
            id_contacto: contact_id,
            codigo_servicio: service_type,
            rut_usuario: consultant_id,
            id_etapa_solicitud: idEtapaInicial
        }, { transaction });

        // Crear la descripción de cargo
        const descripcionCargoData: any = {
            descripcion_cargo: description?.trim() || position_title.trim(),
            num_vacante: vacancies || 1,
            fecha_ingreso: fechaIngreso,
            id_cargo: cargo.id_cargo,
            id_comuna: idComuna,
            id_solicitud: nuevaSolicitud.id_solicitud
        };

        if (requirements && requirements.trim()) {
            descripcionCargoData.requisitos_y_condiciones = requirements.trim();
        } else {
            descripcionCargoData.requisitos_y_condiciones = 'Por definir';
        }

        const nuevaDescripcionCargo = await DescripcionCargo.create(descripcionCargoData, { transaction });

        // Crear historial de estado inicial
        await EstadoSolicitudHist.create({
            fecha_cambio_estado_solicitud: new Date(),
            id_estado_solicitud: 1, // "Creado"
            id_solicitud: nuevaSolicitud.id_solicitud
        }, { transaction });

        return {
            id: nuevaSolicitud.id_solicitud,
            id_descripcion_cargo: nuevaDescripcionCargo.id_descripcioncargo
        };
    }

    /**
     * Actualizar solicitud de evaluación/test con candidatos nuevos en una sola transacción
     * Si algo falla, TODO se revierte automáticamente
     */
    static async actualizarSolicitudConCandidatos(
        solicitudId: number,
        data: {
            // Datos de la solicitud
            contact_id?: number;
            service_type?: string;
            position_title?: string;
            id_comuna?: number;
            description?: string;
            requirements?: string;
            consultant_id?: string;
            deadline_days?: number;
            fecha_ingreso_solicitud?: Date;
            // Datos de los candidatos nuevos (solo se agregan, no se modifican existentes)
            candidatos?: Array<{
                nombre: string;
                primer_apellido: string;
                segundo_apellido?: string;
                email: string;
                phone: string;
                rut?: string;
                has_disability_credential?: boolean;
                cv_file?: any;
            }>;
        },
        usuarioRut?: string
    ) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            Logger.info(`Iniciando actualización de solicitud ${solicitudId} con candidatos en transacción única`);

            const Solicitud = (await import('@/models/Solicitud')).default;
            const DescripcionCargo = (await import('@/models/DescripcionCargo')).default;
            const Cargo = (await import('@/models/Cargo')).default;
            const Comuna = (await import('@/models/Comuna')).default;

            // 1. Actualizar la solicitud si hay cambios
            const solicitud = await Solicitud.findByPk(solicitudId, {
                include: [{ model: DescripcionCargo, as: 'descripcionCargo' }],
                transaction
            });

            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            // Actualizar campos de la solicitud si se proporcionan
            if (data.contact_id) solicitud.id_contacto = data.contact_id;
            if (data.service_type) solicitud.codigo_servicio = data.service_type;
            if (data.consultant_id) solicitud.rut_usuario = data.consultant_id;
            
            // Actualizar fecha de ingreso si se proporciona
            if (data.fecha_ingreso_solicitud) {
                solicitud.fecha_ingreso_solicitud = data.fecha_ingreso_solicitud;
            }

            // Recalcular fecha límite si se cambia el servicio o la fecha de ingreso
            const fechaIngresoParaCalculo = data.fecha_ingreso_solicitud || solicitud.fecha_ingreso_solicitud;
            if (data.service_type || data.fecha_ingreso_solicitud) {
                const codigoServicio = data.service_type || solicitud.codigo_servicio;
                const diasHabiles = obtenerDuracionProceso(codigoServicio);
                const nuevaFecha = await FechasLaborales.sumarDiasHabiles(fechaIngresoParaCalculo, diasHabiles);
                solicitud.plazo_maximo_solicitud = nuevaFecha;
            }

            await solicitud.save({ transaction });

            // 2. Actualizar descripción de cargo si hay cambios
            const descripcionCargo = (solicitud as any).descripcionCargo;
            if (descripcionCargo) {
                if (data.position_title) {
                    let cargo = await Cargo.findOne({
                        where: { nombre_cargo: data.position_title.trim() },
                        transaction
                    });
                    if (!cargo) {
                        cargo = await Cargo.create({
                            nombre_cargo: data.position_title.trim()
                        }, { transaction });
                    }
                    descripcionCargo.id_cargo = cargo.id_cargo;
                }

                if (data.id_comuna) {
                    descripcionCargo.id_comuna = data.id_comuna;
                }

                if (data.description !== undefined) {
                    descripcionCargo.descripcion_cargo = data.description?.trim() || data.position_title?.trim() || descripcionCargo.descripcion_cargo;
                }

                if (data.requirements !== undefined) {
                    descripcionCargo.requisitos_y_condiciones = data.requirements?.trim() || 'Por definir';
                }

                // Actualizar número de vacantes si hay candidatos nuevos
                if (data.candidatos && data.candidatos.length > 0) {
                    // Obtener número actual de postulaciones
                    const Postulacion = (await import('@/models/Postulacion')).default;
                    const postulacionesExistentes = await Postulacion.count({
                        where: { id_solicitud: solicitudId },
                        transaction
                    });
                    descripcionCargo.num_vacante = postulacionesExistentes + data.candidatos.length;
                }

                await descripcionCargo.save({ transaction });
            }

            // 3. Crear candidatos nuevos y sus postulaciones si se proporcionan
            const candidatosCreados: number[] = [];
            const postulacionesCreadas: number[] = [];
            const candidatosPostulaciones: Array<{ email: string; postulacion_id: number }> = [];
            const Postulacion = (await import('@/models/Postulacion')).default;
            const Candidato = (await import('@/models/Candidato')).default;

            if (data.candidatos && data.candidatos.length > 0) {
                Logger.info(`Procesando ${data.candidatos.length} candidato(s) para la solicitud ${solicitudId}`);

                for (const candidato of data.candidatos) {
                    Logger.info(`Procesando candidato: ${candidato.nombre} ${candidato.primer_apellido} (${candidato.email})`);

                    let candidatoId: number;
                    let postulacionId: number | null = null;

                    // Verificar si el candidato ya existe por email (dentro de la transacción)
                    const candidatoExistente = await Candidato.findOne({
                        where: { email_candidato: candidato.email.trim() },
                        transaction
                    });
                    
                    if (candidatoExistente) {
                        // El candidato ya existe, usar su ID
                        candidatoId = candidatoExistente.id_candidato;
                        Logger.info(`Candidato existente encontrado con ID: ${candidatoId}`);

                        // Verificar si ya está asociado a esta solicitud
                        const postulacionExistente = await Postulacion.findOne({
                            where: {
                                id_candidato: candidatoId,
                                id_solicitud: solicitudId
                            },
                            transaction
                        });

                        if (postulacionExistente) {
                            // Ya está asociado, usar esa postulación
                            postulacionId = postulacionExistente.id_postulacion;
                            Logger.info(`Candidato ${candidatoId} ya está asociado a la solicitud ${solicitudId}, usando postulación ${postulacionId}`);
                        }
                    } else {
                        // El candidato no existe, crearlo
                        Logger.info(`Creando nuevo candidato: ${candidato.nombre} ${candidato.primer_apellido}`);
                        const nuevoCandidato = await CandidatoService.createCandidato({
                            nombre: candidato.nombre,
                            primer_apellido: candidato.primer_apellido,
                            segundo_apellido: candidato.segundo_apellido,
                            email: candidato.email,
                            phone: candidato.phone,
                            rut: candidato.rut,
                            has_disability_credential: candidato.has_disability_credential || false
                        }, transaction, usuarioRut);

                        candidatoId = parseInt(nuevoCandidato.id);
                        candidatosCreados.push(candidatoId);
                        Logger.info(`Candidato creado con ID: ${candidatoId}`);
                    }

                    // Crear postulación solo si no existía
                    if (!postulacionId) {
                        const nuevaPostulacion = await Postulacion.create({
                            id_candidato: candidatoId,
                            id_solicitud: solicitudId,
                            id_estado_candidato: 6, // 6 = "Agregado" (estado inicial para evaluación/test)
                            // id_portal_postulacion es undefined para evaluación/test psicolaboral
                            valoracion: 3 // Valoración por defecto
                        }, { transaction });

                        postulacionId = nuevaPostulacion.id_postulacion;
                        postulacionesCreadas.push(postulacionId);
                        Logger.info(`Postulación creada con ID: ${postulacionId}`);
                    }

                    // Agregar al mapeo para subir CVs después
                    candidatosPostulaciones.push({ email: candidato.email, postulacion_id: postulacionId });
                }
            }

            // 4. Commit de la transacción - TODO exitoso
            await transaction.commit();

            Logger.info(`✅ Transacción de actualización completada: Solicitud ${solicitudId} con ${candidatosCreados.length} candidato(s) nuevo(s)`);

            return {
                success: true,
                data: {
                    solicitud_id: solicitudId,
                    candidatos_creados: candidatosCreados.length,
                    postulaciones_creadas: postulacionesCreadas.length,
                    candidatos_ids: candidatosCreados,
                    postulaciones_ids: postulacionesCreadas,
                    candidatos_postulaciones: candidatosPostulaciones // Mapeo email -> postulacion_id
                },
                message: candidatosCreados.length > 0 
                    ? `Solicitud actualizada exitosamente con ${candidatosCreados.length} candidato(s) nuevo(s)`
                    : 'Solicitud actualizada exitosamente'
            };

        } catch (error: any) {
            // Rollback automático de TODO
            await transaction.rollback();
            Logger.error('❌ Error en transacción de actualización, rollback automático ejecutado:', error);
            throw error;
        }
    }
}

