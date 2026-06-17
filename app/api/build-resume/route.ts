import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured. Add it in Vercel → Settings → Environment Variables." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { name, email, phone, linkedin, jobTitle, jobDescription, experiences, education, skills, summary } = body;

    const groq = new Groq({ apiKey });

    const prompt = `You are an expert ATS resume writer. Generate a perfectly formatted, ATS-optimized resume in plain text.

TARGET JOB / ROLE:
${jobTitle || "General professional role"}

JOB DESCRIPTION (if provided):
${jobDescription || "Not provided"}

CANDIDATE INFORMATION:
Name: ${name}
Email: ${email}
Phone: ${phone || ""}
LinkedIn: ${linkedin || ""}

WORK EXPERIENCE:
${experiences || "Not provided"}

EDUCATION:
${education || "Not provided"}

SKILLS:
${skills || "Not provided"}

ADDITIONAL NOTES / SUMMARY:
${summary || ""}

RULES FOR THE RESUME:
1. Use strong action verbs for every bullet (Led, Built, Increased, Reduced, Delivered, Designed, Managed, etc.)
2. Quantify every achievement possible (%, $, numbers, timeframes)
3. Mirror the exact language and keywords from the job description
4. Use standard ATS-safe section headers: PROFESSIONAL SUMMARY, WORK EXPERIENCE, EDUCATION, SKILLS
5. Each role should have 3-5 bullet points
6. Professional summary should be 3-4 sentences, keyword-rich
7. Skills section: comma-separated list grouped by category
8. Format dates as: Month Year – Month Year (or Present)
9. No tables, no columns, no special characters except bullets (•)
10. Keep total to one page worth of content (under 600 words of body)

OUTPUT FORMAT — use exactly this structure:

[Full Name]
[Email] | [Phone] | [LinkedIn URL]

PROFESSIONAL SUMMARY
[3-4 sentence summary tailored to the target role]

WORK EXPERIENCE

[Job Title] | [Company Name] | [City, State] | [Start Date] – [End Date]
• [Action verb + what you did + measurable result]
• [Action verb + what you did + measurable result]
• [Action verb + what you did + measurable result]

[Repeat for each role]

EDUCATION

[Degree] in [Field] | [University Name] | [Graduation Year]
[GPA if above 3.5, relevant coursework, honors]

SKILLS

Technical: [comma-separated list]
Soft Skills: [comma-separated list]
Tools & Platforms: [comma-separated list]

Output ONLY the resume text. No preamble, no explanation, no markdown formatting.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 2048,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ resume: text.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Resume generation failed: ${msg}` }, { status: 500 });
  }
}
