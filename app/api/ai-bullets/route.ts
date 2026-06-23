export const runtime = "nodejs";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const { role, company, duration, mode } = await req.json() as {
      role?: string;
      company?: string;
      duration?: string;
      mode?: "bullets" | "summary";
    };

    const prompt =
      mode === "summary"
        ? `Generate a professional resume summary for a ${role || "professional"}${company ? ` at ${company}` : ""}.
Write 2–3 sentences. ATS-optimized. Use concrete language. No filler words like "passionate", "enthusiastic", "results-driven".
Start with years of experience or a defining skill. Include what they deliver for employers.
Return ONLY valid JSON: {"text": "..."}`
        : `Generate 5 strong, ATS-optimized resume bullet points for a ${role || "professional"}${company ? ` at ${company}` : ""}${duration ? ` (${duration})` : ""}.

Rules:
- Start each bullet with a powerful action verb (Led, Built, Reduced, Increased, Shipped, Designed, Implemented, Optimized, Drove, Owned, Migrated, Launched, Automated)
- Include realistic metrics or outcomes (%, $, x faster, N users, N hours saved) where plausible
- Be specific — name technologies, team sizes, or business impact
- Max 110 characters per bullet
- No vague filler ("worked on", "helped with", "responsible for", "assisted in")

Return ONLY valid JSON: {"bullets": ["...", "...", "...", "...", "..."]}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.72,
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content || "{}");
    return Response.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
