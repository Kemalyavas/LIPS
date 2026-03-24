import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateComment } from "@/lib/claude";
import { DANIELS_STYLE_KB } from "@/lib/style-knowledge";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Get learning pairs
  const learningPairs = await prisma.commentHistory.findMany({
    where: { danielsVersion: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { aiDraft: true, danielsVersion: true },
  });

  const pairs = learningPairs
    .filter((p): p is { aiDraft: string; danielsVersion: string } => p.danielsVersion !== null);

  const { stream, getFullText } = await generateComment(
    post.postText,
    post.authorName,
    DANIELS_STYLE_KB,
    pairs,
  );

  // Save to DB after stream completes (background)
  getFullText().then(async (text) => {
    if (text) {
      await prisma.post.update({
        where: { id },
        data: { aiCommentDraft: text, status: "DRAFT_GENERATED" },
      });
      await prisma.commentHistory.create({
        data: { postId: id, aiDraft: text },
      });
    }
  }).catch(console.error);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
