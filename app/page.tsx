"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import TrackerView from "./tracker/TrackerView";

// â”€â”€ types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Step = "home" | "build" | "input" | "score" | "tailor" | "tracker";

interface FieldCheck {
  field: string;
  status: "pass" | "warn" | "fail";
  message: string;
  suggestion?: string;
}

interface FieldSuggestion {
  field: string;
  priority: "high" | "medium" | "low";
  reason: string;
  example: string;
}

interface ScoreResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  totalKeywords: number;
  fieldChecks: FieldCheck[];
  fieldSuggestions: FieldSuggestion[];
  breakdown: { keywordMatch: number; formatting: number; content: number; sections: number };
}

interface Folder { id: string; name: string; created_at: string }
interface SavedResume {
  id: string; folder_id: string; label: string;
  resume_text: string | null; job_description: string | null;
  ats_score: number | null; score_data: unknown; tailored_text: string | null;
  created_at: string;
}

interface KeywordSuggestion { keyword: string; whereTo: string; how: string }
interface BulletFeedback { original: string; issue: string; tip: string; swapVerb: string; corrected: string }
interface TailorResult {
  keywordSuggestions: KeywordSuggestion[];
  bulletFeedback: BulletFeedback[];
  powerVerbs: string[];
  summaryTip: string;
  scoreBefore: number;
  scorePotential: number;
}
interface CoverLetterResult { coverLetter: string; hrMessage: string }

interface ResumeEntry {
  title: string; organization: string; location: string;
  dates: string; bullets: string[]; inline: string;
}
interface ResumeSection { title: string; entries: ResumeEntry[] }
interface FullResume {
  name: string; contact: string; github: string;
  summary: string; sections: ResumeSection[];
}

// â”€â”€ pdf helper (client-side) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pages.push(content.items.map((item: any) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n").trim();
}

