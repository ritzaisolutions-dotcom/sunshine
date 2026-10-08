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
  status?: string;
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
  archived: boolean;
};

export type NourieNotes = {
  whoSheIs: string;
  howSheLikesToLearn: string;
  goals: string;
  inProgress: string;
  alreadyUnderstands: string;
  getsStuckOn: string;
  littleThings: string;
  lastUpdated: string | null;
};

export type AdminSettings = {
  systemPrompt: string;
  mistralApiKey: string;
  surpriseLines: string[];
};

export const EMPTY_NOTES: NourieNotes = {
  whoSheIs: "",
  howSheLikesToLearn: "",
  goals: "",
  inProgress: "",
  alreadyUnderstands: "",
  getsStuckOn: "",
  littleThings: "",
  lastUpdated: null,
};

export function notesToDocument(notes: NourieNotes): string {
  return [
    `# About Nourie`,
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
