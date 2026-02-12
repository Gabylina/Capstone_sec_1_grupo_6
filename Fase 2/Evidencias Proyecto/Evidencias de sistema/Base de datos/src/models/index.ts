// ===========================================
// IMPORTAR TODOS LOS MODELOS
// ===========================================

// Modelos básicos
import Region from './Region';
import Comuna from './Comuna';
import Usuario from './Usuario';
import Cliente from './Cliente';
import Contacto from './Contacto';

// Modelos de procesos
import TipoServicio from './TipoServicio';
import Cargo from './Cargo';
import DescripcionCargo from './DescripcionCargo';
import EstadoSolicitud from './EstadoSolicitud';
import EstadoSolicitudHist from './EstadoSolicitudHist';
import EtapaSolicitud from './EtapaSolicitud';
import Solicitud from './Solicitud';

// Modelos de candidatos
import EstadoCandidato from './EstadoCandidato';
import EstadoCliente from './EstadoCliente';
import EstadoClientePostulacion from './EstadoClientePostulacion';
import EstadoClienteM5 from './EstadoClienteM5';
import EstadoClientePostulacionM5 from './EstadoClientePostulacionM5';
import PortalPostulacion from './PortalPostulacion';
import Publicacion from './Publicacion';
import Rubro from './Rubro';
import Candidato from './Candidato';
import Postulacion from './Postulacion';

// Modelos de formación y experiencia
import Institucion from './Institucion';
import Nacionalidad from './Nacionalidad';
import Profesion from './Profesion';
import PostgradoCapacitacion from './PostgradoCapacitacion';
import Experiencia from './Experiencia';
import CandidatoProfesion from './CandidatoProfesion';
import CandidatoPostgradoCapacitacion from './CandidatoPostgradoCapacitacion';
import ReferenciaLaboral from './ReferenciaLaboral';

// Modelos de hitos y contratación
import HitoSolicitud from './HitoSolicitud';
import EstadoContratacion from './EstadoContratacion';
import Contratacion from './Contratacion';

// Modelos de evaluación psicolaboral
import TestPsicolaboral from './TestPsicolaboral';
import EvaluacionPsicolaboral from './EvaluacionPsicolaboral';
import EvaluacionTest from './EvaluacionTest';

// Entrevista técnica y exámenes médicos (San Cristóbal Completo)
import EntrevistaTecnica from './EntrevistaTecnica';
import ExamenMedico from './ExamenMedico';

// Modelos de auditoría
import LogCambios from './LogCambios';

// ===========================================
// CONFIGURAR RELACIONES ENTRE MODELOS
// ===========================================

// ===========================================
// RELACIONES BÁSICAS
// ===========================================

// Region -> Comuna (1:N)
Region.hasMany(Comuna, {
    foreignKey: 'id_region',
    as: 'comunas'
});
Comuna.belongsTo(Region, {
    foreignKey: 'id_region',
    as: 'region'
});

// Cliente -> Contacto (1:N)
Cliente.hasMany(Contacto, {
    foreignKey: 'id_cliente',
    as: 'contactos'
});
Contacto.belongsTo(Cliente, {
    foreignKey: 'id_cliente',
    as: 'cliente'
});

// Comuna -> Contacto (1:N)
Comuna.hasMany(Contacto, {
    foreignKey: 'id_comuna',
    as: 'contactos'
});
Contacto.belongsTo(Comuna, {
    foreignKey: 'id_comuna',
    as: 'comuna'
});

// ===========================================
// RELACIONES DE FORMACIÓN Y EXPERIENCIA
// ===========================================

// 🔄 NUEVAS RELACIONES: Institución ↔ CandidatoPostgradoCapacitacion
Institucion.hasMany(CandidatoPostgradoCapacitacion, {
    foreignKey: {
        name: 'id_institucion',
        allowNull: true
    },
    as: 'postgrados_capacitaciones'
});
CandidatoPostgradoCapacitacion.belongsTo(Institucion, {
    foreignKey: {
        name: 'id_institucion',
        allowNull: true
    },
    as: 'institucion'
});

