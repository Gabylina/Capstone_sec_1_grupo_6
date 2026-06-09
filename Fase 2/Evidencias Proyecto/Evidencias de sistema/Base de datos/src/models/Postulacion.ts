import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { validateRating } from '@/utils/validators';

// ===========================================
// INTERFACES TYPESCRIPT
// ===========================================

interface PostulacionAttributes {
    id_postulacion: number;
    motivacion?: string;
    expectativa_renta?: number;
    disponibilidad_postulacion?: string;
    comentario_no_presentado?: string;
    comentario_candidato?: string;
    situacion_familiar?: string;
    valoracion?: number;
    fecha_envio?: Date;
    cv_postulacion?: Buffer;
    id_candidato: number;
    id_estado_candidato?: number;
    id_solicitud: number;
    id_portal_postulacion?: number;
}

interface PostulacionCreationAttributes extends Optional<PostulacionAttributes, 'id_postulacion' | 'motivacion' | 'expectativa_renta' | 'disponibilidad_postulacion' | 'comentario_no_presentado' | 'comentario_candidato' | 'situacion_familiar' | 'valoracion' | 'cv_postulacion' |
    'id_portal_postulacion' | 'id_estado_candidato'> { }

// ===========================================
// MODELO SEQUELIZE
// ===========================================

class Postulacion extends Model<PostulacionAttributes, PostulacionCreationAttributes> implements PostulacionAttributes {
    public id_postulacion!: number;
    public motivacion?: string;
    public expectativa_renta?: number;
    public disponibilidad_postulacion?: string;
    public comentario_no_presentado?: string;
    public comentario_candidato?: string;
    public situacion_familiar?: string;
    public valoracion?: number;
    public fecha_envio?: Date;
    public cv_postulacion?: Buffer;
    public id_candidato!: number;
    public id_estado_candidato?: number;
    public id_solicitud!: number;
    public id_portal_postulacion?: number;

    // ===========================================
    // MÉTODOS PERSONALIZADOS
    // ===========================================

    /**
     * Verifica si la postulación tiene CV
     */
    public tieneCV(): boolean {
        return this.cv_postulacion !== null && this.cv_postulacion !== undefined;
    }

    /**
     * Obtiene la expectativa de renta formateada
     */
    public getExpectativaRentaFormateada(): string {
        if (!this.expectativa_renta) return 'No especificada';
        return `$${this.expectativa_renta.toLocaleString('es-CL')}`;
    }

    /**
     * Obtiene la disponibilidad formateada
     */
    public getDisponibilidadFormateada(): string {
        return this.disponibilidad_postulacion || 'No especificada';
    }

    /**
     * Obtiene la valoración como estrellas
     */
    public getValoracionEstrellas(): string {
        if (!this.valoracion) return 'Sin valorar';
        return '★'.repeat(this.valoracion) + '☆'.repeat(5 - this.valoracion);
    }
}

// ===========================================
// DEFINICIÓN DEL MODELO
// ===========================================

Postulacion.init({
    id_postulacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    motivacion: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            len: {
                args: [0, 500],
                msg: 'La motivación no puede exceder 500 caracteres'
            }
        }
    },
    expectativa_renta: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
            min: {
                args: [0],
                msg: 'La expectativa de renta no puede ser negativa'
            }
        }
    },
    disponibilidad_postulacion: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            len: {
                args: [0, 100],
                msg: 'La disponibilidad no puede exceder 100 caracteres'
            }
        }
    },
    comentario_no_presentado: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            len: {
                args: [0, 500],
                msg: 'El comentario no puede exceder 500 caracteres'
            }
        }
    },
    comentario_candidato: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
            len: {
                args: [0, 1000],
                msg: 'El comentario del candidato no puede exceder 1000 caracteres'
            }
        }
    },
    situacion_familiar: {
        type: DataTypes.STRING(300),
        allowNull: true,
        validate: {
            len: {
                args: [0, 300],
                msg: 'La situación familiar no puede exceder 300 caracteres'
            }
        }
    },
    fecha_envio: {
        type: DataTypes.DATE,
        allowNull: true,
        
    },
    valoracion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            isValidRating(value: number) {
                if (value && !validateRating(value)) {
                    throw new Error('La valoración debe ser un número entero del 1 al 5');
                }
            }
        }
    },
    cv_postulacion: {
        type: DataTypes.BLOB,
        allowNull: true
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
    },
    id_estado_candidato: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'estado_candidato',
            key: 'id_estado_candidato'
        },
    },
    id_solicitud: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'solicitud',
            key: 'id_solicitud'
        },
        validate: {
            notNull: {
                msg: 'La solicitud es requerida'
            }
        }
    },
        id_portal_postulacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'portal_postulacion',
            key: 'id_portal_postulacion'
        }
    }
}, {
    sequelize,
    tableName: 'postulacion',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            fields: ['id_candidato']
        },
        {
            fields: ['id_estado_candidato']
        },
        {
            fields: ['id_solicitud']
        },
        {
            fields: ['id_portal_postulacion']
        },
        {
            unique: true,
            fields: ['id_candidato', 'id_solicitud']
        }
    ]
});

export default Postulacion;
