export const runtime = "nodejs";
import Groq from "groq-sdk";

function getVeteranPersona(jobTitle: string) {
  const t = (jobTitle || "").toLowerCase();
  if (t.includes("product manager") || t.includes(" pm") || t.startsWith("pm ") || t === "pm")
    return { role: "Senior Product Manager", voice: "Writes about shipping under constraints, ruthless prioritisation, the gap between user research and real insight, and the politics of roadmaps. Cites real metrics. Avoids startup jargon." };
  if (t.includes("product") || t.includes("growth"))
    return { role: "Director of Product", voice: "Writes with sharp product instincts — frameworks, trade-offs, the difference between output and outcome, and hard lessons from launches that flopped." };
  if (t.includes("ml") || t.includes("machine learning") || t.includes("ai scientist") || t.includes("data scientist"))
    return { role: "Senior ML Engineer", voice: "Writes about model architecture, inference latency, training pipelines, the gap between research and prod. Cites real metrics. Skeptical of hype." };
  if (t.includes("frontend") || t.includes("react") || t.includes("vue") || t.includes("ui"))
    return { role: "Principal Frontend Engineer", voice: "Writes about rendering perf, accessibility, bundle size discipline, component architecture, the real cost of abstractions." };
  if (t.includes("backend") || t.includes("api") || t.includes("server"))
    return { role: "Staff Backend Engineer", voice: "Writes about DB query optimization, consistency models, API design, reliability. Tells war stories about prod incidents." };
  if (t.includes("devops") || t.includes("sre") || t.includes("platform") || t.includes("infra") || t.includes("cloud"))
    return { role: "Senior SRE / Platform Engineer", voice: "Writes about observability, incident post-mortems, reliability philosophy, Kubernetes pain points, cost at scale." };
  if (t.includes("security") || t.includes("cyber"))
    return { role: "Senior Security Engineer", voice: "Writes about threat modeling, secure-by-default design, real attack vectors. Security is engineering, not compliance." };
  if (t.includes("fullstack") || t.includes("full-stack") || t.includes("full stack"))
    return { role: "Principal Full-Stack Engineer", voice: "Writes about system design tradeoffs, knowing when NOT to build, pragmatic tech choices, the reality of technical debt." };
  if (t.includes("mobile") || t.includes("ios") || t.includes("android"))
    return { role: "Staff Mobile Engineer", voice: "Writes about app startup perf, memory management, crash rates, platform API evolution, cross-platform tradeoffs." };
  if (t.includes("data engineer") || t.includes("analytics"))
    return { role: "Senior Data Engineer", voice: "Writes about pipeline reliability, dbt philosophy, streaming vs batch, data quality as a first-class citizen." };
  if (t.includes("design") || t.includes("ux") || t.includes("ui/ux"))
    return { role: "Senior Product Designer", voice: "Writes about systems thinking in design, the tension between aesthetics and usability, and the gap between Figma and shipped product." };
  return { role: "Staff Software Engineer", voice: "Writes with hard-earned engineering perspective. References real incidents, architectural decisions, theory vs production reality." };
}

type PostMode =
  | "skill_showcase"
  | "project_launch"
  | "hot_take"
  | "deep_dive"
  | "lessons_learned"
  | "tool_review"
  | "career_milestone"
  | "open_to_work"
  | "networking";

