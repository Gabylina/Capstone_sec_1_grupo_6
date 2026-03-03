import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';
import { validateDateRange } from '@/utils/validators';

// ===========================================
// INTERFACES TYPESCRIPT
// ===========================================

interface DescripcionCargoAttributes {
    id_descripcioncargo: number;
    descripcion_cargo: string;
    requisitos_y_condiciones?: string;
    num_vacante: number;
    fecha_ingreso: Date;
    datos_excel?: object;
    datos_pdf?: Buffer | null;
    id_cargo: number;
    id_comuna: number;
    id_solicitud: number; // <-- Nueva FK hacia Solicitud
}

interface DescripcionCargoCreationAttributes extends Optional<DescripcionCargoAttributes, 'id_descripcioncargo' | 'datos_excel' | 'datos_pdf' | 'requisitos_y_condiciones'> { }

// ===========================================
// MODELO SEQUELIZE
// ===========================================

class DescripcionCargo extends Model<DescripcionCargoAttributes, DescripcionCargoCreationAttributes> implements DescripcionCargoAttributes {
    public id_descripcioncargo!: number;
    public descripcion_cargo!: string;
    public requisitos_y_condiciones?: string;
    public num_vacante!: number;
    public fecha_ingreso!: Date;
    public datos_excel?: object;
    public datos_pdf?: Buffer | null;
    public id_cargo!: number;
    public id_comuna!: number;
    public id_solicitud!: number;

    // ===========================================
    // MÉTODOS PERSONALIZADOS
    // ===========================================

    public tieneVacantes(): boolean {
        return this.num_vacante > 0;
    }

    public getDescripcionFormateada(): string {
        return this.descripcion_cargo.trim();
    }

    public esFechaFutura(): boolean {
        return this.fecha_ingreso > new Date();
    }

    public tieneDatosExcel(): boolean {
        return this.datos_excel !== null && this.datos_excel !== undefined;
    }

    public getDatosExcel(): object | null {
        return this.datos_excel || null;
    }

    public getHojaExcel(nombreHoja: string): any[] | null {
        if (!this.datos_excel || typeof this.datos_excel !== 'object') return null;
        const datos = this.datos_excel as any;
        return datos[nombreHoja] || null;
    }

    public tieneDatosPdf(): boolean {
        return this.datos_pdf !== null && this.datos_pdf !== undefined;
    }
}

// ===========================================
// DEFINICIÓN DEL MODELO
// ===========================================

DescripcionCargo.init({
    id_descripcioncargo: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    descripcion_cargo: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [10, 500]
        }
    },
    requisitos_y_condiciones: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
            len: {
                args: [10, 500],
                msg: 'Los requisitos deben tener entre 10 y 500 caracteres'
            }
        }
    },
    num_vacante: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 100
        }
    },
    fecha_ingreso: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isDate: true,
            isValidDateRange(value: Date) {
                if (!validateDateRange(value, 14)) {
                    throw new Error('La fecha de ingreso debe ser desde 2 semanas atrás hasta el futuro');
                }
            }
        }
    },
    datos_excel: {
        type: DataTypes.JSON,
        allowNull: true,
        validate: {
            isValidJson(value: any) {
                if (value && typeof value !== 'object') {
                    throw new Error('Los datos Excel deben ser un objeto JSON válido');
                }
            }
        }
    },
    datos_pdf: {
        type: DataTypes.BLOB,
        allowNull: true
    },
    id_cargo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'cargo',
            key: 'id_cargo'
        },
        validate: {
            notNull: {
                msg: 'El cargo es requerido'
            }
        }
    },
    id_comuna: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'comuna',
            key: 'id_comuna'
        },
        validate: {
            notNull: {
                msg: 'La comuna es requerida'
            }
        }
    },
    id_solicitud: { // <-- Nueva FK
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
    }
}, {
    sequelize,
    tableName: 'descripcioncargo',
    timestamps: false,
    underscored: true,
    indexes: [
        { fields: ['id_cargo'] },
        { fields: ['id_comuna'] },
        { fields: ['fecha_ingreso'] },
        { fields: ['id_solicitud'] } // <-- índice para la nueva FK
    ]
});

export default DescripcionCargo;
