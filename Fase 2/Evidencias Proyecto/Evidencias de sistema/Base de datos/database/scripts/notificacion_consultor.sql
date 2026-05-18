-- Notificaciones para consultores (ej. resolución de aprobación de candidatos)
CREATE TABLE IF NOT EXISTS notificacion_consultor (
    id_notificacion SERIAL PRIMARY KEY,
    rut_usuario VARCHAR(20) NOT NULL REFERENCES usuario(rut_usuario),
    id_solicitud INTEGER NOT NULL REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
    id_postulacion INTEGER REFERENCES postulacion(id_postulacion) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL DEFAULT 'aprobacion_candidato',
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    metadata JSONB,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacion_consultor_rut_leida
    ON notificacion_consultor(rut_usuario, leida);

CREATE INDEX IF NOT EXISTS idx_notificacion_consultor_solicitud
    ON notificacion_consultor(id_solicitud);
