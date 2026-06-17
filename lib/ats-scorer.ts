export interface FieldCheck {
  field: string;
  status: "pass" | "warn" | "fail";
  message: string;
  suggestion?: string;
}

export interface FieldSuggestion {
  field: string;
  priority: "high" | "medium" | "low";
  reason: string;
  example: string;
}

export interface ScoreResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  totalKeywords: number;
  fieldChecks: FieldCheck[];
  fieldSuggestions: FieldSuggestion[];
  breakdown: {
    keywordMatch: number;
    formatting: number;
    content: number;
    sections: number;
  };
}

// ── stop words ────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","have","has","had","do",
  "does","did","will","would","could","should","may","might","can","that",
  "this","these","those","we","you","they","he","she","it","our","your",
  "their","as","if","then","than","so","yet","both","either","not","also",
  "just","very","more","most","such","other","about","into","through",
  "during","including","until","while","each","few","some","no","nor",
  "only","same","too","its","any","all","been","being","am","use","used",
  "using","new","well","work","working","role","position","team","company",
  "strong","good","great","candidate","applicant","looking","seeking",
  "ability","skills","experience","responsibilities","requirements","preferred",
  "must","plus","bonus","nice","within","across","among","between","above",
]);

// Tech terms that must NOT be split or lower-cased into stop words
const PRESERVE_TERMS = new Set([
  "c++","c#",".net","node.js","vue.js","react.js","next.js","asp.net",
  "ci/cd","devops","mlops","dataops","a/b","r&d","s3","ec2","rds","eks",
  "sql","nosql","graphql","grpc","rest","api","apis","sdk","cli","orm",
  "aws","gcp","azure","llm","nlp","ml","ai","etl","elt","olap","oltp",
  "saas","paas","iaas","b2b","b2c","crm","erp","cms","cdn","dns","vpn",
  "ci","cd","qa","ux","ui","ios","seo","sem","roi","kpi","okr","mrr","arr",
]);

const ACTION_VERBS = new Set([
  "achieved","administered","analyzed","architected","automated","built",
  "collaborated","coordinated","created","decreased","defined","delivered",
  "deployed","designed","developed","directed","drove","enabled","engineered",
  "established","executed","expanded","generated","grew","implemented",
  "improved","increased","integrated","launched","led","managed","mentored",
  "migrated","optimized","oversaw","partnered","pioneered","produced",
  "reduced","refactored","revamped","scaled","shipped","solved","spearheaded",
  "streamlined","supervised","trained","transformed","utilized","advised",
  "authored","championed","consolidated","constructed","contributed","converted",
  "customized","enhanced","evaluated","facilitated","forecasted","formulated",
  "guided","identified","innovated","instituted","introduced","maintained",
  "modernized","monitored","negotiated","operated","orchestrated","planned",
  "prioritized","processed","programmed","proposed","prototyped","published",
  "rebuilt","reported","researched","resolved","restructured","reviewed",
  "secured","simplified","standardized","supported","synthesized","tested",
  "translated","updated","upgraded","validated","wrote",
]);

const WEAK_PHRASES = [
  "responsible for","duties include","duties included","worked on",
  "helped with","assisted with","participated in","involved in",
  "tasked with","was in charge of","tried to","attempted to",
  "helped to","worked to","was responsible","in charge of",
  "contributed to","assisted in","part of my role",
];

// ── keyword extraction (accurate, tech-aware) ──────────────────────────

