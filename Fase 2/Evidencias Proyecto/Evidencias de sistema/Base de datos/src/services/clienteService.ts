import { Transaction, Op, QueryTypes } from 'sequelize';
import sequelize from '@/config/database';
import { setDatabaseUser } from '@/utils/databaseUser';
import { Cliente, Contacto, Comuna, Solicitud } from '@/models';

/**
 * Servicio para gestión de Clientes
 * Contiene toda la lógica de negocio relacionada con clientes y contactos
 */

export class ClienteService {
    /** Conteo de procesos activos (misma lógica que getReporteCliente) por id_cliente */
    private static async getActiveProcessCountByClient(clientIds: number[]): Promise<Record<number, number>> {
        if (clientIds.length === 0) return {};

        const rows = await sequelize.query(`
            WITH estado_actual AS (
                SELECT DISTINCT ON (esh.id_solicitud)
                    esh.id_solicitud,
                    es.nombre_estado_solicitud
                FROM estado_solicitud_hist esh
                INNER JOIN estado es ON esh.id_estado_solicitud = es.id_estado_solicitud
                ORDER BY esh.id_solicitud, esh.fecha_cambio_estado_solicitud DESC
            )
            SELECT
                co.id_cliente,
                COUNT(DISTINCT s.id_solicitud)::integer AS activos
            FROM solicitud s
            INNER JOIN contacto co ON s.id_contacto = co.id_contacto
            LEFT JOIN estado_actual ea ON ea.id_solicitud = s.id_solicitud
            WHERE co.id_cliente = ANY(ARRAY[:clientIds]::int[])
              AND COALESCE(ea.nombre_estado_solicitud, 'Creado') NOT IN (
                'Cerrado', 'Cancelado', 'Cierre Extraordinario'
              )
            GROUP BY co.id_cliente
        `, {
            replacements: { clientIds },
            type: QueryTypes.SELECT,
            skipUserContext: true
        } as any) as any[];

        const map: Record<number, number> = {};
        (Array.isArray(rows) ? rows : []).forEach((r: any) => {
            map[Number(r.id_cliente)] = parseInt(r.activos, 10) || 0;
        });
        return map;
    }

