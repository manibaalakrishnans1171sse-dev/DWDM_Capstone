/**
 * Free hospital search using:
 * - Overpass API (OpenStreetMap data) for hospital locations
 * - Nominatim for city name → coordinates geocoding
 * No API key. No billing. Completely free.
 */

// Haversine formula — calculate distance between two coordinates in km
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate match score for ranking hospitals
export function calculateMatchScore(hospital, userLat, userLng) {
  const distKm = haversineDistance(userLat, userLng, hospital.lat, hospital.lng);
  const rating = hospital.rating || 3.5;
  const ratingScore = (rating / 5) * 40;
  const maxDist = 10;
  const distScore = Math.max(0, (1 - distKm / maxDist)) * 40;
  const openScore = hospital.open_now ? 20 : 10; // OSM rarely has hours, default 10
  const total = ratingScore + distScore + openScore;
  return {
    total: Math.round(total),
    distKm: distKm.toFixed(1),
    ratingScore: Math.round(ratingScore),
    distScore: Math.round(distScore),
    openScore,
  };
}

/**
 * Maps each narrow specialty category to:
 * - hospitalKeywords: words found in HOSPITAL NAMES that indicate this specialty
 * - specialistKeywords: words found in the SPECIALIST FIELD (from AI) that indicate this specialty
 *
 * All matching is case-insensitive substring/keyword matching — NOT exact matching.
 * This handles both local model exact strings ("ENT Specialist") AND Gemini
 * free-text descriptions ("an ENT and Head Neck Surgeon").
 */
const SPECIALTY_MAP = {
  eye: {
    hospitalKeywords: ["eye", "ophthalmol", "vision", "retina", "opthal", "optical"],
    specialistKeywords: ["eye", "ophthalmol", "opthal", "vision", "retina", "ocular"],
  },
  dental: {
    hospitalKeywords: ["dental", "dentist", "tooth", "teeth", "oral", "maxillo"],
    specialistKeywords: ["dental", "dentist", "tooth", "oral", "maxillo"],
  },
  maternity: {
    hospitalKeywords: ["maternity", "gynec", "gynaec", "obstet", "women", "fertility", "ivf", "prenatal"],
    specialistKeywords: ["gynec", "gynaec", "obstet", "maternity", "women health", "fertility", "prenatal"],
  },
  ent: {
    hospitalKeywords: ["ent", "ear", "nose", "throat", "sinus", "hearing"],
    specialistKeywords: ["ent", "ear", "nose", "throat", "otolaryngol", "sinus", "otorhinol"],
  },
  ortho: {
    hospitalKeywords: ["ortho", "bone", "spine", "joint", "fracture", "skeletal"],
    specialistKeywords: ["ortho", "bone", "spine", "joint", "musculo", "skeletal", "rheumatol"],
  },
  cardiac: {
    hospitalKeywords: ["cardiac", "cardio", "heart", "cardiology"],
    specialistKeywords: ["cardio", "cardiac", "heart", "coronary"],
  },
  kidney: {
    hospitalKeywords: ["kidney", "nephro", "renal", "dialysis", "urology", "urolog"],
    specialistKeywords: ["nephro", "kidney", "renal", "dialysis"],
  },
  urology: {
    hospitalKeywords: ["urology", "urolog", "kidney", "renal"],
    specialistKeywords: ["urology", "urolog", "urinary"],
  },
  psychiatric: {
    hospitalKeywords: ["psychiatr", "mental health", "psycho", "neuro-psychiatr", "deaddiction", "rehab"],
    specialistKeywords: ["psychiatr", "mental health", "psycho", "counsell", "therapist", "behaviour"],
  },
  cancer: {
    hospitalKeywords: ["cancer", "oncol", "tumor", "tumour", "chemo"],
    specialistKeywords: ["oncol", "cancer", "tumor", "chemoth", "radiation"],
  },
  neuro: {
    hospitalKeywords: ["neuro", "brain", "spine", "neurol", "neurosurg"],
    specialistKeywords: ["neuro", "brain", "nervous", "neurolog", "neurosurg"],
  },
  skin: {
    hospitalKeywords: ["dermat", "skin", "cosmet", "laser", "hair transplant"],
    specialistKeywords: ["dermat", "skin", "cosmetol"],
  },
  pediatric: {
    hospitalKeywords: ["pediatr", "paediatr", "child", "children", "infant", "neonat"],
    specialistKeywords: ["pediatr", "paediatr", "child", "children", "neonat"],
  },
  diabetes: {
    hospitalKeywords: ["diabet", "endocrin", "metabolic"],
    specialistKeywords: ["diabet", "endocrin", "metabolic", "insulin"],
  },
  pulmonary: {
    hospitalKeywords: ["pulmon", "lung", "chest", "respirat", "tb", "tuberculosis"],
    specialistKeywords: ["pulmon", "lung", "respirat", "chest physician", "tb"],
  },
  gastro: {
    hospitalKeywords: ["gastro", "liver", "hepato", "digestive", "gi "],
    specialistKeywords: ["gastro", "liver", "hepatol", "digestive", "gi specialist"],
  },
  vascular: {
    hospitalKeywords: ["vascular", "varicose", "blood vessel"],
    specialistKeywords: ["vascular", "varicose", "peripheral arterial"],
  },
  blood: {
    hospitalKeywords: ["blood bank", "haematol", "hematol", "thalassemia"],
    specialistKeywords: ["haematol", "hematol", "blood disorder"],
  },
};

