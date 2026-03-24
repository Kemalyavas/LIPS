import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFramework, searchContentLibrary, getFrameworkForType } from "@/lib/mcp-client";
import { DANIELS_STYLE_KB } from "@/lib/style-knowledge";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic, postType = "value" } = await req.json();

  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  try {
    // === STAGE 1: Get framework + examples from MCP ===
    const frameworkPath = getFrameworkForType(postType);

    let framework = "";
    let examples = "";

    try {
      [framework, examples] = await Promise.all([
        getFramework(frameworkPath),
        searchContentLibrary(postType, 3),
      ]);
    } catch (mcpError) {
      console.error("MCP error (continuing without):", mcpError);
    }

    // Stage 1: Generate structured draft
    const stage1System = `You are a LinkedIn content strategist. Create a well-structured LinkedIn post draft.

${framework ? `## Framework to follow:\n${framework.substring(0, 3000)}\n` : ""}
${examples ? `## High-performing post examples:\n${examples.substring(0, 2000)}\n` : ""}

## Rules:
- Follow the framework structure: strong hook, clear flow, call to action
- Keep it between 150-300 words
- Use short paragraphs (1-3 sentences each)
- Include a compelling opening line that stops the scroll
- End with either a question or a clear CTA
- Post type: ${postType}
- Write in a professional but human tone
- Do NOT use bullet points with special characters, use plain text lists or short paragraphs
- Output ONLY the post text, no meta-commentary`;

    const stage1Response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: stage1System,
      messages: [{ role: "user", content: `Write a LinkedIn post about: ${topic}` }],
    });

    const structuredDraft = stage1Response.content[0].type === "text"
      ? stage1Response.content[0].text
      : "";

    // === STAGE 2: Rewrite in Daniel's voice ===
    const stage2System = `You are rewriting a LinkedIn post in Daniel Halenko's authentic voice. The structure is already done. Your only job is to make it sound like Daniel wrote it.

${DANIELS_STYLE_KB}

## Rules:
- Keep the same structure and flow from the draft
- Replace generic language with Daniel's natural voice
- Add personal touches from his background where relevant
- Keep the length similar
- No hashtags, no dashes as punctuation, no bullet point symbols
- Sound like a real person, not a polished copywriter
- Output ONLY the rewritten post`;

    const stage2Response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: stage2System,
      messages: [
        {
          role: "user",
          content: `Rewrite this LinkedIn post in Daniel's voice:\n\n${structuredDraft}`,
        },
      ],
    });

    const voiceDraft = stage2Response.content[0].type === "text"
      ? stage2Response.content[0].text
      : "";

    return NextResponse.json({
      structuredDraft,
      voiceDraft,
      postType,
      topic,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("Post engine error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
