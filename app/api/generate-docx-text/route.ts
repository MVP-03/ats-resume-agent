import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildDocxBuffer, DocxResumeData } from "@/lib/docx-builder";

export const runtime = "nodejs";

const PARSE_PROMPT = `Parse the resume text below into JSON. Extract every detail accurately.

Return ONLY valid JSON — no markdown, no code fences, raw JSON only — with this exact shape:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string",
  "github": "string",
  "website": "string",
  "jobTitle": "string",
  "summary": "string",
  "skills": ["string"],
  "experiences": [
    {
      "role": "string",
      "company": "string",
      "location": "string",
      "duration": "string",
      "bullets": ["string"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "field": "string",
      "school": "string",
      "location": "string",
      "year": "string",
      "gpa": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "link": "string",
      "tech": "string",
      "bullets": ["string"]
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string"
    }
  ]
}

Rules:
- "duration" for experience = "StartDate – EndDate" or "StartDate – Present"
- "year" for education = "StartDate – EndDate"
- "skills" = flat array of individual skill strings
- Leave any missing field as empty string "" or empty array []
- Include ALL experiences, education entries, projects, and certifications from the resume
- Preserve bullet points exactly as written in the original
`;

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

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Step 1: Use Groq to parse raw text → structured JSON
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: PARSE_PROMPT },
        { role: "user", content: resumeText },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";
    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const data: DocxResumeData = JSON.parse(jsonStr);

    // Step 2: Build the DOCX from clean structured data
    const buffer = await buildDocxBuffer(data);
    const filename = `${(data.name || "resume").replace(/[^a-zA-Z0-9]/g, "_")}_resume.docx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[generate-docx-text]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate DOCX" },
      { status: 500 }
    );
  }
}
