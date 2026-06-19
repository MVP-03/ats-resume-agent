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

interface RedditPost {
  title: string;
  url: string;
  permalink: string;
  score: number;
  author: string;
  created_utc: number;
  num_comments: number;
  subreddit: string;
}

interface ArxivPaper {
  title: string;
  link: string;
  description: string;
  authors: string;
  published: string;
}

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

interface NewsData {
  hackernews: HNStory[];
  devto: DevToArticle[];
  github: GithubRepo[];
  reddit: RedditPost[];
  arxiv: ArxivPaper[];
  technews: RSSItem[];
  fetchedAt: number;
}

type TabId = "hackernews" | "devto" | "github" | "reddit" | "arxiv" | "technews";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5",
  Rust: "#dea584", Go: "#00ADD8", Java: "#b07219", "C++": "#f34b7d",
  C: "#555555", "C#": "#178600", Swift: "#F05138", Kotlin: "#A97BFF",
  Ruby: "#701516", PHP: "#777BB4", Shell: "#89e051", Dockerfile: "#384d54",
};

const SUB_COLORS: Record<string, string> = {
  LocalLLaMA: "#ff6314",
  MachineLearning: "#0079d3",
  artificial: "#46d160",
  singularity: "#a855f7",
  mlscaling: "#06b6d4",
};

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function ExternalIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
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
    <svg width="14" height="14" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="3" fill="#3d3d3d"/>
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

function RedditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF4500">
      <circle cx="12" cy="12" r="12"/>
      <path fill="white" d="M20 12a2 2 0 0 0-2-2 2 2 0 0 0-1.4.6A9.9 9.9 0 0 0 12.5 9l.8-3.8 2.6.5a1.5 1.5 0 1 0 .2-.9l-2.9-.6L12 8.1a9.9 9.9 0 0 0-4.2 1.5A2 2 0 0 0 4 12a2 2 0 0 0 1 1.7 3.6 3.6 0 0 0 0 .5c0 2.6 3.1 4.8 6.8 4.8s6.8-2.2 6.8-4.8a3.6 3.6 0 0 0 0-.5A2 2 0 0 0 20 12zm-11 1.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm5.6 2.7a3.6 3.6 0 0 1-2.4.7 3.6 3.6 0 0 1-2.4-.7.2.2 0 0 1 .3-.3 3.2 3.2 0 0 0 2.1.6 3.2 3.2 0 0 0 2.1-.6.2.2 0 0 1 .3.3zm-.2-1.7a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
    </svg>
  );
}

function ArxivIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#b31b1b"/>
      <text x="12" y="17" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="serif">ar</text>
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
      <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
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

function UpvoteIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#FF4500" }}>
      <path d="M12 4l8 8h-6v8H10v-8H4z"/>
    </svg>
  );
}

const TABS: { id: TabId; label: string; icon: React.ReactNode; dataKey: keyof Omit<NewsData, "fetchedAt"> }[] = [
  { id: "hackernews", label: "Hacker News", icon: <HNIcon />, dataKey: "hackernews" },
  { id: "devto", label: "Dev.to", icon: <DevToIcon />, dataKey: "devto" },
  { id: "github", label: "GitHub", icon: <GitHubIcon />, dataKey: "github" },
  { id: "reddit", label: "AI & Models", icon: <RedditIcon />, dataKey: "reddit" },
  { id: "arxiv", label: "Research", icon: <ArxivIcon />, dataKey: "arxiv" },
  { id: "technews", label: "Tech News", icon: <NewsIcon />, dataKey: "technews" },
];

function EmptyState({ label }: { label: string }) {
  return (
    <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--t2)", fontSize: "13px" }}>
      {label}
    </div>
  );
}

const REDDIT_SUBS = ["LocalLLaMA", "MachineLearning", "artificial", "singularity", "mlscaling"];

