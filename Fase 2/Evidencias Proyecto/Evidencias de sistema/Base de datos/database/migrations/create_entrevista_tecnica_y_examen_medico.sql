-- ============================================================
-- Migración: Entrevista Técnica y Exámenes Médicos
-- Crea las tablas para persistir datos de Entrevista Técnica
-- y Exámenes Médicos por postulación (candidato en una solicitud).
-- Ejecutar una sola vez (ej. desde psql o cliente PostgreSQL).
-- ============================================================

-- ------------------------------------------------------------
-- 1) Tabla: entrevista_tecnica
-- Datos que se guardan en el módulo Entrevista Técnica por candidato/postulación.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entrevista_tecnica (
    id_entrevista_tecnica SERIAL PRIMARY KEY,
    id_postulacion INTEGER NOT NULL REFERENCES postulacion(id_postulacion) ON DELETE CASCADE,
    id_solicitud INTEGER NOT NULL REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
    fecha_hora_entrevista TIMESTAMP,
    estado_entrevista VARCHAR(50) NOT NULL DEFAULT 'programada'
        CHECK (estado_entrevista IN ('programada', 'realizada', 'cancelada')),
    resultado VARCHAR(50)
        CHECK (resultado IS NULL OR resultado IN ('avanza', 'no_avanza')),
    detalle TEXT,
    UNIQUE (id_postulacion)
);
-- ------------------------------------------------------------
-- 2) Tabla: examen_medico
-- Múltiples exámenes por candidato/postulación (nombre, documento PDF/imagen, estado).
-- Cada fila = un examen; se guarda con el botón "Guardar" por examen.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS examen_medico (
    id_examen_medico SERIAL PRIMARY KEY,
    id_postulacion INTEGER NOT NULL REFERENCES postulacion(id_postulacion) ON DELETE CASCADE,
    id_solicitud INTEGER NOT NULL REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
    nombre_documento VARCHAR(255),
    documento_archivo BYTEA,
    estado_aprobacion VARCHAR(50) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_aprobacion IN ('pendiente', 'aprobado', 'rechazado'))
);

CREATE INDEX IF NOT EXISTS idx_entrevista_tecnica_id_solicitud ON entrevista_tecnica(id_solicitud);
CREATE INDEX IF NOT EXISTS idx_entrevista_tecnica_id_postulacion ON entrevista_tecnica(id_postulacion);
CREATE INDEX IF NOT EXISTS idx_examen_medico_id_solicitud ON examen_medico(id_solicitud);
CREATE INDEX IF NOT EXISTS idx_examen_medico_id_postulacion ON examen_medico(id_postulacion);