// 🔄 NUEVAS RELACIONES: Institución ↔ CandidatoProfesion
Institucion.hasMany(CandidatoProfesion, {
    foreignKey: {
        name: 'id_institucion',
        allowNull: true
    },
    as: 'profesiones'
});
CandidatoProfesion.belongsTo(Institucion, {
    foreignKey: {
        name: 'id_institucion',
        allowNull: true
    },
    as: 'institucion'
});

// Candidato -> Experiencia (1:N)
Candidato.hasMany(Experiencia, {
    foreignKey: 'id_candidato',
    as: 'experiencias'
});
Experiencia.belongsTo(Candidato, {
    foreignKey: 'id_candidato',
    as: 'candidato'
});

// Candidato -> ReferenciaLaboral (1:N)
Candidato.hasMany(ReferenciaLaboral, {
    foreignKey: 'id_candidato',
    as: 'referenciasLaborales'
});
ReferenciaLaboral.belongsTo(Candidato, {
    foreignKey: 'id_candidato',
    as: 'candidato'
});

// Candidato -> Nacionalidad (N:1)
Candidato.belongsTo(Nacionalidad, {
    foreignKey: 'id_nacionalidad',
    as: 'nacionalidad'
});
Nacionalidad.hasMany(Candidato, {
    foreignKey: 'id_nacionalidad',
    as: 'candidatos'
});

// ===========================================
// RELACIONES DE PROCESOS
// ===========================================

// Cargo -> DescripcionCargo (1:N)
Cargo.hasMany(DescripcionCargo, { foreignKey: 'id_cargo', as: 'descripciones' });
DescripcionCargo.belongsTo(Cargo, { foreignKey: 'id_cargo', as: 'cargo' });

// EstadoSolicitud -> EstadoSolicitudHist (1:N)
EstadoSolicitud.hasMany(EstadoSolicitudHist, { foreignKey: 'id_estado_solicitud', as: 'historial' });
EstadoSolicitudHist.belongsTo(EstadoSolicitud, { foreignKey: 'id_estado_solicitud', as: 'estado' });

// Comuna -> DescripcionCargo (1:N)
Comuna.hasMany(DescripcionCargo, { foreignKey: 'id_comuna', as: 'descripcionesCargo' });
DescripcionCargo.belongsTo(Comuna, { foreignKey: 'id_comuna', as: 'comuna' });

// ✅ Solicitud -> DescripcionCargo (1:1)
Solicitud.hasOne(DescripcionCargo, { foreignKey: 'id_solicitud', as: 'descripcionCargo' });
DescripcionCargo.belongsTo(Solicitud, { foreignKey: 'id_solicitud', as: 'solicitud' });

// Solicitud -> Relaciones múltiples
Solicitud.belongsTo(Contacto, { foreignKey: 'id_contacto', as: 'contacto' });
Solicitud.belongsTo(TipoServicio, { foreignKey: 'codigo_servicio', as: 'tipoServicio' });
Solicitud.belongsTo(Usuario, { foreignKey: 'rut_usuario', as: 'usuario' });
Solicitud.belongsTo(EtapaSolicitud, { foreignKey: 'id_etapa_solicitud', as: 'etapaSolicitud' });

// Solicitud -> EstadoSolicitudHist (1:N)
Solicitud.hasMany(EstadoSolicitudHist, { foreignKey: 'id_solicitud', as: 'historialEstados' });
EstadoSolicitudHist.belongsTo(Solicitud, { foreignKey: 'id_solicitud', as: 'solicitud' });

// Solicitud -> Publicacion (1:N)
Solicitud.hasMany(Publicacion, { foreignKey: 'id_solicitud', as: 'publicaciones' });
Publicacion.belongsTo(Solicitud, { foreignKey: 'id_solicitud', as: 'solicitud' });

// Solicitud -> HitoSolicitud (1:N)
Solicitud.hasMany(HitoSolicitud, { foreignKey: 'id_solicitud', as: 'hitos' });
HitoSolicitud.belongsTo(Solicitud, { foreignKey: 'id_solicitud', as: 'solicitud' });

