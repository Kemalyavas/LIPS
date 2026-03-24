import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { searchLinkedInPosts } from "@/lib/linkedin-api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword");
  const sortBy = searchParams.get("sortBy") || "date_posted";
  const datePosted = searchParams.get("datePosted") || "past-month";
  const minReactions = parseInt(searchParams.get("minReactions") || "0");
  const minComments = parseInt(searchParams.get("minComments") || "0");

  if (!keyword) {
    return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  }

  try {
    const posts = await searchLinkedInPosts(keyword, sortBy, datePosted);

    // Client-side filtering for engagement thresholds
    const filtered = posts.filter(
      (p) => p.reactionsCount >= minReactions && p.commentsCount >= minComments
    );

    // Deduplication: check which URLs already exist in DB
    const urls = filtered.map((p) => p.linkedinUrl);
    const existing = await prisma.post.findMany({
      where: { linkedinUrl: { in: urls } },
      select: { linkedinUrl: true, status: true },
    });
    const existingMap = new Map(existing.map((e) => [e.linkedinUrl, e.status]));

    const results = filtered.map((post) => ({
      ...post,
      alreadyInLibrary: existingMap.has(post.linkedinUrl),
      existingStatus: existingMap.get(post.linkedinUrl) || null,
    }));

    return NextResponse.json({ results, total: results.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search failed";
    console.error("LinkedIn search error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
