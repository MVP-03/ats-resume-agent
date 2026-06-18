import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  TabStopPosition, TabStopType,
} from "docx";

export const runtime = "nodejs";

const SECTION_HEADERS = [
  "EDUCATION","WORK EXPERIENCE","EXPERIENCE","PROJECTS","SKILLS",
  "CERTIFICATIONS","ORGANIZATIONAL","VOLUNTEER","SUMMARY","OBJECTIVE",
  "PUBLICATIONS","AWARDS","LANGUAGES","INTERESTS","REFERENCES",
];

function isSectionHeader(line: string): boolean {
  const up = line.trim().toUpperCase();
  return SECTION_HEADERS.some(h => up.startsWith(h)) && line.trim() === line.trim().toUpperCase() && line.trim().length > 2;
}

function isBullet(line: string): boolean {
  return /^[•\-–*▪◦]\s/.test(line.trim());
}

function looksLikeDateRange(s: string): boolean {
  return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}|present|current)/i.test(s);
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, color: "000000" })],
    spacing: { before: 180, after: 60 },
    border: { bottom: { color: "000000", size: 6, space: 1, style: BorderStyle.SINGLE } },
  });
}

function makeBullet(text: string): Paragraph {
  const clean = text.replace(/^[•\-–*▪◦]\s*/, "").trim();
  return new Paragraph({
    children: [new TextRun({ text: clean, size: 18 })],
    bullet: { level: 0 },
    spacing: { after: 30 },
  });
}

function twoColPara(left: string, leftBold: boolean, right: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: left, bold: leftBold, size: leftBold ? 20 : 18 }),
      new TextRun({ text: "\t" + right, size: 18, color: "374151" }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    spacing: { before: 60, after: 20 },
  });
}

export async function POST(req: NextRequest) {
  const { resumeText } = await req.json();
  if (!resumeText) return NextResponse.json({ error: "No resume text" }, { status: 400 });

  const lines = resumeText.split("\n").map((l: string) => l.trim()).filter(Boolean);

  const children: Paragraph[] = [];

  // ── Name: first non-empty line ──
  let cursor = 0;
  const name = lines[cursor++] || "Resume";
  children.push(new Paragraph({
    children: [new TextRun({ text: name, bold: true, size: 32, color: "111827" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
  }));

  // ── Contact lines: next 1-3 lines that look like contact info ──
  while (cursor < lines.length && cursor < 4) {
    const l = lines[cursor];
    if (isSectionHeader(l) || (l.length > 80 && !l.includes("@") && !l.includes("linkedin"))) break;
    const isContact = l.includes("@") || l.includes("linkedin") || l.includes("github") ||
      /\d{10}/.test(l) || l.includes("•") || /^[A-Za-z ,]+$/.test(l) && l.length < 40;
    if (!isContact) break;
    children.push(new Paragraph({
      children: [new TextRun({ text: l, size: 17, color: "4b5563" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 30 },
    }));
    cursor++;
  }

  children.push(new Paragraph({ spacing: { after: 80 } }));

  // ── Body ──
  while (cursor < lines.length) {
    const line = lines[cursor];

    if (isSectionHeader(line)) {
      children.push(sectionHeading(line));
      cursor++;
      continue;
    }

    if (isBullet(line)) {
      children.push(makeBullet(line));
      cursor++;
      continue;
    }

    // Try to detect "Title   Date" pattern on a single line (role + right-aligned date)
    // OR "Company   Location" pattern
    const tabMatch = line.match(/^(.+?)\s{2,}(.+)$/);
    if (tabMatch) {
      const [, left, right] = tabMatch;
      const rightLooksLikeDate = looksLikeDateRange(right);
      const leftIsBold = /^[A-Z]/.test(left) && left.length < 60;
      if (rightLooksLikeDate || right.includes(",") && right.length < 30) {
        children.push(twoColPara(left.trim(), leftIsBold, right.trim()));
        cursor++;
        continue;
      }
    }

    // Regular paragraph
    children.push(new Paragraph({
      children: [new TextRun({ text: line, size: 18, color: "1f2937" })],
      spacing: { after: 40 },
    }));
    cursor++;
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Calibri", size: 18, color: "1f2937" } } },
    },
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `${name.replace(/\s+/g, "_")}_resume.docx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