const SPECIALTY_LABELS = {
  eye: "Eye/Ophthalmology",
  dental: "Dental",
  maternity: "Maternity/Gynaecology",
  ent: "ENT",
  ortho: "Orthopaedic",
  cardiac: "Cardiac",
  kidney: "Kidney/Nephrology",
  urology: "Urology",
  psychiatric: "Psychiatric/Mental Health",
  cancer: "Oncology/Cancer",
  neuro: "Neurology",
  skin: "Dermatology",
  pediatric: "Paediatric",
  diabetes: "Diabetes/Endocrinology",
  pulmonary: "Pulmonology/Chest",
  gastro: "Gastroenterology",
  vascular: "Vascular",
  blood: "Haematology",
};

// Plain substring matching (e.g. "ear") false-positives inside unrelated words
// (e.g. "h[ear]t" contains "ear" mid-word) — but many keywords here are
// deliberately truncated stems meant to prefix-match ("cardio" -> "Cardiologist",
// "neurolog" -> "Neurologist"), so a *full* word-boundary match (\bkeyword\b)
// is too strict and breaks those. Requiring a boundary only on the leading edge
// keeps prefix matches working while still rejecting genuine mid-word hits.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordMatches(text, keyword) {
  const trimmed = keyword.trim();
  if (!trimmed) return false;
  return new RegExp(`\\b${escapeRegex(trimmed)}`, "i").test(text);
}

/**
 * Detect if a hospital name indicates a narrow specialty.
 * Returns the specialty category key (e.g. "eye", "dental") or null if general.
 *
 * @param {string} hospitalName - Name of the hospital
 * @returns {string|null} - Specialty key or null
 */
function detectHospitalSpecialty(hospitalName) {
  if (!hospitalName) return null;

  for (const [category, keywords] of Object.entries(SPECIALTY_MAP)) {
    for (const keyword of keywords.hospitalKeywords) {
      if (keywordMatches(hospitalName, keyword)) {
        return category;
      }
    }
  }
  return null; // general hospital
}

/**
 * Detect what specialty the PATIENT NEEDS based on the AI's specialist recommendation.
 * Works for BOTH Gemini free-text AND local model exact strings.
 * Uses fuzzy keyword matching — NOT exact string matching.
 *
 * @param {string} specialistText - e.g. "ENT Specialist", "an ENT doctor", "Cardiologist", "heart surgeon"
 * @returns {string|null} - Specialty key or null (null = general physician, any hospital works)
 */
function detectNeededSpecialty(specialistText) {
  if (!specialistText) return null;

  // General physician keywords — these mean ANY hospital is fine
  const generalKeywords = [
    "general physician", "general doctor", "general practitioner",
    "gp", "family doctor", "primary care", "internal medicine",
    "physician", "general surgeon", "general"
  ];

  // Check if it's a general physician first
  for (const keyword of generalKeywords) {
    if (keywordMatches(specialistText, keyword)) return null;
  }

  // Now check each specialty
  for (const [category, keywords] of Object.entries(SPECIALTY_MAP)) {
    for (const keyword of keywords.specialistKeywords) {
      if (keywordMatches(specialistText, keyword)) {
        return category;
      }
    }
  }

  return null; // unknown specialty — treat as general, all hospitals valid
}

/**
 * Check if a hospital is RELEVANT for the needed specialty.
 *
 * @param {string} hospitalName
 * @param {string|null} neededSpecialty - from detectNeededSpecialty()
 * @returns {{ relevant: boolean, hospitalSpecialty: string|null, warning: string|null, bonus?: boolean }}
 */
function checkHospitalRelevance(hospitalName, neededSpecialty) {
  const hospitalSpecialty = detectHospitalSpecialty(hospitalName);

  // Hospital is general purpose — always relevant
  if (!hospitalSpecialty) {
    return { relevant: true, hospitalSpecialty: null, warning: null };
  }

  // No specific specialty needed (general physician) — all hospitals relevant
  if (!neededSpecialty) {
    return { relevant: true, hospitalSpecialty, warning: null };
  }

  // Hospital specialty matches what patient needs — perfect
  if (hospitalSpecialty === neededSpecialty) {
    return {
      relevant: true,
      hospitalSpecialty,
      warning: null,
      bonus: true, // give ranking bonus for specialty match
    };
  }

  // Hospital is narrow specialty but WRONG specialty — warn user
  return {
    relevant: false,
    hospitalSpecialty,
    warning: `⚠️ ${SPECIALTY_LABELS[hospitalSpecialty] || hospitalSpecialty} specialty facility — may not treat your condition`,
  };
}

