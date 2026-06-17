"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Column config ──────────────────────────────────────────────────────────

const COLUMNS: { id: AppStatus; label: string; icon: string; color: string; glow: string }[] = [
  { id: "wishlist",  label: "Wishlist",     icon: "★",  color: "#6366f1", glow: "rgba(99,102,241,0.15)" },
  { id: "applied",   label: "Applied",      icon: "↑",  color: "#3b82f6", glow: "rgba(59,130,246,0.15)" },
  { id: "screen",    label: "Phone Screen", icon: "◎",  color: "#f59e0b", glow: "rgba(245,158,11,0.15)"  },
  { id: "interview", label: "Interview",    icon: "⚡", color: "#f97316", glow: "rgba(249,115,22,0.15)"  },
  { id: "offer",     label: "Offer",        icon: "✦",  color: "#22c55e", glow: "rgba(34,197,94,0.15)"  },
  { id: "rejected",  label: "Rejected",     icon: "✕",  color: "#6b7280", glow: "rgba(107,114,128,0.1)" },
];

const EMPTY_FORM = {
  company: "", role: "", status: "wishlist" as AppStatus,
  job_url: "", notes: "", salary_range: "", applied_date: "",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function scoreColor(s: number) {
  return s >= 70 ? "#22c55e" : s >= 50 ? "#eab308" : "#ef4444";
}

function companyInitial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

const AVATAR_COLORS = ["#6366f1","#8b5cf6","#ec4899","#3b82f6","#06b6d4","#10b981","#f59e0b","#ef4444"];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Sub-components ─────────────────────────────────────────────────────────

function AppCard({
  app, col, onMove, onEdit, onDelete, isDragOver, onDragStart, onDragEnd,
}: {
  app: Application;
  col: typeof COLUMNS[0];
  onMove: (id: string, status: AppStatus) => void;
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nextCols = COLUMNS.filter((c) => c.id !== app.status);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="rounded-xl p-3.5 cursor-grab active:cursor-grabbing group relative transition-all duration-150"
      style={{
        background: isDragOver ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${isDragOver ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}`,
        transform: isDragOver ? "scale(1.02)" : "scale(1)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: avatarColor(app.company) }}
        >
          {companyInitial(app.company)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">{app.company}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{app.role}</p>
        </div>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md transition-all"
          style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }}
        >⋯</button>
      </div>

      {/* Context menu */}
      {menuOpen && (
        <div
          className="absolute right-2 top-10 z-20 rounded-xl py-1.5 min-w-[160px] shadow-2xl"
          style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)" }}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.3)" }}>Move to</p>
          {nextCols.map((c) => (
            <button key={c.id} onClick={() => { onMove(app.id, c.id); setMenuOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
              style={{ color: c.color }}>
              {c.icon} {c.label}
            </button>
          ))}
          <div className="my-1 mx-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />
          <button onClick={() => { onEdit(app); setMenuOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.6)" }}>
            ✎ Edit details
          </button>
          <button onClick={() => { onDelete(app.id); setMenuOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/5 text-red-400">
            ✕ Delete
          </button>
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {app.ats_score != null && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ color: scoreColor(app.ats_score), background: `${scoreColor(app.ats_score)}18` }}>
            {app.ats_score}
          </span>
        )}
        {app.salary_range && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)" }}>
            {app.salary_range}
          </span>
        )}
        <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          {timeAgo(app.created_at)}
        </span>
      </div>

      {/* Notes preview */}
      {app.notes && (
        <p className="text-xs mt-2 line-clamp-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
          {app.notes}
        </p>
      )}

      {/* Links row */}
      {app.job_url && (
        <a href={app.job_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs mt-2 transition-colors hover:text-indigo-300"
          style={{ color: "rgba(99,102,241,0.7)" }}
          onClick={(e) => e.stopPropagation()}>
          ↗ View posting
        </a>
      )}
    </div>
  );
}

// ── Main TrackerView ───────────────────────────────────────────────────────

export default function TrackerView({ onBack }: { onBack: () => void }) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForStatus, setAddForStatus] = useState<AppStatus>("wishlist");
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<AppStatus | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<AppStatus | "all">("all");

  const fetchApps = useCallback(async () => {
    const res = await fetch("/api/applications");
    if (!res.ok) {
      const data = await res.json();
      // Table might not exist yet
      if (res.status === 500 && data.error?.includes("does not exist")) {
        setDbError("setup");
      } else {
        setDbError(data.error ?? "Failed to load");
      }
      setLoading(false);
      return;
    }
    const data = await res.json();
    setApps(data);
    setDbError(null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  async function handleSave() {
    if (!form.company.trim() || !form.role.trim()) return;
    setSaving(true);
    const method = editApp ? "PATCH" : "POST";
    const url = editApp ? `/api/applications/${editApp.id}` : "/api/applications";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ats_score: null }),
    });
    if (res.ok) {
      await fetchApps();
      setShowAddModal(false);
      setEditApp(null);
      setForm(EMPTY_FORM);
    }
    setSaving(false);
  }

  async function handleMove(id: string, status: AppStatus) {
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function handleDelete(id: string) {
    setApps((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
  }

  function openEdit(app: Application) {
    setEditApp(app);
    setForm({
      company: app.company, role: app.role, status: app.status,
      job_url: app.job_url ?? "", notes: app.notes ?? "",
      salary_range: app.salary_range ?? "", applied_date: app.applied_date ?? "",
    });
    setShowAddModal(true);
  }

  function openAdd(status: AppStatus) {
    setEditApp(null);
    setForm({ ...EMPTY_FORM, status });
    setAddForStatus(status);
    setShowAddModal(true);
  }

  // Drag handlers
  function onDragStart(id: string) { setDragId(id); }
  function onDragEnd() { setDragId(null); setDragOverCol(null); }
  function onDragOver(e: React.DragEvent, col: AppStatus) {
    e.preventDefault();
    setDragOverCol(col);
  }
  function onDrop(col: AppStatus) {
    if (dragId) handleMove(dragId, col);
    setDragId(null);
    setDragOverCol(null);
  }

  // Filtered apps
  const filtered = apps.filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
    const matchesFilter = filterStatus === "all" || a.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const active = apps.filter((a) => ["applied", "screen", "interview"].includes(a.status)).length;
  const offers = apps.filter((a) => a.status === "offer").length;
  const responseRate = apps.filter((a) => a.status !== "wishlist").length > 0
    ? Math.round((apps.filter((a) => ["screen","interview","offer"].includes(a.status)).length / apps.filter((a) => a.status !== "wishlist").length) * 100)
    : 0;

  // ── DB setup required ──
  if (!loading && dbError === "setup") {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto"
          style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>⚙</div>
        <div>
          <h2 className="text-xl font-bold text-white">One-time setup needed</h2>
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>
            Run this SQL once in your Supabase SQL Editor to enable the tracker.
          </p>
        </div>
        <div className="text-left rounded-xl p-4 font-mono text-xs leading-relaxed overflow-x-auto"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", color: "#a5b4fc" }}>
{`create table if not exists ats_applications (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  status text not null default 'wishlist'
    check (status in ('wishlist','applied','screen',
                      'interview','offer','rejected')),
  ats_score integer,
  job_url text,
  notes text,
  salary_range text,
  applied_date date,
  resume_id uuid,
  created_at timestamptz default now()
);`}
        </div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          Go to <span className="text-indigo-400">Supabase Dashboard → SQL Editor</span> → paste → Run
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setDbError(null); setLoading(true); fetchApps(); }}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
            I ran it — try again
          </button>
          <button onClick={onBack} className="px-5 py-2.5 rounded-xl text-sm transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4 flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>← Home</button>
            <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.1)" }} />
            <h2 className="text-xl font-bold text-white">Application Tracker</h2>
          </div>
          <button
            onClick={() => openAdd("wishlist")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
            + Add Application
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: apps.length, color: "#a5b4fc" },
            { label: "Active", value: active, color: "#60a5fa" },
            { label: "Offers", value: offers, color: "#4ade80" },
            { label: "Response Rate", value: `${responseRate}%`, color: "#fbbf24" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl px-4 py-3 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>⌕</span>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or role..."
              className="w-full pl-7 pr-3 py-2 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
            />
          </div>
          <select
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as AppStatus | "all")}
            className="rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: filterStatus === "all" ? "rgba(255,255,255,0.5)" : "white" }}>
            <option value="all">All stages</option>
            {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* ── Kanban board ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Loading tracker...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-5 pb-6">
          <div className="flex gap-3 h-full" style={{ minWidth: `${COLUMNS.length * 220}px` }}>
            {COLUMNS.map((col) => {
              const colApps = filtered.filter((a) => a.status === col.id);
              const isOver = dragOverCol === col.id;
              return (
                <div
                  key={col.id}
                  className="flex flex-col rounded-2xl overflow-hidden transition-all"
                  style={{
                    width: "220px",
                    minWidth: "220px",
                    background: isOver ? col.glow : "rgba(255,255,255,0.015)",
                    border: `1px solid ${isOver ? col.color + "60" : "rgba(255,255,255,0.06)"}`,
                  }}
                  onDragOver={(e) => onDragOver(e, col.id)}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={() => onDrop(col.id)}
                >
                  {/* Column header */}
                  <div className="px-3 py-3 flex items-center justify-between flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: col.color }}>{col.icon}</span>
                      <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{col.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: `${col.color}20`, color: col.color }}>
                        {colApps.length}
                      </span>
                      <button
                        onClick={() => openAdd(col.id)}
                        className="w-5 h-5 rounded flex items-center justify-center text-xs transition-colors hover:text-white"
                        style={{ color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)" }}>
                        +
                      </button>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {colApps.length === 0 && (
                      <div
                        className="rounded-xl p-4 text-center transition-colors"
                        style={{ border: `1px dashed ${isOver ? col.color + "60" : "rgba(255,255,255,0.06)"}` }}>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                          {isOver ? "Drop here" : "No applications"}
                        </p>
                      </div>
                    )}
                    {colApps.map((app) => (
                      <AppCard
                        key={app.id}
                        app={app}
                        col={col}
                        onMove={handleMove}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        isDragOver={false}
                        onDragStart={() => onDragStart(app.id)}
                        onDragEnd={onDragEnd}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl"
            style={{ background: "#0f0f1e", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editApp ? "Edit Application" : "Add Application"}
              </h3>
              <button onClick={() => { setShowAddModal(false); setEditApp(null); setForm(EMPTY_FORM); }}
                className="text-gray-500 hover:text-gray-300 text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Company *</label>
                  <input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Stripe" autoFocus
                    className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Role *</label>
                  <input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    placeholder="Senior Engineer"
                    className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Stage</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as AppStatus }))}
                    className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Salary Range</label>
                  <input value={form.salary_range} onChange={(e) => setForm((f) => ({ ...f, salary_range: e.target.value }))}
                    placeholder="$120k–$150k"
                    className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                </div>
              </div>

              <div>
                <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Job URL</label>
                <input value={form.job_url} onChange={(e) => setForm((f) => ({ ...f, job_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              </div>

              <div>
                <label className="text-xs block mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Recruiter name, referral, key requirements, follow-up date..."
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowAddModal(false); setEditApp(null); setForm(EMPTY_FORM); }}
                className="flex-1 py-2.5 rounded-xl text-sm transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={!form.company.trim() || !form.role.trim() || saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                {saving ? "Saving..." : editApp ? "Save Changes" : "Add Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
