"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Experience {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
}

interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa: string;
}

interface Project {
  id: string;
  name: string;
  link: string;
  tech: string;
  bullets: string[];
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

interface BuilderResume {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  jobTitle: string;
  summary: string;
  experiences: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  skills: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

let _id = 100;
function uid() { return String(_id++); }

function newExp(): Experience {
  return { id: uid(), company: "", role: "", location: "", startDate: "", endDate: "", current: false, bullets: [""] };
}
function newEdu(): Education {
  return { id: uid(), school: "", degree: "", field: "", location: "", startDate: "", endDate: "", gpa: "" };
}
function newProject(): Project {
  return { id: uid(), name: "", link: "", tech: "", bullets: [""] };
}
function newCert(): Certification {
  return { id: uid(), name: "", issuer: "", date: "" };
}

const INITIAL: BuilderResume = {
  name: "", email: "", phone: "", location: "", linkedin: "", github: "", website: "",
  jobTitle: "", summary: "",
  experiences: [newExp()],
  education: [newEdu()],
  projects: [newProject()],
  certifications: [],
  skills: "",
};

// ── Form sub-components ────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--t2)", marginBottom: "4px" }}>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="field"
      style={{ padding: "7px 11px", fontSize: "12.5px", width: "100%", boxSizing: "border-box" }}
    />
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: "8px" }}>{children}</div>;
}

function Col({ children, flex = 1 }: { children: React.ReactNode; flex?: number }) {
  return <div style={{ flex }}>{children}</div>;
}

function SectionBox({ title, onAdd, addLabel, children }: {
  title: string; onAdd?: () => void; addLabel?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--t3)" }}>
          {title}
        </span>
        {onAdd && (
          <button onClick={onAdd} className="btn btn-ghost" style={{ padding: "2px 10px", fontSize: "11px" }}>
            + {addLabel || "Add"}
          </button>
        )}
      </div>
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {children}
      </div>
    </div>
  );
}

function EntryCard({ label, onRemove, canRemove, children }: {
  label: string; onRemove: () => void; canRemove: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "9px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        {canRemove && (
          <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "#f43f5e", fontSize: "16px", lineHeight: 1, padding: "0 3px" }}>×</button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Preview components ─────────────────────────────────────────────────────

function PvRule() {
  return <div style={{ height: "0.8px", background: "#1a1a1a", margin: "4px 0 8px" }} />;
}

