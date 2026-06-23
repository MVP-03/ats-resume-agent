"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Experience {
  id: string;
  company: string;
  role: string;
  duration: string;
  bullets: string[];
}

interface Education {
  id: string;
  school: string;
  degree: string;
  year: string;
}

interface BuilderResume {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  jobTitle: string;
  summary: string;
  skillsText: string;
  experiences: Experience[];
  education: Education[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

let _id = 1;
function uid() { return String(_id++); }

function newExp(): Experience {
  return { id: uid(), company: "", role: "", duration: "", bullets: [""] };
}
function newEdu(): Education {
  return { id: uid(), school: "", degree: "", year: "" };
}

const INITIAL: BuilderResume = {
  name: "", email: "", phone: "", linkedin: "",
  jobTitle: "", summary: "", skillsText: "",
  experiences: [newExp()],
  education: [newEdu()],
};

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--t3)" }}>
          {title}
        </span>
        {action}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {children}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, half,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  half?: boolean;
}) {
  return (
    <div style={half ? { flex: "0 0 calc(50% - 4px)" } : {}}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "5px" }}>
        {label}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="field"
        style={{ padding: "8px 12px", fontSize: "13px", width: "100%", boxSizing: "border-box" }}
      />
    </div>
  );
}

function PreviewDivider() {
  return <div style={{ height: "1px", background: "#c4b5fd", margin: "8px 0 10px" }} />;
}

function PreviewSectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontWeight: "bold",
      fontSize: "9.5pt",
      textTransform: "uppercase",
      borderBottom: "1.2px solid #7c3aed",
      paddingBottom: "2px",
      marginBottom: "6px",
      letterSpacing: "0.06em",
      color: "#7c3aed",
    }}>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ResumeBuilderView({ onBack }: { onBack: () => void }) {
  const [resume, setResume] = useState<BuilderResume>(INITIAL);
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  // ── State updaters ──────────────────────────────────────────────────────

  function setF<K extends keyof BuilderResume>(key: K, value: BuilderResume[K]) {
    setResume(r => ({ ...r, [key]: value }));
  }

  // Experience
  function addExp() { setResume(r => ({ ...r, experiences: [...r.experiences, newExp()] })); }
  function removeExp(id: string) { setResume(r => ({ ...r, experiences: r.experiences.filter(e => e.id !== id) })); }
  function updateExp(id: string, key: keyof Omit<Experience, "id" | "bullets">, val: string) {
    setResume(r => ({ ...r, experiences: r.experiences.map(e => e.id === id ? { ...e, [key]: val } : e) }));
  }
  function addBullet(expId: string) {
    setResume(r => ({ ...r, experiences: r.experiences.map(e => e.id === expId ? { ...e, bullets: [...e.bullets, ""] } : e) }));
  }
  function updateBullet(expId: string, i: number, val: string) {
    setResume(r => ({ ...r, experiences: r.experiences.map(e => e.id === expId ? { ...e, bullets: e.bullets.map((b, j) => j === i ? val : b) } : e) }));
  }
  function removeBullet(expId: string, i: number) {
    setResume(r => ({ ...r, experiences: r.experiences.map(e => e.id === expId ? { ...e, bullets: e.bullets.filter((_, j) => j !== i) } : e) }));
  }

  // Education
  function addEdu() { setResume(r => ({ ...r, education: [...r.education, newEdu()] })); }
  function removeEdu(id: string) { setResume(r => ({ ...r, education: r.education.filter(e => e.id !== id) })); }
  function updateEdu(id: string, key: keyof Omit<Education, "id">, val: string) {
    setResume(r => ({ ...r, education: r.education.map(e => e.id === id ? { ...e, [key]: val } : e) }));
  }

  // ── AI helpers ──────────────────────────────────────────────────────────

  async function generateBullets(exp: Experience) {
    if (!exp.role && !exp.company) { setError("Enter a role or company name first."); return; }
    setError("");
    setAiLoading(l => ({ ...l, [exp.id]: true }));
    try {
      const res = await fetch("/api/ai-bullets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: exp.role, company: exp.company, duration: exp.duration, mode: "bullets" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (Array.isArray(data.bullets)) {
        setResume(r => ({ ...r, experiences: r.experiences.map(e => e.id === exp.id ? { ...e, bullets: data.bullets } : e) }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI error");
    } finally {
      setAiLoading(l => ({ ...l, [exp.id]: false }));
    }
  }

  async function generateSummary() {
    const role = resume.jobTitle || resume.experiences[0]?.role;
    if (!role) { setError("Enter your job title first."); return; }
    setError("");
    setAiLoading(l => ({ ...l, summary: true }));
    try {
      const res = await fetch("/api/ai-bullets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, company: resume.experiences[0]?.company, mode: "summary" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (data.text) setF("summary", data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI error");
    } finally {
      setAiLoading(l => ({ ...l, summary: false }));
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────

  async function downloadDocx() {
    if (!resume.name) { setError("Enter your name first."); return; }
    setError("");
    setDownloading(true);
    try {
      const skills = resume.skillsText.split(",").map(s => s.trim()).filter(Boolean);
      const payload = {
        name: resume.name,
        email: resume.email,
        phone: resume.phone,
        linkedin: resume.linkedin,
        jobTitle: resume.jobTitle,
        summary: resume.summary,
        skills,
        experiences: resume.experiences
          .filter(e => e.company || e.role)
          .map(({ company, role, duration, bullets }) => ({
            company, role, duration, bullets: bullets.filter(Boolean),
          })),
        education: resume.education
          .filter(e => e.school || e.degree)
          .map(({ school, degree, year }) => ({ school, degree, year })),
      };
      const res = await fetch("/api/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("DOCX generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resume.name.replace(/\s+/g, "_")}_resume.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────

  const skills = resume.skillsText.split(",").map(s => s.trim()).filter(Boolean);
  const hasAnyContent = resume.name || resume.summary ||
    resume.experiences.some(e => e.company || e.role) ||
    resume.education.some(e => e.school || e.degree) ||
    skills.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", borderBottom: "1px solid var(--border)",
        background: "var(--card)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: "12px" }}>
            ← Back
          </button>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--t1)", margin: 0 }}>
            Resume Builder
          </h2>
          <span style={{
            fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px",
            background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)",
          }}>BETA</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {error && (
            <span style={{ fontSize: "12px", color: "#f43f5e", maxWidth: "280px", textAlign: "right" }}>{error}</span>
          )}
          <button
            onClick={downloadDocx}
            disabled={downloading}
            className="btn btn-primary"
            style={{ padding: "7px 16px", fontSize: "13px" }}
          >
            {downloading ? "Downloading…" : "⬇ Download DOCX"}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Left panel: form ── */}
        <div style={{
          width: "46%", overflowY: "auto", padding: "18px 16px",
          borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "14px",
        }}>

          {/* Contact */}
          <SectionCard title="Contact">
            <Field label="Full Name *" value={resume.name} onChange={v => setF("name", v)} placeholder="Jane Smith" />
            <Field label="Email" value={resume.email} onChange={v => setF("email", v)} placeholder="jane@email.com" />
            <div style={{ display: "flex", gap: "8px" }}>
              <Field label="Phone" value={resume.phone} onChange={v => setF("phone", v)} placeholder="+1 (555) 123-4567" half />
              <Field label="Job Title" value={resume.jobTitle} onChange={v => setF("jobTitle", v)} placeholder="Software Engineer" half />
            </div>
            <Field label="LinkedIn URL" value={resume.linkedin} onChange={v => setF("linkedin", v)} placeholder="linkedin.com/in/janesmith" />
          </SectionCard>

          {/* Summary */}
          <SectionCard
            title="Professional Summary"
            action={
              <button
                onClick={generateSummary}
                disabled={!!aiLoading.summary}
                className="btn btn-ghost"
                style={{ padding: "3px 10px", fontSize: "11px" }}
              >
                {aiLoading.summary ? "Generating…" : "✦ AI Write"}
              </button>
            }
          >
            <textarea
              value={resume.summary}
              onChange={e => setF("summary", e.target.value)}
              placeholder="Brief overview of your experience and what you bring to employers…"
              className="field"
              rows={4}
              style={{ resize: "vertical", fontSize: "13px", padding: "10px 12px", width: "100%", boxSizing: "border-box", lineHeight: "1.5" }}
            />
          </SectionCard>

          {/* Experience */}
          <SectionCard
            title="Experience"
            action={
              <button onClick={addExp} className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: "11px" }}>
                + Add
              </button>
            }
          >
            {resume.experiences.map((exp, i) => (
              <div key={exp.id} style={{
                border: "1px solid var(--border)", borderRadius: "10px", padding: "14px",
                display: "flex", flexDirection: "column", gap: "10px",
                marginBottom: i < resume.experiences.length - 1 ? "10px" : 0,
              }}>
                {/* Entry header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Position {i + 1}
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => generateBullets(exp)}
                      disabled={!!aiLoading[exp.id]}
                      className="btn btn-ghost"
                      style={{ padding: "3px 10px", fontSize: "11px" }}
                    >
                      {aiLoading[exp.id] ? "Generating…" : "✦ AI Bullets"}
                    </button>
                    {resume.experiences.length > 1 && (
                      <button
                        onClick={() => removeExp(exp.id)}
                        className="btn btn-ghost"
                        style={{ padding: "3px 8px", fontSize: "13px", color: "#f43f5e", lineHeight: 1 }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Company / Role */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <Field label="Company" value={exp.company} onChange={v => updateExp(exp.id, "company", v)} placeholder="Acme Corp" half />
                  <Field label="Role / Title" value={exp.role} onChange={v => updateExp(exp.id, "role", v)} placeholder="Software Engineer" half />
                </div>
                <Field label="Duration" value={exp.duration} onChange={v => updateExp(exp.id, "duration", v)} placeholder="Jan 2022 – Present" />

                {/* Bullets */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "6px" }}>
                    Bullet Points
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {exp.bullets.map((b, j) => (
                      <div key={j} style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                        <span style={{ color: "var(--t3)", fontSize: "15px", flexShrink: 0, lineHeight: 1 }}>•</span>
                        <input
                          value={b}
                          onChange={e => updateBullet(exp.id, j, e.target.value)}
                          placeholder="Led team of 4 to ship payments feature 2 weeks ahead of schedule"
                          className="field"
                          style={{ flex: 1, padding: "6px 10px", fontSize: "12px" }}
                        />
                        {exp.bullets.length > 1 && (
                          <button
                            onClick={() => removeBullet(exp.id, j)}
                            style={{ background: "none", border: "none", color: "var(--t3)", cursor: "pointer", fontSize: "16px", padding: "0 3px", lineHeight: 1, flexShrink: 0 }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addBullet(exp.id)}
                      className="btn btn-ghost"
                      style={{ alignSelf: "flex-start", padding: "3px 10px", fontSize: "11px", marginTop: "2px" }}
                    >
                      + Bullet
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </SectionCard>

          {/* Education */}
          <SectionCard
            title="Education"
            action={
              <button onClick={addEdu} className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: "11px" }}>
                + Add
              </button>
            }
          >
            {resume.education.map((edu, i) => (
              <div key={edu.id} style={{
                border: "1px solid var(--border)", borderRadius: "10px", padding: "14px",
                display: "flex", flexDirection: "column", gap: "8px",
                marginBottom: i < resume.education.length - 1 ? "10px" : 0,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Entry {i + 1}
                  </span>
                  {resume.education.length > 1 && (
                    <button
                      onClick={() => removeEdu(edu.id)}
                      className="btn btn-ghost"
                      style={{ padding: "3px 8px", fontSize: "13px", color: "#f43f5e", lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <Field label="Degree" value={edu.degree} onChange={v => updateEdu(edu.id, "degree", v)} placeholder="B.Sc. Computer Science" />
                <div style={{ display: "flex", gap: "8px" }}>
                  <Field label="School" value={edu.school} onChange={v => updateEdu(edu.id, "school", v)} placeholder="University of Toronto" half />
                  <Field label="Year" value={edu.year} onChange={v => updateEdu(edu.id, "year", v)} placeholder="2022" half />
                </div>
              </div>
            ))}
          </SectionCard>

          {/* Skills */}
          <SectionCard title="Skills">
            <div>
              <input
                value={resume.skillsText}
                onChange={e => setF("skillsText", e.target.value)}
                placeholder="React, TypeScript, Node.js, PostgreSQL, AWS, Docker…"
                className="field"
                style={{ padding: "10px 12px", fontSize: "13px", width: "100%", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: "11px", color: "var(--t3)", marginTop: "5px", marginBottom: 0 }}>
                Comma-separated
              </p>
            </div>
            {skills.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {skills.map((s, i) => (
                  <span key={i} style={{
                    fontSize: "11px", padding: "3px 10px", borderRadius: "99px",
                    background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)",
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            )}
          </SectionCard>

        </div>

        {/* ── Right panel: live preview ── */}
        <div style={{
          flex: 1, overflowY: "auto", background: "#374151",
          padding: "24px 16px", display: "flex", justifyContent: "center",
        }}>
          <div style={{
            background: "white", width: "100%", maxWidth: "660px",
            minHeight: "860px", padding: "44px 50px",
            fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
            color: "#111", fontSize: "10.5pt", lineHeight: "1.35",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}>

            {/* Empty state */}
            {!hasAnyContent && (
              <div style={{ textAlign: "center", color: "#9ca3af", marginTop: "80px" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📄</div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>Your resume preview appears here</div>
                <div style={{ fontSize: "12px", marginTop: "6px" }}>Fill in your name and details on the left to get started</div>
              </div>
            )}

            {/* Name */}
            {resume.name && (
              <div style={{ textAlign: "center", fontSize: "20pt", fontWeight: "bold", lineHeight: "1.1", marginBottom: "3px" }}>
                {resume.name}
              </div>
            )}

            {/* Job title */}
            {resume.jobTitle && (
              <div style={{ textAlign: "center", fontSize: "11pt", color: "#7c3aed", fontWeight: "bold", marginBottom: "4px" }}>
                {resume.jobTitle}
              </div>
            )}

            {/* Contact line */}
            {(resume.email || resume.phone || resume.linkedin) && (
              <div style={{ textAlign: "center", fontSize: "9pt", color: "#555", marginBottom: "10px" }}>
                {[resume.email, resume.phone, resume.linkedin].filter(Boolean).join("  •  ")}
              </div>
            )}

            {/* Top divider */}
            {resume.name && <PreviewDivider />}

            {/* Summary */}
            {resume.summary && (
              <>
                <PreviewSectionHeader>Professional Summary</PreviewSectionHeader>
                <p style={{ fontSize: "9.5pt", lineHeight: "1.4", marginBottom: "10px", color: "#374151" }}>
                  {resume.summary}
                </p>
              </>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <>
                <PreviewSectionHeader>Skills</PreviewSectionHeader>
                <p style={{ fontSize: "9.5pt", lineHeight: "1.4", marginBottom: "10px", color: "#374151" }}>
                  {skills.join("  •  ")}
                </p>
              </>
            )}

            {/* Experience */}
            {resume.experiences.some(e => e.company || e.role) && (
              <>
                <PreviewSectionHeader>Experience</PreviewSectionHeader>
                {resume.experiences.filter(e => e.company || e.role).map(exp => (
                  <div key={exp.id} style={{ marginBottom: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div>
                        {exp.role && <span style={{ fontWeight: "bold", fontSize: "10pt" }}>{exp.role}</span>}
                        {exp.role && exp.company && <span style={{ color: "#9ca3af", fontSize: "9.5pt" }}>  at  </span>}
                        {exp.company && <span style={{ fontSize: "10pt", color: "#7c3aed", fontWeight: "bold" }}>{exp.company}</span>}
                      </div>
                      {exp.duration && (
                        <span style={{ fontSize: "9pt", color: "#6b7280", flexShrink: 0, marginLeft: "8px" }}>{exp.duration}</span>
                      )}
                    </div>
                    {exp.bullets.filter(b => b.trim()).length > 0 && (
                      <ul style={{ margin: "3px 0 0 0", paddingLeft: "16px" }}>
                        {exp.bullets.filter(b => b.trim()).map((b, j) => (
                          <li key={j} style={{ fontSize: "9.5pt", lineHeight: "1.35", marginBottom: "2px", color: "#374151" }}>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Education */}
            {resume.education.some(e => e.school || e.degree) && (
              <>
                <PreviewSectionHeader>Education</PreviewSectionHeader>
                {resume.education.filter(e => e.school || e.degree).map(edu => (
                  <div key={edu.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                    <div>
                      {edu.degree && <span style={{ fontWeight: "bold", fontSize: "10pt" }}>{edu.degree}</span>}
                      {edu.degree && edu.school && <span style={{ color: "#9ca3af", fontSize: "9pt" }}>  —  </span>}
                      {edu.school && <span style={{ fontSize: "9.5pt" }}>{edu.school}</span>}
                    </div>
                    {edu.year && <span style={{ fontSize: "9pt", color: "#6b7280", flexShrink: 0, marginLeft: "8px" }}>{edu.year}</span>}
                  </div>
                ))}
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
