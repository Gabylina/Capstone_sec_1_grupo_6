# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LL Consulting – Sistema de Gestión de Procesos de Reclutamiento y Selección. A full-stack recruitment management system covering the entire hiring lifecycle: job requests, candidate management, psycho-labor evaluations, automated alerts, and reporting.

## Repository Layout

All active code lives under `Fase 2/Evidencias Proyecto/Evidencias de sistema/`:

- `Aplicación/` — Next.js 14 frontend (TypeScript + TailwindCSS)
- `Base de datos/` — Express backend (TypeScript + Sequelize + PostgreSQL)
- `docker-compose.yml` — Runs frontend (3000), backend (3001), and PostgreSQL (5432)

## Commands

All commands assume you've `cd`'d into the relevant directory first.

### Frontend
```bash
cd "Fase 2/Evidencias Proyecto/Evidencias de sistema/Aplicación"
npm run dev          # Dev server on :3000
npm run build        # Production build
npm run lint         # ESLint
```

### Backend
```bash
cd "Fase 2/Evidencias Proyecto/Evidencias de sistema/Base de datos"
npm run dev          # Nodemon + ts-node watch
npm run build        # Compile TS → dist/
npm start            # Run compiled server
npm run migrate      # Apply pending Sequelize migrations
npm run seed         # Seed the database
```

### Docker (full stack)
```bash
cd "Fase 2/Evidencias Proyecto/Evidencias de sistema"
docker-compose up --build
```

## Environment Variables

**Frontend** (`Aplicación/.env`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend** — copy `Base de datos/env.example` to `Base de datos/.env` and fill in:
- `DB_*` — PostgreSQL connection (host, port, name, user, password)
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `FRONTEND_URL=http://localhost:3000`
- `SMTP_*` — Nodemailer/Mailtrap credentials
- `UPLOAD_PATH`, `MAX_FILE_SIZE`

## Architecture

### Request Flow
```
Next.js pages/components
  → hooks (useAuth, useSolicitudes, …)
  → lib/api.ts (axios, NEXT_PUBLIC_API_URL)
  → Express routes (32 route files)
  → JWT auth middleware
  → Controllers (validate + call services)
  → Services (business logic, email, hito calculations)
  → Sequelize models (37 models)
  → PostgreSQL (+ audit triggers → LogCambios)
```

### Frontend (`Aplicación/`)
- `app/` — Next.js App Router. Subdirectories map to roles: `admin/`, `consultor/`, `cliente/`, `alertas/`, `login/`, `perfil/`.
- `components/` — Radix UI–based primitives in `ui/`; role-specific components in `admin/`, `consultor/`, `auth/`.
- `hooks/` — All data fetching and auth state live here (`auth.tsx` exports `useAuth()`).
- `lib/api.ts` — Single Axios instance; all API calls go through here.
- Next.js rewrites in `next.config.mjs` proxy `/api/*` → backend.

### Backend (`Base de datos/src/`)
- `server.ts` → `app.ts` — entry points. Middleware chain: Helmet → CORS → rate-limit → compression → body parsing → Morgan → connectionManager → captureUserContext → routes.
- `routes/` — 32 Express routers, one per domain entity.
- `controllers/` — Thin: validate input, call service, send response.
- `services/` — Business logic layer; `emailService.ts`, `hitoSolicitudService.ts` (milestone SLA enforcement), `feriadosService.ts` (Chilean public holiday calculation).
- `models/` — Sequelize models with associations. Key models: `Solicitud`, `Candidato`, `Postulacion`, `EvaluacionPsicolaboral`, `Contratacion`, `HitoSolicitud`, `LogCambios`.
- `middleware/auth.ts` — JWT verification and role-based access. Roles: `1` = admin, `2` = consultor, `3` = cliente.
- `database/migrations/` + `database/seeds/` — All schema changes must go through Sequelize migrations.
- `database/triggers/` — SQL audit triggers (`log_cambios_triggers_concatenados.sql`). Install via `npx ts-node scripts/installLogTriggers.ts`.

### Path Aliases
Backend TypeScript uses `@/` mapped to `src/`. Defined in `Base de datos/tsconfig.json` and resolved at runtime via `tsc-alias` after build.

## Key Domain Concepts

The system models seven functional modules:

1. **Solicitudes y Cargos** — Client job requests and position descriptions
2. **Candidatos y Postulaciones** — Candidate registration and applications
3. **Presentación de Candidatos** — Submitting shortlists to clients
4. **Evaluación Psicolaboral** — Psychological evaluations and medical exams
5. **Gestión de Contrataciones** — Employment and onboarding tracking
6. **Alertas y Hitos** — SLA milestone enforcement with automatic alerts
7. **Reportes** — Dashboards, PDF exports (React PDF), Excel exports (xlsx)
