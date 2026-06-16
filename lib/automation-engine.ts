import { prisma } from "@/lib/prisma";
import { sendEmail, buildEmailHtml } from "@/lib/email";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface AutomationContext {
  client: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  service: {
    name: string;
    durationMin: number;
  };
  appointment: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    notes?: string | null;
  };
  tenant: {
    id: string;
    name: string;
    primaryColor: string;
  };
}

function interpolate(template: string, ctx: AutomationContext): string {
  const appointmentDate = format(ctx.appointment.startsAt, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const appointmentTime = format(ctx.appointment.startsAt, "HH:mm", { locale: es });

  return template
    .replace(/\{\{client\.name\}\}/g, ctx.client.name)
    .replace(/\{\{client\.email\}\}/g, ctx.client.email ?? "")
    .replace(/\{\{client\.phone\}\}/g, ctx.client.phone ?? "")
    .replace(/\{\{service\.name\}\}/g, ctx.service.name)
    .replace(/\{\{service\.duration\}\}/g, String(ctx.service.durationMin))
    .replace(/\{\{appointment\.date\}\}/g, appointmentDate)
    .replace(/\{\{appointment\.time\}\}/g, appointmentTime)
    .replace(/\{\{appointment\.id\}\}/g, ctx.appointment.id)
    .replace(/\{\{tenant\.name\}\}/g, ctx.tenant.name);
}

async function executeAction(
  action: { type: string; config: Record<string, string> },
  ctx: AutomationContext
) {
  if (action.type === "send_email") {
    const { subject, body } = action.config;
    if (!subject || !body || !ctx.client.email) return;

    const interpolatedSubject = interpolate(subject, ctx);
    const interpolatedBody = interpolate(body, ctx);

    // Convertir saltos de línea en párrafos HTML
    const htmlBody = interpolatedBody
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => `<p style="margin:0 0 16px 0;color:#cbd5e1;font-size:15px;line-height:1.6;">${l}</p>`)
      .join("");

    const html = buildEmailHtml({
      tenantName: ctx.tenant.name,
      tenantColor: ctx.tenant.primaryColor,
      preheader: interpolatedSubject,
      body: `
        <h2 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#f1f5f9;">${interpolatedSubject}</h2>
        ${htmlBody}
        <div style="margin-top:28px;padding:20px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;">
          <p style="margin:0 0 4px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Detalles de tu cita</p>
          <p style="margin:0 0 4px 0;color:#f1f5f9;font-size:15px;font-weight:600;">${ctx.service.name}</p>
          <p style="margin:0;color:#94a3b8;font-size:13px;">
            ${format(ctx.appointment.startsAt, "EEEE d 'de' MMMM", { locale: es })} · ${format(ctx.appointment.startsAt, "HH:mm")} hs
          </p>
        </div>
      `,
    });

    await sendEmail({
      to: ctx.client.email,
      subject: interpolatedSubject,
      html,
      fromName: ctx.tenant.name,
    });

    console.log(`[automation] Email sent to ${ctx.client.email} (trigger: ${ctx.tenant.id})`);
  } else if (action.type === "send_whatsapp") {
    // WhatsApp requiere integración con Twilio/Meta Cloud API — pendiente
    console.log(`[automation] WhatsApp action not yet implemented — skipping`);
  }
}

/**
 * Dispara todas las automatizaciones activas del tenant para el evento dado.
 * Nunca lanza excepción — usa best-effort para no romper el flujo principal.
 */
export async function runAutomations(triggerEvent: string, ctx: AutomationContext) {
  try {
    const automations = await prisma.automation.findMany({
      where: { tenantId: ctx.tenant.id, triggerEvent, isActive: true },
    });

    if (automations.length === 0) return;

    for (const automation of automations) {
      try {
        const actions = JSON.parse(automation.actions) as { type: string; config: Record<string, string> }[];
        for (const action of actions) {
          await executeAction(action, ctx);
        }
      } catch (err) {
        console.error(`[automation] Error executing automation ${automation.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[automation] Error loading automations:", err);
  }
}
