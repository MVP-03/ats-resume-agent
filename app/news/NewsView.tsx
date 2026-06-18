"use client";
import { useState, useEffect } from "react";

interface HNStory {
  id: number;
  title: string;
  url: string;
  score: number;
  by: string;
  time: number;
  descendants: number;
}

interface DevToArticle {
  id: number;
  title: string;
  url: string;
  description: string;
  tag_list: string[];
  public_reactions_count: number;
  reading_time_minutes: number;
  user: { name: string };
  published_at: string;
}

interface GithubRepo {
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: string;
  url: string;
}

interface NewsData {
  hackernews: HNStory[];
  devto: DevToArticle[];
  github: GithubRepo[];
  fetchedAt: number;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
  C: "#555555", "C#": "#178600", Swift: "#F05138", Kotlin: "#A97BFF",
  Ruby: "#701516", PHP: "#777BB4", Shell: "#89e051", Dockerfile: "#384d54",
};

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ExternalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
}

function HNIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="#FF6600">
      <rect width="32" height="32" rx="4"/>
      <text x="16" y="22" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Verdana">Y</text>
    </svg>
  );
}

function DevToIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#3d3d3d">
      <path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6l.02 2.44.04 2.45.56-.02c.41 0 .63-.07.83-.26.24-.24.26-.36.26-2.2 0-1.91-.02-1.96-.29-2.18zM0 4.94v14.12h24V4.94H0zM8.56 15.3c-.44.58-1.06.77-2.53.77H4.71V8.53h1.4c1.67 0 2.16.18 2.6.9.27.43.29.6.32 2.57.05 2.23-.02 2.73-.47 3.3zm5.09-5.47h-2.47v1.77h1.52v1.28l-.72.04-.75.03v1.77l1.22.03 1.2.04v1.28h-1.6c-1.53 0-1.6-.01-1.87-.3l-.3-.28v-3.16c0-3.02.01-3.18.25-3.48.23-.31.25-.31 1.88-.31h1.64v1.28zm4.68 5.45c-.17.43-.64.79-1 .79-.18 0-.45-.15-.67-.39-.32-.32-.45-.63-.82-2.08l-.9-3.39-.45-1.67h.76c.4 0 .75.02.75.05 0 .06 1.16 4.54 1.26 4.83.04.15.32-.7.73-2.3l.66-2.52.74-.04c.4-.02.73 0 .73.04 0 .14-1.67 6.38-1.8 6.68z" fill="white"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#f59e0b" }}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}

const TABS = [
  { id: "hackernews" as const, label: "Hacker News", icon: <HNIcon /> },
  { id: "devto" as const, label: "Dev.to", icon: <DevToIcon /> },
  { id: "github" as const, label: "GitHub Trending", icon: <GitHubIcon /> },
];

export default function NewsView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"hackernews" | "devto" | "github">("hackernews");
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchNews() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/news");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Failed to load news");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchNews(); }, []);

  const ago = data ? Math.round((Date.now() - data.fetchedAt) / 60000) : 0;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: "20px" }} className="animate-fadeUp">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>Tech News Feed</h2>
          <p style={{ fontSize: "13px", color: "var(--t2)" }}>HackerNews · Dev.to · GitHub Trending — aggregated in one place.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {data && (
            <span style={{ fontSize: "11px", color: "var(--t3)" }}>
              {ago < 1 ? "just now" : `${ago}m ago`}
            </span>
          )}
          <button onClick={fetchNews} disabled={loading} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <RefreshIcon />
            Refresh
          </button>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: "12px" }}>Home</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", fontSize: "13px", color: "var(--red)" }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab${tab === t.id ? " active" : ""}`}>
            {t.icon}
            {t.label}
            {data && (
              <span style={{ fontSize: "10px", fontFamily: "var(--font-geist-mono)", color: "var(--t3)", marginLeft: "2px" }}>
                {tab === t.id
                  ? `(${(data[t.id] ?? []).length})`
                  : `(${(data[t.id] ?? []).length})`}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && !data && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ padding: "16px 20px", opacity: 0.5 }}>
              <div style={{ height: "14px", borderRadius: "6px", background: "var(--s3)", width: `${60 + i * 5}%`, marginBottom: "8px" }} />
              <div style={{ height: "10px", borderRadius: "4px", background: "var(--s3)", width: "30%" }} />
            </div>
          ))}
        </div>
      )}

      {/* Hacker News */}
      {!loading || data ? (
        <>
          {tab === "hackernews" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(data?.hackernews ?? []).length === 0 && !loading && (
                <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--t2)", fontSize: "13px" }}>No stories loaded</div>
              )}
              {(data?.hackernews ?? []).map((story, idx) => (
                <a key={story.id} href={story.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "14px 18px", display: "flex", gap: "14px", alignItems: "flex-start", cursor: "pointer" }}>
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-geist-mono)", color: "var(--t3)", minWidth: "20px", paddingTop: "1px", textAlign: "right" }}>{idx + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", lineHeight: 1.4, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                        {story.title}
                        <ExternalIcon />
                      </p>
                      <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: "var(--t2)" }}>
                        <span style={{ color: "#FF6600", fontWeight: 600 }}>▲ {story.score}</span>
                        <span>{story.by}</span>
                        <span>{story.descendants ?? 0} comments</span>
                        <span>{timeAgo(story.time)}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Dev.to */}
          {tab === "devto" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(data?.devto ?? []).length === 0 && !loading && (
                <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--t2)", fontSize: "13px" }}>No articles loaded</div>
              )}
              {(data?.devto ?? []).map((article) => (
                <a key={article.id} href={article.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "14px 18px", cursor: "pointer" }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px" }}>
                      {article.title}
                      <ExternalIcon />
                    </p>
                    {article.description && (
                      <p style={{ fontSize: "12px", color: "var(--t2)", marginBottom: "8px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {article.description}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--t2)" }}>
                        <span>by {article.user?.name}</span>
                        <span>❤ {article.public_reactions_count}</span>
                        <span>{article.reading_time_minutes} min read</span>
                      </div>
                      {(article.tag_list ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* GitHub Trending */}
          {tab === "github" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(data?.github ?? []).length === 0 && !loading && (
                <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--t2)", fontSize: "13px" }}>GitHub Trending unavailable</div>
              )}
              {(data?.github ?? []).map((repo) => (
                <a key={repo.fullName} href={repo.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: "14px", cursor: "pointer" }}>
                    <div style={{ color: "var(--t3)", paddingTop: "2px" }}><GitHubIcon /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "var(--t2)" }}>{repo.fullName.split("/")[0]}/</span>
                        <span>{repo.name}</span>
                        <ExternalIcon />
                      </p>
                      {repo.description && (
                        <p style={{ fontSize: "12px", color: "var(--t2)", marginBottom: "8px", lineHeight: 1.5 }}>{repo.description}</p>
                      )}
                      <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: "var(--t2)", alignItems: "center" }}>
                        {repo.language && (
                          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: LANG_COLORS[repo.language] || "#8b949e", display: "inline-block" }} />
                            {repo.language}
                          </span>
                        )}
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <StarIcon />
                          {repo.stars}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
