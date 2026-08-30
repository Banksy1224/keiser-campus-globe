import { z } from "zod";

export const OTHER_PROGRAM = "Not sure / other";
export const RFI_SOURCE = "campus-tour";
export const RFI_UTM_SOURCE = "campus-tour";

export const EDUCATION_LEVELS = [
  "high-school",
  "some-college",
  "associate",
  "bachelors",
  "masters",
  "doctorate",
  "other",
];

export const EDUCATION_LEVEL_LABELS = {
  "high-school": { en: "High school", es: "Escuela secundaria" },
  "some-college": { en: "Some college", es: "Algo de universidad" },
  associate: { en: "Associate degree", es: "Grado de asociado" },
  bachelors: { en: "Bachelor's degree", es: "Licenciatura" },
  masters: { en: "Master's degree", es: "Maestría" },
  doctorate: { en: "Doctorate", es: "Doctorado" },
  other: { en: "Other", es: "Otro" },
};

export const RFI_LANGUAGES = ["en", "es"];
export const RFI_MODALITIES = ["On-campus", "Online", "Graduate"];

export const RFI_EMAIL_FALLBACKS = {
  "flagship-wpb": "AdmissionsInfoWPB@keiseruniversity.edu",
  "graduate-school": "AdmissionsInfoFTL@keiseruniversity.edu",
  "online-global": "AdmissionsInfoFTL@keiseruniversity.edu",
  shanghai: "AdmissionsInfoFTL@keiseruniversity.edu",
};

export function lockedModality(campus) {
  if (campus.id === "online-global") return "Online";
  if (campus.id === "graduate-school") {
    return /100%\s*online/i.test(campus.description) ? "Online" : "Graduate";
  }
  return "On-campus";
}

const TERM_CYCLE = [
  { name: "Spring", startMonth: 0, endMonth: 3 },
  { name: "Summer", startMonth: 4, endMonth: 6 },
  { name: "Fall", startMonth: 7, endMonth: 11 },
];

export function upcomingStartTerms(now = new Date(), count = 4) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentAbs = year * 12 + month;
  const out = [];
  for (let y = year; y <= year + 3 && out.length < count; y++) {
    for (const term of TERM_CYCLE) {
      if (y * 12 + term.endMonth < currentAbs) continue;
      out.push(`${term.name} ${y}`);
      if (out.length >= count) break;
    }
  }
  return out;
}

const phoneDigits = (value) => (value.match(/\d/g) ?? []).length;

export const rfiInquirySchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number")
    .max(40)
    .refine((v) => phoneDigits(v) >= 7, "Enter a valid phone number"),
  tcpaConsent: z.literal(true, {
    errorMap: () => ({ message: "Consent is required to request information" }),
  }),
  campusId: z.string().trim().min(1),
  campusName: z.string().trim().min(1),
  program: z.string().trim().min(1, "Select a program").max(160),
  startTerm: z.string().trim().min(1, "Select a start term").max(40),
  educationLevel: z.enum(EDUCATION_LEVELS),
  modality: z.enum(RFI_MODALITIES),
  language: z.enum(RFI_LANGUAGES),
  source: z.literal(RFI_SOURCE),
  utmSource: z.string().trim().min(1).max(80).default(RFI_UTM_SOURCE),
  utmMedium: z.string().trim().max(80).optional(),
  utmCampaign: z.string().trim().max(80).optional(),
  campusIdUtm: z.string().trim().max(80).optional(),
  submittedAt: z.string().datetime().optional(),
  hpWebsite: z.string().max(200).optional(),
});

export function resolveRfiDestinationEmail(campus, defaultEmail) {
  const published = campus?.email?.trim();
  if (published) return published;
  const envDefault = defaultEmail?.trim() || "";
  if (campus?.id === "shanghai" && envDefault) return envDefault;
  const fallback = campus ? RFI_EMAIL_FALLBACKS[campus.id] : undefined;
  if (fallback) return fallback;
  return envDefault || null;
}
