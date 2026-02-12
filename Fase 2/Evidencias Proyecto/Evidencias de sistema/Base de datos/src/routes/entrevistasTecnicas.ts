import { Router } from 'express';
import { EntrevistaTecnicaController } from '@/controllers/entrevistaTecnicaController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

/**
 * Rutas para Entrevistas Técnicas (módulo SC)
 * Base: /api/entrevistas-tecnicas
 */

router.get('/solicitud/:idSolicitud', EntrevistaTecnicaController.getBySolicitud);
router.get('/postulacion/:idPostulacion', EntrevistaTecnicaController.getByPostulacion);

router.use(authenticateToken);
router.post('/', EntrevistaTecnicaController.upsert);
router.put('/:id', EntrevistaTecnicaController.update);

export default router;
