import { Transaction } from 'sequelize';
import sequelize from '@/config/database';
import {
    AprobacionCandidatoPostulacion,
    Postulacion,
    Solicitud,
    Usuario,
} from '@/models';
import type { AprobacionCandidatoEstado } from '@/models/AprobacionCandidatoPostulacion';
import { setDatabaseUser } from '@/utils/databaseUser';

const CODIGOS_CON_APROBACION = new Set(['PC', 'LL', 'HH', 'HS']);

export function solicitudRequiereAprobacionCandidato(codigoServicio: string | null | undefined): boolean {
    if (!codigoServicio) return false;
    return CODIGOS_CON_APROBACION.has(String(codigoServicio).toUpperCase().trim());
}

export class AprobacionCandidatoService {
    static async getCodigoServicioByPostulacion(idPostulacion: number, transaction?: Transaction): Promise<string | null> {
        const postulacion = await Postulacion.findByPk(idPostulacion, {
            include: [{ model: Solicitud, as: 'solicitud', attributes: ['codigo_servicio'] }],
            transaction,
        });
        if (!postulacion) return null;
        const solicitud = (postulacion as any).get('solicitud') as Solicitud | undefined;
        return solicitud?.codigo_servicio ?? null;
    }

    static async getOrCreate(idPostulacion: number, transaction?: Transaction) {
        let row = await AprobacionCandidatoPostulacion.findOne({
            where: { id_postulacion: idPostulacion },
            transaction,
        });
        if (!row) {
            row = await AprobacionCandidatoPostulacion.create(
                { id_postulacion: idPostulacion, estado: 'pendiente' },
                { transaction }
            );
        }
        return row;
    }

    static formatRow(row: AprobacionCandidatoPostulacion, usuarios?: Map<string, Usuario>) {
        const usuarioEnvio = row.rut_usuario_envio ? usuarios?.get(row.rut_usuario_envio) : undefined;
        const usuarioAprobador = row.rut_usuario_aprobador ? usuarios?.get(row.rut_usuario_aprobador) : undefined;
        return {
            id_aprobacion_candidato: row.id_aprobacion_candidato,
            id_postulacion: row.id_postulacion,
            estado: row.estado,
            motivo: row.motivo,
            rut_usuario_envio: row.rut_usuario_envio,
            usuario_envio_nombre: usuarioEnvio ? usuarioEnvio.getNombreCompleto() : null,
            fecha_envio_revision: row.fecha_envio_revision,
            rut_usuario_aprobador: row.rut_usuario_aprobador,
            usuario_aprobador_nombre: usuarioAprobador ? usuarioAprobador.getNombreCompleto() : null,
            fecha_resolucion: row.fecha_resolucion,
        };
    }

    static async listBySolicitud(idSolicitud: number) {
        const solicitud = await Solicitud.findByPk(idSolicitud);
        if (!solicitud) throw new Error('Solicitud no encontrada');

        const codigo = String(solicitud.codigo_servicio || '').toUpperCase();
        if (!solicitudRequiereAprobacionCandidato(codigo)) {
            return { applies: false as const, items: [] as ReturnType<typeof AprobacionCandidatoService.formatRow>[] };
        }

        const postulaciones = await Postulacion.findAll({
            where: { id_solicitud: idSolicitud },
            attributes: ['id_postulacion'],
        });
        const ids = postulaciones.map((p) => p.id_postulacion);
        if (ids.length === 0) {
            return { applies: true as const, items: [] };
        }

        const rows = await AprobacionCandidatoPostulacion.findAll({
            where: { id_postulacion: ids },
        });
        const existingIds = new Set(rows.map((r) => r.id_postulacion));
        for (const id of ids) {
            if (!existingIds.has(id)) {
                const created = await AprobacionCandidatoPostulacion.create({
                    id_postulacion: id,
                    estado: 'pendiente',
                });
                rows.push(created);
            }
        }

        const ruts = new Set<string>();
        rows.forEach((r) => {
            if (r.rut_usuario_envio) ruts.add(r.rut_usuario_envio);
            if (r.rut_usuario_aprobador) ruts.add(r.rut_usuario_aprobador);
        });
        const usuarios = new Map<string, Usuario>();
        if (ruts.size > 0) {
            const list = await Usuario.findAll({ where: { rut_usuario: [...ruts] } });
            list.forEach((u) => usuarios.set(u.rut_usuario, u));
        }

        return {
            applies: true as const,
            items: rows.map((r) => this.formatRow(r, usuarios)),
        };
    }

