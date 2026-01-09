import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { validateRut, validateAge } from '@/utils/validators';

// ===========================================
// INTERFACES TYPESCRIPT
// ===========================================

interface CandidatoAttributes {
    id_candidato: number;
    rut_candidato?: string;
    nombre_candidato: string;
    primer_apellido_candidato: string;
    segundo_apellido_candidato?: string;
    telefono_candidato?: string;
    email_candidato?: string;
    edad_candidato?: number;
    fecha_nacimiento_candidato?: Date;
    software_herramientas?: string;
    nivel_ingles?: string;
    discapacidad: boolean;
    licencia: boolean;
    id_comuna?: number;
    id_nacionalidad?: number;
    id_rubro?: number;
}

interface CandidatoCreationAttributes extends Optional<CandidatoAttributes, 'id_candidato' | 'rut_candidato' | 'segundo_apellido_candidato' | 'telefono_candidato' | 'email_candidato' | 'edad_candidato' | 'fecha_nacimiento_candidato' | 'software_herramientas' | 'nivel_ingles' | 'id_comuna' | 'id_nacionalidad' | 'id_rubro'> { }

// ===========================================
// MODELO SEQUELIZE
// ===========================================

class Candidato extends Model<CandidatoAttributes, CandidatoCreationAttributes> implements CandidatoAttributes {
    public id_candidato!: number;
    public rut_candidato?: string;
    public nombre_candidato!: string;
    public primer_apellido_candidato!: string;
    public segundo_apellido_candidato?: string;
    public telefono_candidato?: string;
    public email_candidato?: string;
    public edad_candidato?: number;
    public fecha_nacimiento_candidato?: Date;
    public software_herramientas?: string;
    public nivel_ingles?: string;
    public discapacidad!: boolean;
    public licencia!: boolean;
    public id_comuna?: number;
    public id_nacionalidad?: number;
    public id_rubro?: number;

    // ===========================================
    // MÉTODOS PERSONALIZADOS
    // ===========================================

    /**
     * Obtiene el nombre completo del candidato
     */
    public getNombreCompleto(): string {
        const partes = [
            this.nombre_candidato,
            this.primer_apellido_candidato,
            this.segundo_apellido_candidato
        ].filter(Boolean);
        return partes.join(' ').trim();
    }

    /**
     * Calcula la edad basada en la fecha de nacimiento
     */
    public calcularEdad(): number | null {
        if (!this.fecha_nacimiento_candidato) return null;

        const hoy = new Date();
        const nacimiento = new Date(this.fecha_nacimiento_candidato);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();

        const mesActual = hoy.getMonth();
        const mesNacimiento = nacimiento.getMonth();

        if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }

        return edad;
    }

    /**
     * Verifica si el candidato tiene discapacidad
     */
    public tieneDiscapacidad(): boolean {
        return this.discapacidad;
    }

    /**
     * Obtiene el nivel de inglés formateado
     */
    public getNivelIngles(): string {
        return this.nivel_ingles || 'No especificado';
    }
}

// ===========================================
// DEFINICIÓN DEL MODELO
// ===========================================

Candidato.init({
    id_candidato: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    rut_candidato: {
        type: DataTypes.STRING(12),
        allowNull: true,
        unique: {
            name: 'rut_candidato_unique',
            msg: 'Este RUT ya está registrado'
        },
        validate: {
            len: [8, 12],
            isValidRut(value: string) {
                if (value && !validateRut(value)) {
                    throw new Error('RUT inválido');
                }
            }
        }
    },
    nombre_candidato: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100]
        }
    },
    primer_apellido_candidato: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 100]
        }
    },
    segundo_apellido_candidato: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            len: {
                args: [2, 100],
                msg: 'El segundo apellido debe tener entre 2 y 100 caracteres'
            }
        }
    },
    telefono_candidato: {
        type: DataTypes.STRING(12),
        allowNull: true,
        validate: {
            len: {
                args: [8, 12],
                msg: 'El teléfono debe tener entre 8 y 12 caracteres'
            }
        }
    },
    email_candidato: {
        type: DataTypes.STRING(150),
        allowNull: true,
        unique: {
            name: 'email_candidato_unique',
            msg: 'Este email ya está registrado'
        },
        validate: {
            isEmail: {
                msg: 'Debe ser un email válido'
            }
        }
    },
    edad_candidato: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 18,
            max: 85
        }
    },
    fecha_nacimiento_candidato: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
            isDate: true,
            isBefore: new Date().toISOString().split('T')[0],
            isValidAge(value: Date) {
                if (value && !validateAge(value, 18, 85)) {
                    throw new Error('La edad debe estar entre 18 y 85 años');
                }
            }
        }
    },
    software_herramientas: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    nivel_ingles: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    discapacidad: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        validate: {
            isBoolean: true
        }
    },
    licencia: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        validate: {
            isBoolean: true
        }
    },
    id_comuna: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'comuna',
            key: 'id_comuna'
        }
    },
    id_nacionalidad: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'nacionalidad',
            key: 'id_nacionalidad'
        }
    },
    id_rubro: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'rubro',
            key: 'id_rubro'
        }
    }
}, {
    sequelize,
    tableName: 'candidato',
    timestamps: false,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['email_candidato']
        },
        {
            fields: ['id_comuna']
        },
        {
            fields: ['id_nacionalidad']
        },
        {
            fields: ['id_rubro']
        }
    ]
});

export default Candidato;
