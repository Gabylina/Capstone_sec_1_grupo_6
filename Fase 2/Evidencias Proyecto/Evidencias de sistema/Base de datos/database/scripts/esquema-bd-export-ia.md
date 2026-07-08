# Esquema de base de datos — LL Consulting

**Documento de referencia para la copia sanitizada entregada con fines de entrenamiento de IA.**

| | |
|---|---|
| **Motor** | PostgreSQL 16+ |
| **Base de datos** | `defaultdb` (nombre al restaurar: a elección del receptor) |
| **Total de tablas** | 42 |
| **Formato de entrega** | Backup PostgreSQL (`.dump` / `.backup`, formato custom) |

---

## Notas sobre la copia sanitizada

Esta versión de la base de datos **no contiene datos reales de empresas clientes** en las tablas indicadas. Se aplicó el script `sanitizar-export-ia.sql` antes de la exportación.

| Tabla | Tratamiento |
|-------|-------------|
| `cliente` | `nombre_cliente` reemplazado por `Cliente_anon_{id}` |
| `contacto` | Nombre, email, teléfono y cargo ficticios; se conservan IDs y relaciones |
| `usuario` (rol 3, portal cliente) | **Eliminados** |
| `usuario` (rol 1 admin, rol 2 consultor) | RUT, nombre, email y contraseña anonimizados |
| `log_cambios` | Eliminados registros de `cliente`, `contacto` y `usuario` |

**Importante:** Las tablas de **candidatos** (`candidato`, `postulacion`, `referenciaslaboral`, etc.) **sí contienen datos personales** (nombres, RUT, emails, CVs en binario). Esta copia está pensada para entrenamiento interno acordado; no redistribuir sin revisar cumplimiento normativo (Ley 19.628 / GDPR según aplique).

**No incluido en el backup:** archivos del servidor (`/uploads`, PDFs externos, etc.).

---

## Flujo principal de datos (reclutamiento)

```
cliente → contacto → solicitud → descripcioncargo
                              → hito_solicitud
                              → publicacion
                              → postulacion → candidato
                                           → evaluacion_psicolaboral
                                           → entrevista_tecnica
                                           → examen_medico
                                           → estado_cliente_postulacion
                                           → contratacion
```

- Cada **solicitud** es un proceso de selección asignado a un consultor (`usuario.rut_usuario`).
- Cada **postulacion** vincula un **candidato** a una **solicitud**.
- Los **catálogos de estado** (`estado`, `estado_candidato`, `estado_cliente`, etc.) describen en qué etapa está cada entidad.

---

## Convenciones de este documento

| Símbolo / columna | Significado |
|-------------------|-------------|
| **PK** | Primary key (clave primaria) |
| **FK →** | Foreign key (referencia a otra tabla) |
| **NULL** | Campo opcional |
| **Descripción** | Qué representa el campo en el negocio (solo en campos no obvios o que requieren contexto) |
| **JSON / BLOB** | JSON de PostgreSQL / datos binarios (`BYTEA`) |

---

## 1. Geografía

Catálogos de ubicación usados en contactos, candidatos y descripciones de cargo.

### `region`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_region` | INTEGER | ✓ | NO | Identificador único de la región |
| `nombre_region` | VARCHAR(100) | | NO | Nombre de la región (ej. Metropolitana, Valparaíso) |

### `comuna`

| Campo | Tipo | PK | NULL | FK / Descripción |
|-------|------|:--:|:----:|------------------|
| `id_comuna` | INTEGER | ✓ | NO | Identificador único de la comuna |
| `nombre_comuna` | VARCHAR(100) | | NO | Nombre de la comuna |
| `id_region` | INTEGER | | NO | → `region.id_region` — Región a la que pertenece |

---

## 2. Clientes y usuarios *(sanitizados)*

### `cliente`

