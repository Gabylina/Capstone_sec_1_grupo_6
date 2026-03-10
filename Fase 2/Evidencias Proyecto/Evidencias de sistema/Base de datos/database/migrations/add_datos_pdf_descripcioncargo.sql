-- ============================================================
-- Migración: Agregar columna datos_pdf a descripcioncargo
-- Permite almacenar el PDF de descripción de cargo en la tabla.
-- Ejecutar una sola vez (ej. desde psql o cliente PostgreSQL).
-- ============================================================

ALTER TABLE descripcioncargo ADD COLUMN IF NOT EXISTS datos_pdf BYTEA;

COMMENT ON COLUMN descripcioncargo.datos_pdf IS 'Archivo PDF asociado a la descripción de cargo';

