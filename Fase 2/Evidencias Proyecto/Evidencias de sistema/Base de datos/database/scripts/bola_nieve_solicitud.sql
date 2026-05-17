-- Registro "Bola de Nieve" por solicitud (Proceso Completo PC y Headhunting HH/HS)
-- NULL = pendiente de registrar | TRUE = logrado | FALSE = no logrado
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

CREATE INDEX IF NOT EXISTS idx_bola_nieve_solicitud_id_solicitud ON bola_nieve_solicitud(id_solicitud);
