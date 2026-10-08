import { NextRequest, NextResponse } from "next/server";
import { MEMORY_MERGE_PROMPT } from "@/lib/prompts";
import { EMPTY_NOTES, NourieNotes } from "@/lib/types";

type MemoryBody = {
  notes: NourieNotes;
  recentTranscript: string;
  apiKey?: string;
};

export async function POST(req: NextRequest) {
  let body: MemoryBody;
  try {
    body = (await req.json()) as MemoryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey =
    body.apiKey?.trim() || process.env.MISTRAL_API_KEY?.trim() || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Mistral API key for memory update." },
      { status: 401 }
    );
  }

  const current = { ...EMPTY_NOTES, ...body.notes };
  const userPayload = `Current notes JSON:\n${JSON.stringify(current, null, 2)}\n\nLatest chat transcript:\n${body.recentTranscript}`;

  const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MEMORY_MERGE_PROMPT },
        { role: "user", content: userPayload },
      ],
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `Memory update failed: ${errText || upstream.statusText}` },
      { status: 502 }
    );
  }

  const json = (await upstream.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(content) as Partial<NourieNotes>;
    const merged: NourieNotes = {
      whoSheIs: String(parsed.whoSheIs ?? current.whoSheIs),
      howSheLikesToLearn: String(
        parsed.howSheLikesToLearn ?? current.howSheLikesToLearn
      ),
      goals: String(parsed.goals ?? current.goals),
      inProgress: String(parsed.inProgress ?? current.inProgress),
      alreadyUnderstands: String(
        parsed.alreadyUnderstands ?? current.alreadyUnderstands
      ),
      getsStuckOn: String(parsed.getsStuckOn ?? current.getsStuckOn),
      littleThings: String(parsed.littleThings ?? current.littleThings),
      lastUpdated: new Date().toISOString(),
    };
    return NextResponse.json({ notes: merged });
  } catch {
    return NextResponse.json(
      { error: "Could not parse memory JSON.", raw: content },
      { status: 502 }
    );
  }
}