// PortalPostulacion -> Publicacion (1:N)
PortalPostulacion.hasMany(Publicacion, { foreignKey: 'id_portal_postulacion', as: 'publicaciones' });
Publicacion.belongsTo(PortalPostulacion, { foreignKey: 'id_portal_postulacion', as: 'portalPostulacion' });

// Relaciones inversas
Contacto.hasMany(Solicitud, { foreignKey: 'id_contacto', as: 'solicitudes' });
TipoServicio.hasMany(Solicitud, { foreignKey: 'codigo_servicio', as: 'solicitudes' });
Usuario.hasMany(Solicitud, { foreignKey: 'rut_usuario', as: 'solicitudes' });
EtapaSolicitud.hasMany(Solicitud, { foreignKey: 'id_etapa_solicitud', as: 'solicitudes' });

// ===========================================
// RELACIONES DE CANDIDATOS
// ===========================================

// Rubro -> Candidato (1:N)
Rubro.hasMany(Candidato, {
    foreignKey: 'id_rubro',
    as: 'candidatos'
});
Candidato.belongsTo(Rubro, {
    foreignKey: 'id_rubro',
    as: 'rubro'
});

// Candidato -> Relaciones opcionales
Candidato.belongsTo(Comuna, {
    foreignKey: 'id_comuna',
    as: 'comuna'
});

// Postulacion -> Relaciones múltiples
Postulacion.belongsTo(Candidato, {
    foreignKey: 'id_candidato',
    as: 'candidato'
});
Postulacion.belongsTo(EstadoCandidato, {
    foreignKey: 'id_estado_candidato',
    as: 'estadoCandidato'
});
Postulacion.belongsTo(Solicitud, {
    foreignKey: 'id_solicitud',
    as: 'solicitud'
});
Postulacion.belongsTo(PortalPostulacion, {
    foreignKey: 'id_portal_postulacion',
    as: 'portalPostulacion'
});

// EstadoCliente -> EstadoClientePostulacion (1:N)
EstadoCliente.hasMany(EstadoClientePostulacion, {
    foreignKey: 'id_estado_cliente',
    as: 'postulaciones'
});
EstadoClientePostulacion.belongsTo(EstadoCliente, {
    foreignKey: 'id_estado_cliente',
    as: 'estadoCliente'
});

// Postulacion -> EstadoClientePostulacion (1:N)
Postulacion.hasMany(EstadoClientePostulacion, {
    foreignKey: 'id_postulacion',
    as: 'estadosCliente'
});
EstadoClientePostulacion.belongsTo(Postulacion, {
    foreignKey: 'id_postulacion',
    as: 'postulacion'
});

// ===========================================
// RELACIONES DEL MÓDULO 5
// ===========================================

// EstadoClienteM5 -> EstadoClientePostulacionM5 (1:N)
EstadoClienteM5.hasMany(EstadoClientePostulacionM5, {
    foreignKey: 'id_estado_cliente_postulacion_m5',
    as: 'postulacionesEstado'
});
EstadoClientePostulacionM5.belongsTo(EstadoClienteM5, {
    foreignKey: 'id_estado_cliente_postulacion_m5',
    as: 'estadoClienteM5'
});

// Postulacion -> EstadoClientePostulacionM5 (1:N)
Postulacion.hasMany(EstadoClientePostulacionM5, {
    foreignKey: 'id_postulacion',
    as: 'estadosClienteM5'
});
EstadoClientePostulacionM5.belongsTo(Postulacion, {
    foreignKey: 'id_postulacion',
    as: 'postulacion'
});

// ===========================================
// RELACIONES DE CONTRATACIÓN
// ===========================================

// Postulacion -> Contratacion (1:1)
Postulacion.hasOne(Contratacion, {
    foreignKey: 'id_postulacion',
    as: 'contratacion'
});
Contratacion.belongsTo(Postulacion, {
    foreignKey: 'id_postulacion',
    as: 'postulacion'
});

