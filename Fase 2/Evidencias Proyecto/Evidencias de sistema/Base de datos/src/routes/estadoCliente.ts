import { Router } from 'express';
import { EstadoClienteController } from '@/controllers/estadoClienteController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// =============================================
// RUTAS PÚBLICAS (solo lectura)
// =============================================

// Obtener todos los estados de cliente
router.get('/', EstadoClienteController.getAll);

// Obtener historial de cambios de estado para una postulación
router.get('/postulacion/:id_postulacion/historial', EstadoClienteController.getHistorial);

// =============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================
router.use(authenticateToken);

// Cambiar estado de cliente para una postulación
router.put('/postulacion/:id_postulacion', EstadoClienteController.cambiarEstado);

export default router;