Empresa contratante del servicio de reclutamiento. En esta copia los nombres están anonimizados.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_cliente` | INTEGER | ✓ | NO | Identificador interno de la empresa |
| `nombre_cliente` | VARCHAR(100) | | NO | Razón social o nombre comercial *(anonimizado: `Cliente_anon_{id}`)* |
| `activo_cliente` | BOOLEAN | | NO | Soft delete: `false` cuando el cliente fue "eliminado" desde el front (se oculta de los listados pero no se borra) |

### `contacto`

Persona de contacto en la empresa cliente que encarga el proceso de selección.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_contacto` | INTEGER | ✓ | NO | Identificador del contacto |
| `nombre_contacto` | VARCHAR(100) | | NO | Nombre de la persona *(anonimizado)* |
| `email_contacto` | VARCHAR(256) | | NO | Correo de contacto *(anonimizado)* |
| `telefono_contacto` | VARCHAR(12) | | NO | Teléfono de contacto *(anonimizado)* |
| `cargo_contacto` | VARCHAR(100) | | NO | Cargo en la empresa *(anonimizado)* |
| `id_cliente` | INTEGER | | NO | Empresa a la que pertenece el contacto |
| `id_comuna` | INTEGER | | NO | Comuna de ubicación del contacto |

### `usuario`

Usuarios del sistema: administradores, consultores y (eliminados en copia) clientes del portal.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `rut_usuario` | VARCHAR(12) | ✓ | NO | RUT chileno; clave primaria. Login de admin/consultor *(anonimizado)* |
| `nombre_usuario` | VARCHAR(100) | | NO | Nombre de pila *(anonimizado)* |
| `apellido_usuario` | VARCHAR(100) | | NO | Apellido *(anonimizado)* |
| `email_usuario` | VARCHAR(150) | | NO | Email de login (admin/consultor) *(anonimizado)* |
| `contrasena_usuario` | VARCHAR(150) | | NO | Hash bcrypt; invalidado en la copia exportada |
| `activo_usuario` | BOOLEAN | | NO | `true` = puede iniciar sesión; `false` = inhabilitado |
| `rol_usuario` | INTEGER | | NO | `1` = administrador, `2` = consultor, `3` = cliente portal *(rol 3 eliminado)* |
| `id_cliente` | INTEGER | | SÍ | Solo para rol 3: empresa del portal. NULL en esta copia |

---

## 3. Procesos / solicitudes

### `solicitud`

Proceso de selección / reclutamiento. Es la entidad central del sistema.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_solicitud` | INTEGER | ✓ | NO | Identificador del proceso |
| `plazo_maximo_solicitud` | TIMESTAMP | | NO | Fecha tope del proceso; se calcula según tipo de servicio |
| `fecha_ingreso_solicitud` | TIMESTAMP | | NO | Fecha en que se registró la solicitud |
| `id_contacto` | INTEGER | | NO | Contacto de la empresa que encargó el proceso |
| `codigo_servicio` | VARCHAR(2) | | NO | Tipo de servicio contratado (ej. `SC`, `CA`, `ES`) → `tiposervicio` |
| `rut_usuario` | VARCHAR(12) | | NO | Consultor LL Consulting asignado al proceso |
| `id_etapa_solicitud` | INTEGER | | NO | Módulo/etapa actual del flujo (M1, M2, M3, etc.) |

### `descripcioncargo`

Detalle del puesto a cubrir dentro de una solicitud. Una solicitud puede tener una o más descripciones de cargo.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_descripcioncargo` | INTEGER | ✓ | NO | Identificador del levantamiento de cargo |
| `descripcion_cargo` | VARCHAR(500) | | NO | Funciones y responsabilidades del puesto |
| `requisitos_y_condiciones` | VARCHAR(500) | | SÍ | Requisitos técnicos, educacionales y condiciones laborales |
| `num_vacante` | INTEGER | | NO | Cantidad de personas a contratar para este cargo |
| `fecha_ingreso` | TIMESTAMP | | NO | Fecha estimada de ingreso del candidato seleccionado |
| `datos_excel` | JSON | | SÍ | Contenido estructurado del formulario Excel de levantamiento |
| `datos_pdf` | BYTEA | | SÍ | PDF del levantamiento de perfil (puede incluir logo del cliente) |
| `id_cargo` | INTEGER | | NO | Título genérico del cargo → `cargo` |
| `id_comuna` | INTEGER | | NO | Ubicación donde trabajará el candidato |
| `id_solicitud` | INTEGER | | NO | Proceso al que pertenece este cargo |

### `hito_solicitud`

