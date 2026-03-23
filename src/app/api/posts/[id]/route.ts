import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      commentHistory: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  return NextResponse.json({
    ...post,
    tags: post.tags.map((pt) => pt.tag.name),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, danielsVersion, improvementNotes, aiCommentDraft } = body;

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (danielsVersion !== undefined) data.danielsVersion = danielsVersion;
  if (improvementNotes !== undefined) data.improvementNotes = improvementNotes;
  if (aiCommentDraft !== undefined) data.aiCommentDraft = aiCommentDraft;

  // If Daniel saves his version, update the most recent CommentHistory entry
  if (danielsVersion) {
    const latestHistory = await prisma.commentHistory.findFirst({
      where: { postId: id, danielsVersion: null },
      orderBy: { createdAt: "desc" },
    });
    if (latestHistory) {
      await prisma.commentHistory.update({
        where: { id: latestHistory.id },
        data: { danielsVersion },
      });
    }
  }

  const post = await prisma.post.update({ where: { id }, data });
  return NextResponse.json(post);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
