import fs from 'fs';
import path from 'path';
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

const BRAND = {
  primary: '#00bcd4',
  primaryDark: '#0891b2',
  secondary: '#1e3a8a',
  background: '#f1f5f9',
  card: '#ffffff',
  muted: '#64748b',
  border: '#e2e8f0',
  text: '#1e3a8a',
};

const LOGO_CID = 'llconsulting-logo';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'assets', 'email', 'llconsulting-logo.png'),
    path.join(process.cwd(), '..', 'Aplicación', 'public', 'images', 'llconsulting-logo.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function getLogoSrc(frontendUrl: string, hasEmbeddedLogo: boolean): string {
  if (hasEmbeddedLogo) return `cid:${LOGO_CID}`;
  const base = frontendUrl.replace(/\/$/, '');
  return `${base}/images/llconsulting-logo.png`;
}

function buildNewSolicitudHtml(data: NewSolicitudEmailData, logoSrc: string): string {
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
      ([label, value], index) => {
        const isLast = index === rows.length - 1;
        const border = isLast ? 'none' : `1px solid ${BRAND.border}`;
        return (
          `<tr>` +
          `<td style="padding:12px 16px;color:${BRAND.muted};font-size:14px;border-bottom:${border};width:42%;vertical-align:top;">${escapeHtml(label)}</td>` +
          `<td style="padding:12px 16px;color:${BRAND.text};font-size:14px;font-weight:600;border-bottom:${border};vertical-align:top;">${escapeHtml(value)}</td>` +
          `</tr>`
        );
      }
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva solicitud #${data.solicitudId}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${BRAND.card};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,138,0.08);border:1px solid ${BRAND.border};">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:32px 32px 20px;background:${BRAND.card};">
              <img src="${escapeHtml(logoSrc)}" alt="LL Consulting" width="220" style="display:block;max-width:220px;height:auto;margin:0 auto;" />
            </td>
          </tr>
          <!-- Franja de acento -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,${BRAND.secondary} 0%,${BRAND.primary} 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Título -->
          <tr>
            <td align="center" style="padding:28px 32px 8px;background:${BRAND.card};">
              <h1 style="margin:0;color:${BRAND.secondary};font-size:22px;font-weight:700;line-height:1.3;">Nueva solicitud asignada</h1>
              <p style="margin:10px 0 0;color:${BRAND.muted};font-size:14px;line-height:1.5;">Se te ha cargado un nuevo proceso de reclutamiento</p>
            </td>
          </tr>
          <!-- Cuerpo -->
          <tr>
            <td style="padding:8px 32px 24px;">
              <p style="margin:0 0 20px;color:${BRAND.text};font-size:15px;line-height:1.6;">
                Hola <strong style="color:${BRAND.secondary};">${escapeHtml(data.consultorNombre)}</strong>,
              </p>
              <p style="margin:0 0 24px;color:${BRAND.muted};font-size:15px;line-height:1.6;">
                Revisa el detalle de la solicitud y accede a la plataforma para comenzar su gestión.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};border-radius:10px;border:1px solid ${BRAND.border};margin-bottom:28px;">
                ${tableRows}
              </table>
              <!-- Botón centrado -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" bgcolor="${BRAND.primary}" style="border-radius:8px;background:${BRAND.primary};">
                          <a href="${escapeHtml(data.link)}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.2px;border-radius:8px;background:${BRAND.primary};">
                            Ver solicitud
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.6;text-align:center;">
                Si el botón no funciona, copia este enlace en tu navegador:<br>
                <a href="${escapeHtml(data.link)}" style="color:${BRAND.primaryDark};word-break:break-all;text-decoration:underline;">${escapeHtml(data.link)}</a>
              </p>
            </td>
          </tr>
          <!-- Pie -->
          <tr>
            <td align="center" style="padding:20px 32px 28px;background:${BRAND.background};border-top:1px solid ${BRAND.border};">
              <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.5;">
                LL Consulting · Plataforma de Reclutamiento<br>
                Este es un mensaje automático, por favor no respondas a este correo.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
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
  const logoPath = resolveLogoPath();
  const frontendUrl = config.server.frontendUrl;
  const logoSrc = getLogoSrc(frontendUrl, Boolean(logoPath));

  try {
    await transport.sendMail({
      from: mail.from,
      to: data.consultorEmail,
      subject,
      text: buildNewSolicitudText(data),
      html: buildNewSolicitudHtml(data, logoSrc),
      attachments: logoPath
        ? [{ filename: 'llconsulting-logo.png', path: logoPath, cid: LOGO_CID }]
        : undefined,
    });
    Logger.info(`Correo enviado: nueva solicitud #${data.solicitudId} → ${data.consultorEmail}`);
  } catch (error) {
    Logger.error(`Error enviando correo solicitud #${data.solicitudId}:`, error);
    throw error;
  }
}
