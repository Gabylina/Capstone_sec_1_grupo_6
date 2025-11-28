import { Transaction, Op, QueryTypes } from 'sequelize';
import sequelize from '@/config/database';
import { setDatabaseUser } from '@/utils/databaseUser';
import {
    Solicitud,
    DescripcionCargo,
    Cliente,
    Contacto,
    Usuario,
    TipoServicio,
    EtapaSolicitud,
    EstadoSolicitud,
    EstadoSolicitudHist,
    Cargo,
    Comuna,
    Postulacion,
    EstadoClientePostulacionM5,
    PortalPostulacion,
    EstadoCliente
} from '@/models';
import { HitoSolicitudService } from './hitoSolicitudService';
import { HitoHelperService } from './hitoHelperService';
import { obtenerDuracionProceso } from '@/utils/duracionProcesos';
import { FechasLaborales } from '@/utils/fechasLaborales';

/**
 * Servicio para gestión de Solicitudes
 * Contiene toda la lógica de negocio relacionada con solicitudes de reclutamiento
 */

export class SolicitudService {
    private static readonly DUE_SOON_THRESHOLD_DAYS = 7;

    /**
     * Obtener solicitudes paginadas con filtros opcionales y orden
     */
    static async getSolicitudes(
        page: number = 1,
        limit: number = 10,
        search: string = "",
        status?: "creado" | "en_progreso" | "cerrado" | "congelado" | "cancelado" | "cierre_extraordinario",
        service_type?: string,
        consultor_id?: string,
        exclude_status?: "creado" | "en_progreso" | "cerrado" | "congelado" | "cancelado" | "cierre_extraordinario",
        sortBy: "fecha" | "cargo" | "cliente" = "fecha",
        sortOrder: "ASC" | "DESC" = "DESC"
    ) {
        const offset = (page - 1) * limit;

        const andConditions: any[] = [];

        // Filtro de búsqueda por texto
        if (search) {
            andConditions.push({
                [Op.or]: [
                    { '$descripcionCargo.cargo.nombre_cargo$': { [Op.iLike]: `%${search}%` } },
                    { '$contacto.cliente.nombre_cliente$': { [Op.iLike]: `%${search}%` } },
                    { '$usuario.nombre_usuario$': { [Op.iLike]: `%${search}%` } },
                    { '$contacto.nombre_contacto$': { [Op.iLike]: `%${search}%` } }
                ]
            });
        }

        // Filtro por estado
        if (status) {
            // Mapear el parámetro de estado a los nombres exactos en la base de datos
            const estadoMapping: { [key: string]: string } = {
                'creado': 'Creado',
                'en_progreso': 'En Progreso', 
                'cerrado': 'Cerrado',
                'congelado': 'Congelado',
                'cancelado': 'Cancelado',
                'cierre_extraordinario': 'Cierre Extraordinario'
            };

            const nombreEstadoExacto = estadoMapping[status];
            
            if (nombreEstadoExacto) {
                // Obtener todas las solicitudes con su historial de estados
                const todasLasSolicitudes = await EstadoSolicitudHist.findAll({
                    include: [
                        {
                            model: EstadoSolicitud,
                            as: 'estado',
                            attributes: ['nombre_estado_solicitud']
                        }
                    ],
                    attributes: ['id_solicitud', 'fecha_cambio_estado_solicitud'],
                    order: [['id_solicitud', 'ASC'], ['fecha_cambio_estado_solicitud', 'DESC']]
                });

                // Agrupar por solicitud y obtener el estado más reciente
                const estadoPorSolicitud = new Map<number, string>();
                todasLasSolicitudes.forEach((item: any) => {
                    if (!estadoPorSolicitud.has(item.id_solicitud)) {
                        estadoPorSolicitud.set(item.id_solicitud, item.estado.nombre_estado_solicitud);
                    }
                });

                // Filtrar solo las solicitudes que tienen el estado deseado como estado actual
                const idsConEstadoDeseado: number[] = [];
                estadoPorSolicitud.forEach((estadoActual: string, idSolicitud: number) => {
                    if (estadoActual === nombreEstadoExacto) {
                        idsConEstadoDeseado.push(idSolicitud);
                    }
                });

                // Debug log para verificar el filtro
                console.log(`🔍 Filtro por estado "${nombreEstadoExacto}":`, {
                    totalSolicitudes: estadoPorSolicitud.size,
                    idsConEstadoDeseado: idsConEstadoDeseado,
                    estadosEncontrados: Array.from(estadoPorSolicitud.entries()).slice(0, 5) // Solo los primeros 5 para debug
                });

                if (idsConEstadoDeseado.length > 0) {
                    andConditions.push({ id_solicitud: { [Op.in]: idsConEstadoDeseado } });
                } else {
                    // Si no hay solicitudes con ese estado, devolver array vacío
                    andConditions.push({ id_solicitud: { [Op.in]: [] } });
                }
            }
        }

        // Filtro para EXCLUIR un estado específico
        if (exclude_status) {
            // Mapear el parámetro de estado a los nombres exactos en la base de datos
            const estadoMapping: { [key: string]: string } = {
                'creado': 'Creado',
                'en_progreso': 'En Progreso', 
                'cerrado': 'Cerrado',
                'congelado': 'Congelado',
                'cancelado': 'Cancelado',
                'cierre_extraordinario': 'Cierre Extraordinario'
            };

            const nombreEstadoAExcluir = estadoMapping[exclude_status];
            
            if (nombreEstadoAExcluir) {
                // Obtener todas las solicitudes con su historial de estados
                const todasLasSolicitudes = await EstadoSolicitudHist.findAll({
                    include: [
                        {
                            model: EstadoSolicitud,
                            as: 'estado',
                            attributes: ['nombre_estado_solicitud']
                        }
                    ],
                    attributes: ['id_solicitud', 'fecha_cambio_estado_solicitud'],
                    order: [['id_solicitud', 'ASC'], ['fecha_cambio_estado_solicitud', 'DESC']]
                });

                // Agrupar por solicitud y obtener el estado más reciente
                const estadoPorSolicitud = new Map<number, string>();
                todasLasSolicitudes.forEach((item: any) => {
                    if (!estadoPorSolicitud.has(item.id_solicitud)) {
                        estadoPorSolicitud.set(item.id_solicitud, item.estado.nombre_estado_solicitud);
                    }
                });

                // Filtrar EXCLUYENDO las solicitudes que tienen el estado a excluir
                const idsParaIncluir: number[] = [];
                estadoPorSolicitud.forEach((estadoActual: string, idSolicitud: number) => {
                    if (estadoActual !== nombreEstadoAExcluir) {
                        idsParaIncluir.push(idSolicitud);
                    }
                });

                console.log(`🔍 Filtro EXCLUYENDO estado "${nombreEstadoAExcluir}":`, {
                    totalSolicitudes: estadoPorSolicitud.size,
                    idsParaIncluir: idsParaIncluir.length,
                });

                if (idsParaIncluir.length > 0) {
                    andConditions.push({ id_solicitud: { [Op.in]: idsParaIncluir } });
                } else {
                    // Si no hay solicitudes para incluir, devolver array vacío
                    andConditions.push({ id_solicitud: { [Op.in]: [] } });
                }
            }
        }

        // Filtro por tipo de servicio (puede ser código o nombre)
        if (service_type) {
            // Si es un código corto (2-3 caracteres), buscar por código
            // Si es un nombre largo, buscar por nombre del servicio en la relación
            if (service_type.length <= 5) {
                // Es probablemente un código (PC, PE, PAL, etc.)
                andConditions.push({ codigo_servicio: service_type });
            } else {
                // Es probablemente un nombre ("Personal Calificado", etc.)
                // Buscar por nombre en la tabla relacionada TipoServicio
                andConditions.push({ '$tipoServicio.nombre_servicio$': service_type });
            }
        }

        // Filtro por consultor
        if (consultor_id) {
            andConditions.push({ rut_usuario: consultor_id });
        }

        // Construir la condición final
        const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

        // Determinar columna para ordenar
        let orderColumn = 'fecha_ingreso_solicitud';
        if (sortBy === 'cargo') {
            orderColumn = '$descripcionCargo.cargo.nombre_cargo$';
        } else if (sortBy === 'cliente') {
            orderColumn = '$contacto.cliente.nombre_cliente$';
        }

        const { count, rows } = await Solicitud.findAndCountAll({
            where,
            limit,
            offset,
            order: [[orderColumn, sortOrder]],
            include: [
                {
                    model: Contacto,
                    as: 'contacto',
                    include: [
                        {
                            model: Cliente,
                            as: 'cliente'
                        },
                        {
                            model: Comuna,
                            as: 'comuna'
                        }
                    ]
                },
                {
                    model: TipoServicio,
                    as: 'tipoServicio'
                },
                {
                    model: DescripcionCargo,
                    as: 'descripcionCargo',
                    include: [
                        {
                            model: Cargo,
                            as: 'cargo'
                        },
                        {
                            model: Comuna,
                            as: 'comuna'
                        }
                    ]
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['rut_usuario', 'nombre_usuario', 'email_usuario']
                },
                {
                    model: EtapaSolicitud,
                    as: 'etapaSolicitud'
                },
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
            ],
            distinct: true, // Importante para contar correctamente con includes
        });

        // Transformar al formato del frontend
        const transformedSolicitudes = rows.map(solicitud => this.transformSolicitud(solicitud));

        // Verificar y actualizar etapas para solicitudes PC con candidatos en módulo 5 (de forma asíncrona, no bloquea la respuesta)
        if (transformedSolicitudes.length > 0) {
            // Ejecutar en segundo plano sin bloquear
            Promise.all(
                transformedSolicitudes
                    .filter(s => s.tipo_servicio === 'PC')
                    .map(s => this.verificarYActualizarEtapaModulo5(s.id_solicitud, 'PC'))
            ).catch(error => {
                console.error('Error al verificar etapas módulo 5 en getSolicitudes:', error);
            });
        }

        return {
            solicitudes: transformedSolicitudes,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
            },
        };
    }

    /**
     * Obtener todas las solicitudes con filtros opcionales
     */
    static async getAllSolicitudes(filters?: {
        status?: string;
        service_type?: string;
        consultor_id?: string;
    }) {
        const whereClause: any = {};

        if (filters?.service_type) {
            whereClause.codigo_servicio = filters.service_type;
        }
        if (filters?.consultor_id) {
            whereClause.rut_usuario = filters.consultor_id;
        }

        const solicitudes = await Solicitud.findAll({
            where: whereClause,
            include: [
                {
                    model: Contacto,
                    as: 'contacto',
                    include: [
                        {
                            model: Cliente,
                            as: 'cliente'
                        },
                        {
                            model: Comuna,
                            as: 'comuna'
                        }
                    ]
                },
                {
                    model: TipoServicio,
                    as: 'tipoServicio'
                },
                {
                    model: DescripcionCargo,
                    as: 'descripcionCargo',
                    include: [
                        {
                            model: Cargo,
                            as: 'cargo'
                        },
                        {
                            model: Comuna,
                            as: 'comuna'
                        }
                    ]
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['rut_usuario', 'nombre_usuario', 'email_usuario']
                },
                {
                    model: EtapaSolicitud,
                    as: 'etapaSolicitud'
                },
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
            ],
            order: [['fecha_ingreso_solicitud', 'DESC']]
        });

        // Transformar al formato del frontend
        const transformedSolicitudes = solicitudes.map(solicitud => this.transformSolicitud(solicitud));

        // Verificar y actualizar etapas para solicitudes PC con candidatos en módulo 5 (de forma asíncrona, no bloquea la respuesta)
        if (transformedSolicitudes.length > 0) {
            // Ejecutar en segundo plano sin bloquear
            Promise.all(
                transformedSolicitudes
                    .filter(s => s.tipo_servicio === 'PC')
                    .map(s => this.verificarYActualizarEtapaModulo5(s.id_solicitud, 'PC'))
            ).catch(error => {
                console.error('Error al verificar etapas módulo 5 en getAllSolicitudes:', error);
            });
        }

        return transformedSolicitudes;
    }

    /**
     * Verificar y actualizar etapa si hay candidatos en módulo 5
     */
    private static async verificarYActualizarEtapaModulo5(idSolicitud: number, codigoServicio: string) {
        // Solo verificar para servicios PC (Proceso Completo)
        if (codigoServicio !== 'PC') {
            return;
        }

        try {
            // Verificar si hay postulaciones con candidatos en módulo 5
            const postulaciones = await Postulacion.findAll({
                where: { id_solicitud: idSolicitud },
                attributes: ['id_postulacion']
            });

            if (postulaciones.length === 0) {
                return;
            }

            const idsPostulaciones = postulaciones.map(p => p.id_postulacion);

            // Verificar si hay alguna postulación con estado en módulo 5
            const candidatosEnModulo5 = await EstadoClientePostulacionM5.findOne({
                where: {
                    id_postulacion: { [Op.in]: idsPostulaciones }
                }
            });

            if (candidatosEnModulo5) {
                // Buscar la etapa "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"
                const etapaModulo5 = await EtapaSolicitud.findOne({
                    where: { nombre_etapa: 'Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral' }
                });

                if (etapaModulo5) {
                    const solicitud = await Solicitud.findByPk(idSolicitud);
                    if (solicitud && solicitud.id_etapa_solicitud !== etapaModulo5.id_etapa_solicitud) {
                        // Actualizar la etapa solo si es diferente
                        await solicitud.update({
                            id_etapa_solicitud: etapaModulo5.id_etapa_solicitud
                        });
                        console.log(`✅ Etapa actualizada automáticamente a Módulo 5 para solicitud ${idSolicitud}`);
                    }
                }
            }
        } catch (error) {
            console.error('Error al verificar/actualizar etapa módulo 5:', error);
            // No lanzar error, solo registrar
        }
    }

    /**
     * Obtener una solicitud por ID
     */
    static async getSolicitudById(id: number) {
        const solicitud = await Solicitud.findByPk(id, {
            include: [
                {
                    model: Contacto,
                    as: 'contacto',
                    include: [
                        { model: Cliente, as: 'cliente' },
                        { model: Comuna, as: 'comuna' }
                    ]
                },
                { model: TipoServicio, as: 'tipoServicio' },
                {
                    model: DescripcionCargo,
                    as: 'descripcionCargo',
                    include: [
                        { model: Cargo, as: 'cargo' },
                        { model: Comuna, as: 'comuna' }
                    ]
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['rut_usuario', 'nombre_usuario', 'email_usuario']
                },
                { model: EtapaSolicitud, as: 'etapaSolicitud' },
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
        });

        if (!solicitud) {
            return null;
        }

        // Verificar y actualizar etapa si hay candidatos en módulo 5
        await this.verificarYActualizarEtapaModulo5(id, solicitud.codigo_servicio);

        // Recargar la solicitud para obtener la etapa actualizada
        const solicitudActualizada = await Solicitud.findByPk(id, {
            include: [
                {
                    model: Contacto,
                    as: 'contacto',
                    include: [
                        { model: Cliente, as: 'cliente' },
                        { model: Comuna, as: 'comuna' }
                    ]
                },
                { model: TipoServicio, as: 'tipoServicio' },
                {
                    model: DescripcionCargo,
                    as: 'descripcionCargo',
                    include: [
                        { model: Cargo, as: 'cargo' },
                        { model: Comuna, as: 'comuna' }
                    ]
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['rut_usuario', 'nombre_usuario', 'email_usuario']
                },
                { model: EtapaSolicitud, as: 'etapaSolicitud' },
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
        });

        return this.transformSolicitud(solicitudActualizada);
    }

    /**
     * Crear nueva solicitud
     */
    static async createSolicitud(data: {
        contact_id: number;
        service_type: string;
        position_title: string;
        ciudad?: string;
        description?: string;
        requirements?: string;
        vacancies?: number;
        consultant_id: string;
        deadline_days?: number;
    }, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const {
                contact_id,
                service_type,
                position_title,
                ciudad,
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
            const contacto = await Contacto.findByPk(contact_id);
            if (!contacto) {
                throw new Error('Contacto no encontrado');
            }

            // Verificar que existe el usuario
            const usuario = await Usuario.findByPk(consultant_id);
            if (!usuario) {
                throw new Error('Usuario no encontrado');
            }

            // Buscar o crear el cargo
            let cargo = await Cargo.findOne({
                where: { nombre_cargo: position_title.trim() }
            });

            if (!cargo) {
                cargo = await Cargo.create({
                    nombre_cargo: position_title.trim()
                }, { transaction });
            }

            // Buscar la comuna
            let idComuna = 1; // Por defecto Santiago
            if (ciudad) {
                const comuna = await Comuna.findOne({
                    where: { nombre_comuna: ciudad.trim() }
                });
                if (comuna) {
                    idComuna = comuna.id_comuna;
                }
            }

            // Todos los procesos inician en Módulo 1
            // ES, TS y AP usan módulos 1 y 4 (pero inician en 1)
            // Los demás servicios usan los módulos según su configuración
            const idEtapaInicial = 1;

            // Calcular plazo máximo basado en la duración del proceso según codigo_servicio
            const fechaIngreso = new Date();
            const diasHabiles = obtenerDuracionProceso(service_type);
            const plazoMaximo = await FechasLaborales.sumarDiasHabiles(fechaIngreso, diasHabiles);

            // Primero crear la solicitud
            const nuevaSolicitud = await Solicitud.create({
                plazo_maximo_solicitud: plazoMaximo,
                fecha_ingreso_solicitud: fechaIngreso,
                id_contacto: contact_id,
                codigo_servicio: service_type,
                rut_usuario: consultant_id,
                id_etapa_solicitud: idEtapaInicial
            }, { transaction });

            // Luego crear la descripción de cargo vinculada a la solicitud
            const descripcionCargoData: any = {
                descripcion_cargo: description?.trim() || position_title.trim(),
                num_vacante: vacancies || 1,
                fecha_ingreso: fechaIngreso,
                id_cargo: cargo.id_cargo,
                id_comuna: idComuna,
                id_solicitud: nuevaSolicitud.id_solicitud
            };

            // Solo agregar requisitos si no está vacío
            if (requirements && requirements.trim()) {
                descripcionCargoData.requisitos_y_condiciones = requirements.trim();
            } else {
                descripcionCargoData.requisitos_y_condiciones = 'Por definir';
            }

            const nuevaDescripcionCargo = await DescripcionCargo.create(descripcionCargoData, { transaction });

            // Crear historial de estado inicial (estado = "Creado" = ID 1)
                await EstadoSolicitudHist.create({
                    fecha_cambio_estado_solicitud: new Date(),
                id_estado_solicitud: 1, // "Creado"
                    id_solicitud: nuevaSolicitud.id_solicitud
                }, { transaction });

            await transaction.commit();

            // Crear hitos automáticamente basados en las plantillas del servicio
            try {
                await HitoSolicitudService.copiarPlantillasASolicitud(nuevaSolicitud.id_solicitud, usuarioRut);
                
                // Activar hitos de "inicio_proceso" inmediatamente
                await HitoSolicitudService.activarHitosPorEvento(
                    nuevaSolicitud.id_solicitud,
                    'inicio_proceso',
                    new Date(),
                    usuarioRut
                );
                
                console.log(`✅ Hitos creados y activados para solicitud ${nuevaSolicitud.id_solicitud}`);
            } catch (hitoError) {
                // Log del error pero no fallar la creación de solicitud
                console.warn(`⚠️  Advertencia: No se pudieron crear hitos para la solicitud ${nuevaSolicitud.id_solicitud}:`, hitoError);
                // Los hitos se pueden crear manualmente después si es necesario
            }

            return { 
                id: nuevaSolicitud.id_solicitud,
                id_descripcion_cargo: nuevaDescripcionCargo.id_descripcioncargo
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    /**
     * Actualizar solicitud y su descripción de cargo
     */
    static async updateSolicitud(id: number, data: {
        contact_id?: number;
        service_type?: string;
        position_title?: string;
        ciudad?: string;
        description?: string;
        requirements?: string;
        vacancies?: number;
        consultant_id?: string;
        deadline_days?: number;
    }, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const solicitud = await Solicitud.findByPk(id, {
                include: [{ model: DescripcionCargo, as: 'descripcionCargo' }],
                transaction
            });

            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            // Actualizar campos de la solicitud
            if (data.contact_id) solicitud.id_contacto = data.contact_id;
            if (data.service_type) solicitud.codigo_servicio = data.service_type;
            if (data.consultant_id) solicitud.rut_usuario = data.consultant_id;

            // Recalcular fecha límite si se cambia el servicio
            if (data.service_type) {
                const codigoServicio = data.service_type;
                const diasHabiles = obtenerDuracionProceso(codigoServicio);
                // Usar la fecha de ingreso original de la solicitud para recalcular
                const nuevaFecha = await FechasLaborales.sumarDiasHabiles(solicitud.fecha_ingreso_solicitud, diasHabiles);
                solicitud.plazo_maximo_solicitud = nuevaFecha;
            }

            await solicitud.save({ transaction });

            // Actualizar descripción de cargo asociada
            const descripcionCargo = (solicitud as any).descripcionCargo;
            if (descripcionCargo) {
                if (data.position_title) {
                    let cargo = await Cargo.findOne({
                        where: { nombre_cargo: data.position_title.trim() }
                    });
                    if (!cargo) {
                        cargo = await Cargo.create({
                            nombre_cargo: data.position_title.trim()
                        }, { transaction });
                    }
                    descripcionCargo.id_cargo = cargo.id_cargo;
                }

                if (data.description) descripcionCargo.descripcion_cargo = data.description.trim();
                if (data.requirements) descripcionCargo.requisitos_y_condiciones = data.requirements.trim();
                if (data.vacancies) descripcionCargo.num_vacante = data.vacancies;

                if (data.ciudad) {
                    const comuna = await Comuna.findOne({
                        where: { nombre_comuna: data.ciudad.trim() }
                    });
                    if (comuna) {
                        descripcionCargo.id_comuna = comuna.id_comuna;
                    }
                }

                await descripcionCargo.save({ transaction });
            }

            await transaction.commit();

            return { 
                id: solicitud.id_solicitud,
                id_descripcion_cargo: descripcionCargo?.id_descripcioncargo || null,
                message: 'Solicitud actualizada exitosamente'
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Actualizar estado de solicitud (Creado, En Progreso, Cerrado, Congelado)
     */
    static async updateEstado(id: number, data: { status: string; reason?: string }, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const { status, reason } = data;

            const solicitud = await Solicitud.findByPk(id);
            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            // Mapear estado del frontend al backend (ID de base de datos)
            const mapeoEstadoId: Record<string, number> = {
                'creado': 1,                    // Creado
                'en_progreso': 2,              // En Progreso
                'cerrado': 3,                  // Cerrado
                'congelado': 4,                // Congelado
                'cancelado': 5,                 // Cancelado
                'cierre_extraordinario': 6      // Cierre Extraordinario
            };

            const idEstado = mapeoEstadoId[status?.toLowerCase()] || 1; // Default: Creado

            // Crear registro en historial de estado
            await EstadoSolicitudHist.create({
                fecha_cambio_estado_solicitud: new Date(),
                id_estado_solicitud: idEstado,
                id_solicitud: solicitud.id_solicitud
            }, { transaction });

            await transaction.commit();

            return { id, status, id_estado: idEstado };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Cambiar etapa de solicitud (Módulo 1, 2, 3, 4, 5)
     */
    static async cambiarEtapa(id: number, id_etapa: number, usuarioRut?: string) {
        const transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const solicitud = await Solicitud.findByPk(id, {
                include: [{ model: TipoServicio, as: 'tipoServicio' }],
                transaction
            });
            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            const etapa = await EtapaSolicitud.findByPk(id_etapa);
            if (!etapa) {
                throw new Error('Etapa no encontrada');
            }

            // Guardar el id_etapa anterior
            const idEtapaAnterior = solicitud.id_etapa_solicitud;

            // Actualizar la etapa
            await solicitud.update({ id_etapa_solicitud: id_etapa }, { transaction });

            // Marcar cumplimiento de hitos según el cambio de etapa
            const tipoServicio = (solicitud as any).get('tipoServicio') as any;
            if (tipoServicio && idEtapaAnterior) {
                await HitoHelperService.marcarHitoPorCambioEtapa(
                    id,
                    idEtapaAnterior,
                    id_etapa,
                    tipoServicio.codigo_servicio,
                    transaction
                );
            }

            await transaction.commit();

            return { id, etapa: etapa.nombre_etapa };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Avanzar al módulo 2 (Publicación y Candidatos)
     */
    static async avanzarAModulo2(id: number, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const solicitud = await Solicitud.findByPk(id);
            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            // Buscar la etapa "Módulo 2: Publicación y Registro de Candidatos"
            console.log('🔍 Buscando etapa Módulo 2...');
            const etapaModulo2 = await EtapaSolicitud.findOne({
                where: { nombre_etapa: 'Módulo 2: Publicación y Registro de Candidatos' }
            });

            console.log('📋 Etapa encontrada:', etapaModulo2);

            if (!etapaModulo2) {
                // Intentar buscar todas las etapas para debug
                const todasLasEtapas = await EtapaSolicitud.findAll();
                console.log('📋 Todas las etapas disponibles:', todasLasEtapas.map(e => ({ id: e.id_etapa_solicitud, nombre: e.nombre_etapa })));
                throw new Error('Etapa Módulo 2 no encontrada');
            }

            // Actualizar la solicitud
            await solicitud.update({
                id_etapa_solicitud: etapaModulo2.id_etapa_solicitud 
            }, { transaction });

            // Crear entrada en el historial (usar estado por defecto: 2 = En Progreso)
            await EstadoSolicitudHist.create({
                id_solicitud: id,
                id_estado_solicitud: 2, // En Progreso
                fecha_cambio_estado_solicitud: new Date()
            }, { transaction });

            await transaction.commit();

            // Activar hitos relacionados con la publicación (Módulo 2)
            try {
                await HitoSolicitudService.activarHitosPorEvento(
                    id,
                    'publicacion',
                    new Date(),
                    usuarioRut
                );
                console.log(`✅ Hitos de publicación activados para solicitud ${id}`);
            } catch (hitoError) {
                console.warn(`⚠️  Advertencia: No se pudieron activar hitos de publicación para la solicitud ${id}:`, hitoError);
            }

            return { 
                success: true, 
                message: 'Proceso avanzado al Módulo 2 exitosamente',
                etapa: etapaModulo2.nombre_etapa
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Avanzar al módulo 3 (Presentación de Candidatos)
     */
    static async avanzarAModulo3(id: number, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const solicitud = await Solicitud.findByPk(id, {
                include: [{ model: TipoServicio, as: 'tipoServicio' }],
                transaction
            });
            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            // Guardar el id_etapa anterior
            const idEtapaAnterior = solicitud.id_etapa_solicitud;

            // Buscar la etapa "Módulo 3: Presentación de Candidatos"
            console.log('🔍 Buscando etapa Módulo 3...');
            const etapaModulo3 = await EtapaSolicitud.findOne({
                where: { nombre_etapa: 'Módulo 3: Presentación de Candidatos' }
            });

            console.log('📋 Etapa encontrada:', etapaModulo3);

            if (!etapaModulo3) {
                // Intentar buscar todas las etapas para debug
                const todasLasEtapas = await EtapaSolicitud.findAll();
                console.log('📋 Todas las etapas disponibles:', todasLasEtapas.map(e => ({ id: e.id_etapa_solicitud, nombre: e.nombre_etapa })));
                throw new Error('Etapa Módulo 3 no encontrada');
            }

            // Actualizar la solicitud
            await solicitud.update({
                id_etapa_solicitud: etapaModulo3.id_etapa_solicitud 
            }, { transaction });

            // Crear entrada en el historial (usar estado por defecto: 2 = En Progreso)
            await EstadoSolicitudHist.create({
                id_solicitud: id,
                id_estado_solicitud: 2, // En Progreso
                fecha_cambio_estado_solicitud: new Date()
            }, { transaction });

            // Marcar cumplimiento de hitos según el cambio de etapa (Módulo 2 → 3)
            const tipoServicio = (solicitud as any).get('tipoServicio') as any;
            if (tipoServicio && idEtapaAnterior) {
                await HitoHelperService.marcarHitoPorCambioEtapa(
                    id,
                    idEtapaAnterior,
                    etapaModulo3.id_etapa_solicitud,
                    tipoServicio.codigo_servicio,
                    transaction
                );
                console.log(`✅ Hito de presentación de terna inicial marcado para solicitud ${id}`);
            }

            // Activar hitos relacionados con la primera presentación (Módulo 3)
            try {
                await HitoSolicitudService.activarHitosPorEvento(
                    id,
                    'primera_presentacion',
                    new Date(),
                    usuarioRut
                );
                console.log(`✅ Hitos de primera presentación activados para solicitud ${id}`);
            } catch (hitoError) {
                console.warn(`⚠️  Advertencia: No se pudieron activar hitos de primera presentación para la solicitud ${id}:`, hitoError);
            }

            await transaction.commit();

            return { 
                success: true, 
                message: 'Proceso avanzado al Módulo 3 exitosamente',
                etapa: etapaModulo3.nombre_etapa
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Avanzar al Módulo 4 (Evaluación Psicolaboral)
     */
    static async avanzarAModulo4(id: number, usuarioRut?: string) {
        const transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const solicitud = await Solicitud.findByPk(id, {
                include: [{ model: TipoServicio, as: 'tipoServicio' }],
                transaction
            });
            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            // Guardar el id_etapa anterior
            const idEtapaAnterior = solicitud.id_etapa_solicitud;

            // Buscar la etapa "Módulo 4: Evaluación Psicolaboral"
            console.log('🔍 Buscando etapa Módulo 4...');
            const etapaModulo4 = await EtapaSolicitud.findOne({
                where: { nombre_etapa: 'Módulo 4: Evaluación Psicolaboral' }
            });

            console.log('📋 Etapa encontrada:', etapaModulo4);

            if (!etapaModulo4) {
                // Intentar buscar todas las etapas para debug
                const todasLasEtapas = await EtapaSolicitud.findAll();
                console.log('📋 Todas las etapas disponibles:', todasLasEtapas.map(e => ({ id: e.id_etapa_solicitud, nombre: e.nombre_etapa })));
                throw new Error('Etapa Módulo 4 no encontrada');
            }

            // Actualizar la solicitud
            await solicitud.update({
                id_etapa_solicitud: etapaModulo4.id_etapa_solicitud 
            }, { transaction });

            // Marcar cumplimiento de hitos según el cambio de etapa (Módulo 3 → 4)
            const tipoServicio = (solicitud as any).get('tipoServicio') as any;
            if (tipoServicio && idEtapaAnterior) {
                await HitoHelperService.marcarHitoPorCambioEtapa(
                    id,
                    idEtapaAnterior,
                    etapaModulo4.id_etapa_solicitud,
                    tipoServicio.codigo_servicio,
                    transaction
                );
                console.log(`✅ Hito marcado para solicitud ${id}`);
            }

            // Activar hitos relacionados con la evaluación psicolaboral (Módulo 4)
            try {
                await HitoSolicitudService.activarHitosPorEvento(
                    id,
                    'evaluacion_psicolaboral',
                    new Date(),
                    usuarioRut
                );
                console.log(`✅ Hitos de evaluación psicolaboral activados para solicitud ${id}`);
            } catch (hitoError) {
                console.warn(`⚠️  Advertencia: No se pudieron activar hitos de evaluación psicolaboral para la solicitud ${id}:`, hitoError);
            }

            await transaction.commit();

            console.log('✅ Proceso avanzado al Módulo 4 exitosamente');
            console.log('📋 Nueva etapa:', etapaModulo4.nombre_etapa);

            return { 
                success: true, 
                message: 'Proceso avanzado al Módulo 4 exitosamente',
                etapa: etapaModulo4.nombre_etapa
            };
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error al avanzar al Módulo 4:', error);
            throw error;
        }
    }

    /**
     * Avanzar al Módulo 5 (Seguimiento Posterior a la Evaluación Psicolaboral)
     */
    static async avanzarAModulo5(id: number, usuarioRut?: string) {
        const transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }

            const solicitud = await Solicitud.findByPk(id, {
                include: [{ model: TipoServicio, as: 'tipoServicio' }],
                transaction
            });
            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            // Guardar el id_etapa anterior
            const idEtapaAnterior = solicitud.id_etapa_solicitud;

            // Buscar la etapa "Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral"
            console.log('🔍 Buscando etapa Módulo 5...');
            const etapaModulo5 = await EtapaSolicitud.findOne({
                where: { nombre_etapa: 'Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral' }
            });

            console.log('📋 Etapa encontrada:', etapaModulo5);

            if (!etapaModulo5) {
                // Intentar buscar todas las etapas para debug
                const todasLasEtapas = await EtapaSolicitud.findAll();
                console.log('📋 Todas las etapas disponibles:', todasLasEtapas.map(e => ({ id: e.id_etapa_solicitud, nombre: e.nombre_etapa })));
                throw new Error('Etapa Módulo 5 no encontrada');
            }

            // Actualizar la solicitud
            await solicitud.update({
                id_etapa_solicitud: etapaModulo5.id_etapa_solicitud 
            }, { transaction });

            // Marcar cumplimiento de hitos según el cambio de etapa (Módulo 4 → 5)
            const tipoServicio = (solicitud as any).get('tipoServicio') as any;
            if (tipoServicio && idEtapaAnterior) {
                await HitoHelperService.marcarHitoPorCambioEtapa(
                    id,
                    idEtapaAnterior,
                    etapaModulo5.id_etapa_solicitud,
                    tipoServicio.codigo_servicio,
                    transaction
                );
                console.log(`✅ Hito de terna final marcado para solicitud ${id}`);
            }

            await transaction.commit();

            console.log('✅ Proceso avanzado al Módulo 5 exitosamente');
            console.log('📋 Nueva etapa:', etapaModulo5.nombre_etapa);

            return { 
                success: true, 
                message: 'Proceso avanzado al Módulo 5 exitosamente',
                etapa: etapaModulo5.nombre_etapa
            };
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error al avanzar al Módulo 5:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las etapas disponibles
     */
    static async getEtapas() {
        const etapas = await EtapaSolicitud.findAll({
            order: [['id_etapa_solicitud', 'ASC']]
        });

        return etapas.map(etapa => ({
            id: etapa.id_etapa_solicitud,
            nombre: etapa.nombre_etapa
        }));
    }

    /**
     * Obtener todos los estados de solicitud disponibles
     */
    static async getEstadosSolicitud() {
        const estados = await EstadoSolicitud.findAll({
            order: [['id_estado_solicitud', 'ASC']]
        });

        return estados.map(estado => ({
            id: estado.id_estado_solicitud,
            nombre: estado.nombre_estado_solicitud
        }));
    }

    /**
     * Obtener estado actual de una solicitud basado en el historial
     */
    static async getEstadoActual(id: number) {
        const historialReciente = await EstadoSolicitudHist.findOne({
            where: { id_solicitud: id },
            order: [['fecha_cambio_estado_solicitud', 'DESC']],
            include: [{
                model: EstadoSolicitud,
                as: 'estado'
            }]
        });

        if (!historialReciente) {
            return null; // No hay historial, estado por defecto
        }

        const estado = historialReciente.get('estado') as any;
        return {
            id: historialReciente.id_estado_solicitud,
            nombre: estado?.nombre_estado_solicitud || 'Sin estado',
            fecha: historialReciente.fecha_cambio_estado_solicitud
        };
    }

    /**
     * Cambiar estado de solicitud por ID
     */
    static async cambiarEstado(id: number, id_estado: number, reason?: string, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }
            
            const solicitud = await Solicitud.findByPk(id, {
                include: [{ model: TipoServicio, as: 'tipoServicio' }],
                transaction
            });
            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            const estado = await EstadoSolicitud.findByPk(id_estado);
            if (!estado) {
                throw new Error('Estado no encontrado');
            }

            // Solo crear entrada en el historial (no actualizar solicitud)
            await EstadoSolicitudHist.create({
                id_solicitud: id,
                id_estado_solicitud: id_estado,
                fecha_cambio_estado_solicitud: new Date(),
                comentario_estado_solicitud_hist: reason || null
            }, { transaction });

            // Si el estado es "Cerrado" o "Cierre exitoso" (id_estado = 3), marcar hitos finales
            if (id_estado === 3) {
                const tipoServicio = (solicitud as any).get('tipoServicio') as any;
                if (tipoServicio) {
                    await HitoHelperService.marcarHitoCierreProces(
                        id,
                        tipoServicio.codigo_servicio,
                        transaction
                    );
                }
            }

            await transaction.commit();

            return { 
                success: true, 
                message: 'Estado cambiado exitosamente',
                estado: estado.nombre_estado_solicitud
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Eliminar solicitud
     */
    static async deleteSolicitud(id: number, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la transacción para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }
            
            const solicitud = await Solicitud.findByPk(id);
            if (!solicitud) {
                throw new Error('Solicitud no encontrada');
            }

            // Eliminar historial de estados
            await EstadoSolicitudHist.destroy({
                where: { id_solicitud: id },
                transaction
            });

            // Eliminar solicitud
            await solicitud.destroy({ transaction });

            await transaction.commit();

            return { id };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Transformar solicitud a formato frontend
     */
    private static transformSolicitud(solicitud: any) {
        const contacto = solicitud.get('contacto') as any;
        const cliente = contacto?.cliente;
        const descripcionCargo = solicitud.get('descripcionCargo') as any;
        const cargo = descripcionCargo?.cargo;
        const tipoServicio = solicitud.get('tipoServicio') as any;
        const usuario = solicitud.get('usuario') as any;
        const etapa = solicitud.get('etapaSolicitud') as any;
        const historial = solicitud.get('historialEstados') as any[];
        const estadoActual = historial?.[0]?.estado;

        return {
            // Formato completo para APIs que necesitan toda la información
            id: solicitud.id_solicitud,
            id_solicitud: solicitud.id_solicitud,
            id_descripcion_cargo: descripcionCargo?.id_descripcioncargo || 0,
            id_descripcioncargo: descripcionCargo?.id_descripcioncargo || 0,
            
            // Información básica para la tabla
            cargo: cargo?.nombre_cargo || 'Sin cargo',
            cliente: cliente?.nombre_cliente || 'Sin cliente',
            tipo_servicio: solicitud.codigo_servicio,
            tipo_servicio_nombre: tipoServicio?.nombre_servicio || solicitud.codigo_servicio,
            consultor: usuario?.nombre_usuario || 'Sin asignar',
            estado_solicitud: estadoActual?.nombre_estado_solicitud || 'Abierto',
            etapa: etapa?.nombre_etapa || 'Sin etapa',
            fecha_creacion: solicitud.fecha_ingreso_solicitud,
            datos_excel: descripcionCargo?.datos_excel || null,
            
            // Información detallada (para compatibilidad con otros componentes)
            client_id: cliente?.id_cliente.toString() || '',
            client: {
                id: cliente?.id_cliente.toString() || '',
                name: cliente?.nombre_cliente || '',
                contacts: [{
                    id: contacto?.id_contacto.toString() || '',
                    name: contacto?.nombre_contacto || '',
                    email: contacto?.email_contacto || '',
                    phone: contacto?.telefono_contacto || '',
                    position: contacto?.cargo_contacto || '',
                    city: contacto?.comuna?.nombre_comuna || '',
                    is_primary: false
                }]
            },
            contact_id: contacto?.id_contacto.toString() || '',
            service_type: solicitud.codigo_servicio,
            position_title: cargo?.nombre_cargo || 'Sin cargo',
            ciudad: descripcionCargo?.comuna?.nombre_comuna || '',
            description: descripcionCargo?.descripcion_cargo || '',
            requirements: descripcionCargo?.requisitos_y_condiciones || '',
            vacancies: descripcionCargo?.num_vacante || 0,
            consultant_id: usuario?.rut_usuario || '',
            consultant: {
                id: usuario?.rut_usuario || '',
                name: usuario?.nombre_usuario || '',
                email: usuario?.email_usuario || '',
                role: 'consultor' as const
            },
            status: this.mapEstadoToFrontend(estadoActual?.nombre_estado_solicitud),
            created_at: solicitud.fecha_ingreso_solicitud.toISOString(),
            started_at: null,
            completed_at: null,
            excel_file: descripcionCargo?.archivo_excel || undefined,
            
            // Objetos completos para acceso detallado (útil para edición)
            contacto: contacto ? {
                id_contacto: contacto.id_contacto,
                nombre_contacto: contacto.nombre_contacto,
                email_contacto: contacto.email_contacto,
                telefono_contacto: contacto.telefono_contacto,
                cargo_contacto: contacto.cargo_contacto,
                cliente: cliente ? {
                    id_cliente: cliente.id_cliente,
                    nombre_cliente: cliente.nombre_cliente
                } : null,
                comuna: contacto.comuna ? {
                    id_comuna: contacto.comuna.id_comuna,
                    nombre_comuna: contacto.comuna.nombre_comuna
                } : null
            } : null,
            descripcion_cargo: descripcionCargo ? {
                id_descripcioncargo: descripcionCargo.id_descripcioncargo,
                descripcion_cargo: descripcionCargo.descripcion_cargo,
                requisitos_y_condiciones: descripcionCargo.requisitos_y_condiciones,
                num_vacante: descripcionCargo.num_vacante,
                cargo: cargo ? {
                    id_cargo: cargo.id_cargo,
                    nombre_cargo: cargo.nombre_cargo
                } : null,
                comuna: descripcionCargo.comuna ? {
                    id_comuna: descripcionCargo.comuna.id_comuna,
                    nombre_comuna: descripcionCargo.comuna.nombre_comuna
                } : null
            } : null,
            tipo_servicio_obj: tipoServicio ? {
                codigo_servicio: tipoServicio.codigo_servicio,
                nombre_servicio: tipoServicio.nombre_servicio
            } : null,
            usuario: usuario ? {
                rut_usuario: usuario.rut_usuario,
                nombre_usuario: usuario.nombre_usuario,
                email_usuario: usuario.email_usuario
            } : null
        };
    }

    /**
     * Mapear estado del backend al frontend
     */
    private static mapEstadoToFrontend(nombreEstado?: string): string {
        if (!nombreEstado) return 'creado';

        const mapeo: { [key: string]: string } = {
            'Creado': 'creado',
            'En Progreso': 'en_progreso',
            'Cerrado': 'cerrado',
            'Congelado': 'congelado',
            'Cancelado': 'cancelado',
            'Cierre Extraordinario': 'cierre_extraordinario'
        };
        return mapeo[nombreEstado] || 'creado';
    }

    /**
     * Obtener procesos activos agrupados por consultor (OPTIMIZADO)
     * Retorna un objeto con el nombre del consultor como clave y la cantidad de procesos activos como valor
     * Usa query SQL directa para máximo rendimiento
     */
    static async getActiveProcessesByConsultant(): Promise<Record<string, number>> {
        try {
            // Query SQL optimizada: solo trae lo necesario
            // Usa CTE para obtener el estado más reciente de cada solicitud y filtra solo activos
            const [results] = await sequelize.query(`
                WITH estado_actual AS (
                    SELECT DISTINCT ON (esh.id_solicitud)
                        esh.id_solicitud,
                        es.nombre_estado_solicitud
                    FROM estado_solicitud_hist esh
                    INNER JOIN estado es ON esh.id_estado_solicitud = es.id_estado_solicitud
                    WHERE es.nombre_estado_solicitud IN ('En Progreso', 'Iniciado', 'Abierto')
                    ORDER BY esh.id_solicitud, esh.fecha_cambio_estado_solicitud DESC
                )
                SELECT 
                    COALESCE(u.nombre_usuario, 'Sin asignar') as consultor,
                    COUNT(*) as cantidad
                FROM solicitud s
                INNER JOIN estado_actual ea ON s.id_solicitud = ea.id_solicitud
                LEFT JOIN usuario u ON s.rut_usuario = u.rut_usuario
                WHERE s.rut_usuario IS NOT NULL
                GROUP BY u.nombre_usuario
                ORDER BY cantidad DESC
            `, { skipUserContext: true } as any);

            // Convertir resultados a objeto Record<string, number>
            const resultado: Record<string, number> = {};
            ((results as unknown as any[]) || []).forEach((row: any) => {
                const consultor = row.consultor || 'Sin asignar';
                resultado[consultor] = parseInt(row.cantidad) || 0;
            });

            return resultado;
        } catch (error: any) {
            console.error('Error al obtener procesos activos por consultor:', error);
            throw new Error('Error al obtener procesos activos por consultor');
        }
    }

    /**
     * Obtener distribución de procesos por tipo de servicio (OPTIMIZADO)
     * Retorna un array con servicio, cantidad y porcentaje
     * Usa query optimizada que solo trae los campos necesarios
     * Trae TODAS las solicitudes sin filtros (de todos los consultores y estados)
     */
    static async getProcessesByServiceType(): Promise<Array<{ service: string; count: number; percentage: number }>> {
        try {
            // Query optimizada: solo trae codigo_servicio y el nombre del tipo de servicio
            // Usa required: false para hacer LEFT JOIN y traer todas las solicitudes
            const solicitudes = await Solicitud.findAll({
                attributes: ['codigo_servicio'],
                include: [
                    {
                        model: TipoServicio,
                        as: 'tipoServicio',
                        attributes: ['nombre_servicio'], // Columna correcta: nombre_servicio, no nombre_tipo_servicio
                        required: false // LEFT JOIN para traer todas las solicitudes incluso sin tipo de servicio
                    }
                ],
                raw: false,
                // Sin filtros: trae TODAS las solicitudes
            });


            // Contar por tipo de servicio
            const serviceTypeCounts: Record<string, number> = {};
            let total = 0;
            const codigosNoMapeados: Record<string, number> = {};

            solicitudes.forEach((solicitud: any) => {
                const codigoServicio = solicitud.codigo_servicio || 'sin_servicio';
                const nombreServicio = solicitud.tipoServicio?.nombre_servicio || codigoServicio; // Columna correcta: nombre_servicio

                // Mapeo de códigos a nombres legibles
                const serviceMapping: Record<string, string> = {
                    'PC': 'Proceso Completo',
                    'LL': 'Long List',
                    'TR': 'Targeted Recruitment',
                    'HS': 'Headhunting',
                    'ES': 'Evaluación Psicolaboral',
                    'TS': 'Test Psicolaboral',
                    'AO': 'Filtro Inteligente',
                };

                const serviceLabel = serviceMapping[codigoServicio] || nombreServicio;
                
                // Registrar códigos no mapeados
                if (!serviceMapping[codigoServicio] && codigoServicio !== 'sin_servicio') {
                    codigosNoMapeados[codigoServicio] = (codigosNoMapeados[codigoServicio] || 0) + 1;
                }

                serviceTypeCounts[serviceLabel] = (serviceTypeCounts[serviceLabel] || 0) + 1;
                total++;
            });


            // Convertir a array con porcentajes
            return Object.entries(serviceTypeCounts).map(([service, count]) => ({
                service,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            }));
        } catch (error: any) {
            console.error('Error al obtener distribución por tipo de servicio:', error);
            throw new Error('Error al obtener distribución por tipo de servicio');
        }
    }

    /**
     * Obtener distribución de candidatos por fuente (portal de postulación)
     * Retorna un array con fuente, cantidad total de candidatos y cantidad de contratados
     * Usa query optimizada que solo trae los campos necesarios
     */
    static async getCandidateSourceData(): Promise<Array<{ source: string; candidates: number; hired: number }>> {
        try {
            // Query optimizada usando SQL directo para mejor rendimiento
            // Contratados: solo aquellos con contratacion donde id_estado_contratacion = 1
            const [results] = await sequelize.query(`
                SELECT 
                    COALESCE(pp.nombre_portal_postulacion, 'Sin fuente') as source,
                    COUNT(DISTINCT p.id_postulacion) as candidates,
                    COUNT(DISTINCT CASE 
                        WHEN c.id_estado_contratacion = 1 THEN p.id_postulacion 
                        ELSE NULL 
                    END) as hired
                FROM postulacion p
                LEFT JOIN portal_postulacion pp ON p.id_portal_postulacion = pp.id_portal_postulacion
                LEFT JOIN contratacion c ON p.id_postulacion = c.id_postulacion
                GROUP BY pp.nombre_portal_postulacion
                ORDER BY candidates DESC
            `, { skipUserContext: true } as any);


            // Convertir resultados a formato esperado
            return ((results as unknown as any[]) || []).map((row: any) => ({
                source: row.source || 'Sin fuente',
                candidates: parseInt(row.candidates) || 0,
                hired: parseInt(row.hired) || 0
            }));
        } catch (error: any) {
            console.error('Error al obtener fuentes de candidatos:', error);
            throw new Error('Error al obtener fuentes de candidatos');
        }
    }

    /**
     * Obtener estadísticas generales de procesos
     * Retorna: procesos activos, tiempo promedio de contratación, total de candidatos
     */
    private static calculatePeriodRange(
        year: number,
        month: number,
        week?: number,
        periodType: 'week' | 'month' | 'quarter' = 'month'
    ): { startDate: Date; endDate: Date } {
        let startDate: Date;
        let endDate: Date;

        if (periodType === 'week' && week) {
            const firstDayOfMonth = new Date(year, month, 1);
            const dayOfWeek = firstDayOfMonth.getDay();
            const daysToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : (8 - dayOfWeek);
            const firstMonday = new Date(year, month, 1 + daysToMonday);

            const weekStart = new Date(firstMonday);
            weekStart.setDate(weekStart.getDate() + (week - 1) * 7);

            startDate = new Date(weekStart);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(weekStart);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);

            const lastDayOfMonth = new Date(year, month + 1, 0);
            if (endDate > lastDayOfMonth) {
                endDate = lastDayOfMonth;
                endDate.setHours(23, 59, 59, 999);
            }
        } else if (periodType === 'month') {
            startDate = new Date(year, month, 1);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(year, month + 1, 0);
            endDate.setHours(23, 59, 59, 999);
        } else {
            const quarterStartMonth = Math.floor(month / 3) * 3;
            startDate = new Date(year, quarterStartMonth, 1);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(year, quarterStartMonth + 3, 0);
            endDate.setHours(23, 59, 59, 999);
        }

        return { startDate, endDate };
    }

    static async getProcessStats(): Promise<{ activeProcesses: number; avgTimeToHire: number; totalCandidates: number }> {
        try {
            // 1. Procesos activos: contar solicitudes con estado más reciente = 1 o 2 (Iniciado/En Progreso)
            const [activeResult] = await sequelize.query(`
                WITH ult AS (
                    SELECT
                        id_solicitud,
                        id_estado_solicitud,
                        ROW_NUMBER() OVER (
                            PARTITION BY id_solicitud
                            ORDER BY fecha_cambio_estado_solicitud DESC
                        ) AS rn
                    FROM estado_solicitud_hist
                )
                SELECT COUNT(*) as activos
                FROM ult
                WHERE rn = 1
                  AND id_estado_solicitud IN (1, 2)
            `, { skipUserContext: true } as any);
            const activeProcesses = parseInt((activeResult?.[0] as any)?.activos || '0');

            // 2. Tiempo promedio de contratación: calcular desde fecha_ingreso_solicitud hasta fecha_ingreso_contratacion
            const [timeResult] = await sequelize.query(`
                SELECT 
                    AVG(
                        EXTRACT(EPOCH FROM (c.fecha_ingreso_contratacion - s.fecha_ingreso_solicitud)) / 86400
                    ) as avg_days
                FROM contratacion c
                INNER JOIN postulacion p ON c.id_postulacion = p.id_postulacion
                INNER JOIN solicitud s ON p.id_solicitud = s.id_solicitud
                WHERE c.id_estado_contratacion = 1
                  AND c.fecha_ingreso_contratacion IS NOT NULL
                  AND s.fecha_ingreso_solicitud IS NOT NULL
            `, { skipUserContext: true } as any);
            const avgDays = parseFloat((timeResult?.[0] as any)?.avg_days || '0');
            const avgTimeToHire = Math.round(avgDays) || 0;

            // 3. Total de candidatos: contar todas las postulaciones
            const [candidatesResult] = await sequelize.query(`
                SELECT COUNT(*) as total
                FROM postulacion
            `, { skipUserContext: true } as any);
            const totalCandidates = parseInt((candidatesResult?.[0] as any)?.total || '0');


            return {
                activeProcesses,
                avgTimeToHire,
                totalCandidates
            };
        } catch (error: any) {
            console.error('Error al obtener estadísticas de procesos:', error);
            throw new Error('Error al obtener estadísticas de procesos');
        }
    }

    /**
     * Obtener distribución de estados de procesos para un período específico
     * @param year Año del período
     * @param month Mes del período (0-11, donde 0 = enero)
     * @param week Semana del mes (opcional, 1-5)
     * @param periodType Tipo de período: 'week', 'month', 'quarter'
     */
    static async getProcessStatusDistribution(
        year: number, 
        month: number, 
        week?: number, 
        periodType: 'week' | 'month' | 'quarter' = 'month'
    ): Promise<Array<{ status: string; count: number }>> {
        try {
            const { startDate, endDate } = this.calculatePeriodRange(year, month, week, periodType);

            // Query para obtener distribución de estados
            // Filtrar solicitudes creadas en el período y obtener su estado más reciente
            
            const results = (await sequelize.query(`
                WITH estado_actual AS (
                    SELECT DISTINCT ON (esh.id_solicitud)
                        esh.id_solicitud,
                        es.id_estado_solicitud,
                        es.nombre_estado_solicitud
                    FROM estado_solicitud_hist esh
                    INNER JOIN estado es ON esh.id_estado_solicitud = es.id_estado_solicitud
                    ORDER BY esh.id_solicitud, esh.fecha_cambio_estado_solicitud DESC
                )
                SELECT 
                    ea.nombre_estado_solicitud as status,
                    COUNT(*) as count
                FROM solicitud s
                INNER JOIN estado_actual ea ON s.id_solicitud = ea.id_solicitud
                WHERE s.fecha_ingreso_solicitud <= :endDate
                  AND (
                      cierre.fecha_cierre IS NULL
                      OR cierre.fecha_cierre >= :startDate
                  )
                GROUP BY ea.nombre_estado_solicitud
                ORDER BY count DESC
            `, {
                replacements: {
                    startDate: startDate,
                    endDate: endDate
                },
                type: QueryTypes.SELECT,
                skipUserContext: true
            } as any)) as Array<{ status?: string; count?: number }>;


            // Mapeo de nombres de estados a los que se muestran en el frontend
            const statusMapping: Record<string, string> = {
                'Creado': 'Iniciado',
                'En Progreso': 'En Progreso',
                'Cerrado': 'Completado',
                'Congelado': 'Pausado',
                'Cancelado': 'Cancelado',
            };

            // Convertir resultados a formato esperado
            const mappedResults = results.map((row) => {
                const dbStatus = row.status || 'Desconocido';
                const frontendStatus = statusMapping[dbStatus] || dbStatus;
                return {
                    status: frontendStatus,
                    count: parseInt(String(row.count ?? '0')) || 0
                };
            });

            return mappedResults;
        } catch (error: any) {
            console.error('Error al obtener distribución de estados:', error);
            throw new Error('Error al obtener distribución de estados');
        }
    }

    static async getAverageProcessTimeByService(
        year: number,
        month: number,
        week?: number,
        periodType: 'week' | 'month' | 'quarter' = 'month'
    ): Promise<Array<{ serviceCode: string; serviceName: string; averageDays: number; sampleSize: number }>> {
        try {
            const { startDate, endDate } = this.calculatePeriodRange(year, month, week, periodType);

            const runQuery = async (applyFilter: boolean) => {
                const query = `
                WITH closures AS (
                    SELECT DISTINCT ON (esh.id_solicitud)
                        esh.id_solicitud,
                        esh.fecha_cambio_estado_solicitud AS fecha_cierre,
                        DATE(esh.fecha_cambio_estado_solicitud) AS fecha_cierre_date
                    FROM estado_solicitud_hist esh
                    INNER JOIN estado es ON esh.id_estado_solicitud = es.id_estado_solicitud
                    WHERE es.nombre_estado_solicitud = 'Cerrado'
                      ${applyFilter ? `AND DATE(esh.fecha_cambio_estado_solicitud) >= DATE(:startDate) AND DATE(esh.fecha_cambio_estado_solicitud) <= DATE(:endDate)` : ''}
                    ORDER BY esh.id_solicitud, esh.fecha_cambio_estado_solicitud DESC
                ),
                durations AS (
                    SELECT
                        s.id_solicitud,
                        s.codigo_servicio,
                        c.fecha_cierre_date,
                        EXTRACT(EPOCH FROM (c.fecha_cierre - s.fecha_ingreso_solicitud)) / 86400 AS dias
                    FROM solicitud s
                    INNER JOIN closures c ON c.id_solicitud = s.id_solicitud
                    WHERE s.codigo_servicio IN ('PC', 'HH')
                      AND c.fecha_cierre IS NOT NULL
                      AND s.fecha_ingreso_solicitud IS NOT NULL
                )
                SELECT 
                    d.codigo_servicio,
                    AVG(d.dias) AS avg_days,
                    COUNT(*) AS total
                FROM durations d
                GROUP BY d.codigo_servicio
            `;
                
                const startDateStr = startDate.toISOString().split('T')[0];
                const endDateStr = endDate.toISOString().split('T')[0];
                
                return (await sequelize.query(query, {
                    replacements: { startDate: startDateStr, endDate: endDateStr },
                    type: QueryTypes.SELECT,
                    skipUserContext: true
                } as any)) as Array<{ codigo_servicio?: string; avg_days?: number; total?: number }>;
            };

            let results = await runQuery(true);

            if (results.length === 0) {
                results = await runQuery(false);
            }

            const serviceMapping: Record<string, string> = {
                'PC': 'Proceso Completo',
                'HH': 'Hunting'
            };

            const aggregated: Record<string, { avgDays: number; total: number }> = {};
            results.forEach(row => {
                if (!row.codigo_servicio) {
                    return;
                }
                // Convertir avg_days a número (PostgreSQL puede devolverlo como string)
                const avgDaysNum = typeof row.avg_days === 'string' ? parseFloat(row.avg_days) : (row.avg_days ?? 0);
                const totalNum = typeof row.total === 'string' ? parseInt(String(row.total)) : (row.total ?? 0);
                
                aggregated[row.codigo_servicio] = {
                    avgDays: Number.isFinite(avgDaysNum) ? avgDaysNum : 0,
                    total: Number.isFinite(totalNum) ? totalNum : 0
                };
            });

            return Object.entries(serviceMapping).map(([serviceCode, serviceName]) => {
                const data = aggregated[serviceCode] || { avgDays: 0, total: 0 };
                return {
                    serviceCode,
                    serviceName,
                    averageDays: Number.isFinite(data.avgDays) && data.avgDays > 0 ? Math.round(data.avgDays * 10) / 10 : 0,
                    sampleSize: Number.isFinite(data.total) && data.total > 0 ? parseInt(String(data.total)) : 0
                };
            });
        } catch (error: any) {
            throw new Error('Error al obtener tiempo promedio por servicio');
        }
    }

    static async getProcessesOverview(
        year: number,
        month: number,
        week?: number,
        periodType: 'week' | 'month' | 'quarter' = 'month'
    ): Promise<{
        processes: Array<{
            id: number;
            client: string;
            position: string;
            serviceCode: string;
            serviceName: string;
            consultant: string;
            status: string;
            statusRaw: string;
            startDate: string | null;
            deadline: string | null;
            closedAt: string | null;
            daysOpen: number | null;
            daysUntilDeadline: number | null;
            urgency: 'no_deadline' | 'on_track' | 'due_soon' | 'overdue' | 'closed_on_time' | 'closed_overdue';
        }>;
        totals: {
            total: number;
            inProgress: number;
            completed: number;
            paused: number;
            cancelled: number;
        };
        statusCounts: Record<string, number>;
        urgencySummary: {
            dueSoonCount: number;
            overdueCount: number;
            dueSoonProcesses: Array<number>;
            overdueProcesses: Array<number>;
        };
    }> {
        try {
            const { startDate, endDate } = this.calculatePeriodRange(year, month, week, periodType);

            const runOverviewQuery = async (applyFilter: boolean) => {
                const queryResult = await sequelize.query(`
                SELECT
                    s.id_solicitud,
                    s.fecha_ingreso_solicitud,
                    s.plazo_maximo_solicitud,
                    s.codigo_servicio,
                    COALESCE(ts.nombre_servicio, s.codigo_servicio) AS nombre_servicio,
                    c.nombre_cliente,
                    dc.descripcion_cargo,
                    u.nombre_usuario AS consultor,
                    estado_actual.nombre_estado_solicitud AS estado_actual,
                    estado_actual.fecha_cambio AS fecha_estado,
                    cierre.fecha_cierre
                FROM solicitud s
                LEFT JOIN contacto co ON s.id_contacto = co.id_contacto
                LEFT JOIN cliente c ON co.id_cliente = c.id_cliente
                LEFT JOIN usuario u ON s.rut_usuario = u.rut_usuario
                LEFT JOIN tiposervicio ts ON ts.codigo_servicio = s.codigo_servicio
                LEFT JOIN LATERAL (
                    SELECT dc.descripcion_cargo
                    FROM descripcioncargo dc
                    WHERE dc.id_solicitud = s.id_solicitud
                    ORDER BY dc.id_descripcioncargo DESC
                    LIMIT 1
                ) dc ON true
                LEFT JOIN LATERAL (
                    SELECT 
                        es.nombre_estado_solicitud,
                        esh.fecha_cambio_estado_solicitud AS fecha_cambio
                    FROM estado_solicitud_hist esh
                    INNER JOIN estado es ON esh.id_estado_solicitud = es.id_estado_solicitud
                    WHERE esh.id_solicitud = s.id_solicitud
                    ORDER BY esh.fecha_cambio_estado_solicitud DESC
                    LIMIT 1
                ) estado_actual ON true
                LEFT JOIN LATERAL (
                    SELECT 
                        esh.fecha_cambio_estado_solicitud AS fecha_cierre
                    FROM estado_solicitud_hist esh
                    INNER JOIN estado es ON esh.id_estado_solicitud = es.id_estado_solicitud
                    WHERE esh.id_solicitud = s.id_solicitud
                      AND es.nombre_estado_solicitud = 'Cerrado'
                    ORDER BY esh.fecha_cambio_estado_solicitud DESC
                    LIMIT 1
                ) cierre ON true
                ${applyFilter ? `
                WHERE s.fecha_ingreso_solicitud <= :endDate
                  AND (
                      cierre.fecha_cierre IS NULL
                      OR cierre.fecha_cierre >= :startDate
                  )
                ` : ''}
            `, {
                replacements: { startDate, endDate },
                type: QueryTypes.SELECT,
                skipUserContext: true
            } as any) as any;
                // sequelize.query() con QueryTypes.SELECT retorna directamente el array
                // Pero cuando usamos 'as any', TypeScript puede no inferir correctamente
                // Verificar si es array directamente o si está envuelto
                const resultsArray = Array.isArray(queryResult) ? queryResult : [];
                return resultsArray as unknown as Array<{
                    id_solicitud: number;
                    fecha_ingreso_solicitud: Date | string | null;
                    plazo_maximo_solicitud: Date | string | null;
                    codigo_servicio: string | null;
                    nombre_servicio: string | null;
                    nombre_cliente: string | null;
                    descripcion_cargo: string | null;
                    consultor: string | null;
                    estado_actual: string | null;
                    fecha_estado: Date | string | null;
                    fecha_cierre: Date | string | null;
                }>;
            };

            let rows = await runOverviewQuery(true);

            if (!Array.isArray(rows) || rows.length === 0) {
                rows = await runOverviewQuery(false);
            }
            
            // Asegurar que rows es siempre un array
            if (!Array.isArray(rows)) {
                rows = [];
            }

            const statusMapping: Record<string, { label: string; category: 'active' | 'completed' | 'paused' | 'cancelled' }> = {
                'Creado': { label: 'Iniciado', category: 'active' },
                'Iniciado': { label: 'Iniciado', category: 'active' },
                'En Progreso': { label: 'En Progreso', category: 'active' },
                'Abierto': { label: 'En Progreso', category: 'active' },
                'En Revisión': { label: 'En Revisión', category: 'active' },
                'Cerrado': { label: 'Completado', category: 'completed' },
                'Completado': { label: 'Completado', category: 'completed' },
                'Congelado': { label: 'Pausado', category: 'paused' },
                'Pausado': { label: 'Pausado', category: 'paused' },
                'Cancelado': { label: 'Cancelado', category: 'cancelled' }
            };

            const now = new Date();

            const processes = rows.map(row => {
                const startDateValue = row.fecha_ingreso_solicitud ? new Date(row.fecha_ingreso_solicitud) : null;
                const deadlineValue = row.plazo_maximo_solicitud ? new Date(row.plazo_maximo_solicitud) : null;
                const closedAtValue = row.fecha_cierre ? new Date(row.fecha_cierre) : null;
                const statusRaw = row.estado_actual || 'Creado';
                const statusInfo = statusMapping[statusRaw] || { label: statusRaw, category: 'active' as const };
                const isClosed = statusInfo.category === 'completed';
                const referenceEnd = closedAtValue ?? now;
                const daysOpen = startDateValue
                    ? Math.round((referenceEnd.getTime() - startDateValue.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                let daysUntilDeadline: number | null = null;
                let urgency: 'no_deadline' | 'on_track' | 'due_soon' | 'overdue' | 'closed_on_time' | 'closed_overdue' = 'no_deadline';

                if (deadlineValue) {
                    if (isClosed) {
                        if (closedAtValue) {
                            const diff = closedAtValue.getTime() - deadlineValue.getTime();
                            urgency = diff > 0 ? 'closed_overdue' : 'closed_on_time';
                            daysUntilDeadline = Math.round(diff / (1000 * 60 * 60 * 24));
                        } else {
                            urgency = 'no_deadline';
                        }
                    } else {
                        const diffMs = deadlineValue.getTime() - now.getTime();
                        daysUntilDeadline = Math.round(diffMs / (1000 * 60 * 60 * 24));

                        if (diffMs < 0) {
                            urgency = 'overdue';
                        } else if (diffMs <= SolicitudService.DUE_SOON_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) {
                            urgency = 'due_soon';
                        } else {
                            urgency = 'on_track';
                        }
                    }
                }

                return {
                    id: row.id_solicitud,
                    client: row.nombre_cliente || 'Sin cliente',
                    position: row.descripcion_cargo || 'Sin cargo',
                    serviceCode: row.codigo_servicio || 'sin_servicio',
                    serviceName: row.nombre_servicio || row.codigo_servicio || 'Sin servicio',
                    consultant: row.consultor || 'Sin asignar',
                    status: statusInfo.label,
                    statusRaw,
                    startDate: startDateValue ? startDateValue.toISOString() : null,
                    deadline: deadlineValue ? deadlineValue.toISOString() : null,
                    closedAt: closedAtValue ? closedAtValue.toISOString() : null,
                    daysOpen,
                    daysUntilDeadline,
                    urgency
                };
            });

            const totals = {
                total: processes.length,
                inProgress: 0,
                completed: 0,
                paused: 0,
                cancelled: 0
            };

            const statusCounts: Record<string, number> = {};
            let dueSoonCount = 0;
            let overdueCount = 0;
            const dueSoonProcesses: number[] = [];
            const overdueProcesses: number[] = [];

            processes.forEach(process => {
                statusCounts[process.status] = (statusCounts[process.status] || 0) + 1;

                const statusInfo = statusMapping[process.statusRaw] || { category: 'active' as const };
                switch (statusInfo.category) {
                    case 'completed':
                        totals.completed += 1;
                        break;
                    case 'paused':
                        totals.paused += 1;
                        break;
                    case 'cancelled':
                        totals.cancelled += 1;
                        break;
                    default:
                        totals.inProgress += 1;
                        break;
                }

                if (process.urgency === 'due_soon') {
                    dueSoonCount += 1;
                    dueSoonProcesses.push(process.id);
                } else if (process.urgency === 'overdue' || process.urgency === 'closed_overdue') {
                    overdueCount += 1;
                    overdueProcesses.push(process.id);
                }
            });

            return {
                processes,
                totals,
                statusCounts,
                urgencySummary: {
                    dueSoonCount,
                    overdueCount,
                    dueSoonProcesses,
                    overdueProcesses
                }
            };
        } catch (error: any) {
            console.error('Error al obtener overview de procesos:', error);
            throw new Error('Error al obtener overview de procesos');
        }
    }

    /**
     * Obtener procesos cerrados exitosos con detalles de candidatos
     */
    static async getClosedSuccessfulProcesses(
        year: number,
        month: number,
        week?: number,
        periodType: 'week' | 'month' | 'quarter' = 'month'
    ): Promise<Array<{
        id_solicitud: number;
        tipo_servicio: string;
        nombre_servicio: string;
        cliente: string;
        contacto: string | null;
        comuna: string | null;
        cargo: string | null;
        total_candidatos: number;
        candidatos_exitosos: Array<{ nombre: string; rut: string }>;
    }>> {
        try {
            const { startDate, endDate } = this.calculatePeriodRange(year, month, week, periodType);

            // Obtener procesos cerrados en el período
            const procesosCerradosQueryResult = await sequelize.query(`
                WITH ultimo_cierre AS (
                    SELECT DISTINCT ON (esh.id_solicitud)
                        esh.id_solicitud,
                        esh.fecha_cambio_estado_solicitud AS fecha_cierre
                    FROM estado_solicitud_hist esh
                    INNER JOIN estado es ON esh.id_estado_solicitud = es.id_estado_solicitud
                    WHERE es.id_estado_solicitud = 3
                    ORDER BY esh.id_solicitud, esh.fecha_cambio_estado_solicitud DESC
                ),
                procesos_cerrados AS (
                    SELECT 
                        s.id_solicitud,
                        s.codigo_servicio,
                        COALESCE(ts.nombre_servicio, s.codigo_servicio) AS nombre_servicio,
                        c.nombre_cliente,
                        co.nombre_contacto,
                        com.nombre_comuna,
                        car.nombre_cargo,
                        uc.fecha_cierre
                    FROM solicitud s
                    INNER JOIN ultimo_cierre uc ON s.id_solicitud = uc.id_solicitud
                    LEFT JOIN contacto co ON s.id_contacto = co.id_contacto
                    LEFT JOIN cliente c ON co.id_cliente = c.id_cliente
                    LEFT JOIN tiposervicio ts ON ts.codigo_servicio = s.codigo_servicio
                    LEFT JOIN LATERAL (
                        SELECT dc.id_comuna, dc.id_cargo
                        FROM descripcioncargo dc
                        WHERE dc.id_solicitud = s.id_solicitud
                        ORDER BY dc.id_descripcioncargo DESC
                        LIMIT 1
                    ) dc ON true
                    LEFT JOIN comuna com ON dc.id_comuna = com.id_comuna
                    LEFT JOIN cargo car ON dc.id_cargo = car.id_cargo
                    WHERE DATE(uc.fecha_cierre) >= DATE(:startDate)
                      AND DATE(uc.fecha_cierre) <= DATE(:endDate)
                ),
                total_candidatos AS (
                    SELECT 
                        p.id_solicitud,
                        COUNT(DISTINCT p.id_postulacion) AS total
                    FROM postulacion p
                    INNER JOIN procesos_cerrados pc ON p.id_solicitud = pc.id_solicitud
                    GROUP BY p.id_solicitud
                ),
                candidatos_exitosos_pc_hh AS (
                    SELECT DISTINCT
                        p.id_solicitud,
                        cand.nombre_candidato || ' ' || cand.primer_apellido_candidato || COALESCE(' ' || cand.segundo_apellido_candidato, '') AS nombre,
                        cand.rut_candidato AS rut
                    FROM estado_cliente_postulacion_m5 ecm5
                    INNER JOIN postulacion p ON ecm5.id_postulacion = p.id_postulacion
                    INNER JOIN candidato cand ON p.id_candidato = cand.id_candidato
                    INNER JOIN procesos_cerrados pc ON p.id_solicitud = pc.id_solicitud
                    WHERE pc.codigo_servicio IN ('PC', 'HH')
                ),
                candidatos_exitosos_ll AS (
                    SELECT DISTINCT
                        p.id_solicitud,
                        cand.nombre_candidato || ' ' || cand.primer_apellido_candidato || COALESCE(' ' || cand.segundo_apellido_candidato, '') AS nombre,
                        cand.rut_candidato AS rut
                    FROM estado_cliente_postulacion ecp
                    INNER JOIN postulacion p ON ecp.id_postulacion = p.id_postulacion
                    INNER JOIN candidato cand ON p.id_candidato = cand.id_candidato
                    INNER JOIN procesos_cerrados pc ON p.id_solicitud = pc.id_solicitud
                    WHERE pc.codigo_servicio = 'LL'
                      AND ecp.id_estado_cliente = 3
                ),
                candidatos_exitosos_es_ts AS (
                    SELECT DISTINCT
                        p.id_solicitud,
                        cand.nombre_candidato || ' ' || cand.primer_apellido_candidato || COALESCE(' ' || cand.segundo_apellido_candidato, '') AS nombre,
                        cand.rut_candidato AS rut
                    FROM evaluacion_psicolaboral ep
                    INNER JOIN postulacion p ON ep.id_postulacion = p.id_postulacion
                    INNER JOIN candidato cand ON p.id_candidato = cand.id_candidato
                    INNER JOIN procesos_cerrados pc ON p.id_solicitud = pc.id_solicitud
                    WHERE pc.codigo_servicio IN ('ES', 'TS')
                      AND ep.estado_evaluacion = 'Realizada'
                ),
                todos_candidatos_exitosos AS (
                    SELECT * FROM candidatos_exitosos_pc_hh
                    UNION
                    SELECT * FROM candidatos_exitosos_ll
                    UNION
                    SELECT * FROM candidatos_exitosos_es_ts
                )
                SELECT 
                    pc.id_solicitud,
                    pc.codigo_servicio AS tipo_servicio,
                    pc.nombre_servicio,
                    pc.nombre_cliente AS cliente,
                    pc.nombre_contacto AS contacto,
                    pc.nombre_comuna AS comuna,
                    pc.nombre_cargo AS cargo,
                    COALESCE(tc.total, 0) AS total_candidatos,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'nombre', ce.nombre,
                                'rut', ce.rut
                            ) ORDER BY ce.nombre
                        ) FILTER (WHERE ce.nombre IS NOT NULL),
                        '[]'::json
                    ) AS candidatos_exitosos
                FROM procesos_cerrados pc
                LEFT JOIN total_candidatos tc ON pc.id_solicitud = tc.id_solicitud
                LEFT JOIN todos_candidatos_exitosos ce ON pc.id_solicitud = ce.id_solicitud
                GROUP BY 
                    pc.id_solicitud,
                    pc.codigo_servicio,
                    pc.nombre_servicio,
                    pc.nombre_cliente,
                    pc.nombre_contacto,
                    pc.nombre_comuna,
                    pc.nombre_cargo,
                    pc.fecha_cierre,
                    tc.total
                ORDER BY pc.fecha_cierre DESC, pc.nombre_cliente
            `, {
                replacements: {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                },
                type: QueryTypes.SELECT,
                skipUserContext: true // Evitar que el hook ejecute queries adicionales
            } as any) as any;
            // sequelize.query() con QueryTypes.SELECT retorna directamente el array
            // Pero cuando usamos 'as any', TypeScript puede no inferir correctamente
            // Verificar si es array directamente o si está envuelto
            const procesosCerradosArray = Array.isArray(procesosCerradosQueryResult) ? procesosCerradosQueryResult : [];
            const procesosCerrados = procesosCerradosArray as Array<{
                id_solicitud: number;
                tipo_servicio: string;
                nombre_servicio: string;
                cliente: string;
                contacto: string | null;
                comuna: string | null;
                cargo: string | null;
                total_candidatos: number | string;
                candidatos_exitosos: string | Array<{ nombre: string; rut: string }>;
            }>;


            // Procesar resultados y convertir JSON strings a arrays
            const processed = procesosCerrados.map(row => ({
                id_solicitud: row.id_solicitud,
                tipo_servicio: row.tipo_servicio,
                nombre_servicio: row.nombre_servicio,
                cliente: row.cliente || 'Sin cliente',
                contacto: row.contacto || null,
                comuna: row.comuna || null,
                cargo: row.cargo || null,
                total_candidatos: typeof row.total_candidatos === 'string' 
                    ? parseInt(row.total_candidatos) 
                    : (row.total_candidatos || 0),
                candidatos_exitosos: typeof row.candidatos_exitosos === 'string'
                    ? JSON.parse(row.candidatos_exitosos)
                    : (Array.isArray(row.candidatos_exitosos) ? row.candidatos_exitosos : [])
            }));


            return processed;
        } catch (error: any) {
            console.error('[ERROR] getClosedSuccessfulProcesses:', error);
            throw new Error('Error al obtener procesos cerrados exitosos');
        }
    }

    /**
     * Obtener rendimiento por consultor
     * Retorna procesos completados, tiempo promedio y eficiencia por consultor
     */
    static async getConsultantPerformance(): Promise<Array<{
        consultant: string;
        processesCompleted: number;
        avgTimeToHire: number;
        efficiency: number;
    }>> {
        try {
            const queryResult = await sequelize.query(`
                WITH procesos_cerrados AS (
                    SELECT DISTINCT ON (esh.id_solicitud)
                        esh.id_solicitud,
                        esh.fecha_cambio_estado_solicitud AS fecha_cierre,
                        s.rut_usuario,
                        s.fecha_ingreso_solicitud,
                        s.plazo_maximo_solicitud,
                        u.nombre_usuario AS consultor
                    FROM estado_solicitud_hist esh
                    INNER JOIN estado es ON esh.id_estado_solicitud = es.id_estado_solicitud
                    INNER JOIN solicitud s ON esh.id_solicitud = s.id_solicitud
                    LEFT JOIN usuario u ON s.rut_usuario = u.rut_usuario
                    WHERE es.nombre_estado_solicitud = 'Cerrado'
                      AND s.rut_usuario IS NOT NULL
                      AND s.fecha_ingreso_solicitud IS NOT NULL
                      AND esh.fecha_cambio_estado_solicitud IS NOT NULL
                    ORDER BY esh.id_solicitud, esh.fecha_cambio_estado_solicitud DESC
                ),
                tiempos_contratacion AS (
                    SELECT
                        pc.rut_usuario,
                        pc.consultor,
                        COUNT(*) AS procesos_completados,
                        AVG(
                            EXTRACT(EPOCH FROM (pc.fecha_cierre - pc.fecha_ingreso_solicitud)) / 86400
                        ) AS tiempo_promedio
                    FROM procesos_cerrados pc
                    GROUP BY pc.rut_usuario, pc.consultor
                ),
                procesos_a_tiempo AS (
                    SELECT
                        pc.rut_usuario,
                        COUNT(*) AS procesos_a_tiempo
                    FROM procesos_cerrados pc
                    WHERE pc.plazo_maximo_solicitud IS NOT NULL
                      AND pc.fecha_cierre <= pc.plazo_maximo_solicitud
                    GROUP BY pc.rut_usuario
                )
                SELECT
                    tc.consultor,
                    tc.procesos_completados::integer AS processes_completed,
                    ROUND(tc.tiempo_promedio::numeric, 1) AS avg_time_to_hire,
                    CASE
                        WHEN tc.procesos_completados > 0 THEN
                            ROUND(
                                (COALESCE(pat.procesos_a_tiempo, 0)::numeric / tc.procesos_completados::numeric) * 100
                            )
                        ELSE 0
                    END AS efficiency
                FROM tiempos_contratacion tc
                LEFT JOIN procesos_a_tiempo pat ON tc.rut_usuario = pat.rut_usuario
                ORDER BY tc.procesos_completados DESC, efficiency DESC
            `, {
                type: QueryTypes.SELECT,
                skipUserContext: true
            } as any) as any;

            const results = Array.isArray(queryResult) ? queryResult : [];
            
            return results.map((row: any) => ({
                consultant: row.consultor || 'Sin asignar',
                processesCompleted: parseInt(row.processes_completed) || 0,
                avgTimeToHire: parseFloat(row.avg_time_to_hire) || 0,
                efficiency: parseInt(row.efficiency) || 0
            }));
        } catch (error: any) {
            console.error('[ERROR] getConsultantPerformance:', error);
            throw new Error('Error al obtener rendimiento por consultor');
        }
    }

    /**
     * Obtener cumplimiento de plazos por consultor (basado en hitos)
     * Retorna hitos completados a tiempo vs retrasados por consultor
     */
    static async getConsultantCompletionStats(): Promise<Array<{
        consultant: string;
        completed: number;
        onTime: number;
        delayed: number;
        completionRate: number;
    }>> {
        try {
            const queryResult = await sequelize.query(`
                SELECT
                    COALESCE(u.nombre_usuario, 'Sin asignar') AS consultor,
                    COUNT(*)::integer AS completed,
                    COUNT(CASE WHEN hs.fecha_cumplimiento IS NOT NULL 
                               AND hs.fecha_limite IS NOT NULL
                               AND hs.fecha_cumplimiento <= hs.fecha_limite 
                          THEN 1 END)::integer AS on_time,
                    COUNT(CASE WHEN (
                               (hs.fecha_cumplimiento IS NOT NULL AND hs.fecha_limite IS NOT NULL AND hs.fecha_cumplimiento > hs.fecha_limite)
                               OR (hs.fecha_limite IS NOT NULL AND hs.fecha_limite < CURRENT_DATE AND hs.fecha_cumplimiento IS NULL)
                          ) THEN 1 END)::integer AS delayed,
                    CASE
                        WHEN COUNT(*) > 0 THEN
                            ROUND(
                                (COUNT(CASE WHEN hs.fecha_cumplimiento IS NOT NULL 
                                           AND hs.fecha_limite IS NOT NULL
                                           AND hs.fecha_cumplimiento <= hs.fecha_limite 
                                      THEN 1 END)::numeric / COUNT(*)::numeric) * 100
                            )
                        ELSE 0
                    END AS completion_rate
                FROM hito_solicitud hs
                INNER JOIN solicitud s ON hs.id_solicitud = s.id_solicitud
                LEFT JOIN usuario u ON s.rut_usuario = u.rut_usuario
                WHERE hs.id_solicitud IS NOT NULL
                  AND hs.fecha_limite IS NOT NULL
                  AND s.rut_usuario IS NOT NULL
                GROUP BY u.nombre_usuario
                ORDER BY completed DESC
            `, {
                type: QueryTypes.SELECT,
                skipUserContext: true
            } as any) as any;

            const results = Array.isArray(queryResult) ? queryResult : [];
            
            return results.map((row: any) => ({
                consultant: row.consultor || 'Sin asignar',
                completed: parseInt(row.completed) || 0,
                onTime: parseInt(row.on_time) || 0,
                delayed: parseInt(row.delayed) || 0,
                completionRate: parseInt(row.completion_rate) || 0
            }));
        } catch (error: any) {
            throw new Error('Error al obtener estadísticas de cumplimiento');
        }
    }

    /**
     * Obtener retrasos (hitos vencidos) por consultor
     * Retorna cantidad de hitos vencidos por consultor
     * Un hito está vencido si: fecha_limite < CURRENT_DATE AND fecha_cumplimiento IS NULL
     */
    static async getConsultantOverdueHitos(): Promise<Record<string, number>> {
        try {
            const queryResult = await sequelize.query(`
                SELECT
                    COALESCE(u.nombre_usuario, 'Sin asignar') AS consultor,
                    COUNT(*)::integer AS vencidos
                FROM hito_solicitud hs
                INNER JOIN solicitud s ON hs.id_solicitud = s.id_solicitud
                LEFT JOIN usuario u ON s.rut_usuario = u.rut_usuario
                WHERE hs.fecha_limite IS NOT NULL
                  AND hs.fecha_limite < CURRENT_DATE
                  AND hs.fecha_cumplimiento IS NULL
                  AND hs.id_solicitud IS NOT NULL
                  AND s.rut_usuario IS NOT NULL
                GROUP BY u.nombre_usuario
                ORDER BY vencidos DESC
            `, {
                type: QueryTypes.SELECT,
                skipUserContext: true
            } as any) as any;

            const results = Array.isArray(queryResult) ? queryResult : [];
            const overdueHitos: Record<string, number> = {};
            
            results.forEach((row: any) => {
                const consultor = row.consultor || 'Sin asignar';
                overdueHitos[consultor] = parseInt(row.vencidos) || 0;
            });

            return overdueHitos;
        } catch (error: any) {
            throw new Error('Error al obtener hitos vencidos por consultor');
        }
    }
}