Plazos y alertas del proceso. Pueden ser **plantillas** (`id_solicitud` NULL) o **hitos activos** de una solicitud concreta.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_hito_solicitud` | INTEGER | ✓ | NO | Identificador del hito |
| `nombre_hito` | VARCHAR(100) | | NO | Nombre corto del hito (ej. “Presentación shortlist”) |
| `tipo_ancla` | VARCHAR(50) | | NO | Evento de referencia para calcular plazos (ej. fecha de ingreso de solicitud) |
| `duracion_dias` | INTEGER | | NO | Días hábiles desde la ancla hasta la fecha límite |
| `avisar_antes_dias` | INTEGER | | NO | Cuántos días antes del vencimiento se debe alertar al consultor |
| `descripcion` | VARCHAR(500) | | NO | Texto explicativo del hito para el dashboard |
| `codigo_servicio` | VARCHAR(2) | | NO | Tipo de servicio al que aplica la plantilla |
| `fecha_base` | TIMESTAMP | | SÍ | Fecha de ancla calculada; NULL si es solo plantilla |
| `fecha_limite` | TIMESTAMP | | SÍ | Fecha tope del hito |
| `fecha_cumplimiento` | TIMESTAMP | | SÍ | Fecha real en que se marcó cumplido; NULL = pendiente |
| `id_solicitud` | INTEGER | | SÍ | Proceso asociado; NULL = registro plantilla reutilizable |

### `bola_nieve_solicitud`

Registro de estrategias de búsqueda activas (“bola de nieve”) para una solicitud — módulo de sourcing.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_bola_nieve_solicitud` | INTEGER | ✓ | NO | Identificador del registro |
| `id_solicitud` | INTEGER | | NO | Proceso (relación 1:1) |
| `contacto_personas_rubro` | BOOLEAN | | SÍ | ¿Se contactó a personas del rubro? |
| `detalle_contacto_personas_rubro` | TEXT | | SÍ | Detalle de la acción de contacto a personas |
| `contacto_empresas_rubro` | BOOLEAN | | SÍ | ¿Se contactó a empresas del rubro? |
| `detalle_contacto_empresas_rubro` | TEXT | | SÍ | Detalle de contacto a empresas |
| `busqueda_linkedin` | BOOLEAN | | SÍ | ¿Se realizó búsqueda en LinkedIn? |
| `detalle_busqueda_linkedin` | TEXT | | SÍ | Detalle de la búsqueda en LinkedIn |
| `apoyo_reclutadores` | BOOLEAN | | SÍ | ¿Hubo apoyo de otros reclutadores? |
| `detalle_apoyo_reclutadores` | TEXT | | SÍ | Detalle del apoyo recibido |
| `visitas_terreno` | BOOLEAN | | SÍ | ¿Se realizaron visitas a terreno? |
| `detalle_visitas_terreno` | TEXT | | SÍ | Detalle de visitas |
| `fecha_actualizacion` | TIMESTAMP | | NO | Última modificación del registro |

### `publicacion`

