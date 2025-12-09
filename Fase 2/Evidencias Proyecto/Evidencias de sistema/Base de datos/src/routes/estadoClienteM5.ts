import { Router } from 'express';
import EstadoClienteM5Controller from '@/controllers/estadoClienteM5Controller';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// =============================================
// RUTAS PÚBLICAS (solo lectura)
// =============================================

// Obtener todos los estados del módulo 5
router.get('/', EstadoClienteM5Controller.getAll);

// Obtener estado por ID
router.get('/:id', EstadoClienteM5Controller.getById);

// Obtener historial de cambios de estado para una postulación
router.get('/postulacion/:id_postulacion/historial', EstadoClienteM5Controller.getHistorial);

// Obtener el último estado de una postulación
router.get('/postulacion/:id_postulacion/ultimo', EstadoClienteM5Controller.getUltimoEstado);

// Obtener candidatos que están en el módulo 5
router.get('/proceso/:id_proceso/candidatos', EstadoClienteM5Controller.getCandidatosEnModulo5);

// =============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================
router.use(authenticateToken);

// Cambiar estado de cliente para una postulación (Módulo 5)
router.put('/postulacion/:id_postulacion', EstadoClienteM5Controller.cambiarEstado);

// Avanzar candidato al módulo 5 (desde módulo 4)
router.put('/postulacion/:id_postulacion/avanzar', EstadoClienteM5Controller.avanzarAlModulo5);

// Actualizar información completa del candidato en módulo 5
router.put('/postulacion/:id_postulacion/actualizar', EstadoClienteM5Controller.actualizarCandidatoModulo5);

export default router;
