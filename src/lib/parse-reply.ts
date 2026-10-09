import { DiagramBlock, SlideDeck } from "@/lib/types";

export type ParsedReply = {
  text: string;
  deck?: SlideDeck;
  diagram?: DiagramBlock;
  imagePrompt?: string;
  searchQuery?: string;
  backlogItems?: string[];
};

function extractFence(
  content: string,
  lang: string
): { text: string; body: string | null } {
  const re = new RegExp("```" + lang + "\\s*([\\s\\S]*?)```", "i");
  const match = content.match(re);
  if (!match) return { text: content, body: null };
  const text = content.replace(match[0], "").trim();
  return { text, body: match[1].trim() };
}

export function parseAssistantReply(content: string): ParsedReply {
  let working = content;
  let deck: SlideDeck | undefined;
  let diagram: DiagramBlock | undefined;
  let imagePrompt: string | undefined;
  let searchQuery: string | undefined;
  let backlogItems: string[] | undefined;

  const slides = extractFence(working, "slides");
  working = slides.text;
  if (slides.body) {
    try {
      const parsed = JSON.parse(slides.body) as SlideDeck;
      if (parsed?.slides?.length) deck = parsed;
    } catch {
      /* keep prose */
    }
  }

  const diag = extractFence(working, "diagram");
  working = diag.text;
  if (diag.body) {
    try {
      const parsed = JSON.parse(diag.body) as DiagramBlock;
      if (parsed?.mermaid) diagram = parsed;
    } catch {
      /* keep prose */
    }
  }

  const picture = extractFence(working, "image");
  working = picture.text;
  if (picture.body) {
    try {
      const parsed = JSON.parse(picture.body) as { prompt?: unknown };
      if (typeof parsed.prompt === "string" && parsed.prompt.trim()) {
        imagePrompt = parsed.prompt.trim();
      }
    } catch {
      if (picture.body.trim()) imagePrompt = picture.body.trim();
    }
  }

  const search = extractFence(working, "search");
  working = search.text;
  if (search.body) {
    try {
      const parsed = JSON.parse(search.body) as { query?: unknown };
      if (typeof parsed.query === "string" && parsed.query.trim()) {
        searchQuery = parsed.query.trim();
      }
    } catch {
      if (search.body.trim()) searchQuery = search.body.trim();
    }
  }

  const backlog = extractFence(working, "backlog");
  working = backlog.text;
  if (backlog.body) {
    try {
      const parsed = JSON.parse(backlog.body) as { items?: unknown };
      if (Array.isArray(parsed.items)) {
        backlogItems = parsed.items
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      /* keep prose */
    }
  }

  return {
    text: working.trim(),
    deck,
    diagram,
    imagePrompt,
    searchQuery,
    backlogItems,
  };
}
