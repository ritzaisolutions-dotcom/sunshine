import { NextRequest } from "next/server";
import { pickChatModel } from "@/lib/model-pick";
import {
  BACKLOG_RULE,
  CHEER_RULE,
  DEFAULT_SYSTEM_PROMPT,
  IMAGE_RULE,
  SEARCH_RULE,
} from "@/lib/prompts";

type IncomingAttachment = {
  name: string;
  mimeType: string;
  dataBase64: string;
};

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatBody = {
  messages: IncomingMessage[];
  systemPrompt?: string;
  notesDocument?: string;
  apiKey?: string;
  attachments?: IncomingAttachment[];
};

function buildUserContent(
  text: string,
  attachments: IncomingAttachment[] | undefined
): string | Array<Record<string, unknown>> {
  if (!attachments?.length) return text;

  const parts: Array<Record<string, unknown>> = [];
  if (text.trim()) {
    parts.push({ type: "text", text });
  }

  for (const file of attachments) {
    const isImage = file.mimeType.startsWith("image/");
    if (isImage) {
      parts.push({
        type: "image_url",
        image_url: `data:${file.mimeType};base64,${file.dataBase64}`,
      });
      continue;
    }

    try {
      const decoded = Buffer.from(file.dataBase64, "base64").toString("utf8");
      const looksBinary = decoded.includes("\u0000");
      if (!looksBinary && decoded.length < 120_000) {
        parts.push({
          type: "text",
          text: `Attached file "${file.name}" (${file.mimeType}):\n\n${decoded}`,
        });
      } else {
        parts.push({
          type: "text",
          text: `Attached file "${file.name}" (${file.mimeType}) could not be fully decoded as text. Please answer using the filename and any context Noorie gave.`,
        });
      }
    } catch {
      parts.push({
        type: "text",
        text: `Attached file "${file.name}" (${file.mimeType}) could not be read.`,
      });
    }
  }

  return parts;
}

export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey =
    body.apiKey?.trim() || process.env.MISTRAL_API_KEY?.trim() || "";
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "No Mistral API key. Add one in Admin, or set MISTRAL_API_KEY on the server.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const systemParts = [
    body.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
    `\n\n${CHEER_RULE}`,
    `\n\n${IMAGE_RULE}`,
    `\n\n${SEARCH_RULE}`,
    `\n\n${BACKLOG_RULE}`,
    body.notesDocument
      ? `\n\nAbout Noorie (living memory — use this, do not invent):\n${body.notesDocument}`
      : "",
  ]
    .join("")
    .trim();

  const mistralMessages: Array<{
    role: string;
    content: string | Array<Record<string, unknown>>;
  }> = [{ role: "system", content: systemParts }];

  let lastUserText = "";
  body.messages.forEach((m, index) => {
    const isLastUser =
      m.role === "user" && index === body.messages.length - 1;
    if (isLastUser) lastUserText = m.content;
    mistralMessages.push({
      role: m.role,
      content: isLastUser
        ? buildUserContent(m.content, body.attachments)
        : m.content,
    });
  });

  const model = pickChatModel(lastUserText);

  const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: mistralMessages,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({
        error: `Mistral error (${upstream.status}): ${errText || upstream.statusText}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const json = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const token = json.choices?.[0]?.delta?.content;
              if (token) controller.enqueue(encoder.encode(token));
            } catch {
              /* skip partial */
            }
          }
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `\n\n[Stream interrupted: ${error instanceof Error ? error.message : "unknown"}]`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
