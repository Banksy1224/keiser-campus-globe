// Program finder — lets prospects filter campuses by Keiser University's
// official academic disciplines (areas of study) and degree types, sourced from
// keiseruniversity.edu/programs/all-programs.
//
// Rather than guess a program's discipline from substrings (which mis-filed
// "Radiologic Technology" under I.T. and matched "MBA" inside "Mumbai"), every
// program string in the dataset is mapped explicitly to its discipline(s) and
// degree level(s). Matching is therefore exact and every result shows the real
// programs that matched.

import { CAMPUSES, type Campus } from "./campus-data";

export type DegreeLevel = "Associate" | "Bachelor's" | "Master's" | "Doctoral";

// Degree levels in the order Keiser lists them.
export const DEGREE_LEVELS: DegreeLevel[] = ["Associate", "Bachelor's", "Master's", "Doctoral"];

interface ProgramMeta {
  disciplines: string[];
  levels: DegreeLevel[];
}

// Maps every program string used in campus-data.ts to Keiser's academic
// disciplines and the degree level(s) the listed program implies. Disciplines
// use Keiser's "areas of study" names; "English & Pathways" covers the
// international language centers' ESL / college-prep tracks (non-degree).
const PROGRAM_INDEX: Record<string, ProgramMeta> = {
  // Nursing
  "Nursing (BSN)": { disciplines: ["Nursing"], levels: ["Bachelor's"] },

  // Health Sciences (clinical / allied health)
  "Biomedical Sciences": { disciplines: ["Health Sciences"], levels: ["Bachelor's"] },
  "Health Sciences": { disciplines: ["Health Sciences"], levels: ["Master's", "Doctoral"] },
  "Radiologic Technology": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Diagnostic Medical Sonography": { disciplines: ["Health Sciences"], levels: ["Bachelor's"] },
  "Cardiovascular Technology": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Medical Assisting": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Occupational Therapy Assistant": { disciplines: ["Health Sciences"], levels: ["Associate"] },
  "Physical Therapist Assistant": { disciplines: ["Health Sciences"], levels: ["Associate"] },

  // Health Care (administration)
  "Health Services Admin": { disciplines: ["Health Care"], levels: ["Bachelor's"] },
  "Health Services Administration": { disciplines: ["Health Care"], levels: ["Bachelor's"] },

  // Business / Accounting / Marketing
  Business: { disciplines: ["Business"], levels: ["Bachelor's"] },
  "Business Administration": { disciplines: ["Business"], levels: ["Bachelor's"] },
  "International Business": { disciplines: ["Business"], levels: ["Bachelor's"] },
  Commerce: { disciplines: ["Business"], levels: ["Bachelor's"] },
  "Business (BBA)": { disciplines: ["Business"], levels: ["Bachelor's"] },
  "Business (BBA/MBA)": { disciplines: ["Business"], levels: ["Bachelor's", "Master's"] },
  "MBA / DBA": { disciplines: ["Business"], levels: ["Master's", "Doctoral"] },
  Accounting: { disciplines: ["Accounting"], levels: ["Bachelor's"] },
  Marketing: { disciplines: ["Marketing"], levels: ["Bachelor's"] },

  // Information Technology / Engineering
  "Information Technology": { disciplines: ["Information Technology"], levels: ["Bachelor's"] },
  Engineering: { disciplines: ["Engineering"], levels: ["Bachelor's"] },
  "Engineering Technology": { disciplines: ["Engineering"], levels: ["Bachelor's"] },

  // Criminal Justice / Legal
  "Criminal Justice": { disciplines: ["Criminal Justice"], levels: ["Bachelor's"] },
  "Legal Studies": { disciplines: ["Legal Studies"], levels: ["Bachelor's"] },

  // Psychology / Education
  Psychology: { disciplines: ["Psychology"], levels: ["Bachelor's"] },
  "Psychology (MS / Psy.D.)": { disciplines: ["Psychology"], levels: ["Master's", "Doctoral"] },
  Education: { disciplines: ["Education"], levels: ["Bachelor's"] },
  "Education (Ed.D.)": { disciplines: ["Education"], levels: ["Doctoral"] },

  // Culinary / Hospitality / Sport / Communications
  "Culinary Arts": { disciplines: ["Culinary"], levels: ["Associate"] },
  "Hospitality Management": { disciplines: ["Hospitality Management"], levels: ["Bachelor's"] },
  Tourism: { disciplines: ["Hospitality Management"], levels: ["Bachelor's"] },
  "Sport Management": { disciplines: ["Sports Management"], levels: ["Bachelor's"] },
  Communications: { disciplines: ["Communications"], levels: ["Bachelor's"] },

  // International language centers (non-degree pathways)
  "English Language": { disciplines: ["English & Pathways"], levels: [] },
  "Academic Preparation": { disciplines: ["English & Pathways"], levels: [] },
  "Pathway to Degree Programs": { disciplines: ["English & Pathways"], levels: [] },
};

// Student-phrasing → discipline, so free-text search still finds things by
// common names that aren't the exact discipline label.
const TEXT_SYNONYMS: Record<string, string[]> = {
  it: ["information technology"],
  "computer science": ["information technology"],
  cyber: ["information technology"],
  cybersecurity: ["information technology"],
  tech: ["information technology", "engineering"],
  nurse: ["nursing"],
  rn: ["nursing"],
  finance: ["accounting", "business"],
  health: ["health sciences", "health care"],
  medical: ["health sciences"],
  law: ["legal studies", "criminal justice"],
  lawyer: ["legal studies"],
  chef: ["culinary"],
  cooking: ["culinary"],
  hotel: ["hospitality management"],
  travel: ["hospitality management"],
  sport: ["sports management"],
  sports: ["sports management"],
  teaching: ["education"],
  teacher: ["education"],
  english: ["english & pathways"],
  esl: ["english & pathways"],
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

/** Expand free-text into the substrings to test (raw + phrasing synonyms). */
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

/** Does a single program satisfy every active part of the filter? */
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

/**
 * Campus ids with at least one program matching the filter. Returns `null` when
 * no filter is active (meaning "no filter"), so callers can tell that apart from
 * an empty Set (a filter that matched nothing).
 */
export function matchCampuses(f: ProgramFilter): Set<string> | null {
  if (!filterIsActive(f)) return null;
  const ids = new Set<string>();
  for (const campus of CAMPUSES) {
    if (campus.programs.some((p) => programMatches(p, f))) ids.add(campus.id);
  }
  return ids;
}

/** The campus's programs that match the filter (for the result chips). */
export function matchingPrograms(campus: Campus, f: ProgramFilter): string[] {
  if (!filterIsActive(f)) return [];
  return campus.programs.filter((p) => programMatches(p, f));
}

/** Disciplines present in the dataset, with how many campuses offer each,
 *  ordered by reach then name — used to render the discipline chips. */
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

/** Degree levels present in the dataset, in Keiser's order. */
export function availableLevels(): DegreeLevel[] {
  const present = new Set<DegreeLevel>();
  for (const campus of CAMPUSES) {
    for (const p of campus.programs) {
      for (const l of metaFor(p).levels) present.add(l);
    }
  }
  return DEGREE_LEVELS.filter((l) => present.has(l));
}

/** Short human label describing the active filter (for the collapsed pill). */
export function describeFilter(f: ProgramFilter): string {
  const parts: string[] = [];
  if (f.discipline) parts.push(f.discipline);
  if (f.level) parts.push(f.level);
  if (f.text.trim()) parts.push(`“${f.text.trim()}”`);
  return parts.join(" · ");
}
