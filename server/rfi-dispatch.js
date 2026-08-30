import nodemailer from "nodemailer";
import { EDUCATION_LEVEL_LABELS } from "./rfi-schema.js";

export function isSmtpReady() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function destinationMode() {
  const raw = (process.env.RFI_DESTINATION || "auto").trim().toLowerCase();
  if (raw === "email" || raw === "webhook" || raw === "both") return raw;
  return "auto";
}

function educationLabel(level) {
  return EDUCATION_LEVEL_LABELS[level]?.en ?? level;
}

function formatEmailBody(inquiry) {
  const lines = [
    "New campus-tour request for information.",
    "",
    `Name: ${inquiry.firstName} ${inquiry.lastName}`,
    `Email: ${inquiry.email}`,
    `Phone: ${inquiry.phone}`,
    `TCPA consent: ${inquiry.tcpaConsent ? "yes" : "no"}`,
    "",
    `Campus: ${inquiry.campusName} (${inquiry.campusId})`,
    `Program: ${inquiry.program}`,
    `Start term: ${inquiry.startTerm}`,
    `Education level: ${educationLabel(inquiry.educationLevel)}`,
    `Modality: ${inquiry.modality}`,
    `Language: ${inquiry.language}`,
    "",
    `source=${inquiry.source}`,
    `utm_source=${inquiry.utmSource}`,
    `campus_id=${inquiry.campusId}`,
    `program=${inquiry.program}`,
    `modality=${inquiry.modality}`,
  ];
  if (inquiry.utmMedium) lines.push(`utm_medium=${inquiry.utmMedium}`);
  if (inquiry.utmCampaign) lines.push(`utm_campaign=${inquiry.utmCampaign}`);
  const submitted =
    inquiry.submittedAt instanceof Date ? inquiry.submittedAt : new Date(inquiry.submittedAt);
  lines.push("", `submitted_at=${submitted.toISOString()}`);
  return lines.join("\n");
}

function webhookPayload(inquiry) {
  const submitted =
    inquiry.submittedAt instanceof Date ? inquiry.submittedAt : new Date(inquiry.submittedAt);
  return {
    id: inquiry.id,
    firstName: inquiry.firstName,
    lastName: inquiry.lastName,
    email: inquiry.email,
    phone: inquiry.phone,
    tcpaConsent: inquiry.tcpaConsent,
    campusId: inquiry.campusId,
    campusName: inquiry.campusName,
    program: inquiry.program,
    startTerm: inquiry.startTerm,
    educationLevel: inquiry.educationLevel,
    modality: inquiry.modality,
    language: inquiry.language,
    source: inquiry.source,
    utm_source: inquiry.utmSource,
    utm_medium: inquiry.utmMedium,
    utm_campaign: inquiry.utmCampaign,
    campus_id: inquiry.campusId,
    submittedAt: submitted.toISOString(),
    destinationEmail: inquiry.destinationEmail,
  };
}

export const emailDestination = {
  name: "email",
  enabled() {
    if (destinationMode() === "webhook") return false;
    return isSmtpReady();
  },
  async send(inquiry) {
    const to = inquiry.destinationEmail;
    if (!to) return { ok: false, warning: "No destination admissions email resolved" };
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth:
        process.env.SMTP_USER || process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      replyTo: inquiry.email,
      subject: `Campus tour RFI · ${inquiry.campusName} · ${inquiry.program}`,
      text: formatEmailBody(inquiry),
    });
    return { ok: true };
  },
};

export const webhookDestination = {
  name: "webhook",
  enabled() {
    if (destinationMode() === "email") return false;
    return Boolean(process.env.RFI_WEBHOOK_URL);
  },
  async send(inquiry) {
    const url = process.env.RFI_WEBHOOK_URL;
    if (!url) return { ok: false, warning: "RFI_WEBHOOK_URL is not set" };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload(inquiry)),
    });
    if (!res.ok) return { ok: false, warning: `Webhook responded ${res.status}` };
    return { ok: true };
  },
};

export async function dispatchRfi(inquiry) {
  const warnings = [];
  const smtpReady = isSmtpReady();
  let emailed = false;
  let webhooked = false;

  const destinations = [];
  if (emailDestination.enabled()) destinations.push(emailDestination);
  if (webhookDestination.enabled()) destinations.push(webhookDestination);

  if (!destinations.length) {
    if (!smtpReady) {
      console.warn(
        "RFI dispatch: SMTP is not configured (set SMTP_HOST and SMTP_FROM). Inquiry saved; email skipped.",
      );
      warnings.push("smtp_not_configured");
    }
    if (!process.env.RFI_WEBHOOK_URL && destinationMode() !== "email") {
      warnings.push("webhook_not_configured");
    }
    return { emailed, webhooked, smtpConfigured: smtpReady, warnings };
  }

  for (const dest of destinations) {
    try {
      const result = await dest.send(inquiry);
      if (result.ok) {
        if (dest.name === "email") emailed = true;
        if (dest.name === "webhook") webhooked = true;
      } else if (result.warning) {
        warnings.push(result.warning);
        console.error(`RFI dispatch: ${dest.name} skipped — ${result.warning}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      warnings.push(`${dest.name}_failed`);
      console.error(`RFI dispatch: ${dest.name} failed (${message})`);
    }
  }

  return { emailed, webhooked, smtpConfigured: smtpReady, warnings };
}
