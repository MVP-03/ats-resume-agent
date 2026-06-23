import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
} from "docx";

export const runtime = "nodejs";

interface ExpEntry { company: string; role: string; location?: string; duration: string; bullets: string[] }
interface EduEntry { school: string; degree: string; location?: string; year: string; gpa?: string }
interface ProjEntry { name: string; link?: string; tech?: string; bullets: string[] }
interface CertEntry { name: string; issuer?: string; date?: string }

interface ResumeData {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  jobTitle?: string;
  summary?: string;
  skills?: string[];
  experiences?: ExpEntry[];
  education?: EduEntry[];
  projects?: ProjEntry[];
  certifications?: CertEntry[];
}

function rule() {
  return new Paragraph({
    border: { bottom: { color: "111111", size: 6, space: 1, style: BorderStyle.SINGLE } },
    spacing: { before: 0, after: 80 },
  });
}

function sectionHead(text: string) {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 20, color: "111111" })],
    spacing: { before: 200, after: 60 },
    border: { bottom: { color: "222222", size: 4, space: 1, style: BorderStyle.SINGLE } },
  });
}

function bulletLine(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: "222222" })],
    bullet: { level: 0 },
    spacing: { after: 30 },
  });
}

function twoCol(left: TextRun[], right: string) {
  return new Paragraph({
    children: [
      ...left,
      new TextRun({ text: "\t" + right, size: 18, color: "555555" }),
    ],
    tabStops: [{ type: "right" as const, position: 9000 }],
    spacing: { before: 100, after: 30 },
  });
}

export async function POST(req: NextRequest) {
  const data: ResumeData = await req.json();

  const { name, email, phone, location, linkedin, github, website, jobTitle, summary, skills = [], experiences = [], education = [], projects = [], certifications = [] } = data;

  const contactParts = [email, phone, location, linkedin, github, website].filter(Boolean).join("  ·  ");

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 21, color: "111111" } },
      },
    },
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
      },
      children: [
        // Name
        new Paragraph({
          children: [new TextRun({ text: name || "Resume", bold: true, size: 52, color: "0a0a0a" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
        }),

        // Job title
        ...(jobTitle ? [new Paragraph({
          children: [new TextRun({ text: jobTitle, size: 24, color: "333333", bold: false })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
        })] : []),

        // Contact
        new Paragraph({
          children: [new TextRun({ text: contactParts, size: 18, color: "555555" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
        }),

        rule(),

        // Summary
        ...(summary ? [
          sectionHead("Summary"),
          new Paragraph({
            children: [new TextRun({ text: summary, size: 20, color: "222222" })],
            spacing: { after: 100 },
          }),
        ] : []),

        // Skills
        ...(skills.length > 0 ? [
          sectionHead("Skills"),
          new Paragraph({
            children: [new TextRun({ text: skills.join("  ·  "), size: 20, color: "222222" })],
            spacing: { after: 100 },
          }),
        ] : []),

        // Experience
        ...(experiences.length > 0 ? [
          sectionHead("Experience"),
          ...experiences.flatMap(exp => {
            const roleText = [exp.role, exp.company, exp.location].filter(Boolean).join("  ·  ");
            return [
              twoCol(
                [new TextRun({ text: roleText, bold: true, size: 21, color: "0a0a0a" })],
                exp.duration || ""
              ),
              ...(exp.bullets || []).filter(Boolean).map(b => bulletLine(b)),
              new Paragraph({ text: "", spacing: { after: 60 } }),
            ];
          }),
        ] : []),

        // Projects
        ...(projects.length > 0 ? [
          sectionHead("Projects"),
          ...projects.flatMap(proj => {
            const titleParts = [proj.name, proj.tech].filter(Boolean).join("  ·  ");
            return [
              twoCol(
                [new TextRun({ text: titleParts, bold: true, size: 21, color: "0a0a0a" })],
                proj.link || ""
              ),
              ...(proj.bullets || []).filter(Boolean).map(b => bulletLine(b)),
              new Paragraph({ text: "", spacing: { after: 60 } }),
            ];
          }),
        ] : []),

        // Education
        ...(education.length > 0 ? [
          sectionHead("Education"),
          ...education.flatMap(edu => {
            const titleParts = [edu.degree, edu.school, edu.location].filter(Boolean).join("  ·  ");
            const detail = edu.gpa ? `GPA ${edu.gpa}` : "";
            return [
              twoCol(
                [
                  new TextRun({ text: titleParts, bold: true, size: 21, color: "0a0a0a" }),
                  ...(detail ? [new TextRun({ text: `  ·  ${detail}`, size: 18, color: "555555" })] : []),
                ],
                edu.year || ""
              ),
            ];
          }),
        ] : []),

        // Certifications
        ...(certifications.length > 0 ? [
          sectionHead("Certifications"),
          ...certifications.map(cert => {
            const titleParts = [cert.name, cert.issuer].filter(Boolean).join("  ·  ");
            return twoCol(
              [new TextRun({ text: titleParts, bold: true, size: 21, color: "0a0a0a" })],
              cert.date || ""
            );
          }),
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
