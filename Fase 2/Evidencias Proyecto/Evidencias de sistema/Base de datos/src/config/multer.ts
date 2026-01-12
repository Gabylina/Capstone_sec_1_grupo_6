import multer from 'multer';
import path from 'path';

/**
 * Configuración de Multer para manejo de archivos
 */

// Configuración de almacenamiento en memoria (para guardar en BD)
const storage = multer.memoryStorage();

// Filtro de archivos - solo PDF, DOC y DOCX
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];

    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
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

