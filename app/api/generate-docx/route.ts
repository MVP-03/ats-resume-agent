import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  TabStopType, TabStopPosition,
} from "docx";

export const runtime = "nodejs";

interface ExpEntry  { company: string; role: string; location?: string; duration: string; bullets: string[] }
interface EduEntry  { school: string; degree: string; field?: string; location?: string; year: string; gpa?: string }
interface ProjEntry { name: string; link?: string; tech?: string; bullets: string[] }
interface CertEntry { name: string; issuer?: string; date?: string }

interface ResumeData {
  name: string;
  email?: string; phone?: string; location?: string;
  linkedin?: string; github?: string; website?: string;
  jobTitle?: string; summary?: string;
  skills?: string[];
  experiences?: ExpEntry[];
  education?: EduEntry[];
  projects?: ProjEntry[];
  certifications?: CertEntry[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const BODY_SIZE  = 20;   // 10pt
const SMALL_SIZE = 18;   // 9pt
const BODY_COLOR = "111111";
const DIM_COLOR  = "555555";
const RIGHT_TAB  = 9200; // twips — aligns right-side text to right margin

/** Section header: BOLD ALL-CAPS with a black bottom border */
function sectionHead(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: BODY_SIZE, color: BODY_COLOR })],
    spacing: { before: 200, after: 60 },
    border: { bottom: { color: "111111", size: 6, space: 2, style: BorderStyle.SINGLE } },
    alignment: AlignmentType.LEFT,
  });
}

/** Two-column row: bold left label, right-aligned date via tab stop */
function twoColBold(left: string, right: string, leftSize = BODY_SIZE): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: left, bold: true, size: leftSize, color: BODY_COLOR }),
      new TextRun({ text: "\t" + right, size: SMALL_SIZE, color: DIM_COLOR }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { before: 140, after: 20 },
    alignment: AlignmentType.LEFT,
  });
}

/** Second row of an entry: regular left text, dim right text */
function twoColSub(left: string, right: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: left, bold: true, size: BODY_SIZE, color: BODY_COLOR }),
      new TextRun({ text: "\t" + right, size: SMALL_SIZE, color: DIM_COLOR }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { before: 0, after: 30 },
    alignment: AlignmentType.LEFT,
  });
}

/** Standard bullet point */
function bulletLine(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: BODY_SIZE, color: BODY_COLOR })],
    bullet: { level: 0 },
    spacing: { after: 40 },
    alignment: AlignmentType.LEFT,
  });
}

/** Small gap between entries */
function gap(after = 80): Paragraph {
  return new Paragraph({ text: "", spacing: { after } });
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const data: ResumeData = await req.json();

  const {
    name, email, phone, location, linkedin, github, website,
    jobTitle, summary,
    skills = [], experiences = [], education = [], projects = [], certifications = [],
  } = data;

  // Contact line: email • phone • location | linkedin • github • website
  const contactLine1 = [location, email, phone].filter(Boolean).join("  •  ");
  const contactLine2 = [linkedin, github, website].filter(Boolean).join("  •  ");

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: BODY_SIZE, color: BODY_COLOR } },
      },
    },
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
      },
      children: [

        // ── Name ──
        new Paragraph({
          children: [new TextRun({ text: name || "Resume", bold: true, size: 44, color: "000000" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 },
        }),

        // ── Job title ──
        ...(jobTitle ? [new Paragraph({
          children: [new TextRun({ text: jobTitle, size: 22, color: DIM_COLOR })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 },
        })] : []),

        // ── Contact line 1 ──
        ...(contactLine1 ? [new Paragraph({
          children: [new TextRun({ text: contactLine1, size: SMALL_SIZE, color: DIM_COLOR })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
        })] : []),

        // ── Contact line 2 (linkedin / github) ──
        ...(contactLine2 ? [new Paragraph({
          children: [new TextRun({ text: contactLine2, size: SMALL_SIZE, color: DIM_COLOR })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
        })] : [gap(160)]),

        // ── Summary (no header — matches PDF style) ──
        ...(summary ? [
          new Paragraph({
            children: [new TextRun({ text: summary, size: BODY_SIZE, color: BODY_COLOR })],
            spacing: { after: 140 },
            alignment: AlignmentType.LEFT,
          }),
        ] : []),

        // ── Education ──
        ...(education.length > 0 ? [
          sectionHead("Education"),
          ...education.flatMap(edu => {
            const degreeStr = [edu.degree, edu.field].filter(Boolean).join(", ");
            const schoolRight = edu.gpa ? `GPA: ${edu.gpa}` : "";
            const schoolLeft  = [edu.school, edu.location].filter(Boolean).join("  •  ");
            return [
              twoColBold(degreeStr || edu.school, edu.year || ""),
              ...(edu.school && degreeStr ? [twoColSub(schoolLeft, schoolRight)] : []),
            ];
          }),
          gap(60),
        ] : []),

        // ── Work Experience ──
        ...(experiences.length > 0 ? [
          sectionHead("Work Experience"),
          ...experiences.flatMap(exp => [
            twoColBold(exp.role, exp.duration || ""),
            twoColSub([exp.company, exp.location].filter(Boolean).join("  •  "), ""),
            ...(exp.bullets || []).filter(Boolean).map(b => bulletLine(b)),
            gap(60),
          ]),
        ] : []),

        // ── Projects ──
        ...(projects.length > 0 ? [
          sectionHead("Projects"),
          ...projects.flatMap(proj => [
            twoColBold(
              proj.link ? `${proj.name}  ↗  ${proj.link}` : proj.name,
              ""
            ),
            ...(proj.tech ? [new Paragraph({
              children: [new TextRun({ text: proj.tech, size: SMALL_SIZE, color: DIM_COLOR, italics: true })],
              spacing: { after: 30 },
              alignment: AlignmentType.LEFT,
            })] : []),
            ...(proj.bullets || []).filter(Boolean).map(b => bulletLine(b)),
            gap(60),
          ]),
        ] : []),

        // ── Skills ──
        ...(skills.length > 0 ? [
          sectionHead("Skills"),
          new Paragraph({
            children: [new TextRun({ text: skills.join("  •  "), size: BODY_SIZE, color: BODY_COLOR })],
            spacing: { after: 80 },
            alignment: AlignmentType.LEFT,
          }),
        ] : []),

        // ── Certifications ──
        ...(certifications.length > 0 ? [
          sectionHead("Certifications"),
          ...certifications.map(cert => new Paragraph({
            children: [
              new TextRun({ text: cert.name, bold: true, size: BODY_SIZE, color: BODY_COLOR }),
              ...(cert.issuer ? [new TextRun({ text: `  by ${cert.issuer}`, size: SMALL_SIZE, color: DIM_COLOR })] : []),
              new TextRun({ text: "\t" + (cert.date || ""), size: SMALL_SIZE, color: DIM_COLOR }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
            spacing: { before: 80, after: 40 },
            alignment: AlignmentType.LEFT,
          })),
        ] : []),

      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `${(name || "resume").replace(/[^a-zA-Z0-9]/g, "_")}_resume.docx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
