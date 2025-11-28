import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import { Logger } from '@/utils/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { connectionManager } from '@/middleware/connectionManager';
import { captureUserContext } from '@/middleware/captureUserContext';
import authRoutes from '@/routes/authRoutes';
import userRoutes from '@/routes/userRoutes';
import { authenticateToken, requireAdmin, requireConsultorOrAdmin } from '@/middleware/auth';

// Importar rutas
// Importar rutas
// import authRoutes from '@/routes/auth';
// import userRoutes from '@/routes/users';
import clienteRoutes from '@/routes/clientes';
import solicitudRoutes from '@/routes/solicitudes';
import postulacionRoutes from '@/routes/postulaciones';
import publicacionRoutes from '@/routes/publicaciones';
import portalRoutes from '@/routes/portales';
import candidatoRoutes from '@/routes/candidatos';
import tipoServicioRoutes from '@/routes/tiposServicio';
import cargoRoutes from '@/routes/cargos';
import descripcionCargoRoutes from '@/routes/descripcionesCargo';
import regionRoutes from '@/routes/regiones';
import comunaRoutes from '@/routes/comunas';
import profesionRoutes from '@/routes/profesiones';
import institucionRoutes from '@/routes/instituciones';
import rubroRoutes from '@/routes/rubros';
import nacionalidadRoutes from '@/routes/nacionalidades';
import estadoClienteRoutes from '@/routes/estadoCliente';
import estadoClienteM5Routes from '@/routes/estadoClienteM5';
import referenciaLaboralRoutes from '@/routes/referenciasLaborales';
import hitoSolicitudRoutes from '@/routes/hitosSolicitud';
import estadoContratacionRoutes from '@/routes/estadosContratacion';
import contratacionRoutes from '@/routes/contrataciones';
import testPsicolaboralRoutes from '@/routes/testsPsicolaborales';
import evaluacionPsicolaboralRoutes from '@/routes/evaluacionesPsicolaborales';
import logRoutes from '@/routes/logs';

const app = express();

// ===========================================
// CONFIGURACIÓN DE PROXY (necesario para cloudflared y rate limiting)
// ===========================================
// Habilitar trust proxy para que Express confíe en los headers X-Forwarded-*
// Esto es necesario cuando se usa detrás de un proxy como cloudflared
app.set('trust proxy', true);

// ===========================================
// MIDDLEWARE DE SEGURIDAD
// ===========================================

// Helmet para headers de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS - Permitir localhost y URLs de localtunnel
const allowedOrigins = [
  config.server.frontendUrl,
  'http://localhost:3000',
  'https://localhost:3000'
];

// Agregar cualquier URL de localtunnel si está configurada
if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('.loca.lt')) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Función para verificar el origen
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir requests sin origen (como Postman o aplicaciones móviles)
    if (!origin) {
      return callback(null, true);
    }
    
    // Permitir localhost
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Permitir cualquier URL de localtunnel
    if (origin.includes('.loca.lt')) {
      return callback(null, true);
    }
    
    // Verificar si el origen está en la lista permitida
    if (allowedOrigins.some(allowed => origin === allowed)) {
      return callback(null, true);
    }
    
    callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// ===========================================
// MIDDLEWARE DE PARSING
// ===========================================

// Compresión
app.use(compression());

// Parse JSON
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// MIDDLEWARE DE LOGGING
// ===========================================

// Morgan para logging de requests
if (config.server.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ===========================================
// MIDDLEWARE DE GESTIÓN DE CONEXIONES
// ===========================================

// Middleware para manejar conexiones de base de datos
app.use(connectionManager);

// ===========================================
// MIDDLEWARE DE CONTEXTO DE USUARIO
// ===========================================

// Capturar el usuario autenticado y establecerlo en el contexto
// Este middleware captura req.user (establecido por autenticación)
// y lo guarda en AsyncLocalStorage para que esté disponible en toda la aplicación
app.use(captureUserContext);

// ===========================================
// RUTAS
// ===========================================

// Ruta de salud
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv
  });
});