Aviso de empleo publicado en un portal externo para una solicitud.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_publicacion` | INTEGER | ✓ | NO | Identificador de la publicación |
| `fecha_publicacion` | DATE | | NO | Fecha en que se publicó el aviso |
| `estado_publicacion` | VARCHAR(100) | | NO | Estado del aviso (activo, cerrado, etc.) |
| `url_publicacion` | VARCHAR(100) | | NO | Enlace al aviso en el portal |
| `id_solicitud` | INTEGER | | NO | Proceso asociado |
| `id_portal_postulacion` | INTEGER | | NO | Portal donde se publicó (LinkedIn, Trabajando, etc.) |

### `estado_solicitud_hist`

Historial de cambios de estado de una solicitud (Creado → En Progreso → Cerrado, etc.).

**PK compuesta:** `(fecha_cambio_estado_solicitud, id_estado_solicitud, id_solicitud)`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `fecha_cambio_estado_solicitud` | TIMESTAMP | ✓ | NO | Momento exacto del cambio de estado |
| `id_estado_solicitud` | INTEGER | ✓ | NO | Nuevo estado → `estado` |
| `id_solicitud` | INTEGER | ✓ | NO | Proceso afectado |
| `comentario_estado_solicitud_hist` | VARCHAR(500) | | SÍ | Comentario del consultor al cambiar el estado |

---

## 4. Candidatos y postulaciones

### `candidato`

Persona postulante registrada en el sistema. Puede participar en múltiples procesos.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_candidato` | INTEGER | ✓ | NO | Identificador interno |
| `rut_candidato` | VARCHAR(12) | | SÍ | RUT chileno del candidato (único si existe) |
| `nombre_candidato` | VARCHAR(100) | | NO | Nombre de pila |
| `primer_apellido_candidato` | VARCHAR(100) | | NO | Primer apellido |
| `segundo_apellido_candidato` | VARCHAR(100) | | SÍ | Segundo apellido |
| `telefono_candidato` | VARCHAR(12) | | SÍ | Teléfono de contacto |
| `email_candidato` | VARCHAR(150) | | SÍ | Correo electrónico (único si existe) |
| `edad_candidato` | INTEGER | | SÍ | Edad declarada |
| `fecha_nacimiento_candidato` | TIMESTAMP | | SÍ | Fecha de nacimiento |
| `software_herramientas` | VARCHAR(100) | | SÍ | Herramientas/software que domina |
| `nivel_ingles` | VARCHAR(100) | | SÍ | Nivel de inglés declarado |
| `discapacidad` | BOOLEAN | | NO | Indica si declara discapacidad |
| `licencia` | BOOLEAN | | NO | Indica si tiene licencia de conducir |
| `id_comuna` | INTEGER | | SÍ | Comuna de residencia |
| `id_nacionalidad` | INTEGER | | SÍ | Nacionalidad |
| `id_rubro` | INTEGER | | SÍ | Rubro o industria principal del candidato |

### `postulacion`

Vincula un candidato con una solicitud. Contiene la información específica de esa postulación.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_postulacion` | INTEGER | ✓ | NO | Identificador de la postulación |
| `motivacion` | TEXT | | SÍ | Por qué el candidato postula al cargo |
| `expectativa_renta` | DECIMAL(12,2) | | SÍ | Renta líquida o bruta esperada (CLP) |
| `disponibilidad_postulacion` | VARCHAR(100) | | SÍ | Disponibilidad para incorporarse (inmediata, 30 días, etc.) |
| `comentario_no_presentado` | TEXT | | SÍ | Motivo por el cual no se presentó al cliente |
| `comentario_candidato` | TEXT | | SÍ | Notas internas del consultor sobre el candidato |
| `situacion_familiar` | VARCHAR(300) | | SÍ | Información familiar relevante para el proceso |
| `fecha_envio` | TIMESTAMP | | SÍ | Fecha en que se registró o envió la postulación |
| `valoracion` | INTEGER | | SÍ | Puntuación interna del consultor (1 a 5 estrellas) |
| `cv_postulacion` | BYTEA | | SÍ | Archivo CV adjunto en formato binario |
| `id_candidato` | INTEGER | | NO | Candidato que postula |
| `id_estado_candidato` | INTEGER | | SÍ | Estado en el pipeline (presentado, no presentado, rechazado) |
| `id_solicitud` | INTEGER | | NO | Proceso al que postula |
| `id_portal_postulacion` | INTEGER | | SÍ | Portal por el cual llegó (si aplica) |

> **Unique:** `(id_candidato, id_solicitud)` — un candidato solo postula una vez por solicitud.

### `aprobacion_candidato_postulacion`

Flujo de revisión interna antes de presentar un candidato al cliente.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_aprobacion_candidato` | INTEGER | ✓ | NO | Identificador de la solicitud de aprobación |
| `id_postulacion` | INTEGER | | NO | Postulación a revisar (única por registro) |
| `estado` | VARCHAR(20) | | NO | `pendiente`, `aprobado`, `rechazado`, etc. |
| `motivo` | TEXT | | SÍ | Justificación de la decisión |
| `rut_usuario_envio` | VARCHAR(20) | | SÍ | Consultor que envió a revisión |
| `fecha_envio_revision` | TIMESTAMP | | SÍ | Cuándo se envió a revisión |
| `rut_usuario_aprobador` | VARCHAR(20) | | SÍ | Admin/consultor que aprobó o rechazó |
| `fecha_resolucion` | TIMESTAMP | | SÍ | Cuándo se resolvió la revisión |

### `referenciaslaboral`

