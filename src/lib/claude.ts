import Anthropic from "@anthropic-ai/sdk";
import { DANIELS_COMMENT_EXAMPLES } from "./style-knowledge";

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function generateComment(
  postText: string,
  authorName: string,
  styleKB: string,
  learningPairs: Array<{ aiDraft: string; danielsVersion: string }>,
): Promise<{ stream: ReadableStream; getFullText: () => Promise<string> }> {
  const anthropic = getClient();

  // Build few-shot section: real examples first, then DB learning pairs
  let fewShotSection = "\n\n## Real Examples (AI draft vs what Daniel actually wrote):\n";

  // Include all real examples from the voice guide
  for (const ex of DANIELS_COMMENT_EXAMPLES) {
    fewShotSection += `\nTopic: ${ex.topic}\nAI wrote: "${ex.aiDraft}"\nDaniel changed it to: "${ex.danielsVersion}"\n`;
  }

  // Add DB learning pairs (from Daniel's actual edits in the app)
  if (learningPairs.length > 0) {
    fewShotSection += "\n## Recent edits by Daniel (learn from these):\n";
    for (const pair of learningPairs.slice(0, 5)) {
      fewShotSection += `\nAI wrote: "${pair.aiDraft}"\nDaniel changed it to: "${pair.danielsVersion}"\n`;
    }
  }

  const systemPrompt = `You are writing a LinkedIn comment on behalf of Daniel Halenko.

${styleKB}
${fewShotSection}

Write the comment now. Follow these rules strictly:
- Match Daniel's natural comment length. His real comments are often five to ten sentences. Do not cut short artificially.
- Be concrete and personal. Use specific facts, places, numbers from his background. No metaphors or literary devices.
- Sound like a direct LinkedIn message from a real person, not a crafted piece of writing.
- Follow the voice rules above exactly.`;

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Write a LinkedIn comment on this post by ${authorName}:\n\n"${postText}"`,
      },
    ],
  });

  let fullText = "";
  stream.on("text", (text) => {
    fullText += text;
  });

  const readableStream = stream.toReadableStream();

  return {
    stream: readableStream,
    getFullText: async () => {
      await stream.finalMessage();
      return fullText;
    },
  };
}
