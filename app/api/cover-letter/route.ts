import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured." }, { status: 500 });
  }

  const { resumeText, jobDescription, name, company, role } = await req.json();
  if (!resumeText?.trim() || !jobDescription?.trim()) {
    return NextResponse.json({ error: "Resume and job description are required." }, { status: 400 });
  }

  const groq = new Groq({ apiKey });

  const coverLetterPrompt = `You are a professional writer helping a real person write a cover letter. The output must sound 100% human — like someone sat down and genuinely wrote this, not an AI. No corporate buzzwords. No "I am excited to apply." No "I am writing to express my interest." No hollow phrases.

Write from the candidate's point of view. Use their real experience from the resume. Be specific. Be direct. Show personality. Use short punchy sentences mixed with longer ones. Vary the rhythm. Sound like a smart, confident person — not a template.

CANDIDATE NAME: ${name || "the candidate"}
ROLE APPLYING FOR: ${role || "the role"}
COMPANY: ${company || "the company"}

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Write a cover letter with these rules:
- 3-4 short paragraphs, no fluff
- Open with something specific about the role or company — not about yourself
- Paragraph 2: your most relevant experience with a real result or detail
- Paragraph 3: one thing about this company specifically that drew you to it (infer from the JD — be genuine)
- Close: confident, no begging. Something like "Happy to chat about how I can contribute."
- No "Dear Hiring Manager" header needed — start from the body
- Do NOT use: "excited", "passionate", "thrilled", "delighted", "I am writing to", "I believe I would be", "leverage", "synergy", "dynamic"
- Max 280 words
- Return ONLY the cover letter text, nothing else`;

  const hrMessagePrompt = `You are helping a real person write a LinkedIn message to an HR recruiter that will actually get a reply. Most candidates send generic "I applied and I'm interested" messages that get ignored. This one should be different — memorable, specific, and confident without being arrogant.

CANDIDATE NAME: ${name || "the candidate"}
ROLE: ${role || "the role"}
COMPANY: ${company || "the company"}

RESUME (for specific details to pull from):
${resumeText.slice(0, 1000)}

JOB DESCRIPTION (to pull specific role/team details):
${jobDescription.slice(0, 700)}

Write ONE LinkedIn message following these rules exactly:
- Open with a hook — something specific about the company or role pulled from the JD (a product, a challenge they're solving, a team detail) — NOT about the candidate
- One sentence connecting a specific, real achievement from the resume to what this team is doing
- Ask one sharp, low-pressure question or make a confident statement that invites a reply — something like "Would love 15 minutes if you think there's a fit" or a genuine question about the team
- Total: 4-5 sentences MAX. Tight. Every word earns its place.
- Tone: warm but direct. Like a sharp professional, not a job seeker begging
- Do NOT use: "I am reaching out", "I came across", "I am very interested", "passionate", "excited", "thrilled", "I believe I would be a great fit", "leverage", "synergy", "I wanted to", "hope this finds you well"
- No greetings or sign-offs needed — start from the first line of substance
- Return ONLY the message, nothing else`;

  try {
    const [coverRes, hrRes] = await Promise.all([
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: coverLetterPrompt }],
        temperature: 0.75,
        max_tokens: 600,
      }),
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: hrMessagePrompt }],
        temperature: 0.75,
        max_tokens: 250,
      }),
    ]);

    return NextResponse.json({
      coverLetter: coverRes.choices[0]?.message?.content?.trim() ?? "",
      hrMessage: hrRes.choices[0]?.message?.content?.trim() ?? "",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Generation failed: ${msg}` }, { status: 500 });
  }
}