function normaliseText(text: string): string {
  // Preserve tech terms before lowercasing
  let t = text;
  PRESERVE_TERMS.forEach((term) => {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    t = t.replace(re, `__TERM_${term.replace(/[^a-z0-9]/g, "_")}__`);
  });
  t = t.toLowerCase().replace(/[^a-z0-9\s_#+.]/g, " ").replace(/\s+/g, " ").trim();
  PRESERVE_TERMS.forEach((term) => {
    const placeholder = `__term_${term.replace(/[^a-z0-9]/g, "_")}__`;
    t = t.replace(new RegExp(placeholder, "g"), term);
  });
  return t;
}

function extractKeywords(text: string): string[] {
  const norm = normaliseText(text);
  const tokens = norm.split(" ").filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  const unigrams = tokens.filter((w) =>
    w.length > 2 ||
    PRESERVE_TERMS.has(w) ||
    /^[a-z]{1,4}[#+.]/.test(w) // c#, c++, f#, etc.
  );

  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    if (!STOP_WORDS.has(tokens[i]) && !STOP_WORDS.has(tokens[i + 1])) {
      bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
  }

  const trigrams: string[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    if (!STOP_WORDS.has(tokens[i]) && !STOP_WORDS.has(tokens[i + 2])) {
      trigrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
    }
  }

  return [...new Set([...unigrams, ...bigrams, ...trigrams])];
}

// Score keyword match with frequency weighting
function scoreKeywords(resumeText: string, jdText: string): {
  matched: string[];
  missing: string[];
  total: number;
  score: number;
} {
  const resumeLower = resumeText.toLowerCase();
  const jdKeywords = extractKeywords(jdText);

  // Count frequency in JD to weight importance
  const freq: Record<string, number> = {};
  jdKeywords.forEach((kw) => {
    const matches = (jdText.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    freq[kw] = matches;
  });

  // Filter to meaningful keywords: longer, or high-freq, or tech terms
  const meaningful = jdKeywords
    .filter((kw) => {
      if (PRESERVE_TERMS.has(kw)) return true;
      if (kw.length <= 3 && !kw.includes("+") && !kw.includes("#")) return false;
      if (STOP_WORDS.has(kw)) return false;
      if (freq[kw] >= 2) return true;
      if (kw.includes(" ")) return true; // bigrams/trigrams always meaningful
      return kw.length > 4;
    })
    .sort((a, b) => (freq[b] || 0) - (freq[a] || 0))
    .slice(0, 70);

  const matched = meaningful.filter((kw) =>
    resumeLower.includes(kw.toLowerCase())
  );
  const missing = meaningful.filter((kw) =>
    !resumeLower.includes(kw.toLowerCase())
  );

  // Weighted score — high-freq keywords matter more
  let weightedMatched = 0;
  let weightedTotal = 0;
  meaningful.forEach((kw) => {
    const w = Math.min((freq[kw] || 1), 4); // cap weight at 4
    weightedTotal += w;
    if (matched.includes(kw)) weightedMatched += w;
  });

  const score = weightedTotal > 0
    ? Math.min(Math.round((weightedMatched / weightedTotal) * 100), 100)
    : 0;

  return { matched: matched.slice(0, 35), missing: missing.slice(0, 25), total: meaningful.length, score };
}

// ── field checks ──────────────────────────────────────────────────────────

function checkContact(text: string): FieldCheck[] {
  const checks: FieldCheck[] = [];

  const hasEmail = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  checks.push({
    field: "Email Address",
    status: hasEmail ? "pass" : "fail",
    message: hasEmail ? "Email address found" : "No email address detected",
    suggestion: hasEmail ? undefined : "Add your professional email near the top.",
  });

  const hasPhone = /(\+?\d[\d\s\-().]{7,}\d)/.test(text);
  checks.push({
    field: "Phone Number",
    status: hasPhone ? "pass" : "warn",
    message: hasPhone ? "Phone number found" : "No phone number detected",
    suggestion: hasPhone ? undefined : "Add a phone number — many recruiters call before emailing.",
  });

  const hasLinkedIn = /linkedin\.com\//i.test(text);
  checks.push({
    field: "LinkedIn URL",
    status: hasLinkedIn ? "pass" : "warn",
    message: hasLinkedIn ? "LinkedIn URL found" : "No LinkedIn URL detected",
    suggestion: hasLinkedIn ? undefined : "Add your LinkedIn URL — ATS and recruiters both check it.",
  });

  const hasGitHub = /github\.com\//i.test(text);
  checks.push({
    field: "GitHub / Portfolio URL",
    status: hasGitHub ? "pass" : "warn",
    message: hasGitHub ? "GitHub/Portfolio URL found" : "No GitHub or portfolio URL detected",
    suggestion: hasGitHub ? undefined : "Add a GitHub or portfolio link if you have one — signals active work.",
  });

  const hasLocation = /\b([A-Z][a-z]+(,\s*[A-Z]{2})?|remote|hybrid)\b/.test(text);
  checks.push({
    field: "Location",
    status: hasLocation ? "pass" : "warn",
    message: hasLocation ? "Location found" : "No city/country or 'Remote' detected",
    suggestion: hasLocation ? undefined : "Add your city or note 'Open to Remote' — ATS filters by location.",
  });

  return checks;
}

function checkSections(text: string): FieldCheck[] {
  const lower = text.toLowerCase();
  const checks: FieldCheck[] = [];

  const hasSummary = /\b(summary|objective|profile|about)\b/i.test(lower);
  checks.push({
    field: "Professional Summary",
    status: hasSummary ? "pass" : "warn",
    message: hasSummary ? "Professional summary found" : "No professional summary detected",
    suggestion: hasSummary ? undefined : "Add a 3-4 sentence Professional Summary at the top — ATS uses it for initial scoring.",
  });

  const hasExperience = /\b(experience|employment|work history|career history|professional history)\b/i.test(lower);
  checks.push({
    field: "Work Experience",
    status: hasExperience ? "pass" : "fail",
    message: hasExperience ? "Work Experience section found" : "No Work Experience section",
    suggestion: hasExperience ? undefined : "Add a section titled 'Work Experience' or 'Professional Experience'.",
  });

  const hasEducation = /\b(education|academic|degree|university|college|diploma|bachelor|master|phd|mba)\b/i.test(lower);
  checks.push({
    field: "Education",
    status: hasEducation ? "pass" : "warn",
    message: hasEducation ? "Education section found" : "No Education section detected",
    suggestion: hasEducation ? undefined : "Add an Education section with your degree, institution, and graduation year.",
  });

  const hasSkills = /\b(skills|competencies|expertise|technologies|tech stack|tools|proficiencies)\b/i.test(lower);
  checks.push({
    field: "Skills Section",
    status: hasSkills ? "pass" : "fail",
    message: hasSkills ? "Skills section found" : "No Skills section detected",
    suggestion: hasSkills ? undefined : "Add a dedicated Skills section — ATS systems keyword-match heavily here.",
  });

  const hasCerts = /\b(certif|certified|certification|credential|licence|license|accredit)\b/i.test(lower);
  checks.push({
    field: "Certifications",
    status: hasCerts ? "pass" : "warn",
    message: hasCerts ? "Certifications section/mention found" : "No certifications detected",
    suggestion: hasCerts ? undefined : "If you hold any certifications (AWS, Google, PMP, etc.), add a Certifications section.",
  });

  const hasProjects = /\b(projects?|portfolio|open.?source|side.?project|personal.?project)\b/i.test(lower);
  checks.push({
    field: "Projects",
    status: hasProjects ? "pass" : "warn",
    message: hasProjects ? "Projects section found" : "No Projects section detected",
    suggestion: hasProjects ? undefined : "Add a Projects section — especially valuable for tech roles and recent graduates.",
  });

  const hasDates = /\b(20\d{2}|19\d{2}|present|current|now)\b/i.test(lower);
  checks.push({
    field: "Employment Dates",
    status: hasDates ? "pass" : "warn",
    message: hasDates ? "Employment dates found" : "No employment dates detected",
    suggestion: hasDates ? undefined : "Add date ranges to each role (e.g. Jan 2022 – Mar 2024).",
  });

  // Job titles per role
  const titlePatterns = /\b(engineer|manager|analyst|developer|designer|director|lead|architect|consultant|specialist|coordinator|associate|intern)\b/i;
  const hasJobTitles = titlePatterns.test(lower);
  checks.push({
    field: "Job Titles",
    status: hasJobTitles ? "pass" : "warn",
    message: hasJobTitles ? "Job titles detected in experience" : "Job titles not clearly found",
    suggestion: hasJobTitles ? undefined : "Make sure each role has a clear job title — ATS parses these to rank seniority.",
  });

  return checks;
}

function checkContent(text: string): FieldCheck[] {
  const checks: FieldCheck[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const bulletLines = lines.filter((l) =>
    l.startsWith("•") || l.startsWith("-") || l.startsWith("*") ||
    l.startsWith("–") || l.startsWith("▪") || /^\d+\./.test(l)
  );

  // Action verbs
  const verbCount = bulletLines.filter((line) =>
    [...ACTION_VERBS].some((v) =>
      new RegExp(`^[•\\-*–▪]?\\s*${v}`, "i").test(line)
    )
  ).length;
  const verbPct = bulletLines.length > 0 ? Math.round((verbCount / bulletLines.length) * 100) : 0;

  checks.push({
    field: "Action Verbs",
    status: verbPct >= 60 ? "pass" : verbPct >= 30 ? "warn" : "fail",
    message: bulletLines.length === 0
      ? "No bullet points detected — add bullet points to experience"
      : `${verbPct}% of bullets start with a strong action verb (${verbCount}/${bulletLines.length})`,
    suggestion: verbPct < 60
      ? "Start every bullet with a strong action verb: Led, Built, Reduced, Launched, Optimised, Scaled, etc."
      : undefined,
  });

  // Quantifiable achievements
  const numericBullets = bulletLines.filter((l) =>
    /\d+%|\$[\d,.]+|\d+[kKmMbBxX]\b|\d+\s*(users|customers|clients|projects|teams|people|employees|months|weeks|days|hours|tickets|features|repos|services|servers|requests|transactions|countries|markets|partners)/.test(l)
  ).length;
  const numPct = bulletLines.length > 0 ? Math.round((numericBullets / bulletLines.length) * 100) : 0;

  checks.push({
    field: "Quantifiable Achievements",
    status: numPct >= 30 ? "pass" : numPct >= 10 ? "warn" : "fail",
    message: numPct > 0
      ? `${numPct}% of bullets contain numbers/metrics (${numericBullets}/${bulletLines.length})`
      : "No quantifiable achievements found",
    suggestion: numPct < 30
      ? "Add metrics to at least 30% of bullets: % improvement, $ impact, team size, scale, timeframes."
      : undefined,
  });

  // Weak phrases
  const lower = text.toLowerCase();
  const weakFound = WEAK_PHRASES.filter((p) => lower.includes(p));
  checks.push({
    field: "Weak Language",
    status: weakFound.length === 0 ? "pass" : weakFound.length <= 2 ? "warn" : "fail",
    message: weakFound.length === 0
      ? "No weak language detected"
      : `Found ${weakFound.length} weak phrase(s): "${weakFound.slice(0, 3).join('", "')}"`,
    suggestion: weakFound.length > 0
      ? `Replace passive phrases with action verbs. e.g. "Responsible for managing" → "Managed".`
      : undefined,
  });

  // Resume length
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  checks.push({
    field: "Resume Length",
    status: wordCount >= 300 && wordCount <= 950 ? "pass" : wordCount < 200 ? "fail" : "warn",
    message: `${wordCount} words — ideal range is 400–700 for one page, up to 950 for two pages`,
    suggestion: wordCount < 300
      ? "Resume is too short. Expand experience bullets and add a summary."
      : wordCount > 950
      ? "Resume may be too long. Trim older roles to 1-2 bullets each."
      : undefined,
  });

  // Bullet count per role (rough)
  checks.push({
    field: "Bullet Points",
    status: bulletLines.length >= 8 ? "pass" : bulletLines.length >= 4 ? "warn" : "fail",
    message: `${bulletLines.length} bullet points found`,
    suggestion: bulletLines.length < 8
      ? "Aim for 3-5 bullets per role. More bullets = more keyword surface area for ATS."
      : undefined,
  });

  // Verb repetition
  const usedVerbs: string[] = [];
  bulletLines.forEach((line) => {
    [...ACTION_VERBS].forEach((v) => {
      if (new RegExp(`^[•\\-*–▪]?\\s*${v}`, "i").test(line)) usedVerbs.push(v);
    });
  });
  const verbFreq: Record<string, number> = {};
  usedVerbs.forEach((v) => { verbFreq[v] = (verbFreq[v] || 0) + 1; });
  const overused = Object.entries(verbFreq).filter(([, n]) => n >= 3).map(([v]) => v);
  checks.push({
    field: "Verb Variety",
    status: overused.length === 0 ? "pass" : overused.length <= 1 ? "warn" : "fail",
    message: overused.length === 0
      ? "Good variety of action verbs"
      : `Overused verb(s): ${overused.join(", ")} (used 3+ times each)`,
    suggestion: overused.length > 0
      ? `Vary your verbs. Replace repeated "${overused[0]}" with: Delivered, Architected, Drove, Spearheaded, etc.`
      : undefined,
  });

  // Summary quality
  const summaryMatch = text.match(/\b(summary|profile|objective)\b[\s\S]{0,20}\n([\s\S]{0,400}?)(\n[A-Z]{2,}|\n[A-Z][a-z]+\s[A-Z]|$)/i);
  if (summaryMatch) {
    const summaryWords = (summaryMatch[2] || "").split(/\s+/).filter(Boolean).length;
    checks.push({
      field: "Summary Length",
      status: summaryWords >= 40 && summaryWords <= 120 ? "pass" : summaryWords < 20 ? "fail" : "warn",
      message: `Summary is approximately ${summaryWords} words (ideal: 50-100)`,
      suggestion: summaryWords < 40
        ? "Expand your summary to 3-5 sentences covering your role, top skills, and years of experience."
        : summaryWords > 120
        ? "Trim your summary to 3-5 sentences — ATS scans it quickly."
        : undefined,
    });
  }

  return checks;
}

function checkFormatting(text: string): FieldCheck[] {
  const checks: FieldCheck[] = [];

  // Tables / columns
  const hasTableChars = /\|{2,}/.test(text) || (text.match(/\t/g) || []).length > 8;
  checks.push({
    field: "Table / Column Layout",
    status: hasTableChars ? "fail" : "pass",
    message: hasTableChars
      ? "Table or multi-column layout detected — ATS often can't parse these"
      : "No table layout detected",
    suggestion: hasTableChars
      ? "Remove tables. Use single-column layout — ATS reads top-to-bottom only."
      : undefined,
  });

  // Special/decorative characters that break ATS
  const specialChars = (text.match(/[❖✦★✿►◄▶❯❮✓✔✗✘☎✉❤♦♣]/g) || []);
  checks.push({
    field: "Special Characters",
    status: specialChars.length === 0 ? "pass" : specialChars.length <= 3 ? "warn" : "fail",
    message: specialChars.length === 0
      ? "No ATS-breaking special characters found"
      : `${specialChars.length} decorative character(s) detected — may confuse ATS parsers`,
    suggestion: specialChars.length > 0
      ? "Replace decorative icons with standard bullets (•) or remove them entirely."
      : undefined,
  });

  // Emoji detection
  const hasEmoji = /[\u{1F300}-\u{1FFFF}]/u.test(text);
  checks.push({
    field: "Emoji",
    status: hasEmoji ? "fail" : "pass",
    message: hasEmoji ? "Emoji detected — ATS systems cannot parse emoji" : "No emoji detected",
    suggestion: hasEmoji ? "Remove all emoji from your resume." : undefined,
  });

  // Standard section names
  const hasNonStandard = /\b(career journey|professional journey|where i.ve been|my story|who i am|about me in detail|what i do|my expertise)\b/i.test(text);
  checks.push({
    field: "Standard Section Names",
    status: hasNonStandard ? "fail" : "pass",
    message: hasNonStandard
      ? "Creative section names detected — ATS may not recognise them"
      : "Section names appear ATS-compatible",
    suggestion: hasNonStandard
      ? "Use standard names: 'Work Experience', 'Education', 'Skills', 'Professional Summary', 'Certifications'."
      : undefined,
  });

  // All-caps body text (not section headers — just excessive caps in bullets)
  const lines = text.split("\n").filter(l => l.trim().length > 20);
  const capsLines = lines.filter(l => l === l.toUpperCase() && /[A-Z]{5,}/.test(l));
  checks.push({
    field: "ALL-CAPS Text",
    status: capsLines.length === 0 ? "pass" : "warn",
    message: capsLines.length === 0
      ? "No excessive all-caps text found"
      : `${capsLines.length} line(s) in all-caps — ATS may misparse these as section headers`,
    suggestion: capsLines.length > 0
      ? "Avoid all-caps in body text. Section headers can be caps, but bullets should use normal casing."
      : undefined,
  });

  // Submission format reminder
  checks.push({
    field: "Submission Format",
    status: "warn",
    message: "Always submit as DOCX to job portals — ATS parses DOCX more reliably than PDF",
    suggestion: "Export a DOCX version from rxresu.me or Google Docs for actual applications.",
  });

  return checks;
}

// ── field suggestions (what to ADD to the resume) ─────────────────────

function generateFieldSuggestions(
  resumeText: string,
  jdText: string
): FieldSuggestion[] {
  const suggestions: FieldSuggestion[] = [];
  const lower = resumeText.toLowerCase();
  const jdLower = jdText.toLowerCase();

  // Certifications — JD mentions certs but resume doesn't
  const jdWantsCerts = /\b(certified|certification|aws certified|google cloud|pmp|scrum|agile|cfa|cpa|cissp|comptia|azure certified)\b/i.test(jdText);
  const resumeHasCerts = /\b(certified|certification|credential|licence)\b/i.test(lower);
  if (jdWantsCerts && !resumeHasCerts) {
    suggestions.push({
      field: "Certifications Section",
      priority: "high",
      reason: "The job description specifically mentions or values certifications you haven't listed.",
      example: "AWS Certified Developer – Associate | Amazon Web Services | 2024",
    });
  }

  // GitHub / Portfolio
  if (!/github\.com|portfolio|dribbble|behance/i.test(lower)) {
    const isDevRole = /\b(software|engineer|developer|frontend|backend|fullstack|devops|data|ml|ai)\b/i.test(jdText);
    if (isDevRole) {
      suggestions.push({
        field: "GitHub / Portfolio Link",
        priority: "high",
        reason: "Technical roles heavily favour candidates with visible work. A GitHub link gives recruiters proof of skill.",
        example: "github.com/yourhandle — pin 2-3 relevant repos",
      });
    }
  }

  // Projects section
  if (!/\b(projects?|side project|personal project|open.?source)\b/i.test(lower)) {
    suggestions.push({
      field: "Projects Section",
      priority: "medium",
      reason: "A Projects section adds keyword surface area and shows initiative — especially valuable if your work experience is limited.",
      example: "Project Name | Tech Stack used | Brief outcome (e.g. 2k users, won hackathon)",
    });
  }

  // Languages
  const jdWantsLanguages = /\b(bilingual|multilingual|fluent in|language skills|french|spanish|mandarin|arabic|german|hindi)\b/i.test(jdText);
  const resumeHasLanguages = /\b(bilingual|fluent|native|languages?:|english|french|spanish|mandarin)\b/i.test(lower);
  if (jdWantsLanguages && !resumeHasLanguages) {
    suggestions.push({
      field: "Languages Section",
      priority: "high",
      reason: "The job description values language skills that aren't on your resume.",
      example: "English (Native) | French (Professional) | Spanish (Conversational)",
    });
  }

  // Volunteer / Leadership
  const jdWantsLeadership = /\b(leadership|community|volunteer|mentorship|non.?profit|outreach)\b/i.test(jdText);
  const resumeHasVolunteer = /\b(volunteer|community|non.?profit|mentored|mentoring|social impact)\b/i.test(lower);
  if (jdWantsLeadership && !resumeHasVolunteer) {
    suggestions.push({
      field: "Volunteer / Leadership Section",
      priority: "medium",
      reason: "This role values community involvement or leadership outside work.",
      example: "Mentor, CodeNewbie Community | 2023–Present | Guided 10 junior developers",
    });
  }

  // Publications / Research
  const jdWantsResearch = /\b(research|publication|journal|paper|thesis|phd|academic|scholar)\b/i.test(jdText);
  const resumeHasResearch = /\b(research|publication|published|journal|paper|thesis)\b/i.test(lower);
  if (jdWantsResearch && !resumeHasResearch) {
    suggestions.push({
      field: "Publications / Research",
      priority: "medium",
      reason: "The role is research-oriented — any published work, papers, or academic projects should be listed.",
      example: "Author, 'Paper Title', Journal Name, Year — DOI or link",
    });
  }

  // Awards / Honours
  if (!/\b(award|honour|honor|recognition|scholarship|dean|distinction|prize)\b/i.test(lower)) {
    suggestions.push({
      field: "Awards & Recognition",
      priority: "low",
      reason: "Listing awards differentiates you from candidates with the same experience level.",
      example: "Best Intern Project Award | Company Name | 2023",
    });
  }

  // Remote / Availability
  const jdIsRemote = /\b(remote|hybrid|distributed|work from home|flexible location)\b/i.test(jdText);
  const resumeMentionsRemote = /\b(remote|hybrid|relocation)\b/i.test(lower);
  if (jdIsRemote && !resumeMentionsRemote) {
    suggestions.push({
      field: "Remote Work Availability",
      priority: "medium",
      reason: "The role is remote-friendly. Explicitly noting 'Open to Remote' or 'Remote — [City]' signals alignment.",
      example: "Add to your contact line: Toronto, Canada | Open to Remote",
    });
  }

  // Years of experience / seniority signal
  const jdYears = jdText.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i);
  if (jdYears) {
    const required = parseInt(jdYears[1]);
    const resumeYears = resumeText.match(/(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i);
    if (!resumeYears) {
      suggestions.push({
        field: "Years of Experience Statement",
        priority: "high",
        reason: `This role requires ${required}+ years of experience. Adding a clear statement in your summary helps ATS pass the filter.`,
        example: `"${required}+ years of experience in [your field]..." — add to your Professional Summary`,
      });
    }
  }

  // GPA (for recent grads)
  const isRecentGrad = /\b(20(2[0-9]|1[6-9]))\b/.test(resumeText) && /\b(bachelor|master|degree|university|college)\b/i.test(lower);
  const jdWantsGpa = /\b(gpa|grade point|academic|top of class|honours|honors)\b/i.test(jdText);
  if (isRecentGrad && jdWantsGpa && !/\b(gpa|grade point|cgpa)\b/i.test(lower)) {
    suggestions.push({
      field: "GPA / Academic Distinction",
      priority: "medium",
      reason: "If your GPA is 3.5+ or you graduated with distinction, listing it is strongly recommended for this role.",
      example: "GPA: 3.8/4.0 | Dean's List 2022-2024",
    });
  }

  return suggestions;
}

// ── main export ───────────────────────────────────────────────────────────

export function scoreResume(resumeText: string, jobDescription: string): ScoreResult {
  const { matched, missing, total, score: keywordScore } = scoreKeywords(resumeText, jobDescription);

  const contactChecks = checkContact(resumeText);
  const sectionChecks = checkSections(resumeText);
  const contentChecks = checkContent(resumeText);
  const formattingChecks = checkFormatting(resumeText);
  const allFieldChecks = [...contactChecks, ...sectionChecks, ...contentChecks, ...formattingChecks];

  const fieldSuggestions = generateFieldSuggestions(resumeText, jobDescription);

  function pct(checks: FieldCheck[]) {
    if (checks.length === 0) return 100;
    const passed = checks.filter((c) => c.status === "pass").length;
    const partial = checks.filter((c) => c.status === "warn").length;
    return Math.round(((passed + partial * 0.5) / checks.length) * 100);
  }

  const formattingScore = pct(formattingChecks);
  const contentScore = pct(contentChecks);
  const sectionsScore = pct([...contactChecks, ...sectionChecks]);

  const score = Math.round(
    keywordScore * 0.45 +
    sectionsScore * 0.25 +
    contentScore * 0.20 +
    formattingScore * 0.10
  );

  return {
    score: Math.min(score, 100),
    matchedKeywords: matched,
    missingKeywords: missing,
    totalKeywords: total,
    fieldChecks: allFieldChecks,
    fieldSuggestions,
    breakdown: {
      keywordMatch: keywordScore,
      formatting: formattingScore,
      content: contentScore,
      sections: sectionsScore,
    },
  };
}
