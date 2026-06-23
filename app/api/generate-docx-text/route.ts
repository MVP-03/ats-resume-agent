import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  TabStopType,
} from "docx";

export const runtime = "nodejs";

// ── Constants ────────────────────────────────────────────────────────────────

const BODY   = 20;   // 10pt
const SMALL  = 18;   // 9pt
const RIGHT_TAB = 9200; // twips

const SECTION_KEYWORDS = [
  "EDUCATION","WORK EXPERIENCE","EXPERIENCE","PROJECTS","SKILLS",
  "CERTIFICATIONS","ORGANIZATIONAL","VOLUNTEER","SUMMARY","OBJECTIVE",
  "PUBLICATIONS","AWARDS","LANGUAGES","INTERESTS","REFERENCES","ACTIVITIES",
];

// ── Detectors ────────────────────────────────────────────────────────────────

function isSectionHeader(line: string): boolean {
  const t = line.trim();
  if (t.length < 3 || t.length > 60) return false;
  const up = t.toUpperCase();
  return (
    SECTION_KEYWORDS.some(k => up === k || up.startsWith(k + " ") || up.startsWith(k + "&")) &&
    t === t.toUpperCase()
  );
}

function isBullet(line: string): boolean {
  return /^[•\-–*▪◦]\s/.test(line.trim());
}

function looksLikeDate(s: string): boolean {
  return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|current|\d{4})/i.test(s);
}

// Split line into left / right if it has a date-looking right side separated by 2+ spaces
function splitTwoCol(line: string): [string, string] | null {
  const m = line.match(/^(.+?)\s{2,}(\S.*)$/);
  if (!m) return null;
  const [, left, right] = m;
  if (looksLikeDate(right) || (/^[A-Z][a-z]/.test(right) && right.includes(",") && right.length < 35)) {
    return [left.trim(), right.trim()];
  }
  return null;
}

// ── Pre-process raw text ──────────────────────────────────────────────────────
// PDF extractors sometimes join lines that should be separate.
// Insert line breaks before known section headers.

function preprocessText(raw: string): string[] {
  // Normalise line endings
  let text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Insert a newline before any known section keyword that appears mid-line
  for (const kw of SECTION_KEYWORDS) {
    // e.g. "...management to build meaningful solutions.  EDUCATION Bachelor..."
    text = text.replace(
      new RegExp(`([.!?;])\\s+(${kw}\\b)`, "g"),
      "$1\n$2"
    );
    // "...skills.EDUCATION..." without space
    text = text.replace(
      new RegExp(`([a-z.])\\s*(${kw}\\b)`, "g"),
      "$1\n$2"
    );
  }

  return text.split("\n").map(l => l.trim()).filter(Boolean);
}

// ── Paragraph builders ────────────────────────────────────────────────────────

function sectionHead(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: BODY, color: "000000" })],
    spacing: { before: 200, after: 60 },
    border: { bottom: { color: "111111", size: 6, space: 2, style: BorderStyle.SINGLE } },
    alignment: AlignmentType.LEFT,
  });
}

function twoColPara(left: string, bold: boolean, right: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: left, bold, size: bold ? BODY : SMALL, color: "111111" }),
      new TextRun({ text: "\t" + right, size: SMALL, color: "555555" }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { before: 60, after: 20 },
    alignment: AlignmentType.LEFT,
  });
}

function bulletPara(text: string): Paragraph {
  const clean = text.replace(/^[•\-–*▪◦]\s*/, "").trim();
  return new Paragraph({
    children: [new TextRun({ text: clean, size: BODY, color: "111111" })],
    bullet: { level: 0 },
    spacing: { after: 40 },
    alignment: AlignmentType.LEFT,
  });
}

function bodyPara(text: string, bold = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: BODY, color: "111111" })],
    spacing: { after: 40 },
    alignment: AlignmentType.LEFT,
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let resumeText: string;
  try {
    const body = await req.json();
    resumeText = body.resumeText;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!resumeText?.trim()) {
    return NextResponse.json({ error: "No resume text provided" }, { status: 400 });
  }

  try {
    return await buildDocx(resumeText);
  } catch (e) {
    console.error("[generate-docx-text]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to build DOCX" },
      { status: 500 }
    );
  }
}

async function buildDocx(resumeText: string) {
  const lines = preprocessText(resumeText);
  const children: Paragraph[] = [];
  let cursor = 0;

  // ── Name (first line) ──
  const name = lines[cursor++] || "Resume";
  children.push(new Paragraph({
    children: [new TextRun({ text: name, bold: true, size: 44, color: "000000" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
  }));

  // ── Contact lines: next lines that look like contact info (up to 3) ──
  let contactCount = 0;
  while (cursor < lines.length && contactCount < 3) {
    const l = lines[cursor];
    if (isSectionHeader(l)) break;
    const isContact =
      l.includes("@") || l.includes("linkedin") || l.includes("github") ||
      /\d{7,}/.test(l) || l.includes("•") || l.includes("|") ||
      (/^[A-Za-z ,]+$/.test(l) && l.length < 50);
    if (!isContact) break;
    children.push(new Paragraph({
      children: [new TextRun({ text: l, size: SMALL, color: "444444" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
    }));
    cursor++;
    contactCount++;
  }

  // Small gap after header
  children.push(new Paragraph({ text: "", spacing: { after: 100 } }));

  // ── Body ──
  while (cursor < lines.length) {
    const line = lines[cursor];

    // Section header
    if (isSectionHeader(line)) {
      children.push(sectionHead(line));
      cursor++;
      continue;
    }

    // Bullet point
    if (isBullet(line)) {
      children.push(bulletPara(line));
      cursor++;
      continue;
    }

    // Two-column (role + date, or company + location)
    const cols = splitTwoCol(line);
    if (cols) {
      const [left, right] = cols;
      const isBoldLeft = left.length < 60;
      children.push(twoColPara(left, isBoldLeft, right));
      cursor++;
      continue;
    }

    // Regular body paragraph
    children.push(bodyPara(line));
    cursor++;
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: BODY, color: "111111" } },
      },
    },
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const safeName = name.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, "_").trim() || "resume";

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}_resume.docx"`,
    },
  });
}
