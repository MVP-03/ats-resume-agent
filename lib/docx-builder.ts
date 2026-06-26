import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType } from "docx";

const BODY      = 20;   // 10pt
const SMALL     = 18;   // 9pt
const RIGHT_TAB = 9200; // twips

export interface DocxResumeData {
  name: string;
  email?: string; phone?: string; location?: string;
  linkedin?: string; github?: string; website?: string;
  jobTitle?: string; summary?: string;
  skills?: string[];
  experiences?: { company: string; role: string; location?: string; duration: string; bullets: string[] }[];
  education?: { school: string; degree: string; field?: string; location?: string; year: string; gpa?: string; }[];
  projects?: { name: string; link?: string; tech?: string; bullets: string[] }[];
  certifications?: { name: string; issuer?: string; date?: string }[];
}

function sectionHead(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: BODY, color: "000000" })],
    spacing: { before: 200, after: 60 },
    border: { bottom: { color: "111111", size: 6, space: 2, style: BorderStyle.SINGLE } },
    alignment: AlignmentType.LEFT,
  });
}

function twoColBold(left: string, right: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: left, bold: true, size: BODY, color: "111111" }),
      new TextRun({ text: "\t" + right, size: SMALL, color: "555555" }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { before: 140, after: 20 },
    alignment: AlignmentType.LEFT,
  });
}

function twoColSub(left: string, right: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: left, size: SMALL, color: "333333" }),
      new TextRun({ text: "\t" + right, size: SMALL, color: "555555" }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    spacing: { before: 0, after: 30 },
    alignment: AlignmentType.LEFT,
  });
}

function bulletLine(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: BODY, color: "111111" })],
    bullet: { level: 0 },
    spacing: { after: 40 },
    alignment: AlignmentType.LEFT,
  });
}

function gap(after = 80): Paragraph {
  return new Paragraph({ text: "", spacing: { after }, alignment: AlignmentType.LEFT });
}

export async function buildDocxBuffer(data: DocxResumeData): Promise<Buffer> {
  const {
    name, email, phone, location, linkedin, github, website,
    jobTitle, summary,
    skills = [], experiences = [], education = [], projects = [], certifications = [],
  } = data;

  const contactLine1 = [location, email, phone].filter(Boolean).join("  •  ");
  const contactLine2 = [linkedin, github, website].filter(Boolean).join("  •  ");

  const children: Paragraph[] = [
    // Name
    new Paragraph({
      children: [new TextRun({ text: name || "Resume", bold: true, size: 44, color: "000000" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
    }),

    // Job title
    ...(jobTitle ? [new Paragraph({
      children: [new TextRun({ text: jobTitle, size: 22, color: "444444" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
    })] : []),

    // Contact line 1
    ...(contactLine1 ? [new Paragraph({
      children: [new TextRun({ text: contactLine1, size: SMALL, color: "444444" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
    })] : []),

    // Contact line 2
    ...(contactLine2 ? [new Paragraph({
      children: [new TextRun({ text: contactLine2, size: SMALL, color: "444444" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    })] : [gap(160)]),

    // Summary (no section header — matches PDF style)
    ...(summary ? [
      new Paragraph({
        children: [new TextRun({ text: summary, size: BODY, color: "111111" })],
        spacing: { after: 140 },
        alignment: AlignmentType.LEFT,
      }),
    ] : []),

    // Education
    ...(education.length > 0 ? [
      sectionHead("Education"),
      ...education.flatMap(edu => {
        const degreeStr = [edu.degree, edu.field].filter(Boolean).join(", ");
        const schoolSub  = [edu.school, edu.location].filter(Boolean).join("  •  ");
        const gpaSub     = edu.gpa ? `GPA: ${edu.gpa}` : "";
        return [
          twoColBold(degreeStr || edu.school, edu.year || ""),
          ...(edu.school && degreeStr ? [twoColSub(schoolSub, gpaSub)] : []),
        ];
      }),
      gap(60),
    ] : []),

    // Work Experience
    ...(experiences.length > 0 ? [
      sectionHead("Work Experience"),
      ...experiences.flatMap(exp => [
        twoColBold(exp.role, exp.duration || ""),
        twoColSub([exp.company, exp.location].filter(Boolean).join("  •  "), ""),
        ...(exp.bullets || []).filter(Boolean).map(b => bulletLine(b)),
        gap(60),
      ]),
    ] : []),

    // Projects
    ...(projects.length > 0 ? [
      sectionHead("Projects"),
      ...projects.flatMap(proj => [
        twoColBold(proj.name, proj.link || ""),
        ...(proj.tech ? [new Paragraph({
          children: [new TextRun({ text: proj.tech, size: SMALL, color: "555555", italics: true })],
          spacing: { after: 30 },
          alignment: AlignmentType.LEFT,
        })] : []),
        ...(proj.bullets || []).filter(Boolean).map(b => bulletLine(b)),
        gap(60),
      ]),
    ] : []),

    // Skills
    ...(skills.length > 0 ? [
      sectionHead("Skills"),
      new Paragraph({
        children: [new TextRun({ text: skills.join("  •  "), size: BODY, color: "111111" })],
        spacing: { after: 80 },
        alignment: AlignmentType.LEFT,
      }),
    ] : []),

    // Certifications
    ...(certifications.length > 0 ? [
      sectionHead("Certifications"),
      ...certifications.map(cert => new Paragraph({
        children: [
          new TextRun({ text: cert.name, bold: true, size: BODY, color: "111111" }),
          ...(cert.issuer ? [new TextRun({ text: `  by ${cert.issuer}`, size: SMALL, color: "555555" })] : []),
          new TextRun({ text: "\t" + (cert.date || ""), size: SMALL, color: "555555" }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
        spacing: { before: 80, after: 40 },
        alignment: AlignmentType.LEFT,
      })),
    ] : []),
  ];

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: BODY, color: "111111" } },
      },
    },
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children,
    }],
  });

  return Packer.toBuffer(doc) as Promise<Buffer>;
}
