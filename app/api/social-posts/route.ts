export const runtime = "nodejs";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const { resumeText, jobTitle, company, milestone, name, achievement } = await req.json();

    const milestoneLabel: Record<string, string> = {
      opentowork: "actively looking for new opportunities",
      applied: `just applied to ${company || "a company"} for the ${jobTitle || "role"}`,
      interview: `got an interview at ${company || "a company"} for the ${jobTitle || "role"}`,
      offer: `received an offer from ${company || "a company"} for the ${jobTitle || "role"}`,
      networking: "looking to connect and grow my professional network",
    };

    const context = `
Person: ${name || "a professional"}
Milestone: ${milestoneLabel[milestone] || milestone}
Target role: ${jobTitle || "Software Engineer"}
Company: ${company || ""}
Key achievement: ${achievement || ""}
Resume summary (first 400 chars): ${(resumeText || "").slice(0, 400)}
`.trim();

    const prompt = `You are a social media expert helping job seekers build their personal brand. Generate three social media posts based on this context:

${context}

Rules for each platform:

LINKEDIN (150-250 words):
- Open with a hook — a bold statement, surprising number, or thought-provoking question. NOT "I am excited/thrilled/honored/passionate"
- Be specific and human, not corporate
- Share a real insight or lesson learned
- End with a call to action or open question to drive engagement
- Add 3-4 relevant hashtags at the very end
- Tone: professional but conversational

TWITTER (max 240 characters including spaces):
- Punchy, direct, no fluff
- One key message
- Optional 1-2 hashtags
- Count every character carefully — must be under 240

REDDIT (for r/cscareerquestions or r/jobs):
- Title: specific, not clickbait (e.g. "Got my first SWE interview after 3 months of applications — here's what finally worked")
- Body: 100-150 words, conversational, specific details, genuine
- Ask for advice or share an insight the community would find valuable
- No self-promotion, be humble and real

Return ONLY valid JSON, no markdown, no code blocks, exactly this shape:
{
  "linkedin": "full post text here",
  "twitter": "tweet text here",
  "reddit": {
    "title": "reddit post title here",
    "body": "reddit post body here"
  }
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content || "{}";
    const data = JSON.parse(raw);
    return Response.json(data);
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Failed to generate posts" }, { status: 500 });
  }
}