// â”€â”€ Parse tailor output into structured replacements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parseTailorOutput(tailored: string): { summary: string; replacements: Array<{ original: string; rewritten: string }> } {
  const summaryMatch = tailored.match(/##\s*TAILORED SUMMARY\s*\n([\s\S]*?)(?=\n##|$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : "";

  const bulletsMatch = tailored.match(/##\s*REWRITTEN BULLETS\s*\n([\s\S]*?)(?=\n##|$)/i);
  const bulletsText = bulletsMatch ? bulletsMatch[1] : "";

  const replacements: Array<{ original: string; rewritten: string }> = [];
  const regex = /\*\*ORIGINAL:\*\*\s*([\s\S]*?)\s*\*\*REWRITTEN:\*\*\s*([\s\S]*?)(?=\*\*ORIGINAL:|$)/g;
  let match;
  while ((match = regex.exec(bulletsText)) !== null) {
    const original = match[1].trim();
    const rewritten = match[2].trim();
    if (original && rewritten && original !== rewritten) {
      replacements.push({ original, rewritten });
    }
  }
  return { summary, replacements };
}

// â”€â”€ Resume PDF Preview (matches Pranay's resume style) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResumePdfPreview({ data, onClose }: { data: FullResume; onClose: () => void }) {
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    // Dynamically scale down to fit A4 height (297mm â‰ˆ 1122px at 96dpi)
    const a4Height = 1056;
    el.style.zoom = "1";
    if (el.scrollHeight > a4Height) {
      const scale = Math.max(a4Height / el.scrollHeight, 0.65);
      el.style.zoom = String(scale);
    }
  }, [data]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-950 border-b border-gray-800 print:hidden">
        <span className="text-white font-semibold text-sm">Resume Preview â€” print or Save as PDF</span>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg"
          >
            â¬‡ Download / Print PDF
          </button>
          <button onClick={onClose} className="px-4 py-1.5 border border-gray-700 text-gray-300 text-sm rounded-lg hover:border-gray-500">
            Close
          </button>
        </div>
      </div>

      {/* scrollable page area */}
      <div className="flex-1 overflow-y-auto bg-gray-700 flex justify-center py-8 print:p-0 print:bg-white print:block">
        <div
          id="resume-print-area"
          ref={areaRef}
          style={{
            width: "794px",
            background: "white",
            padding: "36px 52px",
            fontFamily: "Calibri, 'Segoe UI', Arial, Helvetica, sans-serif",
            fontSize: "10.5pt",
            color: "#000",
            lineHeight: "1.35",
            boxSizing: "border-box",
            zoom: "0.9",
          }}
        >
          {/* Name */}
          <div style={{ textAlign: "center", marginBottom: "2px" }}>
            <div style={{ fontSize: "20pt", fontWeight: "bold", lineHeight: "1.15", letterSpacing: "0.01em" }}>{data.name}</div>
          </div>

          {/* Contact â€” force black, no link styling */}
          <div style={{ textAlign: "center", fontSize: "9.5pt", color: "#000", marginBottom: "1px", textDecoration: "none" }}>
            <span style={{ color: "#000" }}>{data.contact}</span>
          </div>
          {data.github && (
            <div style={{ textAlign: "center", fontSize: "9.5pt", color: "#000", marginBottom: "6px" }}>
              <span style={{ color: "#000" }}>{data.github}</span>
            </div>
          )}

          {/* Summary */}
          {data.summary && (
            <div style={{ marginBottom: "6px", fontSize: "9.5pt", lineHeight: "1.3" }}>{data.summary}</div>
          )}

          {/* Sections */}
          {data.sections.map((section) => (
            <div key={section.title} style={{ marginBottom: "5px" }}>
              {/* Section header */}
              <div style={{
                fontWeight: "bold",
                fontSize: "10pt",
                textTransform: "uppercase",
                borderBottom: "1.2px solid #000",
                paddingBottom: "0px",
                marginBottom: "3px",
                letterSpacing: "0.02em",
              }}>
                {section.title}
              </div>

              {/* Entries */}
              {section.entries.map((entry, i) => (
                <div key={i} style={{ marginBottom: "4px" }}>
                  {/* Inline (skills / certs) */}
                  {entry.inline ? (
                    <div style={{ fontSize: "9.5pt", lineHeight: "1.3" }}
                      dangerouslySetInnerHTML={{ __html: entry.inline.replace(/^([\w\s\/&]+):/g, "<strong>$1:</strong>") }}
                    />
                  ) : (
                    <>
                      {/* Title row */}
                      {(entry.title || entry.dates) && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "10pt" }}>
                          <span>{entry.title}</span>
                          <span>{entry.dates}</span>
                        </div>
                      )}
                      {/* Org row */}
                      {(entry.organization || entry.location) && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "9.5pt", color: "#111" }}>
                          <span>{entry.organization}</span>
                          <span>{entry.location}</span>
                        </div>
                      )}
                      {/* Bullets */}
                      {entry.bullets.length > 0 && (
                        <ul style={{ margin: "1px 0 0 0", paddingLeft: "16px" }}>
                          {entry.bullets.map((b, j) => (
                            <li key={j} style={{ marginBottom: "0px", fontSize: "9.5pt", lineHeight: "1.3" }}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #resume-print-area, #resume-print-area * { visibility: visible; }
          #resume-print-area {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 794px !important;
            padding: 36px 52px !important;
            margin: 0 !important;
            box-shadow: none !important;
            zoom: 0.9 !important;
          }
          a { color: #000 !important; text-decoration: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}

// â”€â”€ small UI components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const label = score >= 70 ? "Strong" : score >= 50 ? "Moderate" : "Weak";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="46" fill="none" stroke="#1f2937" strokeWidth="11" />
        <circle cx="55" cy="55" r="46" fill="none" stroke={color} strokeWidth="11"
          strokeDasharray={`${(score / 100) * 289} 289`} strokeLinecap="round"
          transform="rotate(-90 55 55)" />
        <text x="55" y="51" textAnchor="middle" fill="white" fontSize="21" fontWeight="bold">{score}</text>
        <text x="55" y="66" textAnchor="middle" fill="#9ca3af" fontSize="10">/100</text>
      </svg>
      <span style={{ color }} className="text-xs font-semibold">{label} Match</span>
    </div>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-green-500" : value >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span><span className="font-mono">{value}%</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Chip({ text, variant }: { text: string; variant: "green" | "red" }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono border
      ${variant === "green" ? "bg-green-900/40 text-green-300 border-green-800" : "bg-red-900/40 text-red-300 border-red-800"}`}>
      {text}
    </span>
  );
}

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <span className="text-green-400 text-sm">âœ“</span>;
  if (status === "warn") return <span className="text-yellow-400 text-sm">âš </span>;
  return <span className="text-red-400 text-sm">âœ—</span>;
}

const FLOW_STEPS: { id: Step; label: string; icon: string; desc: string }[] = [
  { id: "build", label: "Build Resume", icon: "âœ¦", desc: "AI writes your resume" },
  { id: "input", label: "Upload & Check", icon: "â†‘", desc: "Parse your PDF" },
  { id: "score", label: "ATS Score", icon: "â—Ž", desc: "Keyword analysis" },
  { id: "tailor", label: "AI Coach", icon: "âš¡", desc: "Suggestions & letters" },
];

// â”€â”€ main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Home() {
  const [step, setStep] = useState<Step>("home");
  const [tailorTab, setTailorTab] = useState<"coach" | "cover" | "hr">("coach");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [tailored, setTailored] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [generatedResume, setGeneratedResume] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // tailor result (structured suggestions)
  const [tailorResult, setTailorResult] = useState<TailorResult | null>(null);

  // cover letter + hr message
  const [coverResult, setCoverResult] = useState<CoverLetterResult | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverName, setCoverName] = useState("");
  const [coverCompany, setCoverCompany] = useState("");
  const [coverRole, setCoverRole] = useState("");
  const [copiedCover, setCopiedCover] = useState(false);
  const [copiedHr, setCopiedHr] = useState(false);

  // pdf preview (original only)
  const [fullResume, setFullResume] = useState<FullResume | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderResumes, setFolderResumes] = useState<SavedResume[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFolderId, setSaveFolderId] = useState("");
  const [saving, setSaving] = useState(false);

  // build form
  const [form, setForm] = useState({
    name: "", email: "", phone: "", linkedin: "",
    jobTitle: "", jobDescription: "",
    experiences: "", education: "", skills: "", summary: "",
  });
  function setF(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  // â”€â”€ data fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) setFolders(await res.json());
      else console.error("Failed to load folders:", await res.text());
    } catch (e) { console.error("Failed to load folders:", e); }
  }, []);

  const loadFolderResumes = useCallback(async (folderId: string) => {
    try {
      const res = await fetch(`/api/resumes?folder_id=${folderId}`);
      if (res.ok) setFolderResumes(await res.json());
      else console.error("Failed to load resumes:", await res.text());
    } catch (e) { console.error("Failed to load resumes:", e); }
  }, []);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => {
    if (selectedFolder) loadFolderResumes(selectedFolder);
    else setFolderResumes([]);
  }, [selectedFolder, loadFolderResumes]);

  // â”€â”€ actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      if (res.ok) {
        const folder = await res.json();
        setFolders((f) => [...f, folder]);
        setSelectedFolder(folder.id);
        setNewFolderName("");
        setShowNewFolder(false);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create folder.");
      }
    } catch { setError("Failed to create folder â€” check your connection."); }
  }

  async function handleSave() {
    if (!saveFolderId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder_id: saveFolderId,
          label: saveLabel || "Untitled",
          resume_text: resumeText,
          job_description: jobDescription,
          ats_score: scoreResult?.score ?? null,
          score_data: scoreResult ?? null,
          tailored_text: tailorResult ? JSON.stringify(tailorResult) : (tailored || null),
        }),
      });
      if (res.ok) {
        setShowSaveModal(false);
        setSaveLabel("");
        if (selectedFolder === saveFolderId) loadFolderResumes(saveFolderId);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save resume.");
      }
    } catch { setError("Failed to save resume â€” check your connection."); }
    setSaving(false);
  }

  async function handleDeleteResume(id: string) {
    try {
      await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      setFolderResumes((r) => r.filter((x) => x.id !== id));
    } catch { setError("Failed to delete resume."); }
  }

  function loadResume(r: SavedResume) {
    setResumeText(r.resume_text || "");
    setJobDescription(r.job_description || "");
    if (r.score_data) setScoreResult(r.score_data as ScoreResult);
    if (r.tailored_text) {
      try {
        const parsed = JSON.parse(r.tailored_text);
        if (parsed?.keywordSuggestions) { setTailorResult(parsed); }
        else { setTailored(r.tailored_text); }
      } catch { setTailored(r.tailored_text); }
    }
    setStep(r.tailored_text ? "tailor" : r.score_data ? "score" : "input");
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    setError("");
    try {
      // Parse tailor output into structured replacements â€” no free-text AI interpretation
      const { summary: newSummary, replacements } = parseTailorOutput(tailored);
      const res = await fetch("/api/full-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, newSummary, replacements }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFullResume(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate PDF preview.");
    }
    setPdfLoading(false);
  }

  async function handleBuildResume() {
    if (!form.name || !form.email || !form.experiences) {
      setError("Name, email, and work experience are required.");
      return;
    }
    setLoading(true); setLoadingMsg("Generating your ATS-optimized resume..."); setError("");
    try {
      const res = await fetch("/api/build-resume", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedResume(data.resume);
      setResumeText(data.resume);
    } catch (e) { setError(e instanceof Error ? e.message : "Build failed."); }
    finally { setLoading(false); }
  }

  async function handlePdfUpload(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Only PDF files supported."); return; }
    setLoading(true); setLoadingMsg("Parsing PDF in your browser..."); setError(""); setPdfFileName(file.name);
    try {
      const text = await extractTextFromPdf(file);
      if (!text) throw new Error("No text found. Use a text-based PDF, not a scanned image.");
      setResumeText(text);
    } catch (e) { setError(e instanceof Error ? e.message : "PDF parsing failed."); setPdfFileName(""); }
    finally { setLoading(false); }
  }

  async function handleScore() {
    if (!resumeText.trim() || !jobDescription.trim()) { setError("Need both resume and job description."); return; }
    setLoading(true); setLoadingMsg("Running ATS analysis..."); setError("");
    try {
      const res = await fetch("/api/score", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScoreResult(data); setStep("score");
    } catch (e) { setError(e instanceof Error ? e.message : "Scoring failed."); }
    finally { setLoading(false); }
  }

  async function handleTailor() {
    setLoading(true); setLoadingMsg("Analysing your resume..."); setError(""); setTailorResult(null);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, missingKeywords: scoreResult?.missingKeywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (typeof data !== "object" || !data.keywordSuggestions) throw new Error("AI returned an unexpected response. Please try again.");
      setTailorResult(data); setStep("tailor");
    } catch (e) { setError(e instanceof Error ? e.message : "AI coaching failed."); }
    finally { setLoading(false); }
  }

  async function handleCoverLetter() {
    setCoverLoading(true); setCoverResult(null);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, name: coverName, company: coverCompany, role: coverRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoverResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Cover letter generation failed."); }
    finally { setCoverLoading(false); }
  }

  function copyText(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setStep("home"); setResumeText(""); setJobDescription(""); setScoreResult(null);
    setTailored(""); setTailorResult(null); setCoverResult(null); setError(""); setPdfFileName(""); setGeneratedResume(""); setFullResume(null);
    setTailorTab("coach");
    setForm({ name:"",email:"",phone:"",linkedin:"",jobTitle:"",jobDescription:"",experiences:"",education:"",skills:"",summary:"" });
  }

  const flowStepIdx = FLOW_STEPS.findIndex((s) => s.id === step);
  const canSave = !!resumeText;

  // Show PDF preview overlay
  if (fullResume) {
    return <ResumePdfPreview data={fullResume} onClose={() => setFullResume(null)} />;
  }

  const scoreColor = (s: number) => s >= 70 ? "#22c55e" : s >= 50 ? "#eab308" : "#ef4444";

  return (
    <div className="min-h-screen flex" style={{ background: "#070711" }}>

      {/* â”€â”€ Sidebar â”€â”€ */}
      <aside
        className="flex-shrink-0 flex flex-col overflow-hidden border-r transition-all duration-300"
        style={{
          width: sidebarOpen ? "240px" : "0px",
          background: "#0c0c1a",
          borderColor: "rgba(255,255,255,0.06)",
          minWidth: sidebarOpen ? "240px" : "0px",
        }}
      >
        {sidebarOpen && (
          <>
            {/* Sidebar logo */}
            <div className="px-4 py-4 border-b flex items-center gap-2.5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>R</div>
              <span className="text-white font-semibold text-sm">ResumeAI</span>
            </div>

            {/* New application */}
            <div className="px-3 py-3">
              <button onClick={reset}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                <span className="text-base">+</span> New Application
              </button>
            </div>

            {/* Folders */}
            <div className="px-3 pb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Applications</span>
              <button onClick={() => setShowNewFolder(true)}
                className="text-xs px-2 py-0.5 rounded-md transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }}>+ Folder</button>
            </div>

            {showNewFolder && (
              <div className="mx-3 mb-2 flex gap-1">
                <input autoFocus value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                  placeholder="Folder name..."
                  className="flex-1 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(99,102,241,0.5)" }} />
                <button onClick={handleCreateFolder} className="text-indigo-400 text-sm px-1.5 hover:text-indigo-300">âœ“</button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-4">
              {folders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>No folders yet.</p>
                  <button onClick={() => setShowNewFolder(true)} className="text-xs text-indigo-400 hover:text-indigo-300">Create your first folder â†’</button>
                </div>
              ) : (
                folders.map((folder) => (
                  <div key={folder.id}>
                    <button
                      onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors"
                      style={{
                        color: selectedFolder === folder.id ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                        background: selectedFolder === folder.id ? "rgba(99,102,241,0.12)" : "transparent",
                      }}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span style={{ opacity: 0.6 }}>â–¤</span>
                        <span className="truncate font-medium">{folder.name}</span>
                      </span>
                      <span style={{ opacity: 0.4, fontSize: "10px" }}>{selectedFolder === folder.id ? "â–¾" : "â–¸"}</span>
                    </button>

                    {selectedFolder === folder.id && (
                      <div className="ml-3 mt-0.5 space-y-0.5">
                        {folderResumes.length === 0 ? (
                          <p className="px-3 py-2 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>No saved resumes</p>
                        ) : (
                          folderResumes.map((r) => (
                            <div key={r.id} className="flex items-center gap-1 group rounded-lg overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.02)" }}>
                              <button onClick={() => loadResume(r)} className="flex-1 text-left px-3 py-2 min-w-0">
                                <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{r.label}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {r.ats_score != null && (
                                    <span className="text-xs font-bold" style={{ color: scoreColor(r.ats_score) }}>{r.ats_score}</span>
                                  )}
                                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                                    {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                </div>
                              </button>
                              <button onClick={() => handleDeleteResume(r.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 text-xs px-2 py-2 transition-opacity">âœ•</button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Sidebar footer */}
            {/* Sidebar footer */}
            <div className="px-3 pb-4 pt-2 border-t space-y-0.5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <button onClick={() => setStep("home")}
                className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 hover:text-white"
                style={{ color: step === "home" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)" }}>
                <span>&#8962;</span> Dashboard
              </button>
              <button onClick={() => setStep("tracker")}
                className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 hover:text-white"
                style={{ color: step === "tracker" ? "#4ade80" : "rgba(255,255,255,0.35)" }}>
                <span>&#9645;</span> Tracker
              </button>
            </div>
          </>
        )}
      </aside>

      {/* â”€â”€ Main area â”€â”€ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* â”€â”€ Header â”€â”€ */}
        <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b"
          style={{ background: "rgba(7,7,17,0.8)", borderColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen((o) => !o)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:text-white"
              style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)" }}>
              â˜°
            </button>
            {step !== "home" && step !== "tracker" && (
              <div className="flex items-center gap-1">
                {FLOW_STEPS.map((s, i) => {
                  const isActive = step === s.id;
                  const isDone = flowStepIdx > i;
                  return (
                    <div key={s.id} className="flex items-center gap-1">
                      <button
                        onClick={() => { if (isDone || isActive) setStep(s.id); }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: isActive ? "rgba(99,102,241,0.2)" : isDone ? "rgba(255,255,255,0.04)" : "transparent",
                          color: isActive ? "#a5b4fc" : isDone ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
                          border: isActive ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
                          cursor: (isDone || isActive) ? "pointer" : "default",
                        }}
                      >
                        <span style={{ fontSize: "10px" }}>{isDone ? "âœ“" : s.icon}</span>
                        <span className="hidden sm:block">{s.label}</span>
                      </button>
                      {i < FLOW_STEPS.length - 1 && (
                        <div className="w-4 h-px" style={{ background: isDone ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canSave && step !== "home" && step !== "tracker" && (
              <button onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                â†“ Save
              </button>
            )}
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>P</div>
          </div>
        </header>

        {/* â”€â”€ Loading overlay â”€â”€ */}
        {loading && (
          <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(7,7,17,0.85)", backdropFilter: "blur(8px)" }}>
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="animate-spin w-16 h-16" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke="url(#spin-grad)" strokeWidth="4"
                    strokeDasharray="60 116" strokeLinecap="round" transform="rotate(-90 32 32)" />
                  <defs>
                    <linearGradient id="spin-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg">âš¡</div>
              </div>
              <p className="text-white font-medium text-sm">{loadingMsg}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>This takes a few seconds</p>
            </div>
          </div>
        )}

        {/* â”€â”€ Error banner â”€â”€ */}
        {error && (
          <div className="mx-4 mt-4 p-3 rounded-xl flex gap-3 items-start"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <span className="text-red-400 text-sm flex-shrink-0">âœ—</span>
            <span className="text-red-300 text-sm">{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-300 text-xs">âœ•</button>
          </div>
        )}

        {/* â”€â”€ Page content â”€â”€ */}
        <main className="flex-1 overflow-y-auto">

          {/* â”€â”€ HOME DASHBOARD â”€â”€ */}
          {step === "home" && (
            <div className="max-w-5xl mx-auto px-5 py-8 space-y-8">
              {/* Hero */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold"
                  style={{ background: "linear-gradient(135deg,#e2e8f0,#a5b4fc,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Your AI Resume Command Center
                </h1>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Build Â· Score Â· Tailor Â· Cover Letter â€” everything in one place.
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Folders Created", value: folders.length, icon: "â–¤", color: "#6366f1" },
                  { label: "Saved Applications", value: folderResumes.length, icon: "â—Ž", color: "#a855f7" },
                  { label: "AI Features", value: 4, icon: "âš¡", color: "#22c55e" },
                  { label: "ATS Accuracy", value: "98%", icon: "âœ¦", color: "#eab308" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl p-5 space-y-3"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                      style={{ background: `${stat.color}18`, color: stat.color }}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Start CTA + Tracker */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl p-6 flex flex-col justify-between gap-4"
                  style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(168,85,247,0.1))", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <div>
                    <h2 className="text-lg font-bold text-white">Start a new application</h2>
                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                      Upload your resume, get ATS scored, AI coached, and generate a cover letter.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep("input")}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                      Upload Resume &rarr;
                    </button>
                    <button onClick={() => setStep("build")}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                      Build
                    </button>
                  </div>
                </div>

                <button onClick={() => setStep("tracker")}
                  className="rounded-2xl p-6 text-left flex flex-col justify-between gap-4 transition-all hover:scale-[1.02] group"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      &#x2B21;
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}>New</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white group-hover:text-green-300 transition-colors">Application Tracker</h2>
                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Kanban board — Wishlist to Offer. Drag cards between stages, track salaries, add notes.
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {["Wishlist","Applied","Interview","Offer"].map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>{s}</span>
                    ))}
                  </div>
                </button>
              </div>
              {/* Process steps */}
              <div>
                <h3 className="text-sm font-semibold mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>HOW IT WORKS</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {FLOW_STEPS.map((s, i) => (
                    <button key={s.id} onClick={() => setStep(s.id)}
                      className="text-left rounded-2xl p-4 space-y-3 transition-all hover:scale-[1.02] group"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>{s.icon}</div>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>0{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">{s.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent activity */}
              {folders.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>RECENT FOLDERS</h3>
                    <button onClick={() => setShowNewFolder(true)} className="text-xs text-indigo-400 hover:text-indigo-300">+ New folder</button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {folders.slice(0, 4).map((folder) => (
                      <button key={folder.id}
                        onClick={() => { setSelectedFolder(folder.id); setSidebarOpen(true); }}
                        className="text-left rounded-2xl p-4 flex items-center gap-4 transition-all hover:scale-[1.01]"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: "rgba(99,102,241,0.1)" }}>â–¤</div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{folder.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {new Date(folder.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                        <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>â†’</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


          {/* -- TRACKER STEP -- */}
          {step === "tracker" && (
            <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
              <TrackerView onBack={() => setStep("home")} />
            </div>
          )}

          {/* â”€â”€ Wrapper for flow steps â”€â”€ */}
          {step !== "home" && step !== "tracker" && (
            <div className="max-w-4xl mx-auto px-5 py-8 space-y-6">{/* â”€â”€ STEP 1: BUILD â”€â”€ */}
              {step === "build" && (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Build Your Resume</h2>
                      <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Fill in your details â€” AI writes a fully ATS-optimized resume.</p>
                    </div>
                    <button onClick={() => setStep("home")} className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>â† Home</button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <h3 className="text-sm font-semibold text-white">Contact Info</h3>
                        {[
                          { key: "name", label: "Full Name *", ph: "Jane Smith" },
                          { key: "email", label: "Email *", ph: "jane@email.com" },
                          { key: "phone", label: "Phone", ph: "+1 (555) 123-4567" },
                          { key: "linkedin", label: "LinkedIn URL", ph: "linkedin.com/in/janesmith" },
                        ].map(({ key, label, ph }) => (
                          <div key={key}>
                            <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</label>
                            <input value={form[key as keyof typeof form]} onChange={setF(key as keyof typeof form)}
                              placeholder={ph}
                              className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none transition-colors"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                              onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                          </div>
                        ))}
                      </div>

                      <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <h3 className="text-sm font-semibold text-white">Target Role</h3>
                        <div>
                          <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Job Title</label>
                          <input value={form.jobTitle} onChange={setF("jobTitle")} placeholder="Senior Software Engineer"
                            className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                        </div>
                        <div>
                          <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Job Description</label>
                          <textarea value={form.jobDescription} onChange={setF("jobDescription")}
                            placeholder="Paste the job description here..." rows={4}
                            className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                        </div>
                      </div>

                      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Education</label>
                        <textarea value={form.education} onChange={setF("education")}
                          placeholder={"B.Sc. Computer Science | University of Toronto | 2021"} rows={2}
                          className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                          onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Work Experience * <span style={{ color: "rgba(255,255,255,0.2)" }}>(roles, dates, what you did)</span></label>
                        <textarea value={form.experiences} onChange={setF("experiences")}
                          placeholder={"Software Engineer | Acme Corp | Jan 2022 â€“ Mar 2024\n- Built REST APIs handling 50k daily requests\n- Led migration to TypeScript, reduced bugs by 30%"}
                          rows={12}
                          className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none font-mono"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                          onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                      </div>

                      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Skills <span style={{ color: "rgba(255,255,255,0.2)" }}>(comma-separated)</span></label>
                        <textarea value={form.skills} onChange={setF("skills")}
                          placeholder="Python, TypeScript, React, PostgreSQL, AWS, Docker" rows={2}
                          className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                          onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                      </div>

                      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Additional Notes</label>
                        <textarea value={form.summary} onChange={setF("summary")}
                          placeholder="Any highlights or tone you want..." rows={3}
                          className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                          onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handleBuildResume} disabled={loading}
                      className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                      {loading ? "Generating..." : "Generate My Resume â†’"}
                    </button>
                    <button onClick={() => setStep("input")}
                      className="px-5 py-3 rounded-xl text-sm transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                      Skip â†’ Upload existing
                    </button>
                  </div>

                  {generatedResume && (
                    <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(34,197,94,0.25)" }}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-green-400">âœ“ Resume Generated</h3>
                        <button onClick={() => { setResumeText(generatedResume); setStep("input"); }}
                          className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
                          style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                          Use this â†’ Check ATS
                        </button>
                      </div>
                      <div className="rounded-xl p-4 max-h-64 overflow-y-auto" style={{ background: "rgba(0,0,0,0.3)" }}>
                        <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{generatedResume}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* â”€â”€ STEP 2: UPLOAD â”€â”€ */}
              {step === "input" && (
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Upload & Check</h2>
                      <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Upload your resume and paste the job description.</p>
                    </div>
                    <button onClick={() => setStep("home")} className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>â† Home</button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white">Your Resume</h3>
                      <div
                        className="rounded-2xl p-8 text-center cursor-pointer transition-all group"
                        style={{ background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255,255,255,0.1)" }}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
                        onDragLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                        onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; const f = e.dataTransfer.files[0]; if (f) handlePdfUpload(f); }}
                        onClick={() => fileRef.current?.click()}
                      >
                        {pdfFileName ? (
                          <>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3"
                              style={{ background: "rgba(34,197,94,0.1)" }}>âœ“</div>
                            <p className="text-sm font-medium text-green-400">{pdfFileName}</p>
                            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Click to replace</p>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3"
                              style={{ background: "rgba(99,102,241,0.1)", color: "#a5b4fc" }}>â†‘</div>
                            <p className="text-sm font-medium text-white">Drop PDF here or click to browse</p>
                            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Text-based PDFs only</p>
                          </>
                        )}
                        <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>or paste text below</span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                      </div>
                      <textarea value={resumeText} onChange={(e) => { setResumeText(e.target.value); setPdfFileName(""); }}
                        placeholder="Paste your resume text here..."
                        rows={12}
                        className="w-full rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none font-mono leading-relaxed"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                        onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.4)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.06)"} />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white">Job Description</h3>
                      <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                        placeholder={"Paste the full job description here..."}
                        rows={22}
                        className="w-full rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none leading-relaxed"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
                        onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.4)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.06)"} />
                    </div>
                  </div>

                  <button onClick={handleScore} disabled={loading || !resumeText.trim() || !jobDescription.trim()}
                    className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                    {loading ? "Analysing..." : "Run ATS Analysis â†’"}
                  </button>
                </div>
              )}

              {/* â”€â”€ STEP 3: SCORE â”€â”€ */}
              {step === "score" && scoreResult && (
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">ATS Analysis</h2>
                      <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Full field-by-field breakdown of your resume.</p>
                    </div>
                    <button onClick={reset} className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>â† Home</button>
                  </div>

                  {/* Score hero */}
                  <div className="rounded-2xl p-6 flex gap-8 items-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <ScoreRing score={scoreResult.score} />
                    <div className="flex-1 space-y-3">
                      <h3 className="text-sm font-semibold text-white">Score Breakdown</h3>
                      <MiniBar label="Keyword Match (45%)" value={scoreResult.breakdown.keywordMatch} />
                      <MiniBar label="Sections & Contact (25%)" value={scoreResult.breakdown.sections} />
                      <MiniBar label="Content Quality (20%)" value={scoreResult.breakdown.content} />
                      <MiniBar label="ATS Formatting (10%)" value={scoreResult.breakdown.formatting} />
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Keywords matched</p>
                      <p className="text-3xl font-bold text-white">{scoreResult.matchedKeywords.length}<span className="text-lg font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>/{scoreResult.totalKeywords}</span></p>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <h3 className="text-sm font-semibold text-red-400">Missing Keywords</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {scoreResult.missingKeywords.length > 0
                          ? scoreResult.missingKeywords.map((kw) => <Chip key={kw} text={kw} variant="red" />)
                          : <p className="text-green-400 text-sm">No major missing keywords!</p>}
                      </div>
                    </div>
                    <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <h3 className="text-sm font-semibold text-green-400">Matched Keywords</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {scoreResult.matchedKeywords.slice(0, 25).map((kw) => <Chip key={kw} text={kw} variant="green" />)}
                      </div>
                    </div>
                  </div>

                  {/* Field checks */}
                  {[
                    { title: "Contact Information", icon: "â—‰", keys: ["Email Address", "Phone Number", "LinkedIn URL", "GitHub / Portfolio URL", "Location"] },
                    { title: "Resume Sections", icon: "â–¤", keys: ["Professional Summary", "Summary Length", "Work Experience", "Education", "Skills Section", "Certifications", "Projects", "Employment Dates", "Job Titles"] },
                    { title: "Content Quality", icon: "âœ¦", keys: ["Action Verbs", "Verb Variety", "Quantifiable Achievements", "Weak Language", "Resume Length", "Bullet Points"] },
                    { title: "ATS Formatting", icon: "âš™", keys: ["Table / Column Layout", "Special Characters", "Emoji", "Standard Section Names", "ALL-CAPS Text", "Submission Format"] },
                  ].map(({ title, icon, keys }) => {
                    const checks = scoreResult.fieldChecks.filter((c) => keys.includes(c.field));
                    const passes = checks.filter((c) => c.status === "pass").length;
                    return (
                      <div key={title} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-base" style={{ color: "rgba(255,255,255,0.4)" }}>{icon}</span>
                            <h3 className="text-sm font-semibold text-white">{title}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${(passes / checks.length) * 100}%`, background: passes === checks.length ? "#22c55e" : passes >= checks.length / 2 ? "#eab308" : "#ef4444" }} />
                            </div>
                            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{passes}/{checks.length}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {checks.map((c) => (
                            <div key={c.field} className="flex gap-3">
                              <div className="mt-0.5 w-4 flex-shrink-0"><StatusIcon status={c.status} /></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm text-gray-200 font-medium">{c.field}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full border
                                    ${c.status === "pass" ? "text-green-400 border-green-800/50 bg-green-900/20" :
                                      c.status === "warn" ? "text-yellow-400 border-yellow-800/50 bg-yellow-900/20" :
                                      "text-red-400 border-red-800/50 bg-red-900/20"}`}>{c.status}</span>
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{c.message}</p>
                                {c.suggestion && <p className="text-xs mt-1 text-indigo-400">â†’ {c.suggestion}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Field suggestions */}
                  {scoreResult.fieldSuggestions?.length > 0 && (
                    <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,102,241,0.2)" }}>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Sections to Add for This Role</h3>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>New fields that could significantly boost your score for this specific job.</p>
                      </div>
                      <div className="space-y-3">
                        {scoreResult.fieldSuggestions.map((s, i) => (
                          <div key={i} className="rounded-xl p-4 space-y-1.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white">{s.field}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                ${s.priority === "high" ? "bg-red-900/40 text-red-400 border border-red-800/50" :
                                  s.priority === "medium" ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800/50" :
                                  "bg-gray-800/50 text-gray-400 border border-gray-700/50"}`}>
                                {s.priority}
                              </span>
                            </div>
                            <p className="text-xs text-gray-300">{s.reason}</p>
                            <div className="rounded-lg px-3 py-1.5" style={{ background: "rgba(99,102,241,0.08)" }}>
                              <p className="text-xs text-indigo-300 font-mono">{s.example}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setStep("input")}
                      className="px-5 py-3 rounded-xl text-sm transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                      â† Edit inputs
                    </button>
                    <button onClick={handleTailor} disabled={loading}
                      className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                      {loading ? "Analysing..." : "Get AI Coaching â†’"}
                    </button>
                  </div>
                </div>
              )}

              {/* â”€â”€ STEP 4: TAILOR â”€â”€ */}
              {step === "tailor" && tailorResult && (
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">AI Coach</h2>
                      <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Coaching, cover letter, and HR message â€” all in one place.</p>
                    </div>
                    <button onClick={reset} className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>â† Home</button>
                  </div>

                  {/* Score bar */}
                  <div className="rounded-2xl p-5 flex items-center gap-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Current</p>
                      <p className="text-4xl font-bold text-red-400">{tailorResult.scoreBefore}</p>
                    </div>
                    <div className="flex-1">
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${tailorResult.scorePotential}%`, background: "linear-gradient(90deg,#ef4444,#eab308,#22c55e)" }} />
                      </div>
                      <p className="text-xs mt-1.5 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                        Apply suggestions to reach {tailorResult.scorePotential}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Potential</p>
                      <p className="text-4xl font-bold text-green-400">{tailorResult.scorePotential}</p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                    {([
                      { id: "coach" as const, label: "Coaching Report", icon: "âœ¦" },
                      { id: "cover" as const, label: "Cover Letter", icon: "âœ‰" },
                      { id: "hr" as const, label: "HR Message", icon: "â†—" },
                    ]).map((tab) => (
                      <button key={tab.id} onClick={() => setTailorTab(tab.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: tailorTab === tab.id ? "rgba(99,102,241,0.2)" : "transparent",
                          color: tailorTab === tab.id ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                          border: tailorTab === tab.id ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                        }}>
                        <span style={{ fontSize: "12px" }}>{tab.icon}</span>
                        <span className="hidden sm:block">{tab.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Tab: Coaching */}
                  {tailorTab === "coach" && (
                    <div className="space-y-4">
                      {tailorResult.summaryTip && (
                        <div className="rounded-2xl p-4" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Summary Tip</p>
                          <p className="text-sm text-gray-200">{tailorResult.summaryTip}</p>
                        </div>
                      )}

                      {tailorResult.keywordSuggestions?.length > 0 && (
                        <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <h3 className="text-sm font-semibold text-white">Missing Keywords to Add</h3>
                          <div className="space-y-3">
                            {tailorResult.keywordSuggestions.map((k, i) => (
                              <div key={i} className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full"
                                  style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                                  {k.keyword}
                                </span>
                                <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}><span className="text-gray-300 font-medium">Where:</span> {k.whereTo}</p>
                                <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}><span className="text-gray-300 font-medium">How:</span> {k.how}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {tailorResult.bulletFeedback?.length > 0 && (
                        <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <h3 className="text-sm font-semibold text-white">Bullet Point Feedback</h3>
                          {tailorResult.bulletFeedback.map((b, i) => (
                            <div key={i} className="rounded-xl p-4 space-y-2.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              <p className="text-xs italic line-clamp-2" style={{ color: "rgba(255,255,255,0.3)" }}>"{b.original}"</p>
                              <div className="flex items-start gap-2">
                                <span className="text-xs flex-shrink-0 font-semibold text-red-400">Issue</span>
                                <p className="text-xs text-gray-300">{b.issue}</p>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-xs flex-shrink-0 font-semibold text-green-400">Tip</span>
                                <p className="text-xs text-gray-300">{b.tip}</p>
                              </div>
                              {b.swapVerb && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-yellow-400 flex-shrink-0">Verb</span>
                                  <span className="text-xs font-bold px-2 py-0.5 rounded"
                                    style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)", color: "#fde047" }}>
                                    {b.swapVerb}
                                  </span>
                                </div>
                              )}
                              {b.corrected && (
                                <div className="rounded-lg p-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                                  <p className="text-xs font-semibold text-green-400 mb-1">Suggested rewrite</p>
                                  <p className="text-xs text-green-200 leading-relaxed">{b.corrected}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {tailorResult.powerVerbs?.length > 0 && (
                        <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <h3 className="text-sm font-semibold text-white">Power Verbs for This Role</h3>
                          <div className="flex flex-wrap gap-2">
                            {tailorResult.powerVerbs.map((v, i) => (
                              <span key={i} className="text-sm font-medium px-3 py-1 rounded-full transition-colors cursor-default"
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: Cover Letter */}
                  {tailorTab === "cover" && (
                    <div className="space-y-4">
                      <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div>
                          <h3 className="text-sm font-semibold text-white">Generate Your Cover Letter</h3>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Human-sounding. No AI clichÃ©s. Written around your real experience.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Your Name", val: coverName, set: setCoverName, ph: "Pranay Mulap" },
                            { label: "Company", val: coverCompany, set: setCoverCompany, ph: "Stripe" },
                            { label: "Role", val: coverRole, set: setCoverRole, ph: "Senior Engineer" },
                          ].map(({ label, val, set, ph }) => (
                            <div key={label}>
                              <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</label>
                              <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                                className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                                onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                            </div>
                          ))}
                        </div>
                        <button onClick={handleCoverLetter} disabled={coverLoading}
                          className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                          {coverLoading ? "Writing your cover letter..." : "Generate Cover Letter â†’"}
                        </button>
                      </div>

                      {coverResult && (
                        <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(34,197,94,0.2)" }}>
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">Cover Letter</h3>
                            <button onClick={() => copyText(coverResult.coverLetter, setCopiedCover)}
                              className="text-xs px-3 py-1 rounded-lg transition-all"
                              style={{ background: copiedCover ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)", color: copiedCover ? "#4ade80" : "rgba(255,255,255,0.5)" }}>
                              {copiedCover ? "âœ“ Copied" : "Copy"}
                            </button>
                          </div>
                          <div className="rounded-xl p-4 max-h-80 overflow-y-auto" style={{ background: "rgba(0,0,0,0.25)" }}>
                            <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed">{coverResult.coverLetter}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab: HR Message */}
                  {tailorTab === "hr" && (
                    <div className="space-y-4">
                      <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div>
                          <h3 className="text-sm font-semibold text-white">LinkedIn / HR Follow-up Message</h3>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Catchy. Specific to the company. Built to get a reply, not go to trash.</p>
                        </div>
                        {!coverResult ? (
                          <div className="rounded-xl p-4 text-center space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
                            <p className="text-sm text-gray-400">Generate the cover letter first â€” the HR message uses the same details.</p>
                            <button onClick={() => setTailorTab("cover")} className="text-xs text-indigo-400 hover:text-indigo-300">â†’ Go to Cover Letter tab</button>
                          </div>
                        ) : (
                          <>
                            <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(99,102,241,0.2)" }}>
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-white">HR Follow-up Message</h4>
                                <button onClick={() => copyText(coverResult.hrMessage, setCopiedHr)}
                                  className="text-xs px-3 py-1 rounded-lg transition-all"
                                  style={{ background: copiedHr ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)", color: copiedHr ? "#4ade80" : "rgba(255,255,255,0.5)" }}>
                                  {copiedHr ? "âœ“ Copied" : "Copy"}
                                </button>
                              </div>
                              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Send on LinkedIn after applying. Short, specific, designed to stand out.</p>
                              <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.25)" }}>
                                <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed">{coverResult.hrMessage}</pre>
                              </div>
                            </div>
                            <button onClick={handleCoverLetter} disabled={coverLoading}
                              className="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-40"
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                              {coverLoading ? "Regenerating..." : "â†º Regenerate both"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Save */}
                  <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Save to a Role Folder</h3>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Store this application so you can come back to it later.</p>
                    </div>
                    <div className="flex gap-3">
                      <input value={saveLabel} onChange={(e) => setSaveLabel(e.target.value)}
                        placeholder="e.g. Stripe â€“ Senior Engineer"
                        className="flex-1 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                        onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
                      <button onClick={() => setShowSaveModal(true)} disabled={!saveLabel.trim()}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                        Save â†’
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep("score")}
                      className="px-5 py-3 rounded-xl text-sm transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                      â† Back to score
                    </button>
                    <button onClick={reset}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                      + New application
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* â”€â”€ Save Modal â”€â”€ */}
      {showSaveModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 className="text-lg font-bold text-white">Save Application</h3>

            <div>
              <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Label</label>
              <input value={saveLabel} onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="e.g. Stripe - Senior Engineer"
                className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }} />
            </div>

            <div>
              <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Save to folder</label>
              <select value={saveFolderId} onChange={(e) => setSaveFolderId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <option value="">Select a folder...</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {folders.length === 0 && (
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>No folders yet â€” create one in the sidebar first.</p>
              )}
            </div>

            {scoreResult && (
              <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>ATS Score</span>
                <span className="text-sm font-bold" style={{ color: scoreColor(scoreResult.score) }}>{scoreResult.score}/100</span>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={!saveFolderId || saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

