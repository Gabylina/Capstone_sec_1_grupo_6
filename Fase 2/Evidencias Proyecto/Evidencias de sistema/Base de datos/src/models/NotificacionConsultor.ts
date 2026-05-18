import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';

export interface NotificacionConsultorAttributes {
    id_notificacion: number;
    rut_usuario: string;
    id_solicitud: number;
    id_postulacion: number | null;
    tipo: string;
    titulo: string;
    mensaje: string;
    metadata: Record<string, unknown> | null;
    leida: boolean;
    fecha_creacion: Date;
}

export interface NotificacionConsultorCreationAttributes
    extends Optional<
        NotificacionConsultorAttributes,
        'id_notificacion' | 'id_postulacion' | 'metadata' | 'leida' | 'fecha_creacion' | 'tipo'
    > {}

class NotificacionConsultor
    extends Model<NotificacionConsultorAttributes, NotificacionConsultorCreationAttributes>
    implements NotificacionConsultorAttributes
{
    public id_notificacion!: number;
    public rut_usuario!: string;
    public id_solicitud!: number;
    public id_postulacion!: number | null;
    public tipo!: string;
    public titulo!: string;
    public mensaje!: string;
    public metadata!: Record<string, unknown> | null;
    public leida!: boolean;
    public fecha_creacion!: Date;
}

NotificacionConsultor.init(
    {
        id_notificacion: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        rut_usuario: {
            type: DataTypes.STRING(20),
            allowNull: false,
            references: { model: 'usuario', key: 'rut_usuario' },
        },
        id_solicitud: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'solicitud', key: 'id_solicitud' },
        },
        id_postulacion: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'postulacion', key: 'id_postulacion' },
        },
        tipo: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'aprobacion_candidato',
        },
        titulo: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        mensaje: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        leida: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        fecha_creacion: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        tableName: 'notificacion_consultor',
        timestamps: false,
        underscored: true,
    }
);

export default NotificacionConsultor;
