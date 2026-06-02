import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '@/config';
import { Logger } from '@/utils/logger';
import {
  Solicitud,
  Contacto,
  Cliente,
  TipoServicio,
  Usuario,
  DescripcionCargo,
  Cargo,
} from '@/models';

export interface NewSolicitudEmailData {
  solicitudId: number;
  cargo: string;
  cliente: string;
  tipoServicio: string;
  vacantes: number;
  fechaIngreso: string;
  plazoMaximo?: string;
  consultorNombre: string;
  consultorEmail: string;
  link: string;
  candidatosCount?: number;
}

let transporter: Transporter | null = null;
let transporterKey = '';

/** Lee .env en cada envío (evita quedar con config vieja si el servidor no se reinició). */
function getMailSettings() {
  const enabledRaw = (process.env.MAIL_ENABLED ?? '').trim().toLowerCase();
  const enabled = enabledRaw === 'true' || enabledRaw === '1' || enabledRaw === 'yes';
  return {
    enabled,
    host: (process.env.SMTP_HOST ?? '').trim(),
    port: parseInt(process.env.SMTP_PORT || '2525', 10),
    user: (process.env.SMTP_USER ?? '').trim(),
    pass: (process.env.SMTP_PASS ?? '').trim(),
    from: (process.env.MAIL_FROM ?? config.mail.from).trim(),
  };
}

export function logMailConfigStatus(): void {
  const m = getMailSettings();
  if (!m.enabled) {
    Logger.info('Correo: desactivado (MAIL_ENABLED no es true)');
    return;
  }
  if (!m.host || !m.user || !m.pass) {
    Logger.warn(
      `Correo: MAIL_ENABLED=true pero faltan variables (host=${m.host ? 'ok' : 'vacío'}, user=${m.user ? 'ok' : 'vacío'}, pass=${m.pass ? 'ok' : 'vacío'})`
    );
    return;
  }
  Logger.info(`Correo: activo vía ${m.host}:${m.port} (bandeja Mailtrap / SMTP)`);
}

function getTransporter(): Transporter | null {
  const m = getMailSettings();
  if (!m.enabled) {
    Logger.info('Correo omitido: MAIL_ENABLED no está en true');
    return null;
  }
  if (!m.host || !m.user || !m.pass) {
    Logger.warn(
      `Correo omitido: faltan SMTP_HOST, SMTP_USER o SMTP_PASS (host=${Boolean(m.host)}, user=${Boolean(m.user)}, pass=${Boolean(m.pass)})`
    );
    return null;
  }

  const key = `${m.host}:${m.port}:${m.user}`;
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: m.host,
      port: m.port,
      auth: { user: m.user, pass: m.pass },
    });
    transporterKey = key;
  }
  return transporter;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildNewSolicitudHtml(data: NewSolicitudEmailData): string {
  const rows = [
    ['Solicitud', `#${data.solicitudId}`],
    ['Cargo', data.cargo],
    ['Cliente', data.cliente],
    ['Tipo de servicio', data.tipoServicio],
    ['Vacantes', String(data.vacantes)],
    ['Fecha de ingreso', data.fechaIngreso],
  ];
  if (data.plazoMaximo) rows.push(['Plazo máximo', data.plazoMaximo]);
  if (data.candidatosCount != null && data.candidatosCount > 0) {
    rows.push(['Candidatos cargados', String(data.candidatosCount)]);
  }

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">${escapeHtml(label)}</td>` +
        `<td style="padding:8px 12px;font-size:14px;border-bottom:1px solid #e2e8f0;"><strong>${escapeHtml(value)}</strong></td></tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:#1e40af;padding:24px 28px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Nueva solicitud asignada</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.5;">
            Hola <strong>${escapeHtml(data.consultorNombre)}</strong>,
          </p>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.5;">
            Se te ha asignado una nueva solicitud en LL Consulting. Revisa el detalle a continuación:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:6px;">
            ${tableRows}
          </table>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${escapeHtml(data.link)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:15px;font-weight:600;">
              Ver solicitud
            </a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.4;">
            Si el botón no funciona, copia este enlace en tu navegador:<br>
            <a href="${escapeHtml(data.link)}" style="color:#2563eb;word-break:break-all;">${escapeHtml(data.link)}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildNewSolicitudText(data: NewSolicitudEmailData): string {
  const lines = [
    `Hola ${data.consultorNombre},`,
    '',
    'Se te ha asignado una nueva solicitud en LL Consulting.',
    '',
    `Solicitud: #${data.solicitudId}`,
    `Cargo: ${data.cargo}`,
    `Cliente: ${data.cliente}`,
    `Tipo de servicio: ${data.tipoServicio}`,
    `Vacantes: ${data.vacantes}`,
    `Fecha de ingreso: ${data.fechaIngreso}`,
  ];
  if (data.plazoMaximo) lines.push(`Plazo máximo: ${data.plazoMaximo}`);
  if (data.candidatosCount != null && data.candidatosCount > 0) {
    lines.push(`Candidatos cargados: ${data.candidatosCount}`);
  }
  lines.push('', `Ver solicitud: ${data.link}`);
  return lines.join('\n');
}

