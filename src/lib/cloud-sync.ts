import { getSupabase } from "@/lib/supabase";
import { ChatThread, EMPTY_NOTES, NourieNotes } from "@/lib/types";

const SYNC_KEY = "sunshine.syncKey";

export function loadSyncKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SYNC_KEY);
}

export function saveSyncKey(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SYNC_KEY, key.trim());
}

export function clearSyncKey() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SYNC_KEY);
}

export function createSyncKey(): string {
  return `sunshine-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

type PullResult =
  | { found: false }
  | { found: true; chats: ChatThread[]; notes: NourieNotes; updatedAt: string };

export async function pullCloudVault(syncKey: string): Promise<PullResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured on this server.");

  const { data, error } = await supabase.rpc("sunshine_pull", {
    p_key: syncKey.trim(),
  });
  if (error) throw new Error(error.message);

  const payload = data as {
    found?: boolean;
    chats?: ChatThread[];
    notes?: NourieNotes;
    updatedAt?: string;
  };

  if (!payload?.found) return { found: false };

  return {
    found: true,
    chats: Array.isArray(payload.chats) ? payload.chats : [],
    notes: payload.notes ?? EMPTY_NOTES,
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
  };
}

export async function pushCloudVault(
  syncKey: string,
  chats: ChatThread[],
  notes: NourieNotes
): Promise<{ updatedAt: string }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Cloud sync is not configured on this server.");

  // Drop large inline images before upload so the vault stays small.
  const slimChats = chats.map((thread) => ({
    ...thread,
    messages: thread.messages.map((message) =>
      message.image ? { ...message, image: undefined } : message
    ),
  }));

  const { data, error } = await supabase.rpc("sunshine_push", {
    p_key: syncKey.trim(),
    p_chats: slimChats,
    p_notes: notes,
  });
  if (error) throw new Error(error.message);

  const payload = data as { updatedAt?: string };
  return { updatedAt: payload.updatedAt ?? new Date().toISOString() };
}
