"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import TrackerView from "./tracker/TrackerView";
import SocialView from "./social/SocialView";
import NewsView from "./news/NewsView";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

// ── types ──────────────────────────────────────────────────────────────────

type Step = "home" | "build" | "input" | "score" | "tailor" | "tracker" | "social" | "news";

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

// ── pdf helper (client-side) ───────────────────────────────────────────────

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

// ── Parse tailor output into structured replacements ──────────────────────

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

// ── Resume PDF Preview (matches Pranay's resume style) ────────────────────

function ResumePdfPreview({ data, onClose }: { data: FullResume; onClose: () => void }) {
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    // Dynamically scale down to fit A4 height (297mm ≈ 1122px at 96dpi)
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
        <span className="text-white font-semibold text-sm">Resume Preview — print or Save as PDF</span>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg"
          >
            ⬇ Download / Print PDF
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

          {/* Contact — force black, no link styling */}
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

// -- SVG icon system ---------------------------------------------------------
/* eslint-disable react/display-name */

const I = {
  home:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  grid:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  folder:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  plus:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chevD:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  chevR:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  pen:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  uploadIc:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  chart:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  sparkle: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/></svg>,
  mail:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  send:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  saveIc:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  copy:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  check:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  xmark:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  trash:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  arrowR:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  menu:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  link:    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  warn:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// -- Micro-components ----------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const r = 52, circ = 2 * Math.PI * r, fill = (score / 100) * circ;
  const col = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"8px" }}>
      <div style={{ position:"relative" }}>
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10"/>
          <circle cx="65" cy="65" r={r} fill="none" stroke={col} strokeWidth="10"
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 65 65)" className="score-circle"
            style={{ filter:`drop-shadow(0 0 8px ${col}80)` }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:"26px", fontWeight:800, color:"#e2e8f0", lineHeight:1 }}>{score}</span>
          <span style={{ fontSize:"11px", color:"var(--t2)", marginTop:"2px" }}>/ 100</span>
        </div>
      </div>
      <span style={{ fontSize:"12px", fontWeight:600, color:col, letterSpacing:"0.03em" }}>
        {score >= 70 ? "Strong" : score >= 50 ? "Moderate" : "Weak"} ATS Match
      </span>
    </div>
  );
}

function MiniBar({ label, value, delay=0 }: { label:string; value:number; delay?:number }) {
  const col = value >= 70 ? "#10b981" : value >= 50 ? "#f59e0b" : "#f43f5e";
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
        <span style={{ fontSize:"12px", color:"var(--t2)" }}>{label}</span>
        <span style={{ fontSize:"12px", fontWeight:600, color:col, fontFamily:"var(--font-geist-mono)" }}>{value}%</span>
      </div>
      <div style={{ height:"5px", background:"rgba(255,255,255,0.05)", borderRadius:"99px", overflow:"hidden" }}>
        <div className="animate-bar" style={{ height:"100%", width:`${value}%`, background:col, borderRadius:"99px", animationDelay:`${delay}ms`, boxShadow:`0 0 6px ${col}60` }}/>
      </div>
    </div>
  );
}

function Chip({ text, variant }: { text:string; variant:"green"|"red" }) {
  return <span className={variant === "green" ? "chip chip-green" : "chip chip-red"}>{text}</span>;
}

function StatusIcon({ status }: { status:"pass"|"warn"|"fail" }) {
  if (status === "pass") return <span style={{ color:"#10b981", display:"flex", alignItems:"center" }}>{I.check}</span>;
  if (status === "warn") return <span style={{ color:"#f59e0b", display:"flex", alignItems:"center" }}>{I.warn}</span>;
  return <span style={{ color:"#f43f5e", display:"flex", alignItems:"center" }}>{I.xmark}</span>;
}

function sc(s: number) { return s >= 70 ? "#10b981" : s >= 50 ? "#f59e0b" : "#f43f5e"; }
function ago(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? `${days}d ago` : days < 30 ? `${Math.floor(days/7)}w ago` : `${Math.floor(days/30)}mo`;
}

