export const runtime = "nodejs";
import Groq from "groq-sdk";

// Maps job titles to a veteran persona with domain-specific voice
function getVeteranPersona(jobTitle: string): { role: string; yearsHint: string; domainVoice: string } {
  const t = jobTitle.toLowerCase();

  if (t.includes("ml") || t.includes("machine learning") || t.includes("ai") || t.includes("data scientist")) {
    return {
      role: "Senior ML Engineer / AI Researcher",
      yearsHint: "8+ years in ML/AI, has shipped models to production at scale",
      domainVoice: "Writes about model architecture tradeoffs, inference latency, training pipelines, feature engineering at scale, the gap between research papers and production reality. Cites real metrics. Skeptical of hype.",
    };
  }
  if (t.includes("frontend") || t.includes("front-end") || t.includes("ui") || t.includes("react") || t.includes("vue")) {
    return {
      role: "Principal Frontend Engineer",
      yearsHint: "10+ years building UIs, has led design systems and migrated legacy codebases",
      domainVoice: "Writes about rendering performance, accessibility tradeoffs, bundle size discipline, component architecture, the cost of abstractions. Opinionated about frameworks from experience, not trends.",
    };
  }
  if (t.includes("backend") || t.includes("back-end") || t.includes("api") || t.includes("server")) {
    return {
      role: "Staff Backend Engineer",
      yearsHint: "10+ years building distributed systems and APIs at scale",
      domainVoice: "Writes about database query optimization, consistency models, API design philosophy, the hidden costs of microservices, reliability engineering. Tells war stories about production incidents.",
    };
  }
  if (t.includes("devops") || t.includes("sre") || t.includes("platform") || t.includes("infrastructure") || t.includes("cloud")) {
    return {
      role: "Senior SRE / Platform Engineer",
      yearsHint: "9+ years in infrastructure, has built and scaled platforms handling millions of requests",
      domainVoice: "Writes about observability, on-call culture, incident post-mortems, the philosophy of reliability, Kubernetes pain points, cost optimization at scale. Deeply pragmatic.",
    };
  }
  if (t.includes("security") || t.includes("cyber") || t.includes("penetration") || t.includes("appsec")) {
    return {
      role: "Senior Security Engineer",
      yearsHint: "9+ years in offensive/defensive security, has found critical CVEs",
      domainVoice: "Writes about threat modeling, secure-by-default design, the failure modes of security theater, real attack vectors. Direct and no-nonsense. Security is an engineering discipline, not a compliance checkbox.",
    };
  }
  if (t.includes("product manager") || t.includes("pm") || t.includes("product lead")) {
    return {
      role: "Senior Product Manager",
      yearsHint: "8+ years shipping products at scale, has worked across 0-to-1 and growth phases",
      domainVoice: "Writes about ruthless prioritization, the difference between output and outcome, stakeholder alignment without losing the plot, data-informed vs data-driven. Respects engineering constraints.",
    };
  }
  if (t.includes("fullstack") || t.includes("full-stack") || t.includes("full stack")) {
    return {
      role: "Principal Full-Stack Engineer",
      yearsHint: "10+ years across the entire stack, has made architectural decisions that aged well and some that didn't",
      domainVoice: "Writes about system design tradeoffs, the discipline of knowing when NOT to build, pragmatic technology choices, the reality of technical debt. Respected for shipping, not theorizing.",
    };
  }
  if (t.includes("mobile") || t.includes("ios") || t.includes("android") || t.includes("react native") || t.includes("flutter")) {
    return {
      role: "Staff Mobile Engineer",
      yearsHint: "9+ years in native/cross-platform mobile, has shipped apps with tens of millions of users",
      domainVoice: "Writes about app startup performance, memory management, crash rate discipline, platform API evolution, the real cost of cross-platform abstractions.",
    };
  }
  if (t.includes("data engineer") || t.includes("data platform") || t.includes("analytics engineer")) {
    return {
      role: "Senior Data Engineer",
      yearsHint: "8+ years building data pipelines and warehouses at scale",
      domainVoice: "Writes about pipeline reliability, the star schema is dead narrative (and why it isn't), dbt philosophy, streaming vs batch tradeoffs, data quality as a first-class citizen.",
    };
  }
  if (t.includes("engineering manager") || t.includes("em") || t.includes("eng manager") || t.includes("director")) {
    return {
      role: "Engineering Manager / Director",
      yearsHint: "12+ years in tech, 5+ years managing teams, has built orgs from 3 to 50+ engineers",
      domainVoice: "Writes about technical leadership, the maker/manager schedule tension, building engineering culture, when to rewrite vs refactor, how great engineers think.",
    };
  }

  // Default: experienced generalist software engineer
  return {
    role: "Staff Software Engineer",
    yearsHint: "10+ years building production systems across multiple companies",
    domainVoice: "Writes with hard-earned engineering perspective. References real incidents, architectural decisions, and the difference between theory and production reality.",
  };
}

