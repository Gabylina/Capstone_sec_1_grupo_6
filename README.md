# Sistema de Gestión de Procesos de Reclutamiento y Selección

Sistema web integral para la gestión completa de procesos de reclutamiento, selección y evaluación psicolaboral desarrollado para LL Consulting. El sistema permite administrar todo el ciclo de vida de los procesos de selección, desde la creación de solicitudes hasta la contratación final, incluyendo gestión de candidatos, evaluaciones, alertas automáticas y reportes operativos.

## Características Principales

### Módulos Funcionales

- **Módulo 1: Solicitud y Cargo**: Visualización y gestión de solicitudes de reclutamiento con descripción de cargos
- **Módulo 2: Registro de Candidatos y Publicación**: Gestión completa de candidatos, formación académica, experiencia laboral, carga de CVs, portales de publicación y postulaciones
- **Módulo 3: Presentación de Candidatos**: Registro de envío de candidatos al cliente, recepción de respuestas, comentarios y gestión de estados de postulación
- **Módulo 4: Evaluación Psicolaboral**: Creación de evaluaciones, gestión de estados de entrevista, tests aplicados, resultados globales y referencias laborales
- **Módulo 5: Gestión de Contrataciones**: Estados avanzados de postulación, registro de contratación, gestión de vacantes y cierre de procesos
- **Módulo 6: Alertas y Control de Plazos**: Sistema de alertas automáticas por hitos, control de plazos operativos, registro de actividades y auditoría completa
- **Módulo 7: Reportes y Dashboard**: Dashboard operativo con estadísticas en tiempo real, reportes de cumplimiento de plazos, carga operativa por consultor y análisis de efectividad

### Funcionalidades Adicionales

- Autenticación JWT con recuperación de contraseña
- Sistema de roles y permisos (Administrador y Consultor)
- Gestión de clientes y contactos
- Gestión de usuarios del sistema
- Sistema de hitos automáticos basados en plantillas
- Cálculo automático de plazos máximos por tipo de servicio
- Alertas por hitos vencidos y próximos a vencer
- Sistema de auditoría con triggers de base de datos
- Trazabilidad completa de cambios
- Dashboard con estadísticas en tiempo real
- Filtros avanzados por estado, tipo de servicio y consultor

## Stack Tecnológico

### Backend
- **Node.js** con **Express**
- **TypeScript** para tipado estático
- **PostgreSQL** como base de datos
- **Sequelize ORM** para gestión de modelos
- **JWT** para autenticación

### Frontend
- **Next.js 14** (App Router)
- **React 18** con TypeScript
- **TailwindCSS** para estilos

### Base de Datos
- **Triggers** para auditoría automática
- **Funciones** almacenadas para lógica de negocio
- **Migraciones** con Sequelize CLI

## Modelos de Datos

El sistema incluye **37 modelos** que cubren:

- Usuarios y autenticación
- Clientes y contactos
- Solicitudes y cargos
- Candidatos y postulaciones
- Formación académica y experiencia laboral
- Evaluaciones psicolaborales
- Hitos y plazos
- Contrataciones
- Estados
- Auditoría y logs

## Seguridad

- Autenticación JWT con tokens seguros
- Hash de contraseñas con bcryptjs
- Middleware de autenticación y autorización
- Validación de roles (admin/consultor)
- Rate limiting para protección contra ataques
- Helmet para headers de seguridad
- CORS configurado
- Validación de datos con express-validator

## Integrantes

**CAPSTONE_001D - Grupo 6**

- **Aldo Arroyo** 
- **Nicolas Navarro** 
- **Gabriela Sandoval** 

## Documentación Adicional

- **ERS**
- **Diagrama de Clases**
- **Modelo de Datos**
- **Carta Gantt**

## Arquitectura

El sistema sigue una **arquitectura en capas**:

- **Capa de Presentación**: Next.js con componentes React
- **Capa de Controladores**: Express routes y controllers
- **Capa de Servicios**: Lógica de negocio y validaciones
- **Capa de Datos**: Sequelize ORM con PostgreSQL
- **Capa de Auditoría**: Triggers de base de datos para trazabilidad

## Metodología

El proyecto fue desarrollado siguiendo la **metodología Cascada (Waterfall)**, con fases bien definidas:

1. **Fase 1**: Planificación y Análisis
2. **Fase 2**: Diseño
3. **Fase 3**: Desarrollo
4. **Fase 4**: Pruebas y Despliegue
5. **Fase 5**: Cierre

## 🐳 Despliegue con Docker

El proyecto incluye configuración completa de Docker para facilitar el despliegue y compartir la aplicación.

### Inicio Rápido

1. **Instalar Docker Desktop**: [docker.com](https://www.docker.com/products/docker-desktop)

2. **Navegar a la carpeta del sistema**:
   ```bash
   cd "Fase 2/Evidencias Proyecto/Evidencias de sistema"
   ```

3. **Iniciar todos los servicios**:
   ```bash
   docker-compose up --build
   ```

4. **Acceder a la aplicación**: http://localhost:3000

### Documentación Completa

Para más detalles sobre Docker, configuración avanzada, y cómo compartir la aplicación con otros usuarios, consulta: **[DOCKER.md](Fase%202/Evidencias%20Proyecto/Evidencias%20de%20sistema/DOCKER.md)**

### Servicios Incluidos

- **Frontend**: Next.js en puerto 3000
- **Backend**: API Express en puerto 3001
- **PostgreSQL**: Base de datos en puerto 5432

## Licencia

Este proyecto fue desarrollado como parte del proyecto APT (Aplicación de Proyecto Tecnológico) para LL Consulting.

**Versión**: 1.0.0  
**Última actualización**: Noviembre 2025
