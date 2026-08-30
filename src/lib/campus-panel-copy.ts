/**
 * Selected-campus panel copy (EN/ES).
 *
 * Same `{ en, es }` map shape as the RFI sheet COPY.
 * Language defaults come from defaultRfiLanguage / isSpanishAliasQuery in shared/rfi.ts —
 * do not invent a third i18n system or rewrite globe chrome.
 *
 * Spanish campus prose is a conservative translation of the English catalog in
 * campus-data.ts, aligned with official campus-page wording.
 * Signature program titles stay as published in campus-data (already mixed EN/ES).
 */

import type { Campus } from "./campus-data";
import { defaultRfiLanguage, type RfiLanguage } from "../../shared/rfi";

export type PanelLanguage = RfiLanguage;

export const PANEL_COPY = {
  en: {
    requestInfo: "Request info",
    walkCampus: "Enter 3D campus tour",
    backToGlobe: "Back to globe",
    site: "Site",
    apply: "Apply at enroll.keiseruniversity.edu",
    established: "Established",
    setting: "Setting",
    signaturePrograms: "Signature programs",
    relatedLocations: "Related locations",
    highlights: "Campus highlights",
    close: "Close",
    langToggleAria: "Panel language",
    call: "Call",
  },
  es: {
    requestInfo: "Solicitar información",
    walkCampus: "Recorrer este campus",
    backToGlobe: "Volver al globo",
    site: "Sitio",
    apply: "Aplicar en enroll.keiseruniversity.edu",
    established: "Fundado",
    setting: "Entorno",
    signaturePrograms: "Programas destacados",
    relatedLocations: "Ubicaciones relacionadas",
    highlights: "Aspectos destacados",
    close: "Cerrar",
    langToggleAria: "Idioma del panel",
    call: "Llamar",
  },
} as const;

export type PanelCopy = (typeof PANEL_COPY)[PanelLanguage];

type CampusEsOverride = {
  tagline?: string;
  description?: string;
  highlights?: string[];
  setting?: string;
};

/**
 * Spanish overrides for Latin America + En Línea. English fields stay on Campus.
 * Do not invent programs, degrees, or claims beyond the English catalog / official pages.
 */
export const CAMPUS_ES: Partial<Record<string, CampusEsOverride>> = {
  "latin-american": {
    tagline: "Campus residencial internacional en San Marcos",
    setting: "Internacional · campus residencial",
    description:
      "El Latin American Campus en San Marcos, Carazo, es el campus residencial internacional de Keiser: un plan de estudios en inglés, acreditado en EE. UU. y reconocido por el Consejo Nacional de Universidades (CNU) de Nicaragua. Texto oficial del campus: la única institución de educación superior acreditada en EE. UU. que otorga títulos en Nicaragua y en gran parte de la región. Distinto de la sede de instrucción en Managua.",
    highlights: [
      "Campus residencial internacional — residencia, atletismo y servicios estudiantiles con personal en el sitio",
      "Currículo estadounidense; acreditación de EE. UU.; reconocimiento del CNU en Nicaragua",
      "Teléfonos del directorio: (505) 2535-2312 y (505) 2535-2314 · línea gratuita EE. UU. 1-800-969-1685",
      "Managua es un pin aparte (Ofiplaza San Dionisio), no este campus",
    ],
  },
  managua: {
    tagline: "Sede de instrucción en Managua · Ofiplaza San Dionisio",
    setting: "Internacional · sede de instrucción",
    description:
      "Listado en el directorio oficial como Managua, Nicaragua — distinto del campus residencial Latin American Campus en San Marcos. La página de Managua identifica una Oficina de Admisiones en Ofiplaza San Dionisio, Pista Suburbana. El Fact Book clasifica Managua (2019) como sede de instrucción fuera del campus y publica programas en español en la página del campus de Managua.",
    highlights: [
      "Listado oficial del directorio — no es el campus residencial de San Marcos",
      "Bloque de contacto de la página del campus: Oficina de Admisiones, Offiplaza San Dionisio, Pista Suburbana",
      "Teléfono: 011 (505) 22786911 · línea gratuita EE. UU. 1-800-969-1685",
      "Programas en español publicados en la página del campus de Managua",
    ],
  },
  "san-salvador": {
    tagline: "Sede de instrucción en El Salvador · Millennium Plaza",
    setting: "Internacional · sede de instrucción",
    description:
      "Página oficial del campus: Keiser University es una institución acreditada en EE. UU. que ofrece educación de posgrado y profesional en El Salvador. La sede de instrucción en San Salvador, en Millennium Plaza, ofrece programas orientados a la carrera en inglés y en español en formatos en línea, híbrido y presencial, según el programa.",
    highlights: [
      "La página oficial lo describe como sede de instrucción, no como campus residencial",
      "Oficina de Admisiones: 2do Nivel, Local 219, Millennium Plaza, Paseo General Escalón 3675",
      "Teléfono: +011 503 2250-3050",
      "Los programas y la modalidad (en línea, híbrido, presencial) varían — confirmar en la página del campus",
    ],
  },
  "online-global": {
    tagline: "Los mismos títulos, desde cualquier lugar · En Línea en Español",
    setting: "En línea · mundial (sede Fort Lauderdale)",
    description:
      "La División en Línea de Keiser (fundada en 1999) tiene sede en 1900 W. Commercial Boulevard, Suite 100, Fort Lauderdale, y ofrece títulos orientados a la carrera en todo el mundo. La División En Línea en Español comparte la misma dirección — el sitio oficial no la trata como una segunda ubicación, por lo que no es un segundo pin en el globo. El profesorado y la acreditación SACSCOC son los de la universidad.",
    highlights: [
      "Títulos 100% en línea y flexibles de la misma universidad acreditada",
      "Directorio: (888) 453-4737 y (954) 351-4040",
      "En Línea en Español (mismo edificio): (954) 745-8455 / (888) 960-8790 — no es un pin aparte",
      "Pines relacionados en este corredor: campus principal y Escuela de Posgrado",
    ],
  },
};

export function resolveCampusPanel(campus: Campus, lang: PanelLanguage) {
  const es = lang === "es" ? CAMPUS_ES[campus.id] : undefined;
  return {
    tagline: es?.tagline ?? campus.tagline,
    description: es?.description ?? campus.description,
    highlights: es?.highlights ?? campus.highlights,
    setting: es?.setting ?? campus.setting,
  };
}

export function defaultCampusPanelLanguage(
  campus: { id: string },
  searchQuery?: string | null,
): PanelLanguage {
  return defaultRfiLanguage(campus, searchQuery);
}
