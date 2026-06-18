"use client";

import { useState, useEffect, useCallback } from "react";

export type AppStatus = "wishlist" | "applied" | "screen" | "interview" | "offer" | "rejected";

export interface Application {
  id: string;
  company: string;
  role: string;
  status: AppStatus;
  ats_score: number | null;
  job_url: string | null;
  notes: string | null;
  salary_range: string | null;
  applied_date: string | null;
  resume_id: string | null;
  created_at: string;
}

const COLUMNS: { id: AppStatus; label: string; color: string; glow: string }[] = [
  { id: "wishlist",  label: "Wishlist",     color: "#6366f1", glow: "rgba(99,102,241,0.12)"  },
  { id: "applied",   label: "Applied",      color: "#3b82f6", glow: "rgba(59,130,246,0.12)"  },
  { id: "screen",    label: "Phone Screen", color: "#f59e0b", glow: "rgba(245,158,11,0.12)"  },
  { id: "interview", label: "Interview",    color: "#f97316", glow: "rgba(249,115,22,0.12)"  },
  { id: "offer",     label: "Offer",        color: "#22c55e", glow: "rgba(34,197,94,0.12)"   },
  { id: "rejected",  label: "Rejected",     color: "#6b7280", glow: "rgba(107,114,128,0.08)" },
];

const EMPTY_FORM = {
  company: "", role: "", status: "wishlist" as AppStatus,
  job_url: "", notes: "", salary_range: "", applied_date: "",
};

