"use client";
import { useState } from "react";

interface Props {
  resumeText: string;
  jobDescription: string;
  onBack: () => void;
}

interface SocialResult {
  linkedin: string;
  twitter: string;
  reddit: { title: string; body: string };
}

type Mode =
  | "skill_showcase"
  | "project_launch"
  | "hot_take"
  | "deep_dive"
  | "lessons_learned"
  | "tool_review"
  | "career_milestone"
  | "open_to_work"
  | "networking";

const MODES: { id: Mode; label: string; emoji: string; desc: string; color: string }[] = [
  { id: "skill_showcase",  label: "Skill Showcase",    emoji: "⚡", desc: "Mastered something new",         color: "#7c3aed" },
  { id: "project_launch",  label: "Project Launch",    emoji: "🚀", desc: "Just shipped something",          color: "#2563eb" },
  { id: "hot_take",        label: "Hot Take",          emoji: "🔥", desc: "Contrarian opinion on a tech",   color: "#dc2626" },
  { id: "deep_dive",       label: "Deep Dive",         emoji: "🧵", desc: "Teaching moment / tutorial",     color: "#0891b2" },
  { id: "lessons_learned", label: "Lessons Learned",   emoji: "🪖", desc: "Hard-won retrospective",         color: "#d97706" },
  { id: "tool_review",     label: "Tool Review",       emoji: "🔬", desc: "Honest take on a tool",          color: "#059669" },
  { id: "career_milestone",label: "Career Milestone",  emoji: "🎯", desc: "Interview / offer / new role",   color: "#7c3aed" },
  { id: "open_to_work",    label: "Open to Work",      emoji: "📡", desc: "Searching from a place of strength", color: "#0284c7" },
  { id: "networking",      label: "Networking",        emoji: "🤝", desc: "Starting real conversations",    color: "#6d28d9" },
];

const CAREER_MILESTONES = [
  { value: "applied",    label: "Just applied somewhere" },
  { value: "interview",  label: "Got an interview" },
  { value: "offer",      label: "Received an offer" },
  { value: "new_role",   label: "Starting a new role" },
];

function ModeFields({ mode, form, setF }: {
  mode: Mode;
  form: Record<string, string>;
  setF: (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}) {
  const field = (label: string, key: string, placeholder: string, multiline?: boolean, required?: boolean) => (
    <div>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>
        {label}{required && <span style={{ color: "var(--red)", marginLeft: "3px" }}>*</span>}
      </label>
      {multiline
        ? <textarea value={form[key] || ""} onChange={setF(key)} placeholder={placeholder} rows={2}
            className="field" style={{ padding: "8px 12px", resize: "vertical", lineHeight: 1.5 }} />
        : <input value={form[key] || ""} onChange={setF(key)} placeholder={placeholder}
            className="field" style={{ padding: "8px 12px" }} />
      }
    </div>
  );

  switch (mode) {
    case "skill_showcase":
      return <>
        {field("Skill / Technology *", "skill", "e.g. Rust async runtimes, eBPF, WASM", false, true)}
        {field("What you now understand that you didn't before", "detail", "The specific nuance, gotcha, or mental model shift...", true)}
        {field("Key result (optional)", "achievement", "e.g. Cut cold start by 40%, zero prod issues in 3 months")}
      </>;
    case "project_launch":
      return <>
        {field("What you shipped *", "topic", "e.g. A zero-downtime DB migration tool, a real-time collab engine", false, true)}
        {field("Tech stack used", "tech", "e.g. Rust + Tokio + PostgreSQL + Redis")}
        {field("What it does / the hard part", "detail", "What made this interesting or non-trivial to build...", true)}
        {field("Key metric or result", "achievement", "e.g. Handles 50k req/s, reduced deploy time 10x")}
      </>;
    case "hot_take":
      return <>
        {field("What's your take about? *", "topic", "e.g. Microservices, TypeScript, AI coding tools, ORMs", false, true)}
        {field("Your position *", "detail", "Why you think the conventional wisdom is wrong or incomplete...", true, true)}
        {field("Evidence / experience behind it", "achievement", "e.g. After 5 years and 3 rewrites, I've seen...")}
      </>;
    case "deep_dive":
      return <>
        {field("What are you teaching? *", "topic", "e.g. How Postgres MVCC actually works, CSS container queries", false, true)}
        {field("Specific angle / insight", "detail", "The non-obvious part most tutorials skip...", true)}
        {field("Key takeaway to drive home", "achievement", "The one thing you want readers to walk away with")}
      </>;
    case "lessons_learned":
      return <>
        {field("What's the lesson about? *", "topic", "e.g. Premature abstraction, distributed systems, hiring", false, true)}
        {field("What happened (be specific) *", "detail", "The actual situation — what went wrong or what surprised you...", true, true)}
        {field("The outcome", "achievement", "What changed because of this lesson")}
      </>;
    case "tool_review":
      return <>
        {field("Tool / Framework / Library *", "topic", "e.g. Bun, Drizzle ORM, Temporal, Turso, shadcn/ui", false, true)}
        {field("Your honest take after using it *", "detail", "What it's good at, what the docs won't tell you...", true, true)}
        {field("Your specific use case", "achievement", "What you were building when you used it")}
      </>;
    case "career_milestone":
      return <>
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>Milestone *</label>
          <select value={form.milestone || "applied"} onChange={setF("milestone")} className="field" style={{ padding: "8px 12px" }}>
            {CAREER_MILESTONES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        {field("Company (optional)", "company", "e.g. Stripe, a fintech startup, stealth")}
        {field("What you want to highlight", "achievement", "A project, skill, or perspective that's relevant to this role")}
        {field("Any context to weave in", "detail", "What drew you to this role / what makes this exciting technically", true)}
      </>;
    case "open_to_work":
      return <>
        {field("Target role *", "jobTitle", "e.g. Staff Backend Engineer, ML Platform Lead", false, true)}
        {field("What problems you want to work on", "detail", "Be specific — what scale, what domain, what impact...", true)}
        {field("What you bring (be concrete)", "achievement", "e.g. Led migration of 200M-row DB with zero downtime, built infra for 3 0-to-1 products")}
      </>;
    case "networking":
      return <>
        {field("Topic you want to discuss *", "topic", "e.g. LLM inference optimization, platform engineering culture", false, true)}
        {field("What you're looking for", "detail", "e.g. Engineers who've scaled data pipelines past 1TB/day, PMs in dev tools", true)}
        {field("Your credibility anchor (optional)", "achievement", "Something that establishes you actually work in this space")}
      </>;
    default:
      return null;
  }
}

function LIIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
}
function XIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.734l7.736-8.857L1.254 2.25H8.08l4.26 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
}
function RedditIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .379-.24l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>;
}
function CopyIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}
function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>;
}