Referencias laborales declaradas por un candidato.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_referencia_laboral` | INTEGER | ✓ | NO | Identificador de la referencia |
| `nombre_referencia` | VARCHAR(100) | | NO | Nombre de la persona referente |
| `cargo_referencia` | VARCHAR(100) | | NO | Cargo de la referencia |
| `empresa_referencia` | VARCHAR(100) | | NO | Empresa donde trabajó junto al candidato |
| `telefono_referencia` | VARCHAR(12) | | SÍ | Teléfono de contacto de la referencia |
| `email_referencia` | VARCHAR(256) | | SÍ | Email de la referencia |
| `id_candidato` | INTEGER | | NO | Candidato al que pertenece |
| `relacion_postulante_referencia` | VARCHAR(100) | | NO | Relación con el candidato (jefe directo, par, etc.) |
| `comentario_referencia` | TEXT | | SÍ | Observaciones sobre el desempeño del candidato |

---

## 5. Formación y experiencia

### `institucion`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_institucion` | INTEGER | ✓ | NO | Identificador de universidad, instituto o centro de formación |
| `nombre_institucion` | VARCHAR(100) | | NO | Nombre de la institución |

### `profesion`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_profesion` | INTEGER | ✓ | NO | Identificador del título o profesión |
| `nombre_profesion` | VARCHAR(100) | | NO | Nombre del título (ej. Ingeniero Civil Industrial) |

### `postgradocapacitacion`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_postgradocapacitacion` | INTEGER | ✓ | NO | Identificador del postgrado o curso |
| `nombre_postgradocapacitacion` | VARCHAR(100) | | NO | Nombre del programa (diplomado, magíster, curso) |

### `candidatoprofesion`

Títulos profesionales de un candidato.

**PK compuesta:** `(id_profesion, id_candidato, id_institucion)`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `fecha_obtencion` | DATE | | NO | Año/mes en que obtuvo el título |
| `id_profesion` | INTEGER | ✓ | NO | Título obtenido |
| `id_candidato` | INTEGER | ✓ | NO | Candidato |
| `id_institucion` | INTEGER | ✓ | NO | Institución que otorgó el título |

### `candidatopostgradocapacitacion`

Postgrados y capacitaciones de un candidato.

**PK compuesta:** `(id_postgradocapacitacion, id_candidato, id_institucion)`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `fecha_obtencion` | DATE | | NO | Fecha de obtención o término |
| `id_postgradocapacitacion` | INTEGER | ✓ | NO | Programa cursado |
| `id_candidato` | INTEGER | ✓ | NO | Candidato |
| `id_institucion` | INTEGER | ✓ | NO | Institución |

### `experiencia`

Historial laboral declarado por el candidato.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_experiencia` | INTEGER | ✓ | NO | Identificador del registro |
| `empresa` | VARCHAR(100) | | NO | Nombre de la empresa empleadora |
| `cargo` | VARCHAR(100) | | NO | Cargo desempeñado |
| `fecha_inicio_experiencia` | DATE | | NO | Fecha de inicio en el puesto |
| `fecha_fin_experiencia` | DATE | | SÍ | Fecha de término; NULL = trabajo actual |
| `descripcion_funciones_experiencia` | VARCHAR(500) | | NO | Principales funciones y logros |
| `motivo_salida_experiencia` | VARCHAR(500) | | SÍ | Razón de salida de la empresa |
| `id_candidato` | INTEGER | | NO | Candidato al que pertenece |

---

## 6. Evaluaciones

### `evaluacion_psicolaboral`

Evaluación psicolaboral de una postulación (puede incluir varios tests).

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_evaluacion_psicolaboral` | INTEGER | ✓ | NO | Identificador de la evaluación |
| `fecha_evaluacion` | TIMESTAMP | | SÍ | Fecha en que se realizó la evaluación |
| `fecha_envio_informe` | TIMESTAMP | | SÍ | Fecha de envío del informe al consultor |
| `estado_evaluacion` | VARCHAR(100) | | NO | Estado del proceso evaluativo |
| `estado_informe` | VARCHAR(100) | | NO | Estado del informe (borrador, enviado, etc.) |
| `conclusion_global` | VARCHAR(300) | | SÍ | Conclusión resumida del evaluador |
| `id_postulacion` | INTEGER | | NO | Postulación evaluada |
| `es_remota` | BOOLEAN | | NO | `true` = evaluación remota; `false` = presencial |

