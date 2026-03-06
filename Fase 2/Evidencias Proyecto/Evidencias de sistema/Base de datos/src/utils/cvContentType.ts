/**
 * Detecta el tipo MIME de un CV a partir del buffer (magic bytes).
 * Soporta PDF, DOC y DOCX (según lo permitido en multer para CV).
 */
export function detectCVContentType(buffer: Buffer): { mimeType: string; extension: string } {
    if (!buffer || buffer.length < 4) {
        return { mimeType: 'application/octet-stream', extension: 'bin' };
    }
    // PDF: %PDF
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return { mimeType: 'application/pdf', extension: 'pdf' };
    }
    // DOCX (ZIP): PK..
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
        return { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx' };
    }
    // DOC (OLE)
    if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
        return { mimeType: 'application/msword', extension: 'doc' };
    }
    return { mimeType: 'application/octet-stream', extension: 'bin' };
}
