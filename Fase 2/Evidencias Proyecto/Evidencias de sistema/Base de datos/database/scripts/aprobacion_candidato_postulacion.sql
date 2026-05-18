-- Control de aprobación de candidatos antes de presentación (LL, PC, HH/HS)
-- Estados: pendiente | en_revision | aprobado | rechazado | observado
CREATE TABLE IF NOT EXISTS aprobacion_candidato_postulacion (
    id_aprobacion_candidato SERIAL PRIMARY KEY,
    id_postulacion INTEGER NOT NULL UNIQUE REFERENCES postulacion(id_postulacion) ON DELETE CASCADE,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    motivo TEXT,
    rut_usuario_envio VARCHAR(20) REFERENCES usuario(rut_usuario),
    fecha_envio_revision TIMESTAMP WITH TIME ZONE,
    rut_usuario_aprobador VARCHAR(20) REFERENCES usuario(rut_usuario),
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_aprobacion_estado CHECK (
        estado IN ('pendiente', 'en_revision', 'aprobado', 'rechazado', 'observado')
    )
);

CREATE INDEX IF NOT EXISTS idx_aprobacion_candidato_postulacion_estado
    ON aprobacion_candidato_postulacion(estado);
