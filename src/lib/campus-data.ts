// Keiser University campus ecosystem dataset.
//
// Coordinates are the real geographic locations of each campus, so the globe
// places Florida campuses along the real coastline, the Latin American Campus
// in Nicaragua, etc. Copy is written student-facing for an admissions / tour
// tool. Rosters and details should be reconciled against official Keiser data
// before being used with live prospects.

export type CampusRegion = "Florida" | "Latin America" | "Online & Global";

export interface Campus {
  id: string;
  name: string;
  city: string;
  region: CampusRegion;
  /** Latitude in degrees (-90..90). */
  lat: number;
  /** Longitude in degrees (-180..180). */
  lng: number;
  /** Flagship anchor for the great-circle network drawn on the globe. */
  flagship?: boolean;
  /**
   * Optional campus photo. If omitted, the UI looks for `/campuses/<id>.jpg`
   * and otherwise falls back to the brand gradient. Can also be a full URL.
   */
  photo?: string;
  tagline: string;
  description: string;
  established: string;
  setting: string;
  /** Signature / notable programs to surface to prospective students. */
  programs: string[];
  highlights: string[];
  /**
   * Relative building heights (0..1) used to size the stylized 3D campus
   * skyline when a prospect "enters" a campus tour.
   */
  skyline: number[];
}

export const FLAME_GOLD = "#e8b04b";

