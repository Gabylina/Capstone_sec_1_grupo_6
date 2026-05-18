import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';

export const APROBACION_ESTADOS = [
    'pendiente',
    'en_revision',
    'aprobado',
    'rechazado',
    'observado',
] as const;

export type AprobacionCandidatoEstado = (typeof APROBACION_ESTADOS)[number];

export interface AprobacionCandidatoPostulacionAttributes {
    id_aprobacion_candidato: number;
    id_postulacion: number;
    estado: AprobacionCandidatoEstado;
    motivo: string | null;
    rut_usuario_envio: string | null;
    fecha_envio_revision: Date | null;
    rut_usuario_aprobador: string | null;
    fecha_resolucion: Date | null;
}

export interface AprobacionCandidatoPostulacionCreationAttributes
    extends Optional<
        AprobacionCandidatoPostulacionAttributes,
        | 'id_aprobacion_candidato'
        | 'estado'
        | 'motivo'
        | 'rut_usuario_envio'
        | 'fecha_envio_revision'
        | 'rut_usuario_aprobador'
        | 'fecha_resolucion'
    > {}

class AprobacionCandidatoPostulacion
    extends Model<AprobacionCandidatoPostulacionAttributes, AprobacionCandidatoPostulacionCreationAttributes>
    implements AprobacionCandidatoPostulacionAttributes
{
    public id_aprobacion_candidato!: number;
    public id_postulacion!: number;
    public estado!: AprobacionCandidatoEstado;
    public motivo!: string | null;
    public rut_usuario_envio!: string | null;
    public fecha_envio_revision!: Date | null;
    public rut_usuario_aprobador!: string | null;
    public fecha_resolucion!: Date | null;
}

AprobacionCandidatoPostulacion.init(
    {
        id_aprobacion_candidato: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        id_postulacion: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: 'postulacion', key: 'id_postulacion' },
        },
        estado: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'pendiente',
        },
        motivo: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        rut_usuario_envio: {
            type: DataTypes.STRING(20),
            allowNull: true,
            references: { model: 'usuario', key: 'rut_usuario' },
        },
        fecha_envio_revision: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        rut_usuario_aprobador: {
            type: DataTypes.STRING(20),
            allowNull: true,
            references: { model: 'usuario', key: 'rut_usuario' },
        },
        fecha_resolucion: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'aprobacion_candidato_postulacion',
        timestamps: false,
        underscored: true,
    }
);

export default AprobacionCandidatoPostulacion;
