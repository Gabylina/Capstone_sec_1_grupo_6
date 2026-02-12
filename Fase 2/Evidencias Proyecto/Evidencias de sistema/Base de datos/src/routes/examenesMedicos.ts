import { Router } from 'express';
import { ExamenMedicoController } from '@/controllers/examenMedicoController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

/**
 * Rutas para Exámenes Médicos (módulo SC)
 * Base: /api/examenes-medicos
 */

router.get('/solicitud/:idSolicitud', ExamenMedicoController.getBySolicitud);
router.get('/postulacion/:idPostulacion', ExamenMedicoController.getByPostulacion);
router.get('/:id', ExamenMedicoController.getById);

router.use(authenticateToken);
router.post('/', ExamenMedicoController.create);
router.put('/:id', ExamenMedicoController.update);
router.delete('/:id', ExamenMedicoController.delete);

export default router;
