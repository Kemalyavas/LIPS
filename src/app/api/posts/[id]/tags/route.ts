import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { tags } = await req.json();

  if (!Array.isArray(tags)) {
    return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });
  }

  // Remove existing tags
  await prisma.postTag.deleteMany({ where: { postId: id } });

  // Create new tags if they don't exist, then link
  for (const tagName of tags) {
    const name = tagName.trim().toLowerCase();
    if (!name) continue;

    const tag = await prisma.tag.upsert({
      where: { name },
      create: { name },
      update: {},
    });

    await prisma.postTag.create({
      data: { postId: id, tagId: tag.id },
    });
  }

  return NextResponse.json({ ok: true, tags });
}
