import { NextRequest } from "next/server";
import {
  extractGeneratedImageUrl,
  extractToolFileIds,
} from "@/lib/mistral-conversations";

export const maxDuration = 60;

type ImageBody = {
  prompt?: string;
  apiKey?: string;
};

function sniffMime(bytes: Buffer, fallback: string): string {
  if (fallback.startsWith("image/")) return fallback;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return fallback.startsWith("image/") ? fallback : "image/jpeg";
}

function toDataUrl(bytes: ArrayBuffer, mimeHint: string): { src: string } {
  const buffer = Buffer.from(bytes);
  const mime = sniffMime(buffer, mimeHint || "image/jpeg");
  return { src: `data:${mime};base64,${buffer.toString("base64")}` };
}

export async function POST(req: NextRequest) {
  let body: ImageBody;
  try {
    body = (await req.json()) as ImageBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim() ?? "";
  if (!prompt) {
    return Response.json({ error: "Tell Maria what to draw." }, { status: 400 });
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
        "Draw the picture Noorie asked for. Always use the image generation tool. One clear, friendly picture.",
      tools: [{ type: "image_generation" }],
      inputs: prompt.slice(0, 2000),
    }),
  });

  if (!conversation.ok) {
    const errText = await conversation.text().catch(() => "");
    return Response.json(
      {
        error: `Mistral could not draw that (${conversation.status}): ${errText || conversation.statusText}`,
      },
      { status: 502 }
    );
  }

  const payload = (await conversation.json()) as unknown;

  // Legacy shape: tool_file + file_id
  const fileId = extractToolFileIds(payload)[0];
  if (fileId) {
    const file = await fetch(
      `https://api.mistral.ai/v1/files/${encodeURIComponent(fileId)}/content`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!file.ok) {
      const errText = await file.text().catch(() => "");
      return Response.json(
        {
          error: `Mistral made a picture, but it could not be downloaded (${file.status}): ${errText || file.statusText}`,
        },
        { status: 502 }
      );
    }
    const mime = file.headers.get("content-type") || "image/png";
    const { src } = toDataUrl(await file.arrayBuffer(), mime);
    return Response.json({ src, alt: prompt });
  }

  // Current shape: signed URL in tool.execution / markdown
  const imageUrl = extractGeneratedImageUrl(payload);
  if (!imageUrl) {
    return Response.json(
      { error: "Mistral replied, but it did not return a picture." },
      { status: 502 }
    );
  }

  const remote = await fetch(imageUrl);
  if (!remote.ok) {
    const errText = await remote.text().catch(() => "");
    return Response.json(
      {
        error: `Mistral made a picture, but it could not be downloaded (${remote.status}): ${errText || remote.statusText}`,
      },
      { status: 502 }
    );
  }

  const mime = remote.headers.get("content-type") || "image/jpeg";
  const { src } = toDataUrl(await remote.arrayBuffer(), mime);
  return Response.json({ src, alt: prompt });
}
