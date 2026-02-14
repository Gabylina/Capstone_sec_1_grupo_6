-- ============================================================
-- Migración: Agregar columna detalle a examen_medico
-- Cada documento de examen médico puede tener un detalle/descripción.
-- Ejecutar una sola vez (ej. desde psql o cliente PostgreSQL).
-- ============================================================

ALTER TABLE examen_medico
ADD COLUMN IF NOT EXISTS detalle TEXT;

COMMENT ON COLUMN examen_medico.detalle IS 'Detalle o descripción del documento de examen médico';
