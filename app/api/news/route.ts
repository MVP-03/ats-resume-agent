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

async function fetchHackerNews(): Promise<HNStory[]> {
  try {
    const idsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
      signal: AbortSignal.timeout(8000),
    });
    const ids: number[] = await idsRes.json();
    const top30 = ids.slice(0, 30);

    const stories = await Promise.allSettled(
      top30.map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          signal: AbortSignal.timeout(5000),
        }).then((r) => r.json())
      )
    );

    return stories
      .filter((r): r is PromiseFulfilledResult<HNStory> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((s) => s && (s as HNStory & { type?: string }).type === "story" && s.url && s.title)
      .slice(0, 25);
  } catch {
    return [];
  }
}

async function fetchDevTo(): Promise<DevToArticle[]> {
  try {
    const [career, programming] = await Promise.allSettled([
      fetch("https://dev.to/api/articles?per_page=15&tag=career", {
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.json()),
      fetch("https://dev.to/api/articles?per_page=15&tag=programming", {
        signal: AbortSignal.timeout(8000),
      }).then((r) => r.json()),
    ]);

    const results: DevToArticle[] = [];
    if (career.status === "fulfilled" && Array.isArray(career.value)) {
      results.push(...career.value);
    }
    if (programming.status === "fulfilled" && Array.isArray(programming.value)) {
      results.push(...programming.value);
    }

    const seen = new Set<number>();
    return results
      .filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      })
      .slice(0, 25)
      .map((a) => ({ ...a, url: a.canonical_url || `https://dev.to${a.url}` }));
  } catch {
    return [];
  }
}

async function fetchGithubTrending(): Promise<GithubRepo[]> {
  try {
    const res = await fetch("https://github.com/trending", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ATS-Agent/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    const repos: GithubRepo[] = [];
    const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/g;

    let match;
    while ((match = articleRegex.exec(html)) !== null && repos.length < 20) {
      const block = match[1];

      const nameMatch = block.match(/href="\/([^"]+)"\s*(?:rel="noreferrer")?[^>]*>\s*<span[^>]*class="[^"]*repo[^"]*"[^>]*>([^<]+)<\/span>/);
      const hrefMatch = block.match(/href="(\/[^/]+\/[^"]+)"\s*[^>]*>\s*(?:<span[^>]*>[^<]*<\/span>\s*\/\s*)?<span[^>]*class="[^"]*repo/);

      const fullNameMatch = block.match(/href="(\/[\w.-]+\/[\w.-]+)"/);
      const descMatch = block.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
      const langMatch = block.match(/itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/);
      const starsMatch = block.match(/aria-label="[^"]*stars[^"]*"[^>]*>\s*([\d,]+)/);

      if (!fullNameMatch) continue;
      const fullName = fullNameMatch[1].replace(/^\//, "");
      if (!fullName.includes("/")) continue;
      const parts = fullName.split("/");

      repos.push({
        name: parts[1] || fullName,
        fullName,
        description: descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "",
        language: langMatch ? langMatch[1].trim() : "",
        stars: starsMatch ? starsMatch[1] : "0",
        url: `https://github.com/${fullName}`,
      });
    }

    return repos;
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

  const data = {
    hackernews: hackernews.status === "fulfilled" ? hackernews.value : [],
    devto: devto.status === "fulfilled" ? devto.value : [],
    github: github.status === "fulfilled" ? github.value : [],
    fetchedAt: Date.now(),
  };

  return Response.json(data, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
  });
}
