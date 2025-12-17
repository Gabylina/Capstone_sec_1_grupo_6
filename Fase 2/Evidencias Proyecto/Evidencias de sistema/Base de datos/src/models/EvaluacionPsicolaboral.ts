import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';

// ===========================================
// INTERFACES TYPESCRIPT
// ===========================================

interface EvaluacionPsicolaboralAttributes {
    id_evaluacion_psicolaboral: number;
    fecha_evaluacion: Date | null;
    fecha_envio_informe: Date | null;
    estado_evaluacion: string;
    estado_informe: string;
    conclusion_global: string;
    id_postulacion: number;
    es_remota: boolean;
}

interface EvaluacionPsicolaboralCreationAttributes extends Optional<EvaluacionPsicolaboralAttributes, 'id_evaluacion_psicolaboral' | 'fecha_envio_informe' | 'es_remota'> { }

// ===========================================
// MODELO SEQUELIZE
// ===========================================

class EvaluacionPsicolaboral extends Model<EvaluacionPsicolaboralAttributes, EvaluacionPsicolaboralCreationAttributes> implements EvaluacionPsicolaboralAttributes {
    public id_evaluacion_psicolaboral!: number;
    public fecha_evaluacion!: Date | null;
    public fecha_envio_informe!: Date | null;
    public estado_evaluacion!: string;
    public estado_informe!: string;
    public conclusion_global!: string;
    public id_postulacion!: number;
    public es_remota!: boolean;

    // ===========================================
    // MÉTODOS PERSONALIZADOS
    // ===========================================

    /**
     * Verifica si la evaluación está realizada
     */
    public estaRealizada(): boolean {
        return this.estado_evaluacion === 'Realizada';
    }

    /**
     * Verifica si la evaluación está programada
     */
    public estaProgramada(): boolean {
        return this.estado_evaluacion === 'Programada';
    }

    /**
     * Verifica si está sin programar
     */
    public estaSinProgramar(): boolean {
        return this.estado_evaluacion === 'Sin programar';
    }

    /**
     * Verifica si está cancelada
     */
    public estaCancelada(): boolean {
        return this.estado_evaluacion === 'Cancelada';
    }

    /**
     * Verifica si el candidato es recomendable
     */
    public esRecomendable(): boolean {
        return this.estado_informe === 'Recomendable' || this.estado_informe === 'Recomendable con observaciones';
    }

    /**
     * Verifica si el candidato NO es recomendable
     */
    public noEsRecomendable(): boolean {
        return this.estado_informe === 'No recomendable';
    }

    /**
     * Verifica si tiene observaciones
     */
    public tieneObservaciones(): boolean {
        return this.estado_informe === 'Recomendable con observaciones';
    }
}

// ===========================================
// DEFINICIÓN DEL MODELO
// ===========================================

EvaluacionPsicolaboral.init({
    id_evaluacion_psicolaboral: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    fecha_evaluacion: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
            isDate: true
        }
    },
    fecha_envio_informe: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
            isDate: true
        }
    },
    estado_evaluacion: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [3, 100],
            isIn: {
                args: [['Sin programar', 'Programada', 'Realizada', 'Cancelada']],
                msg: 'Estado de evaluación inválido. Valores permitidos: Sin programar, Programada, Realizada, Cancelada'
            }
        }
    },
    estado_informe: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [3, 100],
            isIn: {
                args: [['Pendiente', 'Recomendable', 'No recomendable', 'Recomendable con observaciones']],
                msg: 'Estado de informe inválido. Valores permitidos: Pendiente, Recomendable, No recomendable, Recomendable con observaciones'
            }
        }
    },
    conclusion_global: {
        type: DataTypes.STRING(300),
        allowNull: true,
        validate: {
            len: [0, 300]
        }
    },
    id_postulacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'postulacion',
            key: 'id_postulacion'
        }
    },
    es_remota: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si la evaluación psicolaboral es remota (true) o presencial (false)'
    }
}, {
    sequelize,
    tableName: 'evaluacion_psicolaboral',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            fields: ['id_postulacion']
        },
        {
            fields: ['fecha_evaluacion']
        }
    ]
});

export default EvaluacionPsicolaboral;

