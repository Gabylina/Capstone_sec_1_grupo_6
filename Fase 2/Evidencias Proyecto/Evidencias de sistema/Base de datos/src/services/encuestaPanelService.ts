import { Op, QueryTypes } from 'sequelize';
import sequelize from '@/config/database';
import {
    Solicitud,
    Postulacion,
    Candidato,
    Contratacion,
    EvaluacionPsicolaboral,
} from '@/models';
import EstadoClienteM5Service from '@/services/estadoClienteM5Service';
import {
    getModuloFinalEncuesta,
    servicioTieneEncuesta,
} from '@/utils/encuestaModuloConfig';

const ID_ESTADO_CONTRATADO = 1;

export type EncuestaPanelItem = {
    id_postulacion: number | null;
    id_contratacion: number;
    nombre: string;
    encuesta_respondida: boolean;
    pendiente: boolean;
};

export type EncuestaPanelResponse = {
    aplica: boolean;
    codigo_servicio: string;
    modulo_final: number | null;
    items: EncuestaPanelItem[];
    mensaje?: string;
};

export class EncuestaPanelService {
    private static async ensureContratacionEncuesta(idPostulacion: number): Promise<Contratacion> {
        let contratacion = await Contratacion.findOne({ where: { id_postulacion: idPostulacion } });
        if (!contratacion) {
            contratacion = await Contratacion.create({
                id_postulacion: idPostulacion,
                id_estado_contratacion: ID_ESTADO_CONTRATADO,
            });
        } else if (contratacion.id_estado_contratacion !== ID_ESTADO_CONTRATADO) {
            await contratacion.update({ id_estado_contratacion: ID_ESTADO_CONTRATADO });
        }
        return contratacion;
    }

    private static encuestaRespondida(contratacion: Contratacion | null | undefined): boolean {
        if (!contratacion?.encuesta_satisfaccion) return false;
        return contratacion.encuesta_satisfaccion.trim().length > 0;
    }

    private static formatNombre(cand: Candidato | null | undefined): string {
        if (!cand) return '—';
        return `${cand.nombre_candidato} ${cand.primer_apellido_candidato} ${cand.segundo_apellido_candidato || ''}`.trim();
    }

    private static async isSolicitudFinalizada(idSolicitud: number): Promise<boolean> {
        const rows = await sequelize.query<{ nombre_estado_solicitud: string }>(
            `SELECT es.nombre_estado_solicitud
             FROM estado_solicitud_hist esh
             INNER JOIN estado es ON es.id_estado_solicitud = esh.id_estado_solicitud
             WHERE esh.id_solicitud = :id_solicitud
             ORDER BY esh.fecha_cambio_estado_solicitud DESC
             LIMIT 1`,
            { replacements: { id_solicitud: idSolicitud }, type: QueryTypes.SELECT }
        );
        const estado = rows[0]?.nombre_estado_solicitud || '';
        const s = String(estado).toLowerCase();
        return ['cerrado', 'cancelado', 'cierre extraordinario', 'completado', 'congelado'].some((x) =>
            s.includes(x)
        );
    }

    private static async ensurePpEncuestaSlot(idSolicitud: number): Promise<EncuestaPanelItem> {
        const postulaciones = await Postulacion.findAll({
            where: { id_solicitud: idSolicitud },
            include: [{ model: Candidato, as: 'candidato', required: false }],
            limit: 1,
        });

        let idPostulacion: number;
        let nombre = 'Publicación en portales';

        if (postulaciones.length > 0) {
            idPostulacion = postulaciones[0].id_postulacion;
            const cand = (postulaciones[0] as any).candidato as Candidato | undefined;
            if (cand) nombre = this.formatNombre(cand);
        } else {
            const candidato = await Candidato.create({
                nombre_candidato: 'Servicio',
                primer_apellido_candidato: 'PP',
                email_candidato: `pp-encuesta-${idSolicitud}@internal.local`,
                discapacidad: false,
                licencia: false,
            });
            const post = await Postulacion.create({
                id_solicitud: idSolicitud,
                id_candidato: candidato.id_candidato,
            });
            idPostulacion = post.id_postulacion;
        }

        const contratacion = await this.ensureContratacionEncuesta(idPostulacion);
        const respondida = this.encuestaRespondida(contratacion);
        return {
            id_postulacion: idPostulacion,
            id_contratacion: contratacion.id_contratacion,
            nombre,
            encuesta_respondida: respondida,
            pendiente: !respondida,
        };
    }

