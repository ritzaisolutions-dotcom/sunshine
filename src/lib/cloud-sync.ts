import { ChatThread, NourieNotes, normalizeNotes } from "@/lib/types";

type PullResult =
  | { found: false; configured: boolean }
  | {
      found: true;
      configured: true;
      chats: ChatThread[];
      notes: NourieNotes;
      updatedAt: string;
    };

/** Load the single shared vault for Noorie (no sync code). */
export async function pullCloudVault(): Promise<PullResult> {
  const res = await fetch("/api/vault", { method: "GET", cache: "no-store" });
  if (res.status === 503) {
    return { found: false, configured: false };
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || `Could not load cloud vault (${res.status})`);
  }
  const payload = (await res.json()) as {
    found?: boolean;
    chats?: ChatThread[];
    notes?: NourieNotes;
    updatedAt?: string;
  };
  if (!payload.found) return { found: false, configured: true };
  return {
    found: true,
    configured: true,
    chats: Array.isArray(payload.chats) ? payload.chats : [],
    notes: normalizeNotes(payload.notes),
    updatedAt: payload.updatedAt ?? new Date().toISOString(),
  };
}

/** Save the single shared vault for Noorie (no sync code). */
export async function pushCloudVault(
  chats: ChatThread[],
  notes: NourieNotes
): Promise<{ updatedAt: string }> {
  const res = await fetch("/api/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chats, notes }),
  });
  if (res.status === 503) {
    throw new Error("Cloud sync is not configured.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || `Could not save cloud vault (${res.status})`);
  }
  const payload = (await res.json()) as { updatedAt?: string };
  return { updatedAt: payload.updatedAt ?? new Date().toISOString() };
}
