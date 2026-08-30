import {
  EDUCATION_LEVELS,
  OTHER_PROGRAM,
  RFI_SOURCE,
  RFI_UTM_SOURCE,
  lockedModality,
  resolveRfiDestinationEmail,
  rfiInquirySchema,
  upcomingStartTerms,
} from "./rfi-schema.js";
import { campusById } from "./rfi-campuses.js";
import { persistRfiInquiry, updateRfiDispatch } from "./rfi-store.js";
import { dispatchRfi, isSmtpReady } from "./rfi-dispatch.js";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const hits = new Map();

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function allowRequest(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function flattenZod(error) {
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export function registerRfiRoutes(app) {
  app.post("/api/rfi", async (req, res) => {
    const ip = clientIp(req);
    if (!allowRequest(ip)) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    const parsed = rfiInquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", fields: flattenZod(parsed.error) });
    }

    const input = parsed.data;

    if (input.hpWebsite && input.hpWebsite.trim().length > 0) {
      console.warn("RFI abuse: honeypot filled");
      return res.json({
        ok: true,
        id: 0,
        emailed: false,
        webhooked: false,
        smtpConfigured: isSmtpReady(),
        persisted: false,
        durable: false,
      });
    }

    const campus = campusById(input.campusId);
    if (!campus) {
      return res.status(400).json({ error: "Unknown campus", fields: { campusId: "Unknown campus" } });
    }

    const programs = new Set([...campus.programs, OTHER_PROGRAM]);
    const programOk =
      programs.has(input.program) ||
      (input.program.startsWith(`${OTHER_PROGRAM}:`) && input.program.length <= 160);
    if (!programOk) {
      return res.status(400).json({
        error: "Program is not offered at this campus",
        fields: { program: "Choose a signature program for this campus" },
      });
    }

    const terms = upcomingStartTerms();
    if (!terms.includes(input.startTerm)) {
      return res.status(400).json({
        error: "Start term is not valid",
        fields: { startTerm: "Choose an upcoming term" },
      });
    }

    if (!EDUCATION_LEVELS.includes(input.educationLevel)) {
      return res.status(400).json({ error: "Invalid education level" });
    }

    const modality = lockedModality(campus);
    const destinationEmail = resolveRfiDestinationEmail(campus, process.env.DEFAULT_RFI_EMAIL);
    if (!destinationEmail) {
      console.error(`RFI destination: no inbox for campus ${campus.id}; inquiry will still be saved`);
    }

    const submittedAt = input.submittedAt ? new Date(input.submittedAt) : new Date();

    const { row, durable } = await persistRfiInquiry({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      tcpaConsent: true,
      campusId: campus.id,
      campusName: campus.name,
      program: input.program,
      startTerm: input.startTerm,
      educationLevel: input.educationLevel,
      modality,
      language: input.language,
      source: RFI_SOURCE,
      utmSource: RFI_UTM_SOURCE,
      utmMedium: input.utmMedium ?? null,
      utmCampaign: input.utmCampaign ?? null,
      destinationEmail,
      emailed: false,
      webhooked: false,
      smtpConfigured: isSmtpReady(),
      submittedAt,
    });

    console.log(`RFI saved id=${row.id} campus=${campus.id} durable=${durable}`);

    const dispatch = await dispatchRfi(row);
    if (dispatch.emailed || dispatch.webhooked) {
      await updateRfiDispatch(row.id, { emailed: dispatch.emailed, webhooked: dispatch.webhooked }, durable);
    }

    return res.json({
      ok: true,
      id: row.id,
      emailed: dispatch.emailed,
      webhooked: dispatch.webhooked,
      smtpConfigured: dispatch.smtpConfigured,
      persisted: true,
      durable,
    });
  });
}
