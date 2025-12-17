import { Router } from 'express';
import { CandidatoController } from '@/controllers/candidatoController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

/**
 * Rutas para gestión de Candidatos
 * Base: /api/candidatos
 */

// Rutas públicas de lectura (GET)
// Historial de candidatos con paginación y filtros
router.get('/historial', CandidatoController.getHistorial);

// Buscar candidato por email
router.get('/email/:email', CandidatoController.getByEmail);

// Obtener todos los candidatos
router.get('/', CandidatoController.getAll);

// Obtener un candidato específico
router.get('/:id', CandidatoController.getById);

// Obtener CV de un candidato
router.get('/:id/cv', CandidatoController.getCV);

// ====================================
// RUTAS PROTEGIDAS (requieren token)
// ====================================
router.use(authenticateToken);

// Crear nuevo candidato
router.post('/', CandidatoController.create);

// Actualizar candidato
router.put('/:id', CandidatoController.update);

// Eliminar candidato
router.delete('/:id', CandidatoController.delete);

// ==================================================
// EXPERIENCIAS LABORALES (todas protegidas)
// ==================================================

// Agregar experiencias a un candidato
router.post('/:id/experiencias', CandidatoController.addExperiencias);

// Actualizar una experiencia
router.put('/:id/experiencias/:idExp', CandidatoController.updateExperiencia);

// Eliminar una experiencia
router.delete('/:id/experiencias/:idExp', CandidatoController.deleteExperiencia);

// ==================================================
// EDUCACIÓN Y PROFESIÓN (todas protegidas)
// ==================================================

// Agregar educación a un candidato
router.post('/:id/educacion', CandidatoController.addEducacion);

// Agregar profesión a un candidato
router.post('/:id/profesion', CandidatoController.addProfesion);

// Actualizar estado del candidato
router.put('/:id/status', CandidatoController.updateStatus);

export default router;

