// Program finder — turns a free-text query (or a quick-pick "field of study"
// chip) into the set of campuses that offer it, so prospects can search by what
// they want to study and have the globe highlight + fly to matching campuses.
//
// Campus `programs` strings are written for humans and are deliberately
// inconsistent ("Nursing (BSN)", "MBA / DBA", "Business (BBA/MBA)"), so all
// matching is done as case-insensitive substring tests against a campus's
// searchable text. Curated FIELDS and SYNONYMS bridge the gap between how a
// student phrases things ("computer science", "doctorate", "law") and how the
// dataset spells them.

import { CAMPUSES, type Campus } from "./campus-data";

export interface Field {
  /** Student-facing label shown on the quick-pick chip. */
  label: string;
  /** Lowercase substrings; a campus matches the field if its text contains any. */
  keywords: string[];
}

// Quick-pick fields of study, ordered roughly by how many campuses offer them.
export const FIELDS: Field[] = [
  { label: "Nursing", keywords: ["nursing", "bsn"] },
  {
    label: "Health Sciences",
    keywords: [
      "health",
      "medical",
      "radiolog",
      "sonograph",
      "cardiovascular",
      "occupational therapy",
      "physical therap",
      "biomedical",
      "diagnostic",
    ],
  },
  {
    label: "Business",
    keywords: [
      "business",
      "mba",
      "dba",
      "bba",
      "accounting",
      "marketing",
      "commerce",
      "management",
    ],
  },
  {
    label: "Technology",
    keywords: ["information technology", "engineering", "technology"],
  },
  { label: "Psychology", keywords: ["psychology", "psy.d"] },
  { label: "Criminal Justice & Legal", keywords: ["criminal justice", "legal"] },
  { label: "Hospitality & Culinary", keywords: ["hospitality", "culinary", "tourism"] },
  {
    label: "Graduate & Doctoral",
    keywords: ["mba", "dba", "ed.d", "psy.d", "graduate", "master", "doctora"],
  },
  { label: "English & Pathways", keywords: ["english", "academic preparation", "pathway"] },
];

// Maps the way students phrase things → substrings that exist in the dataset.
// Keyed by a term the student might type; if the query contains the key, the
// synonyms are added to the search.
const SYNONYMS: Record<string, string[]> = {
  it: ["information technology"],
  "computer science": ["information technology"],
  computing: ["information technology"],
  cyber: ["information technology"],
  cybersecurity: ["information technology"],
  rn: ["nursing"],
  nurse: ["nursing"],
  doctor: ["dba", "ed.d", "psy.d", "doctora"],
  doctorate: ["dba", "ed.d", "psy.d", "doctora"],
  phd: ["dba", "ed.d", "psy.d", "doctora"],
  masters: ["mba", "master"],
  graduate: ["mba", "dba", "ed.d", "psy.d", "graduate", "master"],
  law: ["legal"],
  lawyer: ["legal"],
  sports: ["sport"],
  chef: ["culinary"],
  cooking: ["culinary"],
  hotel: ["hospitality"],
  travel: ["tourism", "hospitality"],
  finance: ["accounting", "business"],
};

/** Everything we search a campus against: name, tagline, and its programs. */
export function campusSearchText(campus: Campus): string {
  return [campus.name, campus.tagline, ...campus.programs].join(" • ").toLowerCase();
}

/** True if `needle` appears in `haystack` as a whole word/phrase (not mid-word),
 *  so short terms like "it" don't match inside "hospitality". */
function containsWord(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}

/** Expand a raw query into the list of substrings to match against. */
function expandQuery(query: string): string[] {
  const q = query.trim().toLowerCase();
  const keywords = new Set<string>();
  if (q.length < 2) return [];
  // Use the raw query as a substring keyword only when it's specific enough to
  // be meaningful on its own (so "it" relies on the synonym below instead).
  if (q.length >= 3) keywords.add(q);

  // Expand to a field's curated keyword set when the query names the field
  // itself (a chip click sends the exact label; typing "nursing" also matches
  // the "Nursing" label). We deliberately require the *whole label* so a narrow
  // word like "culinary" doesn't drag in the rest of "Hospitality & Culinary".
  for (const field of FIELDS) {
    if (containsWord(q, field.label.toLowerCase())) {
      field.keywords.forEach((k) => keywords.add(k));
    }
  }

  // Apply student-phrasing synonyms, matched on whole words so "it" maps to
  // information technology without firing inside unrelated words.
  for (const [term, syns] of Object.entries(SYNONYMS)) {
    if (containsWord(q, term)) syns.forEach((s) => keywords.add(s));
  }

  return [...keywords];
}

/**
 * Campus ids whose programs match the query. Returns `null` for an empty query
 * (meaning "no filter"), so callers can distinguish "show everything" from
 * "nothing matched" (an empty Set).
 */
export function matchCampuses(query: string): Set<string> | null {
  if (!query.trim()) return null;
  const keywords = expandQuery(query);
  const ids = new Set<string>();
  for (const campus of CAMPUSES) {
    const text = campusSearchText(campus);
    if (keywords.some((k) => k && text.includes(k))) ids.add(campus.id);
  }
  return ids;
}

/** The specific program strings on a campus that match the query (for display). */
export function matchingPrograms(campus: Campus, query: string): string[] {
  if (!query.trim()) return [];
  const keywords = expandQuery(query);
  return campus.programs.filter((p) => {
    const text = p.toLowerCase();
    return keywords.some((k) => k && text.includes(k));
  });
}
