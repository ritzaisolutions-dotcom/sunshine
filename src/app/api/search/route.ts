import { NextRequest } from "next/server";
import {
  extractConversationSources,
  extractConversationText,
} from "@/lib/mistral-conversations";

export const maxDuration = 60;

type SearchBody = {
  query?: string;
  apiKey?: string;
};

export async function POST(req: NextRequest) {
  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = body.query?.trim() ?? "";
  if (!query) {
    return Response.json(
      { error: "Tell Maria what to look up." },
      { status: 400 }
    );
  }

  const apiKey =
    body.apiKey?.trim() || process.env.MISTRAL_API_KEY?.trim() || "";
  if (!apiKey) {
    return Response.json(
      {
        error:
          "No Mistral API key. Add one in Admin, or set MISTRAL_API_KEY on the server.",
      },
      { status: 401 }
    );
  }

  const conversation = await fetch("https://api.mistral.ai/v1/conversations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-medium-latest",
      store: false,
      instructions:
        "You are Maria Sunshine helping Noorie. Search the web when facts must be current. Answer in warm, clear English. Keep it short and kind.",
      tools: [{ type: "web_search" }],
      inputs: query.slice(0, 2000),
    }),
  });

  if (!conversation.ok) {
    const errText = await conversation.text().catch(() => "");
    return Response.json(
      {
        error: `Mistral could not look that up (${conversation.status}): ${errText || conversation.statusText}`,
      },
      { status: 502 }
    );
  }

  const payload = (await conversation.json()) as unknown;
  const text = extractConversationText(payload);
  const sources = extractConversationSources(payload);

  if (!text) {
    return Response.json(
      { error: "Mistral searched, but the answer came back empty." },
      { status: 502 }
    );
  }

  return Response.json({ text, sources });
}
