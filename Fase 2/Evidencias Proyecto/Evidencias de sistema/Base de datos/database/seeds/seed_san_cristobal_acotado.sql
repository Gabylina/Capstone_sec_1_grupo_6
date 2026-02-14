-- ============================================================
-- Seed: Tipo de proceso "San Cristóbal Acotado" (CA)
-- Igual flujo que San Cristóbal Completo pero SIN Módulo 4:
-- M1 → M2 → M3 → Entrevista Técnica → Exámenes Médicos → M5 (Cierre)
-- Usa las mismas etapas que SC (no se crean etapas nuevas).
-- Ejecutar una sola vez (ej. desde psql o cliente PostgreSQL)
-- ============================================================

-- 1) Insertar tipo de servicio San Cristóbal Acotado (código CA, 2 caracteres)
INSERT INTO tiposervicio (codigo_servicio, nombre_servicio)
VALUES ('CA', 'San Cristóbal Acotado')
ON CONFLICT (codigo_servicio) DO NOTHING;

-- Nota: No se insertan etapas nuevas. CA usa las mismas etapas que SC:
--   Módulo 1: Inicio del proceso
--   Módulo 2: Publicación y Registro de Candidatos
--   Módulo 3: Presentación de Candidatos
--   Módulo Entrevista Técnica
--   Módulo Exámenes Médicos
--   Módulo 5: Seguimiento Posterior a la Evaluación Psicolaboral (Cierre)
-- El flujo CA salta "Módulo 4: Evaluación Psicolaboral" y pasa de
-- Exámenes Médicos directamente a Módulo 5.
