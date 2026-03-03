import { Router } from 'express';
import { DescripcionCargoController } from '@/controllers/descripcionCargoController';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// Rutas públicas de lectura (GET)
/**
 * @route   GET /api/descripciones-cargo/form-data
 * @desc    Obtener datos para el formulario (clientes, contactos, tipos de servicio, cargos, comunas, consultores)
 * @access  Public
 */
router.get('/form-data', DescripcionCargoController.getFormData);

/**
 * @route   GET /api/descripciones-cargo
 * @desc    Obtener todas las descripciones de cargo
 * @access  Public
 */
router.get('/', DescripcionCargoController.getAll);

/**
 * @route   GET /api/descripciones-cargo/:id/excel
 * @desc    Obtener datos de Excel guardados de una descripción
 * @access  Public
 */
router.get('/:id/excel', DescripcionCargoController.getDatosExcel);

/**
 * @route   GET /api/descripciones-cargo/:id/pdf
 * @desc    Obtener PDF de descripción de cargo (solo lectura/visualización)
 * @access  Public
 */
router.get('/:id/pdf', DescripcionCargoController.getPdf);

/**
 * @route   GET /api/descripciones-cargo/:id
 * @desc    Obtener una descripción de cargo por ID
 * @access  Public
 */
router.get('/:id', DescripcionCargoController.getById);

// ====================================
// RUTAS PROTEGIDAS (requieren token)
// ====================================
router.use(authenticateToken);

/**
 * @route   POST /api/descripciones-cargo
 * @desc    Crear nueva descripción de cargo
 * @access  Private (Admin)
 */
router.post('/', DescripcionCargoController.create);

/**
 * @route   POST /api/descripciones-cargo/:id/excel
 * @desc    Agregar datos de Excel procesados (JSON) a una descripción de cargo
 * @access  Private
 * @note    El Excel se procesa en el frontend con xlsx.js y se envía el JSON resultante
 */
router.post('/:id/excel', DescripcionCargoController.agregarDatosExcel);

/**
 * @route   POST /api/descripciones-cargo/:id/pdf
 * @desc    Subir o actualizar PDF asociado a una descripción de cargo
 * @access  Private
 */
import { uploadCV } from '@/config/multer';
router.post('/:id/pdf', uploadCV.single('pdf_file'), DescripcionCargoController.uploadPdf);

/**
 * @route   PUT /api/descripciones-cargo/:id
 * @desc    Actualizar descripción de cargo
 * @access  Private (Admin)
 */
router.put('/:id', DescripcionCargoController.update);

/**
 * @route   DELETE /api/descripciones-cargo/:id
 * @desc    Eliminar descripción de cargo
 * @access  Private (Admin)
 */
router.delete('/:id', DescripcionCargoController.delete);

export default router;

