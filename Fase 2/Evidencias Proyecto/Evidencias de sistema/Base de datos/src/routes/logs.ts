import { Router } from 'express';
import { LogCambiosController } from '@/controllers/logCambiosController';

const router = Router();

/**
 * Rutas para consulta de Log de Cambios
 * Base: /api/logs
 * Solo operaciones de lectura
 */

// Obtener logs por tabla
router.get('/tabla/:tabla', LogCambiosController.getByTabla);

// Obtener logs de un registro específico
router.get('/registro/:tabla/:id', LogCambiosController.getByRegistro);

// Obtener historial completo de un registro
router.get('/historial/:tabla/:id', LogCambiosController.getHistorial);

// Obtener logs por usuario
router.get('/usuario/:usuario', LogCambiosController.getByUsuario);

// Obtener logs por acción
router.get('/accion/:accion', LogCambiosController.getByAccion);

// Obtener logs por rango de fechas
router.get('/fechas', LogCambiosController.getByFechas);

// Buscar logs con filtros combinados
router.get('/search', LogCambiosController.search);

// Obtener estadísticas simplificadas
router.get('/stats', LogCambiosController.getStats);

// Obtener estadísticas detalladas
router.get('/estadisticas', LogCambiosController.getEstadisticas);

// Obtener actividad reciente
router.get('/reciente', LogCambiosController.getReciente);

// Obtener todos los logs
router.get('/', LogCambiosController.getAll);

// Obtener un log específico
router.get('/:id', LogCambiosController.getById);

export default router;

