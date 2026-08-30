// Program finder — filter campuses by Keiser University's official academic
// disciplines and degree types. Every signature program string in campus-data
// is mapped explicitly so matching stays exact. Do not invent programs.

import { CAMPUSES, type Campus } from "./campus-data";
import { isSpanishAliasQuery } from "../../shared/rfi";

export type DegreeLevel = "Associate" | "Bachelor's" | "Master's" | "Doctoral";

export const DEGREE_LEVELS: DegreeLevel[] = ["Associate", "Bachelor's", "Master's", "Doctoral"];

interface ProgramMeta {
  disciplines: string[];
  levels: DegreeLevel[];
}

const PROGRAM_INDEX: Record<string, ProgramMeta> = {
  // Nursing
  "Nursing, AS": { disciplines: ["Nursing"], levels: ["Associate"] },
  "Nursing, BSN (Traditional)": { disciplines: ["Nursing"], levels: ["Bachelor's"] },
  "Nursing, BSN (Accelerated)": { disciplines: ["Nursing"], levels: ["Bachelor's"] },
  "Family Nurse Practitioner, MSN FNP": { disciplines: ["Nursing"], levels: ["Master's"] },

  // Health Sciences
  "Biomedical Sciences (Pre-Med)": { disciplines: ["Health Sciences"], levels: ["Bachelor's"] },
  "Biomedical Sciences, BS (Pre-Med)": { disciplines: ["Health Sciences"], levels: ["Bachelor's"] },
  "Biomedical Sciences, BS (Pre-PA)": { disciplines: ["Health Sciences"], levels: ["Bachelor's"] },
  "Radiologic Technology, AS": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Diagnostic Medical Sonography, AS": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Physical Therapist Assistant, AS": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Occupational Therapy Assistant, AS": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Medical Assisting, AS": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Medical Assisting Science, AS": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Medical Laboratory Technician, AS": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Medical Laboratory Science, BS": { disciplines: ["Health Sciences"], levels: ["Bachelor's"] },
  "Surgical Technology, AS": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Chiropractic, DC": { disciplines: ["Health Sciences"], levels: ["Doctoral"] },

  // Health Care
  "Health Services Administration": { disciplines: ["Health Care"], levels: ["Bachelor's"] },

  // Business
  "Business Administration": { disciplines: ["Business"], levels: ["Bachelor's"] },
  "Business Administration, MBA": { disciplines: ["Business"], levels: ["Master's"] },
  "Business Administration, BA / MBA": { disciplines: ["Business"], levels: ["Bachelor's", "Master's"] },
  "Business Administration, BA (Mandarin)": { disciplines: ["Business"], levels: ["Bachelor's"] },
  "Business Administration, MBA (Mandarin)": { disciplines: ["Business"], levels: ["Master's"] },
  "Doctor of Business Administration, DBA": { disciplines: ["Business"], levels: ["Doctoral"] },
  "Licenciatura en Administración": { disciplines: ["Business"], levels: ["Bachelor's"] },
  "MBA (Spanish)": { disciplines: ["Business"], levels: ["Master's"] },
  "MBA Administración de Servicios de Salud": { disciplines: ["Business", "Health Care"], levels: ["Master's"] },
  "Public Administration, BA": { disciplines: ["Business"], levels: ["Bachelor's"] },

  // IT / Engineering
  "Information Technology": { disciplines: ["Information Technology"], levels: ["Bachelor's"] },
  "Cybersecurity, BS": { disciplines: ["Information Technology"], levels: ["Bachelor's"] },
  "Software Engineering, BS": { disciplines: ["Engineering", "Information Technology"], levels: ["Bachelor's"] },

  // Criminal Justice / Legal / Global
  "Criminal Justice": { disciplines: ["Criminal Justice"], levels: ["Bachelor's"] },
  "Global Affairs and International Relations, BA": { disciplines: ["Legal Studies"], levels: ["Bachelor's"] },

  // Psychology / Education / Counseling
  "Psychology, BA": { disciplines: ["Psychology"], levels: ["Bachelor's"] },
  "Psychology, BA / MS": { disciplines: ["Psychology"], levels: ["Bachelor's", "Master's"] },
  "Licenciatura en Psicología": { disciplines: ["Psychology"], levels: ["Bachelor's"] },
  "Applied Psychology, MS (Mandarin)": { disciplines: ["Psychology"], levels: ["Master's"] },
  "Industrial and Organizational Psychology, MS": { disciplines: ["Psychology"], levels: ["Master's"] },
  "Industrial and Organizational Psychology, MS (Mandarin)": { disciplines: ["Psychology"], levels: ["Master's"] },
  "Clinical Mental Health Counseling, MS": { disciplines: ["Psychology"], levels: ["Master's"] },
  "Education-Leadership, MSEd": { disciplines: ["Education"], levels: ["Master's"] },

  // Culinary / Sport / Design
  "Culinary Arts, AS": { disciplines: ["Culinary"], levels: ["Associate"] },
  "Sport Management": { disciplines: ["Sports Management"], levels: ["Bachelor's"] },
  "Golf Management": { disciplines: ["Sports Management"], levels: ["Bachelor's"] },
  "Graphic Arts and Design, AS": { disciplines: ["Communications"], levels: ["Associate"] },
};

