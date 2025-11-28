import { Router } from 'express';
import { PortalController } from '@/controllers/portalController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// Rutas públicas de lectura (GET)
// Obtener todos los portales
router.get('/', PortalController.getAll);

// Obtener un portal por ID
router.get('/:id', PortalController.getById);

// ====================================
// RUTAS PROTEGIDAS (requieren token)
// ====================================
router.use(authenticateToken);

// Crear un nuevo portal
router.post('/', PortalController.create);

// Actualizar un portal
router.put('/:id', PortalController.update);

// Eliminar un portal
router.delete('/:id', PortalController.delete);

export default router;

