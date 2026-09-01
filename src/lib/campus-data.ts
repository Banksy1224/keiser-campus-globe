// Keiser University campus catalog for the Campus Globe.
//
// Locations, addresses, phones, and signaturePrograms are taken from the
// official campus directory (keiseruniversity.edu/campuses) and each campus
// page — the same catalog-accurate roster used by Keiser Globe's sister
// admissions tour. Established years come from the 2024–2025 Fact Book
// "Locations Founded" table. Do not invent programs.
//
// College of Golf shares the Flagship address (2600 N. Military Trail);
// College of Chiropractic Medicine shares the West Palm Beach career-campus
// address (2085 Vista Parkway). They are noted in copy, not extra pins.
// Online Division En Línea en Español shares 1900 W. Commercial Blvd. with
// Online and is not a second globe pin.
// Spanish pin-panel overrides (Latin America + En Línea) live in campus-panel-copy.ts.
//
// Globe-only fields (photo, skyline, virtualTour) stay here so photoreal tiles
// and the stylized 3D tour keep working. This is the Keiser Globe product —
// not SEC Genie.

export type CampusRegion = "florida" | "latin-america" | "asia" | "global";

export interface Campus {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  region: CampusRegion;
  lat: number;
  lng: number;
  /** Great-circle hub on this globe (Flagship residential only). */
  flagship?: boolean;
  photo?: string;
  photoAlt?: string;
  gallery?: string[];
  virtualTour?: string;
  tagline: string;
  /** Official campus blurb (English). Spanish overrides live in campus-panel-copy. */
  description: string;
  established?: string;
  setting: string;
  address: string;
  phone: string;
  phones?: string[];
  website: string;
  email?: string;
  relatedIds?: string[];
  aliases?: string[];
  highlights: string[];
  /** Official signature programs — same list the RFI sheet offers. */
  programs: string[];
  /**
   * Relative building heights (0..1) used to size the stylized 3D campus
   * skyline when a prospect "enters" a campus tour.
   */
  skyline: number[];
}

export const FLAME_GOLD = "#E8BC58";

export const APPLY_URL = "https://enroll.keiseruniversity.edu/";
export const ADMISSIONS_PHONE = "1-800-749-4456";

/** Older globe / share ids → official catalog ids. */
export const CAMPUS_ID_ALIASES: Record<string, string> = {
  flagship: "flagship-wpb",
  "managua-language-center": "managua",
  "el-salvador": "san-salvador",
  china: "shanghai",
  "e-campus": "online-global",
  online: "online-global",
};

export const REGIONS: CampusRegion[] = ["florida", "latin-america", "asia", "global"];

export const REGION_LABELS: Record<CampusRegion, string> = {
  florida: "Florida",
  "latin-america": "Latin America",
  asia: "Asia",
  global: "Online",
};

export function campusById(id: string | undefined | null): Campus | undefined {
  if (!id) return undefined;
  const resolved = CAMPUS_ID_ALIASES[id] ?? id;
  return CAMPUSES.find((c) => c.id === resolved);
}

export function resolveCampusId(id: string | undefined | null): string | undefined {
  return campusById(id)?.id;
}

export function campusLocation(campus: Campus): string {
  if (campus.region === "global") return campus.city;
  if (campus.country === "United States") {
    return campus.state ? `${campus.city}, ${campus.state}` : campus.city;
  }
  if (campus.state) return `${campus.city}, ${campus.state}, ${campus.country}`;
  return `${campus.city}, ${campus.country}`;
}