function PvSection({ title }: { title: string }) {
  return (
    <div style={{
      fontWeight: 700, fontSize: "9.5pt", textTransform: "uppercase",
      borderBottom: "1px solid #222", paddingBottom: "1px", marginBottom: "5px",
      letterSpacing: "0.07em", color: "#111",
    }}>
      {title}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function ResumeBuilderView({ onBack }: { onBack: () => void }) {
  const [resume, setResume] = useState<BuilderResume>(INITIAL);
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  // ── Field helpers ───────────────────────────────────────────────────────

  function setF<K extends keyof BuilderResume>(key: K, value: BuilderResume[K]) {
    setResume(r => ({ ...r, [key]: value }));
  }

  // Experience
  function addExp() { setResume(r => ({ ...r, experiences: [...r.experiences, newExp()] })); }
  function removeExp(id: string) { setResume(r => ({ ...r, experiences: r.experiences.filter(e => e.id !== id) })); }
  function updateExp<K extends keyof Experience>(id: string, key: K, val: Experience[K]) {
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
  function updateEdu<K extends keyof Education>(id: string, key: K, val: Education[K]) {
    setResume(r => ({ ...r, education: r.education.map(e => e.id === id ? { ...e, [key]: val } : e) }));
  }

  // Projects
  function addProject() { setResume(r => ({ ...r, projects: [...r.projects, newProject()] })); }
  function removeProject(id: string) { setResume(r => ({ ...r, projects: r.projects.filter(p => p.id !== id) })); }
  function updateProject<K extends keyof Project>(id: string, key: K, val: Project[K]) {
    setResume(r => ({ ...r, projects: r.projects.map(p => p.id === id ? { ...p, [key]: val } : p) }));
  }
  function addProjectBullet(projId: string) {
    setResume(r => ({ ...r, projects: r.projects.map(p => p.id === projId ? { ...p, bullets: [...p.bullets, ""] } : p) }));
  }
  function updateProjectBullet(projId: string, i: number, val: string) {
    setResume(r => ({ ...r, projects: r.projects.map(p => p.id === projId ? { ...p, bullets: p.bullets.map((b, j) => j === i ? val : b) } : p) }));
  }
  function removeProjectBullet(projId: string, i: number) {
    setResume(r => ({ ...r, projects: r.projects.map(p => p.id === projId ? { ...p, bullets: p.bullets.filter((_, j) => j !== i) } : p) }));
  }

  // Certifications
  function addCert() { setResume(r => ({ ...r, certifications: [...r.certifications, newCert()] })); }
  function removeCert(id: string) { setResume(r => ({ ...r, certifications: r.certifications.filter(c => c.id !== id) })); }
  function updateCert<K extends keyof Certification>(id: string, key: K, val: Certification[K]) {
    setResume(r => ({ ...r, certifications: r.certifications.map(c => c.id === id ? { ...c, [key]: val } : c) }));
  }

  // ── AI ──────────────────────────────────────────────────────────────────

  async function generateBullets(exp: Experience) {
    if (!exp.role && !exp.company) { setError("Enter a role or company first."); return; }
    setError(""); setAiLoading(l => ({ ...l, [exp.id]: true }));
    try {
      const res = await fetch("/api/ai-bullets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: exp.role, company: exp.company, duration: `${exp.startDate}–${exp.endDate}`, mode: "bullets" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (Array.isArray(data.bullets)) {
        setResume(r => ({ ...r, experiences: r.experiences.map(e => e.id === exp.id ? { ...e, bullets: data.bullets } : e) }));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "AI error"); }
    finally { setAiLoading(l => ({ ...l, [exp.id]: false })); }
  }

  async function generateProjectBullets(proj: Project) {
    if (!proj.name) { setError("Enter a project name first."); return; }
    setError(""); setAiLoading(l => ({ ...l, [proj.id]: true }));
    try {
      const res = await fetch("/api/ai-bullets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: proj.name, company: proj.tech, mode: "bullets" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (Array.isArray(data.bullets)) {
        setResume(r => ({ ...r, projects: r.projects.map(p => p.id === proj.id ? { ...p, bullets: data.bullets } : p) }));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "AI error"); }
    finally { setAiLoading(l => ({ ...l, [proj.id]: false })); }
  }

  async function generateSummary() {
    const role = resume.jobTitle || resume.experiences[0]?.role;
    if (!role) { setError("Enter your job title first."); return; }
    setError(""); setAiLoading(l => ({ ...l, summary: true }));
    try {
      const res = await fetch("/api/ai-bullets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, company: resume.experiences[0]?.company, mode: "summary" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (data.text) setF("summary", data.text);
    } catch (e) { setError(e instanceof Error ? e.message : "AI error"); }
    finally { setAiLoading(l => ({ ...l, summary: false })); }
  }

  // ── Export ──────────────────────────────────────────────────────────────

  function downloadPdf() {
    window.print();
  }

  async function downloadDocx() {
    if (!resume.name) { setError("Enter your name first."); return; }
    setError(""); setDownloading(true);
    try {
      const payload = {
        name: resume.name,
        email: resume.email,
        phone: resume.phone,
        location: resume.location,
        linkedin: resume.linkedin,
        github: resume.github,
        website: resume.website,
        jobTitle: resume.jobTitle,
        summary: resume.summary,
        skills: resume.skills.split(",").map(s => s.trim()).filter(Boolean),
        experiences: resume.experiences
          .filter(e => e.company || e.role)
          .map(({ company, role, location, startDate, endDate, current, bullets }) => ({
            company, role, location,
            duration: current ? `${startDate} – Present` : [startDate, endDate].filter(Boolean).join(" – "),
            bullets: bullets.filter(Boolean),
          })),
        education: resume.education
          .filter(e => e.school || e.degree)
          .map(({ school, degree, field, location, startDate, endDate, gpa }) => ({
            school, degree: [degree, field].filter(Boolean).join(", "), location,
            year: [startDate, endDate].filter(Boolean).join(" – "), gpa,
          })),
        projects: resume.projects
          .filter(p => p.name)
          .map(({ name, link, tech, bullets }) => ({
            name, link, tech, bullets: bullets.filter(Boolean),
          })),
        certifications: resume.certifications
          .filter(c => c.name)
          .map(({ name, issuer, date }) => ({ name, issuer, date })),
      };
      const res = await fetch("/api/generate-docx", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
    } catch (e) { setError(e instanceof Error ? e.message : "Download failed"); }
    finally { setDownloading(false); }
  }

  // ── Derived ─────────────────────────────────────────────────────────────

  const skillList = resume.skills.split(",").map(s => s.trim()).filter(Boolean);
  const hasExp = resume.experiences.some(e => e.company || e.role);
  const hasEdu = resume.education.some(e => e.school || e.degree);
  const hasProj = resume.projects.some(p => p.name);
  const hasCert = resume.certifications.some(c => c.name);
  const hasContent = resume.name || resume.summary || hasExp || hasEdu || hasProj || skillList.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Print styles — only show preview when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #rb-preview, #rb-preview * { visibility: visible !important; }
          #rb-preview {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            padding: 36px 48px !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--card)", flexShrink: 0, gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={onBack} className="btn btn-ghost" style={{ padding: "5px 12px", fontSize: "12px" }}>← Back</button>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--t1)", margin: 0 }}>Resume Builder</h2>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {error && <span style={{ fontSize: "12px", color: "#f43f5e", maxWidth: "260px", textAlign: "right" }}>{error}</span>}
            <button onClick={downloadPdf} className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "12px" }}>
              🖨 PDF
            </button>
            <button onClick={downloadDocx} disabled={downloading} className="btn btn-primary" style={{ padding: "7px 16px", fontSize: "13px" }}>
              {downloading ? "Exporting…" : "⬇ Download DOCX"}
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ── Left: form ── */}
          <div style={{
            width: "44%", overflowY: "auto", padding: "16px 14px",
            borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "12px",
          }}>

            {/* Contact */}
            <SectionBox title="Contact">
              <Row>
                <Col>
                  <Label>Full Name *</Label>
                  <Input value={resume.name} onChange={v => setF("name", v)} placeholder="Jane Smith" />
                </Col>
                <Col>
                  <Label>Job Title</Label>
                  <Input value={resume.jobTitle} onChange={v => setF("jobTitle", v)} placeholder="Software Engineer" />
                </Col>
              </Row>
              <Row>
                <Col>
                  <Label>Email</Label>
                  <Input value={resume.email} onChange={v => setF("email", v)} placeholder="jane@email.com" />
                </Col>
                <Col>
                  <Label>Phone</Label>
                  <Input value={resume.phone} onChange={v => setF("phone", v)} placeholder="+1 (555) 000-0000" />
                </Col>
              </Row>
              <Row>
                <Col>
                  <Label>Location</Label>
                  <Input value={resume.location} onChange={v => setF("location", v)} placeholder="Toronto, ON" />
                </Col>
                <Col>
                  <Label>LinkedIn</Label>
                  <Input value={resume.linkedin} onChange={v => setF("linkedin", v)} placeholder="linkedin.com/in/jane" />
                </Col>
              </Row>
              <Row>
                <Col>
                  <Label>GitHub</Label>
                  <Input value={resume.github} onChange={v => setF("github", v)} placeholder="github.com/janesmith" />
                </Col>
                <Col>
                  <Label>Portfolio / Website</Label>
                  <Input value={resume.website} onChange={v => setF("website", v)} placeholder="janesmith.dev" />
                </Col>
              </Row>
            </SectionBox>

            {/* Summary */}
            <SectionBox
              title="Professional Summary"
              onAdd={generateSummary}
              addLabel={aiLoading.summary ? "Generating…" : "✦ AI Write"}
            >
              <textarea
                value={resume.summary}
                onChange={e => setF("summary", e.target.value)}
                placeholder="2–3 sentence overview of your background, key strengths, and what you bring to the role…"
                className="field"
                rows={4}
                style={{ resize: "vertical", fontSize: "12.5px", padding: "9px 11px", width: "100%", boxSizing: "border-box", lineHeight: "1.5" }}
              />
            </SectionBox>

            {/* Experience */}
            <SectionBox title="Work Experience" onAdd={addExp} addLabel="Add Role">
              {resume.experiences.map((exp, i) => (
                <EntryCard key={exp.id} label={`Position ${i + 1}`} onRemove={() => removeExp(exp.id)} canRemove={resume.experiences.length > 1}>
                  <Row>
                    <Col>
                      <Label>Role / Title</Label>
                      <Input value={exp.role} onChange={v => updateExp(exp.id, "role", v)} placeholder="Software Engineer" />
                    </Col>
                    <Col>
                      <Label>Company</Label>
                      <Input value={exp.company} onChange={v => updateExp(exp.id, "company", v)} placeholder="Acme Corp" />
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Label>Start Date</Label>
                      <Input value={exp.startDate} onChange={v => updateExp(exp.id, "startDate", v)} placeholder="Jan 2022" />
                    </Col>
                    <Col>
                      <Label>End Date</Label>
                      <Input value={exp.endDate} onChange={v => updateExp(exp.id, "endDate", v)} placeholder="Present" />
                    </Col>
                    <Col flex={0.8}>
                      <Label>Location</Label>
                      <Input value={exp.location} onChange={v => updateExp(exp.id, "location", v)} placeholder="Remote" />
                    </Col>
                  </Row>
                  {/* Bullets */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                      <Label>Bullet Points</Label>
                      <button
                        onClick={() => generateBullets(exp)}
                        disabled={!!aiLoading[exp.id]}
                        className="btn btn-ghost"
                        style={{ padding: "2px 9px", fontSize: "10.5px" }}
                      >
                        {aiLoading[exp.id] ? "Generating…" : "✦ AI Bullets"}
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {exp.bullets.map((b, j) => (
                        <div key={j} style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                          <span style={{ color: "var(--t3)", fontSize: "14px", flexShrink: 0 }}>•</span>
                          <input
                            value={b}
                            onChange={e => updateBullet(exp.id, j, e.target.value)}
                            placeholder="Led team of 4 to ship payments feature 2 weeks early"
                            className="field"
                            style={{ flex: 1, padding: "5px 9px", fontSize: "12px" }}
                          />
                          {exp.bullets.length > 1 && (
                            <button onClick={() => removeBullet(exp.id, j)} style={{ background: "none", border: "none", color: "var(--t3)", cursor: "pointer", fontSize: "15px", padding: "0 2px", lineHeight: 1 }}>×</button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => addBullet(exp.id)} className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: "2px 9px", fontSize: "11px", marginTop: "2px" }}>
                        + Bullet
                      </button>
                    </div>
                  </div>
                </EntryCard>
              ))}
            </SectionBox>

            {/* Projects */}
            <SectionBox title="Projects" onAdd={addProject} addLabel="Add Project">
              {resume.projects.map((proj, i) => (
                <EntryCard key={proj.id} label={`Project ${i + 1}`} onRemove={() => removeProject(proj.id)} canRemove={resume.projects.length > 0}>
                  <Row>
                    <Col>
                      <Label>Project Name</Label>
                      <Input value={proj.name} onChange={v => updateProject(proj.id, "name", v)} placeholder="PortfolioAI" />
                    </Col>
                    <Col>
                      <Label>Link (GitHub / Live)</Label>
                      <Input value={proj.link} onChange={v => updateProject(proj.id, "link", v)} placeholder="github.com/jane/project" />
                    </Col>
                  </Row>
                  <div>
                    <Label>Tech Stack</Label>
                    <Input value={proj.tech} onChange={v => updateProject(proj.id, "tech", v)} placeholder="React, Node.js, PostgreSQL" />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                      <Label>Description</Label>
                      <button
                        onClick={() => generateProjectBullets(proj)}
                        disabled={!!aiLoading[proj.id]}
                        className="btn btn-ghost"
                        style={{ padding: "2px 9px", fontSize: "10.5px" }}
                      >
                        {aiLoading[proj.id] ? "Generating…" : "✦ AI Bullets"}
                      </button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {proj.bullets.map((b, j) => (
                        <div key={j} style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                          <span style={{ color: "var(--t3)", fontSize: "14px", flexShrink: 0 }}>•</span>
                          <input
                            value={b}
                            onChange={e => updateProjectBullet(proj.id, j, e.target.value)}
                            placeholder="Built full-stack app with real-time updates serving 500+ users"
                            className="field"
                            style={{ flex: 1, padding: "5px 9px", fontSize: "12px" }}
                          />
                          {proj.bullets.length > 1 && (
                            <button onClick={() => removeProjectBullet(proj.id, j)} style={{ background: "none", border: "none", color: "var(--t3)", cursor: "pointer", fontSize: "15px", padding: "0 2px", lineHeight: 1 }}>×</button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => addProjectBullet(proj.id)} className="btn btn-ghost" style={{ alignSelf: "flex-start", padding: "2px 9px", fontSize: "11px", marginTop: "2px" }}>
                        + Bullet
                      </button>
                    </div>
                  </div>
                </EntryCard>
              ))}
            </SectionBox>

            {/* Education */}
            <SectionBox title="Education" onAdd={addEdu} addLabel="Add Entry">
              {resume.education.map((edu, i) => (
                <EntryCard key={edu.id} label={`Entry ${i + 1}`} onRemove={() => removeEdu(edu.id)} canRemove={resume.education.length > 1}>
                  <Row>
                    <Col>
                      <Label>Degree</Label>
                      <Input value={edu.degree} onChange={v => updateEdu(edu.id, "degree", v)} placeholder="Bachelor of Science" />
                    </Col>
                    <Col>
                      <Label>Field of Study</Label>
                      <Input value={edu.field} onChange={v => updateEdu(edu.id, "field", v)} placeholder="Computer Science" />
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Label>School / University</Label>
                      <Input value={edu.school} onChange={v => updateEdu(edu.id, "school", v)} placeholder="University of Toronto" />
                    </Col>
                    <Col flex={0.6}>
                      <Label>Location</Label>
                      <Input value={edu.location} onChange={v => updateEdu(edu.id, "location", v)} placeholder="Toronto, ON" />
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Label>Start</Label>
                      <Input value={edu.startDate} onChange={v => updateEdu(edu.id, "startDate", v)} placeholder="Sep 2018" />
                    </Col>
                    <Col>
                      <Label>End / Expected</Label>
                      <Input value={edu.endDate} onChange={v => updateEdu(edu.id, "endDate", v)} placeholder="May 2022" />
                    </Col>
                    <Col flex={0.7}>
                      <Label>GPA (optional)</Label>
                      <Input value={edu.gpa} onChange={v => updateEdu(edu.id, "gpa", v)} placeholder="3.8/4.0" />
                    </Col>
                  </Row>
                </EntryCard>
              ))}
            </SectionBox>

            {/* Skills */}
            <SectionBox title="Skills">
              <div>
                <Label>Skills (comma-separated)</Label>
                <textarea
                  value={resume.skills}
                  onChange={e => setF("skills", e.target.value)}
                  placeholder="Python, TypeScript, React, Node.js, PostgreSQL, AWS, Docker, Git…"
                  className="field"
                  rows={3}
                  style={{ resize: "vertical", fontSize: "12.5px", padding: "9px 11px", width: "100%", boxSizing: "border-box", lineHeight: "1.5" }}
                />
              </div>
              {skillList.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {skillList.map((s, i) => (
                    <span key={i} style={{
                      fontSize: "11px", padding: "3px 9px", borderRadius: "99px",
                      background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)",
                    }}>{s}</span>
                  ))}
                </div>
              )}
            </SectionBox>

            {/* Certifications */}
            <SectionBox title="Certifications" onAdd={addCert} addLabel="Add">
              {resume.certifications.length === 0 && (
                <p style={{ fontSize: "12px", color: "var(--t3)", margin: 0 }}>
                  No certifications added. Click + Add to include AWS, Google, etc.
                </p>
              )}
              {resume.certifications.map((cert, i) => (
                <EntryCard key={cert.id} label={`Cert ${i + 1}`} onRemove={() => removeCert(cert.id)} canRemove>
                  <Row>
                    <Col>
                      <Label>Certification Name</Label>
                      <Input value={cert.name} onChange={v => updateCert(cert.id, "name", v)} placeholder="AWS Solutions Architect" />
                    </Col>
                    <Col flex={0.7}>
                      <Label>Date</Label>
                      <Input value={cert.date} onChange={v => updateCert(cert.id, "date", v)} placeholder="Mar 2024" />
                    </Col>
                  </Row>
                  <div>
                    <Label>Issuer</Label>
                    <Input value={cert.issuer} onChange={v => updateCert(cert.id, "issuer", v)} placeholder="Amazon Web Services" />
                  </div>
                </EntryCard>
              ))}
            </SectionBox>

          </div>

          {/* ── Right: live preview ── */}
          <div style={{ flex: 1, overflowY: "auto", background: "#4b5563", padding: "20px 16px", display: "flex", justifyContent: "center" }}>
            <div
              id="rb-preview"
              style={{
                background: "white", width: "100%", maxWidth: "680px",
                minHeight: "900px", padding: "44px 52px",
                fontFamily: "Calibri, 'Segoe UI', Arial, Helvetica, sans-serif",
                color: "#111", fontSize: "10.5pt", lineHeight: "1.35",
                boxShadow: "0 4px 32px rgba(0,0,0,0.45)",
                boxSizing: "border-box",
              }}
            >
              {/* Empty state */}
              {!hasContent && (
                <div style={{ textAlign: "center", color: "#9ca3af", marginTop: "100px" }}>
                  <div style={{ fontSize: "40px", marginBottom: "14px" }}>📄</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>Your resume will appear here</div>
                  <div style={{ fontSize: "12px" }}>Fill in the form on the left to get started</div>
                </div>
              )}

              {/* Name */}
              {resume.name && (
                <div style={{ textAlign: "center", fontSize: "22pt", fontWeight: "bold", lineHeight: 1.1, marginBottom: "2px", letterSpacing: "0.01em" }}>
                  {resume.name}
                </div>
              )}

              {/* Job title */}
              {resume.jobTitle && (
                <div style={{ textAlign: "center", fontSize: "11pt", color: "#444", fontWeight: "600", marginBottom: "4px" }}>
                  {resume.jobTitle}
                </div>
              )}

              {/* Contact line */}
              {(resume.email || resume.phone || resume.location || resume.linkedin || resume.github || resume.website) && (
                <div style={{ textAlign: "center", fontSize: "8.5pt", color: "#555", marginBottom: "10px", lineHeight: "1.6" }}>
                  {[resume.email, resume.phone, resume.location].filter(Boolean).join("  ·  ")}
                  {(resume.linkedin || resume.github || resume.website) && (
                    <>
                      {(resume.email || resume.phone || resume.location) && "  ·  "}
                      {[resume.linkedin, resume.github, resume.website].filter(Boolean).join("  ·  ")}
                    </>
                  )}
                </div>
              )}

              {resume.name && <PvRule />}

              {/* Summary */}
              {resume.summary && (
                <>
                  <PvSection title="Summary" />
                  <p style={{ fontSize: "9.5pt", lineHeight: "1.45", marginBottom: "10px", color: "#222" }}>
                    {resume.summary}
                  </p>
                </>
              )}

              {/* Skills */}
              {skillList.length > 0 && (
                <>
                  <PvSection title="Skills" />
                  <p style={{ fontSize: "9.5pt", lineHeight: "1.5", marginBottom: "10px", color: "#222" }}>
                    {skillList.join("  ·  ")}
                  </p>
                </>
              )}

              {/* Experience */}
              {hasExp && (
                <>
                  <PvSection title="Experience" />
                  {resume.experiences.filter(e => e.company || e.role).map(exp => {
                    const dates = exp.current
                      ? `${exp.startDate} – Present`
                      : [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
                    return (
                      <div key={exp.id} style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <div>
                            <span style={{ fontWeight: "bold", fontSize: "10.5pt" }}>{exp.role}</span>
                            {exp.role && exp.company && <span style={{ color: "#888", fontSize: "9.5pt" }}> · </span>}
                            <span style={{ fontSize: "10pt", fontWeight: "600" }}>{exp.company}</span>
                            {exp.location && <span style={{ color: "#888", fontSize: "9pt" }}> · {exp.location}</span>}
                          </div>
                          {dates && <span style={{ fontSize: "8.5pt", color: "#555", flexShrink: 0, marginLeft: "8px" }}>{dates}</span>}
                        </div>
                        {exp.bullets.filter(b => b.trim()).length > 0 && (
                          <ul style={{ margin: "3px 0 0 0", paddingLeft: "14px" }}>
                            {exp.bullets.filter(b => b.trim()).map((b, j) => (
                              <li key={j} style={{ fontSize: "9.5pt", lineHeight: "1.4", marginBottom: "2px", color: "#222" }}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Projects */}
              {hasProj && (
                <>
                  <PvSection title="Projects" />
                  {resume.projects.filter(p => p.name).map(proj => (
                    <div key={proj.id} style={{ marginBottom: "9px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div>
                          <span style={{ fontWeight: "bold", fontSize: "10.5pt" }}>{proj.name}</span>
                          {proj.tech && <span style={{ color: "#555", fontSize: "9pt" }}> · {proj.tech}</span>}
                        </div>
                        {proj.link && (
                          <span style={{ fontSize: "8.5pt", color: "#555", flexShrink: 0, marginLeft: "8px" }}>{proj.link}</span>
                        )}
                      </div>
                      {proj.bullets.filter(b => b.trim()).length > 0 && (
                        <ul style={{ margin: "3px 0 0 0", paddingLeft: "14px" }}>
                          {proj.bullets.filter(b => b.trim()).map((b, j) => (
                            <li key={j} style={{ fontSize: "9.5pt", lineHeight: "1.4", marginBottom: "2px", color: "#222" }}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Education */}
              {hasEdu && (
                <>
                  <PvSection title="Education" />
                  {resume.education.filter(e => e.school || e.degree).map(edu => {
                    const degreeStr = [edu.degree, edu.field].filter(Boolean).join(" in ");
                    const dateStr = [edu.startDate, edu.endDate].filter(Boolean).join(" – ");
                    return (
                      <div key={edu.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                        <div>
                          <span style={{ fontWeight: "bold", fontSize: "10pt" }}>{degreeStr}</span>
                          {degreeStr && edu.school && <span style={{ color: "#888", fontSize: "9pt" }}> · </span>}
                          <span style={{ fontSize: "9.5pt" }}>{edu.school}</span>
                          {edu.location && <span style={{ color: "#888", fontSize: "9pt" }}> · {edu.location}</span>}
                          {edu.gpa && <span style={{ color: "#555", fontSize: "9pt" }}> · GPA: {edu.gpa}</span>}
                        </div>
                        {dateStr && <span style={{ fontSize: "8.5pt", color: "#555", flexShrink: 0, marginLeft: "8px" }}>{dateStr}</span>}
                      </div>
                    );
                  })}
                </>
              )}

              {/* Certifications */}
              {hasCert && (
                <>
                  <PvSection title="Certifications" />
                  {resume.certifications.filter(c => c.name).map(cert => (
                    <div key={cert.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "5px" }}>
                      <div>
                        <span style={{ fontWeight: "bold", fontSize: "10pt" }}>{cert.name}</span>
                        {cert.issuer && <span style={{ color: "#555", fontSize: "9pt" }}> · {cert.issuer}</span>}
                      </div>
                      {cert.date && <span style={{ fontSize: "8.5pt", color: "#555", flexShrink: 0, marginLeft: "8px" }}>{cert.date}</span>}
                    </div>
                  ))}
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