function formatDateCL(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Carga datos de la solicitud y envía correo al consultor asignado.
 */
export async function notifyConsultorNewSolicitud(
  solicitudId: number,
  options?: { candidatosCount?: number }
): Promise<void> {
  const solicitud = await Solicitud.findByPk(solicitudId, {
    include: [
      {
        model: Contacto,
        as: 'contacto',
        include: [{ model: Cliente, as: 'cliente' }],
      },
      { model: TipoServicio, as: 'tipoServicio' },
      {
        model: DescripcionCargo,
        as: 'descripcionCargo',
        include: [{ model: Cargo, as: 'cargo' }],
      },
      {
        model: Usuario,
        as: 'usuario',
        attributes: ['rut_usuario', 'nombre_usuario', 'apellido_usuario', 'email_usuario'],
      },
    ],
  });

  if (!solicitud) {
    Logger.warn(`notifyConsultorNewSolicitud: solicitud ${solicitudId} no encontrada`);
    return;
  }

  const usuario = solicitud.get('usuario') as Usuario | undefined;
  const to = usuario?.email_usuario?.trim();
  if (!to) {
    Logger.warn(`notifyConsultorNewSolicitud: consultor sin email para solicitud ${solicitudId}`);
    return;
  }

  const contacto = solicitud.get('contacto') as (Contacto & { cliente?: Cliente }) | null;
  const cliente = contacto?.cliente?.nombre_cliente ?? '—';

  const tipoServicio = solicitud.get('tipoServicio') as TipoServicio | undefined;
  const descripcionCargo = solicitud.get('descripcionCargo') as
    | (DescripcionCargo & { cargo?: Cargo })
    | undefined;
  const cargo =
    descripcionCargo?.cargo?.nombre_cargo ??
    descripcionCargo?.descripcion_cargo ??
    '—';

  const consultorNombre = usuario
    ? `${usuario.nombre_usuario} ${usuario.apellido_usuario}`.trim()
    : 'Consultor';

  const baseUrl = config.server.frontendUrl.replace(/\/$/, '');
  const link = `${baseUrl}/consultor/proceso/${solicitudId}`;

  const emailData: NewSolicitudEmailData = {
    solicitudId,
    cargo,
    cliente: typeof cliente === 'string' ? cliente : '—',
    tipoServicio: tipoServicio?.nombre_servicio ?? solicitud.codigo_servicio,
    vacantes: descripcionCargo?.num_vacante ?? 1,
    fechaIngreso: formatDateCL(solicitud.fecha_ingreso_solicitud),
    plazoMaximo: solicitud.plazo_maximo_solicitud
      ? formatDateCL(solicitud.plazo_maximo_solicitud)
      : undefined,
    consultorNombre,
    consultorEmail: to,
    link,
    candidatosCount: options?.candidatosCount,
  };

  await sendNewSolicitudEmail(emailData);
}

export async function sendNewSolicitudEmail(data: NewSolicitudEmailData): Promise<void> {
  const mail = getMailSettings();
  const transport = getTransporter();
  if (!transport) {
    return;
  }

  const subject = `Nueva solicitud #${data.solicitudId} – ${data.cargo}`;

  try {
    await transport.sendMail({
      from: mail.from,
      to: data.consultorEmail,
      subject,
      text: buildNewSolicitudText(data),
      html: buildNewSolicitudHtml(data),
    });
    Logger.info(`Correo enviado: nueva solicitud #${data.solicitudId} → ${data.consultorEmail}`);
  } catch (error) {
    Logger.error(`Error enviando correo solicitud #${data.solicitudId}:`, error);
    throw error;
  }
}
