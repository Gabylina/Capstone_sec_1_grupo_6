-- Motivo de salida en experiencias laborales y comentarios del candidato en postulación
-- Ejecutar en la base de datos del proyecto antes de usar los nuevos campos en producción.

ALTER TABLE experiencia
ADD COLUMN IF NOT EXISTS motivo_salida_experiencia VARCHAR(500);

ALTER TABLE postulacion
ADD COLUMN IF NOT EXISTS comentario_candidato TEXT;

COMMENT ON COLUMN experiencia.motivo_salida_experiencia IS 'Motivo de salida informado por el consultor al registrar la experiencia';
COMMENT ON COLUMN postulacion.comentario_candidato IS 'Comentarios del candidato registrados por el consultor en llamada telefónica';
