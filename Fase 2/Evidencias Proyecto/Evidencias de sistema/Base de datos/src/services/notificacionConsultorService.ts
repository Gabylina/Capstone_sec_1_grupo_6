import { NotificacionConsultor, Postulacion, Candidato, Solicitud, DescripcionCargo, Cargo } from '@/models';
import type { AprobacionCandidatoEstado } from '@/models/AprobacionCandidatoPostulacion';

const ESTADO_LABELS: Record<string, string> = {
    aprobado: 'aprobado',
    rechazado: 'rechazado',
    observado: 'observado con observaciones',
};

export class NotificacionConsultorService {
    static async crearNotificacionAprobacion(
        idPostulacion: number,
        estado: Extract<AprobacionCandidatoEstado, 'aprobado' | 'rechazado' | 'observado'>,
        motivo: string
    ) {
        const postulacion = await Postulacion.findByPk(idPostulacion, {
            include: [
                { model: Candidato, as: 'candidato' },
                {
                    model: Solicitud,
                    as: 'solicitud',
                    include: [
                        {
                            model: DescripcionCargo,
                            as: 'descripcionCargo',
                            include: [{ model: Cargo, as: 'cargo' }],
                        },
                    ],
                },
            ],
        });
        if (!postulacion) return null;

        const candidato = (postulacion as any).get('candidato') as Candidato | undefined;
        const solicitud = (postulacion as any).get('solicitud') as Solicitud & {
            descripcionCargo?: DescripcionCargo & { cargo?: Cargo };
        };
        const rutConsultor = solicitud?.rut_usuario;
        if (!rutConsultor) return null;

        const nombreCandidato = candidato?.getNombreCompleto?.() || 'Candidato';
        const descripcionCargo = solicitud?.descripcionCargo;
        const cargo =
            descripcionCargo?.cargo?.nombre_cargo ||
            descripcionCargo?.descripcion_cargo ||
            `Solicitud #${solicitud.id_solicitud}`;

        const estadoTexto = ESTADO_LABELS[estado] || estado;
        const titulo = `Candidato ${estadoTexto}`;
        const motivoTrim = (motivo || '').trim();
        const mensaje =
            motivoTrim.length > 0
                ? `La coordinadora revisó a ${nombreCandidato} en el proceso «${cargo}». Motivo: ${motivoTrim}`
                : `La coordinadora revisó a ${nombreCandidato} en el proceso «${cargo}».`;

        return NotificacionConsultor.create({
            rut_usuario: rutConsultor,
            id_solicitud: postulacion.id_solicitud,
            id_postulacion: idPostulacion,
            tipo: 'aprobacion_candidato',
            titulo,
            mensaje,
            metadata: {
                estado_aprobacion: estado,
                candidato_nombre: nombreCandidato,
                cargo,
            },
            leida: false,
        });
    }

    static async listarPorConsultor(rutUsuario: string, soloNoLeidas = false) {
        const where: { rut_usuario: string; leida?: boolean } = { rut_usuario: rutUsuario };
        if (soloNoLeidas) where.leida = false;

        const rows = await NotificacionConsultor.findAll({
            where,
            order: [['fecha_creacion', 'DESC']],
            limit: 50,
        });

        return rows.map((n) => ({
            id_notificacion: n.id_notificacion,
            rut_usuario: n.rut_usuario,
            id_solicitud: n.id_solicitud,
            id_postulacion: n.id_postulacion,
            tipo: n.tipo,
            titulo: n.titulo,
            mensaje: n.mensaje,
            metadata: n.metadata,
            leida: n.leida,
            fecha_creacion: n.fecha_creacion,
        }));
    }

    static async marcarLeida(idNotificacion: number, rutUsuario: string) {
        const row = await NotificacionConsultor.findByPk(idNotificacion);
        if (!row || row.rut_usuario !== rutUsuario) {
            throw new Error('Notificación no encontrada');
        }
        await row.update({ leida: true });
        return row;
    }

    static async marcarTodasLeidas(rutUsuario: string) {
        await NotificacionConsultor.update(
            { leida: true },
            { where: { rut_usuario: rutUsuario, leida: false } }
        );
    }

    static async contarNoLeidas(rutUsuario: string) {
        return NotificacionConsultor.count({
            where: { rut_usuario: rutUsuario, leida: false },
        });
    }
}
