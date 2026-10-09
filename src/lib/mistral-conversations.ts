type Chunk = {
  type?: string;
  text?: string;
  title?: string;
  url?: string;
  source?: string;
  file_id?: string;
};

export type SearchSource = {
  title: string;
  url: string;
};

function walk(node: unknown, visit: (chunk: Chunk) => void) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  const record = node as Chunk & Record<string, unknown>;
  visit(record);
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") walk(value, visit);
  }
}

export function extractConversationText(payload: unknown): string {
  const parts: string[] = [];

  // Current Conversations shape: message.output with string (or chunk) content.
  if (payload && typeof payload === "object") {
    const outputs = (payload as { outputs?: unknown }).outputs;
    if (Array.isArray(outputs)) {
      for (const entry of outputs) {
        if (!entry || typeof entry !== "object") continue;
        const row = entry as { type?: string; content?: unknown };
        if (row.type !== "message.output") continue;
        if (typeof row.content === "string") {
          parts.push(row.content);
          continue;
        }
        if (Array.isArray(row.content)) {
          for (const part of row.content) {
            if (!part || typeof part !== "object") continue;
            const chunk = part as Chunk;
            if (chunk.type === "text" && typeof chunk.text === "string") {
              parts.push(chunk.text);
            } else if (typeof chunk.text === "string") {
              parts.push(chunk.text);
            }
          }
        }
      }
    }
  }

  if (parts.length) return parts.join("").trim();

  // Older nested text chunks
  walk(payload, (chunk) => {
    if (chunk.type === "text" && typeof chunk.text === "string") {
      parts.push(chunk.text);
    }
  });
  return parts.join("").trim();
}

export function extractConversationSources(payload: unknown): SearchSource[] {
  const seen = new Set<string>();
  const sources: SearchSource[] = [];
  walk(payload, (chunk) => {
    if (chunk.type !== "tool_reference") return;
    const url = typeof chunk.url === "string" ? chunk.url : "";
    if (!url || seen.has(url)) return;
    seen.add(url);
    sources.push({
      title:
        (typeof chunk.title === "string" && chunk.title) ||
        (typeof chunk.source === "string" && chunk.source) ||
        url,
      url,
    });
  });
  return sources.slice(0, 6);
}

export function extractToolFileIds(payload: unknown): string[] {
  const ids: string[] = [];
  walk(payload, (chunk) => {
    if (chunk.type === "tool_file" && typeof chunk.file_id === "string") {
      ids.push(chunk.file_id);
    }
  });
  return ids;
}

/**
 * Newer Conversations responses put generated pictures behind a signed URL
 * in tool.execution.info.result (JSON), or as markdown in message.output.
 */
export function extractGeneratedImageUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const outputs = (payload as { outputs?: unknown }).outputs;
  if (!Array.isArray(outputs)) return null;

  for (const entry of outputs) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as {
      type?: string;
      name?: string;
      info?: { result?: unknown };
      content?: unknown;
    };

    if (row.type === "tool.execution" && row.name === "image_generation") {
      const raw = row.info?.result;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw) as { url?: unknown };
          if (typeof parsed.url === "string" && parsed.url.startsWith("http")) {
            return parsed.url;
          }
        } catch {
          /* keep looking */
        }
      } else if (raw && typeof raw === "object") {
        const url = (raw as { url?: unknown }).url;
        if (typeof url === "string" && url.startsWith("http")) return url;
      }
    }

    if (row.type === "message.output") {
      const content = row.content;
      const text =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content
                .map((part) =>
                  part &&
                  typeof part === "object" &&
                  typeof (part as { text?: unknown }).text === "string"
                    ? (part as { text: string }).text
                    : ""
                )
                .join("")
            : "";
      const match = text.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/);
      if (match?.[1]) return match[1];
    }
  }

  return null;
}