function timeAgo(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function scoreColor(s: number) { return s >= 70 ? "#22c55e" : s >= 50 ? "#eab308" : "#ef4444"; }

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#3b82f6","#06b6d4","#10b981","#f59e0b","#ef4444"];
function avatarBg(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Field component ───────────────────────────────────────────────────────────
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:"11px", fontWeight:600, color:"rgba(255,255,255,0.35)", marginBottom:"5px" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width:"100%", borderRadius:"9px", padding:"8px 12px", fontSize:"13px",
  color:"rgba(255,255,255,0.85)", background:"rgba(255,255,255,0.04)",
  border:"1px solid rgba(255,255,255,0.09)", outline:"none", boxSizing:"border-box",
};

// ── AppCard ───────────────────────────────────────────────────────────────────
function AppCard({ app, col, onMove, onEdit, onDelete, onDragStart, onDragEnd, isDragOver }: {
  app: Application; col: typeof COLUMNS[0];
  onMove: (id: string, s: AppStatus) => void;
  onEdit: (a: Application) => void;
  onDelete: (id: string) => void;
  onDragStart: () => void; onDragEnd: () => void; isDragOver: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const nextCols = COLUMNS.filter(c => c.id !== app.status);

  return (
    <div
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      style={{
        borderRadius:"12px", padding:"12px 13px", cursor:"grab", position:"relative",
        background: isDragOver ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.025)",
        border:`1px solid ${isDragOver ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.07)"}`,
        transform: isDragOver ? "scale(1.02)" : "scale(1)", transition:"all 0.12s",
      }}
    >
      <div style={{ display:"flex", alignItems:"flex-start", gap:"10px" }}>
        <div style={{
          width:"32px", height:"32px", borderRadius:"9px", flexShrink:0,
          background: avatarBg(app.company), display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:"13px", fontWeight:700, color:"#fff",
        }}>
          {app.company.trim().charAt(0).toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:"13px", fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", lineHeight:1.3 }}>{app.company}</p>
          <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", marginTop:"2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{app.role}</p>
        </div>
        <button onClick={() => setMenu(o => !o)}
          style={{ width:"22px", height:"22px", borderRadius:"6px", border:"none", cursor:"pointer", fontSize:"14px", color:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.05)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>
          ⋯
        </button>
      </div>

      {menu && (
        <div onMouseLeave={() => setMenu(false)} style={{
          position:"absolute", right:"8px", top:"38px", zIndex:30,
          background:"#131326", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:"12px", padding:"6px", minWidth:"160px", boxShadow:"0 16px 48px rgba(0,0,0,0.6)",
        }}>
          <p style={{ padding:"4px 8px", fontSize:"10px", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"rgba(255,255,255,0.25)" }}>Move to</p>
          {nextCols.map(c => (
            <button key={c.id} onClick={() => { onMove(app.id, c.id); setMenu(false); }}
              style={{ display:"block", width:"100%", textAlign:"left", padding:"6px 8px", fontSize:"12px", color:c.color, background:"none", border:"none", cursor:"pointer", borderRadius:"7px" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              {c.label}
            </button>
          ))}
          <div style={{ height:"1px", background:"rgba(255,255,255,0.07)", margin:"4px 0" }} />
          <button onClick={() => { onEdit(app); setMenu(false); }}
            style={{ display:"block", width:"100%", textAlign:"left", padding:"6px 8px", fontSize:"12px", color:"rgba(255,255,255,0.6)", background:"none", border:"none", cursor:"pointer", borderRadius:"7px" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
            ✎ Edit
          </button>
          <button onClick={() => { onDelete(app.id); setMenu(false); }}
            style={{ display:"block", width:"100%", textAlign:"left", padding:"6px 8px", fontSize:"12px", color:"#f87171", background:"none", border:"none", cursor:"pointer", borderRadius:"7px" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
            ✕ Delete
          </button>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:"6px", marginTop:"9px", flexWrap:"wrap" }}>
        {app.ats_score != null && (
          <span style={{ fontSize:"11px", fontWeight:700, padding:"1px 6px", borderRadius:"5px", color:scoreColor(app.ats_score), background:`${scoreColor(app.ats_score)}18` }}>
            {app.ats_score}
          </span>
        )}
        {app.salary_range && (
          <span style={{ fontSize:"10px", padding:"1px 6px", borderRadius:"5px", color:"rgba(255,255,255,0.35)", background:"rgba(255,255,255,0.04)" }}>{app.salary_range}</span>
        )}
        <span style={{ marginLeft:"auto", fontSize:"10px", color:"rgba(255,255,255,0.2)" }}>{timeAgo(app.created_at)}</span>
      </div>

      {app.notes && (
        <p style={{ fontSize:"11px", marginTop:"7px", color:"rgba(255,255,255,0.28)", lineHeight:1.5,
          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
          {app.notes}
        </p>
      )}

      {app.job_url && (
        <a href={app.job_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
          style={{ display:"inline-block", marginTop:"7px", fontSize:"11px", color:"rgba(99,102,241,0.7)", textDecoration:"none" }}>
          ↗ View posting
        </a>
      )}
    </div>
  );
}

// ── Mobile list row ───────────────────────────────────────────────────────────
function MobileRow({ app, onEdit, onMove, onDelete }: {
  app: Application; onEdit: (a: Application) => void;
  onMove: (id: string, s: AppStatus) => void; onDelete: (id: string) => void;
}) {
  const col = COLUMNS.find(c => c.id === app.status)!;
  const [menu, setMenu] = useState(false);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,0.05)", position:"relative" }}>
      <div style={{ width:"34px", height:"34px", borderRadius:"9px", background:avatarBg(app.company), display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:700, color:"#fff", flexShrink:0 }}>
        {app.company.trim().charAt(0).toUpperCase()}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:"13px", fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{app.company}</p>
        <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)", marginTop:"1px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{app.role}</p>
      </div>
      <span style={{ fontSize:"10px", fontWeight:700, padding:"3px 8px", borderRadius:"99px", background:`${col.color}18`, color:col.color, border:`1px solid ${col.color}30`, flexShrink:0 }}>
        {col.label}
      </span>
      <button onClick={() => setMenu(o => !o)} style={{ width:"24px", height:"24px", borderRadius:"6px", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.05)", fontSize:"14px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>⋯</button>
      {menu && (
        <div onMouseLeave={() => setMenu(false)} style={{
          position:"absolute", right:"8px", top:"44px", zIndex:30,
          background:"#131326", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:"12px", padding:"6px", minWidth:"160px", boxShadow:"0 16px 48px rgba(0,0,0,0.6)",
        }}>
          {COLUMNS.filter(c => c.id !== app.status).map(c => (
            <button key={c.id} onClick={() => { onMove(app.id, c.id); setMenu(false); }}
              style={{ display:"block", width:"100%", textAlign:"left", padding:"6px 8px", fontSize:"12px", color:c.color, background:"none", border:"none", cursor:"pointer", borderRadius:"7px" }}>
              → {c.label}
            </button>
          ))}
          <div style={{ height:"1px", background:"rgba(255,255,255,0.07)", margin:"4px 0" }} />
          <button onClick={() => { onEdit(app); setMenu(false); }} style={{ display:"block", width:"100%", textAlign:"left", padding:"6px 8px", fontSize:"12px", color:"rgba(255,255,255,0.6)", background:"none", border:"none", cursor:"pointer", borderRadius:"7px" }}>✎ Edit</button>
          <button onClick={() => { onDelete(app.id); setMenu(false); }} style={{ display:"block", width:"100%", textAlign:"left", padding:"6px 8px", fontSize:"12px", color:"#f87171", background:"none", border:"none", cursor:"pointer", borderRadius:"7px" }}>✕ Delete</button>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function TrackerView({ onBack }: { onBack: () => void }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<AppStatus | null>(null);
  const [search, setSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<AppStatus | "all">("all");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchApps = useCallback(async () => {
    const res = await fetch("/api/applications");
    if (!res.ok) {
      const data = await res.json();
      setDbError(data.error?.includes("does not exist") ? "setup" : (data.error ?? "Failed to load"));
      setLoading(false); return;
    }
    setApps(await res.json()); setDbError(null); setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  async function handleSave() {
    if (!form.company.trim() || !form.role.trim()) return;
    setSaving(true);
    const url = editApp ? `/api/applications/${editApp.id}` : "/api/applications";
    const res = await fetch(url, {
      method: editApp ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ats_score: null }),
    });
    if (res.ok) { await fetchApps(); closeModal(); }
    setSaving(false);
  }

  async function handleMove(id: string, status: AppStatus) {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    await fetch(`/api/applications/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status }) });
  }

  async function handleDelete(id: string) {
    setApps(prev => prev.filter(a => a.id !== id));
    await fetch(`/api/applications/${id}`, { method:"DELETE" });
  }

  function openEdit(app: Application) {
    setEditApp(app);
    setForm({ company:app.company, role:app.role, status:app.status, job_url:app.job_url??"", notes:app.notes??"", salary_range:app.salary_range??"", applied_date:app.applied_date??"" });
    setShowModal(true);
  }

  function openAdd(status: AppStatus = "wishlist") {
    setEditApp(null); setForm({ ...EMPTY_FORM, status }); setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditApp(null); setForm(EMPTY_FORM); }

  const filtered = apps.filter(a => {
    const q = search.toLowerCase();
    return (!q || a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q));
  });

  const active = apps.filter(a => ["applied","screen","interview"].includes(a.status)).length;
  const offers = apps.filter(a => a.status === "offer").length;
  const rr = apps.filter(a => a.status !== "wishlist").length > 0
    ? Math.round(apps.filter(a => ["screen","interview","offer"].includes(a.status)).length / apps.filter(a => a.status !== "wishlist").length * 100) : 0;

  if (!loading && dbError === "setup") return (
    <div style={{ maxWidth:"600px", margin:"0 auto", padding:"64px 24px", textAlign:"center" }}>
      <div style={{ width:"56px", height:"56px", borderRadius:"16px", background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px", margin:"0 auto 20px" }}>⚙</div>
      <h2 style={{ fontSize:"18px", fontWeight:700, color:"#fff", marginBottom:"8px" }}>One-time setup needed</h2>
      <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.4)", marginBottom:"20px" }}>Run this SQL in your Supabase SQL Editor to enable the tracker.</p>
      <div style={{ textAlign:"left", borderRadius:"12px", padding:"16px", background:"rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.08)", color:"#a5b4fc", fontFamily:"monospace", fontSize:"12px", lineHeight:1.7, overflowX:"auto", marginBottom:"20px" }}>
        {`create table if not exists ats_applications (\n  id uuid primary key default gen_random_uuid(),\n  company text not null, role text not null,\n  status text not null default 'wishlist',\n  ats_score integer, job_url text, notes text,\n  salary_range text, applied_date date, resume_id uuid,\n  user_id uuid references auth.users(id),\n  created_at timestamptz default now()\n);`}
      </div>
      <div style={{ display:"flex", gap:"12px", justifyContent:"center" }}>
        <button onClick={() => { setDbError(null); setLoading(true); fetchApps(); }}
          style={{ padding:"10px 20px", borderRadius:"10px", background:"linear-gradient(135deg,#6366f1,#a855f7)", color:"#fff", fontWeight:600, fontSize:"13px", border:"none", cursor:"pointer" }}>
          I ran it — retry
        </button>
        <button onClick={onBack}
          style={{ padding:"10px 20px", borderRadius:"10px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)", fontSize:"13px", cursor:"pointer" }}>
          ← Back
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:0 }}>

      {/* ── Header ── */}
      <div style={{ padding: isMobile ? "16px 16px 12px" : "20px 24px 16px", flexShrink:0, borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
          <h2 style={{ fontSize: isMobile ? "16px" : "20px", fontWeight:800, color:"#fff" }}>Application Tracker</h2>
          <button onClick={() => openAdd()}
            style={{ display:"flex", alignItems:"center", gap:"6px", padding: isMobile ? "7px 12px" : "8px 16px", borderRadius:"10px", background:"linear-gradient(135deg,#6366f1,#a855f7)", color:"#fff", fontWeight:600, fontSize:"12px", border:"none", cursor:"pointer" }}>
            + Add
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${isMobile ? 2 : 4}, 1fr)`, gap:"8px", marginBottom:"14px" }}>
          {[
            { label:"Total",     val:apps.length,   color:"#a5b4fc" },
            { label:"Active",    val:active,         color:"#60a5fa" },
            { label:"Offers",    val:offers,         color:"#4ade80" },
            { label:"Response",  val:`${rr}%`,       color:"#fbbf24" },
          ].map(s => (
            <div key={s.label} style={{ borderRadius:"10px", padding: isMobile ? "10px 12px" : "12px 16px", textAlign:"center", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: isMobile ? "18px" : "22px", fontWeight:800, color:s.color, lineHeight:1 }}>{s.val}</p>
              <p style={{ fontSize:"10px", color:"rgba(255,255,255,0.35)", marginTop:"3px" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"13px", color:"rgba(255,255,255,0.25)" }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or role..."
            style={{ ...inputStyle, paddingLeft:"32px" }}
            onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
        </div>

        {/* Mobile tab strip */}
        {isMobile && (
          <div style={{ display:"flex", gap:"6px", marginTop:"12px", overflowX:"auto", paddingBottom:"2px" }}>
            {[{ id:"all" as const, label:"All", color:"#a5b4fc" }, ...COLUMNS].map(c => (
              <button key={c.id} onClick={() => setMobileTab(c.id as AppStatus | "all")}
                style={{
                  flexShrink:0, padding:"4px 10px", borderRadius:"99px", fontSize:"11px", fontWeight:600, border:"none", cursor:"pointer",
                  background: mobileTab === c.id ? `${"color" in c ? c.color : "#a5b4fc"}22` : "rgba(255,255,255,0.04)",
                  color: mobileTab === c.id ? ("color" in c ? c.color : "#a5b4fc") : "rgba(255,255,255,0.4)",
                  outline: mobileTab === c.id ? `1px solid ${"color" in c ? c.color : "#a5b4fc"}44` : "none",
                }}>
                {c.label} {c.id !== "all" ? `(${apps.filter(a => a.status === c.id).length})` : `(${apps.length})`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Board ── */}
      {loading ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:"2px solid rgba(99,102,241,0.3)", borderTopColor:"#6366f1", margin:"0 auto 12px", animation:"spin 0.8s linear infinite" }} />
            <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.3)" }}>Loading...</p>
          </div>
        </div>
      ) : isMobile ? (
        /* ── Mobile list view ── */
        <div style={{ flex:1, overflowY:"auto" }}>
          {filtered.filter(a => mobileTab === "all" || a.status === mobileTab).length === 0 ? (
            <div style={{ padding:"48px 24px", textAlign:"center" }}>
              <p style={{ fontSize:"13px", color:"rgba(255,255,255,0.25)" }}>No applications yet</p>
              <button onClick={() => openAdd()} style={{ marginTop:"12px", padding:"8px 18px", borderRadius:"9px", background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)", color:"#a5b4fc", fontSize:"12px", cursor:"pointer" }}>
                + Add your first
              </button>
            </div>
          ) : (
            filtered
              .filter(a => mobileTab === "all" || a.status === mobileTab)
              .map(app => (
                <MobileRow key={app.id} app={app} onEdit={openEdit} onMove={handleMove} onDelete={handleDelete} />
              ))
          )}
        </div>
      ) : (
        /* ── Desktop Kanban ── */
        <div style={{ flex:1, overflowX:"auto", overflowY:"hidden", padding:"0 24px 24px" }}>
          <div style={{ display:"flex", gap:"12px", height:"100%", minHeight:"400px", paddingTop:"16px" }}>
            {COLUMNS.map(col => {
              const colApps = filtered.filter(a => a.status === col.id);
              const isOver = dragOverCol === col.id;
              return (
                <div key={col.id}
                  style={{
                    flex:1, minWidth:"160px", maxWidth:"280px", display:"flex", flexDirection:"column",
                    borderRadius:"16px", overflow:"hidden",
                    background: isOver ? col.glow : "rgba(255,255,255,0.015)",
                    border:`1px solid ${isOver ? col.color + "50" : "rgba(255,255,255,0.06)"}`,
                    transition:"all 0.15s",
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={() => { if (dragId) handleMove(dragId, col.id); setDragId(null); setDragOverCol(null); }}
                >
                  {/* Column header */}
                  <div style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                      <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:col.color, flexShrink:0 }} />
                      <span style={{ fontSize:"12px", fontWeight:600, color:"rgba(255,255,255,0.75)" }}>{col.label}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      <span style={{ fontSize:"10px", fontWeight:700, padding:"1px 6px", borderRadius:"99px", background:`${col.color}20`, color:col.color }}>{colApps.length}</span>
                      <button onClick={() => openAdd(col.id)}
                        style={{ width:"18px", height:"18px", borderRadius:"5px", border:"none", cursor:"pointer", fontSize:"12px", color:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                    </div>
                  </div>

                  {/* Cards */}
                  <div style={{ flex:1, overflowY:"auto", padding:"8px", display:"flex", flexDirection:"column", gap:"7px" }}>
                    {colApps.length === 0 && (
                      <div style={{ borderRadius:"10px", padding:"16px", textAlign:"center", border:`1px dashed ${isOver ? col.color + "50" : "rgba(255,255,255,0.06)"}` }}>
                        <p style={{ fontSize:"11px", color:"rgba(255,255,255,0.18)" }}>{isOver ? "Drop here" : "Empty"}</p>
                      </div>
                    )}
                    {colApps.map(app => (
                      <AppCard key={app.id} app={app} col={col}
                        onMove={handleMove} onEdit={openEdit} onDelete={handleDelete}
                        isDragOver={false}
                        onDragStart={() => setDragId(app.id)}
                        onDragEnd={() => { setDragId(null); setDragOverCol(null); }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)" }}>
          <div style={{ width:"100%", maxWidth:"480px", borderRadius:"20px", padding:"24px", background:"#0f0f1e", border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 32px 80px rgba(0,0,0,0.7)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
              <h3 style={{ fontSize:"15px", fontWeight:700, color:"#fff" }}>{editApp ? "Edit Application" : "Add Application"}</h3>
              <button onClick={closeModal} style={{ width:"28px", height:"28px", borderRadius:"8px", border:"none", cursor:"pointer", fontSize:"14px", color:"rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.06)" }}>✕</button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                <F label="Company *">
                  <input value={form.company} onChange={e => setForm(f => ({...f, company:e.target.value}))}
                    placeholder="Stripe" autoFocus style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
                </F>
                <F label="Role *">
                  <input value={form.role} onChange={e => setForm(f => ({...f, role:e.target.value}))}
                    placeholder="Senior Engineer" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
                </F>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                <F label="Stage">
                  <select value={form.status} onChange={e => setForm(f => ({...f, status:e.target.value as AppStatus}))}
                    style={{...inputStyle, cursor:"pointer"}}>
                    {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </F>
                <F label="Salary Range">
                  <input value={form.salary_range} onChange={e => setForm(f => ({...f, salary_range:e.target.value}))}
                    placeholder="$120k–$150k" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
                </F>
              </div>
              <F label="Job URL">
                <input value={form.job_url} onChange={e => setForm(f => ({...f, job_url:e.target.value}))}
                  placeholder="https://..." style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
              </F>
              <F label="Notes">
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))}
                  placeholder="Recruiter name, referral, key requirements..." rows={3}
                  style={{...inputStyle, resize:"vertical", lineHeight:1.6}}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
              </F>
            </div>

            <div style={{ display:"flex", gap:"10px", marginTop:"20px" }}>
              <button onClick={closeModal}
                style={{ flex:1, padding:"10px", borderRadius:"10px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.45)", fontSize:"13px", cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={!form.company.trim() || !form.role.trim() || saving}
                style={{ flex:1, padding:"10px", borderRadius:"10px", background:"linear-gradient(135deg,#6366f1,#a855f7)", color:"#fff", fontWeight:600, fontSize:"13px", border:"none", cursor:"pointer", opacity:(!form.company.trim() || !form.role.trim() || saving) ? 0.4 : 1 }}>
                {saving ? "Saving..." : editApp ? "Save Changes" : "Add Application"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
