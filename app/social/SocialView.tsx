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

const LIIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.734l7.736-8.857L1.254 2.25H8.08l4.26 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const RedditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const MILESTONES = [
  { value: "opentowork", label: "Actively Job Searching" },
  { value: "applied", label: "Just Applied Somewhere" },
  { value: "interview", label: "Got an Interview!" },
  { value: "offer", label: "Received an Offer" },
  { value: "networking", label: "Looking to Network" },
];

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0A66C2",
  twitter: "#000000",
  reddit: "#FF4500",
};

export default function SocialView({ resumeText, jobDescription, onBack }: Props) {
  const [tab, setTab] = useState<"linkedin" | "twitter" | "reddit">("linkedin");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SocialResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    jobTitle: "",
    company: "",
    milestone: "opentowork",
    achievement: "",
  });

  function setF(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, resumeText, jobDescription }),
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

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const twitterLen = result?.twitter?.length ?? 0;
  const twitterOver = twitterLen > 280;

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: "20px" }} className="animate-fadeUp">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>Social Post Generator</h2>
          <p style={{ fontSize: "13px", color: "var(--t2)" }}>Generate platform-native posts for LinkedIn, X, and Reddit — no corporate fluff.</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "12px" }}>Home</button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}>
          <span style={{ fontSize: "13px", color: "var(--red)" }}>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px", alignItems: "start" }}>

        {/* Form */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--t3)" }}>Your Info</p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>Your Name</label>
              <input value={form.name} onChange={setF("name")} placeholder="Jane Smith" className="field" style={{ padding: "8px 12px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>Target Role</label>
              <input value={form.jobTitle} onChange={setF("jobTitle")} placeholder="Senior Software Engineer" className="field" style={{ padding: "8px 12px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>Company (optional)</label>
              <input value={form.company} onChange={setF("company")} placeholder="Stripe, Google, etc." className="field" style={{ padding: "8px 12px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>Milestone</label>
              <select value={form.milestone} onChange={setF("milestone")} className="field" style={{ padding: "8px 12px" }}>
                {MILESTONES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>
                Key Achievement <span style={{ color: "var(--t3)", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea value={form.achievement} onChange={setF("achievement")}
                placeholder="e.g. Led a team of 5 engineers, increased API performance by 40%"
                rows={2} className="field" style={{ padding: "8px 12px", resize: "vertical", lineHeight: 1.5 }} />
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "11px", fontSize: "13px", marginTop: "4px" }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                <span style={{ width: "13px", height: "13px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} className="animate-spin" />
                Generating...
              </span>
            ) : "Generate Posts"}
          </button>
        </div>

        {/* Output */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Platform tabs */}
          <div className="tab-bar">
            {([
              { id: "linkedin" as const, label: "LinkedIn", icon: <LIIcon />, color: "#0A66C2" },
              { id: "twitter" as const, label: "X (Twitter)", icon: <XIcon />, color: "#000" },
              { id: "reddit" as const, label: "Reddit", icon: <RedditIcon />, color: "#FF4500" },
            ]).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`tab${tab === t.id ? " active" : ""}`}>
                <span style={{ color: tab === t.id ? PLATFORM_COLORS[t.id] : undefined }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Post output */}
          {!result ? (
            <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "16px" }}>
                {[{ icon: <LIIcon />, col: "#0A66C2" }, { icon: <XIcon />, col: "#000" }, { icon: <RedditIcon />, col: "#FF4500" }].map((p, i) => (
                  <div key={i} style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${p.col}18`, border: `1px solid ${p.col}30`, display: "flex", alignItems: "center", justifyContent: "center", color: p.col }}>
                    {p.icon}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", marginBottom: "6px" }}>Ready to generate</p>
              <p style={{ fontSize: "13px", color: "var(--t2)" }}>Fill in your info on the left and click Generate Posts.</p>
            </div>
          ) : (
            <>
              {/* LinkedIn */}
              {tab === "linkedin" && result.linkedin && (
                <div className="card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#0A66C218", border: "1px solid #0A66C230", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A66C2" }}>
                        <LIIcon />
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>LinkedIn Post</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", color: "var(--t3)", fontFamily: "var(--font-geist-mono)" }}>{result.linkedin.length} chars</span>
                      <button onClick={() => copyText(result.linkedin, "linkedin")} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }}>
                        {copied === "linkedin" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: "16px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: "13px", color: "rgba(255,255,255,0.85)", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>{result.linkedin}</pre>
                  </div>
                </div>
              )}

              {/* Twitter */}
              {tab === "twitter" && result.twitter && (
                <div className="card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                        <XIcon />
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>X Post</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontFamily: "var(--font-geist-mono)", fontWeight: 600, color: twitterOver ? "var(--red)" : twitterLen > 240 ? "var(--yellow)" : "var(--t3)" }}>
                        {twitterLen}/280
                      </span>
                      <button onClick={() => copyText(result.twitter, "twitter")} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }}>
                        {copied === "twitter" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                      </button>
                    </div>
                  </div>
                  {twitterOver && (
                    <div style={{ padding: "8px 12px", borderRadius: "8px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", marginBottom: "12px", fontSize: "12px", color: "var(--red)" }}>
                      Over 280 characters — trim before posting
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
                      <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#FF450018", border: "1px solid #FF450030", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF4500" }}>
                        <RedditIcon />
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--t1)" }}>Reddit Post</span>
                      <span className="chip chip-gray" style={{ fontSize: "10px" }}>r/cscareerquestions</span>
                    </div>
                    <button onClick={() => copyText(`${result.reddit.title}\n\n${result.reddit.body}`, "reddit")} className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "12px" }}>
                      {copied === "reddit" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy All</>}
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--t3)", marginBottom: "6px" }}>Title</p>
                      <div style={{ padding: "12px 14px", borderRadius: "8px", background: "rgba(255,69,0,0.06)", border: "1px solid rgba(255,69,0,0.15)" }}>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", margin: 0, lineHeight: 1.4 }}>{result.reddit.title}</p>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--t3)", marginBottom: "6px" }}>Body</p>
                      <div style={{ padding: "14px 16px", borderRadius: "8px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                        <pre style={{ whiteSpace: "pre-wrap", fontSize: "13px", color: "rgba(255,255,255,0.85)", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>{result.reddit.body}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Regenerate */}
              <button onClick={handleGenerate} disabled={loading} className="btn btn-ghost" style={{ padding: "10px", fontSize: "12px" }}>
                Regenerate all posts
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