const TEXT_SYNONYMS: Record<string, string[]> = {
  it: ["information technology"],
  "computer science": ["information technology"],
  cyber: ["information technology"],
  cybersecurity: ["information technology"],
  tech: ["information technology", "engineering"],
  nurse: ["nursing"],
  rn: ["nursing"],
  bsn: ["nursing"],
  finance: ["business"],
  mba: ["business"],
  health: ["health sciences", "health care"],
  medical: ["health sciences"],
  imaging: ["health sciences"],
  law: ["legal studies", "criminal justice"],
  chef: ["culinary"],
  cooking: ["culinary"],
  sport: ["sports management"],
  sports: ["sports management"],
  golf: ["sports management"],
  teaching: ["education"],
  teacher: ["education"],
  psych: ["psychology"],
  counseling: ["psychology"],
  chiropractic: ["health sciences"],
  dc: ["health sciences"],
};

export interface ProgramFilter {
  text: string;
  discipline: string | null;
  level: DegreeLevel | null;
}

export const EMPTY_FILTER: ProgramFilter = { text: "", discipline: null, level: null };

export function filterIsActive(f: ProgramFilter): boolean {
  return Boolean(f.text.trim() || f.discipline || f.level);
}

function metaFor(program: string): ProgramMeta {
  return PROGRAM_INDEX[program] ?? { disciplines: [], levels: [] };
}

function textNeedles(text: string): string[] {
  const t = text.trim().toLowerCase();
  if (!t) return [];
  const needles = new Set<string>([t]);
  for (const [term, syns] of Object.entries(TEXT_SYNONYMS)) {
    if (new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`).test(t)) {
      syns.forEach((s) => needles.add(s));
    }
  }
  return [...needles];
}

function programMatches(program: string, f: ProgramFilter): boolean {
  const meta = metaFor(program);
  if (f.discipline && !meta.disciplines.includes(f.discipline)) return false;
  if (f.level && !meta.levels.includes(f.level)) return false;
  if (f.text.trim()) {
    const hay = `${program} ${meta.disciplines.join(" ")}`.toLowerCase();
    if (!textNeedles(f.text).some((n) => hay.includes(n))) return false;
  }
  return true;
}

function campusAliasMatches(campus: Campus, f: ProgramFilter): boolean {
  if (!f.text.trim() || f.discipline || f.level) return false;
  const hay = [campus.name, campus.city, ...(campus.aliases ?? [])].join(" ").toLowerCase();
  if (isSpanishAliasQuery(f.text) && campus.id === "online-global") return true;
  return textNeedles(f.text).some((n) => hay.includes(n));
}

export function matchCampuses(f: ProgramFilter): Set<string> | null {
  if (!filterIsActive(f)) return null;
  const ids = new Set<string>();
  for (const campus of CAMPUSES) {
    if (campus.programs.some((p) => programMatches(p, f)) || campusAliasMatches(campus, f)) {
      ids.add(campus.id);
    }
  }
  return ids;
}

export function matchingPrograms(campus: Campus, f: ProgramFilter): string[] {
  if (!filterIsActive(f)) return [];
  return campus.programs.filter((p) => programMatches(p, f));
}

export function availableDisciplines(): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const campus of CAMPUSES) {
    const seen = new Set<string>();
    for (const p of campus.programs) {
      for (const d of metaFor(p).disciplines) seen.add(d);
    }
    for (const d of seen) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function availableLevels(): DegreeLevel[] {
  const present = new Set<DegreeLevel>();
  for (const campus of CAMPUSES) {
    for (const p of campus.programs) {
      for (const l of metaFor(p).levels) present.add(l);
    }
  }
  return DEGREE_LEVELS.filter((l) => present.has(l));
}

export function describeFilter(f: ProgramFilter): string {
  const parts: string[] = [];
  if (f.discipline) parts.push(f.discipline);
  if (f.level) parts.push(f.level);
  if (f.text.trim()) parts.push(`“${f.text.trim()}”`);
  return parts.join(" · ");
}