// EstadoContratacion -> Contratacion (1:N)
EstadoContratacion.hasMany(Contratacion, {
    foreignKey: 'id_estado_contratacion',
    as: 'contrataciones'
});
Contratacion.belongsTo(EstadoContratacion, {
    foreignKey: 'id_estado_contratacion',
    as: 'estadoContratacion'
});

// ===========================================
// RELACIONES DE EVALUACIÓN PSICOLABORAL
// ===========================================

// Postulacion -> EvaluacionPsicolaboral (1:N)
Postulacion.hasMany(EvaluacionPsicolaboral, {
    foreignKey: 'id_postulacion',
    as: 'evaluacionesPsicolaborales'
});
EvaluacionPsicolaboral.belongsTo(Postulacion, {
    foreignKey: 'id_postulacion',
    as: 'postulacion'
});

// EvaluacionPsicolaboral <-> TestPsicolaboral (N:N)
EvaluacionPsicolaboral.belongsToMany(TestPsicolaboral, {
    through: EvaluacionTest,
    foreignKey: 'id_evaluacion_psicolaboral',
    otherKey: 'id_test_psicolaboral',
    as: 'tests'
});
TestPsicolaboral.belongsToMany(EvaluacionPsicolaboral, {
    through: EvaluacionTest,
    foreignKey: 'id_test_psicolaboral',
    otherKey: 'id_evaluacion_psicolaboral',
    as: 'evaluaciones'
});

// ===========================================
// RELACIONES MANY-TO-MANY
// ===========================================

// Candidato <-> Profesion (N:N)
Candidato.belongsToMany(Profesion, {
    through: CandidatoProfesion,
    foreignKey: 'id_candidato',
    otherKey: 'id_profesion',
    as: 'profesiones'
});
Profesion.belongsToMany(Candidato, {
    through: CandidatoProfesion,
    foreignKey: 'id_profesion',
    otherKey: 'id_candidato',
    as: 'candidatos'
});

// Candidato <-> PostgradoCapacitacion (N:N)
Candidato.belongsToMany(PostgradoCapacitacion, {
    through: CandidatoPostgradoCapacitacion,
    foreignKey: 'id_candidato',
    otherKey: 'id_postgradocapacitacion',
    as: 'postgradosCapacitaciones'
});
PostgradoCapacitacion.belongsToMany(Candidato, {
    through: CandidatoPostgradoCapacitacion,
    foreignKey: 'id_postgradocapacitacion',
    otherKey: 'id_candidato',
    as: 'candidatos'
});

// Relaciones inversas
Candidato.hasMany(Postulacion, {
    foreignKey: 'id_candidato',
    as: 'postulaciones'
});
EstadoCandidato.hasMany(Postulacion, {
    foreignKey: 'id_estado_candidato',
    as: 'postulaciones'
});
Solicitud.hasMany(Postulacion, {
    foreignKey: 'id_solicitud',
    as: 'postulaciones'
});
PortalPostulacion.hasMany(Postulacion, {
    foreignKey: 'id_portal_postulacion',
    as: 'postulaciones'
});

// ===========================================
// EXPORTAR MODELOS CON RELACIONES
// ===========================================

export {
    Region,
    Comuna,
    Usuario,
    Cliente,
    Contacto,
    TipoServicio,
    Cargo,
    DescripcionCargo,
    EstadoSolicitud,
    EstadoSolicitudHist,
    EtapaSolicitud,
    Solicitud,
    EstadoCandidato,
    EstadoCliente,
    EstadoClientePostulacion,
    EstadoClienteM5,
    EstadoClientePostulacionM5,
    PortalPostulacion,
    Publicacion,
    Rubro,
    Candidato,
    Postulacion,
    Institucion,
    Nacionalidad,
    Profesion,
    PostgradoCapacitacion,
    Experiencia,
    CandidatoProfesion,
    CandidatoPostgradoCapacitacion,
    ReferenciaLaboral,
    HitoSolicitud,
    EstadoContratacion,
    Contratacion,
    TestPsicolaboral,
    EvaluacionPsicolaboral,
    EvaluacionTest,
    EntrevistaTecnica,
    ExamenMedico,
    LogCambios
};