### `test_psicolaboral`

Catálogo de tests psicolaborales disponibles (ej. DISC, MBTI).

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_test_psicolaboral` | INTEGER | ✓ | NO | Identificador del test |
| `nombre_test_psicolaboral` | VARCHAR(100) | | NO | Nombre del instrumento |
| `descripcion_test_psicolaboral` | VARCHAR(300) | | NO | Descripción breve del test |

### `evaluaciontest`

Resultado de un test específico dentro de una evaluación psicolaboral.

**PK compuesta:** `(id_evaluacion_psicolaboral, id_test_psicolaboral)`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_evaluacion_psicolaboral` | INTEGER | ✓ | NO | Evaluación padre |
| `id_test_psicolaboral` | INTEGER | ✓ | NO | Test aplicado |
| `resultado_test` | VARCHAR(300) | | NO | Resultado o perfil obtenido |

### `entrevista_tecnica`

Entrevista técnica con el candidato (servicios San Cristóbal / acotado).

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_entrevista_tecnica` | INTEGER | ✓ | NO | Identificador |
| `id_postulacion` | INTEGER | | NO | Postulación evaluada (1:1) |
| `id_solicitud` | INTEGER | | NO | Proceso asociado |
| `fecha_hora_entrevista` | TIMESTAMP | | SÍ | Fecha y hora programada o realizada |
| `estado_entrevista` | VARCHAR(50) | | NO | Ej. `programada`, `realizada`, `cancelada` |
| `resultado` | VARCHAR(50) | | SÍ | Resultado de la entrevista (aprobado, rechazado, etc.) |
| `detalle` | TEXT | | SÍ | Notas y observaciones del entrevistador |

### `examen_medico`

Documentación de examen médico preocupacional del candidato.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_examen_medico` | INTEGER | ✓ | NO | Identificador |
| `id_postulacion` | INTEGER | | NO | Postulación |
| `id_solicitud` | INTEGER | | NO | Proceso |
| `nombre_documento` | VARCHAR(255) | | SÍ | Nombre del archivo subido |
| `documento_archivo` | BYTEA | | SÍ | Archivo del examen en binario |
| `estado_aprobacion` | VARCHAR(50) | | NO | Ej. `pendiente`, `aprobado`, `rechazado` |
| `detalle` | TEXT | | SÍ | Observaciones sobre el examen |

---

## 7. Contratación y feedback del cliente en procesos

> Las tablas `estado_cliente*` son **catálogos de decisión** (Aprobado, Rechazado, etc.), no datos de empresas.

### `contratacion`

Cierre del proceso: candidato seleccionado e ingreso confirmado.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_contratacion` | INTEGER | ✓ | NO | Identificador |
| `fecha_ingreso_contratacion` | TIMESTAMP | | SÍ | Fecha efectiva de ingreso del candidato a la empresa |
| `observaciones_contratacion` | VARCHAR(500) | | SÍ | Notas del consultor sobre la contratación |
| `encuesta_satisfaccion` | VARCHAR(1000) | | SÍ | Encuesta del cliente en formato JSON (ver abajo) |
| `id_postulacion` | INTEGER | | NO | Postulación contratada (1:1) |
| `id_estado_contratacion` | INTEGER | | NO | Estado del cierre → `estado_contratacion` |

**Formato de `encuesta_satisfaccion` (JSON):**

```json
{
  "comunicacion": 4,
  "calidad_candidatos": 5,
  "tiempo": 3,
  "acompanamiento": 4,
  "volveria_trabajar": true,
  "motivo_no": "texto opcional si volveria_trabajar es false",
  "nota_total": 4
}
```

| Clave JSON | Descripción |
|------------|-------------|
| `comunicacion` | Nota 1–5: claridad y oportunidad de la comunicación |
| `calidad_candidatos` | Nota 1–5: calidad de candidatos presentados |
| `tiempo` | Nota 1–5: tiempo de respuesta del equipo |
| `acompanamiento` | Nota 1–5: acompañamiento del consultor |
| `volveria_trabajar` | `true`/`false`: ¿volvería a contratar el servicio? |
| `motivo_no` | Texto libre si no volvería a trabajar con LL Consulting |
| `nota_total` | Promedio de las dimensiones numéricas |

### `estado_cliente_postulacion`

Feedback del cliente sobre un candidato presentado (módulo 3 — shortlist).

**PK compuesta:** `(id_estado_cliente, id_postulacion)`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_estado_cliente` | INTEGER | ✓ | NO | Decisión del cliente → `estado_cliente` |
| `id_postulacion` | INTEGER | ✓ | NO | Candidato evaluado |
| `fecha_feedback_cliente_m3` | TIMESTAMP | | SÍ | Cuándo respondió el cliente |
| `comentario_rech_obs_cliente` | TEXT | | SÍ | Comentario al rechazar u observar al candidato |
| `updated_at` | TIMESTAMP | | NO | Última actualización del registro |

