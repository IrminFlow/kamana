/**
 * Job-title matching shared by the browser (suggestions) and Convex (saving and searching).
 * Keep this file free of browser- or server-only APIs.
 */

/** Alternate titles → the one title we store and show. Keys are normalised (see `normalizeProfession`). */
const ALIASES: Record<string, string> = {
  "software engineer": "Software Developer / Engineer",
  "software developer": "Software Developer / Engineer",
  "software engineering": "Software Developer / Engineer",
  "computer science and engineering (software engineering)": "Software Developer / Engineer",
  "backend software engineer": "Backend Developer",
  "frontend software engineer": "Frontend Developer",
  "full-stack software engineer": "Full-Stack Developer",
  "java software engineer": "Java Developer",
  "python software engineer": "Python Developer",
  "app developer": "Application Developer",
  "power bi developer": "Power BI / Business Intelligence Developer",
  "qa engineer": "Quality Assurance Engineer",
  "3 wheeler driver": "Three-Wheeler Driver",
  "3-wheeler driver": "Three-Wheeler Driver",
  "auto-rickshaw driver": "Auto / Three-Wheeler Driver",
  "auto rickshaw driver": "Auto / Three-Wheeler Driver",
  "rikshaw driver": "Rickshaw Driver",
  "civil cad operator": "Civil CAD Designer",
  "civil cad draughtsman": "Civil CAD Designer",
  "autocad draughtsman (civil)": "Civil CAD Designer",
  "autocad operator (civil)": "Civil CAD Designer",
  "autocad civil 3d operator": "AutoCAD Civil 3D Designer",
  "air conditioner technician": "Air Conditioning Technician",
  "automotive technician": "Automobile Technician",
  "bpo voice process executive": "Voice Process Executive",
  "bpo non-voice process executive": "Non-Voice Process Executive",
  "civil site engineer": "Site Engineer (Civil)",
  "mali / माली": "Gardener / माली",
  "माली": "Gardener / माली",
  "gardener": "Gardener / माली",
  "vegetable seller": "Sabji Wala / सब्जी वाला",
  "vegetable seller / सब्जी विक्रेता": "Sabji Wala / सब्जी वाला",
  "सब्जी वाला": "Sabji Wala / सब्जी वाला",
  "guard": "Security Guard",
  "bank security guard": "Security Guard",
  "office security guard": "Security Guard",
  "factory security guard": "Security Guard",
  "store security guard": "Security Guard",
  "security guard / चौकीदार": "Security Guard",
  "चौकीदार": "Security Guard",
};

/** Jobs offered for a stitching / sewing search even when the words do not match. */
export const STITCHING_JOBS = [
  "Tailor",
  "Helper",
  "Sampling Master (Tailor)",
  "Sewing Machine Operator",
  "Cutting Master",
  "Pattern Maker",
  "Garment Technician",
];

/** Words too common to make two job titles "related". */
const STOP_WORDS = new Set(["and", "the", "for", "with", "from", "cum", "all", "other", "और", "का", "की", "के"]);

/** Lower case, one kind of dash, single spaces. */
export function normalizeProfession(value: string): string {
  return value.toLocaleLowerCase("en-IN").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

/** The stored title for a typed one: an alias becomes its main title, anything else is kept as typed. */
export function canonicalProfession(value: string): string {
  const key = normalizeProfession(value);
  return Object.prototype.hasOwnProperty.call(ALIASES, key) ? ALIASES[key] : value.trim();
}

export function isStitchingQuery(value: string): boolean {
  return /^(stitch|sew|silai|tailoring|सिलाई)/.test(normalizeProfession(value));
}

/**
 * Splits text into words. Hindi vowel signs are kept inside their word.
 * (Written without \p{…} so old phone browsers can run it.)
 */
export function words(value: string): string[] {
  return normalizeProfession(value)
    .split(/[\s/,.;:()[\]{}&+|"'!?-]+/)
    .filter(Boolean);
}

/**
 * True when `query` starts at a word boundary in `text`: "elec" finds "Electrician" and
 * "IT" finds "IT Support", but "IT" does not find "Security".
 */
export function startsAWord(text: string, query: string): boolean {
  const t = normalizeProfession(text);
  const q = normalizeProfession(query);
  if (!q) return false;
  for (let i = t.indexOf(q); i !== -1; i = t.indexOf(q, i + 1)) {
    if (i === 0 || /[\s/,.;:()[\]{}&+|"'!?-]/.test(t[i - 1])) return true;
  }
  return false;
}

/** Words of a search that count when looking for related jobs. */
export function relatedWords(query: string): Set<string> {
  return new Set(words(canonicalProfession(query)).filter((w) => w.length >= 3 && !STOP_WORDS.has(w)));
}

export type ProfessionTarget = { jobProfile: string; trade?: string; specialisation?: string };

/**
 * Does a profile match a typed trade or job?
 * - direct: the job title (or its alias' main title) or trade contains the search at a word start.
 * - related (only when asked): stitching searches find the tailoring family, and any shared
 *   meaningful word in the title, trade or specialisation counts.
 */
export function matchesProfession(p: ProfessionTarget, query: string, related: boolean): boolean {
  const q = canonicalProfession(query);
  if (!normalizeProfession(q)) return true;
  const title = canonicalProfession(p.jobProfile);
  const trade = p.trade ?? "";
  if (startsAWord(title, q) || startsAWord(p.jobProfile, q) || startsAWord(trade, q)) return true;
  if (!related) return false;

  if (isStitchingQuery(q) && STITCHING_JOBS.some((job) => normalizeProfession(job) === normalizeProfession(title))) return true;
  const wanted = relatedWords(q);
  if (!wanted.size) return false;
  return words(`${title} ${trade} ${p.specialisation ?? ""}`).some((w) => wanted.has(w));
}
