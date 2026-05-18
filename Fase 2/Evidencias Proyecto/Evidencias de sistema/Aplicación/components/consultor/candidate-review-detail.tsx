"use client"

import type { Candidate } from "@/lib/types"
import { formatDateShort } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const display = value === undefined || value === null || value === "" ? "—" : String(value)
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="break-words">{display}</span>
    </p>
  )
}

interface CandidateReviewDetailProps {
  candidate: Candidate
  cargoLabel?: string
}

export function CandidateReviewDetail({ candidate, cargoLabel }: CandidateReviewDetailProps) {
  const renderStars = (rating: number) => (
    <span className="text-amber-500">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>
  )

  return (
    <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-1">
      <Section title="Datos personales">
        <Field label="Nombre completo" value={candidate.name} />
        <Field label="RUT" value={candidate.rut} />
        <Field label="Correo" value={candidate.email} />
        <Field label="Teléfono" value={candidate.phone} />
        <Field label="Fecha de nacimiento" value={candidate.birth_date ? formatDateShort(candidate.birth_date) : undefined} />
        <Field label="Edad" value={candidate.age} />
        <Field label="Región" value={candidate.region} />
        <Field label="Comuna" value={candidate.comuna} />
        <Field label="Nacionalidad" value={candidate.nacionalidad} />
        <Field label="Rubro" value={candidate.rubro} />
        <Field label="Credencial discapacidad" value={candidate.has_disability_credential ? "Sí" : "No"} />
        <Field label="Licencia de conducir" value={candidate.licencia ? "Sí" : "No"} />
        {cargoLabel && <Field label="Cargo del proceso" value={cargoLabel} />}
      </Section>

      <Separator />

      <Section title="Profesiones">
        {candidate.professions && candidate.professions.length > 0 ? (
          <ul className="space-y-2 list-none pl-0">
            {candidate.professions.map((p, i) => (
              <li key={i} className="rounded-md border bg-muted/20 p-2">
                <Field label="Profesión" value={p.profession} />
                <Field label="Institución" value={p.institution} />
                <Field label="Fecha obtención" value={p.date ? formatDateShort(p.date) : undefined} />
              </li>
            ))}
          </ul>
        ) : (
          <>
            <Field label="Profesión" value={candidate.profession} />
            <Field label="Institución" value={candidate.profession_institution} />
            <Field label="Fecha obtención" value={candidate.profession_date ? formatDateShort(candidate.profession_date) : undefined} />
          </>
        )}
      </Section>

      <Separator />

      <Section title="Capacitación y postgrados">
        {candidate.education && candidate.education.length > 0 ? (
          <ul className="space-y-2 list-none pl-0">
            {candidate.education.map((edu) => (
              <li key={edu.id} className="rounded-md border bg-muted/20 p-2">
                <Field label="Título / programa" value={edu.title} />
                <Field label="Institución" value={edu.institution} />
                <Field label="Fecha término" value={edu.completion_date ? formatDateShort(edu.completion_date) : undefined} />
                <Field label="Fecha inicio" value={edu.start_date ? formatDateShort(edu.start_date) : undefined} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Sin registros de capacitación.</p>
        )}
      </Section>

      <Separator />

      <Section title="Experiencia laboral">
        {candidate.work_experience && candidate.work_experience.length > 0 ? (
          <ul className="space-y-2 list-none pl-0">
            {candidate.work_experience.map((exp) => (
              <li key={exp.id} className="rounded-md border bg-muted/20 p-2">
                <Field label="Empresa" value={exp.company} />
                <Field label="Cargo" value={exp.position} />
                <Field label="Desde" value={exp.start_date ? formatDateShort(exp.start_date) : undefined} />
                <Field label="Hasta" value={exp.is_current ? "Actualidad" : exp.end_date ? formatDateShort(exp.end_date) : undefined} />
                {exp.description && <Field label="Funciones" value={exp.description} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Sin experiencia registrada.</p>
        )}
      </Section>

      <Separator />

      <Section title="Datos de postulación">
        <Field label="Portal origen" value={candidate.source_portal} />
        <div className="text-sm flex items-center gap-1 flex-wrap">
          <span className="text-muted-foreground">Valoración consultor:</span>
          {renderStars(candidate.consultant_rating || 0)}
        </div>
        <Field label="Motivación" value={candidate.motivation || candidate.portal_responses?.motivation} />
        <Field
          label="Expectativa de renta"
          value={
            candidate.salary_expectation != null
              ? `$${Number(candidate.salary_expectation).toLocaleString("es-CL")}`
              : candidate.portal_responses?.salary_expectation
          }
        />
        <Field label="Disponibilidad" value={candidate.availability || candidate.portal_responses?.availability} />
        <Field label="Situación familiar" value={candidate.portal_responses?.family_situation} />
        <Field label="Nivel de inglés" value={candidate.portal_responses?.english_level} />
        <Field label="Herramientas / software" value={candidate.portal_responses?.software_tools} />
        <Field label="Comentario del consultor" value={candidate.consultant_comment} />
        <Field label="Estado Módulo 2" value={candidate.presentation_status} />
      </Section>
    </div>
  )
}
