import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';

// ===========================================
// INTERFACES TYPESCRIPT
// ===========================================

interface ContratacionAttributes {
    id_contratacion: number;
    fecha_ingreso_contratacion?: Date;
    observaciones_contratacion?: string;
    encuesta_satisfaccion?: string;
    id_postulacion: number;
    id_estado_contratacion: number;
}

interface ContratacionCreationAttributes extends Optional<ContratacionAttributes, 'id_contratacion' | 'fecha_ingreso_contratacion' | 'observaciones_contratacion' | 'encuesta_satisfaccion'> { }

// ===========================================
// MODELO SEQUELIZE
// ===========================================

class Contratacion extends Model<ContratacionAttributes, ContratacionCreationAttributes> implements ContratacionAttributes {
    public id_contratacion!: number;
    public fecha_ingreso_contratacion?: Date;
    public observaciones_contratacion?: string;
    public encuesta_satisfaccion?: string;
    public id_postulacion!: number;
    public id_estado_contratacion!: number;

    // ===========================================
    // MÉTODOS PERSONALIZADOS
    // ===========================================

    /**
     * Verifica si la contratación tiene fecha de ingreso confirmada
     */
    public tieneIngresoConfirmado(): boolean {
        return this.fecha_ingreso_contratacion !== null && this.fecha_ingreso_contratacion !== undefined;
    }

    /**
     * Verifica si el cliente ha respondido la encuesta
     */
    public tieneEncuestaRespondida(): boolean {
        return this.encuesta_satisfaccion !== null && this.encuesta_satisfaccion !== undefined && this.encuesta_satisfaccion.trim() !== '';
    }
}

// ===========================================
// DEFINICIÓN DEL MODELO
// ===========================================

Contratacion.init({
    id_contratacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    fecha_ingreso_contratacion: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
            isDate: true
        }
    },
    observaciones_contratacion: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
            len: [0, 500]
        }
    },
    encuesta_satisfaccion: {
        type: DataTypes.STRING(1000),
        allowNull: true,
        validate: {
            len: [0, 1000]
        }
    },
    id_postulacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true, // Una postulación solo puede tener una contratación
        references: {
            model: 'postulacion',
            key: 'id_postulacion'
        }
    },
    id_estado_contratacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'estado_contratacion',
            key: 'id_estado_contratacion'
        }
    }
}, {
    sequelize,
    tableName: 'contratacion',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['id_postulacion']
        },
        {
            fields: ['id_estado_contratacion']
        }
    ]
});

export default Contratacion;

