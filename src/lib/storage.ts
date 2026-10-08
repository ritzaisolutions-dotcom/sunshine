import {
  AdminSettings,
  ChatThread,
  EMPTY_NOTES,
  NourieNotes,
} from "@/lib/types";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";

const KEYS = {
  chats: "sunshine.chats",
  activeChatId: "sunshine.activeChatId",
  notes: "sunshine.notes",
  settings: "sunshine.settings",
  waterAt: "sunshine.waterLastAt",
  surpriseVisit: "sunshine.surpriseVisitId",
  goodnotes: "sunshine.goodnotesConnected",
} as const;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadChats(): ChatThread[] {
  return readJson<ChatThread[]>(KEYS.chats, []);
}

export function saveChats(chats: ChatThread[]) {
  writeJson(KEYS.chats, chats);
}

export function loadActiveChatId(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(KEYS.activeChatId);
}

export function saveActiveChatId(id: string | null) {
  if (!canUseStorage()) return;
  if (id) localStorage.setItem(KEYS.activeChatId, id);
  else localStorage.removeItem(KEYS.activeChatId);
}

export function loadNotes(): NourieNotes {
  return readJson<NourieNotes>(KEYS.notes, EMPTY_NOTES);
}

export function saveNotes(notes: NourieNotes) {
  writeJson(KEYS.notes, notes);
}

export function loadSettings(): AdminSettings {
  const stored = readJson<Partial<AdminSettings>>(KEYS.settings, {});
  return {
    systemPrompt: stored.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    mistralApiKey: stored.mistralApiKey ?? "",
    surpriseLines: stored.surpriseLines ?? [
      "You are doing beautifully, princess.",
      "A little sunshine for you — keep going.",
      "Maria is proud of how curious you are.",
    ],
  };
}

export function saveSettings(settings: AdminSettings) {
  writeJson(KEYS.settings, settings);
}

export function loadWaterLastAt(): number | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(KEYS.waterAt);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function saveWaterLastAt(ts: number) {
  if (!canUseStorage()) return;
  localStorage.setItem(KEYS.waterAt, String(ts));
}

export function loadSurpriseVisitId(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(KEYS.surpriseVisit);
}

export function saveSurpriseVisitId(id: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(KEYS.surpriseVisit, id);
}

export function loadGoodnotesConnected(): boolean {
  return readJson<boolean>(KEYS.goodnotes, false);
}

export function saveGoodnotesConnected(value: boolean) {
  writeJson(KEYS.goodnotes, value);
}

export const WATER_INTERVAL_MS = 30 * 60 * 1000;
export const OVERLAY_VISIBLE_MS = 3000;