    static async enviarARevision(idPostulacion: number, rutUsuario: string) {
        const transaction = await sequelize.transaction();
        try {
            await setDatabaseUser(rutUsuario, transaction);

            const codigo = await this.getCodigoServicioByPostulacion(idPostulacion, transaction);
            if (!solicitudRequiereAprobacionCandidato(codigo)) {
                throw new Error('Este tipo de proceso no requiere aprobación de candidatos');
            }

            const row = await this.getOrCreate(idPostulacion, transaction);
            if (row.estado === 'en_revision') {
                await transaction.commit();
                return this.formatRow(row);
            }
            if (row.estado === 'aprobado') {
                throw new Error('El candidato ya fue aprobado por la coordinadora');
            }

            await row.update(
                {
                    estado: 'en_revision',
                    motivo: null,
                    rut_usuario_envio: rutUsuario,
                    fecha_envio_revision: new Date(),
                    rut_usuario_aprobador: null,
                    fecha_resolucion: null,
                },
                { transaction }
            );

            await transaction.commit();
            return this.formatRow(row);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async resolver(
        idPostulacion: number,
        estado: Extract<AprobacionCandidatoEstado, 'aprobado' | 'rechazado' | 'observado'>,
        motivo: string,
        rutAprobador: string
    ) {
        const transaction = await sequelize.transaction();
        try {
            await setDatabaseUser(rutAprobador, transaction);

            const codigo = await this.getCodigoServicioByPostulacion(idPostulacion, transaction);
            if (!solicitudRequiereAprobacionCandidato(codigo)) {
                throw new Error('Este tipo de proceso no requiere aprobación de candidatos');
            }

            const row = await this.getOrCreate(idPostulacion, transaction);
            if (row.estado !== 'en_revision') {
                throw new Error('Solo se pueden resolver candidatos en estado de revisión');
            }

            const motivoTrim = (motivo || '').trim();
            const motivoObligatorio = estado === 'rechazado' || estado === 'observado';
            if (motivoObligatorio && motivoTrim.length < 5) {
                throw new Error('Debe indicar el motivo de la decisión (mínimo 5 caracteres)');
            }

            await row.update(
                {
                    estado,
                    motivo: motivoObligatorio ? motivoTrim : motivoTrim || null,
                    rut_usuario_aprobador: rutAprobador,
                    fecha_resolucion: new Date(),
                },
                { transaction }
            );

            await transaction.commit();

            const { NotificacionConsultorService } = await import('./notificacionConsultorService');
            await NotificacionConsultorService.crearNotificacionAprobacion(
                idPostulacion,
                estado,
                motivoTrim
            ).catch((err) => {
                console.error('Error al crear notificación de aprobación:', err);
            });

            const refreshed = await AprobacionCandidatoPostulacion.findByPk(row.id_aprobacion_candidato);
            return this.formatRow(refreshed!);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async assertPuedePresentar(idPostulacion: number, transaction?: Transaction) {
        const codigo = await this.getCodigoServicioByPostulacion(idPostulacion, transaction);
        if (!solicitudRequiereAprobacionCandidato(codigo)) return;

        const row = await this.getOrCreate(idPostulacion, transaction);
        if (row.estado !== 'aprobado') {
            const msg: Record<string, string> = {
                pendiente: 'Debe enviar el candidato a revisión y obtener la aprobación de la coordinadora antes de presentarlo.',
                en_revision: 'El candidato está en revisión. Espere la aprobación de la coordinadora para presentarlo.',
                rechazado: 'El candidato fue rechazado por la coordinadora y no puede presentarse.',
                observado: 'El candidato tiene observaciones de la coordinadora. Corrija y vuelva a enviar a revisión antes de presentarlo.',
            };
            throw new Error(msg[row.estado] || 'Se requiere aprobación de la coordinadora para presentar al candidato.');
        }
    }
}