export const CAMPUSES: Campus[] = [
  {
    id: "flagship",
    name: "Flagship Residential Campus",
    city: "West Palm Beach, FL",
    region: "Florida",
    lat: 26.7153,
    lng: -80.0534,
    flagship: true,
    tagline: "The heart of the Keiser ecosystem.",
    description:
      "Set on 100 wooded acres, the Flagship is Keiser's only traditional residential campus — dorms, a dining commons, NAIA athletics, and a student center built for the full college experience. It anchors the entire network you see arcing across the globe.",
    established: "1977 (Flagship est. 2008)",
    setting: "100-acre residential campus",
    programs: ["Biomedical Sciences", "Sport Management", "Business Administration", "Psychology"],
    highlights: [
      "On-campus residence halls & dining commons",
      "NAIA Seahawks athletics — 20+ varsity teams",
      "Lakeside trails and a true college quad",
    ],
    skyline: [0.9, 0.6, 1.0, 0.7, 0.5, 0.8, 0.65, 0.55],
  },
  {
    id: "fort-lauderdale",
    name: "Fort Lauderdale Campus",
    city: "Fort Lauderdale, FL",
    region: "Florida",
    lat: 26.1224,
    lng: -80.1373,
    tagline: "Where Keiser began.",
    description:
      "The original Keiser campus, founded in 1977, sits minutes from downtown Fort Lauderdale. Today it's a hub for health science and nursing students who want a clinical, career-focused start in the heart of South Florida.",
    established: "1977",
    setting: "Urban health-sciences campus",
    programs: ["Nursing (BSN)", "Radiologic Technology", "Diagnostic Medical Sonography", "Health Services Admin"],
    highlights: ["Founding Keiser campus", "Simulation hospital labs", "Steps from major medical centers"],
    skyline: [0.7, 0.5, 0.8, 0.55, 0.6, 0.45],
  },
  {
    id: "orlando",
    name: "Orlando Campus",
    city: "Orlando, FL",
    region: "Florida",
    lat: 28.5383,
    lng: -81.3792,
    tagline: "Central Florida's career launchpad.",
    description:
      "In the middle of one of the fastest-growing metros in the country, the Orlando campus pairs healthcare and culinary programs with deep employer connections across theme parks, hospitals, and hospitality.",
    established: "2006",
    setting: "Metropolitan campus",
    programs: ["Nursing (BSN)", "Culinary Arts", "Occupational Therapy Assistant", "Business"],
    highlights: ["Center for Culinary Arts", "Hospitality & healthcare partnerships", "Near downtown Orlando"],
    skyline: [0.8, 0.95, 0.6, 0.75, 0.5, 0.7, 0.6],
  },
  {
    id: "tampa",
    name: "Tampa Campus",
    city: "Tampa, FL",
    region: "Florida",
    lat: 27.9506,
    lng: -82.4572,
    tagline: "Gulf Coast healthcare & business.",
    description:
      "The Tampa campus serves the Gulf Coast with strong nursing, imaging, and business pathways, plus easy access to one of Florida's largest hospital networks for clinical placements.",
    established: "2008",
    setting: "Suburban professional campus",
    programs: ["Nursing (BSN)", "Medical Assisting", "Cardiovascular Technology", "Accounting"],
    highlights: ["Large clinical-placement network", "Modern simulation labs", "Gulf Coast location"],
    skyline: [0.6, 0.8, 0.55, 0.7, 0.5, 0.65],
  },
  {
    id: "miami",
    name: "Miami Campus",
    city: "Miami, FL",
    region: "Florida",
    lat: 25.7617,
    lng: -80.1918,
    tagline: "A global city, a bilingual campus.",
    description:
      "Keiser's Miami campus reflects the city around it — bilingual, internationally connected, and built for students balancing careers and family while they earn a degree.",
    established: "2007",
    setting: "Urban bilingual campus",
    programs: ["Nursing (BSN)", "Business Administration", "Criminal Justice", "Physical Therapist Assistant"],
    highlights: ["Bilingual student support", "Gateway to Latin America", "Flexible day & evening schedules"],
    skyline: [0.85, 0.7, 0.95, 0.6, 0.8, 0.55, 0.7],
  },
  {
    id: "jacksonville",
    name: "Jacksonville Campus",
    city: "Jacksonville, FL",
    region: "Florida",
    lat: 30.3322,
    lng: -81.6557,
    tagline: "Northeast Florida's health hub.",
    description:
      "Serving the First Coast, the Jacksonville campus focuses on nursing and allied health, feeding talent into one of the region's biggest healthcare employment markets.",
    established: "2008",
    setting: "Suburban campus",
    programs: ["Nursing (BSN)", "Medical Assisting", "Health Services Administration", "Psychology"],
    highlights: ["First Coast clinical partners", "Hands-on allied-health labs", "Career services on site"],
    skyline: [0.6, 0.55, 0.7, 0.5, 0.6],
  },
  {
    id: "tallahassee",
    name: "Tallahassee Campus",
    city: "Tallahassee, FL",
    region: "Florida",
    lat: 30.4383,
    lng: -84.2807,
    tagline: "In the capital, close to policy.",
    description:
      "Minutes from the state capitol, the Tallahassee campus is a natural fit for students drawn to legal studies, public service, and healthcare in North Florida.",
    established: "2008",
    setting: "Capital-city campus",
    programs: ["Legal Studies", "Nursing (BSN)", "Criminal Justice", "Business Administration"],
    highlights: ["Near the state capitol", "Public-service pathways", "Internship connections in government"],
    skyline: [0.55, 0.6, 0.5, 0.7, 0.45],
  },
  {
    id: "sarasota",
    name: "Sarasota Campus",
    city: "Sarasota, FL",
    region: "Florida",
    lat: 27.3364,
    lng: -82.5307,
    tagline: "Coastal, focused, hands-on.",
    description:
      "On Florida's Cultural Coast, the Sarasota campus is known for personal attention, tight class sizes, and strong healthcare and veterinary-technology programs.",
    established: "2008",
    setting: "Coastal campus",
    programs: ["Veterinary Technology", "Nursing (BSN)", "Occupational Therapy Assistant", "Business"],
    highlights: ["Veterinary technology labs", "Small class sizes", "Florida's Cultural Coast"],
    skyline: [0.5, 0.6, 0.55, 0.45, 0.6],
  },
  {
    id: "daytona",
    name: "Daytona Beach Campus",
    city: "Daytona Beach, FL",
    region: "Florida",
    lat: 29.2108,
    lng: -81.0228,
    tagline: "Career-ready by the coast.",
    description:
      "The Daytona Beach campus blends healthcare and business programs with a relaxed coastal setting, serving students across Volusia County and beyond.",
    established: "2009",
    setting: "Coastal campus",
    programs: ["Nursing (BSN)", "Medical Assisting", "Business Administration", "Information Technology"],
    highlights: ["IT & cybersecurity labs", "Coastal location", "Day & evening options"],
    skyline: [0.55, 0.5, 0.65, 0.5, 0.55],
  },
  {
    id: "melbourne",
    name: "Melbourne Campus",
    city: "Melbourne, FL",
    region: "Florida",
    lat: 28.0836,
    lng: -80.6081,
    tagline: "On the Space Coast.",
    description:
      "Near Florida's aerospace corridor, the Melbourne campus leans into technology and health sciences for students aiming at the Space Coast's high-tech employers.",
    established: "2009",
    setting: "Space Coast campus",
    programs: ["Information Technology", "Nursing (BSN)", "Biomedical Sciences", "Business"],
    highlights: ["Space Coast tech employers", "Biomedical pathways", "Modern computing labs"],
    skyline: [0.6, 0.7, 0.55, 0.65, 0.5],
  },
  {
    id: "lakeland",
    name: "Lakeland Campus",
    city: "Lakeland, FL",
    region: "Florida",
    lat: 28.0395,
    lng: -81.9498,
    tagline: "Central Florida, central to you.",
    description:
      "Positioned between Tampa and Orlando, the Lakeland campus is a convenient choice for Polk County students pursuing nursing and allied-health careers.",
    established: "2010",
    setting: "Suburban campus",
    programs: ["Nursing (BSN)", "Medical Assisting", "Physical Therapist Assistant", "Business"],
    highlights: ["Between Tampa & Orlando", "Allied-health focus", "Career-driven schedules"],
    skyline: [0.5, 0.55, 0.6, 0.5, 0.45],
  },
  {
    id: "naples",
    name: "Naples Campus",
    city: "Naples, FL",
    region: "Florida",
    lat: 26.142,
    lng: -81.7948,
    tagline: "Southwest Florida's choice.",
    description:
      "The Naples campus serves Southwest Florida with healthcare and business programs and a reputation for individualized student support.",
    established: "2011",
    setting: "Suburban campus",
    programs: ["Nursing (BSN)", "Health Services Administration", "Business", "Psychology"],
    highlights: ["Personalized advising", "Southwest Florida network", "Flexible scheduling"],
    skyline: [0.55, 0.5, 0.6, 0.5, 0.5],
  },
  {
    id: "port-st-lucie",
    name: "Port St. Lucie Campus",
    city: "Port St. Lucie, FL",
    region: "Florida",
    lat: 27.273,
    lng: -80.3582,
    tagline: "Treasure Coast careers.",
    description:
      "On the Treasure Coast, the Port St. Lucie campus connects students to a growing healthcare market with hands-on nursing and allied-health training.",
    established: "2012",
    setting: "Suburban campus",
    programs: ["Nursing (BSN)", "Medical Assisting", "Occupational Therapy Assistant", "Business"],
    highlights: ["Growing Treasure Coast market", "Simulation labs", "Career placement support"],
    skyline: [0.5, 0.55, 0.5, 0.6, 0.45],
  },
  {
    id: "new-port-richey",
    name: "New Port Richey Campus",
    city: "New Port Richey, FL",
    region: "Florida",
    lat: 28.2442,
    lng: -82.7193,
    tagline: "Pasco County's pathway.",
    description:
      "The New Port Richey campus extends Keiser's healthcare and business programs into Pasco County, with a focus on convenient, career-focused scheduling.",
    established: "2013",
    setting: "Suburban campus",
    programs: ["Nursing (BSN)", "Medical Assisting", "Business Administration", "Criminal Justice"],
    highlights: ["Pasco County location", "Allied-health labs", "Evening class options"],
    skyline: [0.5, 0.5, 0.55, 0.45, 0.5],
  },
  {
    id: "latin-american",
    name: "Latin American Campus",
    city: "San Marcos, Nicaragua",
    region: "Latin America",
    lat: 12.0833,
    lng: -86.2,
    tagline: "An American degree in Central America.",
    description:
      "Keiser's residential Latin American Campus brings a U.S.-style, English-language university experience to Nicaragua — drawing students from across the region to a 14-acre campus with dorms, athletics, and study-abroad ties back to Florida.",
    established: "2014",
    setting: "14-acre international residential campus",
    programs: ["International Business", "Hospitality Management", "Sport Management", "Psychology"],
    highlights: [
      "English-language American curriculum",
      "Residential international campus",
      "Study-abroad bridge to Florida",
    ],
    skyline: [0.75, 0.6, 0.85, 0.55, 0.7, 0.5],
  },
  {
    id: "online",
    name: "Keiser University Online",
    city: "Anywhere, worldwide",
    region: "Online & Global",
    lat: 27.9944,
    lng: -81.7603,
    tagline: "The campus that travels with you.",
    description:
      "Keiser University Online delivers the same degrees and faculty through a fully online platform — built for working adults, military students, and learners around the world who can't relocate but won't compromise on credentials.",
    established: "Online div. est. 2010",
    setting: "Fully online / global",
    programs: ["Business (BBA/MBA)", "Health Services Administration", "Psychology", "Information Technology"],
    highlights: ["100% online degrees", "Military & transfer friendly", "Same faculty as ground campuses"],
    skyline: [0.6, 0.7, 0.5, 0.65, 0.55, 0.6],
  },
];

export const REGIONS: CampusRegion[] = ["Florida", "Latin America", "Online & Global"];

export function getFlagship(): Campus {
  return CAMPUSES.find((c) => c.flagship) ?? CAMPUSES[0];
}
