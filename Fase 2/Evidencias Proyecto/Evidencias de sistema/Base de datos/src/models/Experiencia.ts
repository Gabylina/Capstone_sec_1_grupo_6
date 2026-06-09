import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';

// ===========================================
// INTERFACES TYPESCRIPT
// ===========================================

interface ExperienciaAttributes {
    id_experiencia: number;
    empresa: string;
    cargo: string;
    fecha_inicio_experiencia: Date;
    fecha_fin_experiencia?: Date;
    descripcion_funciones_experiencia: string;
    motivo_salida_experiencia?: string;
    id_candidato: number;
}

interface ExperienciaCreationAttributes extends Optional<ExperienciaAttributes, 'id_experiencia' | 'fecha_fin_experiencia' | 'motivo_salida_experiencia'> { }

// ===========================================
// MODELO SEQUELIZE
// ===========================================

class Experiencia extends Model<ExperienciaAttributes, ExperienciaCreationAttributes> implements ExperienciaAttributes {
    public id_experiencia!: number;
    public empresa!: string;
    public cargo!: string;
    public fecha_inicio_experiencia!: Date;
    public fecha_fin_experiencia?: Date;
    public descripcion_funciones_experiencia!: string;
    public motivo_salida_experiencia?: string;
    public id_candidato!: number;
}

// ===========================================
// DEFINICIÓN DEL MODELO
// ===========================================

Experiencia.init({
    id_experiencia: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    empresa: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'El nombre de la empresa es requerido'
            },
            len: {
                args: [2, 100],
                msg: 'El nombre debe tener entre 2 y 100 caracteres'
            }
        }
    },
    cargo: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'El cargo es requerido'
            },
            len: {
                args: [2, 100],
                msg: 'El cargo debe tener entre 2 y 100 caracteres'
            }
        }
    },
    fecha_inicio_experiencia: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: true,
            notNull: {
                msg: 'La fecha de inicio es requerida'
            }
        }
    },
    fecha_fin_experiencia: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        validate: {
            isDate: true
        }
    },
    descripcion_funciones_experiencia: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'La descripción de funciones es requerida'
            },
            len: {
                args: [10, 500],
                msg: 'La descripción debe tener entre 10 y 500 caracteres'
            }
        }
    },
    motivo_salida_experiencia: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
            len: {
                args: [0, 500],
                msg: 'El motivo de salida no puede exceder 500 caracteres'
            }
        }
    },
    id_candidato: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'candidato',
            key: 'id_candidato'
        },
        validate: {
            notNull: {
                msg: 'El candidato es requerido'
            }
        }
    }
}, {
    sequelize,
    tableName: 'experiencia',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            fields: ['id_candidato']
        },
        {
            fields: ['fecha_inicio_experiencia']
        },
        {
            fields: ['empresa']
        }
    ]
});

export default Experiencia;
