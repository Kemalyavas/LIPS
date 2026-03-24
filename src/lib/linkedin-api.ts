export interface LinkedInPost {
  linkedinUrl: string;
  postText: string;
  authorName: string;
  authorHeadline: string;
  authorProfileUrl: string;
  authorAvatarUrl: string;
  reactionsCount: number;
  commentsCount: number;
  datePosted: string | null;
}

const ACTOR_ID = "apimaestro~linkedin-posts-search-scraper-no-cookies";
const MAX_WAIT_SECS = 120;

async function searchSingleKeyword(
  keyword: string,
  sortBy: string,
  datePosted: string,
  token: string,
): Promise<LinkedInPost[]> {
  const dateMap: Record<string, string> = {
    "past-24h": "Past 24 hours",
    "past-week": "Past Week",
    "past-month": "Past Month",
    "past-3-months": "No filter",
  };

  const response = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchKeyword: keyword.trim(),
        sortType: sortBy === "date_posted" ? "Date posted" : "Relevance",
        dateFilter: dateMap[datePosted] || "Past Month",
        pageNumber: 1,
        resultLimit: 25,
      }),
      signal: AbortSignal.timeout(MAX_WAIT_SECS * 1000),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify error: ${response.status} ${text.substring(0, 200)}`);
  }

  const items = await response.json();

  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item: Record<string, unknown>) => {
    const author = (item.author || {}) as Record<string, unknown>;
    const stats = (item.stats || {}) as Record<string, unknown>;
    const postedAt = (item.posted_at || {}) as Record<string, unknown>;

    return {
      linkedinUrl: (item.post_url || "") as string,
      postText: (item.text || "") as string,
      authorName: (author.name || "Unknown") as string,
      authorHeadline: (author.headline || "") as string,
      authorProfileUrl: (author.profile_url || "") as string,
      authorAvatarUrl: (author.image_url || "") as string,
      reactionsCount: Number(stats.total_reactions || 0),
      commentsCount: Number(stats.comments || 0),
      datePosted: (postedAt.display_text || postedAt.date || null) as string | null,
    };
  });
}

export async function searchLinkedInPosts(
  keyword: string,
  sortBy: string = "date_posted",
  datePosted: string = ""
): Promise<LinkedInPost[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is not set");

  // Split by comma for multi-keyword search
  const keywords = keyword.split(",").map((k) => k.trim()).filter(Boolean);

  if (keywords.length === 0) return [];

  // Search each keyword (in parallel if multiple)
  let allPosts: LinkedInPost[];

  if (keywords.length === 1) {
    allPosts = await searchSingleKeyword(keywords[0], sortBy, datePosted, token);
  } else {
    const results = await Promise.all(
      keywords.map((kw) => searchSingleKeyword(kw, sortBy, datePosted, token))
    );
    // Merge and deduplicate by URL
    const seen = new Set<string>();
    allPosts = [];
    for (const posts of results) {
      for (const post of posts) {
        if (!seen.has(post.linkedinUrl)) {
          seen.add(post.linkedinUrl);
          allPosts.push(post);
        }
      }
    }
  }

  // Relevance filter: post text must contain at least one keyword
  const relevantPosts = allPosts.filter((post) => {
    const textLower = post.postText.toLowerCase();
    return keywords.some((kw) => textLower.includes(kw.toLowerCase()));
  });

  return relevantPosts;
}
