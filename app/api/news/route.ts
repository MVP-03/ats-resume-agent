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

const EXCLUDE_KEYWORDS = [
  "game", "games", "gaming", "gamer", "steam", "minecraft", "fortnite", "roblox",
  "xbox", "playstation", "nintendo", "esports", "twitch", "streamer",
  "movie", "film", "celebrity", "sports", "nfl", "nba", "soccer", "football",
  "recipe", "food", "travel", "fashion", "music", "artist", "album",
  "meme", "funny", "viral", "tiktok", "instagram", "twitter drama",
  "crypto pump", "nft drop", "metaverse land",
];

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
  "mistral", "mythos", "deepseek", "qwen", "phi", "falcon", "mixtral",
  "filesystem", "storage", "network", "protocol", "tcp", "http", "dns",
  "container", "vm", "hypervisor", "serverless", "edge", "cdn",
  "rag", "fine-tune", "finetune", "quantization", "gguf", "vllm", "ollama",
  "attention", "context window", "token", "multimodal", "vision model",
  "reasoning", "agent", "agentic", "openai", "anthropic", "google deepmind",
];

function isTechContent(title: string, tags?: string[]): boolean {
  const lower = title.toLowerCase();
  const tagStr = (tags || []).join(" ").toLowerCase();
  const combined = `${lower} ${tagStr}`;
  for (const kw of EXCLUDE_KEYWORDS) {
    if (combined.includes(kw)) return false;
  }
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

// ── RSS/Atom parser ────────────────────────────────────────────────────────────

function parseRSSItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const getTag = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
      return m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
    };
    const title = getTag("title");
    const link =
      block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ||
      block.match(/<link[^>]*href="([^"]+)"/)?.[1] ||
      "";
    const description = getTag("description");
    const pubDate = getTag("pubDate") || getTag("dc:date") || "";
    if (title) items.push({ title, link, description, pubDate });
  }
  return items;
}

function parseAtomItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string }> = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const title =
      block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.replace(/<[^>]+>/g, "").trim() || "";
    const link =
      block.match(/<link[^>]+href="([^"]+)"/)?.[1] ||
      block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ||
      "";
    const summary =
      block.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/)?.[1]?.replace(/<[^>]+>/g, "").trim() ||
      block.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/)?.[1]?.replace(/<[^>]+>/g, "").trim() ||
      "";
    const pubDate =
      block.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim() ||
      block.match(/<updated>([\s\S]*?)<\/updated>/)?.[1]?.trim() ||
      "";
    if (title) items.push({ title, link, description: summary.slice(0, 400), pubDate });
  }
  return items;
}

function parseFeed(xml: string) {
  if (xml.includes("<entry>")) return parseAtomItems(xml);
  return parseRSSItems(xml);
}

// ── Fetchers ───────────────────────────────────────────────────────────────────

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
  const TECH_TAGS = [
    "typescript", "rust", "golang", "python", "devops", "kubernetes",
    "security", "ai", "machinelearning", "database", "backend", "architecture",
    "opensource", "linux", "cloud", "performance", "compiler",
  ];

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
        return isTechContent(a.title, a.tag_list);
      })
      .sort((a, b) => {
        const aS = isStrongTech(a.title, a.tag_list) ? 1 : 0;
        const bS = isStrongTech(b.title, b.tag_list) ? 1 : 0;
        if (aS !== bS) return bS - aS;
        return b.public_reactions_count - a.public_reactions_count;
      })
      .slice(0, 25)
      .map((a) => ({ ...a, url: a.canonical_url || `https://dev.to${a.url}` }));
  } catch {
    return [];
  }
}

async function fetchGithubTrending(): Promise<GithubRepo[]> {
  const TECH_LANGS = [
    "Rust", "Go", "TypeScript", "Python", "C", "C%2B%2B", "Zig", "OCaml",
    "Haskell", "Swift", "Kotlin", "Java", "Scala", "Elixir",
  ];

  try {
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

async function fetchArxiv(): Promise<ArxivPaper[]> {
  const CATS = ["cs.AI", "cs.LG", "cs.CL"];

  try {
    const fetches = CATS.map((cat) =>
      fetch(`https://rss.arxiv.org/rss/${cat}`, {
        headers: { "User-Agent": "ATS-Resume-Agent/1.0" },
        signal: AbortSignal.timeout(10000),
      }).then((r) => r.text())
    );

    const results = await Promise.allSettled(fetches);
    const papers: ArxivPaper[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const items = parseRSSItems(result.value);
      for (const item of items) {
        if (!item.title || seen.has(item.link)) continue;
        seen.add(item.link);
        const authorsMatch = item.description.match(/Authors?:\s*([^\n<.]+)/i);
        const cleanDesc = item.description
          .replace(/Authors?:[^\n]+/i, "")
          .replace(/Abstract:\s*/i, "")
          .trim()
          .slice(0, 350);
        papers.push({
          title: item.title.replace(/\[[\w.]+\]\s*/, "").trim(),
          link: item.link,
          description: cleanDesc,
          authors: authorsMatch ? authorsMatch[1].trim() : "",
          published: item.pubDate,
        });
      }
    }

    return papers.slice(0, 30);
  } catch {
    return [];
  }
}

async function fetchTechNews(): Promise<RSSItem[]> {
  const FEEDS = [
    { url: "https://feeds.arstechnica.com/arstechnica/technology-lab", source: "Ars Technica" },
    { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", source: "The Verge AI" },
    { url: "https://techcrunch.com/feed/", source: "TechCrunch" },
    { url: "https://www.wired.com/feed/category/science/latest/rss", source: "Wired" },
    { url: "https://feeds.feedburner.com/venturebeat/SZYF", source: "VentureBeat" },
  ];

  try {
    const fetches = FEEDS.map(({ url, source }) =>
      fetch(url, {
        headers: { "User-Agent": "ATS-Resume-Agent/1.0" },
        signal: AbortSignal.timeout(8000),
      })
        .then((r) => r.text())
        .then((xml) => ({ xml, source }))
    );

    const results = await Promise.allSettled(fetches);
    const items: RSSItem[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { xml, source } = result.value;
      const parsed = parseFeed(xml);
      for (const item of parsed.slice(0, 20)) {
        if (!item.title || !item.link || seen.has(item.link)) continue;
        seen.add(item.link);
        if (isTechContent(item.title)) {
          items.push({
            title: item.title,
            link: item.link,
            description: item.description.replace(/<[^>]+>/g, "").slice(0, 300),
            pubDate: item.pubDate,
            source,
          });
        }
      }
    }

    return items
      .sort((a, b) => {
        const at = new Date(a.pubDate).getTime() || 0;
        const bt = new Date(b.pubDate).getTime() || 0;
        return bt - at;
      })
      .slice(0, 30);
  } catch {
    return [];
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET() {
  const [hackernews, devto, github, arxiv, technews] = await Promise.allSettled([
    fetchHackerNews(),
    fetchDevTo(),
    fetchGithubTrending(),
    fetchArxiv(),
    fetchTechNews(),
  ]);

  return Response.json(
    {
      hackernews: hackernews.status === "fulfilled" ? hackernews.value : [],
      devto: devto.status === "fulfilled" ? devto.value : [],
      github: github.status === "fulfilled" ? github.value : [],
      arxiv: arxiv.status === "fulfilled" ? arxiv.value : [],
      technews: technews.status === "fulfilled" ? technews.value : [],
      fetchedAt: Date.now(),
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