// Ruta de información de la API
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API de LL Consulting',
    version: '1.0.0',
    endpoints: {
      clientes: '/api/clientes',
      solicitudes: '/api/solicitudes',
      postulaciones: '/api/postulaciones',
      candidatos: '/api/candidatos',
      tipos_servicio: '/api/tipos-servicio',
      cargos: '/api/cargos',
      descripciones_cargo: '/api/descripciones-cargo',
      auth: '/api/auth (TODO)',
      users: '/api/users (TODO)'
    },
    documentation: {
      clientes: {
        getAll: 'GET /api/clientes',
        getById: 'GET /api/clientes/:id',
        create: 'POST /api/clientes',
        update: 'PUT /api/clientes/:id',
        delete: 'DELETE /api/clientes/:id',
        stats: 'GET /api/clientes/stats'
      },
      solicitudes: {
        getAll: 'GET /api/solicitudes',
        getById: 'GET /api/solicitudes/:id',
        getByConsultor: 'GET /api/solicitudes/consultor/:rutUsuario',
        create: 'POST /api/solicitudes',
        updateEstado: 'PUT /api/solicitudes/:id/estado',
        delete: 'DELETE /api/solicitudes/:id'
      },
      postulaciones: {
        getBySolicitud: 'GET /api/postulaciones/solicitud/:idSolicitud',
        create: 'POST /api/postulaciones',
        updateEstado: 'PUT /api/postulaciones/:id/estado',
        updateValoracion: 'PUT /api/postulaciones/:id/valoracion',
        delete: 'DELETE /api/postulaciones/:id'
      },
      publicaciones: {
        getAll: 'GET /api/publicaciones',
        getById: 'GET /api/publicaciones/:id',
        getPortales: 'GET /api/publicaciones/portales',
        create: 'POST /api/publicaciones',
        update: 'PUT /api/publicaciones/:id',
        delete: 'DELETE /api/publicaciones/:id'
      },
      candidatos: {
        getAll: 'GET /api/candidatos',
        getById: 'GET /api/candidatos/:id',
        getByEmail: 'GET /api/candidatos/email/:email',
        create: 'POST /api/candidatos',
        update: 'PUT /api/candidatos/:id',
        delete: 'DELETE /api/candidatos/:id',
        getExperiencias: 'GET /api/candidatos/:id/experiencias',
        addExperiencias: 'POST /api/candidatos/:id/experiencias',
        updateExperiencia: 'PUT /api/candidatos/:id/experiencias/:idExp',
        deleteExperiencia: 'DELETE /api/candidatos/:id/experiencias/:idExp',
        addEducacion: 'POST /api/candidatos/:id/educacion',
        addProfesion: 'POST /api/candidatos/:id/profesion'
      },
      tipos_servicio: {
        getAll: 'GET /api/tipos-servicio',
        getByCodigo: 'GET /api/tipos-servicio/:codigo',
        create: 'POST /api/tipos-servicio',
        update: 'PUT /api/tipos-servicio/:codigo',
        delete: 'DELETE /api/tipos-servicio/:codigo'
      },
      cargos: {
        getAll: 'GET /api/cargos',
        getById: 'GET /api/cargos/:id',
        create: 'POST /api/cargos',
        findOrCreate: 'POST /api/cargos/find-or-create',
        update: 'PUT /api/cargos/:id',
        delete: 'DELETE /api/cargos/:id'
      },
      descripciones_cargo: {
        getAll: 'GET /api/descripciones-cargo',
        getById: 'GET /api/descripciones-cargo/:id',
        create: 'POST /api/descripciones-cargo',
        update: 'PUT /api/descripciones-cargo/:id',
        agregarDatosExcel: 'POST /api/descripciones-cargo/:id/excel (Excel procesado en frontend)',
        getDatosExcel: 'GET /api/descripciones-cargo/:id/excel',
        delete: 'DELETE /api/descripciones-cargo/:id'
      },
      regiones: {
        getAll: 'GET /api/regiones'
      },
      comunas: {
        getAll: 'GET /api/comunas',
        getByRegion: 'GET /api/comunas/region/:regionId'
      },
      profesiones: {
        getAll: 'GET /api/profesiones'
      },
      instituciones: {
        getAll: 'GET /api/instituciones'
      },
      rubros: {
        getAll: 'GET /api/rubros'
      },
      nacionalidades: {
        getAll: 'GET /api/nacionalidades'
      }
    }
  });
});

// Rutas de la API
app.use('/api/clientes', clienteRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/postulaciones', postulacionRoutes);
app.use('/api/publicaciones', publicacionRoutes);
app.use('/api/portales', portalRoutes);
app.use('/api/candidatos', candidatoRoutes);
app.use('/api/tipos-servicio', tipoServicioRoutes);
app.use('/api/cargos', cargoRoutes);
app.use('/api/descripciones-cargo', descripcionCargoRoutes);
app.use('/api/regiones', regionRoutes);
app.use('/api/comunas', comunaRoutes);
app.use('/api/profesiones', profesionRoutes);
app.use('/api/instituciones', institucionRoutes);
app.use('/api/rubros', rubroRoutes);
app.use('/api/nacionalidades', nacionalidadRoutes);
app.use('/api/estado-cliente', estadoClienteRoutes);
app.use('/api/estado-cliente-m5', estadoClienteM5Routes);
app.use('/api/referencias-laborales', referenciaLaboralRoutes);
app.use('/api/hitos-solicitud', hitoSolicitudRoutes);
app.use('/api/estados-contratacion', estadoContratacionRoutes);
app.use('/api/contrataciones', contratacionRoutes);
app.use('/api/tests-psicolaborales', testPsicolaboralRoutes);
app.use('/api/evaluaciones-psicolaborales', evaluacionPsicolaboralRoutes);
app.use('/api/logs', logRoutes);
// Rutas de la API (se descomentarán cuando se creen)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/clients', clientRoutes);
// app.use('/api/processes', processRoutes);
// app.use('/api/candidates', candidateRoutes);


// Solo admins pueden acceder
//app.use('/api/users', authenticateToken, requireAdmin, userRoutes);

// Consultor o admin pueden acceder
//app.use('/api/clients', authenticateToken, requireConsultorOrAdmin, clientRoutes);


// ===========================================
// MIDDLEWARE DE ERRORES
// ===========================================

// Manejar rutas no encontradas
app.use(notFoundHandler);

// Manejo global de errores
app.use(errorHandler);

// ===========================================
// INICIALIZACIÓN
// ===========================================

// Función para inicializar la aplicación
export const initializeApp = async (): Promise<void> => {
  try {
    Logger.info('Inicializando aplicación LL Consulting...');
    
    // Aquí se pueden agregar inicializaciones adicionales
    // como conexión a base de datos, etc.
    
    Logger.info('✅ Aplicación inicializada correctamente');
  } catch (error) {
    Logger.error('❌ Error al inicializar la aplicación:', error);
    throw error;
  }
};

export default app;
