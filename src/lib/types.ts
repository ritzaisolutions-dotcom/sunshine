export type MessageRole = "user" | "assistant" | "system";

export type AttachmentMeta = {
  name: string;
  mimeType: string;
  size: number;
};

export type Slide = {
  title: string;
  body: string;
};

export type SlideDeck = {
  title: string;
  slides: Slide[];
};

export type DiagramKind = "flowchart" | "mindmap" | "timeline";

export type DiagramBlock = {
  kind: DiagramKind;
  title: string;
  mermaid: string;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  attachments?: AttachmentMeta[];
  deck?: SlideDeck;
  diagram?: DiagramBlock;
  image?: { src: string; alt: string };
  sources?: Array<{ title: string; url: string }>;
  status?: string;
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
  archived: boolean;
};

export type KnowledgeDoc = {
  id: string;
  title: string;
  content: string;
  sourceName?: string;
  updatedAt: string;
};

export type NourieNotes = {
  whoSheIs: string;
  howSheLikesToLearn: string;
  goals: string;
  inProgress: string;
  alreadyUnderstands: string;
  getsStuckOn: string;
  littleThings: string;
  knowledgeDocs: KnowledgeDoc[];
  lastUpdated: string | null;
};

export type AdminSettings = {
  systemPrompt: string;
  mistralApiKey: string;
  surpriseLines: string[];
};

export type BacklogItem = {
  id: string;
  wish: string;
  createdAt: string;
  source: "chat" | "admin";
  done?: boolean;
};

export const EMPTY_NOTES: NourieNotes = {
  whoSheIs: "",
  howSheLikesToLearn: "",
  goals: "",
  inProgress: "",
  alreadyUnderstands: "",
  getsStuckOn: "",
  littleThings: "",
  knowledgeDocs: [],
  lastUpdated: null,
};

const MAX_KNOWLEDGE_CHARS = 90_000;

export function normalizeNotes(notes: Partial<NourieNotes> | null | undefined): NourieNotes {
  const docs = Array.isArray(notes?.knowledgeDocs) ? notes.knowledgeDocs : [];
  return {
    ...EMPTY_NOTES,
    ...notes,
    knowledgeDocs: docs
      .filter(
        (doc): doc is KnowledgeDoc =>
          Boolean(doc) &&
          typeof doc.id === "string" &&
          typeof doc.title === "string" &&
          typeof doc.content === "string"
      )
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        sourceName:
          typeof doc.sourceName === "string" ? doc.sourceName : undefined,
        updatedAt:
          typeof doc.updatedAt === "string"
            ? doc.updatedAt
            : new Date().toISOString(),
      })),
  };
}

export function notesToDocument(notes: NourieNotes): string {
  return [
    `# About Noorie`,
    notes.lastUpdated ? `Last updated: ${notes.lastUpdated}` : "Last updated: —",
    ``,
    `## Who she is`,
    notes.whoSheIs || "(empty)",
    ``,
    `## How she likes to learn`,
    notes.howSheLikesToLearn || "(empty)",
    ``,
    `## Goals`,
    notes.goals || "(empty)",
    ``,
    `## In progress`,
    notes.inProgress || "(empty)",
    ``,
    `## Already understands`,
    notes.alreadyUnderstands || "(empty)",
    ``,
    `## Gets stuck on`,
    notes.getsStuckOn || "(empty)",
    ``,
    `## Little things to remember`,
    notes.littleThings || "(empty)",
  ].join("\n");
}

/** Build capped project-knowledge text for the chat system prompt. */
export function knowledgeToDocument(docs: KnowledgeDoc[]): string {
  if (!docs.length) return "";

  const sorted = [...docs].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  );
  const parts: string[] = ["# Project knowledge"];
  let used = parts[0]!.length;

  for (const doc of sorted) {
    const block = [
      "",
      `## ${doc.title || "Untitled"}`,
      doc.sourceName ? `Source: ${doc.sourceName}` : null,
      doc.content.trim() || "(empty)",
    ]
      .filter((line): line is string => line !== null)
      .join("\n");

    if (used + block.length > MAX_KNOWLEDGE_CHARS) {
      const remaining = MAX_KNOWLEDGE_CHARS - used - 80;
      if (remaining > 200) {
        parts.push(block.slice(0, remaining) + "\n…(truncated)");
      } else {
        parts.push("\n…(older project knowledge omitted to fit size limits)");
      }
      break;
    }
    parts.push(block);
    used += block.length;
  }

  return parts.join("\n");
}