const MODE_PROMPTS: Record<PostMode, (ctx: Record<string, string>, persona: { role: string; voice: string }) => string> = {

  skill_showcase: (ctx, p) => `You are ghostwriting for a ${p.role}. Voice: ${p.voice}

${ctx.skill || ctx.topic
    ? `They just leveled up on: ${ctx.skill || ctx.topic}`
    : "Pick the most impressive or recent skill from their resume to showcase."}
${ctx.detail ? `Context: ${ctx.detail}` : ""}
${ctx.achievement ? `Key result: ${ctx.achievement}` : ""}

Write posts that show mastery, not excitement. Share what they now understand that they didn't before. Include a specific technical nuance or gotcha that only someone who actually did the work would know. No "excited to share", no "learning never stops".`,

  project_launch: (ctx, p) => `You are ghostwriting for a ${p.role}. Voice: ${p.voice}

${ctx.topic || ctx.skill
    ? `They just shipped: ${ctx.topic || ctx.skill}`
    : "Pick the most impactful recent project from their resume to write about."}
${ctx.tech ? `Tech used: ${ctx.tech}` : ""}
${ctx.detail ? `What it does / the hard part: ${ctx.detail}` : ""}
${ctx.achievement ? `Key metric or result: ${ctx.achievement}` : ""}

Write posts focused on the technical decisions made, what almost broke, and what they'd do differently. Show the engineering, not just the outcome.`,

  hot_take: (ctx, p) => `You are ghostwriting for a ${p.role}. Voice: ${p.voice}

${ctx.topic || ctx.skill
    ? `Their hot take is about: ${ctx.topic || ctx.skill}`
    : "Pick a controversial but well-grounded opinion based on their resume experience."}
${ctx.detail ? `Their position: ${ctx.detail}` : ""}
${ctx.achievement ? `Supporting evidence: ${ctx.achievement}` : ""}

Write genuinely contrarian, opinion-driven posts. The kind that get practitioners arguing in the comments because it's provocative AND backed by real experience. Not clickbait — intellectual provocation.`,

  deep_dive: (ctx, p) => `You are ghostwriting for a ${p.role}. Voice: ${p.voice}

${ctx.topic || ctx.skill
    ? `They want to teach: ${ctx.topic || ctx.skill}`
    : "Pick a topic from their resume where they have genuine depth to teach."}
${ctx.detail ? `Specific angle: ${ctx.detail}` : ""}
${ctx.achievement ? `Key insight to highlight: ${ctx.achievement}` : ""}

LinkedIn should be a teaching thread with 3-4 numbered insights. Twitter should be the one insight that stops someone mid-scroll. Reddit should be a question + self-answer style that the community finds genuinely useful.`,

  lessons_learned: (ctx, p) => `You are ghostwriting for a ${p.role}. Voice: ${p.voice}

${ctx.topic || ctx.skill
    ? `The lesson is about: ${ctx.topic || ctx.skill}`
    : "Pick a hard-won lesson that's evident from the trajectory of their resume."}
${ctx.detail ? `What happened: ${ctx.detail}` : ""}
${ctx.achievement ? `The outcome: ${ctx.achievement}` : ""}

Write with radical honesty. Share the failure or near-failure, then the hard-won insight. Engineers and PMs respect this more than any success post. Be specific — name the actual mistake, the actual fix.`,

  tool_review: (ctx, p) => `You are ghostwriting for a ${p.role}. Voice: ${p.voice}

${ctx.topic || ctx.skill
    ? `The tool or framework: ${ctx.topic || ctx.skill}`
    : "Pick a tool, framework, or platform from their resume to write an honest review of."}
${ctx.detail ? `Their take after actually using it: ${ctx.detail}` : ""}
${ctx.achievement ? `Specific use case: ${ctx.achievement}` : ""}

Write an honest, nuanced review. Name what it's actually good at and what the docs won't tell you. Not a marketing post — a practitioner's honest take after shipping with it.`,

  career_milestone: (ctx, p) => `You are ghostwriting for a ${p.role}. Voice: ${p.voice}

Milestone: ${ctx.milestone || "new role"}
${ctx.company ? `Company: ${ctx.company}` : ""}
${ctx.jobTitle ? `Role: ${ctx.jobTitle}` : ""}
${ctx.achievement ? `Key thing to highlight: ${ctx.achievement}` : ""}
${ctx.detail ? ctx.detail : ""}

Bury the career update in paragraph 2. Open with a technical insight or hard-won observation relevant to their field, drawn from what you know of their background. The career news is context for the insight, not the point.`,

  open_to_work: (ctx, p) => `You are ghostwriting for a ${p.role}. Voice: ${p.voice}

They are searching for their next role.
Target role: ${ctx.jobTitle || p.role}
${ctx.achievement ? `What they bring: ${ctx.achievement}` : "Infer their strongest concrete contributions from their resume — be specific."}
${ctx.detail ? ctx.detail : "Infer what problems they want to work on from their experience and the role context."}

DO NOT write a desperate job search post. Write from a place of strength — surface what problems they want to work on, what environments they thrive in, what they've shipped. The job search is almost a footnote.`,

  networking: (ctx, p) => `You are ghostwriting for a ${p.role}. Voice: ${p.voice}

Networking goal: ${ctx.detail || "connecting with peers in their field"}
${ctx.topic ? `Topic they want to discuss: ${ctx.topic}` : ""}
${ctx.achievement ? `Something notable to establish credibility: ${ctx.achievement}` : "Infer a credibility anchor from their resume."}

Write posts that start a real conversation, not a connection request. Share an opinion or question that only people who deeply work in the ${p.role} space would care about.`,
};

const FORMAT_INSTRUCTIONS = `
Generate three social media posts. Each must sound like it comes from someone with 10+ years of real experience. No buzzwords: no "passionate", "excited", "thrilled", "honored", "humbled", "journey", "impactful", "leverage".

LINKEDIN (200-280 words):
- Open with a hook: contrarian take, hard number, or specific technical observation
- Be peer-to-peer, not broadcast
- Use concrete specifics from the resume context (metrics, scale, failure modes, patterns)
- End with a sharp question practitioners actually care about
- 3-4 domain-specific hashtags (e.g. #productmanagement not #tech)

TWITTER/X (max 240 chars):
- One sharp practitioner take
- Something senior practitioners retweet because it's exactly right
- Optional 1-2 very specific hashtags

REDDIT (r/ExperiencedDevs or r/ProductManagement depending on role):
- Title: specific and honest, no hype
- Body: 130-180 words, conversational, genuine, useful
- Ask the community something real or share a hard-earned lesson

Return ONLY valid JSON, no markdown fences:
{"linkedin":"...","twitter":"...","reddit":{"title":"...","body":"..."}}`;

export async function POST(req: Request) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const body = await req.json();
    const { mode, jobTitle, resumeText, jobDescription, ...ctx } = body as {
      mode: PostMode;
      jobTitle: string;
      resumeText: string;
      jobDescription: string;
      [key: string]: string;
    };

    const persona = getVeteranPersona(jobTitle || "software engineer");
    const modePromptFn = MODE_PROMPTS[mode] || MODE_PROMPTS.skill_showcase;
    const modePrompt = modePromptFn({ ...ctx, jobTitle }, persona);

    const fullPrompt = `${modePrompt}

Resume (use to extract background, skills, accomplishments, and voice — do not quote directly):
${(resumeText || "").slice(0, 1500)}
${jobDescription ? `
Role / Job Description (use to shape the angle, the problems they care about, and the audience):
${jobDescription.slice(0, 600)}` : ""}

${FORMAT_INSTRUCTIONS}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.82,
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content || "{}");
    return Response.json(data);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: `Failed to generate posts: ${msg}` }, { status: 500 });
  }
}
