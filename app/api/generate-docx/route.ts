import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, VerticalAlign, ShadingType,
} from "docx";

export const runtime = "nodejs";

interface Experience {
  company: string;
  role: string;
  duration: string;
  bullets: string[];
}

interface Education {
  school: string;
  degree: string;
  year: string;
}

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  jobTitle: string;
  summary: string;
  skills: string[];
  experiences: Experience[];
  education: Education[];
}

function makeHR() {
  return new Paragraph({
    border: { bottom: { color: "c4b5fd", size: 6, space: 1, style: BorderStyle.SINGLE } },
    spacing: { after: 120 },
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: "7c3aed" })],
    spacing: { before: 240, after: 60 },
    border: { bottom: { color: "ede9fe", size: 4, space: 1, style: BorderStyle.SINGLE } },
  });
}

function bullet(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: "374151" })],
    bullet: { level: 0 },
    spacing: { after: 40 },
  });
}

export async function POST(req: NextRequest) {
  const data: ResumeData = await req.json();

  const { name, email, phone, linkedin, jobTitle, summary, skills, experiences, education } = data;

  const contactLine = [email, phone, linkedin].filter(Boolean).join("  •  ");

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22, color: "1f2937" } },
      },
    },
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
      },
      children: [
        // ── Name ──
        new Paragraph({
          children: [new TextRun({ text: name || "Resume", bold: true, size: 48, color: "111827" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        }),

        // ── Job Title ──
        ...(jobTitle ? [new Paragraph({
          children: [new TextRun({ text: jobTitle, size: 26, color: "7c3aed", bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        })] : []),

        // ── Contact ──
        new Paragraph({
          children: [new TextRun({ text: contactLine, size: 18, color: "6b7280" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        makeHR(),

        // ── Summary ──
        ...(summary ? [
          sectionHeading("Professional Summary"),
          new Paragraph({
            children: [new TextRun({ text: summary, size: 20, color: "374151" })],
            spacing: { after: 120 },
          }),
        ] : []),

        // ── Skills ──
        ...(skills?.length > 0 ? [
          sectionHeading("Skills"),
          new Paragraph({
            children: [new TextRun({ text: skills.join("  •  "), size: 20, color: "374151" })],
            spacing: { after: 120 },
          }),
        ] : []),

        // ── Experience ──
        ...(experiences?.length > 0 ? [
          sectionHeading("Experience"),
          ...experiences.flatMap(exp => [
            new Paragraph({
              children: [
                new TextRun({ text: exp.role, bold: true, size: 22 }),
                new TextRun({ text: "  at  ", size: 20, color: "9ca3af" }),
                new TextRun({ text: exp.company, size: 22, color: "7c3aed" }),
                new TextRun({ text: exp.duration ? `   ${exp.duration}` : "", size: 18, color: "9ca3af" }),
              ],
              spacing: { before: 120, after: 60 },
            }),
            ...(exp.bullets || []).map(b => bullet(b)),
            new Paragraph({ text: "", spacing: { after: 60 } }),
          ]),
        ] : []),

        // ── Education ──
        ...(education?.length > 0 ? [
          sectionHeading("Education"),
          ...education.map(edu =>
            new Paragraph({
              children: [
                new TextRun({ text: edu.degree, bold: true, size: 22 }),
                new TextRun({ text: "  —  ", size: 20, color: "9ca3af" }),
                new TextRun({ text: edu.school, size: 22 }),
                new TextRun({ text: edu.year ? `   ${edu.year}` : "", size: 18, color: "9ca3af" }),
              ],
              spacing: { before: 80, after: 60 },
            })
          ),
        ] : []),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const filename = `${(name || "resume").replace(/\s+/g, "_")}_resume.docx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
