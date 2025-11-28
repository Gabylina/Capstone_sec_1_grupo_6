import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { getCurrentUserContext } from '@/utils/userContext';

dotenv.config();

const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_NAME = 'llconsulting_db_ORM',
  DB_USER = 'postgres',
  DB_PASSWORD = '',
  NODE_ENV = 'development'
} = process.env;

// Configuración de la base de datos
const sequelize = new Sequelize({
  database: DB_NAME,
  username: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: parseInt(DB_PORT),
  dialect: 'postgres',
  logging: NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10, // Reducido de 20 a 10 para evitar exceder límites
    min: 1,  // Reducido de 2 a 1 para conservar conexiones
    acquire: 30000,
    idle: 5000,  // Reducido de 10000 a 5000 para liberar conexiones más rápido
    evict: 1000
  },
  define: {
    timestamps: false,
    underscored: true
  },
  dialectOptions: DB_HOST !== 'localhost' && DB_HOST !== '127.0.0.1' && DB_HOST !== 'postgres' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

// ===========================================
// HOOK GLOBAL PARA CONFIGURAR USUARIO EN CADA QUERY
// ===========================================

/**
 * Hook que se ejecuta antes de cada query para configurar el usuario responsable
 * Lee el contexto del usuario establecido por el middleware captureUserContext
 * IMPORTANTE: No ejecutar queries dentro del hook para evitar conexiones adicionales
 */
sequelize.addHook('beforeQuery', async (options: any) => {
  const currentUser = getCurrentUserContext();
  
  // Solo configurar usuario si hay contexto y no es una query de configuración interna
  if (currentUser && !options.skipUserContext) {
    try {
      // Escapar el RUT para prevenir SQL injection
      const rutEscapado = currentUser.replace(/'/g, "''");
      
      if (options.transaction) {
        // Configurar variable de sesión LOCAL para esta transacción
        // Usar la misma conexión de la transacción sin crear una nueva
        await sequelize.query(
          `SET LOCAL app.current_user = '${rutEscapado}'`,
          { 
            transaction: options.transaction,
            skipUserContext: true // Evitar recursión
          } as any
        );
      } else {
        // Si no hay transacción, usar SET normal (dura toda la conexión)
        // Usar la misma conexión del pool sin crear una nueva
        await sequelize.query(
          `SET app.current_user = '${rutEscapado}'`,
          { 
            skipUserContext: true // Evitar recursión
          } as any
        );
      }
    } catch (error) {
      // No interrumpir la query si falla la configuración del usuario
      // Solo loguear en desarrollo para no saturar logs
      if (NODE_ENV === 'development') {
        console.error('⚠️ Error configurando usuario en query:', error);
      }
    }
  }
});

// Función para probar la conexión
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
  } catch (error) {
    console.error('❌ Error al conectar con PostgreSQL:', error);
    throw error;
  }
};

// Función para sincronizar modelos
export const syncDatabase = async (): Promise<void> => {
  try {
    // Sincronizar en todos los entornos para asegurar que las tablas existan
    // Solo crear tablas si no existen (MANTENER DATOS)
    await sequelize.sync({ alter: false });
    console.log('✅ Base de datos sincronizada (tablas creadas/verificadas)');
  } catch (error) {
    console.error('❌ Error al sincronizar la base de datos:', error);
    // No lanzar error para permitir que el servidor inicie aunque falle la sincronización
    // Las tablas pueden existir ya o necesitar migraciones manuales
  }
};

export default sequelize;