### `estado_cliente_postulacion_m5`

Feedback del cliente en módulo 5 (cierre / contratación).

**PK compuesta:** `(id_estado_cliente_postulacion_m5, id_postulacion)`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_estado_cliente_postulacion_m5` | INTEGER | ✓ | NO | Decisión del cliente en M5 |
| `id_postulacion` | INTEGER | ✓ | NO | Candidato evaluado |
| `fecha_feedback_cliente_m5` | TIMESTAMP | | SÍ | Fecha de respuesta del cliente |
| `comentario_modulo5_cliente` | TEXT | | SÍ | Comentario del cliente en etapa de cierre |
| `updated_at` | TIMESTAMP | | NO | Última actualización |

---

## 8. Catálogos / estados

### `cargo`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_cargo` | INTEGER | ✓ | NO | Identificador |
| `nombre_cargo` | VARCHAR(100) | | NO | Nombre genérico del cargo (ej. Jefe de Operaciones) |

### `rubro`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_rubro` | INTEGER | ✓ | NO | Identificador |
| `nombre_rubro` | VARCHAR(100) | | NO | Industria o rubro (minería, retail, TI, etc.) |

### `nacionalidad`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_nacionalidad` | INTEGER | ✓ | NO | Identificador |
| `nombre_nacionalidad` | VARCHAR(100) | | NO | País de nacionalidad |

### `tiposervicio`

Tipos de servicio de reclutamiento que ofrece LL Consulting.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `codigo_servicio` | VARCHAR(2) | ✓ | NO | Código corto. Ej: `SC` = San Cristóbal Completo, `CA` = San Cristóbal Acotado, `ES` = Esencial |
| `nombre_servicio` | VARCHAR(100) | | NO | Nombre descriptivo del servicio |

### `etapasolicitud`

Módulos del flujo de trabajo de una solicitud.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_etapa_solicitud` | INTEGER | ✓ | NO | Identificador |
| `nombre_etapa` | VARCHAR(100) | | NO | Nombre del módulo (ej. Levantamiento, Shortlist, Contratación) |

### `estado` *(estados de solicitud)*

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_estado_solicitud` | INTEGER | ✓ | NO | Identificador |
| `nombre_estado_solicitud` | VARCHAR(100) | | NO | Ej: `Creado`, `En Progreso`, `Cerrado`, `Congelado` |

### `estado_candidato`

Estado del candidato dentro de una postulación en el pipeline del consultor.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_estado_candidato` | INTEGER | ✓ | NO | Identificador |
| `nombre_estado_candidato` | VARCHAR(100) | | NO | Ej: `no_presentado`, `presentado`, `rechazado` |

### `estado_cliente`

Decisiones posibles del cliente sobre un candidato (M3).

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_estado_cliente` | INTEGER | ✓ | NO | Identificador |
| `nombre_estado` | VARCHAR(100) | | NO | Ej: `pendiente`, `aprobado`, `rechazado`, `observado` |

### `estado_cliente_m5`

Decisiones del cliente en módulo 5 (cierre).

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_estado_cliente_postulacion_m5` | INTEGER | ✓ | NO | Identificador |
| `nombre_estado` | VARCHAR(50) | | NO | Estados específicos del cierre/contratación |

### `estado_contratacion`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_estado_contratacion` | INTEGER | ✓ | NO | Identificador |
| `nombre_estado_contratacion` | VARCHAR(100) | | NO | Ej: pendiente de ingreso, contratado, no concretado |