    private static async getItemsModulo3(idSolicitud: number): Promise<EncuestaPanelItem[]> {
        const rows = await sequelize.query<{
            id_postulacion: number;
            nombre_candidato: string;
            primer_apellido_candidato: string;
            segundo_apellido_candidato: string | null;
            id_contratacion: number | null;
            encuesta_satisfaccion: string | null;
        }>(
            `SELECT DISTINCT ON (p.id_postulacion)
                p.id_postulacion,
                c.nombre_candidato,
                c.primer_apellido_candidato,
                c.segundo_apellido_candidato,
                ct.id_contratacion,
                ct.encuesta_satisfaccion
             FROM postulacion p
             INNER JOIN candidato c ON c.id_candidato = p.id_candidato
             INNER JOIN estado_cliente_postulacion ecp ON ecp.id_postulacion = p.id_postulacion
             INNER JOIN estado_cliente ec ON ec.id_estado_cliente = ecp.id_estado_cliente
             LEFT JOIN contratacion ct ON ct.id_postulacion = p.id_postulacion
             WHERE p.id_solicitud = :id_solicitud
               AND LOWER(TRIM(ec.nombre_estado)) = 'aprobado'
             ORDER BY p.id_postulacion, ecp.updated_at DESC NULLS LAST`,
            { replacements: { id_solicitud: idSolicitud }, type: QueryTypes.SELECT }
        );

        const items: EncuestaPanelItem[] = [];
        for (const row of rows) {
            let contratacion: Contratacion;
            if (row.id_contratacion) {
                contratacion = (await Contratacion.findByPk(row.id_contratacion))!;
            } else {
                contratacion = await this.ensureContratacionEncuesta(row.id_postulacion);
            }
            const respondida = this.encuestaRespondida(contratacion);
            items.push({
                id_postulacion: row.id_postulacion,
                id_contratacion: contratacion.id_contratacion,
                nombre: `${row.nombre_candidato} ${row.primer_apellido_candidato} ${row.segundo_apellido_candidato || ''}`.trim(),
                encuesta_respondida: respondida,
                pendiente: !respondida,
            });
        }
        return items;
    }

    private static async getItemsModulo4(idSolicitud: number): Promise<EncuestaPanelItem[]> {
        const evaluaciones = await EvaluacionPsicolaboral.findAll({
            where: {
                estado_informe: {
                    [Op.notIn]: ['Pendiente', ''],
                },
            },
            include: [
                {
                    model: Postulacion,
                    as: 'postulacion',
                    required: true,
                    where: { id_solicitud: idSolicitud },
                    include: [{ model: Candidato, as: 'candidato', required: false }],
                },
            ],
        });

        const items: EncuestaPanelItem[] = [];
        const seen = new Set<number>();
        for (const ev of evaluaciones) {
            const post = (ev as any).postulacion as Postulacion | undefined;
            if (!post || seen.has(post.id_postulacion)) continue;
            seen.add(post.id_postulacion);

            const contratacion = await this.ensureContratacionEncuesta(post.id_postulacion);
            const cand = (post as any).candidato as Candidato | undefined;
            const respondida = this.encuestaRespondida(contratacion);
            items.push({
                id_postulacion: post.id_postulacion,
                id_contratacion: contratacion.id_contratacion,
                nombre: this.formatNombre(cand),
                encuesta_respondida: respondida,
                pendiente: !respondida,
            });
        }
        return items;
    }

    private static async getItemsModulo5(idSolicitud: number): Promise<EncuestaPanelItem[]> {
        const candidatos = await EstadoClienteM5Service.getCandidatosEnModulo5(idSolicitud);
        return candidatos
            .filter((c: any) => c.contratacion_status === 'contratado')
            .map((c: any) => ({
                id_postulacion: Number(c.id),
                id_contratacion: c.id_contratacion as number,
                nombre: c.name as string,
                encuesta_respondida: Boolean(c.encuesta_respondida),
                pendiente: !c.encuesta_respondida,
            }))
            .filter((item) => item.id_contratacion);
    }

    static async getPanel(idSolicitud: number): Promise<EncuestaPanelResponse> {
        const solicitud = await Solicitud.findByPk(idSolicitud, {
            attributes: ['id_solicitud', 'codigo_servicio'],
        });
        if (!solicitud) {
            throw new Error('Solicitud no encontrada');
        }

        const codigo = String(solicitud.codigo_servicio || '').toUpperCase().trim();
        if (!servicioTieneEncuesta(codigo)) {
            return {
                aplica: false,
                codigo_servicio: codigo,
                modulo_final: null,
                items: [],
                mensaje: 'Este tipo de servicio no requiere encuesta de satisfacción.',
            };
        }

        const moduloFinal = getModuloFinalEncuesta(codigo)!;
        let items: EncuestaPanelItem[] = [];
        let mensaje: string | undefined;

        if (moduloFinal === 2) {
            const finalizada = await this.isSolicitudFinalizada(idSolicitud);
            if (finalizada) {
                items = [await this.ensurePpEncuestaSlot(idSolicitud)];
            } else {
                mensaje = 'La encuesta estará disponible al finalizar la solicitud.';
            }
        } else if (moduloFinal === 3) {
            items = await this.getItemsModulo3(idSolicitud);
            if (items.length === 0) {
                mensaje = 'Registre la encuesta cuando haya candidatos aprobados por el cliente.';
            }
        } else if (moduloFinal === 4) {
            items = await this.getItemsModulo4(idSolicitud);
            if (items.length === 0) {
                mensaje = 'La encuesta estará disponible cuando el informe de evaluación esté definido.';
            }
        } else if (moduloFinal === 5) {
            items = await this.getItemsModulo5(idSolicitud);
            if (items.length === 0) {
                mensaje = 'Registre la encuesta para candidatos marcados como contratados.';
            }
        }

        return {
            aplica: true,
            codigo_servicio: codigo,
            modulo_final: moduloFinal,
            items,
            mensaje,
        };
    }
}
