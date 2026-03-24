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

const ACTOR_ID = "harvestapi~linkedin-post-search";
const MAX_WAIT_SECS = 120;

export async function searchLinkedInPosts(
  keyword: string,
  sortBy: string = "date_posted",
  datePosted: string = ""
): Promise<LinkedInPost[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN is not set");

  // Split by comma, combine into searchQueries array
  const keywords = keyword.split(",").map((k) => k.trim()).filter(Boolean);
  if (keywords.length === 0) return [];

  // Map date filter
  const dateMap: Record<string, string> = {
    "past-24h": "24h",
    "past-week": "week",
    "past-month": "month",
    "past-3-months": "3months",
  };

  const response = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchQueries: keywords,
        maxPosts: 25,
        scrapeComments: false,
        scrapeReactions: false,
        ...(dateMap[datePosted] ? { datePosted: dateMap[datePosted] } : {}),
      }),
      signal: AbortSignal.timeout(MAX_WAIT_SECS * 1000),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify error: ${response.status} ${text.substring(0, 200)}`);
  }

  const items = await response.json();
  if (!Array.isArray(items)) return [];

  // Deduplicate by URL
  const seen = new Set<string>();
  const posts: LinkedInPost[] = [];

  for (const item of items) {
    const url = item.linkedinUrl || item.shareUrl || "";
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const author = item.author || {};
    const engagement = item.engagement || {};
    const postedAt = item.postedAt || {};

    posts.push({
      linkedinUrl: url,
      postText: item.content || "",
      authorName: author.name || "Unknown",
      authorHeadline: author.info || "",
      authorProfileUrl: author.linkedinUrl || "",
      authorAvatarUrl: author.avatar?.url || "",
      reactionsCount: engagement.likes || 0,
      commentsCount: engagement.comments || 0,
      datePosted: postedAt.postedAgoText || postedAt.postedAgoShort || null,
    });
  }

  // Relevance filter: post text must contain at least one word (4+ chars) from keywords
  const allWords = keywords.flatMap((kw) =>
    kw.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );

  if (allWords.length === 0) return posts;

  return posts.filter((post) => {
    const textLower = post.postText.toLowerCase();
    return allWords.some((word) => textLower.includes(word));
  });
}
