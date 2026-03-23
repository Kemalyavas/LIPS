import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const tag = searchParams.get("tag");
  const sortBy = searchParams.get("sortBy") || "dateDiscovered";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where: Record<string, unknown> = {};

  if (status) {
    const statuses = status.split(",");
    where.status = { in: statuses };
  } else {
    // Exclude SKIPPED by default
    where.status = { not: "SKIPPED" };
  }

  if (tag) {
    where.tags = { some: { tag: { name: tag } } };
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    posts: posts.map((p) => ({
      ...p,
      tags: p.tags.map((pt) => pt.tag.name),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { linkedinUrl, postText, authorName, authorHeadline, authorProfileUrl, authorAvatarUrl, reactionsCount, commentsCount, datePosted, status } = body;

  if (!linkedinUrl || !postText) {
    return NextResponse.json({ error: "linkedinUrl and postText are required" }, { status: 400 });
  }

  // Dedup check
  const existing = await prisma.post.findUnique({ where: { linkedinUrl } });
  if (existing) {
    return NextResponse.json({ error: "Post already in library", post: existing }, { status: 409 });
  }

  const post = await prisma.post.create({
    data: {
      linkedinUrl,
      postText,
      authorName: authorName || "Unknown",
      authorHeadline,
      authorProfileUrl,
      authorAvatarUrl,
      reactionsCount: reactionsCount || 0,
      commentsCount: commentsCount || 0,
      datePosted: datePosted && !isNaN(new Date(datePosted).getTime()) ? new Date(datePosted) : null,
      status: status || "PENDING_REVIEW",
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
