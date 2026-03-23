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

export async function searchLinkedInPosts(
  keyword: string,
  sortBy: string = "date_posted",
  datePosted: string = ""
): Promise<LinkedInPost[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is not set");

  // Map our date filter to actor's format
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
        searchKeyword: keyword,
        sortType: sortBy === "date_posted" ? "Date posted" : "Relevance",
        dateFilter: dateMap[datePosted] || "Past Month",
        pageNumber: 1,
        resultLimit: 30,
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
    console.log("Apify response:", typeof items, Object.keys(items || {}));
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
