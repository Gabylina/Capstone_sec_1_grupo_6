import { Router } from 'express';
import { SolicitudController } from '@/controllers/solicitudController';
import { SolicitudEvaluacionController } from '@/controllers/solicitudEvaluacionController';
import { BolaNieveSolicitudController } from '@/controllers/bolaNieveSolicitudController';
import { EncuestaPanelController } from '@/controllers/encuestaPanelController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

/**
 * Rutas para gestión de Solicitudes (Process en frontend)
 * Base: /api/solicitudes
 */

// Rutas públicas (sin autenticación)
// Obtener solicitudes paginadas con filtros
router.get('/', SolicitudController.getAll);

// Obtener estadísticas con los mismos filtros (para contadores en vista admin)
router.get('/stats', SolicitudController.getStats);

// Obtener todas las solicitudes (sin paginación)
router.get('/all', SolicitudController.getAllSolicitudes);

// Obtener etapas disponibles
router.get('/etapas/disponibles', SolicitudController.getEtapas);

// Obtener estados de solicitud disponibles
router.get('/estados/disponibles', SolicitudController.getEstadosSolicitud);

// Obtener solicitudes por consultor
router.get('/consultor/:rutUsuario', SolicitudController.getByConsultor);

// Reportes (públicos - solo lectura)
router.get('/reportes/carga-operativa', SolicitudController.getActiveProcessesByConsultant);
router.get('/reportes/distribucion-tipo-servicio', SolicitudController.getProcessesByServiceType);
router.get('/reportes/fuentes-candidatos', SolicitudController.getCandidateSourceData);
router.get('/reportes/estadisticas', SolicitudController.getProcessStats);
router.get('/reportes/distribucion-estados', SolicitudController.getProcessStatusDistribution);
router.get('/reportes/tiempo-promedio-servicio', (SolicitudController as any).getAverageProcessTimeByService);
router.get('/reportes/overview', (SolicitudController as any).getProcessOverview);
router.get('/reportes/procesos-cerrados-exitosos', (SolicitudController as any).getClosedSuccessfulProcesses);
router.get('/reportes/rendimiento-consultor', (SolicitudController as any).getConsultantPerformance);
router.get('/reportes/cumplimiento-consultor', (SolicitudController as any).getConsultantCompletionStats);
router.get('/reportes/retrasos-consultor', (SolicitudController as any).getConsultantOverdueHitos);
router.get('/reportes/summary-cards', (SolicitudController as any).getSummaryCards);
router.get('/reportes/reporte-cliente/:clienteId', (SolicitudController as any).getReporteCliente);

// Obtener una solicitud específica
router.get('/:id(\\d+)', SolicitudController.getById);

// Rutas protegidas (requieren autenticación)
// Todas las operaciones de escritura requieren estar autenticado
router.use(authenticateToken); // ← Aplica autenticación a todas las rutas siguientes

// Crear nueva solicitud
router.post('/', SolicitudController.create);

// Crear solicitud de evaluación con candidatos (transacción atómica)
router.post('/con-candidatos', SolicitudEvaluacionController.crearConCandidatos);

// Actualizar solicitud de evaluación con candidatos nuevos (transacción atómica)
router.put('/con-candidatos/:id', SolicitudEvaluacionController.actualizarConCandidatos);

// Actualizar estado de solicitud
router.put('/:id/estado', SolicitudController.updateEstado);

// Cambiar etapa de solicitud
router.put('/:id/etapa', SolicitudController.cambiarEtapa);

// Avanzar al módulo 2
router.put('/:id/avanzar-modulo2', SolicitudController.avanzarAModulo2);

// Avanzar al módulo 3
router.put('/:id/avanzar-modulo3', SolicitudController.avanzarAModulo3);

// Panel de encuesta de satisfacción (según tipo de servicio)
router.get('/:id(\\d+)/encuesta-panel', EncuestaPanelController.getPanel);

// Bola de Nieve (registro paralelo a publicación, obligatorio PC/HH/HS para pasar a M3)
router.get('/:id(\\d+)/bola-nieve', BolaNieveSolicitudController.getBySolicitud);
router.put('/:id(\\d+)/bola-nieve', BolaNieveSolicitudController.upsert);

// Avanzar al módulo 4
router.put('/:id/avanzar-modulo4', SolicitudController.avanzarAModulo4);

// Avanzar al módulo 5
router.put('/:id/avanzar-modulo5', SolicitudController.avanzarAModulo5);

// Actualizar solicitud
router.put('/:id', SolicitudController.update);

// Eliminar solicitud
router.delete('/:id', SolicitudController.delete);

export default router;
