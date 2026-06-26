import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured. Add it to Vercel → Settings → Environment Variables." },
      { status: 500 }
    );
  }

  try {
    const { resumeText, jobDescription, missingKeywords, currentScore } = await req.json();

    if (!resumeText?.trim() || !jobDescription?.trim()) {
      return NextResponse.json(
        { error: "Resume text and job description are required." },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey });

    const prompt = `You are an ATS resume coach. You do NOT rewrite the candidate's resume. You give specific, actionable suggestions so the candidate can improve it themselves.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S RESUME:
${resumeText}

MISSING KEYWORDS (from ATS scan):
${missingKeywords?.join(", ") || "See job description"}

YOUR OUTPUT — return a JSON object with exactly this structure:
{
  "keywordSuggestions": [
    {
      "keyword": "the missing keyword",
      "whereTo": "which section or bullet to add it near",
      "how": "one sentence on how to naturally work it in without lying"
    }
  ],
  "bulletFeedback": [
    {
      "original": "exact bullet text from the resume",
      "issue": "what's weak about it (e.g. no metric, passive verb, vague)",
      "tip": "specific suggestion to improve it",
      "swapVerb": "stronger action verb to start with instead",
      "corrected": "a rewritten version of the bullet using the tip and swap verb — keep it factually consistent with the original, add a metric placeholder like [X%] if none exists"
    }
  ],
  "powerVerbs": ["verb1", "verb2", "verb3", "verb4", "verb5", "verb6", "verb7", "verb8"],
  "summaryTip": "one specific suggestion to improve the summary for this role",
  "scoreBefore": 45,
  "scorePotential": 72
}

Rules:
- keywordSuggestions: only include keywords that genuinely fit the candidate's actual experience. Max 6.
- bulletFeedback: pick the 4-5 weakest bullets in the resume. Be specific and honest. The corrected field must use the candidate's real experience — never invent facts, use [X%] or [N] as placeholders for missing metrics.
- powerVerbs: choose 8 strong verbs relevant to this specific job description.
- summaryTip: one actionable sentence, not a rewrite.
- scoreBefore: use exactly ${currentScore ?? "the estimated current ATS score"} — do not change this value.
- scorePotential: estimate how high the score could realistically reach if all your suggestions are applied. Must be higher than scoreBefore and no more than 95.
- Return raw JSON only. No markdown, no code fences.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
    });

    let raw = completion.choices[0]?.message?.content ?? "{}";
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    const parsed = JSON.parse(raw);
    // Always use the real ATS score for scoreBefore — never trust the AI's guess
    if (currentScore !== undefined) parsed.scoreBefore = currentScore;
    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `AI coaching failed: ${message}` }, { status: 500 });
  }
}
