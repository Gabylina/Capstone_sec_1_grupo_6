-- Migración: permitir NULL en ítems (pendiente vs logrado/no logrado)
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
