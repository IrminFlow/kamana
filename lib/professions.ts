const aliases: Record<string, string> = {
      "software engineer": "Software Developer / Engineer",
      "software developer": "Software Developer / Engineer",
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
      "software engineering": "Software Developer / Engineer",
      "computer science and engineering (software engineering)": "Software Developer / Engineer",
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
      "चौकीदार": "Security Guard"
    };

export function normalizeProfession(value: string) {
  return value.toLocaleLowerCase("en-IN").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
}

export function canonicalProfession(value: string) {
  const key = normalizeProfession(value);
  return Object.prototype.hasOwnProperty.call(aliases, key) ? aliases[key] : value;
}

export const stitchingJobs = ["Tailor", "Helper", "Sampling Master (Tailor)", "Sewing Machine Operator", "Cutting Master", "Pattern Maker", "Garment Technician"];

export function isStitchingQuery(value: string) {
  return /^(stitch|sew|silai|tailoring|सिलाई)/u.test(normalizeProfession(value));
}
