-- ============================================================
-- Seed: Tipo de proceso "San Cristobal Completo" (SC)
-- y etapas nuevas: Entrevista Técnica, Exámenes Médicos
-- Ejecutar una sola vez (ej. desde psql o cliente PostgreSQL)
-- ============================================================

-- 1) Insertar tipo de servicio San Cristobal Completo (código SC, 2 caracteres)
INSERT INTO tiposervicio (codigo_servicio, nombre_servicio)
VALUES ('SC', 'San Cristobal Completo')
ON CONFLICT (codigo_servicio) DO NOTHING;

-- 2) Insertar nuevas etapas para el flujo SC (entre Módulo 3 y Módulo 4)
INSERT INTO etapasolicitud (nombre_etapa)
VALUES ('Módulo Entrevista Técnica')
ON CONFLICT (nombre_etapa) DO NOTHING;

INSERT INTO etapasolicitud (nombre_etapa)
VALUES ('Módulo Exámenes Médicos')
ON CONFLICT (nombre_etapa) DO NOTHING;

-- Nota: Si tu versión de PostgreSQL no soporta ON CONFLICT para unique,
-- usa solo INSERT y comenta las líneas anteriores; si falla por duplicado,
-- los datos ya existían.
