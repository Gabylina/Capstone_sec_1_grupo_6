import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';

// ===========================================
// INTERFACES TYPESCRIPT
// ===========================================

export interface EntrevistaTecnicaAttributes {
    id_entrevista_tecnica: number;
    id_postulacion: number;
    id_solicitud: number;
    fecha_hora_entrevista: Date | null;
    estado_entrevista: string;
    resultado: string | null;
    detalle: string | null;
}

export interface EntrevistaTecnicaCreationAttributes extends Optional<EntrevistaTecnicaAttributes, 'id_entrevista_tecnica' | 'fecha_hora_entrevista' | 'resultado' | 'detalle'> { }

// ===========================================
// MODELO SEQUELIZE
// ===========================================

class EntrevistaTecnica extends Model<EntrevistaTecnicaAttributes, EntrevistaTecnicaCreationAttributes> implements EntrevistaTecnicaAttributes {
    public id_entrevista_tecnica!: number;
    public id_postulacion!: number;
    public id_solicitud!: number;
    public fecha_hora_entrevista!: Date | null;
    public estado_entrevista!: string;
    public resultado!: string | null;
    public detalle!: string | null;
}

// ===========================================
// DEFINICIÓN DEL MODELO
// ===========================================

EntrevistaTecnica.init({
    id_entrevista_tecnica: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    id_postulacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'postulacion',
            key: 'id_postulacion'
        }
    },
    id_solicitud: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'solicitud',
            key: 'id_solicitud'
        }
    },
    fecha_hora_entrevista: {
        type: DataTypes.DATE,
        allowNull: true
    },
    estado_entrevista: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'programada',
        validate: {
            isIn: {
                args: [['programada', 'realizada', 'cancelada']],
                msg: 'Estado debe ser programada, realizada o cancelada'
            }
        }
    },
    resultado: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
            isIn: {
                args: [['avanza', 'no_avanza']],
                msg: 'Resultado debe ser avanza o no_avanza'
            }
        }
    },
    detalle: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    sequelize,
    tableName: 'entrevista_tecnica',
    timestamps: false,
    underscored: true,
    indexes: [
        { fields: ['id_solicitud'] },
        { fields: ['id_postulacion'] }
    ]
});

export default EntrevistaTecnica;
