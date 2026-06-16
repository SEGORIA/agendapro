import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export function isEmailConfigured() {
  return !!resend;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}

export async function sendEmail({ to, subject, html, fromName = "AgendaPro" }: SendEmailOptions) {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not configured — skipping send to ${to}`);
    return;
  }

  const from = `${fromName} <onboarding@resend.dev>`;

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    console.error("[email] Resend error:", error);
    throw error;
  }
}

// HTML template premium, compatible con clientes de correo
export function buildEmailHtml({
  tenantName,
  tenantColor = "#6366f1",
  preheader,
  body,
}: {
  tenantName: string;
  tenantColor?: string;
  preheader: string;
  body: string;
}) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${preheader}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <!-- preheader hidden -->
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header con logo / nombre del negocio -->
          <tr>
            <td align="center" style="padding:0 0 24px 0;">
              <div style="display:inline-block;background:${tenantColor};border-radius:12px;padding:10px 20px;">
                <span style="color:#fff;font-weight:700;font-size:18px;letter-spacing:-0.3px;">${tenantName}</span>
              </div>
            </td>
          </tr>

          <!-- Card principal -->
          <tr>
            <td style="background:#1e293b;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
              <div style="padding:36px 40px;">
                ${body}
              </div>

              <!-- Divider -->
              <div style="height:1px;background:rgba(255,255,255,0.06);margin:0 40px;"></div>

              <!-- Footer de la card -->
              <div style="padding:20px 40px;text-align:center;">
                <span style="color:#475569;font-size:12px;">Enviado por AgendaPro · Tu plataforma de agendamiento</span>
              </div>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td align="center" style="padding:24px 0 0 0;">
              <span style="color:#334155;font-size:11px;">© ${new Date().getFullYear()} AgendaPro · Construido por Alma Agencia Creativa</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
