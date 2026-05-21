import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { validateRut } from '@/utils/validators';
import bcrypt from 'bcryptjs';

// ===========================================
// INTERFACES TYPESCRIPT
// ===========================================

// Atributos que se pueden crear
interface UsuarioAttributes {
    rut_usuario: string;
    nombre_usuario: string;
    apellido_usuario: string;
    email_usuario: string;
    contrasena_usuario: string;
    activo_usuario: boolean;
    rol_usuario: number;
    id_cliente?: number | null;
}

// Atributos opcionales para crear
interface UsuarioCreationAttributes extends Optional<UsuarioAttributes, 'rut_usuario'> { }

// ===========================================
// MODELO SEQUELIZE
// ===========================================

class Usuario extends Model<UsuarioAttributes, UsuarioCreationAttributes> implements UsuarioAttributes {
    // Propiedades del modelo
    public rut_usuario!: string;
    public nombre_usuario!: string;
    public apellido_usuario!: string;
    public email_usuario!: string;
    public contrasena_usuario!: string;
    public activo_usuario!: boolean;
    public rol_usuario!: number;
    public id_cliente?: number | null;


    // ===========================================
    // MÉTODOS PERSONALIZADOS
    // ===========================================

    /**
     * Obtiene el nombre completo del usuario
     */
    public getNombreCompleto(): string {
        return `${this.nombre_usuario} ${this.apellido_usuario}`;
    }

    public getNombre(): string {
        return `${this.nombre_usuario}`;
    }

    public getApellido(): string {
        return `${this.apellido_usuario}`;
    }

    /**
     * Verifica si el usuario está activo
     */
    public isActive(): boolean {
        return this.activo_usuario;
    }

    /**
     * Obtiene el rol como string
     */
    public getRolString(): string {
        const roles = {
            1: 'admin',
            2: 'consultor',
            3: 'cliente',
        };
        return roles[this.rol_usuario as keyof typeof roles] || 'desconocido';
    }
}

// ===========================================
// DEFINICIÓN DEL MODELO
// ===========================================

Usuario.init({
    // Clave primaria
    rut_usuario: {
        type: DataTypes.STRING(12),
        primaryKey: true,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'El RUT es requerido'
            },
            len: {
                args: [8, 12],
                msg: 'El RUT debe tener entre 8 y 12 caracteres'
            },
            isValidRut(value: string) {
                if (!validateRut(value)) {
                    throw new Error('RUT inválido');
                }
            }
        }
    },

    // Nombre del usuario
    nombre_usuario: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'El nombre es requerido'
            },
            len: {
                args: [2, 100],
                msg: 'El nombre debe tener entre 2 y 100 caracteres'
            }
        }
    },

    // Apellido del usuario
    apellido_usuario: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'El apellido es requerido'
            },
            len: {
                args: [2, 100],
                msg: 'El apellido debe tener entre 2 y 100 caracteres'
            }
        }
    },

    // Email del usuario
    email_usuario: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: {
            name: 'email_usuario_unique',
            msg: 'Este email ya está registrado'
        },
        validate: {
            notEmpty: {
                msg: 'El email es requerido'
            },
        }
    },

    // Contraseña del usuario
    contrasena_usuario: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'La contraseña es requerida'
            },
            len: {
                args: [6, 150],
                msg: 'La contraseña debe tener al menos 6 caracteres'
            }
        }
    },

    // Estado del usuario
    activo_usuario: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        validate: {
            isBoolean: {
                msg: 'El estado debe ser verdadero o falso'
            }
        }
    },

    // Rol del usuario
    rol_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isIn: {
                args: [[1, 2, 3]],
                msg: 'El rol debe ser 1 (admin), 2 (consultor) o 3 (cliente)'
            }
        }
    },

    id_cliente: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'cliente',
            key: 'id_cliente',
        },
    },
}, {
    // Configuración del modelo
    sequelize,
    tableName: 'usuario',           // Nombre de la tabla en la BD
    timestamps: false,              // Deshabilitar created_at y updated_at
    underscored: true,              // Usar snake_case para nombres de columnas

    // Índices
    indexes: [
        {
            unique: true,
            fields: ['email_usuario']
        },
        {
            fields: ['activo_usuario']
        },
        {
            fields: ['rol_usuario']
        }
    ],

    // Hooks (funciones que se ejecutan en ciertos momentos)
    // hooks: {
    //     beforeCreate: (usuario: Usuario) => {
    //         // Aquí podrías encriptar la contraseña antes de guardar
    //         console.log(`Creando usuario: ${usuario.nombre_usuario}`);
    //     },
    //     beforeUpdate: (usuario: Usuario) => {
    //         console.log(`Actualizando usuario: ${usuario.nombre_usuario}`);
    //     }
    // }
    hooks: {
        beforeValidate: (usuario: Usuario) => {
            const loginId = (usuario.email_usuario || '').trim();
            if (!loginId) {
                throw new Error('El email es requerido');
            }
            if (usuario.rol_usuario === 3) {
                if (loginId.length < 2) {
                    throw new Error('El usuario debe tener al menos 2 caracteres');
                }
                if (loginId.length > 150) {
                    throw new Error('El usuario no puede superar 150 caracteres');
                }
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(loginId)) {
                throw new Error('Debe ser un email válido');
            }
        },
        beforeCreate: async (usuario: Usuario) => {
            if (usuario.contrasena_usuario) {
            usuario.contrasena_usuario = await bcrypt.hash(usuario.contrasena_usuario, 10);
            console.log(`Creando usuario: ${usuario.nombre_usuario}`);
            }
        },
        beforeUpdate: async (usuario: Usuario) => {
            if (usuario.changed('contrasena_usuario')) {
            usuario.contrasena_usuario = await bcrypt.hash(usuario.contrasena_usuario, 10);
            console.log(`Actualizando usuario: ${usuario.nombre_usuario}`);
            }
        }
    }
});

// ===========================================
// EXPORTAR EL MODELO
// ===========================================

export default Usuario;