const MILESTONE_CONTEXT: Record<string, string> = {
  opentowork: "is actively searching for their next senior role after deliberate reflection",
  applied: "has applied to a company they researched deeply and believe in technically",
  interview: "got a technical interview — they know the process, they've been on both sides of the table",
  offer: "received an offer after a rigorous technical process — this is validation of craft, not luck",
  networking: "is investing in their professional network with intentionality, not desperation",
};

export async function POST(req: Request) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const { resumeText, jobTitle, company, milestone, name, achievement } = await req.json();

    const persona = getVeteranPersona(jobTitle || "software engineer");

    const context = `
Persona: ${persona.role}
Background: ${persona.yearsHint}
Voice: ${persona.domainVoice}
Name: ${name || "this engineer"}
Milestone: ${MILESTONE_CONTEXT[milestone] || milestone}
Target role: ${jobTitle || "Senior Software Engineer"}
Target company: ${company || ""}
Key achievement to highlight: ${achievement || ""}
Resume excerpt (for context): ${(resumeText || "").slice(0, 500)}
`.trim();

    const prompt = `You are ghostwriting social media posts for a ${persona.role} with deep technical experience. Your voice is authoritative, specific, and earned — not motivational-speaker generic. This person has seen production fires, made architectural decisions that aged well and some that didn't, and has opinions backed by scars.

Context about this person:
${context}

Generate three posts. Each must sound like it was written by someone who has ACTUALLY been in the trenches for 10+ years, not a junior engineer pretending to be senior. Be specific to the domain. Avoid all corporate buzzwords: no "passionate", "excited", "thrilled", "honored", "humbled", "journey".

LINKEDIN POST (200-280 words):
- Open with a contrarian take, hard-won insight, or specific technical observation — NOT a career announcement
- Bury the actual career update in the 2nd or 3rd paragraph as context for the insight
- Share something most people in the industry get wrong or oversimplify
- Use concrete numbers or systems where possible (e.g., "3ms p99 latency", "15TB daily", "zero-downtime migrations")
- End with a sharp question that practitioners actually care about
- 3-4 domain-specific hashtags at the end (e.g., #distributedsystems not #softwareengineering)
- Tone: peer-to-peer, not broadcast. Like talking to engineers, not impressing recruiters.

TWITTER/X POST (max 240 chars including spaces):
- One sharp, opinionated take from a practitioner's perspective
- The kind of thing that gets retweeted by senior engineers who go "yes, exactly"
- No career announcement — pure insight or hot take
- Optional 1-2 very specific hashtags

REDDIT POST (for r/ExperiencedDevs or r/cscareerquestions):
- Title: specific, honest, no hype (e.g., "After 10 years I finally learned to say no to rewrites — here's what changed my mind")
- Body: 120-180 words. Conversational, specific. The kind of post that gets 400 upvotes because it's genuinely useful or honest. Share a real hard-earned lesson, reference the milestone as context but focus on the technical or career insight. Ask the community something genuine.

Return ONLY valid JSON, no markdown fences:
{
  "linkedin": "full post text",
  "twitter": "tweet text",
  "reddit": { "title": "title text", "body": "body text" }
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
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