export function campusPhones(campus: Campus): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of [campus.phone, ...(campus.phones ?? [])]) {
    if (p && !seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

export function telHref(phone: string): string {
  const plus = phone.includes("+") || phone.trim().startsWith("011");
  const digits = phone.replace(/[^\d+]/g, "").replace(/^011/, "+");
  if (plus && !digits.startsWith("+")) return `tel:+${digits}`;
  return `tel:${digits}`;
}

export function getFlagship(): Campus {
  return CAMPUSES.find((c) => c.flagship) ?? CAMPUSES[0];
}

export const CAMPUSES: Campus[] = [
  {
    id: "flagship-wpb",
    name: "Keiser University Flagship Campus",
    city: "West Palm Beach",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 26.7488,
    lng: -80.1145,
    flagship: true,
    photo: "campuses/flagship.jpg",
    photoAlt: "campuses/flagship-aerial.webp",
    gallery: ["campuses/flagship-2.jpg"],
    virtualTour: "https://www.youvisit.com/tour/keiseruniversity/keiseruniversity?tourid=tour2",
    tagline: "The residential heart of Keiser University",
    description:
      "Keiser's 100-acre Flagship Residential Campus in West Palm Beach is the traditional college-town option — on-campus housing, NAIA Seahawks athletics, and more than 100 degree programs minutes from the beach. Professors teach in small classes. The College of Golf is on these same grounds (2600 North Military Trail) — not a separate map pin.",
    established: "2015",
    setting: "Residential · 100-acre campus",
    address: "2600 North Military Trail, West Palm Beach, FL 33409",
    phone: "(561) 478-5500",
    website: "https://www.keiseruniversity.edu/flagship/",
    aliases: ["college of golf", "golf", "residential", "seahawks", "military trail"],
    highlights: [
      "On-campus residence halls and a full college-town student life",
      "Keiser Seahawks NAIA intercollegiate athletics",
      "College of Golf on the Flagship grounds — (888) 355-4465 / (561) 478-5500",
      "Personalized campus tours and a virtual visit are offered through Admissions",
    ],
    programs: [
      "Nursing, BSN (Traditional)",
      "Golf Management",
      "Biomedical Sciences (Pre-Med)",
      "Business Administration",
      "Sport Management",
    ],
    skyline: [0.9, 0.6, 1.0, 0.7, 0.5, 0.8, 0.65, 0.55],
  },
  {
    id: "west-palm-beach",
    name: "Keiser University West Palm Beach",
    city: "West Palm Beach",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 26.7058,
    lng: -80.1475,
    photoAlt: "campuses/west-palm-beach-2.png",
    tagline: "Career campus & College of Chiropractic Medicine",
    description:
      "Separate from the Flagship residential campus, the West Palm Beach site on Vista Parkway is a career-focused campus with classrooms, medical and computer labs, a library, and a large auditorium. The College of Chiropractic Medicine is located here (same address) — a note, not a second pin.",
    established: "2004",
    setting: "Career campus · labs & clinics",
    address: "2085 Vista Parkway, West Palm Beach, FL 33411",
    phone: "(561) 471-6000",
    website: "https://www.keiseruniversity.edu/west-palm-beach/",
    email: "AdmissionsInfoWPB@keiseruniversity.edu",
    aliases: ["chiropractic", "college of chiropractic", "vista parkway", "wpb career"],
    highlights: [
      "College of Chiropractic Medicine on this campus — Doctor of Chiropractic (DC)",
      "Medical, science, and computer laboratories",
      "Library, career center, student lounge, and auditorium",
      "Off Okeechobee Boulevard near Florida's Turnpike, not the Flagship lakefront campus",
    ],
    programs: [
      "Chiropractic, DC",
      "Nursing, AS",
      "Physical Therapist Assistant, AS",
      "Radiologic Technology, AS",
    ],
    skyline: [0.7, 0.6, 0.85, 0.55, 0.7, 0.6, 0.5],
  },
  {
    id: "fort-lauderdale",
    name: "Keiser University Fort Lauderdale",
    city: "Fort Lauderdale",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 26.185,
    lng: -80.1515,
    tagline: "Main campus · Commercial Boulevard",
    description:
      "Fort Lauderdale is Keiser University's main campus, founded in 1977 on Commercial Boulevard. It is the administrative and academic anchor — associate through bachelor's pathways, medical and computer labs, a library, and a career center. Graduate School (1600 W. Commercial Blvd.) and Online Division HQ (1900 W. Commercial Blvd.) sit in the same corridor as their own selectable pins.",
    established: "1977",
    setting: "Main campus · health sciences",
    address: "1500 Northwest 49th Street, Fort Lauderdale, FL 33309",
    phone: "(800) 749-4456",
    phones: ["(954) 776-4456"],
    website: "https://www.keiseruniversity.edu/fort-lauderdale/",
    email: "AdmissionsInfoFTL@keiseruniversity.edu",
    relatedIds: ["graduate-school", "online-global"],
    aliases: ["main campus", "ftl", "commercial boulevard", "1500"],
    highlights: [
      "University main campus (founded 1977) on Commercial Blvd. between I-95 and Florida's Turnpike",
      "Directory: (800) 749-4456 · campus line: (954) 776-4456",
      "Classrooms, medical labs, computer labs, library, auditorium, and career center",
      "Related pins next door: Graduate School and Online Division HQ",
    ],
    programs: [
      "Nursing, AS",
      "Radiologic Technology, AS",
      "Diagnostic Medical Sonography, AS",
      "Physical Therapist Assistant, AS",
      "Biomedical Sciences, BS (Pre-PA)",
    ],
    skyline: [0.7, 0.5, 0.8, 0.55, 0.6, 0.45],
  },
  {
    id: "graduate-school",
    name: "Keiser University Graduate School",
    city: "Fort Lauderdale",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 26.1865,
    lng: -80.157,
    tagline: "Master's, specialist, doctoral, and certificate programs",
    description:
      "The Graduate School is a first-class Keiser location at 1600 West Commercial Boulevard — next to main campus (1500 NW 49th Street / Commercial Blvd.) and Online HQ (1900 W. Commercial Blvd.). Official copy: graduate programs enable working adults to take classes 100% online, with small classes, personalized instruction, and support from admission through graduation. Master's, specialist, doctoral, and certificate programs are published on the Graduate School and Graduate Degrees pages.",
    established: "2006",
    setting: "Graduate School · Fort Lauderdale corridor",
    address: "1600 West Commercial Boulevard, Fort Lauderdale, FL 33309",
    phone: "(888) 753-4737",
    phones: ["(954) 318-1620"],
    website: "https://www.keiseruniversity.edu/graduate-school/",
    email: "AdmissionsInfoGRAD@keiseruniversity.edu",
    relatedIds: ["fort-lauderdale", "online-global"],
    aliases: ["grad school", "graduate", "masters", "doctoral", "phd", "mba", "1600"],
    highlights: [
      "Listed separately on keiseruniversity.edu/campuses — not a footnote on Fort Lauderdale",
      "Directory phones: (888) 753-4737 and (954) 318-1620",
      "Official Graduate School page: master, specialist, doctoral, and certificate programs; many delivered 100% online",
      "Related pins on this corridor: main campus and Online Division HQ",
    ],
    programs: [
      "Business Administration, MBA",
      "Doctor of Business Administration, DBA",
      "Clinical Mental Health Counseling, MS",
      "Family Nurse Practitioner, MSN FNP",
      "Education-Leadership, MSEd",
      "Industrial and Organizational Psychology, MS",
    ],
    skyline: [0.7, 0.6, 0.85, 0.55, 0.7, 0.6],
  },
  {
    id: "miami",
    name: "Keiser University Miami",
    city: "Miami",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 25.7855,
    lng: -80.386,
    tagline: "West Miami-Dade career campus",
    description:
      "The Miami campus at 2101 NW 117th Avenue serves the west Miami-Dade / Doral area with career-focused degrees. Official campus copy highlights business, criminal justice, and nursing in a students-first environment — classrooms, labs, and student services, not a downtown high-rise.",
    established: "2001",
    setting: "Urban · career-focused",
    address: "2101 NW 117th Avenue, Miami, FL 33172",
    phone: "(305) 596-2226",
    website: "https://www.keiseruniversity.edu/miami/",
    email: "AdmissionsInfoMIA@keiseruniversity.edu",
    highlights: [
      "West Miami-Dade location near Doral",
      "Official campus page: career-focused programs including Business, Criminal Justice, and Nursing",
      "Classrooms, labs, and student services on site",
    ],
    programs: [
      "Nursing, AS",
      "Physical Therapist Assistant, AS",
      "Medical Assisting, AS",
      "Biomedical Sciences, BS (Pre-Med)",
    ],
    skyline: [0.85, 0.7, 0.95, 0.6, 0.8, 0.55, 0.7],
  },
  {
    id: "pembroke-pines",
    name: "Keiser University Pembroke Pines",
    city: "Pembroke Pines",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 26.003,
    lng: -80.351,
    tagline: "Broward County career campus",
    description:
      "Pembroke Pines serves southwestern Broward with Keiser's career-focused classroom and lab model — admissions, academic affairs, student services, and financial services staffed full time.",
    established: "2004",
    setting: "Suburban · career-focused",
    address: "1640 SW 145th Avenue, Pembroke Pines, FL 33027",
    phone: "(954) 431-4300",
    website: "https://www.keiseruniversity.edu/pembroke-pines/",
    email: "AdmissionsInfoPP@keiseruniversity.edu",
    highlights: [
      "Southwestern Broward location",
      "Spacious classrooms, computer and medical labs, library, and career center",
      "Day and evening scheduling typical of Keiser career campuses",
    ],
    programs: [
      "Nursing, BSN (Accelerated)",
      "Radiologic Technology, AS",
      "Occupational Therapy Assistant, AS",
      "Medical Assisting, AS",
    ],
    skyline: [0.6, 0.55, 0.7, 0.5, 0.6, 0.5],
  },
  {
    id: "tampa",
    name: "Keiser University Tampa",
    city: "Tampa",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 28.0135,
    lng: -82.547,
    photo: "campuses/tampa.webp",
    tagline: "Tampa Bay career campus",
    description:
      "The Tampa campus on West Waters Avenue serves Tampa Bay with career-focused degrees. Official programs published for this campus include nursing, radiologic technology, occupational therapy assistant, and biomedical sciences.",
    established: "2005",
    setting: "Suburban · career-focused",
    address: "5002 West Waters Avenue, Tampa, FL 33634",
    phone: "(813) 885-4900",
    website: "https://www.keiseruniversity.edu/tampa/",
    email: "AdmissionsInfoTPA@keiseruniversity.edu",
    highlights: [
      "West Waters Avenue / Tampa Bay",
      "Hands-on health-science labs published on the campus programs page",
      "Flexible day and evening schedules typical of Keiser career campuses",
    ],
    programs: [
      "Nursing, AS",
      "Radiologic Technology, AS",
      "Occupational Therapy Assistant, AS",
      "Biomedical Sciences, BS (Pre-PA)",
    ],
    skyline: [0.6, 0.8, 0.55, 0.7, 0.5, 0.65],
  },
  {
    id: "clearwater",
    name: "Keiser University Clearwater",
    city: "Clearwater",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 27.9245,
    lng: -82.729,
    photo: "campuses/clearwater.png",
    tagline: "Pinellas County campus",
    description:
      "Clearwater sits on U.S. Highway 19 in Pinellas County and serves the west side of Tampa Bay. Official on-campus programs published for this site include nursing, radiologic technology, medical assisting, and medical laboratory technician.",
    established: "2015",
    setting: "Suburban · career-focused",
    address: "16120 U.S. Highway 19 North, Clearwater, FL 33764",
    phone: "(727) 576-6500",
    website: "https://www.keiseruniversity.edu/clearwater/",
    email: "AdmissionsInfoCLR@keiseruniversity.edu",
    highlights: [
      "Pinellas County / west Tampa Bay",
      "Highway 19 location with on-site parking",
      "Career programs with small classes",
    ],
    programs: [
      "Nursing, AS",
      "Radiologic Technology, AS",
      "Medical Assisting, AS",
      "Medical Laboratory Technician, AS",
    ],
    skyline: [0.55, 0.6, 0.5, 0.6, 0.5],
  },
  {
    id: "new-port-richey",
    name: "Keiser University New Port Richey",
    city: "New Port Richey",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 28.248,
    lng: -82.719,
    tagline: "Pasco County campus",
    description:
      "New Port Richey serves Pasco County and the north Tampa Bay corridor. Official programs published for this campus include nursing, diagnostic medical sonography, medical assisting, and cybersecurity.",
    established: "2015",
    setting: "Suburban · career-focused",
    address: "6300 US Highway 19 North, New Port Richey, FL 34652",
    phone: "(727) 484-3110",
    website: "https://www.keiseruniversity.edu/new-port-richey/",
    email: "AdmissionsInfoNPR@keiseruniversity.edu",
    highlights: [
      "Pasco County location on U.S. 19",
      "Small classes and hands-on labs",
      "Serves working adults in north Tampa Bay",
    ],
    programs: [
      "Nursing, AS",
      "Diagnostic Medical Sonography, AS",
      "Medical Assisting, AS",
      "Cybersecurity, BS",
    ],
    skyline: [0.5, 0.5, 0.55, 0.45, 0.5],
  },
  {
    id: "orlando",
    name: "Keiser University Orlando",
    city: "Orlando",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 28.538,
    lng: -81.3085,
    tagline: "Central Florida career campus",
    description:
      "The Orlando campus on Lake Underhill Road is an east-Orlando career campus. Official on-campus programs published for this site include nursing, medical laboratory science, radiologic technology, and biomedical sciences.",
    established: "2002",
    setting: "Metro · industry-connected",
    address: "5600 Lake Underhill Road, Orlando, FL 32807",
    phone: "(407) 273-5800",
    website: "https://www.keiseruniversity.edu/orlando/",
    email: "AdmissionsInfoORL@keiseruniversity.edu",
    highlights: [
      "East Orlando / Lake Underhill location",
      "Official campus programs include nursing and medical laboratory science",
      "Classroom, lab, and student-services model",
    ],
    programs: [
      "Nursing, AS",
      "Medical Laboratory Science, BS",
      "Radiologic Technology, AS",
      "Biomedical Sciences, BS (Pre-Med)",
    ],
    skyline: [0.8, 0.95, 0.6, 0.75, 0.5, 0.7, 0.6],
  },
  {
    id: "lakeland",
    name: "Keiser University Lakeland",
    city: "Lakeland",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 28.088,
    lng: -81.973,
    tagline: "Polk County campus",
    description:
      "Lakeland sits between Tampa and Orlando on Interstate Drive and serves Polk County. Official on-campus programs published for this site include nursing, radiologic technology, physical therapist assistant, and diagnostic medical sonography.",
    established: "2000",
    setting: "Suburban · career-focused",
    address: "2400 Interstate Drive, Lakeland, FL 33805",
    phone: "(863) 682-6020",
    website: "https://www.keiseruniversity.edu/lakeland/",
    email: "AdmissionsInfoLL@keiseruniversity.edu",
    highlights: ["Between Tampa and Orlando", "Polk County employer ties", "Small classes and on-site labs"],
    programs: [
      "Nursing, AS",
      "Radiologic Technology, AS",
      "Physical Therapist Assistant, AS",
      "Diagnostic Medical Sonography, AS",
    ],
    skyline: [0.5, 0.55, 0.6, 0.5, 0.45],
  },
  {
    id: "jacksonville",
    name: "Keiser University Jacksonville",
    city: "Jacksonville",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 30.2465,
    lng: -81.5885,
    tagline: "Northeast Florida career campus",
    description:
      "Jacksonville's Southpoint campus serves Northeast Florida. Official on-campus programs published for this site include nursing, physical therapist assistant, occupational therapy assistant, and biomedical sciences.",
    established: "2003",
    setting: "Metro · health & business",
    address: "6430 Southpoint Parkway, Jacksonville, FL 32216",
    phone: "(904) 296-3440",
    website: "https://www.keiseruniversity.edu/jacksonville/",
    email: "AdmissionsInfoJAX@keiseruniversity.edu",
    highlights: [
      "Southpoint / Southside Jacksonville",
      "Nursing and allied-health labs published on the campus programs page",
      "Admissions, academic affairs, student services, and financial services on site",
    ],
    programs: [
      "Nursing, AS",
      "Physical Therapist Assistant, AS",
      "Occupational Therapy Assistant, AS",
      "Biomedical Sciences, BS (Pre-PA)",
    ],
    skyline: [0.6, 0.55, 0.7, 0.5, 0.6],
  },
  {
    id: "daytona",
    name: "Keiser University Daytona Beach",
    city: "Daytona Beach",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 29.17,
    lng: -81.076,
    photo: "campuses/daytona.webp",
    tagline: "Volusia County career campus",
    description:
      "The Daytona Beach campus on Business Park Boulevard serves Volusia County and the Atlantic coast. Official on-campus programs published for this site include nursing, radiologic technology, diagnostic medical sonography, and occupational therapy assistant.",
    established: "1995",
    setting: "Coastal · career-focused",
    address: "1800 Business Park Boulevard, Daytona Beach, FL 32114",
    phone: "(386) 274-5060",
    website: "https://www.keiseruniversity.edu/daytona-beach/",
    email: "AdmissionsInfoDAY@keiseruniversity.edu",
    highlights: [
      "Volusia County / Business Park Boulevard",
      "Health-science labs published on the campus programs page",
      "Flexible scheduling for working students",
    ],
    programs: [
      "Nursing, AS",
      "Radiologic Technology, AS",
      "Diagnostic Medical Sonography, AS",
      "Occupational Therapy Assistant, AS",
    ],
    skyline: [0.55, 0.5, 0.65, 0.5, 0.55],
  },
  {
    id: "melbourne",
    name: "Keiser University Melbourne",
    city: "Melbourne",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 28.0665,
    lng: -80.6085,
    tagline: "Space Coast campus",
    description:
      "On South Babcock Street in Melbourne — three miles from I-95 and less than thirty minutes from Cocoa Beach. Official campus copy also notes culinary-arts kitchens and banquet space. This is one of Keiser's older Florida sites (1989).",
    established: "1989",
    setting: "Coastal · STEM-connected",
    address: "900 South Babcock Street, Melbourne, FL 32901",
    phone: "(877) 636-3618",
    phones: ["(321) 409-4800"],
    website: "https://www.keiseruniversity.edu/melbourne/",
    email: "AdmissionsInfoMEL@keiseruniversity.edu",
    highlights: [
      "Directory: (877) 636-3618 · campus line: (321) 409-4800",
      "Official programs include nursing, imaging, and occupational therapy assistant",
      "Campus page: modern kitchens and banquet space for culinary arts",
    ],
    programs: [
      "Nursing, AS",
      "Radiologic Technology, AS",
      "Diagnostic Medical Sonography, AS",
      "Occupational Therapy Assistant, AS",
    ],
    skyline: [0.6, 0.7, 0.55, 0.65, 0.5],
  },
  {
    id: "port-st-lucie",
    name: "Keiser University Port St. Lucie",
    city: "Port St. Lucie",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 27.265,
    lng: -80.409,
    tagline: "Treasure Coast campus",
    description:
      "Port St. Lucie serves the Treasure Coast from Discovery Way. Official on-campus programs published for this site include nursing, radiologic technology, diagnostic medical sonography, and biomedical sciences.",
    established: "2004",
    setting: "Suburban · career-focused",
    address: "9400 SW Discovery Way, Port St. Lucie, FL 34987",
    phone: "(772) 398-9990",
    website: "https://www.keiseruniversity.edu/port-st-lucie/",
    email: "AdmissionsInfoPSL@keiseruniversity.edu",
    highlights: ["Treasure Coast location", "Classroom and lab setting", "Serves St. Lucie and surrounding counties"],
    programs: [
      "Nursing, AS",
      "Radiologic Technology, AS",
      "Diagnostic Medical Sonography, AS",
      "Biomedical Sciences, BS (Pre-Med)",
    ],
    skyline: [0.5, 0.55, 0.5, 0.6, 0.45],
  },
  {
    id: "sarasota",
    name: "Keiser University Sarasota",
    city: "Sarasota",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 27.384,
    lng: -82.454,
    tagline: "Lakewood Ranch campus",
    description:
      "Sarasota's campus is in the Lakewood Ranch area at 6151 Lake Osprey Drive, near I-75 and University Parkway. Official campus copy notes culinary kitchens and banquet space; published on-campus programs include nursing, radiologic technology, physical therapist assistant, and culinary arts.",
    established: "1995",
    setting: "Coastal · career-focused",
    address: "6151 Lake Osprey Drive, Sarasota, FL 34240",
    phone: "(866) 534-7372",
    phones: ["(941) 907-3900"],
    website: "https://www.keiseruniversity.edu/sarasota/",
    email: "AdmissionsInfoSAR@keiseruniversity.edu",
    highlights: [
      "Lakewood Ranch / Sarasota-Manatee",
      "Directory: (866) 534-7372 · campus line: (941) 907-3900",
      "Campus page: culinary kitchens and banquet space in addition to health labs",
    ],
    programs: [
      "Nursing, AS",
      "Radiologic Technology, AS",
      "Physical Therapist Assistant, AS",
      "Culinary Arts, AS",
    ],
    skyline: [0.5, 0.6, 0.55, 0.45, 0.6],
  },
  {
    id: "fort-myers",
    name: "Keiser University Fort Myers",
    city: "Fort Myers",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 26.64,
    lng: -81.812,
    photo: "campuses/fort-myers.jpg",
    tagline: "Lee County career campus",
    description:
      "Fort Myers delivers career programs from Forum Corporate Parkway. Official on-campus programs published for this site include nursing, diagnostic medical sonography, physical therapist assistant, and occupational therapy assistant.",
    established: "2010",
    setting: "Suburban · career-focused",
    address: "9100 Forum Corporate Parkway, Fort Myers, FL 33905",
    phone: "(239) 277-1336",
    website: "https://www.keiseruniversity.edu/fort-myers/",
    email: "AdmissionsInfoFTM@keiseruniversity.edu",
    highlights: [
      "Lee County / Forum Corporate Parkway",
      "Health-science labs on the official programs list",
      "Day and evening options",
    ],
    programs: [
      "Nursing, AS",
      "Diagnostic Medical Sonography, AS",
      "Physical Therapist Assistant, AS",
      "Occupational Therapy Assistant, AS",
    ],
    skyline: [0.6, 0.55, 0.7, 0.5, 0.6, 0.5],
  },
  {
    id: "naples",
    name: "Keiser University Naples",
    city: "Naples",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 26.1195,
    lng: -81.773,
    tagline: "Collier County campus",
    description:
      "Naples serves Southwest Florida from Tamiami Trail East. Official on-campus programs published for this site include nursing, radiologic technology, medical assisting science, and health services administration.",
    established: "2018",
    setting: "Suburban · health sciences",
    address: "3909 Tamiami Trail East, Naples, FL 34112",
    phone: "(239) 513-1135",
    website: "https://www.keiseruniversity.edu/naples/",
    email: "AdmissionsInfoNAP@keiseruniversity.edu",
    highlights: [
      "Collier County on U.S. 41",
      "Nursing and allied-health programs on the official campus list",
      "Small, supportive cohorts",
    ],
    programs: [
      "Nursing, AS",
      "Radiologic Technology, AS",
      "Medical Assisting Science, AS",
      "Health Services Administration",
    ],
    skyline: [0.55, 0.5, 0.6, 0.5, 0.5],
  },
  {
    id: "tallahassee",
    name: "Keiser University Tallahassee",
    city: "Tallahassee",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 30.481,
    lng: -84.223,
    photo: "campuses/tallahassee.png",
    tagline: "Capital-city campus",
    description:
      "In Florida's capital, the Tallahassee campus on Halstead Boulevard (Building 2) pairs career programs with proximity to state government and regional health systems. Official on-campus programs published for this site include nursing, diagnostic medical sonography, culinary arts, and public administration.",
    established: "1992",
    setting: "Capital city · public-service",
    address: "1700 Halstead Boulevard, Building 2, Tallahassee, FL 32309",
    phone: "(850) 906-9494",
    website: "https://www.keiseruniversity.edu/tallahassee/",
    email: "AdmissionsInfoTAL@keiseruniversity.edu",
    highlights: [
      "Building 2 on Halstead Boulevard",
      "Official programs include nursing, culinary arts, and public administration",
      "Capital-region internships and employers",
    ],
    programs: [
      "Nursing, AS",
      "Diagnostic Medical Sonography, AS",
      "Culinary Arts, AS",
      "Public Administration, BA",
    ],
    skyline: [0.55, 0.6, 0.5, 0.7, 0.45],
  },
  {
    id: "ocala",
    name: "Keiser University Ocala",
    city: "Ocala",
    state: "FL",
    country: "United States",
    region: "florida",
    lat: 29.201,
    lng: -82.112,
    tagline: "Marion County campus",
    description:
      "Ocala is Keiser's North Central Florida site at 1601 NE 25th Avenue, Suite 602. Official programs published for this campus include nursing, radiologic technology, surgical technology, and diagnostic medical sonography — confirm current delivery with Admissions.",
    setting: "Instructional site · career-focused",
    address: "1601 NE 25th Avenue, Suite 602, Ocala, FL 34470",
    phone: "(352) 703-0224",
    website: "https://www.keiseruniversity.edu/ocala/",
    email: "AdmissionsInfoOCALA@keiseruniversity.edu",
    highlights: [
      "Marion County / North Central Florida",
      "Suite 602 instructional site listed in the official directory",
      "Programs shown here are those published on the Ocala campus page",
    ],
    programs: [
      "Nursing, AS",
      "Radiologic Technology, AS",
      "Surgical Technology, AS",
      "Diagnostic Medical Sonography, AS",
    ],
    skyline: [0.5, 0.55, 0.5, 0.45, 0.5],
  },
  {
    id: "latin-american",
    name: "Keiser University Latin American Campus",
    city: "San Marcos",
    state: "Carazo",
    country: "Nicaragua",
    region: "latin-america",
    lat: 11.9096,
    lng: -86.2031,
    virtualTour: "https://youtu.be/KTpKJbvUy0k?is=O60UzSAqANQLwrLJ",
    tagline: "Residential international campus in San Marcos",
    description:
      "The Latin American Campus in San Marcos, Carazo, is Keiser's residential international campus: a U.S.-accredited, English-language curriculum recognized by Nicaragua's Council of National Universities (CNU). Official campus copy: the only U.S.-accredited institution of higher education granting degrees in Nicaragua and most of the region. Distinct from the Managua instructional site.",
    established: "2013",
    setting: "International · residential campus",
    address: "Gasolinera UNO 2c. al Sur, San Marcos, Carazo, Nicaragua",
    phone: "(505) 2535-2312",
    phones: ["(505) 2535-2314"],
    website: "https://www.keiseruniversity.edu/san-marcos-carazo-nicaragua/",
    email: "AdmissionsInfoLAC@keiseruniversity.edu",
    relatedIds: ["managua"],
    aliases: ["lac", "san marcos", "nicaragua", "carazo", "latin american campus"],
    highlights: [
      "Residential international campus — residence life, athletics, and student services are staffed on site",
      "American curriculum; U.S. accreditation; CNU recognition in Nicaragua",
      "Directory phones: (505) 2535-2312 and (505) 2535-2314 · U.S. toll-free 1-800-969-1685",
      "Managua is a separate pin (Ofiplaza San Dionisio), not this campus",
    ],
    programs: [
      "Business Administration",
      "Software Engineering, BS",
      "Global Affairs and International Relations, BA",
      "Psychology, BA",
    ],
    skyline: [0.75, 0.6, 0.85, 0.55, 0.7, 0.5],
  },
  {
    id: "managua",
    name: "Keiser University Managua",
    city: "Managua",
    state: "",
    country: "Nicaragua",
    region: "latin-america",
    lat: 12.1148,
    lng: -86.2364,
    photo: "campuses/managua-language-center.png",
    tagline: "Managua instructional site · Ofiplaza San Dionisio",
    description:
      "Listed in the official directory as Managua, Nicaragua — distinct from the residential Latin American Campus in San Marcos. The Managua page identifies an Admissions Office at Ofiplaza San Dionisio, Pista Suburbana. The Fact Book classifies Managua (2019) as an off-campus instructional site and publishes Spanish-language programs on the Managua campus page.",
    established: "2019",
    setting: "International · instructional site",
    address: "Offiplaza San Dionisio, Pista Suburbana, Managua, Nicaragua",
    phone: "011 (505) 22786911",
    website: "https://www.keiseruniversity.edu/managua-nicaragua-campus/",
    email: "AdmissionsInfoLAC@keiseruniversity.edu",
    relatedIds: ["latin-american"],
    aliases: ["ofiplaza", "offiplaza", "san dionisio", "pista suburbana", "managua"],
    highlights: [
      "Official directory listing — not the San Marcos residential campus",
      "Campus page contact block: Admissions Office, Offiplaza San Dionisio, Pista Suburbana",
      "Phone: 011 (505) 22786911 · U.S. toll-free 1-800-969-1685",
      "Spanish-language programs published on the Managua campus page",
    ],
    programs: [
      "Licenciatura en Administración",
      "Licenciatura en Psicología",
      "Graphic Arts and Design, AS",
      "MBA (Spanish)",
    ],
    skyline: [0.5, 0.6, 0.55, 0.5, 0.45],
  },
  {
    id: "san-salvador",
    name: "Keiser University San Salvador",
    city: "San Salvador",
    state: "",
    country: "El Salvador",
    region: "latin-america",
    lat: 13.7016,
    lng: -89.241,
    photo: "campuses/el-salvador.jpg",
    tagline: "El Salvador instructional site · Millennium Plaza",
    description:
      "Official campus page: Keiser University is a U.S.-accredited institution offering graduate, postgraduate, and professional education in El Salvador. The San Salvador instructional site at Millennium Plaza offers career-focused programs in English and Spanish through online, hybrid, and in-person formats, depending on the program.",
    setting: "International · instructional site",
    address: "2do Nivel, Local 219 Millennium Plaza, Paseo General Escalón 3675, San Salvador, El Salvador",
    phone: "+011 503 2250-3050",
    website: "https://www.keiseruniversity.edu/san-salvador/",
    email: "AdmissionsElSalvador@keiseruniversity.edu",
    aliases: ["el salvador", "millennium plaza", "escalon", "escalón"],
    highlights: [
      "Official page calls this an instructional site, not a residential campus",
      "Admissions Office: 2do Nivel, Local 219, Millennium Plaza, Paseo General Escalón 3675",
      "Phone: +011 503 2250-3050",
      "Programs and delivery (online, hybrid, in-person) vary — confirm on the campus page",
    ],
    programs: ["MBA Administración de Servicios de Salud"],
    skyline: [0.85, 0.7, 0.95, 0.6, 0.8, 0.55],
  },
  {
    id: "shanghai",
    name: "Keiser University Shanghai",
    city: "Shanghai",
    state: "",
    country: "China",
    region: "asia",
    lat: 30.8895,
    lng: 121.892,
    photo: "campuses/china.jpg",
    tagline: "China Center · Pudong (Nanhui)",
    description:
      "Listed in the official directory as Shanghai, China. The Fact Book and undergraduate catalog describe this as the Shanghai Center / Shanghai Off-Campus Site (China Center), housed on the Shanghai Industry and Commerce Foreign Language College campus in Nanhui Technical and Educational Park. Official program pages offer Mandarin-language degrees at this China campus.",
    established: "2010",
    setting: "International · China Center",
    address: "Guan Hai Lu Road No. 505, Pudong, Shanghai, China 201300",
    phone: "+86 (21) 6836 9850",
    website: "https://www.keiseruniversity.edu/contact/",
    aliases: ["china", "pudong", "nanhui", "china center", "mandarin"],
    highlights: [
      "Official directory pin — not hidden behind a Florida-only filter",
      "Fact Book: Shanghai Center on the SICFL / SCIFLC campus, Building 4, Nanhui Technical and Educational Park",
      "Phone: +86 (21) 6836 9850",
      "Mandarin-language programs are published on official Keiser program pages for Shanghai",
    ],
    programs: [
      "Business Administration, BA (Mandarin)",
      "Business Administration, MBA (Mandarin)",
      "Applied Psychology, MS (Mandarin)",
      "Industrial and Organizational Psychology, MS (Mandarin)",
    ],
    skyline: [0.8, 0.7, 0.9, 0.6, 0.75, 0.55],
  },
  {
    id: "online-global",
    name: "Keiser University Online Division",
    city: "Worldwide",
    state: "FL",
    country: "United States",
    region: "global",
    lat: 26.19,
    lng: -80.168,
    photo: "campuses/e-campus.jpg",
    tagline: "The same degrees, from anywhere",
    description:
      "Keiser's Online Division (founded 1999) is based at 1900 W. Commercial Boulevard, Suite 100, in Fort Lauderdale and delivers career-focused degrees worldwide. Online Division En Línea en Español shares this same address — the official site does not treat it as a second location, so it is not a second globe pin. Faculty and SACSCOC accreditation are the university's.",
    established: "1999",
    setting: "Online · worldwide (Fort Lauderdale HQ)",
    address: "1900 West Commercial Boulevard, Suite 100, Fort Lauderdale, FL 33309",
    phone: "(888) 453-4737",
    phones: ["(954) 351-4040"],
    website: "https://www.keiseruniversity.edu/online/",
    relatedIds: ["fort-lauderdale", "graduate-school"],
    aliases: ["en linea", "en línea", "español", "espanol", "spanish online", "latin division", "1900"],
    highlights: [
      "Flexible 100% online degrees from the same accredited university",
      "Directory: (888) 453-4737 and (954) 351-4040",
      "En Línea en Español (same building): (954) 745-8455 / (888) 960-8790 — not a separate pin",
      "Related pins on this corridor: main campus and Graduate School",
    ],
    programs: [
      "Business Administration, BA / MBA",
      "Psychology, BA / MS",
      "Health Services Administration",
      "Information Technology",
      "Criminal Justice",
    ],
    skyline: [0.6, 0.7, 0.55, 0.65, 0.5, 0.6],
  },
];
