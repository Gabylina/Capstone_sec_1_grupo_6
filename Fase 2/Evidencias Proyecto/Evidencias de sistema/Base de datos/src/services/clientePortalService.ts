import { Op } from 'sequelize';
import { Solicitud, Contacto, Cliente, Usuario } from '@/models';
import { SolicitudService } from './solicitudService';
import { rutForClientePortal } from '@/utils/rutCliente';
import { generarPasswordPortalSegura, portalUsuarioFromNombreEmpresa } from '@/utils/portalUsuario';

const ESTADOS_ACTIVOS = ['Creado', 'Iniciado', 'En Progreso', 'Congelado'];

export class ClientePortalService {
    static async getIdClienteForUsuario(rutUsuario: string): Promise<number | null> {
        const usuario = await Usuario.findByPk(rutUsuario, { attributes: ['id_cliente', 'rol_usuario'] });
        if (!usuario || usuario.rol_usuario !== 3 || usuario.id_cliente == null) {
            return null;
        }
        return usuario.id_cliente;
    }

    static async assertSolicitudBelongsToCliente(idSolicitud: number, idCliente: number): Promise<boolean> {
        const count = await Solicitud.count({
            include: [
                {
                    model: Contacto,
                    as: 'contacto',
                    required: true,
                    where: { id_cliente: idCliente },
                    attributes: [],
                },
            ],
            where: { id_solicitud: idSolicitud },
        });
        return count > 0;
    }

    static async getResumen(idCliente: number) {
        const result = await SolicitudService.getSolicitudes(
            1,
            100000,
            '',
            undefined,
            undefined,
            undefined,
            undefined,
            'fecha',
            'DESC',
            [String(idCliente)]
        );

        const solicitudes = result.solicitudes || [];
        const total = solicitudes.length;
        const activos = solicitudes.filter((s: any) =>
            ESTADOS_ACTIVOS.includes(s.estado_solicitud)
        ).length;

        const porTipoMap = new Map<string, { codigo: string; nombre: string; cantidad: number }>();
        const estadosSet = new Set<string>();
        for (const s of solicitudes) {
            const codigo = s.tipo_servicio || s.service_type || 'OTRO';
            const nombre = s.tipo_servicio_nombre || codigo;
            const prev = porTipoMap.get(codigo);
            if (prev) prev.cantidad += 1;
            else porTipoMap.set(codigo, { codigo, nombre, cantidad: 1 });
            const estado = String(s.estado_solicitud || '').trim();
            if (estado) estadosSet.add(estado);
        }

        return {
            total_procesos: total,
            procesos_activos: activos,
            por_tipo: [...porTipoMap.values()].sort((a, b) => b.cantidad - a.cantidad),
            estados_disponibles: [...estadosSet].sort((a, b) => a.localeCompare(b, 'es')),
        };
    }

