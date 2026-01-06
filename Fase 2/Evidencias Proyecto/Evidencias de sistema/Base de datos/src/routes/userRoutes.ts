import express from 'express';
import { createUserController, getUsersController, updateUserController, changePasswordController, getStatsController } from '@/controllers/userController';
import { authenticateToken, requireAdmin } from '@/middleware/auth';

const router = express.Router();

// Rutas públicas de lectura (GET)
// Obtener estadísticas de usuarios
router.get("/stats", getStatsController);

// Obtener usuarios paginados con filtros
router.get("/", getUsersController);

// ====================================
// RUTAS PROTEGIDAS (requieren token)
// ====================================

// REGISTRO DE NUEVO USUARIO (solo admins)
router.post('/register', authenticateToken, requireAdmin, createUserController);

// Actualizar usuario
router.put('/users', authenticateToken, updateUserController);

// Cambiar contraseña (cualquier usuario autenticado puede cambiar su propia contraseña)
router.put('/change-password', authenticateToken, changePasswordController);

export default router;