const PLATFORM_TABS = [
  { id: "linkedin" as const, label: "LinkedIn", icon: <LIIcon />, color: "#0A66C2" },
  { id: "twitter" as const, label: "X",         icon: <XIcon />,  color: "#e7e9ea" },
  { id: "reddit"  as const, label: "Reddit",    icon: <RedditIcon />, color: "#FF4500" },
];

export default function SocialView({ resumeText, jobDescription, onBack }: Props) {
  const [mode, setMode] = useState<Mode>("skill_showcase");
  const [tab, setTab] = useState<"linkedin" | "twitter" | "reddit">("linkedin");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SocialResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ name: "", jobTitle: "" });

  function setF(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, resumeText, jobDescription, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const selectedMode = MODES.find(m => m.id === mode)!;
  const twitterLen = result?.twitter?.length ?? 0;

  return (
    <div style={{ maxWidth: "1040px", margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px" }} className="animate-fadeUp">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>Social Post Generator</h2>
          <p style={{ fontSize: "13px", color: "var(--t2)" }}>Posts that sound like a veteran, not a press release.</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "12px" }}>Home</button>
      </div>

      {/* Mode picker */}
      <div>
        <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--t3)", marginBottom: "10px" }}>What are you posting about?</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setResult(null); }}
              style={{
                padding: "10px 12px", borderRadius: "10px", textAlign: "left", cursor: "pointer",
                background: mode === m.id ? `${m.color}18` : "var(--s2)",
                border: `1px solid ${mode === m.id ? `${m.color}55` : "var(--border)"}`,
                transition: "all 0.15s",
              }}>
              <div style={{ fontSize: "16px", marginBottom: "4px" }}>{m.emoji}</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: mode === m.id ? "var(--t1)" : "var(--t2)" }}>{m.label}</div>
              <div style={{ fontSize: "10px", color: "var(--t3)", marginTop: "2px", lineHeight: 1.4 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", fontSize: "13px", color: "var(--red)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "20px", alignItems: "start" }}>

        {/* Form */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Context */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>Your Name</label>
              <input value={form.name || ""} onChange={setF("name")} placeholder="Jane Smith" className="field" style={{ padding: "8px 12px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>Your Role / Title</label>
              <input value={form.jobTitle || ""} onChange={setF("jobTitle")} placeholder="e.g. Staff Backend Engineer" className="field" style={{ padding: "8px 12px" }} />
            </div>
          </div>

          <div style={{ height: "1px", background: "var(--border)", margin: "2px 0" }} />

          {/* Mode-specific fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--t3)" }}>
              {selectedMode.emoji} {selectedMode.label}
            </p>
            <ModeFields mode={mode} form={form} setF={setF} />
          </div>

          <button onClick={handleGenerate} disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "11px", fontSize: "13px", marginTop: "4px" }}>
            {loading
              ? <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                  <span style={{ width: "13px", height: "13px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", display: "inline-block" }} className="animate-spin" />
                  Generating...
                </span>
              : `Generate ${selectedMode.label} Posts`
            }
          </button>
        </div>

        {/* Output */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="tab-bar">
            {PLATFORM_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`tab${tab === t.id ? " active" : ""}`}>
                <span style={{ color: tab === t.id ? t.color : undefined }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {!result ? (
            <div className="card" style={{ padding: "52px 32px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>{selectedMode.emoji}</div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", marginBottom: "6px" }}>{selectedMode.label}</p>
              <p style={{ fontSize: "13px", color: "var(--t2)" }}>{selectedMode.desc}</p>
              <p style={{ fontSize: "12px", color: "var(--t3)", marginTop: "8px" }}>Fill in the form and click Generate.</p>
            </div>
          ) : (
            <>
              {/* LinkedIn */}
              {tab === "linkedin" && (
                <div className="card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "7px", background: "#0A66C218", border: "1px solid #0A66C230", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A66C2" }}><LIIcon /></div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>LinkedIn</span>
                      <span style={{ fontSize: "10px", color: "var(--t3)", fontFamily: "var(--font-geist-mono)" }}>{result.linkedin.length} chars</span>
                    </div>
                    <button onClick={() => copy(result.linkedin, "li")} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px" }}>
                      {copied === "li" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                    </button>
                  </div>
                  <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: "13px", color: "rgba(255,255,255,0.85)", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>{result.linkedin}</pre>
                  </div>
                </div>
              )}

              {/* Twitter */}
              {tab === "twitter" && (
                <div className="card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "7px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#e7e9ea" }}><XIcon /></div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>X / Twitter</span>
                      <span style={{ fontSize: "11px", fontFamily: "var(--font-geist-mono)", fontWeight: 600, color: twitterLen > 280 ? "var(--red)" : twitterLen > 240 ? "var(--yellow)" : "var(--t3)" }}>
                        {twitterLen}/280
                      </span>
                    </div>
                    <button onClick={() => copy(result.twitter, "tw")} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px" }}>
                      {copied === "tw" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                    </button>
                  </div>
                  {twitterLen > 280 && (
                    <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", marginBottom: "12px", fontSize: "12px", color: "var(--red)" }}>
                      Over 280 chars — trim before posting
                    </div>
                  )}
                  <div style={{ padding: "16px 20px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                    <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.9)", lineHeight: 1.6, margin: 0 }}>{result.twitter}</p>
                  </div>
                </div>
              )}

              {/* Reddit */}
              {tab === "reddit" && result.reddit && (
                <div className="card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "7px", background: "#FF450018", border: "1px solid #FF450030", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF4500" }}><RedditIcon /></div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>Reddit</span>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(255,69,0,0.1)", color: "#FF4500", border: "1px solid rgba(255,69,0,0.2)" }}>r/ExperiencedDevs</span>
                    </div>
                    <button onClick={() => copy(`${result.reddit.title}\n\n${result.reddit.body}`, "rd")} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px" }}>
                      {copied === "rd" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy All</>}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ padding: "12px 14px", borderRadius: "8px", background: "rgba(255,69,0,0.06)", border: "1px solid rgba(255,69,0,0.15)" }}>
                      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,69,0,0.7)", marginBottom: "5px" }}>Title</p>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", margin: 0, lineHeight: 1.4 }}>{result.reddit.title}</p>
                    </div>
                    <div style={{ padding: "14px 16px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--t3)", marginBottom: "8px" }}>Body</p>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: "13px", color: "rgba(255,255,255,0.85)", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>{result.reddit.body}</pre>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleGenerate} disabled={loading} className="btn btn-ghost" style={{ padding: "10px", fontSize: "12px" }}>
                Regenerate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