    static async listSolicitudes(
        idCliente: number,
        opts: {
            service_type?: string[];
            estado?: string[];
            fecha_desde?: string;
            fecha_hasta?: string;
            page?: number;
            limit?: number;
        } = {}
    ) {
        const page = opts.page || 1;
        const limit = opts.limit || 50;

        let result = await SolicitudService.getSolicitudes(
            1,
            100000,
            '',
            undefined,
            opts.service_type,
            undefined,
            undefined,
            'fecha',
            'DESC',
            [String(idCliente)]
        );

        let items = (result.solicitudes || []) as any[];

        if (opts.fecha_desde) {
            const desde = new Date(opts.fecha_desde);
            items = items.filter((s) => {
                const f = s.fecha_creacion || s.fecha_ingreso_solicitud;
                return f && new Date(f) >= desde;
            });
        }
        if (opts.fecha_hasta) {
            const hasta = new Date(opts.fecha_hasta);
            hasta.setHours(23, 59, 59, 999);
            items = items.filter((s) => {
                const f = s.fecha_creacion || s.fecha_ingreso_solicitud;
                return f && new Date(f) <= hasta;
            });
        }
        if (opts.estado?.length) {
            const estadosFiltro = opts.estado.map((e) => e.trim().toLowerCase());
            items = items.filter((s) =>
                estadosFiltro.includes(String(s.estado_solicitud || '').trim().toLowerCase())
            );
        }

        const total = items.length;
        const offset = (page - 1) * limit;
        const paginated = items.slice(offset, offset + limit);

        return {
            items: paginated.map((s) => ({
                id: s.id || s.id_solicitud,
                proceso: s.cargo || s.position_title || 'Sin cargo',
                fecha_solicitud: s.fecha_creacion || s.fecha_ingreso_solicitud,
                consultor: s.consultor || 'Sin asignar',
                tipo_servicio: s.tipo_servicio,
                tipo_servicio_nombre: s.tipo_servicio_nombre,
                estado_solicitud: s.estado_solicitud,
                etapa: s.etapa,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        };
    }

    static async getCredencialCliente(idCliente: number) {
        const usuario = await Usuario.findOne({
            where: { id_cliente: idCliente, rol_usuario: 3 },
            attributes: [
                'rut_usuario',
                'email_usuario',
                'nombre_usuario',
                'apellido_usuario',
                'activo_usuario',
            ],
        });
        if (!usuario) return { tiene_credencial: false as const };
        return {
            tiene_credencial: true as const,
            rut_usuario: usuario.rut_usuario,
            usuario: usuario.email_usuario,
            email: usuario.email_usuario,
            activo: usuario.activo_usuario,
        };
    }

    private static defaultNombreApellido(idCliente: number, cliente: Cliente | null) {
        const empresa = cliente?.nombre_cliente?.trim() || '';
        const parts = empresa ? empresa.split(/\s+/).filter(Boolean) : [];
        let nombre = parts[0] || 'Cliente';
        let apellido = parts.slice(1).join(' ').trim();
        if (nombre.length < 2) nombre = 'Cliente';
        if (apellido.length < 2) apellido = 'Portal';
        return { nombre: nombre.slice(0, 100), apellido: apellido.slice(0, 100) };
    }

    /** Arma el registro completo para tabla usuario (todos los campos obligatorios del modelo). */
    private static datosUsuarioPortal(
        idCliente: number,
        cliente: Cliente,
        passwordPlano: string
    ) {
        const usuarioLogin = portalUsuarioFromNombreEmpresa(cliente.nombre_cliente);
        const { nombre, apellido } = ClientePortalService.defaultNombreApellido(idCliente, cliente);
        return {
            rut_usuario: rutForClientePortal(idCliente),
            email_usuario: usuarioLogin,
            nombre_usuario: nombre,
            apellido_usuario: apellido,
            contrasena_usuario: passwordPlano,
            activo_usuario: true,
            rol_usuario: 3 as const,
            id_cliente: idCliente,
        };
    }

    static async upsertCredencialCliente(
        idCliente: number,
        data: {
            usuario: string;
            password?: string;
            activo?: boolean;
        }
    ) {
        const cliente = await Cliente.findByPk(idCliente);
        if (!cliente) throw new Error('Cliente no encontrado');

        const loginId = data.usuario.trim();
        let usuario = await Usuario.findOne({ where: { id_cliente: idCliente, rol_usuario: 3 } });

        const existingEmail = await Usuario.findOne({
            where: {
                email_usuario: loginId,
                ...(usuario ? { rut_usuario: { [Op.ne]: usuario.rut_usuario } } : {}),
            },
        });
        if (existingEmail) {
            throw new Error('El correo electrónico ya está registrado para otro usuario');
        }

        if (usuario) {
            const patch: Record<string, unknown> = {
                email_usuario: loginId,
                activo_usuario: data.activo !== false,
            };
            if (data.password) {
                patch.contrasena_usuario = data.password;
            }
            await usuario.update(patch);
        } else {
            if (!data.password) {
                throw new Error('La contraseña es requerida al crear el acceso');
            }
            const datos = ClientePortalService.datosUsuarioPortal(idCliente, cliente, data.password);
            datos.email_usuario = loginId;
            await Usuario.create(datos);
        }

        return this.getCredencialCliente(idCliente);
    }

    static async getCredencialesStatus(idClientes: number[]): Promise<Record<number, boolean>> {
        const ids = [...new Set(idClientes.filter((id) => Number.isFinite(id) && id > 0))];
        const result: Record<number, boolean> = {};
        for (const id of ids) result[id] = false;
        if (!ids.length) return result;

        const rows = await Usuario.findAll({
            where: { id_cliente: { [Op.in]: ids }, rol_usuario: 3 },
            attributes: ['id_cliente'],
        });
        for (const row of rows) {
            if (row.id_cliente != null) result[row.id_cliente] = true;
        }
        return result;
    }

    static async generarCredencialCliente(idCliente: number) {
        const cliente = await Cliente.findByPk(idCliente);
        if (!cliente) throw new Error('Cliente no encontrado');

        const usuarioLogin = portalUsuarioFromNombreEmpresa(cliente.nombre_cliente);
        if (usuarioLogin.length < 2) {
            throw new Error('El nombre de la empresa debe tener al menos 2 caracteres para generar el usuario');
        }

        const password = generarPasswordPortalSegura(8);
        const existing = await Usuario.findOne({
            where: { id_cliente: idCliente, rol_usuario: 3 },
        });

        if (existing) {
            const dup = await Usuario.findOne({
                where: {
                    email_usuario: usuarioLogin,
                    rut_usuario: { [Op.ne]: existing.rut_usuario },
                },
            });
            if (dup) {
                throw new Error(
                    'Ya existe otro usuario con ese nombre de acceso. Renombre la empresa o contacte al administrador.'
                );
            }
            await existing.update({
                email_usuario: usuarioLogin,
                contrasena_usuario: password,
                activo_usuario: true,
            });
            console.log('[cliente-portal] Contraseña regenerada', { idCliente, login: usuarioLogin });
            return {
                tiene_credencial: true as const,
                usuario: usuarioLogin,
                password,
                activo: true,
                recien_creado: true,
                regenerado: true,
            };
        }

        const dup = await Usuario.findOne({ where: { email_usuario: usuarioLogin } });
        if (dup) {
            throw new Error(
                'Ya existe otro usuario con ese nombre de acceso. Renombre la empresa o contacte al administrador.'
            );
        }

        const datos = ClientePortalService.datosUsuarioPortal(idCliente, cliente, password);

        try {
            const creado = await Usuario.create(datos);
            console.log('[cliente-portal] Usuario.create OK', {
                idCliente,
                rut: creado.rut_usuario,
                login: creado.email_usuario,
                rol: creado.rol_usuario,
            });
        } catch (error: any) {
            console.error('[cliente-portal] Usuario.create FALLÓ', idCliente, error?.message, error?.errors);
            if (error?.name === 'SequelizeValidationError' && Array.isArray(error.errors)) {
                const detalle = error.errors.map((e: { message?: string }) => e.message).join('; ');
                throw new Error(detalle || 'Error de validación al crear el usuario');
            }
            if (error?.name === 'SequelizeUniqueConstraintError') {
                throw new Error('Ya existe un usuario con ese RUT o nombre de acceso');
            }
            throw error;
        }

        return {
            tiene_credencial: true as const,
            usuario: datos.email_usuario,
            password,
            activo: true,
            recien_creado: true,
        };
    }

    static async setCredencialActiva(idCliente: number, activo: boolean) {
        const usuario = await Usuario.findOne({
            where: { id_cliente: idCliente, rol_usuario: 3 },
        });
        if (!usuario) throw new Error('Este cliente no tiene credenciales de portal');

        await usuario.update({ activo_usuario: activo });
        const cred = await this.getCredencialCliente(idCliente);
        return { ...cred, tiene_credencial: true as const };
    }
}