const FLOW_STEPS: { id: Step; label: string; icon: React.ReactNode; desc: string }[] = [
  { id:"build",  label:"Build",  icon:I.pen,      desc:"AI writes your resume" },
  { id:"input",  label:"Upload", icon:I.uploadIc, desc:"Parse your PDF" },
  { id:"score",  label:"Score",  icon:I.chart,    desc:"ATS analysis" },
  { id:"tailor", label:"Coach",  icon:I.sparkle,  desc:"AI suggestions" },
];
export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ email: string; name: string; initials: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const email = data.user.email || "";
        const name = data.user.user_metadata?.full_name || email.split("@")[0];
        const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
        setUser({ email, name, initials });
      }
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

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

  // ── data fetching ──────────────────────────────────────────────────────

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

  // ── actions ────────────────────────────────────────────────────────────

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
    } catch { setError("Failed to create folder — check your connection."); }
  }

  async function handleRenameFolder(id: string, name: string) {
    if (!name.trim()) return;
    const res = await fetch(/api/folders/, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      setFolders(f => f.map(x => x.id === id ? { ...x, name: name.trim() } : x));
    }
    setRenamingFolderId(null);
    setRenameFolderName("");
  }

  async function handleDeleteFolder(id: string) {
    const res = await fetch(/api/folders/, { method: "DELETE" });
    if (res.ok) {
      setFolders(f => f.filter(x => x.id !== id));
      if (selectedFolder === id) setSelectedFolder(null);
    }
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
    } catch { setError("Failed to save resume — check your connection."); }
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
      // Parse tailor output into structured replacements — no free-text AI interpretation
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

  const sc = (s: number) => s >= 70 ? "#22c55e" : s >= 50 ? "#eab308" : "#ef4444";


  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"var(--bg)" }}>

      {/* SIDEBAR */}
      <aside style={{
        width: sidebarOpen ? "224px" : "0px", minWidth: sidebarOpen ? "224px" : "0px",
        flexShrink: 0, display:"flex", flexDirection:"column",
        background:"var(--s1)", borderRight:"1px solid var(--border)",
        overflow:"hidden", transition:"width 0.25s ease, min-width 0.25s ease",
      }}>
        {sidebarOpen && (
          <>
            {/* Logo */}
            <div style={{ padding:"16px 16px 12px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:"10px" }}>
              <div style={{ width:"28px", height:"28px", borderRadius:"8px", background:"linear-gradient(135deg,var(--accent),var(--accent-2))", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:"13px", flexShrink:0 }}>R</div>
              <span style={{ fontWeight:700, fontSize:"14px", color:"var(--t1)" }}>ResumeAI</span>
            </div>

            {/* Main Navigation */}
            <div style={{ padding:"10px 8px 6px" }}>
              <button onClick={reset} className={`nav-item${step === "home" ? " active" : ""}`}>
                {I.home} Dashboard
              </button>
              <div style={{ marginTop:"2px" }}>
                <button onClick={() => setStep("tracker")} className={`nav-item${step === "tracker" ? " active" : ""}`} style={{ color: step === "tracker" ? undefined : "#10b981" }}>
                  {I.grid}
                  <span style={{ flex:1 }}>Application Tracker</span>
                  <span style={{ fontSize:"9px", fontWeight:700, padding:"2px 6px", borderRadius:"99px", background:"rgba(16,185,129,0.15)", color:"#10b981", border:"1px solid rgba(16,185,129,0.25)" }}>NEW</span>
                </button>
              </div>
              <div style={{ marginTop:"2px" }}>
                <button onClick={() => setStep("social")} className={`nav-item${step === "social" ? " active" : ""}`} style={{ color: step === "social" ? undefined : "#3b82f6" }}>
                  {I.sparkle}
                  <span style={{ flex:1 }}>Social Posts</span>
                  <span style={{ fontSize:"9px", fontWeight:700, padding:"2px 6px", borderRadius:"99px", background:"rgba(59,130,246,0.15)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.25)" }}>AI</span>
                </button>
              </div>
              <div style={{ marginTop:"2px" }}>
                <button onClick={() => setStep("news")} className={`nav-item${step === "news" ? " active" : ""}`} style={{ color: step === "news" ? undefined : "#f59e0b" }}>
                  {I.chart}
                  <span style={{ flex:1 }}>Tech News</span>
                </button>
              </div>
            </div>

            <div style={{ height:"1px", background:"var(--border)", margin:"4px 10px 8px" }} />

            {/* Folders */}
            <div style={{ padding:"0 10px 6px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--t3)" }}>Folders</span>
              <button onClick={() => setShowNewFolder(true)} style={{ fontSize:"11px", color:"var(--accent)", background:"none", border:"none", cursor:"pointer" }}>+ New</button>
            </div>

            {showNewFolder && (
              <div style={{ margin:"0 8px 8px", display:"flex", gap:"4px" }}>
                <input autoFocus value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                  placeholder="Folder name..." className="field" style={{ padding:"6px 10px", fontSize:"12px" }} />
                <button onClick={handleCreateFolder} className="btn btn-primary" style={{ padding:"6px 12px", fontSize:"12px" }}>OK</button>
              </div>
            )}

            <div style={{ flex:1, overflowY:"auto", padding:"0 8px 8px" }}>
              {folders.length === 0 ? (
                <div style={{ textAlign:"center", padding:"24px 8px" }}>
                  <div style={{ color:"var(--t3)", fontSize:"12px", marginBottom:"6px" }}>No folders yet</div>
                  <button onClick={() => setShowNewFolder(true)} style={{ fontSize:"11px", color:"var(--accent)", background:"none", border:"none", cursor:"pointer" }}>Create one</button>
                </div>
              ) : (
                folders.map((folder) => (
                  <div key={folder.id}>
                    {renamingFolderId === folder.id ? (
                      <div style={{ display:"flex", alignItems:"center", gap:"4px", padding:"4px" }}>
                        <input autoFocus value={renameFolderName} onChange={e => setRenameFolderName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleRenameFolder(folder.id, renameFolderName); if (e.key === "Escape") { setRenamingFolderId(null); } }}
                          style={{ flex:1, fontSize:"12px", padding:"4px 7px", borderRadius:"7px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(124,58,237,0.5)", color:"#fff", outline:"none" }} />
                        <button onClick={() => handleRenameFolder(folder.id, renameFolderName)} style={{ padding:"3px 7px", borderRadius:"6px", fontSize:"11px", background:"rgba(124,58,237,0.25)", border:"1px solid rgba(124,58,237,0.4)", color:"#c4b5fd", cursor:"pointer" }}>✓</button>
                        <button onClick={() => setRenamingFolderId(null)} style={{ padding:"3px 7px", borderRadius:"6px", fontSize:"11px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display:"flex", alignItems:"center", gap:"2px" }}>
                        <button onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                          style={{ flex:1, textAlign:"left", padding:"6px 8px", borderRadius:"8px", fontSize:"12px", display:"flex", alignItems:"center", gap:"6px", background: selectedFolder === folder.id ? "rgba(124,58,237,0.1)" : "transparent", color: selectedFolder === folder.id ? "#c4b5fd" : "var(--t2)", border:"none", cursor:"pointer", overflow:"hidden" }}>
                          <span style={{ flexShrink:0, opacity:0.7 }}>{I.folder}</span>
                          <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:500 }}>{folder.name}</span>
                          <span style={{ flexShrink:0, opacity:0.5 }}>{selectedFolder === folder.id ? I.chevD : I.chevR}</span>
                        </button>
                        <button onClick={() => { setRenamingFolderId(folder.id); setRenameFolderName(folder.name); }} title="Rename"
                          style={{ flexShrink:0, width:"20px", height:"20px", borderRadius:"5px", border:"none", cursor:"pointer", fontSize:"10px", color:"rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center" }}>✎</button>
                        <button onClick={() => handleDeleteFolder(folder.id)} title="Delete"
                          style={{ flexShrink:0, width:"20px", height:"20px", borderRadius:"5px", border:"none", cursor:"pointer", fontSize:"10px", color:"rgba(239,68,68,0.6)", background:"rgba(239,68,68,0.05)", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                      </div>
                    )}
                    {selectedFolder === folder.id && (
                      <div style={{ marginLeft:"8px", marginTop:"2px" }}>
                        {folderResumes.length === 0 ? (
                          <p style={{ padding:"8px 10px", fontSize:"11px", color:"var(--t3)" }}>No saved resumes</p>
                        ) : (
                          folderResumes.map((r) => (
                            <div key={r.id} style={{ display:"flex", alignItems:"center" }}>
                              <button onClick={() => loadResume(r)} style={{ flex:1, textAlign:"left", padding:"6px 8px", background:"none", border:"none", cursor:"pointer" }}>
                                <p style={{ fontSize:"11px", fontWeight:500, color:"rgba(255,255,255,0.65)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.label}</p>
                                <div style={{ display:"flex", alignItems:"center", gap:"6px", marginTop:"2px" }}>
                                  {r.ats_score != null && (
                                    <span style={{ fontSize:"11px", fontWeight:700, color:sc(r.ats_score) }}>{r.ats_score}</span>
                                  )}
                                  <span style={{ fontSize:"10px", color:"var(--t3)" }}>
                                    {new Date(r.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                                  </span>
                                </div>
                              </button>
                              <button onClick={() => handleDeleteResume(r.id)}
                                style={{ padding:"4px 8px", color:"var(--red)", background:"none", border:"none", cursor:"pointer" }}>
                                {I.trash}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ padding:"10px", borderTop:"1px solid var(--border)" }}>
              <button onClick={reset} className="btn btn-primary" style={{ width:"100%", padding:"9px", fontSize:"13px" }}>
                {I.plus} New Application
              </button>
            </div>
          </>
        )}
      </aside>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* HEADER */}
        <header style={{ flexShrink:0, display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 20px", height:"52px", background:"rgba(6,6,14,0.9)",
          borderBottom:"1px solid var(--border)", backdropFilter:"blur(12px)",
          position:"sticky", top:0, zIndex:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <button onClick={() => setSidebarOpen((o) => !o)}
              style={{ width:"32px", height:"32px", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center",
                background:"rgba(255,255,255,0.04)", border:"1px solid var(--border)", color:"var(--t2)", cursor:"pointer" }}>
              {I.menu}
            </button>
            {step !== "home" && step !== "tracker" && (
              <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                {FLOW_STEPS.map((s, i) => {
                  const isActive = step === s.id;
                  const isDone = flowStepIdx > i;
                  return (
                    <div key={s.id} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                      <button onClick={() => { if (isDone || isActive) setStep(s.id); }}
                        style={{ display:"flex", alignItems:"center", gap:"5px", padding:"4px 10px", borderRadius:"8px",
                          fontSize:"12px", fontWeight:600, border:"none", cursor:(isDone || isActive) ? "pointer" : "default",
                          background: isActive ? "rgba(124,58,237,0.18)" : isDone ? "rgba(255,255,255,0.04)" : "transparent",
                          color: isActive ? "#c4b5fd" : isDone ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.18)",
                          boxShadow: isActive ? "inset 0 0 0 1px rgba(124,58,237,0.4)" : "none" }}>
                        <span style={{ display:"flex" }}>{isDone ? I.check : s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                      {i < FLOW_STEPS.length - 1 && (
                        <div style={{ width:"16px", height:"1px", background: isDone ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.07)" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            {canSave && step !== "home" && step !== "tracker" && (
              <button onClick={() => setShowSaveModal(true)} className="btn btn-ghost" style={{ padding:"6px 12px", fontSize:"12px" }}>
                {I.saveIc} Save
              </button>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              {user && <span style={{ fontSize:"12px", color:"var(--t2)" }}>{user.name}</span>}
              <div style={{ width:"30px", height:"30px", borderRadius:"50%", background:"linear-gradient(135deg,var(--accent),var(--accent-2))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:700, color:"#fff", cursor:"pointer" }}
                title={user?.email}>
                {user?.initials || "?"}
              </div>
              <button onClick={handleSignOut} className="btn btn-ghost" style={{ padding:"5px 10px", fontSize:"11px" }}>
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* LOADING */}
        {loading && (
          <div style={{ position:"fixed", inset:0, background:"rgba(6,6,14,0.75)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
            <div className="card" style={{ padding:"32px 40px", textAlign:"center" }}>
              <div style={{ width:"36px", height:"36px", borderRadius:"50%", border:"3px solid rgba(124,58,237,0.2)", borderTopColor:"var(--accent)", margin:"0 auto 16px" }} className="animate-spin" />
              <p style={{ color:"var(--t1)", fontSize:"14px", fontWeight:600 }}>{loadingMsg || "Processing..."}</p>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div style={{ margin:"16px 20px 0", padding:"12px 16px", borderRadius:"10px", background:"rgba(244,63,94,0.08)", border:"1px solid rgba(244,63,94,0.25)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:"13px", color:"var(--red)" }}>{error}</span>
            <button onClick={() => setError("")} style={{ color:"var(--t2)", background:"none", border:"none", cursor:"pointer", display:"flex" }}>{I.xmark}</button>
          </div>
        )}

        {/* CONTENT */}
        <main style={{ flex:1, overflowY:"auto" }}>

          {/* HOME */}
          {step === "home" && (
            <div style={{ maxWidth:"860px", margin:"0 auto", padding:"36px 24px", display:"flex", flexDirection:"column", gap:"28px" }} className="animate-fadeUp dot-grid">
              <div>
                <span className="tag tag-violet" style={{ marginBottom:"12px", display:"inline-flex" }}>AI-Powered ATS Agent</span>
                <h1 style={{ fontSize:"34px", fontWeight:800, lineHeight:1.1, marginBottom:"10px" }} className="gradient-text">
                  Land your next role faster.
                </h1>
                <p style={{ fontSize:"15px", color:"var(--t2)", maxWidth:"480px", lineHeight:1.6 }}>
                  Build, score, and tailor your resume to beat ATS systems. Track every application in one Kanban board.
                </p>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
                <div className="card" style={{ padding:"24px", display:"flex", flexDirection:"column", gap:"20px", background:"linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.08))", borderColor:"rgba(124,58,237,0.3)" }}>
                  <div>
                    <div style={{ width:"40px", height:"40px", borderRadius:"10px", background:"rgba(124,58,237,0.2)", border:"1px solid rgba(124,58,237,0.3)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"14px" }}>
                      {I.sparkle}
                    </div>
                    <h2 style={{ fontSize:"16px", fontWeight:700, color:"var(--t1)", marginBottom:"6px" }}>Start a new application</h2>
                    <p style={{ fontSize:"13px", color:"var(--t2)", lineHeight:1.55 }}>Upload your resume, get ATS scored, AI coached, and generate a cover letter.</p>
                  </div>
                  <div style={{ display:"flex", gap:"10px" }}>
                    <button onClick={() => setStep("input")} className="btn btn-primary" style={{ flex:1, padding:"10px" }}>
                      Upload Resume
                    </button>
                    <button onClick={() => setStep("build")} className="btn btn-ghost" style={{ padding:"10px 14px" }}>Build</button>
                  </div>
                </div>

                <button onClick={() => setStep("tracker")} className="card card-hover" style={{ padding:"24px", textAlign:"left", display:"flex", flexDirection:"column", gap:"16px", cursor:"pointer", border:"1px solid rgba(16,185,129,0.25)", background:"var(--s1)" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                    <div style={{ width:"40px", height:"40px", borderRadius:"10px", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {I.grid}
                    </div>
                    <span className="tag tag-green">Kanban</span>
                  </div>
                  <div>
                    <h2 style={{ fontSize:"16px", fontWeight:700, color:"var(--t1)", marginBottom:"6px" }}>Application Tracker</h2>
                    <p style={{ fontSize:"13px", color:"var(--t2)", lineHeight:1.55 }}>Drag and drop your applications across stages. Wishlist to Offer. Track salaries, scores, notes.</p>
                  </div>
                  <div style={{ display:"flex", gap:"6px" }}>
                    {["Wishlist","Applied","Interview","Offer"].map((s) => (
                      <span key={s} className="chip chip-gray" style={{ fontSize:"10px" }}>{s}</span>
                    ))}
                  </div>
                </button>
              </div>

              <div>
                <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"14px" }}>How it works</p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px" }}>
                  {FLOW_STEPS.map((s, i) => (
                    <button key={s.id} onClick={() => setStep(s.id)} className="card card-hover" style={{ padding:"16px", textAlign:"left", cursor:"pointer" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                        <div style={{ width:"32px", height:"32px", borderRadius:"8px", background:"rgba(124,58,237,0.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>{s.icon}</div>
                        <span style={{ fontSize:"10px", color:"var(--t3)", fontFamily:"var(--font-geist-mono)" }}>0{i + 1}</span>
                      </div>
                      <p style={{ fontSize:"13px", fontWeight:600, color:"var(--t1)", marginBottom:"4px" }}>{s.label}</p>
                      <p style={{ fontSize:"11px", color:"var(--t2)" }}>{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {folders.length > 0 && (
                <div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
                    <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--t3)" }}>Recent Folders</p>
                    <button onClick={() => setShowNewFolder(true)} style={{ fontSize:"12px", color:"var(--accent)", background:"none", border:"none", cursor:"pointer" }}>+ New folder</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                    {folders.slice(0, 4).map((folder) => (
                      <button key={folder.id}
                        onClick={() => { setSelectedFolder(folder.id); setSidebarOpen(true); }}
                        className="card card-hover" style={{ padding:"14px 16px", textAlign:"left", display:"flex", alignItems:"center", gap:"12px", cursor:"pointer" }}>
                        <div style={{ width:"36px", height:"36px", borderRadius:"8px", background:"rgba(124,58,237,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{I.folder}</div>
                        <div style={{ minWidth:0 }}>
                          <p style={{ fontSize:"13px", fontWeight:600, color:"var(--t1)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{folder.name}</p>
                          <p style={{ fontSize:"11px", color:"var(--t3)", marginTop:"2px" }}>
                            {new Date(folder.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                          </p>
                        </div>
                        <span style={{ marginLeft:"auto", color:"var(--t3)", display:"flex" }}>{I.arrowR}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRACKER */}
          {step === "tracker" && (
            <div style={{ height:"calc(100vh - 52px)", display:"flex", flexDirection:"column" }}>
              <TrackerView onBack={() => setStep("home")} />
            </div>
          )}

          {/* SOCIAL */}
          {step === "social" && (
            <div style={{ height:"calc(100vh - 52px)", overflowY:"auto" }}>
              <SocialView resumeText={resumeText} jobDescription={jobDescription} onBack={() => setStep("home")} />
            </div>
          )}

          {/* NEWS */}
          {step === "news" && (
            <div style={{ height:"calc(100vh - 52px)", overflowY:"auto" }}>
              <NewsView onBack={() => setStep("home")} />
            </div>
          )}

          {/* FLOW STEPS */}
          {step !== "home" && step !== "tracker" && step !== "social" && step !== "news" && (
            <div style={{ maxWidth:"900px", margin:"0 auto", padding:"32px 24px", display:"flex", flexDirection:"column", gap:"20px" }}>

              {/* BUILD */}
              {step === "build" && (
                <div style={{ display:"flex", flexDirection:"column", gap:"20px" }} className="animate-fadeUp">
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                    <div>
                      <h2 style={{ fontSize:"22px", fontWeight:800, color:"var(--t1)", marginBottom:"4px" }}>Build Your Resume</h2>
                      <p style={{ fontSize:"13px", color:"var(--t2)" }}>Fill in your details � AI writes a fully ATS-optimized resume.</p>
                    </div>
                    <button onClick={() => setStep("home")} className="btn btn-ghost" style={{ padding:"6px 12px", fontSize:"12px" }}>Home</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                      <div className="card" style={{ padding:"18px" }}>
                        <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"12px" }}>Contact Info</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                          {([
                            { key:"name" as const, label:"Full Name *", ph:"Jane Smith" },
                            { key:"email" as const, label:"Email *", ph:"jane@email.com" },
                            { key:"phone" as const, label:"Phone", ph:"+1 (555) 123-4567" },
                            { key:"linkedin" as const, label:"LinkedIn URL", ph:"linkedin.com/in/janesmith" },
                          ]).map(({ key, label, ph }) => (
                            <div key={key}>
                              <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"5px" }}>{label}</label>
                              <input value={form[key]} onChange={setF(key)} placeholder={ph} className="field" style={{ padding:"8px 12px" }} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="card" style={{ padding:"18px" }}>
                        <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"12px" }}>Target Role</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                          <div>
                            <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"5px" }}>Job Title</label>
                            <input value={form.jobTitle} onChange={setF("jobTitle")} placeholder="Senior Software Engineer" className="field" style={{ padding:"8px 12px" }} />
                          </div>
                          <div>
                            <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"5px" }}>Job Description</label>
                            <textarea value={form.jobDescription} onChange={setF("jobDescription")} placeholder="Paste the job description here..." rows={5} className="field" style={{ padding:"8px 12px", resize:"vertical" }} />
                          </div>
                        </div>
                      </div>
                      <div className="card" style={{ padding:"18px" }}>
                        <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"5px" }}>Education</label>
                        <textarea value={form.education} onChange={setF("education")} placeholder="B.Sc. Computer Science | University of Toronto | 2021" rows={2} className="field" style={{ padding:"8px 12px", resize:"vertical" }} />
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                      <div className="card" style={{ padding:"18px" }}>
                        <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"5px" }}>Work Experience *</label>
                        <p style={{ fontSize:"11px", color:"var(--t3)", marginBottom:"8px" }}>roles, dates, what you did</p>
                        <textarea value={form.experiences} onChange={setF("experiences")}
                          placeholder={"Software Engineer | Acme Corp | Jan 2022 - Mar 2024\n- Built REST APIs handling 50k daily requests\n- Led migration to TypeScript, reduced bugs by 30%"}
                          rows={14} className="field" style={{ padding:"8px 12px", resize:"vertical", fontFamily:"var(--font-geist-mono)", fontSize:"12px" }} />
                      </div>
                      <div className="card" style={{ padding:"18px" }}>
                        <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"5px" }}>Skills</label>
                        <textarea value={form.skills} onChange={setF("skills")} placeholder="Python, TypeScript, React, PostgreSQL, AWS, Docker" rows={2} className="field" style={{ padding:"8px 12px", resize:"vertical" }} />
                      </div>
                      <div className="card" style={{ padding:"18px" }}>
                        <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"5px" }}>Additional Notes</label>
                        <textarea value={form.summary} onChange={setF("summary")} placeholder="Any highlights or tone you want..." rows={3} className="field" style={{ padding:"8px 12px", resize:"vertical" }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:"10px" }}>
                    <button onClick={handleBuildResume} disabled={loading} className="btn btn-primary" style={{ flex:1, padding:"12px" }}>
                      {loading ? "Generating..." : "Generate My Resume"}
                    </button>
                    <button onClick={() => setStep("input")} className="btn btn-ghost" style={{ padding:"12px 20px" }}>Skip to Upload</button>
                  </div>
                  {generatedResume && (
                    <div className="card" style={{ padding:"18px", borderColor:"rgba(16,185,129,0.3)" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"6px", color:"var(--green)" }}>
                          {I.check} <span style={{ fontSize:"13px", fontWeight:600 }}>Resume Generated</span>
                        </div>
                        <button onClick={() => { setResumeText(generatedResume); setStep("input"); }} className="btn btn-primary" style={{ padding:"7px 14px", fontSize:"12px" }}>
                          Use this and Check ATS
                        </button>
                      </div>
                      <div style={{ borderRadius:"8px", padding:"14px", background:"rgba(0,0,0,0.3)", maxHeight:"260px", overflowY:"auto" }}>
                        <pre style={{ whiteSpace:"pre-wrap", fontSize:"12px", color:"rgba(255,255,255,0.7)", fontFamily:"var(--font-geist-mono)", lineHeight:1.6 }}>{generatedResume}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* UPLOAD */}
              {step === "input" && (
                <div style={{ display:"flex", flexDirection:"column", gap:"20px" }} className="animate-fadeUp">
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                    <div>
                      <h2 style={{ fontSize:"22px", fontWeight:800, color:"var(--t1)", marginBottom:"4px" }}>Upload and Analyze</h2>
                      <p style={{ fontSize:"13px", color:"var(--t2)" }}>Upload your resume and paste the job description.</p>
                    </div>
                    <button onClick={() => setStep("home")} className="btn btn-ghost" style={{ padding:"6px 12px", fontSize:"12px" }}>Home</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
                    <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                      <p style={{ fontSize:"13px", fontWeight:600, color:"var(--t1)" }}>Your Resume</p>
                      <div className="card" style={{ padding:"32px 24px", textAlign:"center", cursor:"pointer", border:"2px dashed rgba(255,255,255,0.1)", transition:"border-color 0.15s" }}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; }}
                        onDragLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                        onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; const f = e.dataTransfer.files[0]; if (f) handlePdfUpload(f); }}
                        onClick={() => fileRef.current?.click()}>
                        {pdfFileName ? (
                          <>
                            <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.25)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>{I.check}</div>
                            <p style={{ fontSize:"13px", fontWeight:600, color:"var(--green)" }}>{pdfFileName}</p>
                            <p style={{ fontSize:"11px", color:"var(--t2)", marginTop:"4px" }}>Click to replace</p>
                          </>
                        ) : (
                          <>
                            <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px" }}>{I.uploadIc}</div>
                            <p style={{ fontSize:"13px", fontWeight:600, color:"var(--t1)" }}>Drop PDF here or click to browse</p>
                            <p style={{ fontSize:"11px", color:"var(--t3)", marginTop:"4px" }}>Text-based PDFs only</p>
                          </>
                        )}
                        <input ref={fileRef} type="file" accept=".pdf" style={{ display:"none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} />
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                        <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
                        <span style={{ fontSize:"11px", color:"var(--t3)" }}>or paste text</span>
                        <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
                      </div>
                      <textarea value={resumeText} onChange={(e) => { setResumeText(e.target.value); setPdfFileName(""); }}
                        placeholder="Paste your resume text here..."
                        rows={12} className="field" style={{ padding:"10px 12px", fontFamily:"var(--font-geist-mono)", fontSize:"12px", lineHeight:1.6 }} />
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                      <p style={{ fontSize:"13px", fontWeight:600, color:"var(--t1)" }}>Job Description</p>
                      <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the full job description here..."
                        rows={24} className="field" style={{ padding:"10px 12px", lineHeight:1.6 }} />
                    </div>
                  </div>
                  <button onClick={handleScore} disabled={loading || !resumeText.trim() || !jobDescription.trim()}
                    className="btn btn-primary" style={{ width:"100%", padding:"13px", fontSize:"14px" }}>
                    {loading ? "Analysing..." : "Run ATS Analysis"}
                  </button>
                </div>
              )}

              {/* SCORE */}
              {step === "score" && scoreResult && (
                <div style={{ display:"flex", flexDirection:"column", gap:"20px" }} className="animate-fadeUp">
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                    <div>
                      <h2 style={{ fontSize:"22px", fontWeight:800, color:"var(--t1)", marginBottom:"4px" }}>ATS Analysis</h2>
                      <p style={{ fontSize:"13px", color:"var(--t2)" }}>Full field-by-field breakdown of your resume.</p>
                    </div>
                    <button onClick={reset} className="btn btn-ghost" style={{ padding:"6px 12px", fontSize:"12px" }}>Home</button>
                  </div>
                  <div className="card" style={{ padding:"24px", display:"flex", gap:"32px", alignItems:"center" }}>
                    <ScoreRing score={scoreResult.score} />
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:"12px" }}>
                      <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--t3)" }}>Breakdown</p>
                      <MiniBar label="Keyword Match (45%)" value={scoreResult.breakdown.keywordMatch} />
                      <MiniBar label="Sections and Contact (25%)" value={scoreResult.breakdown.sections} delay={100} />
                      <MiniBar label="Content Quality (20%)" value={scoreResult.breakdown.content} delay={200} />
                      <MiniBar label="ATS Formatting (10%)" value={scoreResult.breakdown.formatting} delay={300} />
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ fontSize:"11px", color:"var(--t3)", marginBottom:"4px" }}>Keywords matched</p>
                      <p style={{ fontSize:"30px", fontWeight:800, color:"var(--t1)", lineHeight:1, fontFamily:"var(--font-geist-mono)" }}>
                        {scoreResult.matchedKeywords.length}
                        <span style={{ fontSize:"16px", fontWeight:400, color:"var(--t3)" }}>/{scoreResult.totalKeywords}</span>
                      </p>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                    <div className="card" style={{ padding:"18px", borderColor:"rgba(244,63,94,0.2)" }}>
                      <p style={{ fontSize:"12px", fontWeight:700, color:"var(--red)", marginBottom:"12px" }}>Missing Keywords</p>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                        {scoreResult.missingKeywords.length > 0
                          ? scoreResult.missingKeywords.map((kw) => <Chip key={kw} text={kw} variant="red" />)
                          : <p style={{ fontSize:"13px", color:"var(--green)" }}>No major missing keywords!</p>}
                      </div>
                    </div>
                    <div className="card" style={{ padding:"18px", borderColor:"rgba(16,185,129,0.2)" }}>
                      <p style={{ fontSize:"12px", fontWeight:700, color:"var(--green)", marginBottom:"12px" }}>Matched Keywords</p>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                        {scoreResult.matchedKeywords.slice(0, 25).map((kw) => <Chip key={kw} text={kw} variant="green" />)}
                      </div>
                    </div>
                  </div>
                  {[
                    { title:"Contact Information", icon:I.mail, keys:["Email Address","Phone Number","LinkedIn URL","GitHub / Portfolio URL","Location"] },
                    { title:"Resume Sections", icon:I.folder, keys:["Professional Summary","Summary Length","Work Experience","Education","Skills Section","Certifications","Projects","Employment Dates","Job Titles"] },
                    { title:"Content Quality", icon:I.sparkle, keys:["Action Verbs","Verb Variety","Quantifiable Achievements","Weak Language","Resume Length","Bullet Points"] },
                    { title:"ATS Formatting", icon:I.chart, keys:["Table / Column Layout","Special Characters","Emoji","Standard Section Names","ALL-CAPS Text","Submission Format"] },
                  ].map(({ title, icon, keys }) => {
                    const checks = scoreResult.fieldChecks.filter((c) => keys.includes(c.field));
                    const passes = checks.filter((c) => c.status === "pass").length;
                    const pct = checks.length > 0 ? (passes / checks.length) * 100 : 0;
                    const barCol = pct === 100 ? "var(--green)" : pct >= 60 ? "var(--yellow)" : "var(--red)";
                    return (
                      <div key={title} className="card" style={{ padding:"18px" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                            <span style={{ color:"var(--t2)", display:"flex" }}>{icon}</span>
                            <span style={{ fontSize:"14px", fontWeight:700, color:"var(--t1)" }}>{title}</span>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                            <div style={{ width:"64px", height:"5px", borderRadius:"99px", overflow:"hidden", background:"rgba(255,255,255,0.05)" }}>
                              <div style={{ width:`${pct}%`, height:"100%", borderRadius:"99px", background:barCol }} />
                            </div>
                            <span style={{ fontSize:"11px", color:"var(--t2)", fontFamily:"var(--font-geist-mono)" }}>{passes}/{checks.length}</span>
                          </div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                          {checks.map((c) => (
                            <div key={c.field} style={{ display:"flex", gap:"10px" }}>
                              <div style={{ marginTop:"1px", flexShrink:0 }}><StatusIcon status={c.status} /></div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                                  <span style={{ fontSize:"13px", fontWeight:600, color:"var(--t1)" }}>{c.field}</span>
                                  <span className={`tag tag-${c.status === "pass" ? "green" : c.status === "warn" ? "yellow" : "red"}`}>{c.status}</span>
                                </div>
                                <p style={{ fontSize:"12px", color:"var(--t2)", marginTop:"2px" }}>{c.message}</p>
                                {c.suggestion && <p style={{ fontSize:"12px", color:"#818cf8", marginTop:"4px" }}>{c.suggestion}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {scoreResult.fieldSuggestions?.length > 0 && (
                    <div className="card" style={{ padding:"18px", borderColor:"rgba(124,58,237,0.25)" }}>
                      <p style={{ fontSize:"14px", fontWeight:700, color:"var(--t1)", marginBottom:"4px" }}>Sections to Add for This Role</p>
                      <p style={{ fontSize:"12px", color:"var(--t2)", marginBottom:"14px" }}>New fields that could significantly boost your score for this specific job.</p>
                      <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                        {scoreResult.fieldSuggestions.map((s, i) => (
                          <div key={i} className="card" style={{ padding:"14px", background:"var(--s2)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
                              <span style={{ fontSize:"13px", fontWeight:600, color:"var(--t1)" }}>{s.field}</span>
                              <span className={`tag tag-${s.priority === "high" ? "red" : s.priority === "medium" ? "yellow" : "violet"}`}>{s.priority}</span>
                            </div>
                            <p style={{ fontSize:"12px", color:"var(--t2)", marginBottom:"8px" }}>{s.reason}</p>
                            <div style={{ borderRadius:"6px", padding:"8px 12px", background:"rgba(124,58,237,0.06)", border:"1px solid rgba(124,58,237,0.12)" }}>
                              <p style={{ fontSize:"11px", color:"#a5b4fc", fontFamily:"var(--font-geist-mono)" }}>{s.example}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display:"flex", gap:"10px" }}>
                    <button onClick={() => setStep("input")} className="btn btn-ghost" style={{ padding:"12px 20px" }}>Edit inputs</button>
                    <button onClick={handleTailor} disabled={loading} className="btn btn-primary" style={{ flex:1, padding:"12px" }}>
                      {loading ? "Analysing..." : "Get AI Coaching"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAILOR */}
              {step === "tailor" && tailorResult && (
                <div style={{ display:"flex", flexDirection:"column", gap:"20px" }} className="animate-fadeUp">
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
                    <div>
                      <h2 style={{ fontSize:"22px", fontWeight:800, color:"var(--t1)", marginBottom:"4px" }}>AI Coach</h2>
                      <p style={{ fontSize:"13px", color:"var(--t2)" }}>Coaching, cover letter, and HR message.</p>
                    </div>
                    <button onClick={reset} className="btn btn-ghost" style={{ padding:"6px 12px", fontSize:"12px" }}>Home</button>
                  </div>
                  <div className="card" style={{ padding:"20px", display:"flex", alignItems:"center", gap:"20px" }}>
                    <div style={{ textAlign:"center", flexShrink:0 }}>
                      <p style={{ fontSize:"11px", color:"var(--t3)", marginBottom:"4px" }}>Current</p>
                      <p style={{ fontSize:"36px", fontWeight:800, color:"var(--red)", fontFamily:"var(--font-geist-mono)", lineHeight:1 }}>{tailorResult.scoreBefore}</p>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ height:"8px", borderRadius:"99px", overflow:"hidden", background:"rgba(255,255,255,0.05)" }}>
                        <div style={{ width:`${tailorResult.scorePotential}%`, height:"100%", borderRadius:"99px", background:"linear-gradient(90deg,var(--red),var(--yellow),var(--green))" }} className="animate-bar" />
                      </div>
                      <p style={{ fontSize:"12px", textAlign:"center", color:"var(--t2)", marginTop:"8px" }}>
                        Apply all suggestions to reach {tailorResult.scorePotential}
                      </p>
                    </div>
                    <div style={{ textAlign:"center", flexShrink:0 }}>
                      <p style={{ fontSize:"11px", color:"var(--t3)", marginBottom:"4px" }}>Potential</p>
                      <p style={{ fontSize:"36px", fontWeight:800, color:"var(--green)", fontFamily:"var(--font-geist-mono)", lineHeight:1 }}>{tailorResult.scorePotential}</p>
                    </div>
                  </div>
                  <div className="tab-bar">
                    {([
                      { id:"coach" as const, label:"Coaching", icon:I.sparkle },
                      { id:"cover" as const, label:"Cover Letter", icon:I.mail },
                      { id:"hr"    as const, label:"HR Message", icon:I.send },
                    ]).map((tab) => (
                      <button key={tab.id} onClick={() => setTailorTab(tab.id)} className={`tab${tailorTab === tab.id ? " active" : ""}`}>
                        {tab.icon} {tab.label}
                      </button>
                    ))}
                  </div>
                  {tailorTab === "coach" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                      {tailorResult.summaryTip && (
                        <div style={{ padding:"14px 16px", borderRadius:"10px", background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.2)" }}>
                          <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#8b5cf6", marginBottom:"6px" }}>Summary Tip</p>
                          <p style={{ fontSize:"13px", color:"var(--t1)", lineHeight:1.5 }}>{tailorResult.summaryTip}</p>
                        </div>
                      )}
                      {tailorResult.keywordSuggestions?.length > 0 && (
                        <div className="card" style={{ padding:"18px" }}>
                          <p style={{ fontSize:"13px", fontWeight:700, color:"var(--t1)", marginBottom:"12px" }}>Missing Keywords to Add</p>
                          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                            {tailorResult.keywordSuggestions.map((k, i) => (
                              <div key={i} style={{ padding:"12px", borderRadius:"8px", background:"var(--s2)", border:"1px solid var(--border)" }}>
                                <span className="chip chip-violet" style={{ marginBottom:"8px", display:"inline-block" }}>{k.keyword}</span>
                                <p style={{ fontSize:"12px", color:"var(--t2)", marginBottom:"4px" }}><span style={{ color:"var(--t1)", fontWeight:600 }}>Where: </span>{k.whereTo}</p>
                                <p style={{ fontSize:"12px", color:"var(--t2)" }}><span style={{ color:"var(--t1)", fontWeight:600 }}>How: </span>{k.how}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {tailorResult.bulletFeedback?.length > 0 && (
                        <div className="card" style={{ padding:"18px" }}>
                          <p style={{ fontSize:"13px", fontWeight:700, color:"var(--t1)", marginBottom:"14px" }}>Bullet Point Feedback</p>
                          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
                            {tailorResult.bulletFeedback.map((b, i) => (
                              <div key={i} style={{ padding:"14px", borderRadius:"8px", background:"var(--s2)", border:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:"10px" }}>
                                <p style={{ fontSize:"11px", fontStyle:"italic", color:"var(--t3)" }}>{b.original.slice(0, 120)}{b.original.length > 120 ? "..." : ""}</p>
                                <div style={{ display:"flex", gap:"8px" }}>
                                  <span style={{ fontSize:"10px", fontWeight:700, color:"var(--red)", flexShrink:0 }}>ISSUE</span>
                                  <p style={{ fontSize:"12px", color:"var(--t2)" }}>{b.issue}</p>
                                </div>
                                <div style={{ display:"flex", gap:"8px" }}>
                                  <span style={{ fontSize:"10px", fontWeight:700, color:"var(--green)", flexShrink:0 }}>TIP</span>
                                  <p style={{ fontSize:"12px", color:"var(--t2)" }}>{b.tip}</p>
                                </div>
                                {b.swapVerb && (
                                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                                    <span style={{ fontSize:"10px", fontWeight:700, color:"var(--yellow)", flexShrink:0 }}>VERB</span>
                                    <span className="chip chip-gray">{b.swapVerb}</span>
                                  </div>
                                )}
                                {b.corrected && (
                                  <div style={{ padding:"10px 12px", borderRadius:"6px", background:"rgba(16,185,129,0.06)", border:"1px solid rgba(16,185,129,0.18)" }}>
                                    <p style={{ fontSize:"10px", fontWeight:700, color:"var(--green)", marginBottom:"4px" }}>REWRITE</p>
                                    <p style={{ fontSize:"12px", color:"rgba(167,243,208,0.9)", lineHeight:1.6 }}>{b.corrected}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {tailorResult.powerVerbs?.length > 0 && (
                        <div className="card" style={{ padding:"18px" }}>
                          <p style={{ fontSize:"13px", fontWeight:700, color:"var(--t1)", marginBottom:"12px" }}>Power Verbs for This Role</p>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:"6px" }}>
                            {tailorResult.powerVerbs.map((v) => <span key={v} className="chip chip-violet">{v}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {tailorTab === "cover" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                      <div className="card" style={{ padding:"18px" }}>
                        <p style={{ fontSize:"10px", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--t3)", marginBottom:"14px" }}>Personalize</p>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"14px" }}>
                          <div>
                            <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"5px" }}>Your Name</label>
                            <input value={coverName} onChange={(e) => setCoverName(e.target.value)} placeholder="Jane Smith" className="field" style={{ padding:"8px 10px" }} />
                          </div>
                          <div>
                            <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"5px" }}>Company</label>
                            <input value={coverCompany} onChange={(e) => setCoverCompany(e.target.value)} placeholder="Stripe" className="field" style={{ padding:"8px 10px" }} />
                          </div>
                          <div>
                            <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"5px" }}>Role</label>
                            <input value={coverRole} onChange={(e) => setCoverRole(e.target.value)} placeholder="Senior SWE" className="field" style={{ padding:"8px 10px" }} />
                          </div>
                        </div>
                        <button onClick={handleCoverLetter} disabled={coverLoading} className="btn btn-primary" style={{ padding:"10px 20px" }}>
                          {coverLoading ? "Writing..." : "Generate Cover Letter"}
                        </button>
                      </div>
                      {coverResult?.coverLetter && (
                        <div className="card" style={{ padding:"18px" }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                            <p style={{ fontSize:"13px", fontWeight:700, color:"var(--t1)" }}>Cover Letter</p>
                            <button onClick={() => copyText(coverResult.coverLetter, setCopiedCover)} className="btn btn-ghost" style={{ padding:"6px 10px", fontSize:"12px" }}>
                              {copiedCover ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <div style={{ borderRadius:"8px", padding:"16px", background:"rgba(0,0,0,0.25)", border:"1px solid var(--border)" }}>
                            <pre style={{ whiteSpace:"pre-wrap", fontSize:"13px", color:"rgba(255,255,255,0.8)", fontFamily:"inherit", lineHeight:1.7 }}>{coverResult.coverLetter}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {tailorTab === "hr" && (
                    <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                      {!coverResult?.hrMessage ? (
                        <div className="card" style={{ padding:"24px", textAlign:"center" }}>
                          <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.2)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>{I.send}</div>
                          <p style={{ fontSize:"14px", fontWeight:600, color:"var(--t1)", marginBottom:"6px" }}>HR Follow-up Message</p>
                          <p style={{ fontSize:"13px", color:"var(--t2)", marginBottom:"16px" }}>Generate the cover letter first � the HR message is included automatically.</p>
                          <button onClick={() => setTailorTab("cover")} className="btn btn-primary" style={{ padding:"10px 20px" }}>Go to Cover Letter</button>
                        </div>
                      ) : (
                        <div className="card" style={{ padding:"18px" }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                            <p style={{ fontSize:"13px", fontWeight:700, color:"var(--t1)" }}>LinkedIn / HR Message</p>
                            <button onClick={() => copyText(coverResult.hrMessage, setCopiedHr)} className="btn btn-ghost" style={{ padding:"6px 10px", fontSize:"12px" }}>
                              {copiedHr ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <div style={{ borderRadius:"8px", padding:"16px", background:"rgba(0,0,0,0.25)", border:"1px solid var(--border)" }}>
                            <pre style={{ whiteSpace:"pre-wrap", fontSize:"13px", color:"rgba(255,255,255,0.8)", fontFamily:"inherit", lineHeight:1.7 }}>{coverResult.hrMessage}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:"10px" }}>
                    <button onClick={() => setStep("score")} className="btn btn-ghost" style={{ padding:"12px 20px" }}>Back to Score</button>
                    <button onClick={() => setShowSaveModal(true)} disabled={!canSave} className="btn btn-primary" style={{ flex:1, padding:"12px" }}>
                      Save Application
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </main>

        {/* SAVE MODAL */}
        {showSaveModal && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:"24px" }}>
            <div className="card" style={{ width:"100%", maxWidth:"400px", padding:"24px" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
                <p style={{ fontSize:"15px", fontWeight:700, color:"var(--t1)" }}>Save Application</p>
                <button onClick={() => setShowSaveModal(false)} style={{ color:"var(--t2)", background:"none", border:"none", cursor:"pointer", display:"flex" }}>{I.xmark}</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
                <div>
                  <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"6px" }}>Label</label>
                  <input value={saveLabel} onChange={(e) => setSaveLabel(e.target.value)} placeholder="e.g. Senior Engineer @ Stripe" className="field" style={{ padding:"9px 12px" }} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"var(--t2)", marginBottom:"6px" }}>Folder</label>
                  <select value={saveFolderId} onChange={(e) => setSaveFolderId(e.target.value)} className="field" style={{ padding:"9px 12px" }}>
                    <option value="">Select a folder...</option>
                    {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
                <button onClick={() => setShowSaveModal(false)} className="btn btn-ghost" style={{ flex:1, padding:"10px" }}>Cancel</button>
                <button onClick={handleSave} disabled={saving || !saveLabel || !saveFolderId} className="btn btn-primary" style={{ flex:1, padding:"10px" }}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

