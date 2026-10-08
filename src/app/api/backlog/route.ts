import { NextRequest, NextResponse } from "next/server";
import { BACKLOG_EXTRACT_PROMPT } from "@/lib/prompts";

type BacklogBody = {
  recentTranscript: string;
  apiKey?: string;
};

export async function POST(req: NextRequest) {
  let body: BacklogBody;
  try {
    body = (await req.json()) as BacklogBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey =
    body.apiKey?.trim() || process.env.MISTRAL_API_KEY?.trim() || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Mistral API key for backlog extract." },
      { status: 401 }
    );
  }

  const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BACKLOG_EXTRACT_PROMPT },
        {
          role: "user",
          content: `Transcript:\n${body.recentTranscript}`,
        },
      ],
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `Backlog extract failed: ${errText || upstream.statusText}` },
      { status: 502 }
    );
  }

  const json = (await upstream.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(content) as { items?: unknown };
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json(
      { error: "Could not parse backlog JSON.", raw: content },
      { status: 502 }
    );
  }
}
