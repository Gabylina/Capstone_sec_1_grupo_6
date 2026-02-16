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

CREATE TABLE IF NOT EXISTS examen_medico (
    id_examen_medico SERIAL PRIMARY KEY,
    id_postulacion INTEGER NOT NULL REFERENCES postulacion(id_postulacion) ON DELETE CASCADE,
    id_solicitud INTEGER NOT NULL REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
    nombre_documento VARCHAR(255),
    documento_archivo BYTEA,
    estado_aprobacion VARCHAR(50) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_aprobacion IN ('pendiente', 'aprobado', 'rechazado'))
);

ALTER TABLE examen_medico
ADD COLUMN IF NOT EXISTS detalle TEXT;

-- Tipo de servicio San Cristobal Completo (SC)
INSERT INTO tiposervicio (codigo_servicio, nombre_servicio)
VALUES ('SC', 'San Cristobal Completo')
ON CONFLICT (codigo_servicio) DO NOTHING;

-- Etapas para el flujo SC/CA: Entrevista Técnica, Exámenes Médicos
INSERT INTO etapasolicitud (nombre_etapa)
VALUES ('Módulo Entrevista Técnica')
ON CONFLICT (nombre_etapa) DO NOTHING;

INSERT INTO etapasolicitud (nombre_etapa)
VALUES ('Módulo Exámenes Médicos')
ON CONFLICT (nombre_etapa) DO NOTHING;

-- Tipo de servicio San Cristóbal Acotado (CA)
INSERT INTO tiposervicio (codigo_servicio, nombre_servicio)
VALUES ('CA', 'San Cristóbal Acotado')
ON CONFLICT (codigo_servicio) DO NOTHING;