    /**
     * Obtener clientes paginados con filtros opcionales y orden
     */
    static async getClients(
        page: number = 1,
        limit: number = 10,
        search: string = "",
        sortBy: "nombre" | "contactos" = "nombre",
        sortOrder: "ASC" | "DESC" = "ASC"
    ) {
        const offset = (page - 1) * limit;

        const andConditions: any[] = [];

        // Filtro de búsqueda por texto
        if (search) {
            // Primero buscar clientes que coincidan directamente
            andConditions.push({
                [Op.or]: [
                    { nombre_cliente: { [Op.iLike]: `%${search}%` } }
                ]
            });
        }

        // Construir la condición final
        const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

        // Determinar columna para ordenar
        const orderColumn = sortBy === "nombre" ? "nombre_cliente" : "nombre_cliente";

        let whereClause = where;
        let includeClause: any[] = [
            {
                model: Contacto,
                as: 'contactos',
                include: [
                    {
                        model: Comuna,
                        as: 'comuna',
                        attributes: ['id_comuna', 'nombre_comuna']
                    }
                ]
            }
        ];

        // Si hay búsqueda, también buscar en contactos
        if (search) {
            // Buscar IDs de clientes que tengan contactos que coincidan
            const contactosConBusqueda = await Contacto.findAll({
                where: {
                    [Op.or]: [
                        { nombre_contacto: { [Op.iLike]: `%${search}%` } },
                        { email_contacto: { [Op.iLike]: `%${search}%` } },
                        { cargo_contacto: { [Op.iLike]: `%${search}%` } }
                    ]
                },
                attributes: ['id_cliente'],
                raw: true
            });

            const idsClientesConContactos = [...new Set(contactosConBusqueda.map(c => c.id_cliente))];

            // Buscar IDs de clientes que tengan comunas que coincidan
            const contactosConComunas = await Contacto.findAll({
                include: [
                    {
                        model: Comuna,
                        as: 'comuna',
                        where: {
                            nombre_comuna: { [Op.iLike]: `%${search}%` }
                        },
                        attributes: []
                    }
                ],
                attributes: ['id_cliente'],
                raw: true
            });

            const idsClientesConComunas = [...new Set(contactosConComunas.map(c => c.id_cliente))];

            // Combinar todos los IDs
            const todosLosIds = [...new Set([...idsClientesConContactos, ...idsClientesConComunas])];

            // Actualizar la condición where para incluir búsqueda en nombre del cliente O en contactos
            whereClause = {
                [Op.or]: [
                    where,
                    { id_cliente: { [Op.in]: todosLosIds } }
                ]
            } as any;
        }

        const { count, rows } = await Cliente.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [[orderColumn, sortOrder]],
            include: includeClause,
            distinct: true, // Importante para contar correctamente con includes
        });

        // Obtener conteos de solicitudes para cada cliente
        const clientIds = rows.map(c => c.id_cliente);
        
        const solicitudesPorCliente = await Solicitud.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('Solicitud.id_solicitud')), 'count'],
                [sequelize.col('contacto.id_cliente'), 'id_cliente']
            ],
            include: [
                {
                    model: Contacto,
                    as: 'contacto',
                    attributes: [],
                    where: {
                        id_cliente: {
                            [Op.in]: clientIds
                        }
                    }
                }
            ],
            group: ['contacto.id_cliente'],
            raw: true
        });

        // Crear mapa de conteos
        const conteoPorCliente: Record<number, number> = {};
        solicitudesPorCliente.forEach((item: any) => {
            conteoPorCliente[item.id_cliente] = parseInt(item.count);
        });

        const activosPorCliente = await ClienteService.getActiveProcessCountByClient(clientIds);

        // Transformar al formato del frontend
        const transformedClients = rows.map(cliente => ({
            id: cliente.id_cliente.toString(),
            name: cliente.nombre_cliente,
            processCount: conteoPorCliente[cliente.id_cliente] || 0,
            activeProcessCount: activosPorCliente[cliente.id_cliente] || 0,
            contacts: (cliente.get('contactos') as any[])?.map((contacto: any) => ({
                id: contacto.id_contacto.toString(),
                name: contacto.nombre_contacto,
                email: contacto.email_contacto,
                phone: contacto.telefono_contacto,
                position: contacto.cargo_contacto,
                city: contacto.comuna?.nombre_comuna || '',
                is_primary: false
            })) || []
        }));

        return {
            clients: transformedClients,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
            },
        };
    }

    /**
     * Obtener todos los clientes con sus contactos
     */
    static async getAllClientes() {
        const clientes = await Cliente.findAll({
            include: [
                {
                    model: Contacto,
                    as: 'contactos',
                    include: [
                        {
                            model: Comuna,
                            as: 'comuna',
                            attributes: ['id_comuna', 'nombre_comuna']
                        }
                    ]
                }
            ],
            order: [['nombre_cliente', 'ASC']]
        });

        // Obtener conteos de solicitudes para cada cliente
        const clientIds = clientes.map(c => c.id_cliente);
        
        const solicitudesPorCliente = await Solicitud.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('Solicitud.id_solicitud')), 'count'],
                [sequelize.col('contacto.id_cliente'), 'id_cliente']
            ],
            include: [
                {
                    model: Contacto,
                    as: 'contacto',
                    attributes: [],
                    where: {
                        id_cliente: {
                            [Op.in]: clientIds
                        }
                    }
                }
            ],
            group: ['contacto.id_cliente'],
            raw: true
        });

        // Crear mapa de conteos
        const conteoPorCliente: Record<number, number> = {};
        solicitudesPorCliente.forEach((item: any) => {
            conteoPorCliente[item.id_cliente] = parseInt(item.count);
        });

        const activosPorCliente = await ClienteService.getActiveProcessCountByClient(clientIds);

        // Transformar al formato del frontend
        return clientes.map(cliente => ({
            id: cliente.id_cliente.toString(),
            name: cliente.nombre_cliente,
            processCount: conteoPorCliente[cliente.id_cliente] || 0,
            activeProcessCount: activosPorCliente[cliente.id_cliente] || 0,
            contacts: (cliente.get('contactos') as any[])?.map((contacto: any) => ({
                id: contacto.id_contacto.toString(),
                name: contacto.nombre_contacto,
                email: contacto.email_contacto,
                phone: contacto.telefono_contacto,
                position: contacto.cargo_contacto,
                city: contacto.comuna?.nombre_comuna || '',
                is_primary: false
            })) || []
        }));
    }

    /**
     * Obtener un cliente por ID
     */
    static async getClienteById(id: number) {
        const cliente = await Cliente.findByPk(id, {
            include: [
                {
                    model: Contacto,
                    as: 'contactos',
                    include: [
                        {
                            model: Comuna,
                            as: 'comuna',
                            attributes: ['id_comuna', 'nombre_comuna']
                        }
                    ]
                }
            ]
        });

        if (!cliente) {
            return null;
        }

        // Transformar al formato del frontend
        return {
            id: cliente.id_cliente.toString(),
            name: cliente.nombre_cliente,
            contacts: (cliente.get('contactos') as any[])?.map((contacto: any) => ({
                id: contacto.id_contacto.toString(),
                name: contacto.nombre_contacto,
                email: contacto.email_contacto,
                phone: contacto.telefono_contacto,
                position: contacto.cargo_contacto,
                city: contacto.comuna?.nombre_comuna || '',
                is_primary: false
            })) || []
        };
    }

    /**
     * Crear nuevo cliente con contactos
     */
    static async createCliente(data: { name: string; contacts: any[] }, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la sesión para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }
            
            const { name, contacts } = data;

            // Validaciones
            if (!name || !name.trim()) {
                throw new Error('El nombre del cliente es requerido');
            }

            if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
                throw new Error('Debe proporcionar al menos un contacto');
            }

            // Crear el cliente
            const nuevoCliente = await Cliente.create({
                nombre_cliente: name.trim()
            }, { transaction });

            // Buscar comunas por nombre para los contactos
            const contactosCreados = await Promise.all(
                contacts.map(async (contact: any) => {
                    let idcomuna: number | undefined = undefined;

                    if (contact.city && contact.city.trim()) {
                        const comuna = await Comuna.findOne({
                            where: { nombre_comuna: contact.city.trim() }
                        });
                        idcomuna = comuna?.id_comuna;
                    }

                    if (!idcomuna) {
                        const comunaDefecto = await Comuna.findOne({
                            where: { nombre_comuna: 'Santiago' }
                        });
                        idcomuna = comunaDefecto?.id_comuna || 1;
                    }

                    return await Contacto.create({
                        nombre_contacto: contact.name.trim(),
                        email_contacto: contact.email.trim(),
                        telefono_contacto: contact.phone.trim(),
                        cargo_contacto: contact.position?.trim() || 'Sin cargo',
                        id_comuna: idcomuna,
                        id_cliente: nuevoCliente.id_cliente
                    }, { transaction });
                })
            );

            await transaction.commit();

            // Obtener los contactos creados con sus comunas (sin transacción)
            const contactosConComunas = await Contacto.findAll({
                where: { id_cliente: nuevoCliente.id_cliente },
                include: [
                    {
                        model: Comuna,
                        as: 'comuna',
                        attributes: ['id_comuna', 'nombre_comuna']
                    }
                ]
            });

            // Respuesta en formato frontend
            return {
                id: nuevoCliente.id_cliente.toString(),
                name: nuevoCliente.nombre_cliente,
                contacts: contactosConComunas.map(contacto => ({
                    id: contacto.id_contacto.toString(),
                    name: contacto.nombre_contacto,
                    email: contacto.email_contacto,
                    phone: contacto.telefono_contacto,
                    position: contacto.cargo_contacto,
                    city: (contacto as any).comuna?.nombre_comuna || '',
                    is_primary: false
                }))
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Actualizar cliente y sus contactos
     */
    static async updateCliente(id: number, data: { name: string; contacts: any[] }, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la sesión para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }
            
            const { name, contacts } = data;

            const cliente = await Cliente.findByPk(id);
            if (!cliente) {
                throw new Error('Cliente no encontrado');
            }

            // Validaciones
            if (!name || !name.trim()) {
                throw new Error('El nombre del cliente es requerido');
            }

            if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
                throw new Error('Debe proporcionar al menos un contacto');
            }

            // Actualizar nombre del cliente
            await cliente.update({ nombre_cliente: name.trim() }, { transaction });

            // Gestionar contactos
            const contactosActuales = await Contacto.findAll({
                where: { id_cliente: id },
                transaction
            });

            const idsContactosNuevos = contacts
                .filter(c => c.id && c.id !== '')
                .map(c => parseInt(c.id));

            const contactosAEliminar = contactosActuales.filter(
                c => !idsContactosNuevos.includes(c.id_contacto)
            );

            // Eliminar contactos que ya no están
            for (const contacto of contactosAEliminar) {
                await contacto.destroy({ transaction });
            }

            // Actualizar o crear contactos
            const contactosActualizados = await Promise.all(
                contacts.map(async (contact: any) => {
                    let idcomuna: number | undefined = undefined;

                    if (contact.city && contact.city.trim()) {
                        const comuna = await Comuna.findOne({
                            where: { nombre_comuna: contact.city.trim() }
                        });
                        idcomuna = comuna?.id_comuna;
                    }

                    if (!idcomuna) {
                        const comunaDefecto = await Comuna.findOne({
                            where: { nombre_comuna: 'Santiago' }
                        });
                        idcomuna = comunaDefecto?.id_comuna || 1;
                    }

                    // Solo intentar actualizar si el ID es un número válido (no temporal)
                    const isValidId = contact.id && !isNaN(parseInt(contact.id)) && !contact.id.toString().startsWith('contact-');
                    
                    if (isValidId) {
                        const contactoExistente = await Contacto.findByPk(parseInt(contact.id));
                        if (contactoExistente) {
                            await contactoExistente.update({
                                nombre_contacto: contact.name.trim(),
                                email_contacto: contact.email.trim(),
                                telefono_contacto: contact.phone.trim(),
                                cargo_contacto: contact.position?.trim() || 'Sin cargo',
                                id_comuna: idcomuna
                            }, { transaction });
                            return contactoExistente;
                        }
                    }

                    return await Contacto.create({
                        nombre_contacto: contact.name.trim(),
                        email_contacto: contact.email.trim(),
                        telefono_contacto: contact.phone.trim(),
                        cargo_contacto: contact.position?.trim() || 'Sin cargo',
                        id_comuna: idcomuna,
                        id_cliente: cliente.id_cliente
                    }, { transaction });
                })
            );

            await transaction.commit();

            // Obtener los contactos actualizados con sus comunas (sin transacción)
            const contactosConComunas = await Contacto.findAll({
                where: { id_cliente: id },
                include: [
                    {
                        model: Comuna,
                        as: 'comuna',
                        attributes: ['id_comuna', 'nombre_comuna']
                    }
                ]
            });

            return {
                id: cliente.id_cliente.toString(),
                name: cliente.nombre_cliente,
                contacts: contactosConComunas.map(contacto => ({
                    id: contacto.id_contacto.toString(),
                    name: contacto.nombre_contacto,
                    email: contacto.email_contacto,
                    phone: contacto.telefono_contacto,
                    position: contacto.cargo_contacto,
                    city: (contacto as any).comuna?.nombre_comuna || '',
                    is_primary: false
                }))
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Eliminar cliente
     */
    static async deleteCliente(id: number, usuarioRut?: string) {
        const transaction: Transaction = await sequelize.transaction();

        try {
            // Establecer el usuario en la sesión para los triggers de auditoría
            if (usuarioRut) {
                await setDatabaseUser(usuarioRut, transaction);
            }
            
            const cliente = await Cliente.findByPk(id, {
                include: [
                    {
                        model: Contacto,
                        as: 'contactos'
                    }
                ],
                transaction
            });

            if (!cliente) {
                throw new Error('Cliente no encontrado');
            }

            // Verificar si tiene solicitudes asociadas
            const { Solicitud } = require('@/models');
            const contactos = cliente.get('contactos') as any[];
            const idsContactos = contactos.map(c => c.id_contacto);

            const solicitudesActivas = await Solicitud.count({
                where: {
                    id_contacto: idsContactos
                },
                transaction
            });

            if (solicitudesActivas > 0) {
                throw new Error('No se puede eliminar el cliente porque tiene solicitudes asociadas');
            }

            // Eliminar contactos
            for (const contacto of contactos) {
                await contacto.destroy({ transaction });
            }

            // Eliminar cliente
            await cliente.destroy({ transaction });

            await transaction.commit();

            return { id };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Obtener estadísticas de clientes
     */
    static async getStats() {
        const totalClientes = await Cliente.count();
        const totalContactos = await Contacto.count();

        const { Solicitud } = require('@/models');
        const clientesConSolicitudes = await Solicitud.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('contacto.id_cliente')), 'id_cliente']],
            include: [
                {
                    model: Contacto,
                    as: 'contacto',
                    attributes: []
                }
            ],
            raw: true
        });

        return {
            total_clientes: totalClientes,
            clientes_activos: clientesConSolicitudes.length,
            total_contactos: totalContactos
        };
    }
}

