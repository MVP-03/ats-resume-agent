export const runtime = "nodejs";

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
  canonical_url: string;
}

interface GithubRepo {
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: string;
  url: string;
}

// Keywords that indicate non-tech / gaming / lifestyle content to exclude
const EXCLUDE_KEYWORDS = [
  "game", "games", "gaming", "gamer", "steam", "minecraft", "fortnite", "roblox",
  "xbox", "playstation", "nintendo", "esports", "twitch", "streamer",
  "movie", "film", "celebrity", "sports", "nfl", "nba", "soccer", "football",
  "recipe", "food", "travel", "fashion", "music", "artist", "album",
  "meme", "funny", "viral", "tiktok", "instagram", "twitter drama",
  "crypto pump", "nft drop", "metaverse land",
];

// Keywords that confirm hardcore tech content
const INCLUDE_KEYWORDS = [
  "compiler", "kernel", "distributed", "database", "postgres", "mysql", "redis",
  "kubernetes", "docker", "terraform", "aws", "gcp", "azure", "cloud",
  "llm", "ai", "ml", "machine learning", "deep learning", "neural", "transformer",
  "rust", "golang", "typescript", "python", "c++", "wasm", "webassembly",
  "linux", "unix", "open source", "algorithm", "data structure",
  "api", "graphql", "grpc", "microservice", "monolith", "architecture",
  "security", "vulnerability", "cve", "exploit", "zero-day", "encryption",
  "devops", "ci/cd", "observability", "monitoring", "sre", "platform",
  "chip", "cpu", "gpu", "arm", "risc-v", "hardware", "fpga",
  "startup", "vc", "funding", "series", "ipo", "tech company",
  "open source", "github", "programming", "software", "engineer", "developer",
  "framework", "library", "performance", "latency", "throughput", "benchmark",
  "inference", "training", "model", "llama", "gpt", "claude", "gemini",
  "filesystem", "storage", "network", "protocol", "tcp", "http", "dns",
  "container", "vm", "hypervisor", "serverless", "edge", "cdn",
];

function isTechContent(title: string, tags?: string[]): boolean {
  const lower = title.toLowerCase();
  const tagStr = (tags || []).join(" ").toLowerCase();
  const combined = `${lower} ${tagStr}`;

  // Hard exclude
  for (const kw of EXCLUDE_KEYWORDS) {
    if (combined.includes(kw)) return false;
  }

  // For HN/GitHub we're generally OK — just exclude obvious non-tech
  // For dev.to we also check tags
  return true;
}

function isStrongTech(title: string, tags?: string[]): boolean {
  const lower = title.toLowerCase();
  const tagStr = (tags || []).join(" ").toLowerCase();
  const combined = `${lower} ${tagStr}`;

  for (const kw of INCLUDE_KEYWORDS) {
    if (combined.includes(kw)) return true;
  }
  return false;
}

async function fetchHackerNews(): Promise<HNStory[]> {
  try {
    const idsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      signal: AbortSignal.timeout(8000),
    });
    const ids: number[] = await idsRes.json();
    const top50 = ids.slice(0, 50);

    const stories = await Promise.allSettled(
      top50.map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(5000),
        }).then((r) => r.json())
      )
    );

    return stories
      .filter((r): r is PromiseFulfilledResult<HNStory> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((s) => s && (s as HNStory & { type?: string }).type === "story" && s.url && s.title)
      .filter((s) => isTechContent(s.title))
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);
  } catch {
    return [];
  }
}

