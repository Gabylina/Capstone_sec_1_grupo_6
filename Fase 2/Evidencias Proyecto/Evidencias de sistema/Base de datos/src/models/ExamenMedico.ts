import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';

// ===========================================
// INTERFACES TYPESCRIPT
// ===========================================

export interface ExamenMedicoAttributes {
    id_examen_medico: number;
    id_postulacion: number;
    id_solicitud: number;
    nombre_documento: string | null;
    documento_archivo: Buffer | null;
    estado_aprobacion: string;
}

export interface ExamenMedicoCreationAttributes extends Optional<ExamenMedicoAttributes, 'id_examen_medico' | 'nombre_documento' | 'documento_archivo'> { }

// ===========================================
// MODELO SEQUELIZE
// ===========================================

class ExamenMedico extends Model<ExamenMedicoAttributes, ExamenMedicoCreationAttributes> implements ExamenMedicoAttributes {
    public id_examen_medico!: number;
    public id_postulacion!: number;
    public id_solicitud!: number;
    public nombre_documento!: string | null;
    public documento_archivo!: Buffer | null;
    public estado_aprobacion!: string;
}

// ===========================================
// DEFINICIÓN DEL MODELO
// ===========================================

ExamenMedico.init({
    id_examen_medico: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    id_postulacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
    nombre_documento: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    documento_archivo: {
        type: DataTypes.BLOB,
        allowNull: true
    },
    estado_aprobacion: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'pendiente',
        validate: {
            isIn: {
                args: [['pendiente', 'aprobado', 'rechazado']],
                msg: 'Estado debe ser pendiente, aprobado o rechazado'
            }
        }
    }
}, {
    sequelize,
    tableName: 'examen_medico',
    timestamps: false,
    underscored: true,
    indexes: [
        { fields: ['id_solicitud'] },
        { fields: ['id_postulacion'] }
    ]
});

export default ExamenMedico;
