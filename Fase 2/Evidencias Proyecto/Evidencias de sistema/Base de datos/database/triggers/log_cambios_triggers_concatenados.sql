-- ===========================================
-- TRIGGER: solicitud
-- ===========================================

CREATE OR REPLACE FUNCTION trigger_log_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle TEXT := '';
    v_cambios TEXT[] := ARRAY[]::TEXT[];
    v_id_registro TEXT;
    v_usuario TEXT;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user', true), ''),
        current_user,
        'system'
    );
    v_id_registro := COALESCE(NEW.id_solicitud::TEXT, OLD.id_solicitud::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        v_detalle := 'Nueva solicitud creada para servicio ' || NEW.codigo_servicio;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.id_etapa_solicitud IS DISTINCT FROM NEW.id_etapa_solicitud THEN
            v_cambios := array_append(v_cambios, 
                'Etapa: ' || OLD.id_etapa_solicitud || '→' || NEW.id_etapa_solicitud);
        END IF;
        
        IF OLD.plazo_maximo_solicitud IS DISTINCT FROM NEW.plazo_maximo_solicitud THEN
            v_cambios := array_append(v_cambios, 
                'Plazo: ' || TO_CHAR(OLD.plazo_maximo_solicitud, 'DD/MM/YY') || '→' || 
                TO_CHAR(NEW.plazo_maximo_solicitud, 'DD/MM/YY'));
        END IF;
        
        IF OLD.rut_usuario IS DISTINCT FROM NEW.rut_usuario THEN
            v_cambios := array_append(v_cambios, 
                'Consultor: ' || OLD.rut_usuario || '→' || NEW.rut_usuario);
        END IF;
        
        IF OLD.codigo_servicio IS DISTINCT FROM NEW.codigo_servicio THEN
            v_cambios := array_append(v_cambios, 
                'Servicio: ' || OLD.codigo_servicio || '→' || NEW.codigo_servicio);
        END IF;
        
        IF OLD.id_contacto IS DISTINCT FROM NEW.id_contacto THEN
            v_cambios := array_append(v_cambios, 
                'Contacto: ' || OLD.id_contacto || '→' || NEW.id_contacto);
        END IF;
        
        IF OLD.fecha_ingreso_solicitud IS DISTINCT FROM NEW.fecha_ingreso_solicitud THEN
            v_cambios := array_append(v_cambios, 
                'Fecha ingreso: ' || TO_CHAR(OLD.fecha_ingreso_solicitud, 'DD/MM/YY') || '→' || 
                TO_CHAR(NEW.fecha_ingreso_solicitud, 'DD/MM/YY'));
        END IF;
        
        IF array_length(v_cambios, 1) > 0 THEN
            v_detalle := array_to_string(v_cambios, ' | ');
        ELSE
            v_detalle := 'Solicitud actualizada';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_detalle := 'Solicitud eliminada';
    END IF;
    
    v_detalle := LEFT(v_detalle, 1000);
    
    INSERT INTO log_cambios (
        tabla_afectada, id_registro, accion, detalle_cambio, usuario_responsable, fecha_cambio
    ) VALUES (
        TG_TABLE_NAME, v_id_registro, TG_OP, v_detalle, v_usuario, NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_solicitud ON solicitud;
CREATE TRIGGER trg_log_solicitud
    AFTER INSERT OR UPDATE OR DELETE ON solicitud
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_solicitud();

-- ===========================================
-- TRIGGER: candidato
-- ===========================================

CREATE OR REPLACE FUNCTION trigger_log_candidato()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle TEXT := '';
    v_cambios TEXT[] := ARRAY[]::TEXT[];
    v_id_registro TEXT;
    v_usuario TEXT;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user', true), ''),
        current_user,
        'system'
    );
    v_id_registro := COALESCE(NEW.id_candidato::TEXT, OLD.id_candidato::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        v_detalle := 'Nuevo candidato: ' || NEW.nombre_candidato || ' ' || NEW.primer_apellido_candidato;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.rut_candidato IS DISTINCT FROM NEW.rut_candidato THEN
            v_cambios := array_append(v_cambios, 
                'RUT: ' || COALESCE(OLD.rut_candidato, 'sin RUT') || '→' || COALESCE(NEW.rut_candidato, 'sin RUT'));
        END IF;
        
        IF OLD.nombre_candidato IS DISTINCT FROM NEW.nombre_candidato THEN
            v_cambios := array_append(v_cambios, 
                'Nombre: ' || OLD.nombre_candidato || '→' || NEW.nombre_candidato);
        END IF;
        
        IF OLD.primer_apellido_candidato IS DISTINCT FROM NEW.primer_apellido_candidato THEN
            v_cambios := array_append(v_cambios, 
                'Primer apellido: ' || OLD.primer_apellido_candidato || '→' || NEW.primer_apellido_candidato);
        END IF;
        
        IF OLD.segundo_apellido_candidato IS DISTINCT FROM NEW.segundo_apellido_candidato THEN
            v_cambios := array_append(v_cambios, 
                'Segundo apellido: ' || OLD.segundo_apellido_candidato || '→' || NEW.segundo_apellido_candidato);
        END IF;
        
        IF OLD.email_candidato IS DISTINCT FROM NEW.email_candidato THEN
            v_cambios := array_append(v_cambios, 
                'Email: ' || OLD.email_candidato || '→' || NEW.email_candidato);
        END IF;
        
        IF OLD.telefono_candidato IS DISTINCT FROM NEW.telefono_candidato THEN
            v_cambios := array_append(v_cambios, 
                'Teléfono: ' || OLD.telefono_candidato || '→' || NEW.telefono_candidato);
        END IF;
        
        IF OLD.fecha_nacimiento_candidato IS DISTINCT FROM NEW.fecha_nacimiento_candidato THEN
            v_cambios := array_append(v_cambios, 
                'Fecha nac: ' || 
                COALESCE(TO_CHAR(OLD.fecha_nacimiento_candidato, 'DD/MM/YY'), 'sin fecha') || '→' ||
                COALESCE(TO_CHAR(NEW.fecha_nacimiento_candidato, 'DD/MM/YY'), 'sin fecha'));
        END IF;
        
        IF OLD.edad_candidato IS DISTINCT FROM NEW.edad_candidato THEN
            v_cambios := array_append(v_cambios, 
                'Edad: ' || COALESCE(OLD.edad_candidato::TEXT, 'sin edad') || '→' || COALESCE(NEW.edad_candidato::TEXT, 'sin edad'));
        END IF;
        
        IF OLD.id_comuna IS DISTINCT FROM NEW.id_comuna THEN
            v_cambios := array_append(v_cambios, 
                'Comuna: ' || COALESCE(OLD.id_comuna::TEXT, 'sin') || '→' || COALESCE(NEW.id_comuna::TEXT, 'sin'));
        END IF;
        
        IF OLD.id_nacionalidad IS DISTINCT FROM NEW.id_nacionalidad THEN
            v_cambios := array_append(v_cambios, 
                'Nacionalidad: ' || COALESCE(OLD.id_nacionalidad::TEXT, 'sin') || '→' || COALESCE(NEW.id_nacionalidad::TEXT, 'sin'));
        END IF;
        
        IF OLD.id_rubro IS DISTINCT FROM NEW.id_rubro THEN
            v_cambios := array_append(v_cambios, 
                'Rubro: ' || COALESCE(OLD.id_rubro::TEXT, 'sin') || '→' || COALESCE(NEW.id_rubro::TEXT, 'sin'));
        END IF;
        
        IF OLD.nivel_ingles IS DISTINCT FROM NEW.nivel_ingles THEN
            v_cambios := array_append(v_cambios, 
                'Inglés: ' || COALESCE(OLD.nivel_ingles, 'sin nivel') || '→' || 
                COALESCE(NEW.nivel_ingles, 'sin nivel'));
        END IF;
        
        IF OLD.discapacidad IS DISTINCT FROM NEW.discapacidad THEN
            v_cambios := array_append(v_cambios, 
                CASE WHEN NEW.discapacidad 
                    THEN 'Discapacidad: SI' 
                    ELSE 'Discapacidad: NO' 
                END);
        END IF;
        
        IF OLD.licencia IS DISTINCT FROM NEW.licencia THEN
            v_cambios := array_append(v_cambios, 
                CASE WHEN NEW.licencia 
                    THEN 'Licencia: SI' 
                    ELSE 'Licencia: NO' 
                END);
        END IF;
        
        IF OLD.software_herramientas IS DISTINCT FROM NEW.software_herramientas THEN
            v_cambios := array_append(v_cambios, 'Software actualizado');
        END IF;
        
        IF array_length(v_cambios, 1) > 0 THEN
            v_detalle := array_to_string(v_cambios, ' | ');
        ELSE
            v_detalle := 'Candidato actualizado';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_detalle := 'Candidato eliminado: ' || OLD.nombre_candidato || ' ' || OLD.primer_apellido_candidato;
    END IF;
    
    v_detalle := LEFT(v_detalle, 1000);
    
    INSERT INTO log_cambios (
        tabla_afectada, id_registro, accion, detalle_cambio, usuario_responsable, fecha_cambio
    ) VALUES (
        TG_TABLE_NAME, v_id_registro, TG_OP, v_detalle, v_usuario, NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_candidato ON candidato;
CREATE TRIGGER trg_log_candidato
    AFTER INSERT OR UPDATE OR DELETE ON candidato
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_candidato();

-- ===========================================
-- TRIGGER: postulacion
-- ===========================================

CREATE OR REPLACE FUNCTION trigger_log_postulacion()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle TEXT := '';
    v_cambios TEXT[] := ARRAY[]::TEXT[];
    v_id_registro TEXT;
    v_usuario TEXT;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user', true), ''),
        current_user,
        'system'
    );
    v_id_registro := COALESCE(NEW.id_postulacion::TEXT, OLD.id_postulacion::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        v_detalle := 'Nueva postulación registrada';
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Solo registrar cambios reales (no NULL a NULL, no mismo valor, no vacío a vacío)
        IF OLD.valoracion IS DISTINCT FROM NEW.valoracion AND 
           NOT (OLD.valoracion IS NULL AND NEW.valoracion IS NULL) THEN
            v_cambios := array_append(v_cambios, 
                'Valoración: ' || COALESCE(OLD.valoracion::TEXT, 'sin') || '→' || 
                COALESCE(NEW.valoracion::TEXT, 'sin'));
        END IF;
        
        IF OLD.expectativa_renta IS DISTINCT FROM NEW.expectativa_renta AND 
           NOT (OLD.expectativa_renta IS NULL AND NEW.expectativa_renta IS NULL) THEN
            v_cambios := array_append(v_cambios, 
                'Expectativa renta: $' || COALESCE(OLD.expectativa_renta::TEXT, 'sin') || '→$' || 
                COALESCE(NEW.expectativa_renta::TEXT, 'sin'));
        END IF;
        
        -- Solo registrar motivación si realmente cambió y no es vacío a vacío
        IF OLD.motivacion IS DISTINCT FROM NEW.motivacion AND 
           NOT (COALESCE(OLD.motivacion, '') = '' AND COALESCE(NEW.motivacion, '') = '') AND
           NOT (OLD.motivacion = NEW.motivacion) THEN
            v_cambios := array_append(v_cambios, 
                'Motivación: ' || COALESCE(LEFT(OLD.motivacion, 50), 'sin') || '→' || 
                COALESCE(LEFT(NEW.motivacion, 50), 'sin'));
        END IF;
        
        -- Solo registrar disponibilidad si realmente cambió y no es vacío a vacío
        IF OLD.disponibilidad_postulacion IS DISTINCT FROM NEW.disponibilidad_postulacion AND 
           NOT (COALESCE(OLD.disponibilidad_postulacion, '') = '' AND COALESCE(NEW.disponibilidad_postulacion, '') = '') AND
           NOT (OLD.disponibilidad_postulacion = NEW.disponibilidad_postulacion) THEN
            v_cambios := array_append(v_cambios, 
                'Disponibilidad: ' || COALESCE(OLD.disponibilidad_postulacion, 'sin') || '→' || 
                COALESCE(NEW.disponibilidad_postulacion, 'sin'));
        END IF;
        
        IF OLD.cv_postulacion IS DISTINCT FROM NEW.cv_postulacion THEN
            v_cambios := array_append(v_cambios, 
                CASE WHEN NEW.cv_postulacion IS NOT NULL 
                    THEN 'CV adjuntado' 
                    ELSE 'CV removido' 
                END);
        END IF;
        
        -- Solo registrar comentario_no_presentado si realmente cambió
        IF OLD.comentario_no_presentado IS DISTINCT FROM NEW.comentario_no_presentado AND 
           NOT (COALESCE(OLD.comentario_no_presentado, '') = '' AND COALESCE(NEW.comentario_no_presentado, '') = '') AND
           NOT (OLD.comentario_no_presentado = NEW.comentario_no_presentado) THEN
            v_cambios := array_append(v_cambios, 
                'Comentario no presentado: ' || COALESCE(LEFT(OLD.comentario_no_presentado, 50), 'sin') || '→' || 
                COALESCE(LEFT(NEW.comentario_no_presentado, 50), 'sin'));
        END IF;
        
        -- Solo registrar situacion_familiar si realmente cambió
        IF OLD.situacion_familiar IS DISTINCT FROM NEW.situacion_familiar AND 
           NOT (COALESCE(OLD.situacion_familiar, '') = '' AND COALESCE(NEW.situacion_familiar, '') = '') AND
           NOT (OLD.situacion_familiar = NEW.situacion_familiar) THEN
            v_cambios := array_append(v_cambios, 
                'Situación familiar: ' || COALESCE(OLD.situacion_familiar, 'sin') || '→' || 
                COALESCE(NEW.situacion_familiar, 'sin'));
        END IF;
        
        IF OLD.id_estado_candidato IS DISTINCT FROM NEW.id_estado_candidato THEN
            v_cambios := array_append(v_cambios, 
                'Estado: ' || COALESCE(OLD.id_estado_candidato::TEXT, 'sin') || '→' || 
                COALESCE(NEW.id_estado_candidato::TEXT, 'sin'));
        END IF;
        
        IF OLD.fecha_envio IS DISTINCT FROM NEW.fecha_envio THEN
            v_cambios := array_append(v_cambios, 
                'Fecha envío: ' || COALESCE(TO_CHAR(NEW.fecha_envio, 'DD/MM/YY'), 'sin fecha'));
        END IF;
        
        IF array_length(v_cambios, 1) > 0 THEN
            v_detalle := array_to_string(v_cambios, ' | ');
        ELSE
            v_detalle := 'Postulación actualizada';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_detalle := 'Postulación eliminada';
    END IF;
    
    v_detalle := LEFT(v_detalle, 1000);
    
    INSERT INTO log_cambios (
        tabla_afectada, id_registro, accion, detalle_cambio, usuario_responsable, fecha_cambio
    ) VALUES (
        TG_TABLE_NAME, v_id_registro, TG_OP, v_detalle, v_usuario, NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_postulacion ON postulacion;
CREATE TRIGGER trg_log_postulacion
    AFTER INSERT OR UPDATE OR DELETE ON postulacion
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_postulacion();

-- ===========================================
-- TRIGGER: cliente
-- ===========================================

CREATE OR REPLACE FUNCTION trigger_log_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle TEXT := '';
    v_cambios TEXT[] := ARRAY[]::TEXT[];
    v_id_registro TEXT;
    v_usuario TEXT;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user', true), ''),
        current_user,
        'system'
    );
    v_id_registro := COALESCE(NEW.id_cliente::TEXT, OLD.id_cliente::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        v_detalle := 'Nuevo cliente: ' || NEW.nombre_cliente;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.nombre_cliente IS DISTINCT FROM NEW.nombre_cliente THEN
            v_cambios := array_append(v_cambios,
                'Nombre: ' || OLD.nombre_cliente || '→' || NEW.nombre_cliente);
        END IF;

        IF OLD.activo_cliente IS DISTINCT FROM NEW.activo_cliente THEN
            v_cambios := array_append(v_cambios,
                CASE WHEN NEW.activo_cliente THEN 'Cliente reactivado' ELSE 'Cliente eliminado (desactivado)' END);
        END IF;

        IF array_length(v_cambios, 1) > 0 THEN
            v_detalle := array_to_string(v_cambios, ' | ');
        ELSE
            v_detalle := 'Cliente actualizado';
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        v_detalle := 'Cliente eliminado: ' || OLD.nombre_cliente;
    END IF;
    
    v_detalle := LEFT(v_detalle, 1000);
    
    INSERT INTO log_cambios (
        tabla_afectada, id_registro, accion, detalle_cambio, usuario_responsable, fecha_cambio
    ) VALUES (
        TG_TABLE_NAME, v_id_registro, TG_OP, v_detalle, v_usuario, NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_cliente ON cliente;
CREATE TRIGGER trg_log_cliente
    AFTER INSERT OR UPDATE OR DELETE ON cliente
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_cliente();

-- ===========================================
-- TRIGGER: hito_solicitud
-- ===========================================

CREATE OR REPLACE FUNCTION trigger_log_hito_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle TEXT := '';
    v_cambios TEXT[] := ARRAY[]::TEXT[];
    v_id_registro TEXT;
    v_usuario TEXT;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user', true), ''),
        current_user,
        'system'
    );
    v_id_registro := COALESCE(NEW.id_hito_solicitud::TEXT, OLD.id_hito_solicitud::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        v_detalle := 'Nuevo hito: ' || NEW.nombre_hito;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.fecha_cumplimiento IS NULL AND NEW.fecha_cumplimiento IS NOT NULL THEN
            v_cambios := array_append(v_cambios, 
                'Hito completado: ' || NEW.nombre_hito);
        END IF;
        
        IF OLD.fecha_limite IS DISTINCT FROM NEW.fecha_limite THEN
            v_cambios := array_append(v_cambios, 
                'Fecha límite: ' || 
                COALESCE(TO_CHAR(OLD.fecha_limite, 'DD/MM/YY'), 'sin') || '→' || 
                COALESCE(TO_CHAR(NEW.fecha_limite, 'DD/MM/YY'), 'sin'));
        END IF;
        
        IF OLD.fecha_base IS DISTINCT FROM NEW.fecha_base THEN
            v_cambios := array_append(v_cambios, 
                'Fecha base: ' || 
                COALESCE(TO_CHAR(OLD.fecha_base, 'DD/MM/YY'), 'sin') || '→' || 
                COALESCE(TO_CHAR(NEW.fecha_base, 'DD/MM/YY'), 'sin'));
        END IF;
        
        IF OLD.duracion_dias IS DISTINCT FROM NEW.duracion_dias THEN
            v_cambios := array_append(v_cambios, 
                'Duración: ' || OLD.duracion_dias || '→' || NEW.duracion_dias || ' días');
        END IF;
        
        IF OLD.avisar_antes_dias IS DISTINCT FROM NEW.avisar_antes_dias THEN
            v_cambios := array_append(v_cambios, 
                'Aviso: ' || OLD.avisar_antes_dias || '→' || NEW.avisar_antes_dias || ' días');
        END IF;
        
        IF OLD.descripcion IS DISTINCT FROM NEW.descripcion THEN
            v_cambios := array_append(v_cambios, 'Descripción actualizada');
        END IF;
        
        IF OLD.nombre_hito IS DISTINCT FROM NEW.nombre_hito THEN
            v_cambios := array_append(v_cambios, 
                'Nombre: ' || OLD.nombre_hito || '→' || NEW.nombre_hito);
        END IF;
        
        IF OLD.tipo_ancla IS DISTINCT FROM NEW.tipo_ancla THEN
            v_cambios := array_append(v_cambios, 
                'Tipo ancla: ' || OLD.tipo_ancla || '→' || NEW.tipo_ancla);
        END IF;
        
        IF array_length(v_cambios, 1) > 0 THEN
            v_detalle := array_to_string(v_cambios, ' | ');
        ELSE
            v_detalle := 'Hito actualizado: ' || NEW.nombre_hito;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_detalle := 'Hito eliminado: ' || OLD.nombre_hito;
    END IF;
    
    v_detalle := LEFT(v_detalle, 1000);
    
    INSERT INTO log_cambios (
        tabla_afectada, id_registro, accion, detalle_cambio, usuario_responsable, fecha_cambio
    ) VALUES (
        TG_TABLE_NAME, v_id_registro, TG_OP, v_detalle, v_usuario, NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_hito_solicitud ON hito_solicitud;
CREATE TRIGGER trg_log_hito_solicitud
    AFTER INSERT OR UPDATE OR DELETE ON hito_solicitud
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_hito_solicitud();

-- ===========================================
-- TRIGGER: estado_cliente_postulacion
-- ===========================================

CREATE OR REPLACE FUNCTION trigger_log_estado_cliente_postulacion()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle TEXT := '';
    v_cambios TEXT[] := ARRAY[]::TEXT[];
    v_id_registro TEXT;
    v_usuario TEXT;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user', true), ''),
        current_user,
        'system'
    );
    v_id_registro := COALESCE(NEW.id_postulacion::TEXT, OLD.id_postulacion::TEXT) || '-' || 
                     COALESCE(NEW.id_estado_cliente::TEXT, OLD.id_estado_cliente::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        v_detalle := 'Estado cliente asignado (M3)';
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.id_estado_cliente IS DISTINCT FROM NEW.id_estado_cliente THEN
            v_cambios := array_append(v_cambios, 
                'Estado: ' || OLD.id_estado_cliente || '→' || NEW.id_estado_cliente);
        END IF;
        
        IF OLD.fecha_feedback_cliente_m3 IS DISTINCT FROM NEW.fecha_feedback_cliente_m3 THEN
            v_cambios := array_append(v_cambios, 
                'Fecha feedback: ' || 
                COALESCE(TO_CHAR(NEW.fecha_feedback_cliente_m3, 'DD/MM/YY'), 'sin fecha'));
        END IF;
        
        IF OLD.comentario_rech_obs_cliente IS DISTINCT FROM NEW.comentario_rech_obs_cliente THEN
            v_cambios := array_append(v_cambios, 'Comentario actualizado');
        END IF;
        
        IF array_length(v_cambios, 1) > 0 THEN
            v_detalle := array_to_string(v_cambios, ' | ') || ' (M3)';
        ELSE
            v_detalle := 'Estado cliente actualizado (M3)';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_detalle := 'Estado cliente eliminado (M3)';
    END IF;
    
    v_detalle := LEFT(v_detalle, 1000);
    
    INSERT INTO log_cambios (
        tabla_afectada, id_registro, accion, detalle_cambio, usuario_responsable, fecha_cambio
    ) VALUES (
        TG_TABLE_NAME, v_id_registro, TG_OP, v_detalle, v_usuario, NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_estado_cliente_postulacion ON estado_cliente_postulacion;
CREATE TRIGGER trg_log_estado_cliente_postulacion
    AFTER INSERT OR UPDATE OR DELETE ON estado_cliente_postulacion
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_estado_cliente_postulacion();

-- ===========================================
-- TRIGGER: estado_cliente_postulacion_m5
-- ===========================================

CREATE OR REPLACE FUNCTION trigger_log_estado_cliente_postulacion_m5()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle TEXT := '';
    v_cambios TEXT[] := ARRAY[]::TEXT[];
    v_id_registro TEXT;
    v_usuario TEXT;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user', true), ''),
        current_user,
        'system'
    );
    v_id_registro := COALESCE(NEW.id_postulacion::TEXT, OLD.id_postulacion::TEXT) || '-' || 
                     COALESCE(NEW.id_estado_cliente_postulacion_m5::TEXT, OLD.id_estado_cliente_postulacion_m5::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        v_detalle := 'Estado cliente asignado (M5)';
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.id_estado_cliente_postulacion_m5 IS DISTINCT FROM NEW.id_estado_cliente_postulacion_m5 THEN
            v_cambios := array_append(v_cambios, 
                'Estado: ' || OLD.id_estado_cliente_postulacion_m5 || '→' || NEW.id_estado_cliente_postulacion_m5);
        END IF;
        
        IF OLD.fecha_feedback_cliente_m5 IS DISTINCT FROM NEW.fecha_feedback_cliente_m5 THEN
            v_cambios := array_append(v_cambios, 
                'Fecha feedback: ' || 
                COALESCE(TO_CHAR(NEW.fecha_feedback_cliente_m5, 'DD/MM/YY'), 'sin fecha'));
        END IF;
        
        IF OLD.comentario_modulo5_cliente IS DISTINCT FROM NEW.comentario_modulo5_cliente THEN
            v_cambios := array_append(v_cambios, 'Comentario actualizado');
        END IF;
        
        IF array_length(v_cambios, 1) > 0 THEN
            v_detalle := array_to_string(v_cambios, ' | ') || ' (M5)';
        ELSE
            v_detalle := 'Estado cliente actualizado (M5)';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_detalle := 'Estado cliente eliminado (M5)';
    END IF;
    
    v_detalle := LEFT(v_detalle, 1000);
    
    INSERT INTO log_cambios (
        tabla_afectada, id_registro, accion, detalle_cambio, usuario_responsable, fecha_cambio
    ) VALUES (
        TG_TABLE_NAME, v_id_registro, TG_OP, v_detalle, v_usuario, NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_estado_cliente_postulacion_m5 ON estado_cliente_postulacion_m5;
CREATE TRIGGER trg_log_estado_cliente_postulacion_m5
    AFTER INSERT OR UPDATE OR DELETE ON estado_cliente_postulacion_m5
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_estado_cliente_postulacion_m5();

-- ===========================================
-- TRIGGER: evaluacion_psicolaboral
-- ===========================================

CREATE OR REPLACE FUNCTION trigger_log_evaluacion_psicolaboral()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle TEXT := '';
    v_cambios TEXT[] := ARRAY[]::TEXT[];
    v_id_registro TEXT;
    v_usuario TEXT;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user', true), ''),
        current_user,
        'system'
    );
    v_id_registro := COALESCE(NEW.id_evaluacion_psicolaboral::TEXT, OLD.id_evaluacion_psicolaboral::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        v_detalle := 'Nueva evaluación psicolaboral: ' || NEW.estado_evaluacion;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.estado_evaluacion IS DISTINCT FROM NEW.estado_evaluacion THEN
            v_cambios := array_append(v_cambios, 
                'Estado evaluación: ' || OLD.estado_evaluacion || '→' || NEW.estado_evaluacion);
        END IF;
        
        IF OLD.estado_informe IS DISTINCT FROM NEW.estado_informe THEN
            v_cambios := array_append(v_cambios, 
                'Estado informe: ' || OLD.estado_informe || '→' || NEW.estado_informe);
        END IF;
        
        IF OLD.fecha_evaluacion IS DISTINCT FROM NEW.fecha_evaluacion THEN
            v_cambios := array_append(v_cambios, 
                'Fecha evaluación: ' || 
                COALESCE(TO_CHAR(OLD.fecha_evaluacion, 'DD/MM/YY'), 'sin') || '→' || 
                COALESCE(TO_CHAR(NEW.fecha_evaluacion, 'DD/MM/YY'), 'sin'));
        END IF;
        
        IF OLD.fecha_envio_informe IS DISTINCT FROM NEW.fecha_envio_informe THEN
            v_cambios := array_append(v_cambios, 
                'Fecha envío: ' || TO_CHAR(NEW.fecha_envio_informe, 'DD/MM/YY'));
        END IF;
        
        IF OLD.conclusion_global IS DISTINCT FROM NEW.conclusion_global THEN
            v_cambios := array_append(v_cambios, 'Conclusión actualizada');
        END IF;
        
        IF array_length(v_cambios, 1) > 0 THEN
            v_detalle := array_to_string(v_cambios, ' | ');
        ELSE
            v_detalle := 'Evaluación psicolaboral actualizada';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_detalle := 'Evaluación psicolaboral eliminada';
    END IF;
    
    v_detalle := LEFT(v_detalle, 1000);
    
    INSERT INTO log_cambios (
        tabla_afectada, id_registro, accion, detalle_cambio, usuario_responsable, fecha_cambio
    ) VALUES (
        TG_TABLE_NAME, v_id_registro, TG_OP, v_detalle, v_usuario, NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_evaluacion_psicolaboral ON evaluacion_psicolaboral;
CREATE TRIGGER trg_log_evaluacion_psicolaboral
    AFTER INSERT OR UPDATE OR DELETE ON evaluacion_psicolaboral
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_evaluacion_psicolaboral();

-- ===========================================
-- TRIGGER: estado_solicitud_hist
-- ===========================================

CREATE OR REPLACE FUNCTION trigger_log_estado_solicitud_hist()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle TEXT := '';
    v_cambios TEXT[] := ARRAY[]::TEXT[];
    v_id_registro TEXT;
    v_usuario TEXT;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user', true), ''),
        current_user,
        'system'
    );
    v_id_registro := COALESCE(NEW.id_solicitud::TEXT, OLD.id_solicitud::TEXT) || '-' || 
                     COALESCE(NEW.id_estado_solicitud::TEXT, OLD.id_estado_solicitud::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        v_detalle := 'Cambio estado registrado: estado ' || NEW.id_estado_solicitud;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.id_estado_solicitud IS DISTINCT FROM NEW.id_estado_solicitud THEN
            v_cambios := array_append(v_cambios, 
                'Estado: ' || OLD.id_estado_solicitud || '→' || NEW.id_estado_solicitud);
        END IF;
        
        IF OLD.fecha_cambio_estado_solicitud IS DISTINCT FROM NEW.fecha_cambio_estado_solicitud THEN
            v_cambios := array_append(v_cambios, 
                'Fecha: ' || TO_CHAR(NEW.fecha_cambio_estado_solicitud, 'DD/MM/YY HH24:MI'));
        END IF;
        
        IF OLD.comentario_estado_solicitud_hist IS DISTINCT FROM NEW.comentario_estado_solicitud_hist THEN
            v_cambios := array_append(v_cambios, 'Comentario actualizado');
        END IF;
        
        IF array_length(v_cambios, 1) > 0 THEN
            v_detalle := array_to_string(v_cambios, ' | ');
        ELSE
            v_detalle := 'Historial estado actualizado';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_detalle := 'Historial estado eliminado';
    END IF;
    
    v_detalle := LEFT(v_detalle, 1000);
    
    INSERT INTO log_cambios (
        tabla_afectada, id_registro, accion, detalle_cambio, usuario_responsable, fecha_cambio
    ) VALUES (
        TG_TABLE_NAME, v_id_registro, TG_OP, v_detalle, v_usuario, NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_estado_solicitud_hist ON estado_solicitud_hist;
CREATE TRIGGER trg_log_estado_solicitud_hist
    AFTER INSERT OR UPDATE OR DELETE ON estado_solicitud_hist
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_estado_solicitud_hist();

-- ===========================================
-- TRIGGER: profesion
-- ===========================================

CREATE OR REPLACE FUNCTION trigger_log_profesion()
RETURNS TRIGGER AS $$
DECLARE
    v_detalle TEXT := '';
    v_cambios TEXT[] := ARRAY[]::TEXT[];
    v_id_registro TEXT;
    v_usuario TEXT;
BEGIN
    v_usuario := COALESCE(
        NULLIF(current_setting('app.current_user', true), ''),
        current_user,
        'system'
    );
    v_id_registro := COALESCE(NEW.id_profesion::TEXT, OLD.id_profesion::TEXT);
    
    IF TG_OP = 'INSERT' THEN
        v_detalle := 'Nueva profesión: ' || NEW.nombre_profesion;
        
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.nombre_profesion IS DISTINCT FROM NEW.nombre_profesion THEN
            v_cambios := array_append(v_cambios, 
                'Nombre: ' || OLD.nombre_profesion || '→' || NEW.nombre_profesion);
        END IF;
        
        IF array_length(v_cambios, 1) > 0 THEN
            v_detalle := array_to_string(v_cambios, ' | ');
        ELSE
            v_detalle := 'Profesión actualizada';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_detalle := 'Profesión eliminada: ' || OLD.nombre_profesion;
    END IF;
    
    v_detalle := LEFT(v_detalle, 1000);
    
    INSERT INTO log_cambios (
        tabla_afectada, id_registro, accion, detalle_cambio, usuario_responsable, fecha_cambio
    ) VALUES (
        TG_TABLE_NAME, v_id_registro, TG_OP, v_detalle, v_usuario, NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_profesion ON profesion;
CREATE TRIGGER trg_log_profesion
    AFTER INSERT OR UPDATE OR DELETE ON profesion
    FOR EACH ROW
    EXECUTE FUNCTION trigger_log_profesion();

-- ===========================================
-- VERIFICACION
-- ===========================================

SELECT 
    event_object_table AS tabla,
    trigger_name AS trigger,
    event_manipulation AS evento
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'trg_log_%'
ORDER BY event_object_table;