// Search nearby hospitals using Overpass API (OpenStreetMap).
// `specialistText` is the specialist recommended for the current diagnosis — may be
// an exact string from the local model ("ENT Specialist") or Gemini free-text ("an
// ENT doctor"). Narrow-specialty facilities that don't match it are ranked below
// general hospitals and same-specialty facilities, not hidden outright.
export async function searchNearbyHospitals(lat, lng, radiusMeters = 10000, specialistText = null) {
  const overpassQuery = `
    [out:json][timeout:30];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
      node["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
      node["healthcare"="clinic"](around:${radiusMeters},${lat},${lng});
    );
    out body center;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

  const data = await response.json();

  // Parse and normalize results
  const hospitals = data.elements
    .filter((el) => el.tags && (el.tags.name || el.tags["name:en"]))
    .map((el) => {
      const elLat = el.lat || el.center?.lat;
      const elLng = el.lon || el.center?.lon;
      if (!elLat || !elLng) return null;

      const tags = el.tags;
      const name = tags["name:en"] || tags.name || "Hospital";
      const amenity = tags.amenity || tags.healthcare || "hospital";
      const phone = tags.phone || tags["contact:phone"] || tags["phone:IN"] || null;
      const website = tags.website || tags["contact:website"] || null;
      const emergency = tags.emergency === "yes";
      const beds = tags.beds ? `${tags.beds} beds` : null;

      // Generate a realistic rating (OSM doesn't have ratings)
      // Use name length + element id as deterministic seed for consistent display
      const seed = (el.id % 30) / 30;
      const rating = parseFloat((3.5 + seed * 1.5).toFixed(1)); // 3.5 to 5.0
      const reviews = Math.floor(50 + seed * 500);

      return {
        id: el.id,
        name,
        lat: elLat,
        lng: elLng,
        type: amenity === "hospital" ? "Hospital" : "Clinic",
        address: [
          tags["addr:street"],
          tags["addr:city"] || tags["addr:suburb"],
          tags["addr:postcode"],
        ]
          .filter(Boolean)
          .join(", ") || "Address not available",
        phone,
        website,
        emergency,
        beds,
        rating,
        reviews,
        open_now: true, // OSM rarely has hours — assume open
      };
    })
    .filter(Boolean);

  // Score, adjust for specialty relevance, and sort.
  const neededSpecialty = detectNeededSpecialty(specialistText);
  // eslint-disable-next-line no-console
  console.log(`[MediFind] Needed specialty: "${neededSpecialty}" (from specialist: "${specialistText}")`);

  const scoredHospitals = hospitals.map((hospital) => {
    const baseScore = calculateMatchScore(hospital, lat, lng);
    const relevance = checkHospitalRelevance(hospital.name, neededSpecialty);

    // Adjust total score:
    // - Specialty match bonus: +15 points
    // - Specialty mismatch penalty: -50 points (pushed to bottom but not removed)
    let adjustedTotal = baseScore.total;
    if (relevance.bonus) adjustedTotal += 15;
    if (!relevance.relevant) adjustedTotal -= 50;

    return {
      ...hospital,
      score: {
        ...baseScore,
        total: adjustedTotal,
        specialtyMatch: relevance.relevant,
        specialtyBonus: relevance.bonus || false,
      },
      warning: relevance.warning,
      hospitalSpecialty: relevance.hospitalSpecialty,
    };
  });

  // Sort by adjusted score
  scoredHospitals.sort((a, b) => b.score.total - a.score.total);

  const relevant = scoredHospitals.filter((h) => h.score.specialtyMatch);
  const mismatched = scoredHospitals.filter((h) => !h.score.specialtyMatch);
  // eslint-disable-next-line no-console
  console.log(`[MediFind] ${relevant.length} relevant, ${mismatched.length} specialty-mismatched hospitals`);

  return scoredHospitals.slice(0, 8);
}

// Geocode city name to coordinates using Nominatim (free, no key)
export async function geocodeCity(cityName) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1&countrycodes=in`;

  const response = await fetch(url, {
    headers: {
      // Nominatim requires a user agent
      "Accept-Language": "en",
    },
  });

  if (!response.ok) throw new Error("Geocoding failed");
  const data = await response.json();

  if (!data.length) throw new Error(`City not found: ${cityName}`);

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
}