async function fetchDevTo(): Promise<DevToArticle[]> {
  // Only pull genuinely technical tags
  const TECH_TAGS = ["typescript", "rust", "golang", "python", "devops", "kubernetes",
    "security", "ai", "machinelearning", "database", "backend", "architecture",
    "opensource", "linux", "cloud", "performance", "compiler"];

  try {
    const fetches = TECH_TAGS.slice(0, 6).map((tag) =>
      fetch(`https://dev.to/api/articles?per_page=10&tag=${tag}`, {
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.json())
    );

    const results = await Promise.allSettled(fetches);
    const all: DevToArticle[] = [];

    for (const r of results) {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        all.push(...r.value);
      }
    }

    const seen = new Set<number>();
    return all
      .filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        // Must be a tech article — check title + tags
        if (!isTechContent(a.title, a.tag_list)) return false;
        // Prefer articles with strong tech signal
        return true;
      })
      .sort((a, b) => {
        const aStrong = isStrongTech(a.title, a.tag_list) ? 1 : 0;
        const bStrong = isStrongTech(b.title, b.tag_list) ? 1 : 0;
        if (aStrong !== bStrong) return bStrong - aStrong;
        return b.public_reactions_count - a.public_reactions_count;
      })
      .slice(0, 25)
      .map((a) => ({ ...a, url: a.canonical_url || `https://dev.to${a.url}` }));
  } catch {
    return [];
  }
}

async function fetchGithubTrending(): Promise<GithubRepo[]> {
  // Engineering languages only — exclude game engines, markup, etc.
  const TECH_LANGS = [
    "Rust", "Go", "TypeScript", "Python", "C", "C%2B%2B", "Zig", "OCaml",
    "Haskell", "Swift", "Kotlin", "Java", "Scala", "Elixir",
  ];

  try {
    // Fetch trending with a language filter for variety
    const [general, rust, python] = await Promise.allSettled([
      fetch("https://github.com/trending?since=daily", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ATS-Agent/1.0)" },
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.text()),
      fetch("https://github.com/trending?language=rust&since=daily", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ATS-Agent/1.0)" },
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.text()),
      fetch("https://github.com/trending?language=python&since=daily", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ATS-Agent/1.0)" },
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.text()),
    ]);

    const htmlSources = [general, rust, python]
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value);

    const repos: GithubRepo[] = [];
    const seenNames = new Set<string>();

    for (const html of htmlSources) {
      const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
      let match;
      while ((match = articleRegex.exec(html)) !== null) {
        const block = match[1];
        const fullNameMatch = block.match(/href="(\/[\w.-]+\/[\w.-]+)"/);
        const descMatch = block.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
        const langMatch = block.match(/itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/);
        const starsMatch = block.match(/aria-label="[^"]*stars[^"]*"[^>]*>\s*([\d,]+)/);

        if (!fullNameMatch) continue;
        const fullName = fullNameMatch[1].replace(/^\//, "");
        if (!fullName.includes("/") || seenNames.has(fullName)) continue;

        const parts = fullName.split("/");
        const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        const language = langMatch ? langMatch[1].trim() : "";

        // Filter out game repos
        const combined = `${fullName} ${description}`.toLowerCase();
        if (EXCLUDE_KEYWORDS.some((kw) => combined.includes(kw)) && language === "GDScript") continue;

        seenNames.add(fullName);
        repos.push({
          name: parts[1] || fullName,
          fullName,
          description,
          language,
          stars: starsMatch ? starsMatch[1] : "0",
          url: `https://github.com/${fullName}`,
        });

        if (repos.length >= 30) break;
      }
      if (repos.length >= 30) break;
    }

    // Sort: repos with engineering languages first
    return repos
      .sort((a, b) => {
        const aEng = TECH_LANGS.includes(a.language.replace("%2B%2B", "++")) ? 1 : 0;
        const bEng = TECH_LANGS.includes(b.language.replace("%2B%2B", "++")) ? 1 : 0;
        return bEng - aEng;
      })
      .slice(0, 25);
  } catch {
    return [];
  }
}

export async function GET() {
  const [hackernews, devto, github] = await Promise.allSettled([
    fetchHackerNews(),
    fetchDevTo(),
    fetchGithubTrending(),
  ]);

  return Response.json({
    hackernews: hackernews.status === "fulfilled" ? hackernews.value : [],
    devto: devto.status === "fulfilled" ? devto.value : [],
    github: github.status === "fulfilled" ? github.value : [],
    fetchedAt: Date.now(),
  }, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
  });
}
