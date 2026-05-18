import { Router } from 'express';
import { NotificacionConsultorController } from '@/controllers/notificacionConsultorController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/mis', NotificacionConsultorController.getMisNotificaciones);
router.put('/marcar-todas-leidas', NotificacionConsultorController.marcarTodasLeidas);
router.put('/:id/leida', NotificacionConsultorController.marcarLeida);

export default router;
