import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '@/config/database';

// ===========================================
// INTERFACES TYPESCRIPT
// ===========================================

interface ClienteAttributes {
  id_cliente: number;
  nombre_cliente: string;
  activo_cliente: boolean;
}

interface ClienteCreationAttributes extends Optional<ClienteAttributes, 'id_cliente' | 'activo_cliente'> {}

// ===========================================
// MODELO SEQUELIZE
// ===========================================

class Cliente extends Model<ClienteAttributes, ClienteCreationAttributes> implements ClienteAttributes {
  public id_cliente!: number;
  public nombre_cliente!: string;
  public activo_cliente!: boolean;

  // ===========================================
  // MÉTODOS PERSONALIZADOS
  // ===========================================

  /**
   * Obtiene el nombre del cliente formateado
   */
  public getNombreFormateado(): string {
    return this.nombre_cliente.trim();
  }
}

// ===========================================
// DEFINICIÓN DEL MODELO
// ===========================================

Cliente.init({
  id_cliente: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nombre_cliente: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El nombre del cliente es requerido'
      },
      len: {
        args: [2, 100],
        msg: 'El nombre debe tener entre 2 y 100 caracteres'
      }
    }
  },
  activo_cliente: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  sequelize,
  tableName: 'cliente',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['nombre_cliente']
    }
  ]
});

export default Cliente;
