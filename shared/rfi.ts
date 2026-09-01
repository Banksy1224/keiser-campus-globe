import { z } from "zod";

/** Free-text option always appended to a campus's signature programs. */
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
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, { en: string; es: string }> = {
  "high-school": { en: "High school", es: "Escuela secundaria" },
  "some-college": { en: "Some college", es: "Algo de universidad" },
  associate: { en: "Associate degree", es: "Grado de asociado" },
  bachelors: { en: "Bachelor's degree", es: "Licenciatura" },
  masters: { en: "Master's degree", es: "Maestría" },
  doctorate: { en: "Doctorate", es: "Doctorado" },
  other: { en: "Other", es: "Otro" },
};

export const RFI_LANGUAGES = ["en", "es"] as const;
export type RfiLanguage = (typeof RFI_LANGUAGES)[number];

export const RFI_MODALITIES = ["On-campus", "Online", "Graduate"] as const;
export type RfiModality = (typeof RFI_MODALITIES)[number];

/**
 * Campuses with no published CAMPUSES[].email. Never invent a new inbox —
 * route to the related corridor admissions address, or DEFAULT_RFI_EMAIL.
 *
 *   flagship-wpb     → West Palm Beach career campus (same city; Flagship has no listed inbox)
 *   graduate-school  → official Graduate School admissions inbox (keiseruniversity.edu/graduate-school/contact)
 *   online-global    → Fort Lauderdale main campus (Online HQ is on the same corridor)
 *   shanghai         → no published China admissions inbox; FTL main campus last resort
 *                      unless DEFAULT_RFI_EMAIL is set (checked before this map)
 */
export const RFI_EMAIL_FALLBACKS: Record<string, string> = {
  "flagship-wpb": "AdmissionsInfoWPB@keiseruniversity.edu",
  "graduate-school": "AdmissionsInfoGRAD@keiseruniversity.edu",
  "online-global": "AdmissionsInfoFTL@keiseruniversity.edu",
  shanghai: "AdmissionsInfoFTL@keiseruniversity.edu",
};

const SPANISH_ALIAS_HINTS = [
  "en linea",
  "en línea",
  "español",
  "espanol",
  "spanish",
  "latin division",
];

export function isSpanishAliasQuery(query: string | undefined | null): boolean {
  const q = (query ?? "").toLowerCase();
  if (!q) return false;
  return SPANISH_ALIAS_HINTS.some((h) => q.includes(h));
}

/** Pins that show an EN/ES toggle on the RFI sheet. */
export function rfiShowsLanguageToggle(campus: { id: string; region: string }): boolean {
  return (
    campus.region === "latin-america" ||
    campus.region === "asia" ||
    campus.region === "global" ||
    campus.id === "managua" ||
    campus.id === "san-salvador" ||
    campus.id === "online-global"
  );
}

/**
 * Pins that show an EN/ES toggle on the selected-campus panel.
 * Latin America + Online only — Florida, Graduate School, and Shanghai stay English.
 */
export function panelShowsLanguageToggle(campus: { id: string; region: string }): boolean {
  return campus.region === "latin-america" || campus.id === "online-global";
}

/**
 * Default sheet language.
 * Spanish: Managua, San Salvador, or Online when the user arrived via En Línea / Spanish aliases.
 * English: LAC San Marcos (English-curriculum), Shanghai, Florida, Graduate School, Online otherwise.
 */
export function defaultRfiLanguage(
  campus: { id: string },
  searchQuery?: string | null,
): RfiLanguage {
  if (campus.id === "managua" || campus.id === "san-salvador") return "es";
  if (campus.id === "online-global" && isSpanishAliasQuery(searchQuery)) return "es";
  return "en";
}

/** Same default as the RFI sheet — one heuristic, two surfaces. */
export const defaultPanelLanguage = defaultRfiLanguage;

/**
 * Modality is locked from the selected pin — not an editable dropdown.
 *   online-global     → Online
 *   graduate-school   → Online when the blurb says 100% online, else Graduate
 *   latin-america/asia/florida career & flagship → On-campus
 */
export function lockedModality(campus: {
  id: string;
  region: string;
  description: string;
}): RfiModality {
  if (campus.id === "online-global") return "Online";
  if (campus.id === "graduate-school") {
    return /100%\s*online/i.test(campus.description) ? "Online" : "Graduate";
  }
  return "On-campus";
}

export function defaultEducationLevel(campusId: string): EducationLevel {
  return campusId === "graduate-school" ? "bachelors" : "high-school";
}

export type AcademicTerm = "Spring" | "Summer" | "Fall";

const TERM_CYCLE: { name: AcademicTerm; startMonth: number; endMonth: number }[] = [
  { name: "Spring", startMonth: 0, endMonth: 3 },
  { name: "Summer", startMonth: 4, endMonth: 6 },
  { name: "Fall", startMonth: 7, endMonth: 11 },
];

/** Next few Keiser-style terms from `now`. Never hardcodes a stale year. */
export function upcomingStartTerms(now: Date = new Date(), count = 4): string[] {
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentAbs = year * 12 + month;
  const out: string[] = [];
  for (let y = year; y <= year + 3 && out.length < count; y++) {
    for (const term of TERM_CYCLE) {
      if (y * 12 + term.endMonth < currentAbs) continue;
      out.push(`${term.name} ${y}`);
      if (out.length >= count) break;
    }
  }
  return out;
}

const phoneDigits = (value: string) => (value.match(/\d/g) ?? []).length;

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
  /** Honeypot — must be empty. Bots that fill it are dropped. */
  hpWebsite: z.string().max(200).optional(),
});

export type RfiInquiryInput = z.infer<typeof rfiInquirySchema>;

export const rfiContactStepSchema = rfiInquirySchema.pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  tcpaConsent: true,
});

export type RfiDispatchFlags = {
  emailed: boolean;
  webhooked: boolean;
  smtpConfigured: boolean;
  persisted: boolean;
  durable: boolean;
};

export type RfiSubmitResponse = RfiDispatchFlags & {
  ok: true;
  id: number;
};

/**
 * Resolve the admissions inbox.
 * 1. Published CAMPUSES[].email
 * 2. DEFAULT_RFI_EMAIL for campuses with no corridor inbox (Shanghai)
 * 3. Explicit corridor fallback map
 * 4. DEFAULT_RFI_EMAIL as last resort
 */
export function resolveRfiDestinationEmail(
  campus: { id: string; email?: string } | undefined,
  defaultEmail: string | undefined,
): string | null {
  const published = campus?.email?.trim();
  if (published) return published;
  const envDefault = defaultEmail?.trim() || "";
  if (campus?.id === "shanghai" && envDefault) return envDefault;
  const fallback = campus ? RFI_EMAIL_FALLBACKS[campus.id] : undefined;
  if (fallback) return fallback;
  return envDefault || null;
}