### `portal_postulacion`

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_portal_postulacion` | INTEGER | ✓ | NO | Identificador |
| `nombre_portal_postulacion` | VARCHAR(100) | | NO | Portal de empleo (LinkedIn, Trabajando.com, etc.) |

---

## 9. Auditoría y notificaciones

### `log_cambios`

Registro de auditoría de cambios en tablas clave del sistema.

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_log` | INTEGER | ✓ | NO | Identificador del log |
| `tabla_afectada` | VARCHAR(100) | | NO | Nombre de la tabla modificada |
| `id_registro` | VARCHAR(100) | | NO | ID del registro afectado (como texto) |
| `accion` | VARCHAR(20) | | NO | `INSERT`, `UPDATE` o `DELETE` |
| `detalle_cambio` | VARCHAR(1000) | | NO | Descripción legible del cambio realizado |
| `fecha_cambio` | TIMESTAMP | | NO | Momento del cambio |
| `usuario_responsable` | VARCHAR(50) | | NO | RUT del usuario que realizó la acción |

### `notificacion_consultor`

Alertas in-app para consultores (aprobaciones pendientes, hitos por vencer, etc.).

| Campo | Tipo | PK | NULL | Descripción |
|-------|------|:--:|:----:|-------------|
| `id_notificacion` | INTEGER | ✓ | NO | Identificador |
| `rut_usuario` | VARCHAR(20) | | NO | Consultor destinatario |
| `id_solicitud` | INTEGER | | NO | Proceso relacionado |
| `id_postulacion` | INTEGER | | SÍ | Postulación relacionada (si aplica) |
| `tipo` | VARCHAR(50) | | NO | Tipo de alerta (ej. `aprobacion_candidato`) |
| `titulo` | VARCHAR(200) | | NO | Título corto de la notificación |
| `mensaje` | TEXT | | NO | Cuerpo del mensaje |
| `metadata` | JSONB | | SÍ | Datos adicionales en JSON (IDs, links, etc.) |
| `leida` | BOOLEAN | | NO | `false` = no leída; `true` = ya vista |
| `fecha_creacion` | TIMESTAMP | | NO | Cuándo se generó la notificación |

---

## 10. Relaciones principales (resumen)

| Desde | Campo | Hacia | Campo | Para qué sirve |
|-------|-------|-------|-------|----------------|
| `comuna` | `id_region` | `region` | `id_region` | Ubicación geográfica |
| `contacto` | `id_cliente` | `cliente` | `id_cliente` | Contacto pertenece a empresa |
| `solicitud` | `id_contacto` | `contacto` | `id_contacto` | Proceso encargado por contacto |
| `solicitud` | `rut_usuario` | `usuario` | `rut_usuario` | Consultor responsable |
| `solicitud` | `codigo_servicio` | `tiposervicio` | `codigo_servicio` | Tipo de servicio contratado |
| `descripcioncargo` | `id_solicitud` | `solicitud` | `id_solicitud` | Cargo dentro del proceso |
| `postulacion` | `id_solicitud` | `solicitud` | `id_solicitud` | Candidato en un proceso |
| `postulacion` | `id_candidato` | `candidato` | `id_candidato` | Quién postula |
| `postulacion` | `id_estado_candidato` | `estado_candidato` | `id_estado_candidato` | Estado en pipeline |
| `evaluacion_psicolaboral` | `id_postulacion` | `postulacion` | `id_postulacion` | Evaluación de postulación |
| `contratacion` | `id_postulacion` | `postulacion` | `id_postulacion` | Cierre y encuesta |
| `estado_cliente_postulacion` | `id_postulacion` | `postulacion` | `id_postulacion` | Feedback cliente M3 |
| `estado_solicitud_hist` | `id_solicitud` | `solicitud` | `id_solicitud` | Historial de estados |

---

## Restauración rápida

```bash
createdb -U postgres llconsulting_ia
pg_restore -U postgres -d llconsulting_ia archivo_sanitizado.dump
```

En pgAdmin: clic derecho en *Databases* → *Restore* → seleccionar el archivo `.dump`.

---

*Documento generado a partir de los modelos Sequelize del sistema LL Consulting.*
