// Keiser University campus ecosystem dataset.
//
// Coordinates are the real geographic locations of each campus, so the globe
// places Florida campuses along the real coastline, the Latin American Campus
// in Nicaragua, etc. Copy is written student-facing for an admissions / tour
// tool. Rosters and details should be reconciled against official Keiser data
// before being used with live prospects.

export type CampusRegion = "Florida" | "Latin America" | "Global Campuses" | "Online & Global";

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
  /** Optional second photo, shown on the 3D campus-scene billboard. */
  photoAlt?: string;
  /** Optional extra hero photos; the panel hero auto-rotates through them. */
  gallery?: string[];
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
    photoAlt: "campuses/flagship-aerial.webp",
    gallery: ["campuses/flagship-2.jpg"],
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
    id: "west-palm-beach",
    name: "West Palm Beach Campus (Jog Road)",
    city: "West Palm Beach, FL",
    region: "Florida",
    lat: 26.7065,
    lng: -80.13,
    photoAlt: "campuses/west-palm-beach-2.png",
    tagline: "Career programs on Jog Road.",
    description:
      "On Jog Road in West Palm Beach, this campus serves working professionals across South Florida with career-focused degree programs — distinct from the nearby residential Flagship.",
    established: "West Palm Beach campus",
    setting: "Professional campus",
    programs: ["Business Administration", "Nursing (BSN)", "Psychology", "Health Services Admin"],
    highlights: [
      "On Jog Road, distinct from the Flagship",
      "Built for working professionals",
      "Career-focused degree programs",
    ],
    skyline: [0.7, 0.6, 0.85, 0.55, 0.7, 0.6, 0.5],
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
    id: "pembroke-pines",
    name: "Pembroke Pines Campus",
    city: "Pembroke Pines, FL",
    region: "Florida",
    lat: 26.0078,
    lng: -80.2963,
    tagline: "Healthcare careers in southern Broward.",
    description:
      "The Pembroke Pines campus serves the fast-growing communities of southern Broward County with hands-on nursing and allied-health programs and easy access to South Florida's hospital network for clinical placements.",
    established: "Broward County campus",
    setting: "Suburban health-sciences campus",
    programs: ["Nursing (BSN)", "Medical Assisting", "Occupational Therapy Assistant", "Business"],
    highlights: [
      "Hands-on nursing & allied-health labs",
      "Southern Broward County location",
      "Strong clinical-placement network",
    ],
    skyline: [0.6, 0.55, 0.7, 0.5, 0.6, 0.5],
  },
  {
    id: "graduate-school",
    name: "Keiser University Graduate School",
    city: "Fort Lauderdale, FL",
    region: "Florida",
    lat: 26.1929,
    lng: -80.17,
    tagline: "Advanced degrees, real-world focus.",
    description:
      "Keiser University's Graduate School delivers master's and doctoral programs built for working professionals — across business, education, psychology, and the health sciences — with the same hands-on, student-first approach as the university's undergraduate campuses.",
    established: "Graduate School",
    setting: "Graduate & doctoral campus",
    programs: ["MBA / DBA", "Education (Ed.D.)", "Psychology (MS / Psy.D.)", "Health Sciences"],
    highlights: [
      "Master's & doctoral programs",
      "Built for working professionals",
      "Fort Lauderdale location",
    ],
    skyline: [0.7, 0.6, 0.85, 0.55, 0.7, 0.6],
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
    photo: "campuses/tampa.webp",
    gallery: ["campuses/tampa-2.jpg"],
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
    id: "managua-language-center",
    name: "Language Center — Managua",
    city: "Managua, Nicaragua",
    region: "Latin America",
    lat: 12.115,
    lng: -86.2362,
    photo: "campuses/managua-language-center.png",
    tagline: "English-language gateway in the capital.",
    description:
      "Keiser's Language Center in Managua helps students across Nicaragua build the English fluency they need for an American-style education, feeding into the residential Latin American Campus and the wider Keiser network.",
    established: "Managua language center",
    setting: "Language & pathway center",
    programs: ["English Language", "Academic Preparation", "Pathway to Degree Programs"],
    highlights: [
      "English-language preparation",
      "Located in the capital, Managua",
      "Pathway to the Latin American Campus",
    ],
    skyline: [0.5, 0.6, 0.55, 0.5, 0.45],
  },

  // ---- Latin American global network partners --------------------------
  {
    id: "santa-cruz",
    name: "International University of Santa Cruz",
    city: "Santa Cruz de la Sierra, Bolivia",
    region: "Latin America",
    lat: -17.7833,
    lng: -63.1821,
    tagline: "Keiser's gateway to Bolivia.",
    description:
      "Part of Keiser University's global network, the International University of Santa Cruz extends an American-style higher-education experience to Bolivia's largest and fastest-growing city, connecting Bolivian students to Keiser's worldwide academic community.",
    established: "Keiser global campus",
    setting: "International partner campus",
    programs: ["International Business", "English Language", "Hospitality Management", "Psychology"],
    highlights: [
      "American-style curriculum in Bolivia",
      "Pathways to Keiser's Florida campuses",
      "Global student community",
    ],
    skyline: [0.6, 0.7, 0.55, 0.65, 0.5, 0.6],
  },
  {
    id: "ista-ecuador",
    name: "Instituto Superior Técnico Americano",
    city: "Guayaquil, Ecuador",
    region: "Latin America",
    lat: -2.1962,
    lng: -79.8862,
    tagline: "American technical education in Ecuador.",
    description:
      "A Keiser University global partner, the Instituto Superior Técnico Americano brings career-focused, American-style technical and professional programs to Ecuador, with academic ties back to Keiser's U.S. campuses.",
    established: "Keiser global campus",
    setting: "International partner campus",
    programs: ["Business Administration", "Information Technology", "English Language", "Tourism"],
    highlights: [
      "Career-focused technical programs",
      "Bridge to U.S. study",
      "Located in Ecuador's largest city",
    ],
    skyline: [0.55, 0.6, 0.7, 0.5, 0.6, 0.5],
  },
  {
    id: "usil-peru",
    name: "Center for Global Education at USIL",
    city: "Lima, Peru",
    region: "Latin America",
    lat: -12.0851,
    lng: -76.947,
    tagline: "A global classroom in Lima.",
    description:
      "Hosted at the Universidad San Ignacio de Loyola, the Center for Global Education connects Peruvian students with Keiser University's international programs and study-abroad pathways, blending local and American academic traditions.",
    established: "Keiser global campus",
    setting: "Center for Global Education",
    programs: ["International Business", "Hospitality Management", "English Language", "Communications"],
    highlights: [
      "Hosted at USIL in Lima",
      "Study-abroad pathways to Florida",
      "Internationally connected faculty",
    ],
    skyline: [0.7, 0.6, 0.8, 0.55, 0.65, 0.5],
  },

  // ---- Global campuses (Europe, Asia) ----------------------------------
  {
    id: "spain",
    name: "American College in Spain",
    city: "Marbella, Spain",
    region: "Global Campuses",
    lat: 36.5101,
    lng: -4.8856,
    tagline: "An American degree on the Costa del Sol.",
    description:
      "Part of Keiser University's global network, the American College in Spain offers a U.S.-style, English-language university experience on Spain's Mediterranean coast — a launchpad for students who want an international education with a European setting.",
    established: "Keiser global campus",
    setting: "Mediterranean coastal campus",
    programs: ["International Business", "Hospitality Management", "Marketing", "English Language"],
    highlights: [
      "English-language American curriculum",
      "Costa del Sol location",
      "Transfer pathways across the Keiser network",
    ],
    skyline: [0.6, 0.7, 0.55, 0.75, 0.5, 0.65],
  },
  {
    id: "garodia-india",
    name: "Garodia International College",
    city: "Mumbai, India",
    region: "Global Campuses",
    lat: 19.0833,
    lng: 72.908,
    tagline: "Keiser's partner in Mumbai.",
    description:
      "A Keiser University global partner in Mumbai, Garodia International College offers internationally aligned, career-focused programs that connect Indian students to Keiser's worldwide academic community and U.S. study options.",
    established: "Keiser global campus",
    setting: "Urban international campus",
    programs: ["Business Administration", "Information Technology", "Commerce", "English Language"],
    highlights: [
      "International curriculum in Mumbai",
      "Pathways to U.S. campuses",
      "Industry-connected programs",
    ],
    skyline: [0.7, 0.85, 0.6, 0.75, 0.55, 0.7],
  },
  {
    id: "sampoerna-indonesia",
    name: "Sampoerna University",
    city: "Jakarta, Indonesia",
    region: "Global Campuses",
    lat: -6.2241,
    lng: 106.813,
    tagline: "American-accredited education in Indonesia.",
    description:
      "Through its partnership with Keiser University, Sampoerna University offers Indonesian students access to American-style, English-language degree programs and credit pathways to study in the United States.",
    established: "Keiser global partner",
    setting: "Metropolitan university campus",
    programs: ["Business", "Engineering", "Education", "Information Technology"],
    highlights: [
      "U.S. credit-transfer pathways",
      "English-language programs",
      "Located in Jakarta",
    ],
    skyline: [0.75, 0.7, 0.85, 0.6, 0.7, 0.55],
  },
  {
    id: "sri-lanka",
    name: "American College of Higher Education",
    city: "Kandy, Sri Lanka",
    region: "Global Campuses",
    lat: 7.2906,
    lng: 80.6337,
    tagline: "Keiser's campus in Sri Lanka.",
    description:
      "A Keiser University global partner, the American College of Higher Education brings American-style, English-language higher education to Kandy, opening international degree and transfer pathways for Sri Lankan students.",
    established: "Keiser global campus",
    setting: "International partner campus",
    programs: ["Business Administration", "Information Technology", "English Language", "Psychology"],
    highlights: [
      "American curriculum in Kandy",
      "Transfer pathways to Florida",
      "Globally connected faculty",
    ],
    skyline: [0.6, 0.65, 0.7, 0.5, 0.6, 0.55],
  },
  {
    id: "vietnam",
    name: "Keiser University Vietnam",
    city: "Ho Chi Minh City, Vietnam",
    region: "Global Campuses",
    lat: 10.7769,
    lng: 106.7009,
    tagline: "An American university in Vietnam.",
    description:
      "Keiser University Vietnam extends Keiser's American, English-language model to one of Southeast Asia's most dynamic cities, giving Vietnamese students international degree programs and direct pathways into the wider Keiser network.",
    established: "Keiser global campus",
    setting: "International campus",
    programs: ["International Business", "Information Technology", "Hospitality Management", "English Language"],
    highlights: [
      "American degree programs in Vietnam",
      "Pathways to U.S. study",
      "Located in Ho Chi Minh City",
    ],
    skyline: [0.7, 0.8, 0.6, 0.75, 0.55, 0.65],
  },
  {
    id: "e-campus",
    name: "Keiser University eCampus",
    city: "Online Undergraduate · Fort Lauderdale, FL",
    region: "Online & Global",
    lat: 26.1955,
    lng: -80.173,
    tagline: "Online undergraduate, fully supported.",
    description:
      "Keiser's eCampus delivers the university's undergraduate degrees fully online, supported from the Nineteen Hundred Building in Fort Lauderdale. It's built for working adults, military students, and learners worldwide who want the Keiser experience without relocating.",
    established: "eCampus (online undergraduate)",
    setting: "Online undergraduate division",
    programs: ["Business (BBA)", "Health Services Administration", "Criminal Justice", "Information Technology"],
    highlights: [
      "Fully online undergraduate degrees",
      "Supported from the Nineteen Hundred Building",
      "Military & transfer friendly",
    ],
    skyline: [0.6, 0.7, 0.55, 0.65, 0.5, 0.6],
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

export const REGIONS: CampusRegion[] = [
  "Florida",
  "Latin America",
  "Global Campuses",
  "Online & Global",
];

export function getFlagship(): Campus {
  return CAMPUSES.find((c) => c.flagship) ?? CAMPUSES[0];
}
