import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured." }, { status: 500 });
  }

  const { resumeText, newSummary, replacements } = await req.json();
  if (!resumeText?.trim()) {
    return NextResponse.json({ error: "Resume text required." }, { status: 400 });
  }

  const groq = new Groq({ apiKey });

  const replacementInstructions = replacements?.length > 0
    ? `BULLET REPLACEMENTS — find these exact bullets and replace them. Copy every other bullet word-for-word:\n` +
      replacements.map((r: { original: string; rewritten: string }, i: number) =>
        `${i + 1}. FIND EXACTLY: "${r.original}"\n   REPLACE WITH: "${r.rewritten}"`
      ).join("\n")
    : "Keep all bullets exactly as written in the original resume.";

  const summaryInstruction = newSummary?.trim()
    ? `NEW SUMMARY — use this exact text, no additions:\n"${newSummary}"`
    : "Keep the original summary exactly as written.";

  const prompt = `Parse the ORIGINAL RESUME below into JSON. Apply ONLY the changes listed. Do not modify anything else.

${summaryInstruction}

${replacementInstructions}

ORIGINAL RESUME:
${resumeText}

Return ONLY this JSON (no markdown, no code fences, raw JSON only):
{
  "name": "candidate full name",
  "contact": "City, Country • email • phone • linkedin URL",
  "github": "github URL or empty string",
  "summary": "summary paragraph",
  "sections": [
    {
      "title": "SECTION TITLE IN CAPS",
      "entries": [
        {
          "title": "job title OR degree name (e.g. Bachelor of Technology)",
          "organization": "company name OR university name (e.g. GITAM University)",
          "location": "city, country or empty string",
          "dates": "exact dates from original (e.g. Aug 2022 - May 2026) or empty string",
          "bullets": ["bullet text without leading dash or bullet symbol"],
          "inline": "ONLY for SKILLS and CERTIFICATIONS sections: full text e.g. 'Soft Skills: X, Y. Hard Skills: A, B' — empty string for all other section types"
        }
      ]
    }
  ]
}

Strict rules:
- Include EVERY section from the original in the same order
- EDUCATION: each degree or school = one entry. title = degree name, organization = school name, dates = exact date range. GPA goes as a bullet item.
- SKILLS: use inline field with the complete skills text. bullets = [].
- CERTIFICATIONS: use inline field with the cert name and credential. bullets = [].
- PROJECTS: title = project name, organization = empty, dates = dates if present, bullets = project bullet points.
- No markdown bold or asterisks inside any string value.
- Do not invent, paraphrase, or add anything not in the original resume.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
      max_tokens: 4096,
    });

    let raw = completion.choices[0]?.message?.content ?? "{}";
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to generate full resume: ${msg}` }, { status: 500 });
  }
}
