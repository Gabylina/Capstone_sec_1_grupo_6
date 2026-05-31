-- -----------------------------------------------------------------------------
-- 1. Aprobación de candidatos (PC, LL, HH/HS)
-- Estados: pendiente | en_revision | aprobado | rechazado | observado
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2. Bola de nieve (PC, HH/HS)
-- NULL = pendiente | TRUE = logrado | FALSE = no logrado
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bola_nieve_solicitud (
    id_bola_nieve_solicitud SERIAL PRIMARY KEY,
    id_solicitud INTEGER NOT NULL UNIQUE REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
    contacto_personas_rubro BOOLEAN,
    detalle_contacto_personas_rubro TEXT,
    contacto_empresas_rubro BOOLEAN,
    detalle_contacto_empresas_rubro TEXT,
    busqueda_linkedin BOOLEAN,
    detalle_busqueda_linkedin TEXT,
    apoyo_reclutadores BOOLEAN,
    detalle_apoyo_reclutadores TEXT,
    visitas_terreno BOOLEAN,
    detalle_visitas_terreno TEXT,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bola_nieve_solicitud_id_solicitud
    ON bola_nieve_solicitud(id_solicitud);

-- Migración solo si la tabla existía con columnas NOT NULL (esquema antiguo)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'bola_nieve_solicitud'
          AND column_name = 'contacto_personas_rubro'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE bola_nieve_solicitud
            ALTER COLUMN contacto_personas_rubro DROP NOT NULL,
            ALTER COLUMN contacto_personas_rubro DROP DEFAULT,
            ALTER COLUMN contacto_empresas_rubro DROP NOT NULL,
            ALTER COLUMN contacto_empresas_rubro DROP DEFAULT,
            ALTER COLUMN busqueda_linkedin DROP NOT NULL,
            ALTER COLUMN busqueda_linkedin DROP DEFAULT,
            ALTER COLUMN apoyo_reclutadores DROP NOT NULL,
            ALTER COLUMN apoyo_reclutadores DROP DEFAULT,
            ALTER COLUMN visitas_terreno DROP NOT NULL,
            ALTER COLUMN visitas_terreno DROP DEFAULT;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Notificaciones para consultores
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. Portal cliente (rol 3 + vínculo a empresa)
-- -----------------------------------------------------------------------------
ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS id_cliente INTEGER REFERENCES cliente(id_cliente) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuario_id_cliente ON usuario(id_cliente);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuario_rol_usuario_check'
    ) THEN
        ALTER TABLE usuario DROP CONSTRAINT usuario_rol_usuario_check;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'usuario_rol_usuario_check'
    ) THEN
        ALTER TABLE usuario
            ADD CONSTRAINT usuario_rol_usuario_check CHECK (rol_usuario IN (1, 2, 3));
    END IF;
END $$;

COMMENT ON COLUMN usuario.id_cliente IS 'Empresa cliente asociada cuando rol_usuario = 3';

-- -----------------------------------------------------------------------------
-- 5. Columnas usadas por funcionalidades previas (seguro si ya existen)
-- -----------------------------------------------------------------------------
ALTER TABLE descripcion_cargo
    ADD COLUMN IF NOT EXISTS datos_pdf BYTEA;

ALTER TABLE contratacion
    ADD COLUMN IF NOT EXISTS encuesta_satisfaccion VARCHAR(300);
