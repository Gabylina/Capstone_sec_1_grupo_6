import multer from 'multer';
import path from 'path';

/**
 * Configuración de Multer para manejo de archivos
 */

// Configuración de almacenamiento en memoria (para guardar en BD)
const storage = multer.memoryStorage();

const isAllowedPdf = (mimetype: string, fileExtension: string) =>
    fileExtension === '.pdf' &&
    (
        mimetype === 'application/pdf' ||
        mimetype === 'application/x-pdf' ||
        mimetype === 'application/octet-stream' ||
        mimetype === '' ||
        !mimetype
    );

const isAllowedDoc = (mimetype: string, fileExtension: string) =>
    (fileExtension === '.doc' && mimetype === 'application/msword') ||
    (fileExtension === '.docx' &&
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

// Filtro de archivos - PDF, DOC y DOCX
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (isAllowedPdf(file.mimetype, fileExtension) || isAllowedDoc(file.mimetype, fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF, DOC o DOCX'));
    }
};

// Configuración de Multer para CV
export const uploadCV = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB máximo
    }
});

// Manejo de errores de Multer
export const handleMulterError = (error: any) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return 'El archivo excede el tamaño máximo permitido (50MB)';
            case 'LIMIT_UNEXPECTED_FILE':
                return 'Campo de archivo inesperado';
            default:
                return `Error al subir archivo: ${error.message}`;
        }
    }
    return error.message || 'Error al procesar el archivo';
};

