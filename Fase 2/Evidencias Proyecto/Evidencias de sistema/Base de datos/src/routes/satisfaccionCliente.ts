import { Router } from 'express';
import { SatisfaccionClienteController } from '@/controllers/satisfaccionClienteController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';

const router = Router();

router.use(authenticateToken, requireAdmin);

router.get('/dashboard', SatisfaccionClienteController.getDashboard);

export default router;