async function fetchRedditBrowser(): Promise<RedditPost[]> {
  const results = await Promise.allSettled(
    REDDIT_SUBS.map((sub) =>
      fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=25`, {
        headers: { Accept: "application/json" },
      }).then((r) => r.json())
    )
  );
  const posts: RedditPost[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const child of result.value?.data?.children ?? []) {
      const p = child?.data;
      if (!p?.title || seen.has(p.id) || (p.score ?? 0) < 5) continue;
      seen.add(p.id);
      posts.push({
        title: p.title,
        url: p.url?.startsWith("http") ? p.url : `https://reddit.com${p.permalink}`,
        permalink: `https://reddit.com${p.permalink}`,
        score: p.score ?? 0,
        author: p.author ?? "",
        created_utc: p.created_utc ?? 0,
        num_comments: p.num_comments ?? 0,
        subreddit: p.subreddit ?? "",
      });
    }
  }
  return posts.sort((a, b) => b.score - a.score).slice(0, 30);
}

export default function NewsView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<TabId>("hackernews");
  const [data, setData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([]);
  const [redditLoading, setRedditLoading] = useState(false);

  async function fetchReddit() {
    setRedditLoading(true);
    try {
      setRedditPosts(await fetchRedditBrowser());
    } catch {
      setRedditPosts([]);
    } finally {
      setRedditLoading(false);
    }
  }

  async function fetchNews() {
    setLoading(true);
    setError("");
    fetchReddit();
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
  const activeTab = TABS.find((t) => t.id === tab)!;
  const count = data ? (data[activeTab.dataKey] ?? []).length : 0;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: "20px" }} className="animate-fadeUp">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "var(--t1)", marginBottom: "4px" }}>Tech News Feed</h2>
          <p style={{ fontSize: "13px", color: "var(--t2)" }}>
            HN · Dev.to · GitHub · Reddit AI · arXiv · Ars Technica &amp; more
          </p>
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

      {/* Tabs — scrollable on mobile */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div className="tab-bar" style={{ minWidth: "max-content" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`tab${tab === t.id ? " active" : ""}`}>
              {t.icon}
              {t.label}
              {(data || t.id === "reddit") && (
                <span style={{ fontSize: "10px", fontFamily: "var(--font-geist-mono)", color: "var(--t3)", marginLeft: "2px" }}>
                  ({t.id === "reddit" ? redditPosts.length : (data ? (data[t.dataKey] ?? []).length : 0)})
                </span>
              )}
            </button>
          ))}
        </div>
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

      {/* Content */}
      {(!loading || data) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* Hacker News */}
          {tab === "hackernews" && (
            <>
              {count === 0 && !loading ? <EmptyState label="No stories loaded" /> : null}
              {(data?.hackernews ?? []).map((story, idx) => (
                <a key={story.id} href={story.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "14px 18px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-geist-mono)", color: "var(--t3)", minWidth: "20px", paddingTop: "2px", textAlign: "right" }}>{idx + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", lineHeight: 1.4, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {story.title}
                        <ExternalIcon />
                      </p>
                      <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: "var(--t2)", flexWrap: "wrap" }}>
                        <span style={{ color: "#FF6600", fontWeight: 600 }}>▲ {story.score}</span>
                        <span>{story.by}</span>
                        <span>{story.descendants ?? 0} comments</span>
                        <span>{timeAgo(story.time)}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </>
          )}

          {/* Dev.to */}
          {tab === "devto" && (
            <>
              {count === 0 && !loading ? <EmptyState label="No articles loaded" /> : null}
              {(data?.devto ?? []).map((article) => (
                <a key={article.id} href={article.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "14px 18px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", marginBottom: "5px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
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
            </>
          )}

          {/* GitHub Trending */}
          {tab === "github" && (
            <>
              {count === 0 && !loading ? <EmptyState label="GitHub Trending unavailable" /> : null}
              {(data?.github ?? []).map((repo) => (
                <a key={repo.fullName} href={repo.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div style={{ color: "var(--t3)", paddingTop: "2px", flexShrink: 0 }}><GitHubIcon /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
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
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: LANG_COLORS[repo.language] || "#8b949e", display: "inline-block", flexShrink: 0 }} />
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
            </>
          )}

          {/* AI & Models (Reddit — fetched client-side to avoid server IP blocks) */}
          {tab === "reddit" && (
            <>
              {redditLoading && redditPosts.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="card" style={{ padding: "16px 20px", opacity: 0.5 }}>
                      <div style={{ height: "14px", borderRadius: "6px", background: "var(--s3)", width: `${60 + i * 5}%`, marginBottom: "8px" }} />
                      <div style={{ height: "10px", borderRadius: "4px", background: "var(--s3)", width: "30%" }} />
                    </div>
                  ))}
                </div>
              )}
              {!redditLoading && redditPosts.length === 0 && (
                <EmptyState label="Could not load Reddit AI communities — try refreshing" />
              )}
              {redditPosts.map((post) => (
                <a key={post.permalink} href={post.permalink} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "14px 18px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", marginBottom: "6px", lineHeight: 1.4, display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <span style={{ flex: 1 }}>{post.title}</span>
                      <ExternalIcon />
                    </p>
                    <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--t2)", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "3px", fontWeight: 600, color: "#FF4500" }}>
                        <UpvoteIcon /> {post.score.toLocaleString()}
                      </span>
                      <span>{post.num_comments} comments</span>
                      <span style={{
                        padding: "1px 7px", borderRadius: "99px", fontSize: "10px", fontWeight: 600,
                        background: `${SUB_COLORS[post.subreddit] || "#6366f1"}22`,
                        color: SUB_COLORS[post.subreddit] || "#6366f1",
                        border: `1px solid ${SUB_COLORS[post.subreddit] || "#6366f1"}44`,
                      }}>
                        r/{post.subreddit}
                      </span>
                      <span>{timeAgo(post.created_utc)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </>
          )}

          {/* Research (ArXiv) */}
          {tab === "arxiv" && (
            <>
              {count === 0 && !loading ? <EmptyState label="Could not load arXiv papers" /> : null}
              {(data?.arxiv ?? []).map((paper, idx) => (
                <a key={paper.link || idx} href={paper.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "14px 18px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", marginBottom: "5px", lineHeight: 1.4, display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <span style={{ flex: 1 }}>{paper.title}</span>
                      <ExternalIcon />
                    </p>
                    {paper.description && (
                      <p style={{ fontSize: "12px", color: "var(--t2)", marginBottom: "7px", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {paper.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--t3)", flexWrap: "wrap", alignItems: "center" }}>
                      {paper.authors && (
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "300px" }}>
                          {paper.authors}
                        </span>
                      )}
                      {paper.published && <span>{formatDate(paper.published)}</span>}
                      <span style={{ padding: "1px 6px", borderRadius: "4px", background: "rgba(179,27,27,0.1)", color: "#b31b1b", border: "1px solid rgba(179,27,27,0.2)", fontSize: "10px", fontWeight: 600 }}>
                        arXiv
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </>
          )}

          {/* Tech News (RSS) */}
          {tab === "technews" && (
            <>
              {count === 0 && !loading ? <EmptyState label="Could not load tech news feeds" /> : null}
              {(data?.technews ?? []).map((item, idx) => (
                <a key={item.link || idx} href={item.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div className="card card-hover" style={{ padding: "14px 18px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--t1)", marginBottom: "5px", lineHeight: 1.4, display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <span style={{ flex: 1 }}>{item.title}</span>
                      <ExternalIcon />
                    </p>
                    {item.description && (
                      <p style={{ fontSize: "12px", color: "var(--t2)", marginBottom: "7px", lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {item.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "var(--t3)", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ padding: "1px 7px", borderRadius: "4px", background: "rgba(99,102,241,0.08)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", fontSize: "10px", fontWeight: 600 }}>
                        {item.source}
                      </span>
                      {item.pubDate && <span>{formatDate(item.pubDate)}</span>}
                    </div>
                  </div>
                </a>
              ))}
            </>
          )}

        </div>
      )}
    </div>
  );
}
